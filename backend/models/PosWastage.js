const mongoose = require('mongoose');

const posWastageSchema = new mongoose.Schema({
  hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  posOutletId: { type: mongoose.Schema.Types.ObjectId, ref: 'PosOutlet', required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'PosItem', required: true },
  quantity: { type: Number, required: true },
  reason: { type: String, enum: ['expired', 'broken', 'spilled', 'stolen', 'other'], default: 'expired' },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('PosWastage', posWastageSchema);
