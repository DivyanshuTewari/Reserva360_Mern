const mongoose = require('mongoose');

const ratePlanSchema = new mongoose.Schema({
  hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  roomTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomType', required: true },
  planName: { type: String, required: true }, // e.g. "EP (Room Only)", "CP (With Breakfast)"
  price: { type: Number, required: true },
  description: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('RatePlan', ratePlanSchema);
