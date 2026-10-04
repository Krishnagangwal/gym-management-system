const pool = require('../config/db');
const attendanceDb = require('../db/attendanceDb');
const paymentsDb = require('../db/paymentsDb');

async function getSummary(req, res, next) {
  try {
    // Last fully-completed calendar month, not the current one — showing
    // the current month's revenue reads as "₹0 / broken" for most of the
    // month, since it's genuinely barely started.
    const lastMonthDate = new Date();
    lastMonthDate.setDate(1);
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

    const [
      totalMembers, activeMembers, expiredMemberships, totalTrainers,
      todaysAttendance, expiringSoon, monthlyRevenue, recentPayments,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM members'),
      pool.query('SELECT COUNT(*)::int AS count FROM members WHERE is_active = TRUE'),
      // Distinct members whose latest membership (by end_date) has
      // expired — not a raw count of expired membership rows, which
      // double-counts members who renewed multiple times.
      pool.query(
        `SELECT COUNT(*)::int AS count FROM (
           SELECT DISTINCT ON (member_id) member_id, end_date
           FROM memberships
           ORDER BY member_id, end_date DESC
         ) latest
         WHERE latest.end_date < CURRENT_DATE`
      ),
      pool.query('SELECT COUNT(*)::int AS count FROM trainers WHERE is_active = TRUE'),
      attendanceDb.countForToday(),
      pool.query(
        `SELECT ms.id, m.first_name, m.last_name, ms.end_date
         FROM memberships ms JOIN members m ON m.id = ms.member_id
         WHERE ms.status = 'active' AND ms.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
         ORDER BY ms.end_date ASC LIMIT 5`
      ),
      paymentsDb.sumForMonth(lastMonthKey),
      paymentsDb.findRecent(5),
    ]);

    res.json({
      totalMembers: totalMembers.rows[0].count,
      activeMembers: activeMembers.rows[0].count,
      expiredMemberships: expiredMemberships.rows[0].count,
      totalTrainers: totalTrainers.rows[0].count,
      todaysAttendance,
      membershipsExpiringSoon: expiringSoon.rows,
      monthlyRevenue,
      monthlyRevenueLabel: lastMonthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      recentPayments,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSummary };
