const router = require('express').Router();
const { Receipt } = require('../models/Operations');
const { StockLedger, StockMove } = require('../models/Inventory');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// ALL roles — list
router.get('/', async (req, res) => {
  try {
    const { status, warehouse } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (warehouse) filter.warehouse = warehouse;
    const receipts = await Receipt.find(filter)
      .populate('warehouse', 'name code')
      .populate('items.product', 'name sku')
      .sort('-createdAt');
    res.json(receipts);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ALL roles — single receipt
router.get('/:id', async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id)
      .populate('warehouse', 'name code')
      .populate('items.product', 'name sku uom')
      .populate('createdBy', 'name');
    if (!receipt) return res.status(404).json({ message: 'Receipt not found' });
    res.json(receipt);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ALL roles — create draft
router.post('/', async (req, res) => {
  try {
    const receipt = await Receipt.create({ ...req.body, status: 'draft', createdBy: req.user._id });
    res.status(201).json(receipt);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ALL roles — update draft or waiting receipt
router.put('/:id', async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) return res.status(404).json({ message: 'Not found' });
    if (receipt.status === 'done') return res.status(400).json({ message: 'Cannot edit a validated receipt' });
    Object.assign(receipt, req.body);
    await receipt.save();
    res.json(receipt);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ALL roles — advance status: draft→waiting, waiting→ready
// Status flow: draft → waiting → ready → [validate→done] or [cancel]
router.post('/:id/advance', async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) return res.status(404).json({ message: 'Not found' });
    const transitions = { draft: 'waiting', waiting: 'ready' };
    const next = transitions[receipt.status];
    if (!next) return res.status(400).json({ message: `Cannot advance from status: ${receipt.status}` });
    receipt.status = next;
    await receipt.save();
    res.json({ message: `Status updated to ${next}`, receipt });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ALL roles — go back: ready→waiting, waiting→draft
router.post('/:id/revert', async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) return res.status(404).json({ message: 'Not found' });
    const transitions = { ready: 'waiting', waiting: 'draft' };
    const prev = transitions[receipt.status];
    if (!prev) return res.status(400).json({ message: `Cannot revert from status: ${receipt.status}` });
    receipt.status = prev;
    await receipt.save();
    res.json({ message: `Status reverted to ${prev}`, receipt });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ALL roles — cancel
router.post('/:id/cancel', async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) return res.status(404).json({ message: 'Not found' });
    if (receipt.status === 'done') return res.status(400).json({ message: 'Cannot cancel a validated receipt' });
    receipt.status = 'cancelled';
    await receipt.save();
    res.json({ message: 'Receipt cancelled', receipt });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ADMIN + MANAGER — validate (only from 'ready' status, increases stock)
router.post('/:id/validate', authorize('admin', 'manager'), async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) return res.status(404).json({ message: 'Not found' });
    if (receipt.status === 'done') return res.status(400).json({ message: 'Already validated' });
    if (receipt.status !== 'ready') return res.status(400).json({ message: `Receipt must be in "ready" status to validate. Current: ${receipt.status}` });

    for (const item of receipt.items) {
      await StockLedger.findOneAndUpdate(
        { product: item.product, warehouse: receipt.warehouse },
        { $inc: { quantity: item.quantity } },
        { upsert: true, new: true }
      );
      await StockMove.create({
        product: item.product,
        toWarehouse: receipt.warehouse,
        quantity: item.quantity,
        type: 'receipt',
        reference: receipt.number,
        referenceId: receipt._id,
        notes: `Receipt from ${receipt.supplier}`,
        createdBy: req.user._id,
      });
    }
    receipt.status = 'done';
    receipt.validatedAt = new Date();
    await receipt.save();
    res.json({ message: 'Receipt validated — stock increased', receipt });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ADMIN + MANAGER — delete draft
router.delete('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) return res.status(404).json({ message: 'Not found' });
    if (receipt.status === 'done') return res.status(400).json({ message: 'Cannot delete validated receipt' });
    await receipt.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
