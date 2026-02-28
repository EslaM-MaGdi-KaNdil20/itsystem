const express = require('express');
const cors = require('cors');
require('dotenv').config();
const initDatabase = require('./config/initDb');
const initInventory = require('./config/initInventory');
const initGuides = require('./config/initGuides');
const initActivityLog = require('./config/initActivityLog');
const initEmailBroadcast = require('./config/initEmailBroadcast');
const initLicenses = require('./config/initLicenses');
const initNotifications = require('./config/initNotifications');
const initTasks = require('./config/initTasks');
const initSLA = require('./config/initSLA');
const notificationsCtrl = require('./controllers/notificationsController');
const slaCtrl = require('./controllers/slaController');
const { startSubscriptionChecker } = require('./services/subscriptionChecker');
const { testConnection } = require('./services/emailService');
const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const inventoryRoutes = require('./routes/inventory');
const categoriesRoutes = require('./routes/categories');
const departmentsRoutes = require('./routes/departments');
const employeesRoutes = require('./routes/employees');
const devicesRoutes = require('./routes/devices');
const maintenanceRoutes = require('./routes/maintenance');
const pdfRoutes = require('./routes/pdf');
const assignmentsRoutes = require('./routes/assignments');
const accessoriesRoutes = require('./routes/accessories');
const accessoryStockRoutes = require('./routes/accessoryStock');
const guidesRoutes = require('./routes/guides');
const dashboardRoutes = require('./routes/dashboard');

// IT Management Routes
const subscriptionsRoutes = require('./routes/subscriptions');
const serversRoutes = require('./routes/servers');
const passwordVaultRoutes = require('./routes/passwordVault');
const networkIPsRoutes = require('./routes/networkIPs');
const emailAccountsRoutes = require('./routes/emailAccounts');
const logoRoutes = require('./routes/logo');
const activityLogsRoutes = require('./routes/activityLogs');
const ticketsRoutes = require('./routes/tickets');
const emailBroadcastRoutes = require('./routes/emailBroadcast');
const licensesRoutes = require('./routes/licenses');
const notificationsRoutes = require('./routes/notifications');
const usersRoutes        = require('./routes/users');
const tasksRoutes        = require('./routes/tasks');
const maintenanceSchedulesRoutes = require('./routes/maintenanceSchedules');
const slaRoutes = require('./routes/sla');
const adRoutes = require('./routes/ad');
const adComputersRoutes = require('./routes/adComputers');
const agentRoutes = require('./routes/agent');
const attendanceRoutes = require('./routes/attendance');
const hostingRoutes = require('./routes/hosting');
const voipRoutes = require('./routes/voip');
const { startHostingAutoSync } = require('./services/hostingSyncService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - allow requests from any device on the network
app.use(cors({ origin: '*' }));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'IT System API - Server is running!' });
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/categories', categoriesRoutes);

// IT Asset Management Routes
app.use('/api/departments', departmentsRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/accessories', accessoriesRoutes);
app.use('/api/accessory-stock', accessoryStockRoutes);
app.use('/api/guides', guidesRoutes);

// IT Management Routes
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/servers', serversRoutes);
app.use('/api/password-vault', passwordVaultRoutes);
app.use('/api/network-ips', networkIPsRoutes);
app.use('/api/email-accounts', emailAccountsRoutes);
app.use('/api/logo', logoRoutes);
app.use('/api/activity-logs', activityLogsRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/email-broadcast', emailBroadcastRoutes);
app.use('/api/licenses', licensesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/users',         usersRoutes);
app.use('/api/tasks',         tasksRoutes);
app.use('/api/maintenance-schedules', maintenanceSchedulesRoutes);
app.use('/api/sla', slaRoutes);
app.use('/api/ad', adRoutes);
app.use('/api/ad/computers', adComputersRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/hosting', hostingRoutes);
app.use('/api/voip', voipRoutes);

// Serve uploaded files
app.use('/uploads', express.static('uploads'));
app.use('/assets', express.static('public/assets'));

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database
    await initDatabase();
    await initInventory();
    await initGuides();
    await initActivityLog();
    await initEmailBroadcast();
    await initLicenses();
    await initNotifications();
    await initTasks();
    await initSLA();
    const initAD = require('./config/initAD');
    await initAD();
    const initMaintenanceSchedules = require('./config/initMaintenanceSchedules');
    await initMaintenanceSchedules();
    const initAttendance = require('./config/initAttendance');
    await initAttendance();
    const initHosting = require('./config/initHosting');
    await initHosting();
    const initVoIP = require('./config/initVoIP');
    await initVoIP();
    const { checkAndCreateTasks } = require('./controllers/maintenanceSchedulesController');
    await checkAndCreateTasks();
    // Initialize accessories tables
    const { initAccessories, initITManagement } = require('./config/initDb');
    await initAccessories();
    await initITManagement();
    
    // Test email connection
    console.log('\n📧 Testing email configuration...');
    const emailReady = await testConnection();
    if (emailReady) {
      // Start subscription expiration checker
      startSubscriptionChecker();
    } else {
      console.warn('⚠️ Email not configured. Subscription alerts will not be sent.');
      console.warn('Please set EMAIL_USER, EMAIL_PASSWORD, and EMAIL_RECIPIENT in .env file');
    }
    
    // Start server - listen on all interfaces so any device on the network can connect
    app.listen(PORT, '0.0.0.0', () => {
      const { networkInterfaces } = require('os');
      const nets = networkInterfaces();
      let localIP = 'localhost';
      for (const iface of Object.values(nets)) {
        for (const alias of iface) {
          if (alias.family === 'IPv4' && !alias.internal) {
            localIP = alias.address;
          }
        }
      }
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`   Local:   http://localhost:${PORT}`);
      console.log(`   Network: http://${localIP}:${PORT}`);
    });

    // Generate notifications on startup then every hour
    await notificationsCtrl.generate();
    setInterval(notificationsCtrl.generate, 60 * 60 * 1000);

    // SLA breach checker — runs every 5 minutes
    await slaCtrl.checkSLABreaches();
    setInterval(slaCtrl.checkSLABreaches, 5 * 60 * 1000);
    console.log('⏱️  SLA breach checker running every 5 minutes');

    // cPanel email auto-sync
    await startHostingAutoSync();
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
