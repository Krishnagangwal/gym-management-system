const workoutPlansDb = require('../db/workoutPlansDb');
const exercisesDb = require('../db/exercisesDb');

async function createPlan(req, res, next) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    res.status(201).json(await workoutPlansDb.create(req.body));
  } catch (err) {
    next(err);
  }
}

async function listPlans(req, res, next) {
  try {
    res.json(await workoutPlansDb.findAll());
  } catch (err) {
    next(err);
  }
}

async function getPlan(req, res, next) {
  try {
    const plan = await workoutPlansDb.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Workout plan not found' });
    const exercises = await workoutPlansDb.findExercises(req.params.id);
    res.json({ ...plan, exercises });
  } catch (err) {
    next(err);
  }
}

async function addExerciseToPlan(req, res, next) {
  try {
    const plan = await workoutPlansDb.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Workout plan not found' });

    const { exerciseId, dayOfWeek, sets, reps } = req.body;
    if (!exerciseId || !dayOfWeek || !sets || !reps) {
      return res.status(400).json({ error: 'exerciseId, dayOfWeek, sets, and reps are required' });
    }
    const exercise = await exercisesDb.findById(exerciseId);
    if (!exercise) return res.status(404).json({ error: 'Exercise not found' });

    res.status(201).json(await workoutPlansDb.addExercise(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

module.exports = { createPlan, listPlans, getPlan, addExerciseToPlan };
