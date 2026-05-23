const Hotel = require('../models/Hotel');
const RoomType = require('../models/RoomType');
const Room = require('../models/Room');
const User = require('../models/User');
const bcrypt = require('bcrypt');

// @desc    Update Hotel Profile
// @route   PUT /api/admin/hotel
// @access  Private/Admin
exports.updateHotelProfile = async (req, res) => {
  try {
    const hotel = await Hotel.findByIdAndUpdate(req.user.hotelId, req.body, { new: true });
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
