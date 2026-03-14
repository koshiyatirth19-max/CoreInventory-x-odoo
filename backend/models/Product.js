const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  sku:          { type: String, required: true, unique: true, uppercase: true, trim: true },
  category:     { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  uom:          { type: String, required: true, default: 'pcs' },
  description:  { type: String, default: '' },
  reorderPoint: { type: Number, default: 0 }, 
  isActive:     { type: Boolean, default: true },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Virtual: total stock across all locations
productSchema.virtual('totalStock', {
  ref: 'StockLedger',
  localField: '_id',
  foreignField: 'product',
});

module.exports = mongoose.model('Product', productSchema);
