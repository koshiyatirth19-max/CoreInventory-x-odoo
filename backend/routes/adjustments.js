const adjRouter = require('express').Router();
const { Adjustment } = require('../models/Operations');
const { StockLedger, StockMove } = require('../models/Inventory');
const { protect, authorize } = require('../middleware/auth');

adjRouter.use(protect);

// ALL roles — view list
adjRouter.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const list = await Adjustment.find(status ? { status } : {})
      .populate('warehouse', 'name code')
      .populate('items.product', 'name sku')
      .sort('-createdAt');
    res.json(list);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ALL roles — view single
adjRouter.get('/:id', async (req, res) => {
  try {
    const adj = await Adjustment.findById(req.params.id)
      .populate('warehouse', 'name code')
      .populate('items.product', 'name sku uom')
      .populate('createdBy', 'name');
    if (!adj) return res.status(404).json({ message: 'Not found' });
    res.json(adj);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ADMIN + MANAGER only — create adjustment
adjRouter.post('/', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { warehouse, items, notes } = req.body;
    const enriched = await Promise.all(items.map(async (item) => {
      const ledger = await StockLedger.findOne({ product: item.product, warehouse });
      return { ...item, systemQty: ledger?.quantity || 0, difference: item.countedQty - (ledger?.quantity || 0) };
    }));
    const adj = await Adjustment.create({ warehouse, items: enriched, notes, createdBy: req.user._id });
    res.status(201).json(adj);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ADMIN + MANAGER only — apply adjustment (changes stock)
adjRouter.post('/:id/validate', authorize('admin', 'manager'), async (req, res) => {
  try {
    const adj = await Adjustment.findById(req.params.id);
    if (!adj) return res.status(404).json({ message: 'Not found' });
    if (adj.status === 'done') return res.status(400).json({ message: 'Already validated' });

    for (const item of adj.items) {
      await StockLedger.findOneAndUpdate(
        { product: item.product, warehouse: adj.warehouse },
        { quantity: item.countedQty },
        { upsert: true }
      );
      await StockMove.create({
        product: item.product,
        toWarehouse: adj.warehouse,
        quantity: Math.abs(item.difference),
        type: 'adjustment',
        reference: adj.number,
        referenceId: adj._id,
        notes: `Adjustment: system ${item.systemQty} → counted ${item.countedQty}`,
        createdBy: req.user._id,
      });
    }
    adj.status = 'done';
    adj.validatedAt = new Date();
    await adj.save();
    res.json({ message: 'Adjustment applied', adjustment: adj });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ADMIN + MANAGER only — delete draft
adjRouter.delete('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const adj = await Adjustment.findById(req.params.id);
    if (!adj || adj.status === 'done') return res.status(400).json({ message: 'Cannot delete' });
    await adj.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = adjRouter;
