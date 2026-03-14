const router = require('express').Router();
const { Transfer } = require('../models/Operations');
const { StockLedger, StockMove } = require('../models/Inventory');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

const ledgerFilter = (product, warehouse, location) => {
  const f = { product, warehouse };
  if (location) f.location = location; // only add if actually set
  return f;
};

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const transfers = await Transfer.find(status ? { status } : {})
      .populate('fromWarehouse toWarehouse', 'name code')
      .populate('fromLocation toLocation', 'name code type')
      .populate('items.product', 'name sku')
      .sort('-createdAt');
    res.json(transfers);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const t = await Transfer.findById(req.params.id)
      .populate('fromWarehouse toWarehouse', 'name code')
      .populate('fromLocation toLocation', 'name code type')
      .populate('items.product', 'name sku uom')
      .populate('createdBy', 'name');
    if (!t) return res.status(404).json({ message: 'Not found' });
    res.json(t);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    // Strip empty strings for optional location fields
    const body = { ...req.body };
    if (!body.fromLocation) delete body.fromLocation;
    if (!body.toLocation)   delete body.toLocation;
    const t = await Transfer.create({ ...body, status: 'draft', createdBy: req.user._id });
    res.status(201).json(t);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const t = await Transfer.findById(req.params.id);
    if (!t) return res.status(404).json({ message: 'Not found' });
    if (t.status === 'done') return res.status(400).json({ message: 'Cannot edit validated transfer' });
    Object.assign(t, req.body);
    await t.save();
    res.json(t);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/:id/advance', async (req, res) => {
  try {
    const t = await Transfer.findById(req.params.id);
    if (!t) return res.status(404).json({ message: 'Not found' });
    const next = { draft: 'waiting', waiting: 'ready' }[t.status];
    if (!next) return res.status(400).json({ message: `Cannot advance from: ${t.status}` });
    t.status = next; await t.save();
    res.json({ message: `Status → ${next}`, transfer: t });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/:id/revert', async (req, res) => {
  try {
    const t = await Transfer.findById(req.params.id);
    if (!t) return res.status(404).json({ message: 'Not found' });
    const prev = { ready: 'waiting', waiting: 'draft' }[t.status];
    if (!prev) return res.status(400).json({ message: `Cannot revert from: ${t.status}` });
    t.status = prev; await t.save();
    res.json({ message: `Reverted to ${prev}`, transfer: t });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/:id/cancel', async (req, res) => {
  try {
    const t = await Transfer.findById(req.params.id);
    if (!t) return res.status(404).json({ message: 'Not found' });
    if (t.status === 'done') return res.status(400).json({ message: 'Cannot cancel validated transfer' });
    t.status = 'cancelled'; await t.save();
    res.json({ message: 'Cancelled', transfer: t });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ADMIN + MANAGER — validate
router.post('/:id/validate', authorize('admin', 'manager'), async (req, res) => {
  try {
    const t = await Transfer.findById(req.params.id);
    if (!t) return res.status(404).json({ message: 'Not found' });
    if (t.status === 'done') return res.status(400).json({ message: 'Already validated' });
    if (t.status !== 'ready') return res.status(400).json({ message: `Must be "ready". Current: ${t.status}` });

    // Check stock at source
    for (const item of t.items) {
      const fFilter = ledgerFilter(item.product, t.fromWarehouse, t.fromLocation);
      const fromLedger = await StockLedger.findOne(fFilter);
      const available = fromLedger?.quantity || 0;
      if (available < item.quantity) {
        // Get product name for better error message
        const Product = require('../models/Product');
        const prod = await Product.findById(item.product).select('name sku');
        return res.status(400).json({
          message: `Insufficient stock for "${prod?.name || 'product'}" (${prod?.sku}). Available: ${available}, Required: ${item.quantity}`
        });
      }
    }

    // Move stock
    for (const item of t.items) {
      const fFilter = ledgerFilter(item.product, t.fromWarehouse, t.fromLocation);
      const tFilter = ledgerFilter(item.product, t.toWarehouse, t.toLocation);

      await StockLedger.findOneAndUpdate(fFilter, { $inc: { quantity: -item.quantity } });
      await StockLedger.findOneAndUpdate(
        tFilter,
        { $inc: { quantity: item.quantity }, $setOnInsert: { product: item.product, warehouse: t.toWarehouse, ...(t.toLocation ? { location: t.toLocation } : {}) } },
        { upsert: true, new: true }
      );
      await StockMove.create({
        product: item.product,
        fromWarehouse: t.fromWarehouse,
        fromLocation:  t.fromLocation  || undefined,
        toWarehouse:   t.toWarehouse,
        toLocation:    t.toLocation    || undefined,
        quantity: item.quantity,
        type: 'transfer',
        reference: t.number,
        referenceId: t._id,
        createdBy: req.user._id,
      });
    }

    t.status = 'done'; t.validatedAt = new Date();
    await t.save();
    res.json({ message: 'Transfer validated — stock moved', transfer: t });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const t = await Transfer.findById(req.params.id);
    if (!t || t.status === 'done') return res.status(400).json({ message: 'Cannot delete' });
    await t.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
