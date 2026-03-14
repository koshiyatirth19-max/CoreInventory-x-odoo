const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
  product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 0 },
  uom:      { type: String, default: 'pcs' },
  notes:    { type: String, default: '' },
});

// Delivery has its own extended status flow with Pick & Pack steps
const statusEnum      = ['draft', 'waiting', 'ready', 'done', 'cancelled'];
const deliveryStatusEnum = ['draft', 'waiting', 'picking', 'packing', 'ready', 'done', 'cancelled'];

// ── Receipt (Incoming) ───────────────────────────────────────
const receiptSchema = new mongoose.Schema({
  number:      { type: String, unique: true },
  supplier:    { type: String, required: true },
  warehouse:   { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  items:       [lineItemSchema],
  status:      { type: String, enum: statusEnum, default: 'draft' },
  scheduledAt: { type: Date },
  validatedAt: { type: Date },
  notes:       { type: String, default: '' },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

receiptSchema.pre('save', async function(next) {
  if (!this.number) {
    const count = await this.constructor.countDocuments();
    this.number = `REC-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// ── Delivery (Outgoing) ──────────────────────────────────────
const deliverySchema = new mongoose.Schema({
  number:      { type: String, unique: true },
  customer:    { type: String, required: true },
  warehouse:   { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  items:       [lineItemSchema],
  status:      { type: String, enum: deliveryStatusEnum, default: 'draft' },
  // Pick & Pack tracking
  pickedAt:    { type: Date },
  packedAt:    { type: Date },
  pickedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  packedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  scheduledAt: { type: Date },
  validatedAt: { type: Date },
  notes:       { type: String, default: '' },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

deliverySchema.pre('save', async function(next) {
  if (!this.number) {
    const count = await this.constructor.countDocuments();
    this.number = `DEL-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// ── Internal Transfer ────────────────────────────────────────
const transferSchema = new mongoose.Schema({
  number:        { type: String, unique: true },
  fromWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  fromLocation:  { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },
  toWarehouse:   { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  toLocation:    { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },
  items:         [lineItemSchema],
  status:        { type: String, enum: statusEnum, default: 'draft' },
  scheduledAt:   { type: Date },
  validatedAt:   { type: Date },
  notes:         { type: String, default: '' },
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

transferSchema.pre('save', async function(next) {
  if (!this.number) {
    const count = await this.constructor.countDocuments();
    this.number = `TRF-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// ── Stock Adjustment ─────────────────────────────────────────
const adjustmentSchema = new mongoose.Schema({
  number:    { type: String, unique: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  items: [{
    product:       { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    systemQty:     { type: Number, required: true },
    countedQty:    { type: Number, required: true },
    difference:    { type: Number },
    uom:           { type: String, default: 'pcs' },
  }],
  status:      { type: String, enum: statusEnum, default: 'draft' },
  validatedAt: { type: Date },
  notes:       { type: String, default: '' },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

adjustmentSchema.pre('save', async function(next) {
  if (!this.number) {
    const count = await this.constructor.countDocuments();
    this.number = `ADJ-${String(count + 1).padStart(5, '0')}`;
  }
  // auto-calc difference
  this.items.forEach(item => { item.difference = item.countedQty - item.systemQty; });
  next();
});

module.exports = {
  Receipt:    mongoose.model('Receipt', receiptSchema),
  Delivery:   mongoose.model('Delivery', deliverySchema),
  Transfer:   mongoose.model('Transfer', transferSchema),
  Adjustment: mongoose.model('Adjustment', adjustmentSchema),
};
