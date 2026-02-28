const cron = require('node-cron');
const pool = require('../config/database');
const { sendSubscriptionAlert } = require('./emailService');

// Check for subscriptions expiring within 30 days
const checkExpiringSubscriptions = async () => {
  try {
    console.log('🔍 Checking for expiring subscriptions...');
    
    // Query for active subscriptions expiring within 30 days
    const query = `
      SELECT * FROM subscriptions 
      WHERE status = 'active' 
      AND end_date <= CURRENT_DATE + INTERVAL '30 days'
      AND end_date >= CURRENT_DATE
      ORDER BY end_date ASC
    `;
    
    const result = await pool.query(query);
    const expiringSubscriptions = result.rows;

    if (expiringSubscriptions.length === 0) {
      console.log('✅ No subscriptions expiring within 30 days');
      return;
    }

    console.log(`⚠️ Found ${expiringSubscriptions.length} subscription(s) expiring within 30 days`);

    // Send email for each expiring subscription
    for (const subscription of expiringSubscriptions) {
      const daysRemaining = Math.ceil(
        (new Date(subscription.end_date) - new Date()) / (1000 * 60 * 60 * 24)
      );
      
      console.log(`📧 Sending alert for: ${subscription.name} (${daysRemaining} days remaining)`);
      
      try {
        await sendSubscriptionAlert(subscription);
      } catch (emailError) {
        console.error(`Failed to send email for ${subscription.name}:`, emailError.message);
      }
    }
  } catch (error) {
    console.error('❌ Error checking expiring subscriptions:', error);
  }
};

// Schedule daily check at 9:00 AM
const startSubscriptionChecker = () => {
  console.log('🚀 Starting subscription expiration checker...');
  
  // Run every day at 9:00 AM
  cron.schedule('0 9 * * *', () => {
    console.log('⏰ Running scheduled subscription check...');
    checkExpiringSubscriptions();
  });

  // Also run once at startup for testing
  console.log('🔄 Running initial subscription check...');
  setTimeout(() => {
    checkExpiringSubscriptions();
  }, 5000); // Wait 5 seconds after server start

  console.log('✅ Subscription checker scheduled (runs daily at 9:00 AM)');
};

module.exports = {
  startSubscriptionChecker,
  checkExpiringSubscriptions, // Export for manual testing
};
