const cron = require('node-cron');
const Hotel = require('../models/Hotel');
const User = require('../models/User');
const Room = require('../models/Room');
const RoomType = require('../models/RoomType');
const Booking = require('../models/Booking');

// Run this job every day at midnight server time
const startSubscriptionCleaner = () => {
  cron.schedule('0 0 * * *', async () => {
    console.log('[Cron] Running subscription cleaner job...');
    try {
      // Find exactly 7 days ago
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Find hotels whose subscription ended BEFORE OR ON 7 days ago
      const expiredHotels = await Hotel.find({
        subscriptionEndDate: { $lte: sevenDaysAgo }
      });

      if (expiredHotels.length === 0) {
        console.log('[Cron] No hotels found with subscriptions expired > 7 days.');
        return;
      }

      console.log(`[Cron] Found ${expiredHotels.length} hotels to revoke. Cascading deletion started...`);

      for (const hotel of expiredHotels) {
        const hotelId = hotel._id;
        
        // Cascading delete for each expired hotel
        await User.deleteMany({ hotelId });
        await Room.deleteMany({ hotelId });
        await RoomType.deleteMany({ hotelId });
        await Booking.deleteMany({ hotelId });
        await Hotel.findByIdAndDelete(hotelId);

        console.log(`[Cron] Successfully revoked access and deleted data for hotel: ${hotel.name}`);
      }

      console.log('[Cron] Subscription cleaner job completed.');
    } catch (error) {
      console.error('[Cron Error] Failed to execute subscription cleaner:', error);
    }
  });
};

module.exports = startSubscriptionCleaner;
