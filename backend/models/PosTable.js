const mongoose = require('mongoose');

const posTableSchema = new mongoose.Schema({
  hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  posOutletId: { type: mongoose.Schema.Types.ObjectId, ref: 'PosOutlet', required: true },
  name: { type: String, required: true },
  seatingCapacity: { type: Number, default: 2 },
  section: { type: String, default: 'Main Hall' }, // e.g. Main Hall, VIP Section, Bar Area, Terrace
  status: { type: String, enum: ['available', 'occupied', 'reserved'], default: 'available' },
  currentOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'PosOrder', default: null },
  covers: { type: Number, default: 0 },
  gridX: { type: Number, default: 0 },
  gridY: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('PosTable', posTableSchema);
