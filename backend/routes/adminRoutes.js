const express = require('express');
const router = express.Router();
const { updateHotelProfile, createRoomType, createRooms, deleteRoom, createStaff, getHotelProfile, getStaffList, getRoomTypes, getRooms, updateRoomStatus, getRatePlans, createRatePlan, deleteRatePlan, getBookings, createBooking, updateBookingStatus, updateBooking, deleteBooking, getRoomBlocks, createRoomBlock, deleteRoomBlock, getRoomRack, searchRackBookings, getBookingDetails, addExtraService, deleteExtraService, addPaymentFolio, deletePaymentFolio, processCheckout, updateBookingGroup } = require('../controllers/adminController');
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
router.put('/bookings/:id/checkout', protect, authorize('admin'), processCheckout);
router.patch('/bookings/:id', protect, authorize('admin'), updateBooking);
router.put('/bookings/group/:groupId', protect, authorize('admin'), updateBookingGroup);
router.delete('/bookings/:id', protect, authorize('admin'), deleteBooking);

router.post('/bookings/:id/services', protect, authorize('admin'), addExtraService);
router.delete('/services/:id', protect, authorize('admin'), deleteExtraService);

router.post('/bookings/:id/payments', protect, authorize('admin'), addPaymentFolio);
router.delete('/payments/:id', protect, authorize('admin'), deletePaymentFolio);

router.get('/room-blocks', protect, authorize('admin'), getRoomBlocks);
router.post('/room-blocks', protect, authorize('admin'), createRoomBlock);
router.delete('/room-blocks/:id', protect, authorize('admin'), deleteRoomBlock);

router.get('/room-rack', protect, authorize('admin'), getRoomRack);
router.get('/room-rack/search', protect, authorize('admin'), searchRackBookings);

// POS & Billing routes
const {
  createOutlet, getOutlets, updateOutlet, deleteOutlet,
  createItem, getItems, updateItem, deleteItem,
  createOrder, getOrders, updateOrder, deleteOrder,
  logWastage, getWastageLogs,
  createTable, getTables, updateTable, deleteTable, transferTableOrder
} = require('../controllers/posController');

router.get('/pos/outlets', protect, authorize('admin'), getOutlets);
router.post('/pos/outlets', protect, authorize('admin'), createOutlet);
router.put('/pos/outlets/:id', protect, authorize('admin'), updateOutlet);
router.delete('/pos/outlets/:id', protect, authorize('admin'), deleteOutlet);

router.get('/pos/items', protect, authorize('admin'), getItems);
router.post('/pos/items', protect, authorize('admin'), createItem);
router.put('/pos/items/:id', protect, authorize('admin'), updateItem);
router.delete('/pos/items/:id', protect, authorize('admin'), deleteItem);

router.get('/pos/orders', protect, authorize('admin'), getOrders);
router.post('/pos/orders', protect, authorize('admin'), createOrder);
router.put('/pos/orders/:id', protect, authorize('admin'), updateOrder);
router.delete('/pos/orders/:id', protect, authorize('admin'), deleteOrder);
router.post('/pos/orders/:id/transfer-table', protect, authorize('admin'), transferTableOrder);

router.get('/pos/tables', protect, authorize('admin'), getTables);
router.post('/pos/tables', protect, authorize('admin'), createTable);
router.put('/pos/tables/:id', protect, authorize('admin'), updateTable);
router.delete('/pos/tables/:id', protect, authorize('admin'), deleteTable);

router.get('/pos/wastage', protect, authorize('admin'), getWastageLogs);
router.post('/pos/wastage', protect, authorize('admin'), logWastage);

module.exports = router;
