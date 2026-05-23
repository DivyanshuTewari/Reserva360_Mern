const express = require('express');
const router = express.Router();
const { createHotelAndAdmin, getHotels, editHotel, resetAdminPassword, revokeHotelAccess, renewHotel } = require('../controllers/masterController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/create-hotel', protect, authorize('master'), createHotelAndAdmin);
router.get('/hotels', protect, authorize('master'), getHotels);
router.put('/edit-hotel/:id', protect, authorize('master'), editHotel);
router.put('/reset-admin-password/:hotelId', protect, authorize('master'), resetAdminPassword);
router.put('/renew-hotel/:id', protect, authorize('master'), renewHotel);
router.delete('/revoke-hotel/:id', protect, authorize('master'), revokeHotelAccess);

module.exports = router;
