const mongoose = require('mongoose');

// ── Category ────────────────────────────────────────────────
const categorySchema = new mongoose.Schema({
  name:      { type: String, required: true, unique: true, trim: true },
  color:     { type: String, default: '#4F46E5' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// ── Warehouse ────────────────────────────────────────────────
const warehouseSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  code:      { type: String, required: true, unique: true, uppercase: true },
  address:   { type: String, default: '' },
  isActive:  { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// ── Location (sub-location inside a warehouse: Rack A, Shelf B, Bin 3) ──
const locationSchema = new mongoose.Schema({
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  name:      { type: String, required: true, trim: true },   // e.g. "Rack A", "Shelf 3"
  code:      { type: String, required: true, trim: true },   // e.g. "RACK-A", "BIN-03"
  type:      { type: String, enum: ['rack','shelf','bin','zone','other'], default: 'rack' },
  isActive:  { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

locationSchema.index({ warehouse: 1, code: 1 }, { unique: true });

// ── Stock Ledger (source of truth) ───────────────────────────
const stockLedgerSchema = new mongoose.Schema({
  product:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  location:  { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },
  quantity:  { type: Number, default: 0 },
}, { timestamps: true });

stockLedgerSchema.index({ product: 1, warehouse: 1, location: 1 }, { unique: true });

// ── Stock Move (immutable audit log) ─────────────────────────
const stockMoveSchema = new mongoose.Schema({
  product:          { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  fromWarehouse:    { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', default: null },
  fromLocation:     { type: mongoose.Schema.Types.ObjectId, ref: 'Location',  default: null },
  toWarehouse:      { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', default: null },
  toLocation:       { type: mongoose.Schema.Types.ObjectId, ref: 'Location',  default: null },
  quantity:         { type: Number, required: true },
  type:             { type: String, enum: ['receipt','delivery','transfer','adjustment'], required: true },
  reference:        { type: String },
  referenceId:      { type: mongoose.Schema.Types.ObjectId },
  notes:            { type: String, default: '' },
  createdBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = {
  Category:    mongoose.model('Category',    categorySchema),
  Warehouse:   mongoose.model('Warehouse',   warehouseSchema),
  Location:    mongoose.model('Location',    locationSchema),
  StockLedger: mongoose.model('StockLedger', stockLedgerSchema),
  StockMove:   mongoose.model('StockMove',   stockMoveSchema),
};
