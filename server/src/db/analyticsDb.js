// One query per metric, each independently explainable. Every function
// takes (from, to) — 'YYYY-MM-DD' date strings — so the whole analytics
// page can be filtered by a single date range.
//
// Churn definition used throughout this module: a member has "churned" once
// their most recent membership's end_date is more than 30 days in the past
// with no later membership starting after it. Using MAX(end_date) per
// member is equivalent to (and simpler than) tracking renewals explicitly:
// if a member had renewed, MAX(end_date) would already reflect that later
// membership.
const pool = require('../config/db');

const CHURN_GRACE_DAYS = 30;

// ---------------------------------------------------------------------
// Revenue
// ---------------------------------------------------------------------

async function monthlyRevenueTrend(from, to) {
  const result = await pool.query(
    `WITH months AS (
       SELECT to_char(generate_series(date_trunc('month', $1::date), date_trunc('month', $2::date), interval '1 month'), 'YYYY-MM') AS month
     )
     SELECT mo.month, COALESCE(SUM(p.amount), 0)::numeric AS revenue
     FROM months mo
     LEFT JOIN payments p ON to_char(p.payment_date, 'YYYY-MM') = mo.month
     GROUP BY mo.month
     ORDER BY mo.month`,
    [from, to]
  );
  return result.rows;
}

async function revenueByPlan(from, to) {
  const result = await pool.query(
    `SELECT mp.name AS plan_name, COALESCE(SUM(p.amount), 0)::numeric AS revenue
     FROM payments p
     JOIN memberships ms ON ms.id = p.membership_id
     JOIN membership_plans mp ON mp.id = ms.plan_id
     WHERE p.payment_date BETWEEN $1 AND $2
     GROUP BY mp.name
     ORDER BY revenue DESC`,
    [from, to]
  );
  return result.rows;
}

// Fraction (0-1) of memberships that ended in the range and were followed
// by another membership (any plan) starting after they ended. Only counts
// memberships that ended more than CHURN_GRACE_DAYS ago, so we don't judge
// a renewal decision before the member has had a chance to make it.
async function overallRenewalRate(from, to) {
  const result = await pool.query(
    `WITH settled AS (
       SELECT ms.id, ms.member_id, ms.end_date,
              EXISTS (
                SELECT 1 FROM memberships ms2
                WHERE ms2.member_id = ms.member_id AND ms2.start_date > ms.end_date
              ) AS renewed
       FROM memberships ms
       WHERE ms.end_date + INTERVAL '${CHURN_GRACE_DAYS} days' < CURRENT_DATE
         AND ms.end_date BETWEEN $1 AND $2
     )
     SELECT COUNT(*)::int AS ended_count,
            COUNT(*) FILTER (WHERE renewed)::int AS renewed_count,
            CASE WHEN COUNT(*) = 0 THEN 0
                 ELSE ROUND(COUNT(*) FILTER (WHERE renewed)::numeric / COUNT(*), 4) END AS renewal_rate
     FROM settled`,
    [from, to]
  );
  return result.rows[0];
}

// Projected revenue in the next 30 days = value of memberships expiring in
// that window x the historical renewal rate observed over the selected
// date range. Deliberately anchored on CURRENT_DATE (not the range) since
// it's a forward-looking projection; the range only scopes which history
// the renewal rate is drawn from.
async function projectedNext30DayRevenue(from, to) {
  const [expiring, renewal] = await Promise.all([
    pool.query(
      `SELECT COALESCE(SUM(mp.price), 0)::numeric AS total, COUNT(*)::int AS count
       FROM memberships ms JOIN membership_plans mp ON mp.id = ms.plan_id
       WHERE ms.status = 'active' AND ms.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`
    ),
    overallRenewalRate(from, to),
  ]);
  const expiringValue = Number(expiring.rows[0].total);
  const expiringCount = expiring.rows[0].count;
  const renewalRate = Number(renewal.renewal_rate);
  return {
    expiringCount,
    expiringValue,
    renewalRate,
    projectedRevenue: Math.round(expiringValue * renewalRate * 100) / 100,
  };
}

async function paymentMethodMix(from, to) {
  const result = await pool.query(
    `SELECT payment_method, COUNT(*)::int AS count, COALESCE(SUM(amount), 0)::numeric AS total
     FROM payments
     WHERE payment_date BETWEEN $1 AND $2
     GROUP BY payment_method
     ORDER BY total DESC`,
    [from, to]
  );
  return result.rows;
}

