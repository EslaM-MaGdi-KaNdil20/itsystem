import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import { API_URL, getAuthHeaders, handleAuthError } from '../../utils/api';

const VoIP = () => {
  const [extensions, setExtensions] = useState([]);
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showSyncLogs, setShowSyncLogs] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedExt, setSelectedExt] = useState(null);
  const [syncLogs, setSyncLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const [config, setConfig] = useState({
    pbx_type: 'grandstream', server_url: '', port: 8089,
    username: 'admin', password: '', use_ssl: true,
    auto_sync_enabled: false, sync_interval_minutes: 60
  });

  const authFetch = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: { ...getAuthHeaders(), ...(options.headers || {}) }
    });
    await handleAuthError(response);
    return response;
  };

  const fetchExtensions = async () => {
    try {
      const response = await authFetch(`${API_URL}/voip/extensions`);
      if (response.ok) setExtensions(await response.json());
    } catch (error) { toast.error('فشل في تحميل الإكستنشنات'); }
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const response = await authFetch(`${API_URL}/voip/stats`);
      if (response.ok) setStats(await response.json());
    } catch (error) { console.error(error); }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API_URL}/employees`);
      if (response.ok) setEmployees(await response.json());
    } catch (error) { console.error(error); }
  };

  const fetchConfig = async () => {
    try {
      const response = await authFetch(`${API_URL}/voip/config`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.id) setConfig(data);
      }
    } catch (error) { console.error(error); }
  };

  const fetchSyncLogs = async () => {
    try {
      const response = await authFetch(`${API_URL}/voip/sync-logs`);
      if (response.ok) setSyncLogs(await response.json());
    } catch (error) { console.error(error); }
  };

  useEffect(() => { fetchExtensions(); fetchStats(); fetchEmployees(); }, []);

  // ─── Actions ───
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      const response = await authFetch(`${API_URL}/voip/config`, {
        method: 'POST', body: JSON.stringify(config)
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || 'تم حفظ الإعدادات');
        setShowConfigModal(false);
        fetchStats();
      } else {
        toast.error(data.error || 'فشل في الحفظ');
      }
    } catch (error) { toast.error('حدث خطأ'); }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const response = await authFetch(`${API_URL}/voip/test-connection`, {
        method: 'POST', body: JSON.stringify(config)
      });
      const data = await response.json();
      if (response.ok) toast.success(data.message);
      else if (data.lockout) {
        toast.error(data.error, { duration: 8000, style: { background: '#991B1B', color: '#fff', maxWidth: '500px', direction: 'rtl' } });
      }
      else toast.error(data.error || 'فشل الاتصال');
    } catch (error) { toast.error('فشل الاتصال بالـ PBX'); }
    finally { setTestingConnection(false); }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await authFetch(`${API_URL}/voip/sync-extensions`, {
        method: 'POST'
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(`تم المزامنة: ${data.new} جديد، ${data.updated} محدث`);
        fetchExtensions(); fetchStats();
      } else {
        toast.error(data.error || 'فشل في المزامنة');
      }
    } catch (error) { toast.error('فشل في المزامنة'); }
    finally { setSyncing(false); }
  };

  const handleLinkEmployee = async (extId, employeeId) => {
    try {
      const response = await authFetch(`${API_URL}/voip/extensions/${extId}/link`, {
        method: 'PUT',
        body: JSON.stringify({ employee_id: employeeId || null })
      });
      if (response.ok) {
        toast.success(employeeId ? 'تم الربط' : 'تم فك الربط');
        setShowLinkModal(false);
        fetchExtensions(); fetchStats();
      }
    } catch (error) { toast.error('حدث خطأ'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('حذف هذا الإكستنشن من القائمة؟')) return;
    try {
      await authFetch(`${API_URL}/voip/extensions/${id}`, {
        method: 'DELETE'
      });
      toast.success('تم الحذف');
      fetchExtensions(); fetchStats();
    } catch (error) { toast.error('فشل الحذف'); }
  };

  const openConfigModal = async () => { await fetchConfig(); setShowConfigModal(true); };
  const openSyncLogs = async () => { await fetchSyncLogs(); setShowSyncLogs(true); };

  // Filter & search
  const departments = [...new Set(extensions.filter(e => e.department).map(e => e.department))];
  
  const filteredExtensions = extensions.filter(e => {
    if (filter === 'active' && e.status !== 'active') return false;
    if (filter === 'inactive' && e.status !== 'inactive') return false;
    if (filter === 'linked' && !e.employee_id) return false;
    if (filter === 'unlinked' && e.employee_id) return false;
    if (deptFilter && e.department !== deptFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        e.extension?.includes(s) ||
        e.caller_id_name?.toLowerCase().includes(s) ||
        e.department?.toLowerCase().includes(s) ||
        e.employee_name?.toLowerCase().includes(s) ||
        e.email?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">📞 نظام الهاتف (VoIP)</h1>
        <p className="text-gray-600">إدارة الأرقام الداخلية - Grandstream UCM</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg p-5 text-white">
            <div className="text-sm opacity-90">إجمالي الإكستنشنات</div>
            <div className="text-3xl font-bold mt-2">{stats.total || 0}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-5 text-white">
            <div className="text-sm opacity-90">نشط</div>
            <div className="text-3xl font-bold mt-2">{stats.active || 0}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-lg p-5 text-white">
            <div className="text-sm opacity-90">مرتبط بموظف</div>
            <div className="text-3xl font-bold mt-2">{stats.linked || 0}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-5 text-white">
            <div className="text-sm opacity-90">غير مرتبط</div>
            <div className="text-3xl font-bold mt-2">{stats.unlinked || 0}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-5 text-white">
            <div className="text-sm opacity-90">الأقسام</div>
            <div className="text-3xl font-bold mt-2">{stats.departments || 0}</div>
          </motion.div>
        </div>
      )}

      {/* Last Sync */}
      {stats?.last_sync_at && (
        <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
          stats.last_sync_status === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
          stats.last_sync_status === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
          'bg-yellow-50 text-yellow-700 border border-yellow-200'
        }`}>
          <span>{stats.last_sync_status === 'success' ? '✅' : stats.last_sync_status === 'error' ? '❌' : '⚠️'}</span>
          <span>آخر مزامنة: {new Date(stats.last_sync_at).toLocaleString('ar-EG')}</span>
          {stats.last_sync_message && <span>— {stats.last_sync_message}</span>}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالرقم أو الاسم..."
            className="px-3 py-2 border rounded-lg text-sm w-48" />
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-gray-50">
            <option value="all">الكل ({extensions.length})</option>
            <option value="active">نشط ({extensions.filter(e => e.status === 'active').length})</option>
            <option value="inactive">غير نشط ({extensions.filter(e => e.status === 'inactive').length})</option>
            <option value="linked">مرتبط ({extensions.filter(e => e.employee_id).length})</option>
            <option value="unlinked">غير مرتبط ({extensions.filter(e => !e.employee_id).length})</option>
          </select>
          {departments.length > 0 && (
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-gray-50">
              <option value="">كل الأقسام</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openSyncLogs}
            className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50 text-sm">
            📋 السجل
          </button>
          <button onClick={openConfigModal}
            className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50 text-sm">
            ⚙️ إعدادات PBX
          </button>
          <button onClick={handleSync} disabled={syncing}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm flex items-center gap-2">
            {syncing ? <span className="animate-spin">⏳</span> : '🔄'} مزامنة الإكستنشنات
          </button>
        </div>
      </div>

      {/* Extensions Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-right font-medium">الرقم</th>
                <th className="px-4 py-3 text-right font-medium">الاسم</th>
                <th className="px-4 py-3 text-right font-medium">القسم</th>
                <th className="px-4 py-3 text-right font-medium">البريد</th>
                <th className="px-4 py-3 text-right font-medium">الموظف المرتبط</th>
                <th className="px-4 py-3 text-right font-medium">الحالة</th>
                <th className="px-4 py-3 text-right font-medium">النوع</th>
                <th className="px-4 py-3 text-center font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredExtensions.map((ext) => (
                <tr key={ext.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-indigo-600 text-base">{ext.extension}</span>
                  </td>
                  <td className="px-4 py-3 font-medium">{ext.caller_id_name || '-'}</td>
                  <td className="px-4 py-3">
                    {ext.department ? (
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">{ext.department}</span>
                    ) : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500" dir="ltr">{ext.email || '-'}</td>
                  <td className="px-4 py-3">
                    {ext.employee_name ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <span className="text-xs">✓</span> {ext.employee_name}
                      </span>
                    ) : (
                      <span className="text-gray-400">غير مرتبط</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      ext.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {ext.status === 'active' ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{ext.account_type}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => { setSelectedExt(ext); setShowLinkModal(true); }}
                        className="text-indigo-600 hover:text-indigo-800 text-xs px-2 py-1 rounded hover:bg-indigo-50"
                        title="ربط بموظف">
                        🔗
                      </button>
                      <button onClick={() => handleDelete(ext.id)}
                        className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded hover:bg-red-50"
                        title="حذف">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredExtensions.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-4">📞</div>
            <p>لا توجد إكستنشنات</p>
            <p className="text-sm mt-2">اضغط "إعدادات PBX" لربط الـ Grandstream ثم "مزامنة"</p>
          </div>
        )}
      </div>

      {/* ─── Config Modal ─── */}
      <AnimatePresence>
        {showConfigModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-xl">📞</div>
                <div>
                  <h2 className="text-xl font-bold">إعدادات PBX (Grandstream UCM)</h2>
                  <p className="text-sm text-gray-500">ربط السيستم بجهاز الـ Grandstream لسحب الإكستنشنات</p>
                </div>
              </div>

              <form onSubmit={handleSaveConfig} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">عنوان الـ PBX *</label>
                    <input type="text" required value={config.server_url}
                      onChange={(e) => setConfig({...config, server_url: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg" dir="ltr"
                      placeholder="10.1.2.254" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">البورت</label>
                    <input type="number" value={config.port}
                      onChange={(e) => setConfig({...config, port: parseInt(e.target.value) || 8089})}
                      className="w-full px-3 py-2 border rounded-lg" dir="ltr" />
                    <p className="text-xs text-gray-400 mt-1">عادةً 8089 لـ HTTPS أو 80 لـ HTTP</p>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer pb-2">
                      <input type="checkbox" checked={config.use_ssl}
                        onChange={(e) => setConfig({...config, use_ssl: e.target.checked})}
                        className="w-4 h-4" />
                      <span className="text-sm">استخدام SSL (HTTPS)</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">اسم المستخدم *</label>
                    <input type="text" required value={config.username}
                      onChange={(e) => setConfig({...config, username: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg" dir="ltr"
                      placeholder="admin" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">كلمة المرور *</label>
                    <input type="password" required value={config.password}
                      onChange={(e) => setConfig({...config, password: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg" dir="ltr"
                      placeholder="كلمة مرور UCM" />
                  </div>
                </div>

                <div className="bg-indigo-50 p-3 rounded-lg text-sm text-indigo-700 border border-indigo-200">
                  <p className="font-medium mb-1">💡 ملاحظات:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>استخدم بيانات دخول واجهة الويب الخاصة بالـ UCM</li>
                    <li>البورت الافتراضي للـ HTTPS هو 8089</li>
                    <li>تأكد أن الـ API مفعل في إعدادات الـ UCM</li>
                  </ul>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <button type="button" onClick={handleTestConnection} disabled={testingConnection}
                    className="px-4 py-2 border border-indigo-500 text-indigo-600 rounded-lg hover:bg-indigo-50 disabled:opacity-50 flex items-center gap-2 text-sm">
                    {testingConnection ? <span className="animate-spin">⏳</span> : '🔌'} اختبار الاتصال
                  </button>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowConfigModal(false)}
                      className="px-6 py-2 border rounded-lg">إلغاء</button>
                    <button type="submit"
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">💾 حفظ</button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Link Employee Modal ─── */}
      <AnimatePresence>
        {showLinkModal && selectedExt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-2">🔗 ربط إكستنشن بموظف</h2>
              <p className="text-gray-500 text-sm mb-4">
                إكستنشن: <span className="font-mono font-bold text-indigo-600">{selectedExt.extension}</span>
                {selectedExt.caller_id_name && ` — ${selectedExt.caller_id_name}`}
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">اختر الموظف</label>
                <select
                  defaultValue={selectedExt.employee_id || ''}
                  id="linkEmployeeSelect"
                  className="w-full px-3 py-2 border rounded-lg">
                  <option value="">— بدون ربط —</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name || emp.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2 border rounded-lg">إلغاء</button>
                <button onClick={() => {
                  const val = document.getElementById('linkEmployeeSelect').value;
                  handleLinkEmployee(selectedExt.id, val || null);
                }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  حفظ الربط
                </button>
              </div>
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
              <h2 className="text-xl font-bold mb-4">📋 سجل مزامنة VoIP</h2>
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
                            {log.status === 'success' ? '✅' : log.status === 'error' ? '❌' : '⚠️'}
                            {' '}{log.message}
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

export default VoIP;
