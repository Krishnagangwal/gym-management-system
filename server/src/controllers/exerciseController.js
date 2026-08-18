const exercisesDb = require('../db/exercisesDb');

async function createExercise(req, res, next) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    res.status(201).json(await exercisesDb.create(req.body));
  } catch (err) {
    next(err);
  }
}

async function listExercises(req, res, next) {
  try {
    res.json(await exercisesDb.findAll());
  } catch (err) {
    next(err);
  }
}

module.exports = { createExercise, listExercises };
