const express = require('express');
const router = express.Router();
const { updateHotelProfile, createRoomType, createRooms, createStaff, getHotelProfile, getStaffList, getRoomTypes, getRooms, updateRoomStatus, getRatePlans, createRatePlan, deleteRatePlan, getBookings, createBooking, updateBookingStatus } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/hotel', protect, authorize('admin'), getHotelProfile);
router.put('/hotel', protect, authorize('admin'), updateHotelProfile);
router.get('/room-types', protect, authorize('admin'), getRoomTypes);
router.post('/room-types', protect, authorize('admin'), createRoomType);
router.get('/rooms', protect, authorize('admin'), getRooms);
router.post('/rooms', protect, authorize('admin'), createRooms);
router.put('/rooms/:id/status', protect, authorize('admin'), updateRoomStatus);
router.get('/staff', protect, authorize('admin'), getStaffList);
router.post('/staff', protect, authorize('admin'), createStaff);

router.get('/rate-plans', protect, authorize('admin'), getRatePlans);
router.post('/rate-plans', protect, authorize('admin'), createRatePlan);
router.delete('/rate-plans/:id', protect, authorize('admin'), deleteRatePlan);

router.get('/bookings', protect, authorize('admin'), getBookings);
router.post('/bookings', protect, authorize('admin'), createBooking);
router.put('/bookings/:id/status', protect, authorize('admin'), updateBookingStatus);

module.exports = router;
