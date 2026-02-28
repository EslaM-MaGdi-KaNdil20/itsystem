import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import { apiGet, apiPost, apiPut } from '../utils/api';
import ADDepartmentsTab from './ITManagement/ADDepartmentsTab';
import {
  FiServer, FiUsers, FiRefreshCw, FiSearch, FiCheck,
  FiX, FiLink, FiUserPlus, FiSettings, FiActivity,
  FiShield, FiZap, FiFilter, FiClock, FiAlertTriangle,
  FiCheckCircle, FiDatabase, FiChevronDown, FiUser,
  FiMail, FiPhone, FiMapPin, FiBriefcase, FiGlobe,
  FiSave, FiPlay, FiExternalLink, FiLock
} from 'react-icons/fi';

const API_URL = `${window.location.protocol}//${window.location.hostname}:3000/api`;

export default function ActiveDirectory() {
  const [activeTab, setActiveTab] = useState('config');
  const [loading, setLoading] = useState(false);

  // Config state
  const [config, setConfig] = useState({
    domain_name: '', server_url: '', base_dn: '', bind_dn: '', bind_password: '',
    search_filter: '(&(objectClass=user)(objectCategory=person))',
    use_ssl: false, port: 389, sync_interval_minutes: 60,
    auto_sync_enabled: false, auto_create_users: false,
    default_role: 'user', sync_employees: true
  });
  const [configured, setConfigured] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Users state
  const [adUsers, setAdUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [syncFilter, setSyncFilter] = useState('');
  const [enabledFilter, setEnabledFilter] = useState('');
  const [departments, setDepartments] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [syncing, setSyncing] = useState(false);

  // Stats state
  const [stats, setStats] = useState(null);

  // Sync logs state
  const [syncLogs, setSyncLogs] = useState([]);

  // Bulk action state
  const [bulkAction, setBulkAction] = useState(null);
  const [bulkPassword, setBulkPassword] = useState('ADUser@2026');
  const [bulkRole, setBulkRole] = useState('user');
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Employee creation preview modal
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [creatingEmployee, setCreatingEmployee] = useState(false);

  // Departments sync state
  const [ousList, setOusList] = useState([]);
  const [groupsList, setGroupsList] = useState([]);
  const [syncedDepts, setSyncedDepts] = useState([]);
  const [deptView, setDeptView] = useState('ous'); // 'ous' | 'groups' | 'synced'
  const [selectedOUs, setSelectedOUs] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [fetchingOUs, setFetchingOUs] = useState(false);
  const [fetchingGroups, setFetchingGroups] = useState(false);
  const [syncingDepts, setSyncingDepts] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const data = await apiGet('/ad/config');
      setConfigured(data.configured);
      if (data.config) setConfig(data.config);
    } catch (e) { /* not configured yet */ }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (departmentFilter) params.set('department', departmentFilter);
      if (syncFilter) params.set('synced', syncFilter);
      if (enabledFilter) params.set('enabled', enabledFilter);
      const data = await apiGet(`/ad/users?${params.toString()}`);
      setAdUsers(data.users || []);
      setDepartments(data.departments || []);
    } catch (e) {
      toast.error('خطأ في جلب المستخدمين');
    } finally { setLoading(false); }
  }, [searchTerm, departmentFilter, syncFilter, enabledFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiGet('/ad/stats');
      setStats(data);
    } catch (e) { /* no stats yet */ }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const data = await apiGet('/ad/sync-logs');
      setSyncLogs(data);
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchStats();
  }, []);

  const fetchSyncedDepts = useCallback(async () => {
    try {
      const data = await apiGet('/ad/groups-ous');
      setSyncedDepts(data.items || []);
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'logs') fetchLogs();
    if (activeTab === 'overview') fetchStats();
    if (activeTab === 'departments') fetchSyncedDepts();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
  }, [searchTerm, departmentFilter, syncFilter, enabledFilter]);

  // Save config
  const handleSaveConfig = async () => {
    if (!config.domain_name || !config.server_url || !config.base_dn || !config.bind_dn) {
      toast.error('يرجى ملء جميع الحقول الأساسية');
      return;
    }
    setSaving(true);
    try {
      await apiPost('/ad/config', config);
      toast.success('تم حفظ الإعدادات بنجاح');
      setConfigured(true);
    } catch (e) {
      toast.error(e.message || 'خطأ في حفظ الإعدادات');
    } finally { setSaving(false); }
  };

  // Test connection
  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const data = await apiPost('/ad/test-connection', config);
      toast.success(data.message, { duration: 5000 });
    } catch (e) {
      toast.error(e.message || 'فشل الاتصال', { duration: 5000 });
    } finally { setTesting(false); }
  };

  // Sync users
  const handleSync = async () => {
    setSyncing(true);
    try {
      const data = await apiPost('/ad/sync');
      toast.success(`${data.message} — جديد: ${data.stats.new}, محدث: ${data.stats.updated}`, { duration: 5000 });
      fetchUsers();
      fetchStats();
    } catch (e) {
      toast.error(e.message || 'خطأ في المزامنة');
    } finally { setSyncing(false); }
  };

  // Select all / none
  const toggleSelectAll = () => {
    if (selectedUsers.length === adUsers.length) setSelectedUsers([]);
    else setSelectedUsers(adUsers.map(u => u.id));
  };

  const toggleSelect = (id) => {
    setSelectedUsers(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Bulk create users
  const handleBulkCreateUsers = async () => {
    if (selectedUsers.length === 0) { toast.error('يرجى اختيار مستخدمين أولاً'); return; }
    setBulkProcessing(true);
    try {
      const data = await apiPost('/ad/bulk-create-users', {
        ad_user_ids: selectedUsers,
        role: bulkRole,
        default_password: bulkPassword
      });
      toast.success(data.message, { duration: 5000 });
      setSelectedUsers([]);
      setBulkAction(null);
      fetchUsers();
      fetchStats();
    } catch (e) {
      toast.error(e.message || 'خطأ');
    } finally { setBulkProcessing(false); }
  };

  // Bulk create employees
  const handleBulkCreateEmployees = async () => {
    if (selectedUsers.length === 0) { toast.error('يرجى اختيار مستخدمين أولاً'); return; }
    setBulkProcessing(true);
    try {
      const data = await apiPost('/ad/bulk-create-employees', { ad_user_ids: selectedUsers });
      toast.success(data.message, { duration: 6000 });
      setSelectedUsers([]);
      setBulkAction(null);
      fetchUsers();
      fetchStats();
    } catch (e) {
      toast.error(e.message || 'خطأ');
    } finally { setBulkProcessing(false); }
  };

  // Single user create
  const handleCreateUser = async (adUserId) => {
    try {
      const data = await apiPost('/ad/create-user', { ad_user_id: adUserId, role: 'user' });
      toast.success(data.message);
      fetchUsers();
      fetchStats();
    } catch (e) { toast.error(e.message || 'خطأ'); }
  };

  const handleCreateEmployee = async (adUserId) => {
    // Show preview modal first
    setPreviewLoading(true);
    try {
      const data = await apiGet(`/ad/preview-employee/${adUserId}`);
      setPreviewData({ ...data, ad_user_id: adUserId });
    } catch (e) {
      toast.error(e.message || 'خطأ في جلب بيانات المعاينة');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmCreateEmployee = async () => {
    if (!previewData) return;
    setCreatingEmployee(true);
    try {
      const data = await apiPost('/ad/create-employee', { ad_user_id: previewData.ad_user_id });
      const isLink = !!previewData.existing_employee;
      const empName = previewData.ad_user.display_name;
      
      // Build rich custom toast
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-white shadow-2xl rounded-2xl pointer-events-auto border overflow-hidden`}>
          <div className={`px-4 py-3 ${isLink ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'} text-white`}>
            <div className="flex items-center gap-2">
              <span className="text-xl">{isLink ? '🔗' : '✅'}</span>
              <div>
                <p className="font-bold text-sm">{isLink ? 'تم الربط بنجاح' : 'تم إنشاء الموظف'}</p>
                <p className="text-xs opacity-90">{empName}</p>
              </div>
            </div>
          </div>
          <div className="px-4 py-3 space-y-2">
            {data.department && (
              <div className="flex items-center gap-2 text-sm">
                <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs">🏢</span>
                <span className="text-gray-500">القسم:</span>
                <span className="font-semibold text-gray-800">{data.department}</span>
              </div>
            )}
            {data.autoLinked?.fingerprint && (
              <div className="flex items-center gap-2 text-sm">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">{data.autoLinked.fingerprint.id}</span>
                <span className="text-gray-500">البصمة:</span>
                <span className="font-semibold text-gray-800">{data.autoLinked.fingerprint.name || data.autoLinked.fingerprint.id}</span>
              </div>
            )}
            {data.autoLinked?.email && (
              <div className="flex items-center gap-2 text-sm">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">📧</span>
                <span className="text-gray-500">الإيميل:</span>
                <span className="font-semibold text-gray-800 text-xs" dir="ltr">{data.autoLinked.email}</span>
              </div>
            )}
            {!data.autoLinked?.fingerprint && !data.autoLinked?.email && !data.department && (
              <p className="text-sm text-gray-500">{data.message}</p>
            )}
          </div>
          <button onClick={() => toast.dismiss(t.id)} className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 border-t transition-colors">
            إغلاق
          </button>
        </div>
      ), { duration: 6000 });

      setPreviewData(null);
      fetchUsers();
      fetchStats();
    } catch (e) {
      toast.error(e.message || 'خطأ');
    } finally {
      setCreatingEmployee(false);
    }
  };

  const handleUnlink = async (adUserId, type) => {
    try {
      await apiPut(`/ad/unlink/${adUserId}`, { type });
      toast.success('تم فك الربط');
      fetchUsers();
      fetchStats();
    } catch (e) { toast.error(e.message || 'خطأ'); }
  };

  const handleFetchOUs = async () => {
    setFetchingOUs(true);
    try {
      const data = await apiGet('/ad/fetch-ous');
      setOusList(data.ous || []);
      toast.success(`تم جلب ${data.count} OU من الـ AD`);
    } catch (e) {
      toast.error(e.message || 'خطأ في جلب OUs');
    } finally { setFetchingOUs(false); }
  };

  const handleFetchGroups = async () => {
    setFetchingGroups(true);
    try {
      const data = await apiGet('/ad/fetch-groups');
      setGroupsList(data.groups || []);
      toast.success(`تم جلب ${data.count} Group من الـ AD`);
    } catch (e) {
      toast.error(e.message || 'خطأ في جلب Groups');
    } finally { setFetchingGroups(false); }
  };

  const handleSyncAsDepts = async (items) => {
    if (items.length === 0) { toast.error('اختر عناصر أولاً'); return; }
    setSyncingDepts(true);
    try {
      const data = await apiPost('/ad/sync-as-departments', { items });
      toast.success(data.message, { duration: 5000 });
      setSelectedOUs([]);
      setSelectedGroups([]);
      fetchSyncedDepts();
    } catch (e) {
      toast.error(e.message || 'خطأ في المزامنة');
    } finally { setSyncingDepts(false); }
  };

  const tabs = [
    { id: 'overview', label: 'نظرة عامة', icon: FiActivity },
    { id: 'config', label: 'الإعدادات', icon: FiSettings },
    { id: 'users', label: 'مستخدمين AD', icon: FiUsers },
    { id: 'departments', label: 'الأقسام & Groups', icon: FiDatabase },
    { id: 'logs', label: 'سجل المزامنة', icon: FiClock },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto" dir="rtl">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
            <FiServer className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Active Directory</h1>
            <p className="text-gray-500 text-sm">إدارة وربط مستخدمين الدومين بالنظام</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white rounded-xl p-2 shadow-sm border border-gray-100 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* ═══════════════════ OVERVIEW TAB ═══════════════════ */}
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            {!stats || stats.total === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiServer className="w-10 h-10 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">لم يتم المزامنة بعد</h3>
                <p className="text-gray-500 mb-6">قم بإعداد اتصال Active Directory ثم اضغط "مزامنة" لجلب المستخدمين</p>
                <button onClick={() => setActiveTab('config')} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors">
                  إعداد الاتصال
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'إجمالي مستخدمين AD', value: stats.total, icon: FiUsers, color: 'blue', gradient: 'from-blue-500 to-blue-600' },
                    { label: 'حسابات مفعلة', value: stats.enabled, icon: FiCheckCircle, color: 'emerald', gradient: 'from-emerald-500 to-emerald-600' },
                    { label: 'مربوطين بالنظام', value: stats.syncedUsers, icon: FiLink, color: 'purple', gradient: 'from-purple-500 to-purple-600' },
                    { label: 'مربوطين كموظفين', value: stats.syncedEmployees, icon: FiBriefcase, color: 'amber', gradient: 'from-amber-500 to-amber-600' },
                  ].map((card, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-10 h-10 bg-gradient-to-br ${card.gradient} rounded-lg flex items-center justify-center`}>
                          <card.icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-3xl font-black text-gray-800">{card.value}</span>
                      </div>
                      <p className="text-sm text-gray-500 font-medium">{card.label}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Extra info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center gap-2 mb-3 text-gray-700 font-bold">
                      <FiDatabase className="text-blue-500" /> معلومات المزامنة
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">آخر مزامنة:</span><span className="font-medium">{stats.lastSync ? new Date(stats.lastSync).toLocaleString('ar-EG') : 'لم تتم بعد'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">الحالة:</span><span className={`font-bold ${stats.lastSyncStatus === 'success' ? 'text-emerald-600' : 'text-amber-600'}`}>{stats.lastSyncStatus === 'success' ? '✅ ناجحة' : stats.lastSyncStatus || '—'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">أقسام AD:</span><span className="font-medium">{stats.departments}</span></div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center gap-2 mb-3 text-gray-700 font-bold">
                      <FiUserPlus className="text-purple-500" /> حالة الربط
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">غير مربوطين كيوزر:</span><span className="font-bold text-amber-600">{stats.unsyncedUsers}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">حسابات معطلة:</span><span className="font-bold text-red-600">{stats.disabled}</span></div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col items-center justify-center gap-3">
                    <button onClick={handleSync} disabled={syncing}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                      <FiRefreshCw className={syncing ? 'animate-spin' : ''} />
                      {syncing ? 'جاري المزامنة...' : 'مزامنة الآن'}
                    </button>
                    <button onClick={() => setActiveTab('users')}
                      className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2">
                      <FiUsers /> عرض المستخدمين
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ═══════════════════ CONFIG TAB ═══════════════════ */}
        {activeTab === 'config' && (
          <motion.div key="config" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <FiSettings className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">إعدادات الاتصال بـ Active Directory</h2>
                  <p className="text-sm text-gray-500">أدخل بيانات الدومين كونترولر للربط</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Domain Name */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    <FiGlobe className="inline ml-1 text-blue-500" /> اسم الدومين
                  </label>
                  <input type="text" value={config.domain_name} onChange={e => setConfig({ ...config, domain_name: e.target.value })}
                    placeholder="example.local" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  <p className="text-xs text-gray-400 mt-1">مثال: company.local أو domain.com</p>
                </div>

                {/* Server URL */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    <FiServer className="inline ml-1 text-blue-500" /> عنوان السيرفر (IP أو Hostname)
                  </label>
                  <input type="text" value={config.server_url} onChange={e => setConfig({ ...config, server_url: e.target.value })}
                    placeholder="192.168.1.10 أو dc.example.local" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>

                {/* Base DN */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    <FiDatabase className="inline ml-1 text-blue-500" /> Base DN
                  </label>
                  <input type="text" value={config.base_dn} onChange={e => setConfig({ ...config, base_dn: e.target.value })}
                    placeholder="DC=example,DC=local" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm" />
                  <p className="text-xs text-gray-400 mt-1">مثال: DC=company,DC=local</p>
                </div>

                {/* Bind DN */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    <FiUser className="inline ml-1 text-blue-500" /> Bind DN (حساب الربط)
                  </label>
                  <input type="text" value={config.bind_dn} onChange={e => setConfig({ ...config, bind_dn: e.target.value })}
                    placeholder="CN=Admin,CN=Users,DC=example,DC=local" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm" />
                  <p className="text-xs text-gray-400 mt-1">أو: admin@example.local</p>
                </div>

                {/* Bind Password */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    <FiLock className="inline ml-1 text-blue-500" /> كلمة مرور حساب الربط
                  </label>
                  <input type="password" value={config.bind_password} onChange={e => setConfig({ ...config, bind_password: e.target.value })}
                    placeholder="••••••••" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>

                {/* Port */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">المنفذ (Port)</label>
                  <input type="number" value={config.port} onChange={e => setConfig({ ...config, port: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>

                {/* SSL */}
                <div className="flex items-center gap-3 mt-6">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={config.use_ssl} onChange={e => setConfig({ ...config, use_ssl: e.target.checked, port: e.target.checked ? 636 : 389 })} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                  <span className="text-sm font-bold text-gray-700">استخدام SSL (LDAPS)</span>
                </div>

                {/* Search Filter */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    <FiFilter className="inline ml-1 text-blue-500" /> فلتر البحث (Search Filter)
                  </label>
                  <input type="text" value={config.search_filter} onChange={e => setConfig({ ...config, search_filter: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm" />
                </div>
              </div>

              {/* Auto-sync settings */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FiZap className="text-amber-500" /> إعدادات متقدمة
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={config.auto_create_users} onChange={e => setConfig({ ...config, auto_create_users: e.target.checked })} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                    <span className="text-sm font-medium text-gray-700">إنشاء يوزر تلقائي عند تسجيل الدخول عبر AD</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={config.sync_employees} onChange={e => setConfig({ ...config, sync_employees: e.target.checked })} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                    <span className="text-sm font-medium text-gray-700">مزامنة كموظفين أيضاً</span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الصلاحية الافتراضية</label>
                    <select value={config.default_role} onChange={e => setConfig({ ...config, default_role: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option value="user">مستخدم عادي</option>
                      <option value="support">دعم فني</option>
                      <option value="admin">مدير</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 pt-6 border-t flex items-center gap-3 flex-wrap">
                <button onClick={handleTestConnection} disabled={testing}
                  className="px-6 py-2.5 bg-amber-500 text-white rounded-lg font-bold hover:bg-amber-600 transition-all disabled:opacity-50 flex items-center gap-2">
                  <FiPlay className={testing ? 'animate-pulse' : ''} size={16} />
                  {testing ? 'جاري الاختبار...' : 'اختبار الاتصال'}
                </button>
                <button onClick={handleSaveConfig} disabled={saving}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2">
                  <FiSave size={16} />
                  {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════ USERS TAB ═══════════════════ */}
        {activeTab === 'users' && (
          <motion.div key="users" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Search */}
                  <div className="relative flex-1 min-w-[200px]">
                    <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                      placeholder="بحث بالاسم أو اليوزرنيم أو الإيميل..."
                      className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>

                  {/* Filters */}
                  <select value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)}
                    className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm">
                    <option value="">كل الأقسام</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>

                  <select value={syncFilter} onChange={e => setSyncFilter(e.target.value)}
                    className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm">
                    <option value="">كل الحالات</option>
                    <option value="true">مربوط</option>
                    <option value="false">غير مربوط</option>
                  </select>

                  <select value={enabledFilter} onChange={e => setEnabledFilter(e.target.value)}
                    className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm">
                    <option value="">الكل</option>
                    <option value="true">مفعل</option>
                    <option value="false">معطل</option>
                  </select>

                  {/* Sync button */}
                  <button onClick={handleSync} disabled={syncing}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 text-sm">
                    <FiRefreshCw className={syncing ? 'animate-spin' : ''} size={14} />
                    {syncing ? 'مزامنة...' : 'مزامنة'}
                  </button>
                </div>

                {/* Bulk actions */}
                {selectedUsers.length > 0 && (
                  <div className="mt-3 pt-3 border-t flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-bold text-blue-600">تم اختيار {selectedUsers.length} مستخدم</span>
                    <button onClick={() => setBulkAction('users')}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 flex items-center gap-1.5">
                      <FiUserPlus size={14} /> إنشاء كيوزرات
                    </button>
                    <button onClick={() => setBulkAction('employees')}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 flex items-center gap-1.5">
                      <FiBriefcase size={14} /> إنشاء كموظفين
                    </button>
                    <button onClick={() => setSelectedUsers([])} className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm">
                      إلغاء التحديد
                    </button>
                  </div>
                )}
              </div>

              {/* Bulk action modal */}
              <AnimatePresence>
                {bulkAction && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="bg-white rounded-xl shadow-lg border-2 border-blue-200 p-5 overflow-hidden">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      {bulkAction === 'users' ? <><FiUserPlus className="text-purple-500" /> إنشاء يوزرات من AD</> : <><FiBriefcase className="text-emerald-500" /> إنشاء موظفين من AD</>}
                    </h3>
                    {bulkAction === 'users' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">كلمة المرور الافتراضية</label>
                          <input type="text" value={bulkPassword} onChange={e => setBulkPassword(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">الصلاحية</label>
                          <select value={bulkRole} onChange={e => setBulkRole(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg">
                            <option value="user">مستخدم عادي</option>
                            <option value="support">دعم فني</option>
                            <option value="admin">مدير</option>
                          </select>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button onClick={bulkAction === 'users' ? handleBulkCreateUsers : handleBulkCreateEmployees}
                        disabled={bulkProcessing}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                        {bulkProcessing ? <FiRefreshCw className="animate-spin" /> : <FiCheck />}
                        {bulkProcessing ? 'جاري المعالجة...' : `إنشاء ${selectedUsers.length} ${bulkAction === 'users' ? 'يوزر' : 'موظف'}`}
                      </button>
                      <button onClick={() => setBulkAction(null)} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200">
                        إلغاء
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Users Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <FiRefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                  </div>
                ) : adUsers.length === 0 ? (
                  <div className="text-center py-16">
                    <FiUsers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">لا يوجد مستخدمين. قم بالمزامنة أولاً.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-right">
                            <input type="checkbox" checked={selectedUsers.length === adUsers.length && adUsers.length > 0}
                              onChange={toggleSelectAll} className="rounded border-gray-300" />
                          </th>
                          <th className="px-4 py-3 text-right font-bold text-gray-600">المستخدم</th>
                          <th className="px-4 py-3 text-right font-bold text-gray-600">البريد</th>
                          <th className="px-4 py-3 text-right font-bold text-gray-600">القسم</th>
                          <th className="px-4 py-3 text-right font-bold text-gray-600">المسمى</th>
                          <th className="px-4 py-3 text-right font-bold text-gray-600">الحالة</th>
                          <th className="px-4 py-3 text-right font-bold text-gray-600">الربط</th>
                          <th className="px-4 py-3 text-right font-bold text-gray-600">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {adUsers.map(user => (
                          <tr key={user.id} className={`hover:bg-blue-50/30 transition-colors ${selectedUsers.includes(user.id) ? 'bg-blue-50' : ''}`}>
                            <td className="px-4 py-3">
                              <input type="checkbox" checked={selectedUsers.includes(user.id)}
                                onChange={() => toggleSelect(user.id)} className="rounded border-gray-300" />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${user.is_enabled ? 'bg-blue-500' : 'bg-gray-400'}`}>
                                  {(user.display_name || '?')[0]}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-800">{user.display_name}</p>
                                  <p className="text-xs text-gray-400">{user.sam_account_name}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{user.email || '—'}</td>
                            <td className="px-4 py-3 text-gray-600">{user.department || '—'}</td>
                            <td className="px-4 py-3 text-gray-600">{user.title || '—'}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${user.is_enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {user.is_enabled ? <><FiCheckCircle size={10} /> مفعل</> : <><FiX size={10} /> معطل</>}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-0.5">
                                {user.is_synced_user && (
                                  <span className="flex items-center gap-1 text-xs text-purple-600 font-medium">
                                    <FiLink size={10} /> يوزر: {user.local_user_name || user.local_user_email}
                                  </span>
                                )}
                                {user.is_synced_employee && (
                                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                    <FiLink size={10} /> موظف: {user.local_employee_name}
                                  </span>
                                )}
                                {!user.is_synced_user && !user.is_synced_employee && (
                                  <span className="text-xs text-gray-400">غير مربوط</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                {!user.is_synced_user && (
                                  <button onClick={() => handleCreateUser(user.id)} title="إنشاء يوزر"
                                    className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                                    <FiUserPlus size={14} />
                                  </button>
                                )}
                                {!user.is_synced_employee && (
                                  <button onClick={() => handleCreateEmployee(user.id)} title="إنشاء موظف"
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                                    <FiBriefcase size={14} />
                                  </button>
                                )}
                                {user.is_synced_user && (
                                  <button onClick={() => handleUnlink(user.id, 'user')} title="فك ربط اليوزر"
                                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                                    <FiX size={14} />
                                  </button>
                                )}
                                {user.is_synced_employee && (
                                  <button onClick={() => handleUnlink(user.id, 'employee')} title="فك ربط الموظف"
                                    className="p-1.5 text-amber-400 hover:bg-amber-50 rounded-lg transition-colors">
                                    <FiX size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {adUsers.length > 0 && (
                  <div className="px-4 py-3 bg-gray-50 border-t text-sm text-gray-500">
                    إجمالي: {adUsers.length} مستخدم
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════ LOGS TAB ═══════════════════ */}
        {activeTab === 'logs' && (
          <motion.div key="logs" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <FiClock className="text-blue-500" /> سجل المزامنة
                </h3>
                <button onClick={fetchLogs} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  <FiRefreshCw size={14} /> تحديث
                </button>
              </div>
              {syncLogs.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <FiClock className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  لا يوجد سجلات مزامنة بعد
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-right font-bold text-gray-600">التاريخ</th>
                        <th className="px-4 py-3 text-right font-bold text-gray-600">النوع</th>
                        <th className="px-4 py-3 text-right font-bold text-gray-600">الحالة</th>
                        <th className="px-4 py-3 text-right font-bold text-gray-600">إجمالي</th>
                        <th className="px-4 py-3 text-right font-bold text-gray-600">جديد</th>
                        <th className="px-4 py-3 text-right font-bold text-gray-600">محدث</th>
                        <th className="px-4 py-3 text-right font-bold text-gray-600">أخطاء</th>
                        <th className="px-4 py-3 text-right font-bold text-gray-600">المدة</th>
                        <th className="px-4 py-3 text-right font-bold text-gray-600">بواسطة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {syncLogs.map(log => (
                        <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-600">{new Date(log.created_at).toLocaleString('ar-EG')}</td>
                          <td className="px-4 py-3 text-gray-700 font-medium">{log.sync_type}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${log.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {log.status === 'success' ? <FiCheckCircle size={10} /> : <FiAlertTriangle size={10} />}
                              {log.status === 'success' ? 'ناجح' : 'جزئي'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium">{log.total_found}</td>
                          <td className="px-4 py-3 text-emerald-600 font-bold">{log.new_imported}</td>
                          <td className="px-4 py-3 text-blue-600 font-bold">{log.updated}</td>
                          <td className="px-4 py-3 text-red-600 font-bold">{log.errors}</td>
                          <td className="px-4 py-3 text-gray-500">{log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : '—'}</td>
                          <td className="px-4 py-3 text-gray-600">{log.triggered_by}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ═══════════════════ DEPARTMENTS TAB ═══════════════════ */}
        {activeTab === 'departments' && (
          <ADDepartmentsTab
            deptView={deptView} setDeptView={setDeptView}
            ousList={ousList} groupsList={groupsList} syncedDepts={syncedDepts}
            selectedOUs={selectedOUs} setSelectedOUs={setSelectedOUs}
            selectedGroups={selectedGroups} setSelectedGroups={setSelectedGroups}
            fetchingOUs={fetchingOUs} fetchingGroups={fetchingGroups} syncingDepts={syncingDepts}
            handleFetchOUs={handleFetchOUs} handleFetchGroups={handleFetchGroups}
            handleSyncAsDepts={handleSyncAsDepts} fetchSyncedDepts={fetchSyncedDepts}
          />
        )}
      </AnimatePresence>

      {/* ═══════════════════ EMPLOYEE PREVIEW MODAL ═══════════════════ */}
      <AnimatePresence>
        {(previewData || previewLoading) && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => !creatingEmployee && setPreviewData(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className={`px-6 py-4 ${previewData?.existing_employee ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-emerald-600 to-teal-600'}`}>
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  <FiBriefcase /> {previewData?.existing_employee ? 'ربط بموظف موجود' : 'إنشاء موظف جديد'}
                </h3>
                <p className={`text-sm mt-1 ${previewData?.existing_employee ? 'text-amber-100' : 'text-emerald-100'}`}>
                  {previewData?.existing_employee 
                    ? `سيتم ربط يوزر AD بالموظف الموجود: ${previewData.existing_employee.full_name}`
                    : 'معاينة البيانات التي سيتم ربطها تلقائياً'}
                </p>
              </div>

              {previewLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-gray-500">جاري جلب البيانات...</p>
                </div>
              ) : previewData ? (
                <div className="p-6 space-y-4">
                  {/* Existing Employee Banner */}
                  {previewData.existing_employee && (
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                      <h4 className="font-bold text-amber-800 text-sm mb-2 flex items-center gap-1">⚡ موظف موجود في النظام</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-gray-500">الاسم:</span> <span className="font-medium text-gray-800">{previewData.existing_employee.full_name}</span></div>
                        <div><span className="text-gray-500">الكود:</span> <span className="font-medium text-gray-800 font-mono">{previewData.existing_employee.employee_code}</span></div>
                        {previewData.existing_employee.email && <div className="col-span-2"><span className="text-gray-500">الإيميل:</span> <span className="font-medium text-gray-800 text-xs">{previewData.existing_employee.email}</span></div>}
                      </div>
                      <p className="text-xs text-amber-600 mt-2">سيتم ربط يوزر AD بهذا الموظف وتحديث البيانات الناقصة</p>
                    </div>
                  )}

                  {/* AD User Info */}
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <h4 className="font-bold text-blue-800 text-sm mb-2 flex items-center gap-1"><FiUser size={14} /> بيانات AD</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-gray-500">الاسم:</span> <span className="font-medium text-gray-800">{previewData.ad_user.display_name}</span></div>
                      <div><span className="text-gray-500">اليوزر:</span> <span className="font-medium text-gray-800 font-mono">{previewData.ad_user.sam_account_name}</span></div>
                      {previewData.ad_user.title && <div><span className="text-gray-500">المسمى:</span> <span className="font-medium text-gray-800">{previewData.ad_user.title}</span></div>}
                      {previewData.ad_user.email && <div><span className="text-gray-500">إيميل AD:</span> <span className="font-medium text-gray-800 text-xs">{previewData.ad_user.email}</span></div>}
                    </div>
                  </div>

                  {/* Auto-linked data */}
                  <div className="space-y-3">
                    {/* Department */}
                    <div className={`rounded-xl p-4 border flex items-center gap-3 ${previewData.auto_link.department ? 'bg-purple-50 border-purple-100' : 'bg-gray-50 border-gray-200'}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${previewData.auto_link.department ? 'bg-purple-200 text-purple-700' : 'bg-gray-200 text-gray-400'}`}>
                        <FiMapPin size={18} />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 font-medium">القسم</div>
                        <div className={`font-bold ${previewData.auto_link.department ? 'text-purple-800' : 'text-gray-400'}`}>
                          {previewData.auto_link.department ? previewData.auto_link.department.name : 'لم يتم العثور على قسم'}
                        </div>
                      </div>
                      {previewData.auto_link.department && <FiCheckCircle className="text-purple-500" size={20} />}
                    </div>

                    {/* Fingerprint */}
                    <div className={`rounded-xl p-4 border flex items-center gap-3 ${
                      previewData.auto_link.fingerprint?.status === 'already_linked' ? 'bg-teal-50 border-teal-100' :
                      previewData.auto_link.fingerprint ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                        previewData.auto_link.fingerprint ? 'bg-emerald-200 text-emerald-700' : 'bg-gray-200 text-gray-400'
                      }`}>
                        {previewData.auto_link.fingerprint ? previewData.auto_link.fingerprint.id : '?'}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 font-medium">رقم البصمة (Employee Code)</div>
                        {previewData.auto_link.fingerprint ? (
                          <div>
                            <span className="font-bold text-emerald-800 text-lg">{previewData.auto_link.fingerprint.id}</span>
                            <span className="text-emerald-600 text-sm mr-2">— {previewData.auto_link.fingerprint.name}</span>
                            {previewData.auto_link.fingerprint.status === 'already_linked' && (
                              <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full mr-1">مرتبط مسبقاً ✓</span>
                            )}
                          </div>
                        ) : (
                          <div className="text-gray-400 font-bold">لم يتم العثور على بصمة</div>
                        )}
                      </div>
                      {previewData.auto_link.fingerprint && <FiCheckCircle className={`${previewData.auto_link.fingerprint.status === 'already_linked' ? 'text-teal-500' : 'text-emerald-500'}`} size={20} />}
                    </div>

                    {/* Email */}
                    <div className={`rounded-xl p-4 border flex items-center gap-3 ${
                      previewData.auto_link.email?.status === 'already_linked' ? 'bg-sky-50 border-sky-100' :
                      previewData.auto_link.email ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${previewData.auto_link.email ? 'bg-blue-200 text-blue-700' : 'bg-gray-200 text-gray-400'}`}>
                        <FiMail size={18} />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 font-medium">البريد الإلكتروني (cPanel)</div>
                        <div className={`font-bold ${previewData.auto_link.email ? 'text-blue-800' : 'text-gray-400'}`}>
                          {previewData.auto_link.email ? previewData.auto_link.email.address : 'لم يتم العثور على إيميل'}
                          {previewData.auto_link.email?.status === 'already_linked' && (
                            <span className="text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full mr-2 font-normal">مرتبط مسبقاً ✓</span>
                          )}
                        </div>
                      </div>
                      {previewData.auto_link.email && <FiCheckCircle className={`${previewData.auto_link.email.status === 'already_linked' ? 'text-sky-500' : 'text-blue-500'}`} size={20} />}
                    </div>

                    {/* Employee Code */}
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center font-bold text-sm">
                        ID
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 font-medium">كود الموظف</div>
                        <div className="font-bold font-mono text-amber-800">{previewData.auto_link.employee_code}</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleConfirmCreateEmployee}
                      disabled={creatingEmployee}
                      className={`flex-1 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                        previewData.existing_employee 
                          ? 'bg-amber-600 hover:bg-amber-700'
                          : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      {creatingEmployee ? (
                        <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> جاري المعالجة...</>
                      ) : previewData.existing_employee ? (
                        <><FiLink size={16} /> تأكيد الربط</>
                      ) : (
                        <><FiCheckCircle size={16} /> تأكيد الإنشاء</>
                      )}
                    </button>
                    <button
                      onClick={() => setPreviewData(null)}
                      disabled={creatingEmployee}
                      className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
