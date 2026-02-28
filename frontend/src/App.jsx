import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import ProductDetails from './components/ProductDetails';
import Inventory from './components/Inventory';
import Categories from './components/Categories';
import InventoryReport from './components/InventoryReport';
import Departments from './components/Departments';
import Employees from './components/Employees';
import Devices from './components/Devices';
import DeviceAssignments from './components/DeviceAssignments';
import Maintenance from './components/Maintenance';
import AccessoryStock from './components/AccessoryStock';

// IT Management
import Subscriptions from './components/ITManagement/Subscriptions';
import PasswordVault from './components/ITManagement/PasswordVault';
import Servers from './components/ITManagement/Servers';
import NetworkIPs from './components/ITManagement/NetworkIPs';
import EmailAccounts from './components/ITManagement/EmailAccounts';
import UserGuides from './components/ITManagement/UserGuides';
import Settings from './components/Settings';
import EmailBroadcast from './components/EmailBroadcast';
import Licenses from './components/Licenses';
import ActivityLogs from './components/ActivityLogs';
import Profile from './components/Profile';
import Tickets from './components/Tickets';
import UserTicketPortal from './components/UserTicketPortal';
import DevicePublicPage from './components/DevicePublicPage';
import UserManagement from './components/UserManagement';
import Tasks from './components/Tasks';
import EmployeeProfile from './components/EmployeeProfile';
import MaintenanceSchedules from './components/MaintenanceSchedules';
import ActiveDirectory from './components/ActiveDirectory';
import ADComputers from './components/ADComputers';
import Attendance from './components/Attendance';
import VoIP from './components/ITManagement/VoIP';

function App() {
  return (
    <Router>
      <Toaster />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/products" element={<Layout><Products /></Layout>} />
        <Route path="/products/:id" element={<Layout><ProductDetails /></Layout>} />
        <Route path="/inventory" element={<Layout><Inventory /></Layout>} />
        <Route path="/categories" element={<Layout><Categories /></Layout>} />
        <Route path="/inventory-report" element={<InventoryReport />} />
        
        {/* IT Asset Management */}
        <Route path="/departments" element={<Layout><Departments /></Layout>} />
        <Route path="/employees" element={<Layout><Employees /></Layout>} />
        <Route path="/devices" element={<Layout><Devices /></Layout>} />
        <Route path="/assignments" element={<Layout><DeviceAssignments /></Layout>} />
        <Route path="/maintenance" element={<Layout><Maintenance /></Layout>} />
        <Route path="/accessory-stock" element={<Layout><AccessoryStock /></Layout>} />
        
        {/* IT Management */}
        <Route path="/it/subscriptions" element={<Layout><Subscriptions /></Layout>} />
        <Route path="/it/password-vault" element={<Layout><PasswordVault /></Layout>} />
        <Route path="/it/servers" element={<Layout><Servers /></Layout>} />
        <Route path="/it/network-ips" element={<Layout><NetworkIPs /></Layout>} />
        <Route path="/it/email-accounts" element={<Layout><EmailAccounts /></Layout>} />
        <Route path="/it/user-guides" element={<Layout><UserGuides /></Layout>} />
        <Route path="/email-broadcast" element={<Layout><EmailBroadcast /></Layout>} />
        <Route path="/licenses" element={<Layout><Licenses /></Layout>} />
        <Route path="/settings" element={<Layout><Settings /></Layout>} />
        <Route path="/activity-logs" element={<Layout><ActivityLogs /></Layout>} />
        <Route path="/profile" element={<Layout><Profile /></Layout>} />
        <Route path="/tickets" element={<Layout><Tickets /></Layout>} />
        
        {/* User Management - super_admin only */}
        <Route path="/users" element={<Layout><UserManagement /></Layout>} />

        {/* Task Management */}
        <Route path="/tasks" element={<Layout><Tasks /></Layout>} />
        <Route path="/employees/:id" element={<Layout><EmployeeProfile /></Layout>} />
        <Route path="/maintenance-schedules" element={<Layout><MaintenanceSchedules /></Layout>} />
        <Route path="/active-directory" element={<Layout><ActiveDirectory /></Layout>} />
        <Route path="/ad-computers" element={<Layout><ADComputers /></Layout>} />
        <Route path="/attendance" element={<Layout><Attendance /></Layout>} />
        <Route path="/voip" element={<Layout><VoIP /></Layout>} />

        {/* Public User Portal - No Layout */}
        <Route path="/submit-ticket" element={<UserTicketPortal />} />
        <Route path="/device/:id"    element={<DevicePublicPage />} />
        
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
