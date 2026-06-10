const mongoose = require('mongoose');

const posItemSchema = new mongoose.Schema({
  hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  posOutletId: { type: mongoose.Schema.Types.ObjectId, ref: 'PosOutlet', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  taxRate: { type: Number, default: 0 }, // e.g. 5, 12, 18
  category: { type: String, default: 'General' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  trackInventory: { type: Boolean, default: false },
  stockQuantity: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 5 }
}, { timestamps: true });

module.exports = mongoose.model('PosItem', posItemSchema);
