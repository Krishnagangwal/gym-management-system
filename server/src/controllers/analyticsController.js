const analyticsDb = require('../db/analyticsDb');

function isValidDate(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

// Defaults to the trailing 12 months so the page is useful with no filter
// applied; a bad/missing 'to' falls back to today first, then 'from' is
// derived from whichever 'to' we ended up with.
function resolveDateRange(query) {
  const to = isValidDate(query.to) ? query.to : new Date().toISOString().slice(0, 10);
  if (isValidDate(query.from)) return { from: query.from, to };

  const twelveMonthsBack = new Date(to);
  twelveMonthsBack.setMonth(twelveMonthsBack.getMonth() - 12);
  return { from: twelveMonthsBack.toISOString().slice(0, 10), to };
}

async function getAnalytics(req, res, next) {
  try {
    const { from, to } = resolveDateRange(req.query);
    // Finance figures (profit, expenses, outstanding dues) are admin-only —
    // staff share this same dashboard endpoint, so the section is simply
    // omitted from their response rather than filtered client-side.
    const isAdmin = req.user.role === 'admin';

    const [
      monthlyRevenueTrend, revenueByPlan, projectedRevenue, paymentMethodMix, arpm,
      monthlyChurnRate, renewalRateByPlan, lifetimeAndLtv, cohortRetention,
      peakHours, attendanceRate, avgVisitsPerWeek, avgSessionDuration,
      trainerPerformance, financeResults,
    ] = await Promise.all([
      analyticsDb.monthlyRevenueTrend(from, to),
      analyticsDb.revenueByPlan(from, to),
      analyticsDb.projectedNext30DayRevenue(from, to),
      analyticsDb.paymentMethodMix(from, to),
      analyticsDb.averageRevenuePerMember(from, to),
      analyticsDb.monthlyChurnRate(from, to),
      analyticsDb.renewalRateByPlan(from, to),
      analyticsDb.averageLifetimeAndLTV(from, to),
      analyticsDb.cohortRetentionTable(from, to),
      analyticsDb.peakHoursHeatmap(from, to),
      analyticsDb.attendanceRate(from, to),
      analyticsDb.avgVisitsPerMemberPerWeek(from, to),
      analyticsDb.avgSessionDuration(from, to),
      analyticsDb.trainerPerformance(from, to),
      isAdmin ? Promise.all([
        analyticsDb.monthlyExpenseTrend(from, to),
        analyticsDb.expensesByCategory(from, to),
        analyticsDb.profitAndLoss(from, to),
        analyticsDb.monthlyProfitAndLoss(from, to),
        analyticsDb.outstandingDues(),
        analyticsDb.totalPayrollCost(from, to),
        analyticsDb.headcount(),
      ]) : null,
    ]);

    const finance = financeResults && {
      monthlyExpenseTrend: financeResults[0],
      expensesByCategory: financeResults[1],
      profitAndLoss: financeResults[2],
      monthlyProfitAndLoss: financeResults[3],
      outstandingDues: financeResults[4],
      totalPayrollCost: financeResults[5],
      headcount: financeResults[6],
    };

    res.json({
      range: { from, to },
      revenue: { monthlyRevenueTrend, revenueByPlan, projectedRevenue, paymentMethodMix, arpm },
      ...(finance && { finance }),
      retention: { monthlyChurnRate, renewalRateByPlan, lifetimeAndLtv, cohortRetention },
      operations: { peakHours, attendanceRate, avgVisitsPerWeek, avgSessionDuration },
      trainers: trainerPerformance,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAnalytics };
