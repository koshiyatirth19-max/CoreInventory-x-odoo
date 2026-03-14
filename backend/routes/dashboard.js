const router = require('express').Router();
const Product = require('../models/Product');
const { StockLedger, StockMove } = require('../models/Inventory');
const { Receipt, Delivery, Transfer, Adjustment } = require('../models/Operations');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const { warehouse, category, docType, status } = req.query;

    // ── Product & stock filters ──────────────────────────────
    const productFilter = { isActive: true };
    if (category) productFilter.category = category;

    const ledgerFilter = warehouse ? { warehouse } : {};

    // ── Recent moves filter ───────────────────────────────────
    const moveFilter = {};
    if (warehouse) moveFilter.$or = [{ fromWarehouse: warehouse }, { toWarehouse: warehouse }];
    if (docType)   moveFilter.type = docType;

    const pendingStatuses = status
      ? [status]
      : ['draft', 'waiting', 'ready', 'picking', 'packing'];

    const shouldCount = (type) => !docType || docType === type;

    const whFilter = warehouse ? { warehouse } : {};

    const [products, ledgers, recentMoves,
      pendingReceipts, pendingDeliveries, pendingTransfers, pendingAdjustments
    ] = await Promise.all([
      Product.find(productFilter).select('name reorderPoint'),
      StockLedger.find(ledgerFilter),
      StockMove.find(moveFilter)
        .sort('-createdAt').limit(10)
        .populate('product', 'name sku uom')
        .populate('fromWarehouse toWarehouse', 'name code')
        .populate('fromLocation toLocation', 'name code type')
        .populate('createdBy', 'name'),
      shouldCount('receipt')    ? Receipt.countDocuments({ status: { $in: pendingStatuses }, ...whFilter })    : Promise.resolve(0),
      shouldCount('delivery')   ? Delivery.countDocuments({ status: { $in: pendingStatuses }, ...whFilter })   : Promise.resolve(0),
      shouldCount('transfer')   ? Transfer.countDocuments({ status: { $in: pendingStatuses } })                : Promise.resolve(0),
      shouldCount('adjustment') ? Adjustment.countDocuments({ status: { $in: pendingStatuses }, ...whFilter }) : Promise.resolve(0),
    ]);

    // ── Stock KPIs ────────────────────────────────────────────
    const stockMap = {};
    ledgers.forEach(l => {
      const key = l.product.toString();
      stockMap[key] = (stockMap[key] || 0) + l.quantity;
    });

    let totalInStock = 0, lowStock = 0, outOfStock = 0;
    products.forEach(p => {
      const qty = stockMap[p._id.toString()] || 0;
      if (qty === 0)              outOfStock++;
      else if (qty <= p.reorderPoint) lowStock++;
      else                            totalInStock++;
    });

    // ── 7-day activity trend ──────────────────────────────────
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const trendMatch = { createdAt: { $gte: sevenDaysAgo } };
    if (docType)   trendMatch.type = docType;
    if (warehouse) trendMatch.$or = [{ fromWarehouse: warehouse }, { toWarehouse: warehouse }];

    const moveTrend = await StockMove.aggregate([
      { $match: trendMatch },
      { $group: { _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, type: '$type' }, count: { $sum: 1 } } },
      { $sort: { '_id.date': 1 } }
    ]);

    // ── Low stock alerts list ─────────────────────────────────
    const lowStockProducts = products
      .map(p => ({ ...p.toObject(), qty: stockMap[p._id.toString()] || 0 }))
      .filter(p => p.qty <= p.reorderPoint)
      .sort((a, b) => a.qty - b.qty)
      .slice(0, 5);

    res.json({
      kpis: {
        totalInStock, lowStock, outOfStock,
        pendingReceipts, pendingDeliveries, pendingTransfers, pendingAdjustments
      },
      recentMoves,
      moveTrend,
      lowStockProducts,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
