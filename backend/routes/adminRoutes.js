const express = require('express');
const router = express.Router();
const { updateHotelProfile, createRoomType, createRooms, createStaff } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.put('/hotel', protect, authorize('admin'), updateHotelProfile);
router.post('/room-types', protect, authorize('admin'), createRoomType);
router.post('/rooms', protect, authorize('admin'), createRooms);
router.post('/staff', protect, authorize('admin'), createStaff);

module.exports = router;
