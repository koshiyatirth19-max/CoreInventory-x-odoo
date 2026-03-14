const catRouter = require('express').Router();
const { Category } = require('../models/Inventory');
const { protect, authorize } = require('../middleware/auth');

catRouter.use(protect);

// ALL roles can view categories (needed for product form dropdowns)
catRouter.get('/', async (req, res) => {
  try { res.json(await Category.find().sort('name')); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

// ADMIN only — create, edit, delete categories
catRouter.post('/', authorize('admin'), async (req, res) => {
  try { res.status(201).json(await Category.create({ ...req.body, createdBy: req.user._id })); }
  catch (err) { res.status(400).json({ message: err.message }); }
});

catRouter.put('/:id', authorize('admin'), async (req, res) => {
  try { res.json(await Category.findByIdAndUpdate(req.params.id, req.body, { new: true })); }
  catch (err) { res.status(400).json({ message: err.message }); }
});

catRouter.delete('/:id', authorize('admin'), async (req, res) => {
  try { await Category.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = catRouter;
