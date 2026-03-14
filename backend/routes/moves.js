// moves.js
const moveRouter = require('express').Router();
const { StockMove } = require('../models/Inventory');
const { protect } = require('../middleware/auth');

moveRouter.use(protect);

moveRouter.get('/', async (req, res) => {
  try {
    const { product, warehouse, type, from, to } = req.query;
    const filter = {};
    if (product) filter.product = product;
    if (type) filter.type = type;
    if (warehouse) filter.$or = [{ fromWarehouse: warehouse }, { toWarehouse: warehouse }];
    if (from) filter.createdAt = { $gte: new Date(from) };
    if (to) filter.createdAt = { ...filter.createdAt, $lte: new Date(to) };

    const moves = await StockMove.find(filter)
      .populate('product', 'name sku')
      .populate('fromWarehouse toWarehouse', 'name code')
      .populate('createdBy', 'name')
      .sort('-createdAt')
      .limit(500);
    res.json(moves);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = moveRouter;
