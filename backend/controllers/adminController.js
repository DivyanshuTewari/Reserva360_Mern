const Hotel = require('../models/Hotel');
const RoomType = require('../models/RoomType');
const Room = require('../models/Room');
const User = require('../models/User');
const RatePlan = require('../models/RatePlan');
const Booking = require('../models/Booking');
const RoomBlock = require('../models/RoomBlock');
const ExtraService = require('../models/ExtraService');
const Payment = require('../models/Payment');
const bcrypt = require('bcrypt');

// @desc    Get Hotel Profile
// @route   GET /api/admin/hotel
// @access  Private/Admin
exports.getHotelProfile = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.user.hotelId);
    res.json(hotel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Staff List
// @route   GET /api/admin/staff
// @access  Private/Admin
exports.getStaffList = async (req, res) => {
  try {
    const staff = await User.find({ hotelId: req.user.hotelId }).select('-password');
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Hotel Profile
// @route   PUT /api/admin/hotel
// @access  Private/Admin
exports.updateHotelProfile = async (req, res) => {
  try {
    const hotel = await Hotel.findByIdAndUpdate(req.user.hotelId, req.body, { returnDocument: 'after' });
    res.json(hotel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create Room Type
// @route   POST /api/admin/room-types
// @access  Private/Admin
exports.createRoomType = async (req, res) => {
  try {
    const roomType = await RoomType.create({ ...req.body, hotelId: req.user.hotelId });
    res.status(201).json(roomType);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create Physical Rooms
// @route   POST /api/admin/rooms
// @access  Private/Admin
exports.createRooms = async (req, res) => {
  const { roomTypeId, count, startingNumber } = req.body;
  try {
    const rooms = [];
    for (let i = 0; i < count; i++) {
      rooms.push({
        hotelId: req.user.hotelId,
        roomTypeId,
        roomNumber: String(Number(startingNumber) + i)
      });
    }
    await Room.insertMany(rooms);
    res.status(201).json({ message: `${count} rooms created successfully.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Room Types
// @route   GET /api/admin/room-types
// @access  Private/Admin
exports.getRoomTypes = async (req, res) => {
  try {
    const types = await RoomType.find({ hotelId: req.user.hotelId });
    res.json(types);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Physical Rooms
// @route   GET /api/admin/rooms
// @access  Private/Admin
exports.getRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ hotelId: req.user.hotelId }).populate('roomTypeId', 'name');
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Room Status
// @route   PUT /api/admin/rooms/:id/status
// @access  Private/Admin
exports.updateRoomStatus = async (req, res) => {
  try {
    const room = await Room.findOneAndUpdate(
      { _id: req.params.id, hotelId: req.user.hotelId },
      { status: req.body.status },
      { returnDocument: 'after' }
    ).populate('roomTypeId', 'name');
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Rate Plans
// @route   GET /api/admin/rate-plans
// @access  Private/Admin
exports.getRatePlans = async (req, res) => {
  try {
    const plans = await RatePlan.find({ hotelId: req.user.hotelId }).populate('roomTypeId', 'name');
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create Rate Plan
// @route   POST /api/admin/rate-plans
// @access  Private/Admin
exports.createRatePlan = async (req, res) => {
  try {
    const plan = await RatePlan.create({ ...req.body, hotelId: req.user.hotelId });
    const populatedPlan = await RatePlan.findById(plan._id).populate('roomTypeId', 'name');
    res.status(201).json(populatedPlan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete Rate Plan
// @route   DELETE /api/admin/rate-plans/:id
// @access  Private/Admin
exports.deleteRatePlan = async (req, res) => {
  try {
    await RatePlan.findOneAndDelete({ _id: req.params.id, hotelId: req.user.hotelId });
    res.json({ message: 'Rate plan deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Bookings
// @route   GET /api/admin/bookings
// @access  Private/Admin
exports.getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ hotelId: req.user.hotelId }).populate('roomId', 'roomNumber roomTypeId');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create Booking
// @route   POST /api/admin/bookings
// @access  Private/Admin
exports.createBooking = async (req, res) => {
  try {
    const booking = await Booking.create({ ...req.body, hotelId: req.user.hotelId });

    // Auto-update room status to occupied
    await Room.findOneAndUpdate(
      { _id: req.body.roomId, hotelId: req.user.hotelId },
      { status: 'occupied' },
      { returnDocument: 'after' }
    );

    const populatedBooking = await Booking.findById(booking._id).populate('roomId', 'roomNumber');
    res.status(201).json(populatedBooking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Booking Status
// @route   PUT /api/admin/bookings/:id/status
// @access  Private/Admin
exports.updateBookingStatus = async (req, res) => {
  try {
    const updateData = { status: req.body.status };
    if (req.body.paymentStatus !== undefined) {
      updateData.paymentStatus = req.body.paymentStatus;
    }

    // Optional check-in guest details
    const optionalFields = [
      'comingFrom',
      'goingTo',
      'vehicleNumber',
      'idProofType',
      'idProofNumber',
      'nameAsPerIdProof'
    ];
    optionalFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, hotelId: req.user.hotelId },
      updateData,
      { returnDocument: 'after' }
    ).populate('roomId', 'roomNumber');

    // If cancelled or checked-out, free the room
    if (['cancelled', 'checked-out'].includes(req.body.status)) {
      await Room.findOneAndUpdate(
        { _id: booking.roomId._id, hotelId: req.user.hotelId },
        { status: 'available' },
        { returnDocument: 'after' }
      );
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create Staff User
// @route   POST /api/admin/staff
// @access  Private/Admin
exports.createStaff = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const staff = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'user',
      hotelId: req.user.hotelId
    });

    res.status(201).json({ _id: staff._id, name: staff.name, email: staff.email, role: staff.role });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Booking Details
// @route   PATCH /api/admin/bookings/:id
// @access  Private/Admin
exports.updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, hotelId: req.user.hotelId },
      req.body,
      { returnDocument: 'after' }
    ).populate('roomId', 'roomNumber roomTypeId');
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// @desc    Delete Booking
// @route   DELETE /api/admin/bookings/:id
// @access  Private/Admin
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findOneAndDelete({ _id: req.params.id, hotelId: req.user.hotelId });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.json({ message: 'Booking removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete Room
// @route   DELETE /api/admin/rooms/:id
// @access  Private/Admin
exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findOneAndDelete({ _id: req.params.id, hotelId: req.user.hotelId });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Room Blocks
// @route   GET /api/admin/room-blocks
// @access  Private/Admin
exports.getRoomBlocks = async (req, res) => {
  try {
    const blocks = await RoomBlock.find({ hotelId: req.user.hotelId })
      .populate('roomId', 'roomNumber')
      .populate('roomTypeId', 'name');
    res.json(blocks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create Room Block
// @route   POST /api/admin/room-blocks
// @access  Private/Admin
exports.createRoomBlock = async (req, res) => {
  try {
    const { roomId, roomTypeId, startDate, endDate, reason, notes } = req.body;
    const block = await RoomBlock.create({
      hotelId: req.user.hotelId,
      roomId,
      roomTypeId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      notes
    });
    const populated = await RoomBlock.findById(block._id)
      .populate('roomId', 'roomNumber')
      .populate('roomTypeId', 'name');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete Room Block
// @route   DELETE /api/admin/room-blocks/:id
// @access  Private/Admin
exports.deleteRoomBlock = async (req, res) => {
  try {
    const block = await RoomBlock.findOneAndDelete({ _id: req.params.id, hotelId: req.user.hotelId });
    if (!block) return res.status(404).json({ message: 'Block not found' });
    res.json({ message: 'Room block removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// @desc    Get Room Rack Data
// @route   GET /api/admin/room-rack
// @access  Private/Admin
exports.getRoomRack = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ message: 'startDate and endDate are required' });
    const start = new Date(startDate);
    const end = new Date(endDate);

    const roomTypes = await RoomType.find({ hotelId: req.user.hotelId }).lean();
    const rooms = await Room.find({ hotelId: req.user.hotelId }).lean();

    const bookings = await Booking.find({
      hotelId: req.user.hotelId,
      status: { $in: ['confirmed', 'checked-in', 'checked-out'] },
      $or: [
        { checkInDate: { $lte: end }, checkOutDate: { $gt: start } }
      ]
    }).lean();

    const roomBlocks = await RoomBlock.find({
      hotelId: req.user.hotelId,
      $or: [
        { startDate: { $lte: end }, endDate: { $gt: start } }
      ]
    }).lean();

    const categories = roomTypes.map(type => ({
      _id: type._id,
      name: type.name,
      rooms: rooms.filter(r => r.roomTypeId.toString() === type._id.toString()).sort((a, b) => a.roomNumber.localeCompare(b.roomNumber))
    }));

    res.json({
      categories,
      bookings: bookings.map(b => ({
        id: b._id,
        roomId: b.roomId,
        guestName: b.guestName,
        checkInDate: b.checkInDate,
        checkOutDate: b.checkOutDate,
        status: b.status,
        bookingSource: b.bookingSource || 'Direct',
        paymentStatus: b.paymentStatus
      })),
      blocks: roomBlocks.map(b => ({
        id: b._id,
        roomId: b.roomId,
        startDate: b.startDate,
        endDate: b.endDate,
        reason: b.reason
      }))
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// @desc    Search Bookings for Room Rack
// @route   GET /api/admin/room-rack/search
// @access  Private/Admin
exports.searchRackBookings = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ message: 'Search query is required' });
    const hotelId = req.user.hotelId;
    const regex = new RegExp(q, 'i');

    const matchingRooms = await Room.find({ hotelId, roomNumber: regex }).select('_id').lean();
    const roomIds = matchingRooms.map(r => r._id);

    const bookings = await Booking.find({
      hotelId,
      status: { $in: ['confirmed', 'checked-in', 'checked-out'] },
      $or: [
        { guestName: regex },
        { guestContact: regex },
        { bookingGroupId: regex },
        { roomId: { $in: roomIds } }
      ]
    }).populate('roomId', 'roomNumber').sort({ checkInDate: -1 }).limit(10).lean();

    res.json(bookings.map(b => ({
      id: b._id,
      guestName: b.guestName,
      roomNumber: b.roomId ? b.roomId.roomNumber : 'N/A',
      checkInDate: b.checkInDate,
      checkOutDate: b.checkOutDate,
      status: b.status
    })));
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const roundToTwo = (num) => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

// Helper to update booking totals based on extra services and payments
// Helper to distribute and update totals for a group booking
const recalculateGroupBookingTotals = async (bookingGroupId, hotelId) => {
  if (!bookingGroupId) return;

  const bookings = await Booking.find({ bookingGroupId, hotelId }).sort({ createdAt: 1 });
  if (bookings.length === 0) return;

  const bookingIds = bookings.map(b => b._id);

  // 1. Auto-seed initial legacy payments to Payment collection if no payments exist
  const paymentsCount = await Payment.countDocuments({ bookingId: { $in: bookingIds } });
  const totalLegacyPaid = bookings.reduce((sum, b) => sum + (b.paidAmount || 0), 0);

  if (paymentsCount === 0 && totalLegacyPaid > 0) {
    // Seed a real Payment document under the first booking in the group
    await Payment.create({
      bookingId: bookings[0]._id,
      hotelId: hotelId,
      paymentType: bookings[0].paymentMethod || 'Cash',
      additionType: 'Default',
      amount: roundToTwo(totalLegacyPaid),
      paymentDate: bookings[0].createdAt || new Date(),
      referenceText: 'Initial Payment (From Reservation)'
    });
  }

  // 2. Fetch all services and payments for the group
  const services = await ExtraService.find({ bookingId: { $in: bookingIds } });
  const payments = await Payment.find({ bookingId: { $in: bookingIds } });

  const totalPayments = roundToTwo(payments.reduce((sum, p) => {
    if (p.additionType === 'Refund') return sum - (p.amount || 0);
    return sum + (p.amount || 0);
  }, 0));

  // Use the total payments (including the seeded initial payment)
  let groupPaidAmount = totalPayments;

  // 3. Evaluate totalAmount for each individual booking in the group
  let updatedBookings = [];
  for (const b of bookings) {
    const bServices = services.filter(s => s.bookingId.toString() === b._id.toString());
    const bServicesTotal = bServices.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
    const baseAmount = (b.cost || 0) + (b.gst || 0) - (b.discount || 0);
    const bTotalAmount = roundToTwo(baseAmount + bServicesTotal);
    updatedBookings.push({
      _id: b._id,
      totalAmount: bTotalAmount,
      paidAmount: 0,
      pendingAmount: bTotalAmount,
      paymentStatus: 'pending'
    });
  }

  // 4. Distribute the group's total paid amount across bookings
  let remainingPaid = groupPaidAmount;
  for (let ub of updatedBookings) {
    if (remainingPaid <= 0) {
      ub.paidAmount = 0;
      ub.pendingAmount = ub.totalAmount;
      ub.paymentStatus = 'pending';
    } else if (remainingPaid >= ub.totalAmount) {
      ub.paidAmount = ub.totalAmount;
      ub.pendingAmount = 0;
      ub.paymentStatus = 'paid';
      remainingPaid = roundToTwo(remainingPaid - ub.totalAmount);
    } else {
      ub.paidAmount = remainingPaid;
      ub.pendingAmount = roundToTwo(ub.totalAmount - remainingPaid);
      ub.paymentStatus = 'partial';
      remainingPaid = 0;
    }
  }

  // Allocate any overpayment (positive balance) to the first booking in the group
  if (remainingPaid > 0 && updatedBookings.length > 0) {
    updatedBookings[0].paidAmount = roundToTwo(updatedBookings[0].paidAmount + remainingPaid);
    updatedBookings[0].pendingAmount = 0;
    updatedBookings[0].paymentStatus = 'paid';
  }

  // 5. Update each booking in the database
  for (const ub of updatedBookings) {
    await Booking.findOneAndUpdate(
      { _id: ub._id, hotelId },
      { 
        totalAmount: ub.totalAmount,
        paidAmount: ub.paidAmount,
        pendingAmount: ub.pendingAmount,
        paymentStatus: ub.paymentStatus
      }
    );
  }
};

// Helper to update booking totals based on extra services and payments
const recalculateBookingTotals = async (bookingId, hotelId) => {
  const booking = await Booking.findOne({ _id: bookingId, hotelId });
  if (!booking) return;

  if (booking.bookingGroupId) {
    await recalculateGroupBookingTotals(booking.bookingGroupId, hotelId);
  } else {
    // 1. Auto-seed initial legacy payments if no payments exist
    const paymentsCount = await Payment.countDocuments({ bookingId });
    if (paymentsCount === 0 && booking.paidAmount > 0) {
      await Payment.create({
        bookingId: booking._id,
        hotelId: hotelId,
        paymentType: booking.paymentMethod || 'Cash',
        additionType: 'Default',
        amount: roundToTwo(booking.paidAmount),
        paymentDate: booking.createdAt || new Date(),
        referenceText: 'Initial Payment (From Reservation)'
      });
    }

    // 2. Fetch all services and payments for this single booking
    const services = await ExtraService.find({ bookingId });
    const servicesTotal = services.reduce((sum, s) => sum + (s.grandTotal || 0), 0);

    const payments = await Payment.find({ bookingId });
    const totalPaid = roundToTwo(payments.reduce((sum, p) => {
      if (p.additionType === 'Refund') return sum - (p.amount || 0);
      return sum + (p.amount || 0);
    }, 0));

    const baseAmount = (booking.cost || 0) + (booking.gst || 0) - (booking.discount || 0);
    const newTotal = roundToTwo(baseAmount + servicesTotal);
    const newPending = Math.max(0, roundToTwo(newTotal - totalPaid));

    let paymentStatus = 'pending';
    if (totalPaid >= newTotal && newTotal > 0) {
      paymentStatus = 'paid';
    } else if (totalPaid > 0) {
      paymentStatus = 'partial';
    }

    await Booking.findOneAndUpdate(
      { _id: bookingId, hotelId },
      { 
        totalAmount: newTotal,
        paidAmount: totalPaid, 
        pendingAmount: newPending,
        paymentStatus
      }
    );
  }
};

// @desc    Add Extra Service
// @route   POST /api/admin/bookings/:id/services
// @access  Private/Admin
exports.addExtraService = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const hotelId = req.user.hotelId;
    const { name, amountWithoutTax, taxName, taxAmount, discount, date, referenceText } = req.body;
    
    const amt = roundToTwo(Number(amountWithoutTax || 0));
    const tax = roundToTwo(Number(taxAmount || 0));
    const disc = roundToTwo(Number(discount || 0));
    const grandTotal = roundToTwo(amt + tax - disc);

    const extraService = await ExtraService.create({
      bookingId,
      hotelId,
      name,
      amountWithoutTax: amt,
      taxName,
      taxAmount: tax,
      discount: disc,
      referenceText,
      date: date ? new Date(date) : new Date(),
      grandTotal
    });

    await recalculateBookingTotals(bookingId, hotelId);

    res.status(201).json(extraService);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete Extra Service
// @route   DELETE /api/admin/services/:id
// @access  Private/Admin
exports.deleteExtraService = async (req, res) => {
  try {
    const serviceId = req.params.id;
    const hotelId = req.user.hotelId;

    const service = await ExtraService.findOne({ _id: serviceId, hotelId });
    if (!service) return res.status(404).json({ message: 'Service not found' });

    const bookingId = service.bookingId;
    await ExtraService.findOneAndDelete({ _id: serviceId, hotelId });

    await recalculateBookingTotals(bookingId, hotelId);

    res.json({ message: 'Service removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add Payment Folio
// @route   POST /api/admin/bookings/:id/payments
// @access  Private/Admin
exports.addPaymentFolio = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const hotelId = req.user.hotelId;
    const { paymentType, additionType, amount, paymentDate, referenceText } = req.body;

    const payment = await Payment.create({
      bookingId,
      hotelId,
      paymentType,
      additionType: additionType || 'Default',
      amount: roundToTwo(Number(amount || 0)),
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      referenceText
    });

    await recalculateBookingTotals(bookingId, hotelId);

    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete Payment Folio
// @route   DELETE /api/admin/payments/:id
// @access  Private/Admin
exports.deletePaymentFolio = async (req, res) => {
  try {
    const paymentId = req.params.id;
    const hotelId = req.user.hotelId;

    if (paymentId && paymentId.startsWith('initial-pay-')) {
      const actualBookingId = paymentId.replace('initial-pay-', '');
      const booking = await Booking.findOne({ _id: actualBookingId, hotelId });
      if (booking) {
        await Booking.findOneAndUpdate(
          { _id: actualBookingId, hotelId },
          { paidAmount: 0 }
        );
        await recalculateBookingTotals(actualBookingId, hotelId);
        return res.json({ message: 'Initial payment removed successfully' });
      } else {
        return res.status(404).json({ message: 'Booking not found' });
      }
    }

    const payment = await Payment.findOne({ _id: paymentId, hotelId });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    const bookingId = payment.bookingId;
    const booking = await Booking.findOne({ _id: bookingId, hotelId });
    
    let bookingIds = [bookingId];
    if (booking && booking.bookingGroupId) {
      const groupBookings = await Booking.find({ bookingGroupId: booking.bookingGroupId, hotelId });
      bookingIds = groupBookings.map(gb => gb._id);
    }

    await Payment.findOneAndDelete({ _id: paymentId, hotelId });

    // Prevent auto-seed loop: if no payments are left for single/group, zero out database paidAmount first
    const remainingCount = await Payment.countDocuments({ bookingId: { $in: bookingIds } });
    if (remainingCount === 0) {
      await Booking.updateMany(
        { _id: { $in: bookingIds }, hotelId },
        { paidAmount: 0 }
      );
    }

    await recalculateBookingTotals(bookingId, hotelId);

    res.json({ message: 'Payment removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Process Checkout for Booking
// @route   PUT /api/admin/bookings/:id/checkout
// @access  Private/Admin
exports.processCheckout = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const hotelId = req.user.hotelId;
    const { haveGst, onDutyManager, departureDateTime, checkoutComment, markRoomTo, emailInvoiceToGuest } = req.body;

    const booking = await Booking.findOne({ _id: bookingId, hotelId });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Update checkout details on the booking
    booking.status = 'checked-out';
    booking.haveGst = haveGst || 'No';
    booking.onDutyManager = onDutyManager;
    booking.departureDateTime = departureDateTime ? new Date(departureDateTime) : new Date();
    booking.checkoutComment = checkoutComment;
    booking.markRoomTo = markRoomTo || 'Dirty';
    booking.emailInvoiceToGuest = emailInvoiceToGuest || 'No';

    await booking.save();

    // Map selected physical room status
    // "Dirty" or "Cleaning" -> 'cleaning', "Available" -> 'available', "Maintenance" -> 'maintenance'
    let targetRoomStatus = 'cleaning';
    if (markRoomTo === 'Available') {
      targetRoomStatus = 'available';
    } else if (markRoomTo === 'Maintenance') {
      targetRoomStatus = 'maintenance';
    }

    // Free the room
    if (booking.roomId) {
      await Room.findOneAndUpdate(
        { _id: booking.roomId, hotelId },
        { status: targetRoomStatus }
      );
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Detailed Booking Information
// @route   GET /api/admin/bookings/:id/details
// @access  Private/Admin
exports.getBookingDetails = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const hotelId = req.user.hotelId;
    
    // Automatically recalculate totals on fetch to heal any legacy/stale booking states
    await recalculateBookingTotals(bookingId, hotelId);
    
    const booking = await Booking.findOne({ _id: bookingId, hotelId })
      .populate('roomId', 'roomNumber name roomTypeId status')
      .populate('hotelId', 'name')
      .lean();
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    // Fetch all bookings in the same group (if any)
    let groupBookings = [];
    let bookingIds = [bookingId];
    if (booking.bookingGroupId) {
      groupBookings = await Booking.find({ bookingGroupId: booking.bookingGroupId, hotelId })
        .populate({
          path: 'roomId',
          select: 'roomNumber roomTypeId status',
          populate: { path: 'roomTypeId', select: 'name' }
        })
        .lean();
      bookingIds = groupBookings.map(gb => gb._id);
    } else {
      const populated = await Booking.findById(booking._id)
        .populate({
          path: 'roomId',
          select: 'roomNumber roomTypeId status',
          populate: { path: 'roomTypeId', select: 'name' }
        })
        .lean();
      groupBookings = [populated];
    }

    // Fetch all rooms to allow changing rooms in dropdowns
    const allRooms = await Room.find({ hotelId })
      .populate('roomTypeId', 'name')
      .lean();
      
    // Fetch all extra services for the group (or single booking)
    const services = await ExtraService.find({ bookingId: { $in: bookingIds } }).lean();
    
    const checkInDetails = (booking.status === 'checked-in' || booking.status === 'checked-out') ? {
      status: 'completed', time: booking.arrivalTime || booking.updatedAt, assignedRoom: booking.roomId?.roomNumber || 'N/A', notes: booking.internalNotes || '', idVerified: !!booking.idProofNumber
    } : null;
    const checkOutDetails = (booking.status === 'checked-out') ? {
      status: 'completed',
      time: booking.departureDateTime || booking.updatedAt,
      settlementStatus: booking.paymentStatus === 'paid' ? 'Settled' : 'Pending Balance',
      haveGst: booking.haveGst || 'No',
      onDutyManager: booking.onDutyManager || 'N/A',
      checkoutComment: booking.checkoutComment || '',
      markRoomTo: booking.markRoomTo || 'Dirty',
      emailInvoiceToGuest: booking.emailInvoiceToGuest || 'No'
    } : null;
    
    // Fetch all payments for the group (or single booking)
    const payments = await Payment.find({ bookingId: { $in: bookingIds } }).lean();
    
    res.json({ 
      booking, 
      payments, 
      services, 
      checkInDetails, 
      checkOutDetails,
      groupBookings,
      allRooms
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// @desc    Update Complete Booking Group
// @route   PUT /api/admin/bookings/group/:groupId
// @access  Private/Admin
exports.updateBookingGroup = async (req, res) => {
  const { groupId } = req.params;
  const hotelId = req.user.hotelId;
  const {
    checkInDate,
    checkOutDate,
    guestDetails,
    paymentDetails,
    selectedRooms,
    gstMode,
    totalDiscount,
    payableAmount
  } = req.body;

  try {
    // 1. Validate room availability first to prevent conflicts before starting database work
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    for (const roomConf of selectedRooms) {
      const { roomId, bookingId } = roomConf;
      
      // Look up physical room details for display name in validation message
      const room = await Room.findById(roomId);
      if (!room) {
        return res.status(404).json({ message: `Physical room not found.` });
      }

      // Check overlap booking conflict
      const conflictBooking = await Booking.findOne({
        hotelId: hotelId,
        _id: { $ne: bookingId }, // ignore this specific booking record if updating
        bookingGroupId: { $ne: groupId }, // ignore all other booking records in the same group being edited
        roomId: roomId,
        status: { $in: ['confirmed', 'checked-in'] },
        checkInDate: { $lt: checkOut },
        checkOutDate: { $gt: checkIn }
      });

      if (conflictBooking) {
        return res.status(400).json({
          message: `Room ${room.roomNumber} is already booked by ${conflictBooking.guestName} for the selected dates.`
        });
      }

      // Check overlap room block conflict
      const conflictBlock = await RoomBlock.findOne({
        hotelId: hotelId,
        roomId: roomId,
        startDate: { $lt: checkOut },
        endDate: { $gt: checkIn }
      });

      if (conflictBlock) {
        return res.status(400).json({
          message: `Room ${room.roomNumber} is blocked due to ${conflictBlock.reason} for the selected dates.`
        });
      }
    }

    // 2. Start a Mongoose Session & Transaction (with standalone grace fallback)
    const mongoose = require('mongoose');
    let session = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch (e) {
      console.warn("MongoDB replica set not detected. Running without multi-document transaction session.");
      session = null;
    }

    try {
      // 3. Find old booking records in this group to identify deleted rooms
      const isValidObjectId = mongoose.Types.ObjectId.isValid(groupId);
      const oldBookings = await Booking.find({
        hotelId: hotelId,
        $or: [
          { bookingGroupId: groupId },
          ...(isValidObjectId ? [{ _id: groupId }] : [])
        ]
      });
      const oldBookingIds = oldBookings.map(b => b._id.toString());
      const selectedBookingIds = selectedRooms.map(r => r.bookingId).filter(Boolean);

      // Find deleted bookings
      const deletedBookings = oldBookings.filter(b => !selectedBookingIds.includes(b._id.toString()));
      for (const db of deletedBookings) {
        // Free up physical room status
        if (db.roomId) {
          await Room.findOneAndUpdate(
            { _id: db.roomId, hotelId },
            { status: 'available' },
            { session }
          );
        }
        // Delete the booking record
        await Booking.findOneAndDelete(
          { _id: db._id, hotelId },
          { session }
        );
      }

      // 4. Update or Create bookings for each room configuration
      const updatedBookings = [];
      const discountPerRoom = roundToTwo(totalDiscount / selectedRooms.length);

      for (let index = 0; index < selectedRooms.length; index++) {
        const roomConf = selectedRooms[index];
        const { bookingId, roomId, adults, children, infant, mealPlan, cost, gst, totalAmount } = roomConf;

        const bookingData = {
          hotelId: hotelId,
          roomId: roomId,
          guestName: guestDetails.guestName,
          guestContact: guestDetails.guestContact,
          guestEmail: guestDetails.email,
          guestAddress: guestDetails.address,
          guestDob: guestDetails.guestDob ? new Date(guestDetails.guestDob) : undefined,
          guestCountry: guestDetails.guestCountry,
          guestState: guestDetails.guestState,
          guestCity: guestDetails.guestCity,
          companyName: guestDetails.companyName,
          companyGst: guestDetails.companyGst,
          companyAddress: guestDetails.companyAddress,
          idProofType: guestDetails.idType,
          idProofNumber: guestDetails.idNumber,
          nationality: guestDetails.nationality,
          arrivalTime: guestDetails.arrivalTime,
          specialRequests: guestDetails.specialNote,
          gender: guestDetails.gender,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          cost: roundToTwo(cost),
          gst: roundToTwo(gst),
          discount: discountPerRoom,
          discountValue: discountPerRoom,
          totalAmount: roundToTwo(totalAmount),
          mealPlan: mealPlan,
          adults: adults,
          children: children,
          infant: infant,
          gstMode: gstMode,
          bookingGroupId: groupId,
          paymentMode: paymentDetails.paymentMode,
          paymentMethod: paymentDetails.paymentMethod,
          paymentReference: paymentDetails.paymentReference,
          internalNotes: paymentDetails.internalNotes,
          status: oldBookings[0]?.status || 'confirmed' // Keep old check-in status (e.g. checked-in)
        };

        if (bookingId) {
          // Update existing booking
          const oldB = oldBookings.find(b => b._id.toString() === bookingId);
          const oldRoomId = oldB?.roomId?.toString();
          
          const updatedB = await Booking.findOneAndUpdate(
            { _id: bookingId, hotelId },
            bookingData,
            { returnDocument: 'after', session }
          );
          
          updatedBookings.push(updatedB);

          // Synchronize room status if physical room assignment changed
          if (oldRoomId && oldRoomId !== roomId.toString()) {
            // Revert old room status to available
            await Room.findOneAndUpdate(
              { _id: oldRoomId, hotelId },
              { status: 'available' },
              { session }
            );
            // Set new room status based on check-in state
            const targetRoomStatus = updatedB.status === 'checked-in' ? 'occupied' : 'available';
            await Room.findOneAndUpdate(
              { _id: roomId, hotelId },
              { status: targetRoomStatus },
              { session }
            );
          } else {
            // If room didn't change, ensure room matches check-in status
            const targetRoomStatus = updatedB.status === 'checked-in' ? 'occupied' : 'available';
            await Room.findOneAndUpdate(
              { _id: roomId, hotelId },
              { status: targetRoomStatus },
              { session }
            );
          }
        } else {
          // Create a new booking row added during editing
          const newB = await Booking.create([bookingData], { session });
          const createdB = newB[0];
          updatedBookings.push(createdB);

          // Mark newly added room status
          const targetRoomStatus = createdB.status === 'checked-in' ? 'occupied' : 'available';
          await Room.findOneAndUpdate(
            { _id: roomId, hotelId },
            { status: targetRoomStatus },
            { session }
          );
        }
      }

      // 5. Synchronize associated Payments
      const firstBookingId = updatedBookings[0]?._id;
      if (firstBookingId) {
        const paymentAmount = roundToTwo(Number(paymentDetails.amountPaid || 0));
        
        // Find existing payments for this group
        const bookingIds = updatedBookings.map(b => b._id);
        const existingPayments = await Payment.find({ bookingId: { $in: bookingIds } }).session(session);

        if (existingPayments.length > 0) {
          // Update the first payment record
          await Payment.findOneAndUpdate(
            { _id: existingPayments[0]._id, hotelId },
            {
              bookingId: firstBookingId,
              amount: paymentAmount,
              paymentType: paymentDetails.paymentMethod || 'Cash',
              referenceText: paymentDetails.paymentReference || 'Updated Payment Details'
            },
            { session }
          );
        } else if (paymentAmount > 0) {
          // Create new Payment document if none existed
          await Payment.create([{
            bookingId: firstBookingId,
            hotelId: hotelId,
            paymentType: paymentDetails.paymentMethod || 'Cash',
            additionType: 'Default',
            amount: paymentAmount,
            paymentDate: new Date(),
            referenceText: paymentDetails.paymentReference || 'Initial Payment (From Edit)'
          }], { session });
        }
      }

      // Commit the transaction
      if (session) {
        await session.commitTransaction();
      }

      // 6. Recalculate PMS financials across the updated group
      await recalculateGroupBookingTotals(groupId, hotelId);

      // Fetch the updated populated records to return
      const finalBookings = await Booking.find({
        hotelId,
        $or: [
          { bookingGroupId: groupId },
          ...(isValidObjectId ? [{ _id: groupId }] : [])
        ]
      }).populate('roomId', 'roomNumber roomTypeId');
      res.json(finalBookings);

    } catch (innerError) {
      if (session) {
        await session.abortTransaction();
      }
      throw innerError;
    } finally {
      if (session) {
        session.endSession();
      }
    }

  } catch (error) {
    console.error("Booking group update error:", error);
    res.status(500).json({ message: error.message });
  }
};

