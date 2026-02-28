import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { apiGet } from '../utils/api';
import { usePermissions } from '../hooks/usePermissions';

// Page titles mapping
const pageTitles = {
  '/dashboard': 'لوحة التحكم',
  '/devices': 'إدارة الأجهزة',
  '/assignments': 'التسليمات',
  '/maintenance': 'الصيانة',
  '/maintenance-schedules': 'الصيانة الدورية',
  '/departments': 'الأقسام',
  '/employees': 'الموظفين',
  '/products': 'المنتجات',
  '/categories': 'الفئات',
  '/accessory-stock': 'مخزون الملحقات',
  '/tickets': 'نظام الطلبات',
  '/it/subscriptions': 'الاشتراكات',
  '/it/servers': 'السيرفرات',
  '/it/password-vault': 'خزنة كلمات المرور',
  '/it/network-ips': 'عناوين IP',
  '/it/email-accounts': 'حسابات البريد',
  '/it/user-guides': 'أدلة المستخدم',
  '/email-broadcast': 'البريد الجماعي',
  '/licenses': 'إدارة الليسنز',
  '/activity-logs': 'سجل النشاطات',
  '/settings': 'الإعدادات',
  '/profile': 'الملف الشخصي',
  '/users': 'إدارة المستخدمين',
  '/tasks': 'إدارة المهام',
  '/attendance': 'الحضور والانصراف',
  '/voip': 'نظام الهاتف (VoIP)',
  '/ad-computers': 'أجهزة الكمبيوتر (AD)'
};

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { can, canAny, isSuperAdmin } = usePermissions();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [assetsOpen, setAssetsOpen] = useState(true);
  const [inventoryOpen, setInventoryOpen] = useState(true);
  const [itOpen, setItOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [newTicketsCount, setNewTicketsCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const userMenuRef = useRef(null);
  const notifRef = useRef(null);

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('ar-EG', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) setUserMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) { navigate('/login'); return; }
    setUser(JSON.parse(userData));
    
    fetchNewTicketsCount();
    fetchUnreadCount();
    
    const intervalId = setInterval(fetchNewTicketsCount, 10000);
    const notifInterval = setInterval(fetchUnreadCount, 120000);
    return () => { clearInterval(intervalId); clearInterval(notifInterval); };
  }, [navigate]);

  const fetchNewTicketsCount = async () => {
    try {
      const stats = await apiGet('/tickets/stats');
      setNewTicketsCount(stats.new_count || 0);
    } catch (error) { setNewTicketsCount(0); }
  };

  const fetchUnreadCount = async () => {
    try {
      const data = await apiGet('/notifications/unread-count');
      setUnreadCount(data.count || 0);
    } catch { /* silent */ }
  };

  const openNotifications = async () => {
    const opening = !notifOpen;
    setNotifOpen(opening);
    if (opening) {
      try {
        const data = await apiGet('/notifications');
        setNotifications(data);
        setUnreadCount(0);
      } catch { /* silent */ }
    }
  };

  const handleNotifClick = async (notif) => {
    try { await fetch(`${window.location.protocol}//${window.location.hostname}:3000/api/notifications/${notif.id}/read`, { method: 'PUT', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }); } catch { /* silent */ }
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    setNotifOpen(false);
    if (notif.link) navigate(notif.link);
  };

  const markAllRead = async () => {
    try {
      await fetch(`${window.location.protocol}//${window.location.hostname}:3000/api/notifications/read-all`, { method: 'PUT', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const clearRead = async () => {
    try {
      await fetch(`${window.location.protocol}//${window.location.hostname}:3000/api/notifications/clear-read`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setNotifications(prev => prev.filter(n => !n.is_read));
    } catch { /* silent */ }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('تم تسجيل الخروج بنجاح');
    navigate('/login');
  };

  if (!user) return null;

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans" dir="rtl">
      
      {/* ═══════════════════════ SIDEBAR ═══════════════════════ */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 280 : 88 }}
        className="bg-white flex flex-col transition-all duration-300 relative z-40 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] border-l border-slate-100"
      >
        {/* Logo Area */}
        <div className="h-20 flex items-center px-5 mb-4 border-b border-slate-100">
          <AnimatePresence>
            {sidebarOpen ? (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="font-bold text-lg text-slate-800 tracking-tight leading-tight">IT System</h1>
                    <p className="text-[10px] text-indigo-600 font-semibold tracking-widest uppercase">Management</p>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
              </motion.div>
            ) : (
              <div className="w-full flex justify-center">
                <button onClick={() => setSidebarOpen(true)} className="p-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent pb-6">
          {can('dashboard') && (
            <NavItem icon={DashboardIcon} label="لوحة التحكم" active={isActive('/dashboard')} onClick={() => navigate('/dashboard')} sidebarOpen={sidebarOpen} />
          )}

          {/* IT Assets Section */}
          {sidebarOpen && canAny('devices_view','assignments_view','maintenance_view','departments_view','employees_view') && (
            <div className="pt-5 pb-1">
              <button onClick={() => setAssetsOpen(!assetsOpen)} className="w-full flex items-center justify-between px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600 transition-colors">
                <span>إدارة الأصول</span>
                <svg className={`w-3.5 h-3.5 transition-transform ${assetsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
            </div>
          )}
          
          <AnimatePresence>
            {(assetsOpen || !sidebarOpen) && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-1 overflow-hidden">
                {can('devices_view') && <NavItem icon={ComputerIcon} label="الأجهزة" active={isActive('/devices')} onClick={() => navigate('/devices')} sidebarOpen={sidebarOpen} />}
                {can('assignments_view') && <NavItem icon={AssignIcon} label="التسليمات" active={isActive('/assignments')} onClick={() => navigate('/assignments')} sidebarOpen={sidebarOpen} />}
                {can('maintenance_view') && <NavItem icon={MaintenanceIcon} label="الصيانة" active={isActive('/maintenance')} onClick={() => navigate('/maintenance')} sidebarOpen={sidebarOpen} />}
                {can('maintenance_view') && <NavItem icon={MaintenanceIcon} label="صيانة دورية" active={isActive('/maintenance-schedules')} onClick={() => navigate('/maintenance-schedules')} sidebarOpen={sidebarOpen} />}
                {can('departments_view') && <NavItem icon={DepartmentIcon} label="الأقسام" active={isActive('/departments')} onClick={() => navigate('/departments')} sidebarOpen={sidebarOpen} />}
                {can('employees_view') && <NavItem icon={EmployeeIcon} label="الموظفين" active={isActive('/employees')} onClick={() => navigate('/employees')} sidebarOpen={sidebarOpen} />}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Inventory Section */}
          {sidebarOpen && canAny('products_view','categories_view','accessories_view') && (
            <div className="pt-5 pb-1">
              <button onClick={() => setInventoryOpen(!inventoryOpen)} className="w-full flex items-center justify-between px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600 transition-colors">
                <span>المخزون</span>
                <svg className={`w-3.5 h-3.5 transition-transform ${inventoryOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
            </div>
          )}
          
          <AnimatePresence>
            {(inventoryOpen || !sidebarOpen) && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-1 overflow-hidden">
                {can('products_view') && <NavItem icon={BoxIcon} label="المنتجات" active={isActive('/products')} onClick={() => navigate('/products')} sidebarOpen={sidebarOpen} />}
                {can('categories_view') && <NavItem icon={CategoryIcon} label="الفئات" active={isActive('/categories')} onClick={() => navigate('/categories')} sidebarOpen={sidebarOpen} />}
                {can('accessories_view') && <NavItem icon={AccessoryStockIcon} label="مخزون الملحقات" active={isActive('/accessory-stock')} onClick={() => navigate('/accessory-stock')} sidebarOpen={sidebarOpen} />}
              </motion.div>
            )}
          </AnimatePresence>

          {/* IT Management Section */}
          {sidebarOpen && canAny('it_subscriptions_view','it_servers_view','it_password_vault_view','it_network_ips_view','it_email_accounts_view','it_user_guides_view','email_broadcast','licenses_view') && (
            <div className="pt-5 pb-1">
              <button onClick={() => setItOpen(!itOpen)} className="w-full flex items-center justify-between px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600 transition-colors">
                <span>إدارة IT</span>
                <svg className={`w-3.5 h-3.5 transition-transform ${itOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
            </div>
          )}
          
          <AnimatePresence>
            {(itOpen || !sidebarOpen) && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-1 overflow-hidden">
                {can('it_subscriptions_view') && <NavItem icon={ITManagementIcon} label="الاشتراكات" active={isActive('/it/subscriptions')} onClick={() => navigate('/it/subscriptions')} sidebarOpen={sidebarOpen} />}
                {can('it_servers_view') && <NavItem icon={ServerIcon} label="السيرفرات" active={isActive('/it/servers')} onClick={() => navigate('/it/servers')} sidebarOpen={sidebarOpen} />}
                {can('it_password_vault_view') && <NavItem icon={KeyIcon} label="خزنة كلمات المرور" active={isActive('/it/password-vault')} onClick={() => navigate('/it/password-vault')} sidebarOpen={sidebarOpen} />}
                {can('it_network_ips_view') && <NavItem icon={NetworkIcon} label="عناوين IP" active={isActive('/it/network-ips')} onClick={() => navigate('/it/network-ips')} sidebarOpen={sidebarOpen} />}
                {can('it_email_accounts_view') && <NavItem icon={EmailIcon} label="حسابات البريد" active={isActive('/it/email-accounts')} onClick={() => navigate('/it/email-accounts')} sidebarOpen={sidebarOpen} />}
                {can('it_user_guides_view') && <NavItem icon={GuidesIcon} label="أدلة المستخدم" active={isActive('/it/user-guides')} onClick={() => navigate('/it/user-guides')} sidebarOpen={sidebarOpen} />}
                {can('email_broadcast') && <NavItem icon={BroadcastIcon} label="البريد الجماعي" active={isActive('/email-broadcast')} onClick={() => navigate('/email-broadcast')} sidebarOpen={sidebarOpen} />}
                {can('licenses_view') && <NavItem icon={LicenseIcon} label="إدارة الليسنز" active={isActive('/licenses')} onClick={() => navigate('/licenses')} sidebarOpen={sidebarOpen} />}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-5 pb-2">
            <div className={`h-px bg-slate-100 mx-3 ${!sidebarOpen && 'hidden'}`}></div>
          </div>

          {can('tickets_view') && <NavItem icon={TicketIcon} label="نظام الطلبات" active={isActive('/tickets')} onClick={() => navigate('/tickets')} sidebarOpen={sidebarOpen} count={newTicketsCount} />}
          <NavItem icon={TasksIcon} label="إدارة المهام" active={isActive('/tasks')} onClick={() => navigate('/tasks')} sidebarOpen={sidebarOpen} />
          {can('activity_logs') && <NavItem icon={ActivityIcon} label="سجل النشاطات" active={isActive('/activity-logs')} onClick={() => navigate('/activity-logs')} sidebarOpen={sidebarOpen} />}
          {can('settings') && <NavItem icon={SettingsIcon} label="الإعدادات" active={isActive('/settings')} onClick={() => navigate('/settings')} sidebarOpen={sidebarOpen} />}
          {isSuperAdmin() && <NavItem icon={UsersIcon} label="إدارة المستخدمين" active={isActive('/users')} onClick={() => navigate('/users')} sidebarOpen={sidebarOpen} />}
          {isSuperAdmin() && <NavItem icon={ServerIcon} label="Active Directory" active={isActive('/active-directory')} onClick={() => navigate('/active-directory')} sidebarOpen={sidebarOpen} />}
          {isSuperAdmin() && <NavItem icon={ADComputerIcon} label="أجهزة الكمبيوتر" active={isActive('/ad-computers')} onClick={() => navigate('/ad-computers')} sidebarOpen={sidebarOpen} />}
          {isSuperAdmin() && <NavItem icon={AttendanceIcon} label="الحضور والانصراف" active={isActive('/attendance')} onClick={() => navigate('/attendance')} sidebarOpen={sidebarOpen} />}
          {isSuperAdmin() && <NavItem icon={PhoneIcon} label="نظام الهاتف" active={isActive('/voip')} onClick={() => navigate('/voip')} sidebarOpen={sidebarOpen} />}
        </nav>

        {/* User Card (Bottom) */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className={`flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'} group cursor-pointer`} onClick={() => navigate('/profile')}>
            <div className="flex items-center gap-3">
              <div className="relative">
                {user?.avatar ? (
                  <img src={`${window.location.protocol}//${window.location.hostname}:3000${user.avatar}`} alt="Avatar" className="w-10 h-10 rounded-xl object-cover border-2 border-white shadow-sm group-hover:border-indigo-500 transition-colors" />
                ) : (
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold border-2 border-white shadow-sm group-hover:border-indigo-500 transition-colors">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
              </div>
              {sidebarOpen && (
                <div className="overflow-hidden">
                  <p className="font-bold text-sm text-slate-800 truncate w-32 group-hover:text-indigo-600 transition-colors">{user?.full_name}</p>
                  <p className="text-[11px] text-slate-500 font-medium truncate">{user?.email}</p>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <button onClick={(e) => { e.stopPropagation(); handleLogout(); }} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all" title="تسجيل الخروج">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* ═══════════════════════ MAIN CONTENT ═══════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Top Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-6 sticky top-0 z-30">
          {/* Left side - Page title */}
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {pageTitles[location.pathname] ||
                  (location.pathname.startsWith('/employees/') ? 'ملف الموظف' :
                   location.pathname.startsWith('/products/') ? 'تفاصيل المنتج' :
                   location.pathname.startsWith('/device/') ? 'معلومات الجهاز' : 'الرئيسية')}
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">{getCurrentDate()}</p>
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Submit Ticket Button */}
            <button onClick={() => window.open('/submit-ticket', '_blank')}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md shadow-indigo-500/20 font-semibold text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <span>طلب دعم</span>
            </button>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button onClick={openNotifications} className="relative p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              <AnimatePresence>
                {notifOpen && (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.15 }}
                    className="absolute left-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden" dir="rtl">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm">التنبيهات</span>
                        {notifications.filter(n => !n.is_read).length > 0 && (
                          <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {notifications.filter(n => !n.is_read).length} جديد
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {notifications.some(n => !n.is_read) && <button onClick={markAllRead} className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold">قراءة الكل</button>}
                        {notifications.some(n => n.is_read) && <button onClick={clearRead} className="text-xs text-slate-400 hover:text-slate-600">حذف المقروء</button>}
                      </div>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                      {notifications.length === 0 ? (
                        <div className="py-10 text-center">
                          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">🔕</div>
                          <p className="text-sm text-slate-500 font-medium">لا توجد تنبيهات حالياً</p>
                        </div>
                      ) : (
                        notifications.map(n => {
                          const icon = n.type === 'license_expiry' ? '🔑' : n.type === 'warranty_expiry' ? '🛡️' : n.type === 'task_assigned' ? '📋' : '🔔';
                          const isAlert = n.title.includes('🔴') || n.title.includes('عاجل');
                          return (
                            <button key={n.id} onClick={() => handleNotifClick(n)}
                              className={`w-full text-right px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${!n.is_read ? 'bg-indigo-50/30' : ''}`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isAlert ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                <span className="text-sm">{icon}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-bold truncate ${isAlert ? 'text-rose-600' : 'text-slate-800'}`}>{n.title.replace(/🔴|🟠|🟡/g, '')}</p>
                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                                <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                                  {new Date(n.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              {!n.is_read && <span className="w-2 h-2 bg-indigo-500 rounded-full mt-2 shrink-0 shadow-sm shadow-indigo-200" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="h-6 w-px bg-slate-200 mx-1"></div>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-all">
                {user?.avatar ? (
                  <img src={`${window.location.protocol}//${window.location.hostname}:3000${user.avatar}`} alt="Avatar" className="w-8 h-8 rounded-lg object-cover border border-slate-200" />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                )}
                <svg className={`w-4 h-4 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.15 }}
                    className="absolute left-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                      <p className="font-bold text-slate-800 text-sm truncate">{user?.full_name}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email}</p>
                    </div>
                    <div className="py-1.5">
                      {[
                        { icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', label: 'الملف الشخصي', path: '/profile' },
                        { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', label: 'سجل نشاطاتي', path: '/activity-logs' },
                        { icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', label: 'الإعدادات', path: '/settings' },
                      ].map(item => (
                        <button key={item.label} onClick={() => { navigate(item.path); setUserMenuOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
                          <span className="font-medium">{item.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-slate-100 pt-1.5 mt-1.5">
                      <button onClick={() => { handleLogout(); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors font-medium">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        <span>تسجيل الخروج</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50">
          {children}
        </main>
      </div>
    </div>
  );
}

// ═══════════════════════ NAV ITEM COMPONENT ═══════════════════════
function NavItem({ icon: Icon, label, active, onClick, sidebarOpen, count }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group relative mb-1 ${
        active
          ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25'
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
      } ${!sidebarOpen && 'justify-center'}`}
    >
      <span className={`flex items-center justify-center transition-colors ${active ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'}`}>
        <Icon className={`w-5 h-5 transition-transform duration-300 ${active ? '' : 'group-hover:scale-110'}`} />
      </span>
      
      {sidebarOpen && <span className="font-semibold text-sm flex-1 text-right tracking-wide">{label}</span>}
      
      {count > 0 && (
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
          className={`${sidebarOpen ? '' : 'absolute -top-1 -right-1'} text-[10px] font-bold px-2 py-0.5 rounded-full ${
            active ? 'bg-white/20 text-white' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
          }`}>
          {count}
        </motion.span>
      )}
    </button>
  );
}

// ═══════════════════════ ICONS ═══════════════════════
const DashboardIcon = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
const BoxIcon = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
const CategoryIcon = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>;
const SettingsIcon = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const ComputerIcon = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
const AssignIcon = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>;
const MaintenanceIcon = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" /></svg>;
const DepartmentIcon = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;
const AccessoryStockIcon = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>;
const EmployeeIcon = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const ITManagementIcon = (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>;
const ServerIcon = (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="6" rx="2" /><rect x="2" y="15" width="20" height="6" rx="2" /><circle cx="6" cy="6" r="1" fill="currentColor" /><circle cx="6" cy="18" r="1" fill="currentColor" /></svg>;
const KeyIcon = (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>;
const NetworkIcon = (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="3" /><circle cx="5" cy="19" r="3" /><circle cx="19" cy="19" r="3" /><line x1="12" y1="8" x2="12" y2="12" /><path d="M12 12L5 16M12 12L19 16" /></svg>;
const EmailIcon = (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 6l-10 7L2 6" /></svg>;
const GuidesIcon = (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /><path d="M9 6h6M9 10h6M9 14h4" /></svg>;
const BroadcastIcon = (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>;
const LicenseIcon = (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
const ActivityIcon = (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>;
const TicketIcon = (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 5v2" /><path d="M15 11v2" /><path d="M15 17v2" /><path d="M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7a2 2 0 0 1 2-2z" /></svg>;
const TasksIcon = (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 17h7M17 14v7"/></svg>;
const UsersIcon = (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const AttendanceIcon = (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/><path d="M16 3.13a4 4 0 0 1 .5.13"/></svg>;
const ADComputerIcon = (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /><circle cx="12" cy="10" r="3" /><path d="M7 7h.01" /></svg>;
const PhoneIcon = (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
