const pool = require('../config/db');
const attendanceDb = require('../db/attendanceDb');
const paymentsDb = require('../db/paymentsDb');

async function getSummary(req, res, next) {
  try {
    const [
      totalMembers, activeMembers, expiredMemberships, totalTrainers,
      todaysAttendance, expiringSoon, monthlyRevenue, recentPayments,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM members'),
      pool.query('SELECT COUNT(*)::int AS count FROM members WHERE is_active = TRUE'),
      pool.query(`SELECT COUNT(*)::int AS count FROM memberships WHERE status = 'active' AND end_date < CURRENT_DATE`),
      pool.query('SELECT COUNT(*)::int AS count FROM trainers WHERE is_active = TRUE'),
      attendanceDb.countForToday(),
      pool.query(
        `SELECT ms.id, m.first_name, m.last_name, ms.end_date
         FROM memberships ms JOIN members m ON m.id = ms.member_id
         WHERE ms.status = 'active' AND ms.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
         ORDER BY ms.end_date ASC`
      ),
      paymentsDb.sumForCurrentMonth(),
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
      recentPayments,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSummary };
