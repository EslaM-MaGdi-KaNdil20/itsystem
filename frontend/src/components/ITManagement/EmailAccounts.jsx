import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import { API_URL, getAuthHeaders, handleAuthError } from '../../utils/api';

const EmailAccounts = () => {
  const [emails, setEmails] = useState([]);
  const [stats, setStats] = useState(null);
  const [hostingStats, setHostingStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showSyncLogs, setShowSyncLogs] = useState(false);
  const [editingEmail, setEditingEmail] = useState(null);
  const [showPassword, setShowPassword] = useState({});
  const [syncing, setSyncing] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [syncLogs, setSyncLogs] = useState([]);
  const [filter, setFilter] = useState('all'); // all, cpanel, manual
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    email_address: '', employee_id: '', email_type: 'work', password: '',
    server_incoming: '', server_outgoing: '', quota_mb: '', quota_used_mb: '',
    status: 'active', notes: ''
  });

  const [hostingConfig, setHostingConfig] = useState({
    server_url: '', port: 2083, username: '', api_token: '',
    cpanel_user: '', domain: '', use_ssl: true,
    auto_sync_enabled: false, sync_interval_minutes: 4,
    alert_enabled: true, alert_threshold_percent: 85, alert_email: ''
  });

  const authFetch = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: { ...getAuthHeaders(), ...(options.headers || {}) }
    });
    await handleAuthError(response);
    return response;
  };

  const fetchEmails = async () => {
    try {
      const response = await fetch(`${API_URL}/email-accounts`);
      setEmails(await response.json());
    } catch (error) { toast.error('فشل في التحميل'); }
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/email-accounts/stats`);
      setStats(await response.json());
    } catch (error) { console.error(error); }
  };

  const fetchHostingStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch(`${API_URL}/hosting/stats`, {
        headers: getAuthHeaders()
      });
      if (response.ok) setHostingStats(await response.json());
    } catch (error) { console.error(error); }
  };

  const fetchHostingConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch(`${API_URL}/hosting/config`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.id) {
          setHostingConfig(prev => ({
            ...prev,
            ...data,
            auto_sync_enabled: data.auto_sync_enabled ?? false,
            sync_interval_minutes: data.sync_interval_minutes ?? 4,
            alert_enabled: data.alert_enabled ?? true,
            alert_threshold_percent: data.alert_threshold_percent ?? 85,
            alert_email: data.alert_email ?? ''
          }));
        }
      }
    } catch (error) { console.error(error); }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API_URL}/employees`);
      setEmployees(await response.json());
    } catch (error) { console.error(error); }
  };

  const fetchSyncLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch(`${API_URL}/hosting/sync-logs`, {
        headers: getAuthHeaders()
      });
      if (response.ok) setSyncLogs(await response.json());
    } catch (error) { console.error(error); }
  };

  useEffect(() => { fetchEmails(); fetchStats(); fetchHostingStats(); fetchEmployees(); }, []);

  // ─── Email CRUD ───
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingEmail ? `${API_URL}/email-accounts/${editingEmail.id}` : `${API_URL}/email-accounts`;
      const response = await fetch(url, {
        method: editingEmail ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        toast.success(editingEmail ? 'تم التحديث' : 'تم الإضافة');
        setShowModal(false); resetForm(); fetchEmails(); fetchStats(); fetchHostingStats();
      }
    } catch (error) { toast.error('حدث خطأ'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('حذف الحساب؟')) return;
    try {
      await fetch(`${API_URL}/email-accounts/${id}`, { method: 'DELETE' });
      toast.success('تم الحذف'); fetchEmails(); fetchStats(); fetchHostingStats();
    } catch (error) { toast.error('فشل الحذف'); }
  };

  const resetForm = () => {
    setFormData({ email_address: '', employee_id: '', email_type: 'work', password: '', server_incoming: '', server_outgoing: '', quota_mb: '', quota_used_mb: '', status: 'active', notes: '' });
    setEditingEmail(null);
  };

  const openEdit = (email) => { setEditingEmail(email); setFormData({ ...email, password: '' }); setShowModal(true); };

  // ─── Hosting / cPanel ───
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      const response = await authFetch(`${API_URL}/hosting/config`, {
        method: 'POST',
        body: JSON.stringify(hostingConfig)
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || 'تم حفظ الإعدادات');
        setShowConfigModal(false);
        fetchHostingStats();
      } else {
        toast.error(data.error || 'فشل في الحفظ');
      }
    } catch (error) { toast.error('حدث خطأ'); }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const response = await authFetch(`${API_URL}/hosting/test-connection`, {
        method: 'POST',
        body: JSON.stringify(hostingConfig)
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || 'تم الاتصال بنجاح!');
      } else {
        toast.error(data.error || 'فشل الاتصال');
      }
    } catch (error) { toast.error('فشل الاتصال بالسيرفر'); }
    finally { setTestingConnection(false); }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await authFetch(`${API_URL}/hosting/sync-emails`, {
        method: 'POST'
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(`تم المزامنة: ${data.new} جديد، ${data.updated} محدث`);
        fetchEmails(); fetchStats(); fetchHostingStats();
      } else {
        toast.error(data.error || 'فشل في المزامنة');
      }
    } catch (error) { toast.error('فشل في المزامنة'); }
    finally { setSyncing(false); }
  };

  const openConfigModal = async () => {
    await fetchHostingConfig();
    setShowConfigModal(true);
  };

  const openSyncLogs = async () => {
    await fetchSyncLogs();
    setShowSyncLogs(true);
  };

  const togglePassword = (id) => setShowPassword(prev => ({ ...prev, [id]: !prev[id] }));

  // ─── Link / Unlink Employee ───
  const [linkingEmail, setLinkingEmail] = useState(null); // email id being linked
  const [autoLinking, setAutoLinking] = useState(false);

  const handleLinkEmployee = async (emailId, employeeId) => {
    try {
      const response = await authFetch(`${API_URL}/email-accounts/${emailId}/link`, {
        method: 'PUT',
        body: JSON.stringify({ employee_id: employeeId })
      });
      if (response.ok) {
        toast.success('تم ربط الموظف بنجاح');
        setLinkingEmail(null);
        fetchEmails(); fetchStats(); fetchHostingStats();
      } else {
        const data = await response.json();
        toast.error(data.error || 'فشل في الربط');
      }
    } catch (error) { toast.error('حدث خطأ'); }
  };

  const handleUnlinkEmployee = async (emailId) => {
    try {
      const response = await authFetch(`${API_URL}/email-accounts/${emailId}/link`, {
        method: 'DELETE'
      });
      if (response.ok) {
        toast.success('تم فك الربط');
        fetchEmails(); fetchStats(); fetchHostingStats();
      }
    } catch (error) { toast.error('حدث خطأ'); }
  };

  const handleAutoLinkAll = async () => {
    setAutoLinking(true);
    try {
      const response = await authFetch(`${API_URL}/email-accounts/auto-link`, {
        method: 'POST'
      });
      const data = await response.json();
      if (response.ok) {
        if (data.linked > 0) {
          toast.success(`تم ربط ${data.linked} حساب بريد تلقائياً`);
        } else {
          toast.success('لا توجد حسابات يمكن ربطها تلقائياً');
        }
        fetchEmails(); fetchStats(); fetchHostingStats();
      } else {
        toast.error(data.error || 'فشل في الربط التلقائي');
      }
    } catch (error) { toast.error('حدث خطأ'); }
    finally { setAutoLinking(false); }
  };

  const statusColors = { active: 'bg-green-100 text-green-700', inactive: 'bg-gray-100 text-gray-700', suspended: 'bg-red-100 text-red-700' };
  const statusLabels = { active: 'نشط', inactive: 'غير نشط', suspended: 'موقوف' };
  const typeLabels = { work: 'عمل', personal: 'شخصي', shared: 'مشترك' };

  // Filter emails
  const filteredEmails = emails.filter(e => {
    if (filter === 'cpanel' && e.source !== 'cpanel') return false;
    if (filter === 'manual' && e.source === 'cpanel') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const haystack = [
        e.email_address, e.employee_name, e.domain,
        e.status, e.email_type, e.notes
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Toaster position="top-center" />
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">📧 إدارة حسابات البريد</h1>
        <p className="text-gray-600">إدارة حسابات البريد الإلكتروني للموظفين</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-5 text-white">
          <div className="text-sm opacity-90">إجمالي الحسابات</div>
          <div className="text-3xl font-bold mt-2">{hostingStats?.total || stats?.total_accounts || 0}</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-lg p-5 text-white">
          <div className="text-sm opacity-90">من الاستضافة</div>
          <div className="text-3xl font-bold mt-2">{hostingStats?.cpanel_synced || 0}</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-5 text-white">
          <div className="text-sm opacity-90">مرتبط بموظف</div>
          <div className="text-3xl font-bold mt-2">{hostingStats?.linked || 0}</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-5 text-white">
          <div className="text-sm opacity-90">غير مرتبط</div>
          <div className="text-3xl font-bold mt-2">{hostingStats?.unlinked || 0}</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-5 text-white">
          <div className="text-sm opacity-90">المساحة المستخدمة</div>
          <div className="text-3xl font-bold mt-2">{Math.round((hostingStats?.total_used || 0))} MB</div>
        </motion.div>
      </div>

      {/* Last Sync Info */}
      {hostingStats?.last_sync_at && (
        <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
          hostingStats.last_sync_status === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
          hostingStats.last_sync_status === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
          'bg-yellow-50 text-yellow-700 border border-yellow-200'
        }`}>
          <span>{hostingStats.last_sync_status === 'success' ? '✅' : hostingStats.last_sync_status === 'error' ? '❌' : '⚠️'}</span>
          <span>آخر مزامنة: {new Date(hostingStats.last_sync_at).toLocaleString('ar-EG')}</span>
          {hostingStats.last_sync_message && <span>— {hostingStats.last_sync_message}</span>}
          {hostingConfig.auto_sync_enabled && (
            <span className="mr-2 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">🔄 تلقائي كل {hostingConfig.sync_interval_minutes} دقيقة</span>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 بحث بالإيميل أو اسم الموظف..."
              className="px-4 py-2 pr-10 border rounded-lg text-sm bg-gray-50 w-64 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                ✕
              </button>
            )}
          </div>
          {/* Filter */}
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-gray-50">
            <option value="all">الكل ({emails.length})</option>
            <option value="cpanel">من الاستضافة ({emails.filter(e => e.source === 'cpanel').length})</option>
            <option value="manual">يدوي ({emails.filter(e => e.source !== 'cpanel').length})</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openSyncLogs}
            className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50 text-sm">
            📋 سجل المزامنة
          </button>
          <button onClick={openConfigModal}
            className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50 text-sm">
            ⚙️ إعدادات الاستضافة
          </button>
          <button onClick={handleAutoLinkAll} disabled={autoLinking}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm flex items-center gap-2">
            {autoLinking ? <span className="animate-spin">⏳</span> : '🔗'} ربط تلقائي
          </button>
          <button onClick={handleSync} disabled={syncing}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 text-sm flex items-center gap-2">
            {syncing ? <span className="animate-spin">⏳</span> : '🔄'} مزامنة من cPanel
          </button>
          <button onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            + إضافة يدوي
          </button>
        </div>
      </div>

      {/* Email Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmails.map((email) => (
          <motion.div key={email.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className={`bg-white rounded-lg shadow-md p-6 border-r-4 ${email.source === 'cpanel' ? 'border-r-cyan-500' : 'border-r-blue-500'}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-lg truncate" dir="ltr">{email.email_address}</h3>
                {email.employee_id ? (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-sm text-green-600">👤 {email.employee_name || `موظف #${email.employee_id}`}</span>
                    <button onClick={() => handleUnlinkEmployee(email.id)} 
                      className="text-red-400 hover:text-red-600 text-xs mr-1" title="فك الربط">✕</button>
                  </div>
                ) : (
                  <div className="mt-1">
                    {linkingEmail === email.id ? (
                      <div className="flex items-center gap-1">
                        <select 
                          onChange={(e) => { if (e.target.value) handleLinkEmployee(email.id, parseInt(e.target.value)); }}
                          className="text-xs border rounded px-1 py-0.5 max-w-[180px]"
                          autoFocus>
                          <option value="">اختر موظف...</option>
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                          ))}
                        </select>
                        <button onClick={() => setLinkingEmail(null)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => setLinkingEmail(email.id)} 
                        className="text-sm text-orange-500 hover:text-orange-700 flex items-center gap-1">
                        🔗 ربط بموظف
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 mr-2">
                <span className={`px-2 py-1 rounded-full text-xs ${statusColors[email.status]}`}>{statusLabels[email.status]}</span>
                {email.source === 'cpanel' && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-cyan-100 text-cyan-700">cPanel</span>
                )}
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between"><span>النوع:</span><span>{typeLabels[email.email_type] || email.email_type}</span></div>
              {(email.quota_mb || email.disk_used_mb) && (
                <div className="flex justify-between">
                  <span>المساحة:</span>
                  <span dir="ltr">{email.disk_used_mb || email.quota_used_mb || 0} / {email.quota_mb || '∞'} MB</span>
                </div>
              )}
              {email.quota_mb && email.disk_used_mb > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-cyan-500 h-2 rounded-full transition-all" 
                    style={{ width: `${Math.min(100, (email.disk_used_mb / email.quota_mb) * 100)}%` }} />
                </div>
              )}
              {email.domain && <div className="flex justify-between"><span>الدومين:</span><span dir="ltr">{email.domain}</span></div>}
              {email.decrypted_password && (
                <div className="flex justify-between items-center">
                  <span>كلمة المرور:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{showPassword[email.id] ? email.decrypted_password : '••••••••'}</span>
                    <button onClick={() => togglePassword(email.id)} className="text-blue-600 text-xs">{showPassword[email.id] ? 'إخفاء' : 'عرض'}</button>
                  </div>
                </div>
              )}
              {email.last_synced_at && (
                <div className="flex justify-between text-xs text-gray-400">
                  <span>آخر مزامنة:</span>
                  <span>{new Date(email.last_synced_at).toLocaleDateString('ar-EG')}</span>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t flex justify-end gap-2">
              <button onClick={() => openEdit(email)} className="text-blue-600 text-sm hover:underline">تعديل</button>
              <button onClick={() => handleDelete(email.id)} className="text-red-600 text-sm hover:underline">حذف</button>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredEmails.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-4">📭</div>
          <p>{searchQuery ? `لا توجد نتائج لـ "${searchQuery}"` : filter !== 'all' ? 'لا توجد حسابات بهذا الفلتر' : 'لا توجد حسابات بريد'}</p>
          <p className="text-sm mt-2">اضغط "إعدادات الاستضافة" لربط cPanel ثم "مزامنة من cPanel"</p>
        </div>
      )}

      {/* ─── Add/Edit Email Modal ─── */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={(e) => e.stopPropagation()}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6">{editingEmail ? 'تعديل حساب' : 'إضافة حساب يدوي'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><label className="block text-sm font-medium mb-1">البريد الإلكتروني *</label><input type="email" required value={formData.email_address} onChange={(e) => setFormData({...formData, email_address: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                  <div><label className="block text-sm font-medium mb-1">الموظف</label><select value={formData.employee_id} onChange={(e) => setFormData({...formData, employee_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg"><option value="">اختر موظف</option>{employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}</select></div>
                  <div><label className="block text-sm font-medium mb-1">النوع</label><select value={formData.email_type} onChange={(e) => setFormData({...formData, email_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg"><option value="work">عمل</option><option value="personal">شخصي</option><option value="shared">مشترك</option></select></div>
                  <div className="col-span-2"><label className="block text-sm font-medium mb-1">كلمة المرور {!editingEmail && '*'}</label><input type="password" required={!editingEmail} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder={editingEmail ? 'اتركه فارغاً للإبقاء' : ''} /></div>
                  <div><label className="block text-sm font-medium mb-1">سيرفر الوارد</label><input type="text" value={formData.server_incoming} onChange={(e) => setFormData({...formData, server_incoming: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                  <div><label className="block text-sm font-medium mb-1">سيرفر الصادر</label><input type="text" value={formData.server_outgoing} onChange={(e) => setFormData({...formData, server_outgoing: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                  <div><label className="block text-sm font-medium mb-1">الحصة (MB)</label><input type="number" value={formData.quota_mb} onChange={(e) => setFormData({...formData, quota_mb: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                  <div><label className="block text-sm font-medium mb-1">الحالة</label><select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg"><option value="active">نشط</option><option value="inactive">غير نشط</option><option value="suspended">موقوف</option></select></div>
                </div>
                <div><label className="block text-sm font-medium mb-1">ملاحظات</label><textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full px-3 py-2 border rounded-lg" rows="2" /></div>
                <div className="flex justify-end gap-4 mt-6">
                  <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-6 py-2 border rounded-lg">إلغاء</button>
                  <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg">{editingEmail ? 'تحديث' : 'إضافة'}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Hosting Config Modal ─── */}
      <AnimatePresence>
        {showConfigModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center text-xl">🌐</div>
                <div>
                  <h2 className="text-xl font-bold">إعدادات الاستضافة (cPanel)</h2>
                  <p className="text-sm text-gray-500">ربط السيستم بـ cPanel لسحب الإيميلات تلقائياً</p>
                </div>
              </div>

              <form onSubmit={handleSaveConfig} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">عنوان السيرفر *</label>
                    <input type="text" required value={hostingConfig.server_url}
                      onChange={(e) => setHostingConfig({...hostingConfig, server_url: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg" dir="ltr"
                      placeholder="server.example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">البورت</label>
                    <input type="number" value={hostingConfig.port}
                      onChange={(e) => setHostingConfig({...hostingConfig, port: parseInt(e.target.value) || 2083})}
                      className="w-full px-3 py-2 border rounded-lg" dir="ltr" />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer pb-2">
                      <input type="checkbox" checked={hostingConfig.use_ssl}
                        onChange={(e) => setHostingConfig({...hostingConfig, use_ssl: e.target.checked})}
                        className="w-4 h-4" />
                      <span className="text-sm">استخدام SSL</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">اسم المستخدم (cPanel) *</label>
                    <input type="text" required value={hostingConfig.username}
                      onChange={(e) => {
                        setHostingConfig({...hostingConfig, username: e.target.value, cpanel_user: e.target.value});
                      }}
                      className="w-full px-3 py-2 border rounded-lg" dir="ltr"
                      placeholder="اليوزر بتاع cPanel" />
                    <p className="text-xs text-gray-400 mt-1">اليوزر اللي بتدخل بيه cPanel</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">API Token *</label>
                    <input type="password" required value={hostingConfig.api_token}
                      onChange={(e) => setHostingConfig({...hostingConfig, api_token: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg font-mono" dir="ltr"
                      placeholder="من cPanel > Manage API Tokens" />
                    <p className="text-xs text-gray-400 mt-1">
                      ادخل cPanel → Security → Manage API Tokens → Create
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">الدومين *</label>
                    <input type="text" required value={hostingConfig.domain}
                      onChange={(e) => setHostingConfig({...hostingConfig, domain: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg" dir="ltr"
                      placeholder="sobek.com.eg" />
                  </div>
                </div>

                {/* ─── Auto Sync Settings ─── */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">🔄 المزامنة التلقائية</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={hostingConfig.auto_sync_enabled}
                          onChange={(e) => setHostingConfig({...hostingConfig, auto_sync_enabled: e.target.checked})}
                          className="w-4 h-4 text-cyan-600" />
                        <span className="text-sm">تفعيل المزامنة التلقائية</span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">كل (دقيقة)</label>
                      <input type="number" min="1" max="1440" value={hostingConfig.sync_interval_minutes}
                        onChange={(e) => setHostingConfig({...hostingConfig, sync_interval_minutes: parseInt(e.target.value) || 4})}
                        className="w-full px-3 py-2 border rounded-lg" dir="ltr" />
                    </div>
                  </div>
                  {hostingConfig.auto_sync_enabled && (
                    <p className="text-xs text-green-600 mt-2">✅ سيتم تحديث الإيميلات تلقائياً كل {hostingConfig.sync_interval_minutes} دقيقة</p>
                  )}
                </div>

                {/* ─── Alert Settings ─── */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">🔔 تنبيهات المساحة</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={hostingConfig.alert_enabled}
                          onChange={(e) => setHostingConfig({...hostingConfig, alert_enabled: e.target.checked})}
                          className="w-4 h-4 text-cyan-600" />
                        <span className="text-sm">تفعيل تنبيهات المساحة</span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">نسبة التنبيه (%)</label>
                      <input type="number" min="50" max="99" value={hostingConfig.alert_threshold_percent}
                        onChange={(e) => setHostingConfig({...hostingConfig, alert_threshold_percent: parseInt(e.target.value) || 85})}
                        className="w-full px-3 py-2 border rounded-lg" dir="ltr" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">إيميل التنبيهات</label>
                      <input type="email" value={hostingConfig.alert_email}
                        onChange={(e) => setHostingConfig({...hostingConfig, alert_email: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg" dir="ltr"
                        placeholder="your@email.com (اتركه فاضي لاستخدام الافتراضي)" />
                      <p className="text-xs text-gray-400 mt-1">لو فاضي هيبعت على الإيميل الافتراضي المسجل في إعدادات السيرفر</p>
                    </div>
                  </div>
                  {hostingConfig.alert_enabled && (
                    <div className="mt-2 p-2 bg-amber-50 rounded text-xs text-amber-700">
                      ⚠️ لو أي إيميل وصل لـ {hostingConfig.alert_threshold_percent}% من المساحة، هيظهر إشعار على السيستم + يتبعت إيميل تنبيه
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <button type="button" onClick={handleTestConnection} disabled={testingConnection}
                    className="px-4 py-2 border border-cyan-500 text-cyan-600 rounded-lg hover:bg-cyan-50 disabled:opacity-50 flex items-center gap-2 text-sm">
                    {testingConnection ? <span className="animate-spin">⏳</span> : '🔌'} اختبار الاتصال
                  </button>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowConfigModal(false)}
                      className="px-6 py-2 border rounded-lg">إلغاء</button>
                    <button type="submit"
                      className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">💾 حفظ</button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Sync Logs Modal ─── */}
      <AnimatePresence>
        {showSyncLogs && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">📋 سجل مزامنة الاستضافة</h2>
              {syncLogs.length === 0 ? (
                <p className="text-center py-8 text-gray-400">لا توجد سجلات مزامنة بعد</p>
              ) : (
                <div className="space-y-3">
                  {syncLogs.map(log => (
                    <div key={log.id} className={`p-3 rounded-lg border text-sm ${
                      log.status === 'success' ? 'border-green-200 bg-green-50' :
                      log.status === 'error' ? 'border-red-200 bg-red-50' :
                      'border-yellow-200 bg-yellow-50'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-medium">
                            {log.status === 'success' ? '✅' : log.status === 'error' ? '❌' : log.status === 'sent' ? '📧' : '⚠️'}
                            {log.sync_type === 'auto_sync' ? ' 🔄 ' : log.sync_type === 'disk_alert' ? ' 🔔 ' : ' '}
                            {log.message}
                          </span>
                          {log.total_found > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              إجمالي: {log.total_found} | جديد: {log.new_count} | محدث: {log.updated_count} | أخطاء: {log.error_count}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap mr-2">
                          {new Date(log.created_at).toLocaleString('ar-EG')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end mt-4">
                <button onClick={() => setShowSyncLogs(false)} className="px-6 py-2 border rounded-lg">إغلاق</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmailAccounts;
