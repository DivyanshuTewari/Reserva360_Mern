const mongoose = require('mongoose');

const posOrderSchema = new mongoose.Schema({
  hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  posOutletId: { type: mongoose.Schema.Types.ObjectId, ref: 'PosOutlet', required: true },
  orderNumber: { type: String, required: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null }, // linked to room charge
  guestName: { type: String, required: true },
  roomNumber: { type: String, default: '' },
  items: [{
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'PosItem', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    subtotal: { type: Number, required: true }
  }],
  subtotal: { type: Number, required: true },
  taxTotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['cash', 'card', 'upi', 'room_charge'], default: 'cash' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'charged_to_room', 'void'], default: 'paid' },
  status: { type: String, enum: ['draft', 'completed', 'void'], default: 'completed' }, // draft is 'hold'
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'PosTable', default: null },
  tableName: { type: String, default: '' },
  covers: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('PosOrder', posOrderSchema);
