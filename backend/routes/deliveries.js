const router = require('express').Router();
const { Delivery } = require('../models/Operations');
const { StockLedger, StockMove } = require('../models/Inventory');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);


router.get('/', async (req, res) => {
  try {
    const { status, warehouse } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (warehouse) filter.warehouse = warehouse;
    const deliveries = await Delivery.find(filter)
      .populate('warehouse', 'name code')
      .populate('items.product', 'name sku uom')
      .populate('pickedBy packedBy createdBy', 'name')
      .sort('-createdAt');
    res.json(deliveries);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const d = await Delivery.findById(req.params.id)
      .populate('warehouse', 'name code')
      .populate('items.product', 'name sku uom')
      .populate('pickedBy packedBy createdBy', 'name');
    if (!d) return res.status(404).json({ message: 'Not found' });
    res.json(d);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ALL roles — create draft delivery
router.post('/', async (req, res) => {
  try {
    const delivery = await Delivery.create({ ...req.body, status: 'draft', createdBy: req.user._id });
    res.status(201).json(delivery);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ALL roles — edit (only non-done)
router.put('/:id', async (req, res) => {
  try {
    const d = await Delivery.findById(req.params.id);
    if (!d) return res.status(404).json({ message: 'Not found' });
    if (d.status === 'done') return res.status(400).json({ message: 'Cannot edit a completed delivery' });
    Object.assign(d, req.body);
    await d.save();
    res.json(d);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ── STEP 1: draft → waiting ──────────────────────────────────
router.post('/:id/confirm', async (req, res) => {
  try {
    const d = await Delivery.findById(req.params.id);
    if (!d) return res.status(404).json({ message: 'Not found' });
    if (d.status !== 'draft') return res.status(400).json({ message: `Must be draft. Current: ${d.status}` });
    d.status = 'waiting';
    await d.save();
    res.json({ message: 'Delivery confirmed — awaiting pick', delivery: d });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── STEP 2: waiting → picking (ALL roles — staff does the picking) ───
router.post('/:id/pick', async (req, res) => {
  try {
    const d = await Delivery.findById(req.params.id);
    if (!d) return res.status(404).json({ message: 'Not found' });
    if (d.status !== 'waiting') return res.status(400).json({ message: `Must be in "waiting" to start picking. Current: ${d.status}` });

    // Check stock availability before picking starts
    for (const item of d.items) {
      const ledger = await StockLedger.findOne({ product: item.product, warehouse: d.warehouse });
      if (!ledger || ledger.quantity < item.quantity) {
        return res.status(400).json({
          message: `Cannot pick — insufficient stock. Available: ${ledger?.quantity || 0}, Required: ${item.quantity}`
        });
      }
    }

    d.status   = 'picking';
    d.pickedAt = new Date();
    d.pickedBy = req.user._id;
    await d.save();
    res.json({ message: 'Picking started', delivery: d });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── STEP 3: picking → packing (ALL roles — staff does the packing) ──
router.post('/:id/pack', async (req, res) => {
  try {
    const d = await Delivery.findById(req.params.id);
    if (!d) return res.status(404).json({ message: 'Not found' });
    if (d.status !== 'picking') return res.status(400).json({ message: `Must be in "picking" to start packing. Current: ${d.status}` });

    d.status   = 'packing';
    d.packedAt = new Date();
    d.packedBy = req.user._id;
    await d.save();
    res.json({ message: 'Packing done — ready for dispatch', delivery: d });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── STEP 4: packing → ready ──────────────────────────────────
router.post('/:id/ready', async (req, res) => {
  try {
    const d = await Delivery.findById(req.params.id);
    if (!d) return res.status(404).json({ message: 'Not found' });
    if (d.status !== 'packing') return res.status(400).json({ message: `Must be in "packing" to mark ready. Current: ${d.status}` });
    d.status = 'ready';
    await d.save();
    res.json({ message: 'Marked as ready for dispatch', delivery: d });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── STEP 5: ready → done (ADMIN + MANAGER only — decreases stock) ──
router.post('/:id/validate', authorize('admin', 'manager'), async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ message: 'Not found' });
    if (delivery.status === 'done') return res.status(400).json({ message: 'Already validated' });
    if (delivery.status !== 'ready') return res.status(400).json({
      message: `Delivery must be "ready" to validate. Current: ${delivery.status}. Complete Pick → Pack → Ready first.`
    });

    // Final stock check before deducting
    for (const item of delivery.items) {
      const ledger = await StockLedger.findOne({ product: item.product, warehouse: delivery.warehouse });
      if (!ledger || ledger.quantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock. Available: ${ledger?.quantity || 0}, Required: ${item.quantity}`
        });
      }
    }

    // Decrease stock + log move
    for (const item of delivery.items) {
      await StockLedger.findOneAndUpdate(
        { product: item.product, warehouse: delivery.warehouse },
        { $inc: { quantity: -item.quantity } }
      );
      await StockMove.create({
        product: item.product,
        fromWarehouse: delivery.warehouse,
        quantity: item.quantity,
        type: 'delivery',
        reference: delivery.number,
        referenceId: delivery._id,
        notes: `Delivered to ${delivery.customer}`,
        createdBy: req.user._id,
      });
    }

    delivery.status      = 'done';
    delivery.validatedAt = new Date();
    await delivery.save();
    res.json({ message: `Delivery validated — stock decreased for ${delivery.items.length} item(s)`, delivery });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Revert one step back (for corrections — ALL roles)
router.post('/:id/revert', async (req, res) => {
  try {
    const d = await Delivery.findById(req.params.id);
    if (!d) return res.status(404).json({ message: 'Not found' });
    const back = { waiting: 'draft', picking: 'waiting', packing: 'picking', ready: 'packing' };
    const prev = back[d.status];
    if (!prev) return res.status(400).json({ message: `Cannot revert from: ${d.status}` });
    d.status = prev;
    await d.save();
    res.json({ message: `Reverted to ${prev}`, delivery: d });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Cancel (ALL roles, before done)
router.post('/:id/cancel', async (req, res) => {
  try {
    const d = await Delivery.findById(req.params.id);
    if (!d) return res.status(404).json({ message: 'Not found' });
    if (d.status === 'done') return res.status(400).json({ message: 'Cannot cancel completed delivery' });
    d.status = 'cancelled';
    await d.save();
    res.json({ message: 'Delivery cancelled', delivery: d });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ADMIN + MANAGER — delete draft
router.delete('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const d = await Delivery.findById(req.params.id);
    if (!d) return res.status(404).json({ message: 'Not found' });
    if (d.status === 'done') return res.status(400).json({ message: 'Cannot delete completed delivery' });
    await d.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
