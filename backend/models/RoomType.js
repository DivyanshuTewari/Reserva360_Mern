const mongoose = require('mongoose');

const roomTypeSchema = new mongoose.Schema({
  hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  name: { type: String, required: true }, // e.g. Deluxe, Suite
  occupancy: { type: Number, required: true },
  basePrice: { type: Number, required: true },
  amenities: [{ type: String }],
  description: { type: String },
  images: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('RoomType', roomTypeSchema);
