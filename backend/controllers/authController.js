const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Init Master user (Run once)
// @route   POST /api/auth/init-master
// @access  Public (should be protected or removed after first run)
exports.initMaster = async (req, res) => {
  try {
    const masterExists = await User.findOne({ role: 'master' });
    if (masterExists) {
      return res.status(400).json({ message: 'Master user already initialized' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Dt@12master', salt);

    const masterUser = await User.create({
      name: 'Master Developer',
      email: 'divyanshudemy2005@gmail.com',
      password: hashedPassword,
      role: 'master',
    });

    res.status(201).json({
      _id: masterUser._id,
      name: masterUser.name,
      email: masterUser.email,
      role: masterUser.role,
      token: generateToken(masterUser._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Master Login
// @route   POST /api/auth/master-login
// @access  Public
exports.masterLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email, role: 'master' });

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid master credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    User/Admin Login
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).populate('hotelId');

    // Make sure master doesn't login here
    if (user && user.role === 'master') {
      return res.status(401).json({ message: 'Master must use secure login route' });
    }

    if (user && user.hotelId && new Date(user.hotelId.subscriptionEndDate) < new Date()) {
      return res.status(403).json({ message: 'Your subscription has expired. Please contact the master administrator.' });
    }

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hotel: user.hotelId,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
