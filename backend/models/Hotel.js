const mongoose = require('mongoose');

const hotelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  adminPhone: { type: String },
  instagram: { type: String },
  purchaseDate: { type: Date, default: Date.now },
  subscriptionMonths: { type: Number, required: true, default: 12 },
  subscriptionEndDate: { type: Date },
  gstDetails: { type: String },
  contactInfo: { type: String },
  timeZone: { type: String, default: 'Asia/Kolkata' },
  currency: { type: String, default: 'INR' },
  logoUrl: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Hotel', hotelSchema);
