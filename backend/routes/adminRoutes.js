const express = require('express');
const router = express.Router();
const { updateHotelProfile, createRoomType, createRooms, deleteRoom, createStaff, getHotelProfile, getStaffList, getRoomTypes, getRooms, updateRoomStatus, getRatePlans, createRatePlan, deleteRatePlan, getBookings, createBooking, updateBookingStatus, updateBooking, deleteBooking, getRoomBlocks, createRoomBlock, deleteRoomBlock, getRoomRack, searchRackBookings, getBookingDetails } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/hotel', protect, authorize('admin'), getHotelProfile);
router.put('/hotel', protect, authorize('admin'), updateHotelProfile);
router.get('/room-types', protect, authorize('admin'), getRoomTypes);
router.post('/room-types', protect, authorize('admin'), createRoomType);
router.get('/rooms', protect, authorize('admin'), getRooms);
router.post('/rooms', protect, authorize('admin'), createRooms);
router.put('/rooms/:id/status', protect, authorize('admin'), updateRoomStatus);
router.delete('/rooms/:id', protect, authorize('admin'), deleteRoom);
router.get('/staff', protect, authorize('admin'), getStaffList);
router.post('/staff', protect, authorize('admin'), createStaff);

router.get('/rate-plans', protect, authorize('admin'), getRatePlans);
router.post('/rate-plans', protect, authorize('admin'), createRatePlan);
router.delete('/rate-plans/:id', protect, authorize('admin'), deleteRatePlan);

router.get('/bookings', protect, authorize('admin'), getBookings);
router.post('/bookings', protect, authorize('admin'), createBooking);
router.get('/bookings/:id/details', protect, authorize('admin'), getBookingDetails);
router.put('/bookings/:id/status', protect, authorize('admin'), updateBookingStatus);
router.patch('/bookings/:id', protect, authorize('admin'), updateBooking);
router.delete('/bookings/:id', protect, authorize('admin'), deleteBooking);

router.get('/room-blocks', protect, authorize('admin'), getRoomBlocks);
router.post('/room-blocks', protect, authorize('admin'), createRoomBlock);
router.delete('/room-blocks/:id', protect, authorize('admin'), deleteRoomBlock);

router.get('/room-rack', protect, authorize('admin'), getRoomRack);
router.get('/room-rack/search', protect, authorize('admin'), searchRackBookings);

module.exports = router;
