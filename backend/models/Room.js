const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  roomTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomType', required: true },
  roomNumber: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['available', 'occupied', 'maintenance', 'cleaning'],
    default: 'available'
  }
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
