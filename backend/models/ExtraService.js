const mongoose = require('mongoose');

const extraServiceSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  name: { type: String, required: true },
  amountWithoutTax: { type: Number, required: true },
  taxName: { type: String },
  taxAmount: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  referenceText: { type: String },
  date: { type: Date, default: Date.now },
  grandTotal: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('ExtraService', extraServiceSchema);
