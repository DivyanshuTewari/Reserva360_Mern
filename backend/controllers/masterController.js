const User = require('../models/User');
const Hotel = require('../models/Hotel');
const bcrypt = require('bcrypt');
const Room = require('../models/Room');
const RoomType = require('../models/RoomType');
const Booking = require('../models/Booking');
// @desc    Create a new Hotel and its Admin
// @route   POST /api/master/create-hotel
// @access  Private/Master
exports.createHotelAndAdmin = async (req, res) => {
  const { hotelName, address, adminName, adminEmail, adminPassword, adminPhone, instagram, purchaseDate, subscriptionMonths, securityQuestion, securityAnswer } = req.body;

  try {
    // Check if admin email already exists
    const userExists = await User.findOne({ email: adminEmail });
    if (userExists) {
      return res.status(400).json({ message: 'Admin email already exists' });
    }

    // Calculate subscription end date
    const start = purchaseDate ? new Date(purchaseDate) : new Date();
    const months = subscriptionMonths ? parseInt(subscriptionMonths) : 12;
    const endDate = new Date(start);
    endDate.setMonth(endDate.getMonth() + months);

    // 1. Create Hotel
    const hotel = await Hotel.create({
      name: hotelName,
      address: address,
      adminPhone: adminPhone || '',
      instagram: instagram || '',
      purchaseDate: start,
      subscriptionMonths: months,
      subscriptionEndDate: endDate
    });

    // 2. Create Admin user linked to this hotel
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    const admin = await User.create({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      hotelId: hotel._id,
      securityQuestion: securityQuestion || '',
      securityAnswer: securityAnswer || ''
    });

    res.status(201).json({
      message: 'Hotel and Admin created successfully',
      hotel,
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all hotels
// @route   GET /api/master/hotels
// @access  Private/Master
exports.getHotels = async (req, res) => {
  try {
    const hotels = await Hotel.find().lean();
    for (let hotel of hotels) {
      const adminUser = await User.findOne({ hotelId: hotel._id, role: 'admin' }).select('securityQuestion securityAnswer email name');
      hotel.adminDetails = adminUser;
    }
    res.json(hotels);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Edit Hotel Details
// @route   PUT /api/master/edit-hotel/:id
// @access  Private/Master
exports.editHotel = async (req, res) => {
  try {
    const { name, address, adminPhone, instagram, subscriptionMonths, securityQuestion, securityAnswer } = req.body;
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) return res.status(404).json({ message: 'Hotel not found' });

    hotel.name = name || hotel.name;
    hotel.address = address || hotel.address;
    if (adminPhone !== undefined) hotel.adminPhone = adminPhone;
    if (instagram !== undefined) hotel.instagram = instagram;
    
    if (subscriptionMonths) {
      hotel.subscriptionMonths = subscriptionMonths;
      const start = hotel.purchaseDate ? new Date(hotel.purchaseDate) : new Date();
      const endDate = new Date(start);
      endDate.setMonth(endDate.getMonth() + parseInt(subscriptionMonths));
      hotel.subscriptionEndDate = endDate;
    }
    await hotel.save();

    // Update associated admin user's security questions if provided
    if (securityQuestion !== undefined || securityAnswer !== undefined) {
      const admin = await User.findOne({ hotelId: hotel._id, role: 'admin' });
      if (admin) {
        if (securityQuestion !== undefined) admin.securityQuestion = securityQuestion;
        if (securityAnswer !== undefined) admin.securityAnswer = securityAnswer;
        await admin.save();
      }
    }

    res.json({ message: 'Hotel updated successfully', hotel });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reset Admin Password manually by Master
// @route   PUT /api/master/reset-admin-password/:hotelId
// @access  Private/Master
exports.resetAdminPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const admin = await User.findOne({ hotelId: req.params.hotelId, role: 'admin' });
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found for this hotel' });
    }

    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);
    await admin.save();

    res.json({ message: 'Admin password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Revoke Hotel Access and delete all associated data
// @route   DELETE /api/master/revoke-hotel/:id
// @access  Private/Master
exports.revokeHotelAccess = async (req, res) => {
  try {
    const hotelId = req.params.id;
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) return res.status(404).json({ message: 'Hotel not found' });

    // Cascading delete
    await User.deleteMany({ hotelId });
    await Room.deleteMany({ hotelId });
    await RoomType.deleteMany({ hotelId });
    await Booking.deleteMany({ hotelId });
    await Hotel.findByIdAndDelete(hotelId);

    res.json({ message: 'Hotel and all associated data permanently revoked' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Renew/Reactivate Hotel Subscription
// @route   PUT /api/master/renew-hotel/:id
// @access  Private/Master
exports.renewHotel = async (req, res) => {
  try {
    const { additionalMonths } = req.body;
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) return res.status(404).json({ message: 'Hotel not found' });

    const now = new Date();
    let currentEnd = hotel.subscriptionEndDate ? new Date(hotel.subscriptionEndDate) : now;
    
    // If expired, start from today. If active, add to existing end date.
    if (currentEnd < now) {
      currentEnd = now;
    }

    currentEnd.setMonth(currentEnd.getMonth() + parseInt(additionalMonths));
    
    hotel.subscriptionEndDate = currentEnd;
    hotel.subscriptionMonths = (hotel.subscriptionMonths || 0) + parseInt(additionalMonths);
    await hotel.save();

    res.json({ message: 'Hotel subscription renewed successfully', hotel });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
