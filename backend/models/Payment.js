const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  paymentType: { type: String, required: true }, // Cash, Bank Transfer, UPI, Credit Card, Bill To Company
  additionType: { type: String, default: 'Default' }, // Default, Refund, Charge
  amount: { type: Number, required: true },
  paymentDate: { type: Date, required: true },
  referenceText: { type: String },
  addedOn: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
