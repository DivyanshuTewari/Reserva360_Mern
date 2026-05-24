const Hotel = require('../models/Hotel');
const RoomType = require('../models/RoomType');
const Room = require('../models/Room');
const User = require('../models/User');
const RatePlan = require('../models/RatePlan');
const Booking = require('../models/Booking');
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
