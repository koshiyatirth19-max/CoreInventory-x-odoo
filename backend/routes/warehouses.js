const router = require('express').Router();
const { Warehouse } = require('../models/Inventory');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// ALL roles can view warehouses (needed for dropdowns everywhere)
router.get('/', async (req, res) => {
  try { res.json(await Warehouse.find({ isActive: true }).sort('name')); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

// ADMIN only
router.post('/', authorize('admin'), async (req, res) => {
  try { res.status(201).json(await Warehouse.create({ ...req.body, createdBy: req.user._id })); }
  catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', authorize('admin'), async (req, res) => {
  try { res.json(await Warehouse.findByIdAndUpdate(req.params.id, req.body, { new: true })); }
  catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    await Warehouse.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Warehouse archived' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
