const router = require('express').Router();
const Product = require('../models/Product');
const { StockLedger } = require('../models/Inventory');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// ALL roles — view products & stock
router.get('/', async (req, res) => {
  try {
    const { search, category, warehouse, lowStock } = req.query;
    const filter = { isActive: true };
    if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { sku: new RegExp(search, 'i') }];
    if (category) filter.category = category;

    const products = await Product.find(filter).populate('category', 'name color').sort('-createdAt');

    const ledgers = await StockLedger.find(warehouse ? { warehouse } : {}).populate('warehouse', 'name code');
    const stockMap = {};
    ledgers.forEach(l => {
      if (!stockMap[l.product]) stockMap[l.product] = { total: 0, locations: [] };
      stockMap[l.product].total += l.quantity;
      stockMap[l.product].locations.push({ warehouse: l.warehouse, qty: l.quantity });
    });

    let result = products.map(p => ({
      ...p.toObject(),
      stock: stockMap[p._id] || { total: 0, locations: [] },
      isLowStock: (stockMap[p._id]?.total || 0) <= p.reorderPoint,
    }));

    if (lowStock === 'true') result = result.filter(p => p.isLowStock);
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ALL roles — view single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name color');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const ledger = await StockLedger.find({ product: product._id }).populate('warehouse', 'name code');
    res.json({ ...product.toObject(), ledger });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ADMIN + MANAGER — create product
router.post('/', authorize('admin', 'manager'), async (req, res) => {
  try {
    const product = await Product.create({ ...req.body, createdBy: req.user._id });
    if (req.body.initialStock && req.body.warehouse) {
      const ledgerKey = { product: product._id, warehouse: req.body.warehouse };
      if (req.body.location) ledgerKey.location = req.body.location;
      await StockLedger.findOneAndUpdate(
        ledgerKey,
        { $inc: { quantity: req.body.initialStock } },
        { upsert: true, new: true }
      );
      await (require('../models/Inventory').StockMove).create({
        product: product._id,
        toWarehouse: req.body.warehouse,
        ...(req.body.location ? { toLocation: req.body.location } : {}),
        quantity: req.body.initialStock,
        type: 'receipt',
        reference: 'INITIAL',
        notes: 'Initial stock on product creation',
        createdBy: req.user._id,
      });
    }
    res.status(201).json(product);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ADMIN + MANAGER — edit product
router.put('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(product);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ADMIN + MANAGER — archive product (soft delete)
router.delete('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Product archived' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
