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

      console.log(`[Cron] Found ${expiredHotels.length} hotels with expired subscriptions. They are now suspended (data kept intact).`);

      for (const hotel of expiredHotels) {
        // Data is intentionally kept intact. 
        // Authentication controllers automatically block login for these properties.
        console.log(`[Cron] Hotel is suspended due to expiry: ${hotel.name}`);
      }

      console.log('[Cron] Subscription cleaner job completed.');
    } catch (error) {
      console.error('[Cron Error] Failed to execute subscription cleaner:', error);
    }
  });
};

module.exports = startSubscriptionCleaner;
