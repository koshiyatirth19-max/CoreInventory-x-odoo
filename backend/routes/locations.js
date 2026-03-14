const router = require('express').Router();
const { Location } = require('../models/Inventory');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// ALL roles — view locations (needed for transfer dropdowns)
router.get('/', async (req, res) => {
  try {
    const { warehouse } = req.query;
    const filter = { isActive: true };
    if (warehouse) filter.warehouse = warehouse;
    const locations = await Location.find(filter).populate('warehouse', 'name code').sort('name');
    res.json(locations);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ADMIN only — create location
router.post('/', authorize('admin'), async (req, res) => {
  try {
    const loc = await Location.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(loc);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ADMIN only — edit
router.put('/:id', authorize('admin'), async (req, res) => {
  try {
    const loc = await Location.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(loc);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ADMIN only — archive
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    await Location.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Location archived' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
