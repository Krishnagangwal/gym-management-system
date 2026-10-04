const expenseCategoriesDb = require('../db/expenseCategoriesDb');

async function createCategory(req, res, next) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    res.status(201).json(await expenseCategoriesDb.create({ name }));
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A category with this name already exists' });
    next(err);
  }
}

async function listCategories(req, res, next) {
  try {
    res.json(await expenseCategoriesDb.findAll());
  } catch (err) {
    next(err);
  }
}

async function updateCategory(req, res, next) {
  try {
    const existing = await expenseCategoriesDb.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Category not found' });

    const { name, isActive } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    res.json(await expenseCategoriesDb.update(req.params.id, { name, isActive: isActive ?? existing.is_active }));
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A category with this name already exists' });
    next(err);
  }
}

module.exports = { createCategory, listCategories, updateCategory };
