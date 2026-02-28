import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const API_URL = `${window.location.protocol}//${window.location.hostname}:3000/api`;

const statusColors = {
  active: 'bg-emerald-100 text-emerald-700',
  maintenance: 'bg-amber-100 text-amber-700',
  retired: 'bg-gray-100 text-gray-600',
  todo: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  review: 'bg-amber-100 text-amber-700',
  done: 'bg-emerald-100 text-emerald-700',
  open: 'bg-red-100 text-red-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-gray-100 text-gray-600',
  low: 'bg-sky-100 text-sky-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const statusLabels = {
  active: 'نشط', maintenance: 'صيانة', retired: 'متقاعد',
  todo: 'للتنفيذ', in_progress: 'قيد العمل', review: 'مراجعة', done: 'منجز',
  open: 'مفتوحة', resolved: 'محلولة', closed: 'مغلقة',
  low: 'منخفضة', medium: 'متوسطة', high: 'عالية', urgent: 'عاجلة',
};

export default function EmployeeProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('devices');

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/employees/${id}/profile`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setProfile(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
    </div>
  );

  if (!profile?.employee) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <p className="text-gray-500 text-lg">الموظف غير موجود</p>
      <button onClick={() => navigate('/employees')} className="px-4 py-2 bg-indigo-600 text-white rounded-xl">
        العودة للموظفين
      </button>
    </div>
  );

  const emp = profile.employee;
  const initials = emp.full_name?.split(' ').slice(0, 2).map(w => w[0]).join('') || '?';

  const currentDevices = profile.devices.filter(d => d.is_current);
  const historyDevices = profile.devices.filter(d => !d.is_current);

  const tabs = [
    { key: 'devices', label: 'الأجهزة', count: profile.devices.length },
    { key: 'tasks', label: 'المهام', count: profile.tasks.length },
    { key: 'tickets', label: 'التذاكر', count: profile.tickets.length },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6" dir="rtl">
      {/* Back */}
      <button
        onClick={() => navigate('/employees')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-medium"
      >
        ← العودة لقائمة الموظفين
      </button>

      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 text-white shadow-xl"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-4xl font-bold text-white ring-4 ring-white/30 shrink-0">
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-extrabold mb-1">{emp.full_name}</h1>
            <p className="text-indigo-200 text-lg mb-3">{emp.job_title || '—'}</p>
            <div className="flex flex-wrap gap-3 text-sm">
              {emp.department_name && (
                <span className="bg-white/15 px-3 py-1 rounded-full flex items-center gap-1">
                  🏢 {emp.department_name}
                </span>
              )}
              {emp.employee_code && (
                <span className="bg-white/15 px-3 py-1 rounded-full">
                  #{emp.employee_code}
                </span>
              )}
              {emp.email && (
                <span className="bg-white/15 px-3 py-1 rounded-full flex items-center gap-1">
                  ✉️ {emp.email}
                </span>
              )}
              {emp.phone && (
                <span className="bg-white/15 px-3 py-1 rounded-full flex items-center gap-1">
                  📞 {emp.phone}
                </span>
              )}
              {emp.extension && (
                <span className="bg-white/15 px-3 py-1 rounded-full">
                  تحويلة: {emp.extension}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 text-sm shrink-0">
            <div className="bg-white/15 rounded-2xl p-4 text-center">
              <div className="text-3xl font-bold">{currentDevices.length}</div>
              <div className="text-indigo-200 text-xs mt-1">جهاز حالي</div>
            </div>
            <div className="bg-white/15 rounded-2xl p-4 text-center">
              <div className="text-3xl font-bold">{profile.maintenance_count}</div>
              <div className="text-indigo-200 text-xs mt-1">صيانة</div>
            </div>
          </div>
        </div>

        {/* Extra Info Row */}
        <div className="mt-6 pt-6 border-t border-white/20 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-indigo-300 mb-1 text-xs uppercase tracking-wider">تاريخ التوظيف</div>
            <div className="font-semibold">{emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('ar-EG') : '—'}</div>
          </div>
          <div>
            <div className="text-indigo-300 mb-1 text-xs uppercase tracking-wider">الحالة</div>
            <div className="font-semibold">{emp.is_active ? '✅ نشط' : '❌ غير نشط'}</div>
          </div>
          <div>
            <div className="text-indigo-300 mb-1 text-xs uppercase tracking-wider">إجمالي أجهزة (تاريخي)</div>
            <div className="font-semibold">{profile.devices.length}</div>
          </div>
          <div>
            <div className="text-indigo-300 mb-1 text-xs uppercase tracking-wider">ملاحظات</div>
            <div className="font-semibold truncate">{emp.notes || '—'}</div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                activeTab === tab.key
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                activeTab === tab.key ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* -- Devices Tab -- */}
          {activeTab === 'devices' && (
            <div className="space-y-6">
              {/* Current */}
              {currentDevices.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">الأجهزة الحالية</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentDevices.map(d => <DeviceCard key={d.assignment_id} device={d} onNavigate={() => navigate(`/devices`)} />)}
                  </div>
                </div>
              )}

              {/* History */}
              {historyDevices.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">تاريخ الأجهزة</h4>
                  <div className="space-y-2">
                    {historyDevices.map(d => (
                      <div key={d.assignment_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl text-sm opacity-70">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-gray-700">{d.brand} {d.model}</span>
                          <span className="text-gray-400">{d.asset_tag}</span>
                        </div>
                        <span className="text-gray-400 text-xs">
                          {new Date(d.assigned_date).toLocaleDateString('ar-EG')} → {d.returned_date ? new Date(d.returned_date).toLocaleDateString('ar-EG') : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {profile.devices.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-5xl mb-3">💻</div>
                  <p>لا توجد أجهزة مسلمة لهذا الموظف</p>
                </div>
              )}
            </div>
          )}

          {/* -- Tasks Tab -- */}
          {activeTab === 'tasks' && (
            <div className="space-y-2">
              {profile.tasks.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-5xl mb-3">✅</div>
                  <p>لا توجد مهام مرتبطة بهذا الموظف</p>
                </div>
              ) : profile.tasks.map(t => (
                <div key={t.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 truncate">{t.title}</div>
                    {t.due_date && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        موعد: {new Date(t.due_date).toLocaleDateString('ar-EG')}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusColors[t.priority] || ''}`}>
                      {statusLabels[t.priority] || t.priority}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusColors[t.status] || ''}`}>
                      {statusLabels[t.status] || t.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* -- Tickets Tab -- */}
          {activeTab === 'tickets' && (
            <div className="space-y-2">
              {profile.tickets.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-5xl mb-3">🎫</div>
                  <p>لا توجد تذاكر دعم لهذا الموظف</p>
                </div>
              ) : profile.tickets.map(t => (
                <div key={t.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 truncate">{t.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(t.created_at).toLocaleDateString('ar-EG')} · {t.category || ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {t.priority && (
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusColors[t.priority] || ''}`}>
                        {statusLabels[t.priority] || t.priority}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusColors[t.status] || 'bg-gray-100 text-gray-600'}`}>
                      {statusLabels[t.status] || t.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Device Card ──
function DeviceCard({ device: d, onNavigate }) {
  return (
    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-indigo-200 transition-colors cursor-pointer" onClick={onNavigate}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-bold text-gray-900">{d.brand} {d.model}</div>
          <div className="text-xs text-gray-400 mt-0.5">{d.device_type} · {d.asset_tag}</div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-bold ${
          d.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
          d.status === 'maintenance' ? 'bg-amber-100 text-amber-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          {d.status === 'active' ? 'نشط' : d.status === 'maintenance' ? 'صيانة' : d.status}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
        {d.serial_number && <div><span className="text-gray-400">Serial:</span> {d.serial_number}</div>}
        {d.os && <div><span className="text-gray-400">OS:</span> {d.os}</div>}
        {d.windows_username && <div><span className="text-gray-400">Windows:</span> {d.windows_username}</div>}
        {d.assigned_date && (
          <div><span className="text-gray-400">تسليم:</span> {new Date(d.assigned_date).toLocaleDateString('ar-EG')}</div>
        )}
      </div>
    </div>
  );
}
