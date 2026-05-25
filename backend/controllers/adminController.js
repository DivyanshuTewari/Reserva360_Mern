const Hotel = require('../models/Hotel');
const RoomType = require('../models/RoomType');
const Room = require('../models/Room');
const User = require('../models/User');
const RatePlan = require('../models/RatePlan');
const Booking = require('../models/Booking');
const RoomBlock = require('../models/RoomBlock');
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
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, hotelId: req.user.hotelId },
      { status: req.body.status, paymentStatus: req.body.paymentStatus },
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
      status: { $in: ['confirmed', 'checked-in'] },
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
      status: { $in: ['confirmed', 'checked-in'] },
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

// @desc    Get Detailed Booking Information
// @route   GET /api/admin/bookings/:id/details
// @access  Private/Admin
exports.getBookingDetails = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const hotelId = req.user.hotelId;
    
    const booking = await Booking.findOne({ _id: bookingId, hotelId }).populate('roomId', 'roomNumber name').populate('hotelId', 'name').lean();
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    const checkInDetails = (booking.status === 'checked-in' || booking.status === 'checked-out') ? {
      status: 'completed', time: booking.arrivalTime || booking.updatedAt, assignedRoom: booking.roomId?.roomNumber || 'N/A', notes: booking.internalNotes || '', idVerified: !!booking.idProofNumber
    } : null;
    const checkOutDetails = (booking.status === 'checked-out') ? {
      status: 'completed', time: booking.updatedAt, settlementStatus: booking.paymentStatus === 'paid' ? 'Settled' : 'Pending Balance'
    } : null;
    
    const payments = [];
    if (booking.paidAmount > 0) payments.push({ id: `pay-${booking._id}`, date: booking.createdAt, method: booking.paymentMethod || 'Cash', amount: booking.paidAmount, transactionId: booking.paymentReference || 'N/A' });
    
    res.json({ booking, payments, services: [], checkInDetails, checkOutDetails });
  } catch (error) { res.status(500).json({ message: error.message }); }
};
