import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';

// ─── Tab Buttons ───
const tabs = [
  { id: 'devices', label: 'الأجهزة', icon: '🖥️' },
  { id: 'mappings', label: 'ربط المستخدمين', icon: '🔗' },
  { id: 'logs', label: 'سجلات الحضور', icon: '📋' },
  { id: 'report', label: 'التقرير اليومي', icon: '📊' },
];

export default function Attendance() {
  const [activeTab, setActiveTab] = useState('devices');

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">الحضور والانصراف</h1>
          <p className="text-slate-500 text-sm mt-1">إدارة أجهزة البصمة وسجلات الحضور</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1 flex gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="ml-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          {activeTab === 'devices' && <DevicesTab />}
          {activeTab === 'mappings' && <MappingsTab />}
          {activeTab === 'logs' && <LogsTab />}
          {activeTab === 'report' && <ReportTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  DEVICES TAB
// ═══════════════════════════════════════════════════════════════
function DevicesTab() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', ip_address: '', port: 4370 });
  const [editId, setEditId] = useState(null);
  const [testing, setTesting] = useState(null);
  const [syncing, setSyncing] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState(null);

  useEffect(() => { fetchDevices(); }, []);

  const fetchDevices = async () => {
    try {
      const data = await apiGet('/attendance/devices');
      setDevices(data);
    } catch (err) { toast.error(err.message); }
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      if (editId) {
        await apiPut(`/attendance/devices/${editId}`, form);
        toast.success('تم تحديث الجهاز');
      } else {
        await apiPost('/attendance/devices', form);
        toast.success('تم إضافة الجهاز');
      }
      setShowModal(false);
      setForm({ name: '', ip_address: '', port: 4370 });
      setEditId(null);
      fetchDevices();
    } catch (err) { toast.error(err.message); }
  };

  const openDeleteModal = (device) => { setDeviceToDelete(device); setShowDeleteModal(true); };

  const confirmDelete = async () => {
    try {
      await apiDelete(`/attendance/devices/${deviceToDelete.id}`);
      toast.success('تم حذف الجهاز');
      setShowDeleteModal(false);
      setDeviceToDelete(null);
      fetchDevices();
    } catch (err) { toast.error(err.message); }
  };

  const testConnection = async (device) => {
    setTesting(device.id);
    try {
      const result = await apiPost('/attendance/devices/test', { ip_address: device.ip_address, port: device.port });
      toast.success(`${result.message}\nمستخدمين: ${result.info?.userCount || 0} | سجلات: ${result.info?.logCount || 0}`);
    } catch (err) { toast.error(err.message); }
    setTesting(null);
  };

  const syncUsers = async (device) => {
    setSyncing(device.id);
    try {
      const result = await apiPost(`/attendance/devices/${device.id}/sync-users`);
      toast.success(result.message);
      fetchDevices();
    } catch (err) { toast.error(err.message); }
    setSyncing(null);
  };

  const syncAttendance = async (device) => {
    setSyncing(device.id);
    try {
      const result = await apiPost(`/attendance/devices/${device.id}/sync-attendance`);
      toast.success(result.message);
      fetchDevices();
    } catch (err) { toast.error(err.message); }
    setSyncing(null);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-700">أجهزة البصمة المتصلة</h2>
        <button onClick={() => { setForm({ name: '', ip_address: '', port: 4370 }); setEditId(null); setShowModal(true); }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          إضافة جهاز
        </button>
      </div>

      {devices.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="text-5xl mb-3">🖥️</div>
          <p className="text-slate-500 font-medium">لا توجد أجهزة بصمة مضافة</p>
          <p className="text-slate-400 text-sm mt-1">أضف جهاز ZKTeco للبدء في تسجيل الحضور</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map(device => (
            <div key={device.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${device.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{device.name}</h3>
                    <p className="text-xs text-slate-500 font-mono">{device.ip_address}:{device.port}</p>
                  </div>
                </div>
                <div className={`px-2 py-0.5 rounded-full text-xs font-semibold ${device.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {device.is_active ? 'نشط' : 'معطل'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                <div className="bg-slate-50 rounded-lg p-2 text-center">
                  <div className="text-slate-400 mb-0.5">المستخدمين</div>
                  <div className="font-bold text-slate-700">{device.total_users || 0}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-2 text-center">
                  <div className="text-slate-400 mb-0.5">آخر مزامنة</div>
                  <div className="font-bold text-slate-700">{device.last_sync_at ? new Date(device.last_sync_at).toLocaleDateString('ar-EG') : '—'}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => testConnection(device)} disabled={testing === device.id}
                  className="flex-1 px-2 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition disabled:opacity-50">
                  {testing === device.id ? '⏳ جاري...' : '🔌 اختبار'}
                </button>
                <button onClick={() => syncUsers(device)} disabled={syncing === device.id}
                  className="flex-1 px-2 py-1.5 bg-violet-50 text-violet-600 rounded-lg text-xs font-medium hover:bg-violet-100 transition disabled:opacity-50">
                  {syncing === device.id ? '⏳' : '👥'} مستخدمين
                </button>
                <button onClick={() => syncAttendance(device)} disabled={syncing === device.id}
                  className="flex-1 px-2 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-medium hover:bg-emerald-100 transition disabled:opacity-50">
                  {syncing === device.id ? '⏳' : '📋'} حضور
                </button>
                <button onClick={() => { setForm({ name: device.name, ip_address: device.ip_address, port: device.port, is_active: device.is_active }); setEditId(device.id); setShowModal(true); }}
                  className="px-2 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-xs font-medium hover:bg-amber-100 transition">
                  ✏️
                </button>
                <button onClick={() => openDeleteModal(device)}
                  className="px-2 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-medium hover:bg-rose-100 transition">
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Device Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-slate-800 mb-4">{editId ? 'تعديل جهاز' : 'إضافة جهاز بصمة'}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">اسم الجهاز</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    placeholder="مثال: بصمة الدور الأول" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">عنوان IP</label>
                  <input value={form.ip_address} onChange={e => setForm({ ...form, ip_address: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono" dir="ltr"
                    placeholder="192.168.1.100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">المنفذ (Port)</label>
                  <input type="number" value={form.port} onChange={e => setForm({ ...form, port: parseInt(e.target.value) || 4370 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono" dir="ltr" />
                </div>
                {editId && (
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="is_active" checked={form.is_active !== false} onChange={e => setForm({ ...form, is_active: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <label htmlFor="is_active" className="text-sm text-slate-600">الجهاز نشط</label>
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={handleSave} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium">
                  {editId ? 'حفظ التعديلات' : 'إضافة'}
                </button>
                <button onClick={() => setShowModal(false)} className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition text-sm font-medium">
                  إلغاء
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
              <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.694-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">تأكيد الحذف</h3>
              <p className="text-slate-500 text-sm mb-6">هل تريد حذف الجهاز <strong>{deviceToDelete?.name}</strong>؟ سيتم حذف جميع السجلات المرتبطة.</p>
              <div className="flex gap-3">
                <button onClick={confirmDelete} className="flex-1 py-2.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition text-sm font-medium">نعم، احذف</button>
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition text-sm font-medium">إلغاء</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAPPINGS TAB
// ═══════════════════════════════════════════════════════════════
function MappingsTab() {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [mappings, setMappings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => { fetchInit(); }, []);

  const fetchInit = async () => {
    try {
      const [devs, emps] = await Promise.all([
        apiGet('/attendance/devices'),
        apiGet('/employees')
      ]);
      setDevices(devs);
      setEmployees(emps);
      if (devs.length > 0) {
        setSelectedDevice(devs[0].id);
        await fetchMappings(devs[0].id);
      }
    } catch (err) { toast.error(err.message); }
    setLoading(false);
  };

  const fetchMappings = async (deviceId) => {
    try {
      const data = await apiGet(`/attendance/devices/${deviceId}/mappings`);
      setMappings(data);
    } catch (err) { toast.error(err.message); }
  };

  const handleDeviceChange = async (deviceId) => {
    setSelectedDevice(deviceId);
    setLoading(true);
    await fetchMappings(deviceId);
    setLoading(false);
  };

  const handleMapUser = async (mappingId, employeeId) => {
    try {
      await apiPut(`/attendance/mappings/${mappingId}`, { employee_id: employeeId });
      toast.success('تم ربط المستخدم بالموظف وتحديث كود الموظف');
      fetchMappings(selectedDevice);
      // Refresh employees list to get updated codes
      const emps = await apiGet('/employees');
      setEmployees(emps);
    } catch (err) { toast.error(err.message); }
  };

  const handleBulkSyncCodes = async () => {
    setSyncing(true);
    try {
      const result = await apiPost('/attendance/bulk-sync-codes');
      toast.success(result.message);
      fetchMappings(selectedDevice);
      const emps = await apiGet('/employees');
      setEmployees(emps);
    } catch (err) { toast.error(err.message); }
    setSyncing(false);
  };

  const filteredMappings = mappings.filter(m =>
    (m.zk_user_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.zk_user_id || '').includes(search) ||
    (m.employee_name || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <h2 className="text-lg font-bold text-slate-700">ربط مستخدمي البصمة بالموظفين</h2>
        <div className="flex gap-3 flex-wrap">
          <button onClick={handleBulkSyncCodes} disabled={syncing}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium flex items-center gap-2 disabled:opacity-50">
            {syncing ? '⏳ جاري...' : '🔄 مزامنة الأكواد'}
          </button>
          <select value={selectedDevice || ''} onChange={e => handleDeviceChange(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..."
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 w-48" />
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-start gap-3">
        <span className="text-lg">💡</span>
        <div className="text-xs text-indigo-700">
          <strong>ربط تلقائي:</strong> لما تربط موظف بمستخدم بصمة، كود الموظف في صفحة الموظفين هيتحدث تلقائياً لرقم ID البصمة. 
          اضغط <strong>"مزامنة الأكواد"</strong> لتحديث كل الأكواد دفعة واحدة.
        </div>
      </div>

      {mappings.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="text-5xl mb-3">🔗</div>
          <p className="text-slate-500 font-medium">لا يوجد مستخدمين</p>
          <p className="text-slate-400 text-sm mt-1">اسحب المستخدمين من الجهاز أولاً من تبويب "الأجهزة"</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">ID بصمة</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">الاسم بالبصمة</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">الموظف المرتبط</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">كود الموظف</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">الحالة</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">ربط</th>
                </tr>
              </thead>
              <tbody>
                {filteredMappings.map(m => (
                  <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono text-slate-700 font-bold">{m.zk_user_id}</td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{m.zk_user_name || '—'}</td>
                    <td className="px-4 py-3">
                      {m.employee_name ? (
                        <div>
                          <span className="font-medium text-slate-700">{m.employee_name}</span>
                          {m.department_name && <span className="text-xs text-slate-400 mr-2">({m.department_name})</span>}
                        </div>
                      ) : (
                        <span className="text-slate-400">غير مرتبط</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {m.employee_code ? (
                        <span className={`px-2 py-0.5 rounded font-mono text-xs font-bold ${m.employee_code === m.zk_user_id ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {m.employee_code}
                          {m.employee_code === m.zk_user_id && ' ✓'}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${m.is_mapped ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {m.is_mapped ? 'مرتبط ✓' : 'غير مرتبط'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={m.employee_id || ''}
                        onChange={e => handleMapUser(m.id, e.target.value)}
                        className="px-2 py-1 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 max-w-[200px]"
                      >
                        <option value="">— اختر موظف —</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.full_name} ({emp.employee_code || emp.id})
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span>إجمالي: {filteredMappings.length} مستخدم</span>
            <span className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                مرتبط: {filteredMappings.filter(m => m.is_mapped).length}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                غير مرتبط: {filteredMappings.filter(m => !m.is_mapped).length}
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  LOGS TAB
// ═══════════════════════════════════════════════════════════════
function LogsTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    employee_id: '',
    device_id: ''
  });
  const [devices, setDevices] = useState([]);
  const [employees, setEmployees] = useState([]);

  useEffect(() => { fetchInit(); }, []);

  const fetchInit = async () => {
    try {
      const [devs, emps] = await Promise.all([
        apiGet('/attendance/devices'),
        apiGet('/employees')
      ]);
      setDevices(devs);
      setEmployees(emps);
      await fetchLogs();
      await fetchStats();
    } catch (err) { toast.error(err.message); }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.date) params.append('date', filters.date);
      if (filters.employee_id) params.append('employee_id', filters.employee_id);
      if (filters.device_id) params.append('device_id', filters.device_id);
      const data = await apiGet(`/attendance/logs?${params.toString()}`);
      setLogs(data);
    } catch (err) { toast.error(err.message); }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const data = await apiGet(`/attendance/stats?date=${filters.date}`);
      setStats(data);
    } catch (err) { /* silent */ }
  };

  const handleFilter = () => {
    fetchLogs();
    fetchStats();
  };

  const punchTypeLabel = (type) => {
    const types = { 0: 'حضور', 1: 'انصراف', 2: 'استراحة', 3: 'عودة', 4: 'عمل إضافي بدء', 5: 'عمل إضافي نهاية' };
    return types[type] || type;
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">{stats.totalEmployees}</div>
            <div className="text-xs text-slate-500 mt-1">إجمالي الموظفين</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{stats.presentToday}</div>
            <div className="text-xs text-slate-500 mt-1">حاضرين اليوم</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <div className="text-2xl font-bold text-rose-600">{stats.absentToday}</div>
            <div className="text-xs text-slate-500 mt-1">غائبين</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <div className="text-2xl font-bold text-violet-600">{stats.totalRecords}</div>
            <div className="text-xs text-slate-500 mt-1">إجمالي السجلات</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-slate-500 mb-1">التاريخ</label>
            <input type="date" value={filters.date} onChange={e => setFilters({ ...filters, date: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">الموظف</label>
            <select value={filters.employee_id} onChange={e => setFilters({ ...filters, employee_id: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 min-w-[180px]">
              <option value="">الكل</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">الجهاز</label>
            <select value={filters.device_id} onChange={e => setFilters({ ...filters, device_id: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 min-w-[150px]">
              <option value="">الكل</option>
              {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <button onClick={handleFilter} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium">
            🔍 بحث
          </button>
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="text-5xl mb-3">📋</div>
          <p className="text-slate-500 font-medium">لا توجد سجلات حضور لهذا اليوم</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">الموظف</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">القسم</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">الوقت</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">النوع</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">الجهاز</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">ID بصمة</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {log.employee_name || <span className="text-slate-400">غير مرتبط ({log.zk_user_id})</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{log.department_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-700 font-mono text-xs" dir="ltr">
                      {new Date(log.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        log.punch_type === 0 ? 'bg-emerald-100 text-emerald-700' :
                        log.punch_type === 1 ? 'bg-rose-100 text-rose-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {punchTypeLabel(log.punch_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{log.device_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{log.zk_user_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
            إجمالي: {logs.length} سجل
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  DAILY REPORT TAB
// ═══════════════════════════════════════════════════════════════
function ReportTab() {
  const [report, setReport] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchReport(); }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await apiGet(`/attendance/daily-report?date=${date}`);
      setReport(data);
    } catch (err) { toast.error(err.message); }
    setLoading(false);
  };

  const formatTime = (ts) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  const formatHours = (hours) => {
    if (!hours || hours < 0) return '—';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}س ${m}د`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <h2 className="text-lg font-bold text-slate-700">التقرير اليومي — أول حضور وآخر انصراف</h2>
        <div className="flex gap-3 items-center">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
          <button onClick={fetchReport} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium">
            عرض التقرير
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
      ) : !report || report.records.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="text-5xl mb-3">📊</div>
          <p className="text-slate-500 font-medium">لا توجد بيانات لهذا اليوم</p>
          <p className="text-slate-400 text-sm mt-1">تأكد من سحب بيانات الحضور من الجهاز</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">#</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">الموظف</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">الكود</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">القسم</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">أول حضور</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">آخر انصراف</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">عدد البصمات</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">ساعات العمل</th>
                </tr>
              </thead>
              <tbody>
                {report.records.map((rec, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{rec.employee_name}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{rec.employee_code || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{rec.department_name || '—'}</td>
                    <td className="px-4 py-3 font-mono text-emerald-600 font-semibold">{formatTime(rec.first_in)}</td>
                    <td className="px-4 py-3 font-mono text-rose-600 font-semibold">{formatTime(rec.last_out)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold">{rec.punch_count}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${parseFloat(rec.hours_worked) >= 8 ? 'text-emerald-600' : parseFloat(rec.hours_worked) >= 6 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {formatHours(parseFloat(rec.hours_worked))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between">
            <span>التاريخ: {new Date(report.date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span>إجمالي الحاضرين: {report.records.length} موظف</span>
          </div>
        </div>
      )}
    </div>
  );
}
