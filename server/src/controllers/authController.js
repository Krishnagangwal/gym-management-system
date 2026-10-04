const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const usersDb = require('../db/usersDb');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await usersDb.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name, memberId: user.member_id, trainerId: user.trainer_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        memberId: user.member_id, trainerId: user.trainer_id,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { login };
