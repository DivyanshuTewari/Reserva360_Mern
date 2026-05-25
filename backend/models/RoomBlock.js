const mongoose = require('mongoose');

const roomBlockSchema = new mongoose.Schema({
  hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  roomTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomType', required: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: { type: String, enum: ['maintenance', 'cleaning', 'out_of_order', 'other'], default: 'maintenance' },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('RoomBlock', roomBlockSchema);
