const attendanceDb = require('../db/attendanceDb');
const membersDb = require('../db/membersDb');
const membershipsDb = require('../db/membershipsDb');

async function checkInMember(req, res, next) {
  try {
    const { memberId } = req.body;
    if (!memberId) return res.status(400).json({ error: 'memberId is required' });

    const member = await membersDb.findById(memberId);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (!member.is_active) {
      return res.status(403).json({ error: 'This member is deactivated and cannot check in' });
    }

    const activeMembership = await membershipsDb.hasActiveMembership(memberId);
    if (!activeMembership) {
      return res.status(403).json({ error: 'Member has no active membership. Check-in denied.' });
    }

    res.status(201).json(await attendanceDb.checkIn(memberId));
  } catch (err) {
    next(err);
  }
}

async function checkOutMember(req, res, next) {
  try {
    const record = await attendanceDb.findById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Attendance record not found' });
    if (record.check_out_time) return res.status(409).json({ error: 'Already checked out' });

    res.json(await attendanceDb.checkOut(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function listAttendance(req, res, next) {
  try {
    const { memberId, date, month } = req.query;
    res.json(await attendanceDb.findAll({ memberId, date, month }));
  } catch (err) {
    next(err);
  }
}

module.exports = { checkInMember, checkOutMember, listAttendance };