// Average Revenue Per Member = total revenue in range / distinct members
// who paid in range.
async function averageRevenuePerMember(from, to) {
  const result = await pool.query(
    `SELECT COALESCE(SUM(amount), 0)::numeric AS total_revenue,
            COUNT(DISTINCT member_id)::int AS paying_members,
            CASE WHEN COUNT(DISTINCT member_id) = 0 THEN 0
                 ELSE ROUND(SUM(amount) / COUNT(DISTINCT member_id), 2) END AS arpm
     FROM payments
     WHERE payment_date BETWEEN $1 AND $2`,
    [from, to]
  );
  return result.rows[0];
}

// ---------------------------------------------------------------------
// Retention
// ---------------------------------------------------------------------

// For each month in range: churned members that month (see module-level
// churn definition) / members who had an active membership at the start
// of that month.
async function monthlyChurnRate(from, to) {
  const result = await pool.query(
    `WITH months AS (
       SELECT generate_series(date_trunc('month', $1::date), date_trunc('month', $2::date), interval '1 month')::date AS month_start
     ),
     member_last_end AS (
       SELECT member_id, MAX(end_date) AS last_end_date
       FROM memberships
       GROUP BY member_id
     ),
     churned AS (
       SELECT date_trunc('month', last_end_date)::date AS month_start, COUNT(*)::int AS churned_count
       FROM member_last_end
       WHERE last_end_date + INTERVAL '${CHURN_GRACE_DAYS} days' < CURRENT_DATE
       GROUP BY date_trunc('month', last_end_date)::date
     ),
     active_at_start AS (
       SELECT mo.month_start, COUNT(DISTINCT ms.member_id)::int AS active_count
       FROM months mo
       JOIN memberships ms ON ms.start_date <= mo.month_start AND ms.end_date >= mo.month_start
       GROUP BY mo.month_start
     )
     SELECT to_char(mo.month_start, 'YYYY-MM') AS month,
            COALESCE(c.churned_count, 0) AS churned_count,
            COALESCE(a.active_count, 0) AS active_count,
            CASE WHEN COALESCE(a.active_count, 0) = 0 THEN 0
                 ELSE ROUND(COALESCE(c.churned_count, 0)::numeric / a.active_count * 100, 2) END AS churn_rate
     FROM months mo
     LEFT JOIN active_at_start a ON a.month_start = mo.month_start
     LEFT JOIN churned c ON c.month_start = mo.month_start
     ORDER BY mo.month_start`,
    [from, to]
  );
  return result.rows;
}

// Same "settled membership" logic as overallRenewalRate, grouped by plan —
// shows which plan retains members best.
async function renewalRateByPlan(from, to) {
  const result = await pool.query(
    `WITH settled AS (
       SELECT ms.id, ms.member_id, ms.plan_id, ms.end_date,
              EXISTS (
                SELECT 1 FROM memberships ms2
                WHERE ms2.member_id = ms.member_id AND ms2.start_date > ms.end_date
              ) AS renewed
       FROM memberships ms
       WHERE ms.end_date + INTERVAL '${CHURN_GRACE_DAYS} days' < CURRENT_DATE
         AND ms.end_date BETWEEN $1 AND $2
     )
     SELECT p.name AS plan_name,
            COUNT(*)::int AS ended_count,
            COUNT(*) FILTER (WHERE s.renewed)::int AS renewed_count,
            CASE WHEN COUNT(*) = 0 THEN 0
                 ELSE ROUND(COUNT(*) FILTER (WHERE s.renewed)::numeric / COUNT(*) * 100, 1) END AS renewal_rate
     FROM settled s JOIN membership_plans p ON p.id = s.plan_id
     GROUP BY p.name
     ORDER BY renewal_rate DESC`,
    [from, to]
  );
  return result.rows;
}

// Averaged only over churned members (see module-level definition), scoped
// to those who churned within the selected range. Lifetime = last
// membership end_date - join_date. LTV = average of their total lifetime
// payments (a correlated subquery, not a JOIN, so it isn't inflated by
// fanning out against the member's multiple membership rows).
async function averageLifetimeAndLTV(from, to) {
  const result = await pool.query(
    `WITH member_last_end AS (
       SELECT member_id, MAX(end_date) AS last_end_date
       FROM memberships
       GROUP BY member_id
     ),
     churned_members AS (
       SELECT m.id AS member_id, m.join_date, mle.last_end_date,
              (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE member_id = m.id) AS total_paid
       FROM members m
       JOIN member_last_end mle ON mle.member_id = m.id
       WHERE mle.last_end_date + INTERVAL '${CHURN_GRACE_DAYS} days' < CURRENT_DATE
         AND mle.last_end_date BETWEEN $1 AND $2
     )
     SELECT COUNT(*)::int AS churned_member_count,
            ROUND(AVG(EXTRACT(EPOCH FROM (last_end_date::timestamp - join_date::timestamp)) / (86400 * 30.44))::numeric, 1) AS avg_lifetime_months,
            ROUND(AVG(total_paid)::numeric, 2) AS avg_ltv
     FROM churned_members`,
    [from, to]
  );
  return result.rows[0];
}

// One row per (cohort join-month x months-since-join offset 1/2/3):
// what % of that cohort still had a membership covering that point in time.
async function cohortRetentionTable(from, to) {
  const result = await pool.query(
    `WITH cohorts AS (
       SELECT id AS member_id, date_trunc('month', join_date)::date AS cohort_month
       FROM members
       WHERE join_date BETWEEN $1 AND $2
     ),
     cohort_sizes AS (
       SELECT cohort_month, COUNT(*)::int AS cohort_size FROM cohorts GROUP BY cohort_month
     ),
     retention AS (
       SELECT c.cohort_month, k.months_offset,
              COUNT(*) FILTER (
                WHERE EXISTS (
                  SELECT 1 FROM memberships ms
                  WHERE ms.member_id = c.member_id
                    AND ms.start_date <= (c.cohort_month + (k.months_offset || ' months')::interval)
                    AND ms.end_date   >= (c.cohort_month + (k.months_offset || ' months')::interval)
                )
              )::int AS retained_count
       FROM cohorts c
       CROSS JOIN (VALUES (1), (2), (3)) AS k(months_offset)
       GROUP BY c.cohort_month, k.months_offset
     )
     SELECT to_char(r.cohort_month, 'YYYY-MM') AS cohort_month, r.months_offset, r.retained_count, cs.cohort_size,
            CASE WHEN cs.cohort_size = 0 THEN 0
                 ELSE ROUND(r.retained_count::numeric / cs.cohort_size * 100, 1) END AS retention_pct
     FROM retention r JOIN cohort_sizes cs ON cs.cohort_month = r.cohort_month
     ORDER BY r.cohort_month, r.months_offset`,
    [from, to]
  );

  // Pivot into one row per cohort month: { cohortMonth, cohortSize, m1, m2, m3 }
  const byMonth = new Map();
  for (const row of result.rows) {
    if (!byMonth.has(row.cohort_month)) {
      byMonth.set(row.cohort_month, { cohortMonth: row.cohort_month, cohortSize: row.cohort_size, m1: null, m2: null, m3: null });
    }
    byMonth.get(row.cohort_month)[`m${row.months_offset}`] = Number(row.retention_pct);
  }
  return [...byMonth.values()];
}

// ---------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------

async function peakHoursHeatmap(from, to) {
  const result = await pool.query(
    `SELECT EXTRACT(DOW FROM check_in_time)::int AS day_of_week,
            EXTRACT(HOUR FROM check_in_time)::int AS hour,
            COUNT(*)::int AS visit_count
     FROM attendance
     WHERE check_in_time::date BETWEEN $1 AND $2
     GROUP BY 1, 2
     ORDER BY 1, 2`,
    [from, to]
  );
  return result.rows;
}

// Members whose membership window overlapped the range at all — the
// denominator both attendance metrics below use. Deliberately NOT
// "currently active" (members.is_active): that's a present-tense snapshot,
// so a member who visited earlier in the range but has since been
// deactivated would count in the numerator but not the denominator,
// pushing rates above 100%.
async function membersInRange(from, to) {
  const result = await pool.query(
    `SELECT COUNT(DISTINCT member_id)::int AS count
     FROM memberships
     WHERE start_date <= $2 AND end_date >= $1`,
    [from, to]
  );
  return result.rows[0].count;
}

// % of members who belonged to the gym at some point in the range and
// checked in at least once during it.
async function attendanceRate(from, to) {
  const [visited, eligibleMembers] = await Promise.all([
    pool.query(
      `SELECT COUNT(DISTINCT member_id)::int AS count FROM attendance WHERE check_in_time::date BETWEEN $1 AND $2`,
      [from, to]
    ),
    membersInRange(from, to),
  ]);
  const visitedCount = visited.rows[0].count;
  return {
    visitedCount,
    eligibleMembers,
    rate: eligibleMembers === 0 ? 0 : Math.round((visitedCount / eligibleMembers) * 10000) / 100,
  };
}

// Total check-ins in range / members in range / weeks in range.
async function avgVisitsPerMemberPerWeek(from, to) {
  const [totalVisits, eligibleMembers] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS count FROM attendance WHERE check_in_time::date BETWEEN $1 AND $2`,
      [from, to]
    ),
    membersInRange(from, to),
  ]);
  const weeks = Math.max(1, (new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24 * 7));
  const avg = eligibleMembers === 0 ? 0 : totalVisits.rows[0].count / eligibleMembers / weeks;
  return Math.round(avg * 100) / 100;
}

async function avgSessionDuration(from, to) {
  const result = await pool.query(
    `SELECT ROUND(AVG(EXTRACT(EPOCH FROM (check_out_time - check_in_time)) / 60)::numeric, 1) AS avg_minutes,
            COUNT(*)::int AS session_count
     FROM attendance
     WHERE check_out_time IS NOT NULL AND check_in_time::date BETWEEN $1 AND $2`,
    [from, to]
  );
  return result.rows[0];
}

// ---------------------------------------------------------------------
// Trainers
// ---------------------------------------------------------------------

// Per active trainer: currently-assigned member count, what % of those
// members visited during the range, and what % are still active members.
async function trainerPerformance(from, to) {
  const result = await pool.query(
    `WITH trainer_members AS (
       SELECT trainer_id, member_id
       FROM trainer_member_assignments
       WHERE is_active = TRUE
     ),
     per_trainer AS (
       SELECT tm.trainer_id,
              COUNT(DISTINCT tm.member_id)::int AS member_count,
              COUNT(DISTINCT tm.member_id) FILTER (WHERE m.is_active)::int AS retained_count,
              COUNT(DISTINCT a.member_id)::int AS visited_count
       FROM trainer_members tm
       JOIN members m ON m.id = tm.member_id
       LEFT JOIN attendance a ON a.member_id = tm.member_id AND a.check_in_time::date BETWEEN $1 AND $2
       GROUP BY tm.trainer_id
     )
     SELECT t.id, t.first_name, t.last_name, t.specialization,
            COALESCE(pt.member_count, 0) AS member_count,
            COALESCE(pt.visited_count, 0) AS visited_count,
            COALESCE(pt.retained_count, 0) AS retained_count,
            CASE WHEN COALESCE(pt.member_count, 0) = 0 THEN 0
                 ELSE ROUND(COALESCE(pt.visited_count, 0)::numeric / pt.member_count * 100, 1) END AS attendance_rate,
            CASE WHEN COALESCE(pt.member_count, 0) = 0 THEN 0
                 ELSE ROUND(COALESCE(pt.retained_count, 0)::numeric / pt.member_count * 100, 1) END AS retention_rate
     FROM trainers t
     LEFT JOIN per_trainer pt ON pt.trainer_id = t.id
     WHERE t.is_active = TRUE
     ORDER BY t.id`,
    [from, to]
  );
  return result.rows;
}

// ---------------------------------------------------------------------
// Finance (admin-only — see analyticsController for the role gate)
// ---------------------------------------------------------------------

async function monthlyExpenseTrend(from, to) {
  const result = await pool.query(
    `WITH months AS (
       SELECT to_char(generate_series(date_trunc('month', $1::date), date_trunc('month', $2::date), interval '1 month'), 'YYYY-MM') AS month
     )
     SELECT mo.month, COALESCE(SUM(e.amount), 0)::numeric AS expenses
     FROM months mo
     LEFT JOIN expenses e ON to_char(e.expense_date, 'YYYY-MM') = mo.month
     GROUP BY mo.month
     ORDER BY mo.month`,
    [from, to]
  );
  return result.rows;
}

async function expensesByCategory(from, to) {
  const result = await pool.query(
    `SELECT c.name AS category_name, COALESCE(SUM(e.amount), 0)::numeric AS total
     FROM expenses e JOIN expense_categories c ON c.id = e.category_id
     WHERE e.expense_date BETWEEN $1 AND $2
     GROUP BY c.name
     ORDER BY total DESC`,
    [from, to]
  );
  return result.rows;
}

// Revenue = payments actually collected in range (not invoiced amounts —
// matches how the rest of this app already recognizes revenue).
async function profitAndLoss(from, to) {
  const [revenueResult, expensesResult] = await Promise.all([
    pool.query(`SELECT COALESCE(SUM(amount), 0)::numeric AS total FROM payments WHERE payment_date BETWEEN $1 AND $2`, [from, to]),
    pool.query(`SELECT COALESCE(SUM(amount), 0)::numeric AS total FROM expenses WHERE expense_date BETWEEN $1 AND $2`, [from, to]),
  ]);
  const revenue = Number(revenueResult.rows[0].total);
  const expenses = Number(expensesResult.rows[0].total);
  const grossProfit = Math.round((revenue - expenses) * 100) / 100;
  const netMargin = revenue === 0 ? 0 : Math.round((grossProfit / revenue) * 10000) / 100;
  return { revenue, expenses, grossProfit, netMargin };
}

// Per-month P&L breakdown, built from the same two trend queries the
// dashboard's combined Revenue vs Expenses chart already uses — one pass
// of work, two views of it.
async function monthlyProfitAndLoss(from, to) {
  const [revenueRows, expenseRows] = await Promise.all([
    monthlyRevenueTrend(from, to),
    monthlyExpenseTrend(from, to),
  ]);
  const expenseByMonth = new Map(expenseRows.map((r) => [r.month, Number(r.expenses)]));
  return revenueRows.map((r) => {
    const revenue = Number(r.revenue);
    const expenses = expenseByMonth.get(r.month) || 0;
    const profit = Math.round((revenue - expenses) * 100) / 100;
    return {
      month: r.month,
      revenue,
      expenses,
      profit,
      netMargin: revenue === 0 ? 0 : Math.round((profit / revenue) * 10000) / 100,
    };
  });
}

// Total value of invoices not yet paid, regardless of date range — this is
// a point-in-time balance sheet figure, not a period metric.
async function outstandingDues() {
  const result = await pool.query(
    `SELECT COALESCE(SUM(total), 0)::numeric AS total, COUNT(*)::int AS count
     FROM invoices WHERE status IN ('issued', 'overdue')`
  );
  return result.rows[0];
}

// ---------------------------------------------------------------------
// HR & Payroll
// ---------------------------------------------------------------------

// Sum of finalized payslips' gross (employer cost, not net-to-employee)
// whose payroll month/year falls in range. A payroll run has no single
// date column, so its (year, month) is turned into the 1st of that month
// for the range comparison.
async function totalPayrollCost(from, to) {
  const result = await pool.query(
    `SELECT COALESCE(SUM(ps.gross), 0)::numeric AS total
     FROM payslips ps
     JOIN payroll_runs pr ON pr.id = ps.payroll_run_id
     WHERE pr.status = 'finalized'
       AND make_date(pr.year, pr.month, 1) BETWEEN date_trunc('month', $1::date) AND date_trunc('month', $2::date)`,
    [from, to]
  );
  return result.rows[0].total;
}

async function headcount() {
  const result = await pool.query(`SELECT COUNT(*)::int AS count FROM employees WHERE is_active = TRUE`);
  return result.rows[0].count;
}

module.exports = {
  monthlyRevenueTrend,
  revenueByPlan,
  overallRenewalRate,
  projectedNext30DayRevenue,
  paymentMethodMix,
  averageRevenuePerMember,
  monthlyChurnRate,
  renewalRateByPlan,
  averageLifetimeAndLTV,
  cohortRetentionTable,
  peakHoursHeatmap,
  attendanceRate,
  avgVisitsPerMemberPerWeek,
  avgSessionDuration,
  trainerPerformance,
  monthlyExpenseTrend,
  expensesByCategory,
  profitAndLoss,
  monthlyProfitAndLoss,
  outstandingDues,
  totalPayrollCost,
  headcount,
};
