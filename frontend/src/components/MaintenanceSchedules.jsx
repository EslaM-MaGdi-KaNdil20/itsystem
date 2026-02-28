import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const API_URL = `${window.location.protocol}//${window.location.hostname}:3000/api`;
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const dueBadge = (days) => {
  if (days < 0) return { text: `متأخر ${Math.abs(days)} يوم`, cls: 'bg-red-100 text-red-700' };
  if (days === 0) return { text: 'اليوم', cls: 'bg-red-100 text-red-700' };
  if (days <= 7) return { text: `${days} أيام`, cls: 'bg-orange-100 text-orange-700' };
  if (days <= 30) return { text: `${days} يوم`, cls: 'bg-yellow-100 text-yellow-700' };
  return { text: `${days} يوم`, cls: 'bg-emerald-100 text-emerald-700' };
};

export default function MaintenanceSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [doneItem, setDoneItem] = useState(null);
  const [devices, setDevices] = useState([]);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchAll();
    fetchDevices();
    fetchUsers();
  }, []);

  const fetchAll = async () => {
    try {
      const res = await fetch(`${API_URL}/maintenance-schedules`, { headers: authHeaders() });
      const data = await res.json();
      setSchedules(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('خطأ في تحميل جداول الصيانة');
    } finally {
      setLoading(false);
    }
  };

  const fetchDevices = async () => {
    try {
      const res = await fetch(`${API_URL}/devices`, { headers: authHeaders() });
      const data = await res.json();
      setDevices(Array.isArray(data) ? data : (data.devices || []));
    } catch (_) {}
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/tasks/users`, { headers: authHeaders() });
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (_) {}
  };

  const handleDelete = async (id) => {
    if (!confirm('هل تريد حذف هذا الجدول؟')) return;
    try {
      await fetch(`${API_URL}/maintenance-schedules/${id}`, { method: 'DELETE', headers: authHeaders() });
      toast.success('تم الحذف');
      fetchAll();
    } catch (_) { toast.error('خطأ في الحذف'); }
  };

  const handleMarkDone = async (id, formData) => {
    try {
      const res = await fetch(`${API_URL}/maintenance-schedules/${id}/mark-done`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error();
      toast.success('تم تسجيل الصيانة وتحديث الموعد القادم');
      setDoneItem(null);
      fetchAll();
    } catch (_) { toast.error('خطأ في التسجيل'); }
  };

  const filtered = schedules.filter(s => {
    if (filter === 'overdue') return s.days_until_due < 0;
    if (filter === 'soon') return s.days_until_due >= 0 && s.days_until_due <= 14;
    if (filter === 'inactive') return !s.is_active;
    return s.is_active;
  });

  const overdueCount = schedules.filter(s => s.days_until_due < 0).length;
  const soonCount = schedules.filter(s => s.days_until_due >= 0 && s.days_until_due <= 14).length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">الصيانة الدورية</h1>
          <p className="text-gray-500 mt-1">جداول الصيانة المنتظمة للأجهزة مع تنبيهات وتتبع تلقائي</p>
        </div>
        <button
          onClick={() => { setEditItem(null); setShowModal(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl font-semibold hover:bg-indigo-700 transition"
        >
          + جدول صيانة جديد
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: 'الكل', count: schedules.filter(s => s.is_active).length },
          { key: 'overdue', label: 'متأخرة', count: overdueCount, danger: true },
          { key: 'soon', label: 'قريبًا (14 يوم)', count: soonCount, warn: true },
          { key: 'inactive', label: 'غير نشطة', count: schedules.filter(s => !s.is_active).length },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              filter === f.key
                ? 'bg-indigo-600 text-white'
                : f.danger && f.count > 0 ? 'bg-red-50 text-red-700 hover:bg-red-100'
                : f.warn && f.count > 0 ? 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              filter === f.key ? 'bg-white/30 text-white' : 'bg-white text-gray-700'
            }`}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100">
          <div className="text-5xl mb-3">🔧</div>
          <p className="text-gray-400 font-medium">لا توجد جداول في هذه الفئة</p>
          <button
            onClick={() => { setEditItem(null); setShowModal(true); }}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold"
          >
            إضافة جدول صيانة
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-right py-4 px-5 font-semibold text-gray-500">الجهاز</th>
                <th className="text-right py-4 px-5 font-semibold text-gray-500">العنوان</th>
                <th className="text-right py-4 px-5 font-semibold text-gray-500">الفترة</th>
                <th className="text-right py-4 px-5 font-semibold text-gray-500">آخر صيانة</th>
                <th className="text-right py-4 px-5 font-semibold text-gray-500">الموعد القادم</th>
                <th className="text-right py-4 px-5 font-semibold text-gray-500">المسؤول</th>
                <th className="text-right py-4 px-5 font-semibold text-gray-500">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => {
                const badge = dueBadge(s.days_until_due);
                return (
                  <tr key={s.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                    <td className="py-4 px-5">
                      <div className="font-semibold text-gray-800">{s.device_name}</div>
                      <div className="text-xs text-gray-400">{s.asset_tag} · {s.device_type}</div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="font-medium text-gray-700">{s.title}</div>
                      {s.description && <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{s.description}</div>}
                    </td>
                    <td className="py-4 px-5">
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg text-xs font-semibold">
                        كل {s.interval_days} يوم
                      </span>
                    </td>
                    <td className="py-4 px-5 text-gray-500 text-xs">
                      {s.last_done ? new Date(s.last_done).toLocaleDateString('ar-EG') : '—'}
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex flex-col gap-1">
                        <span className="text-gray-700 text-xs">{new Date(s.next_due).toLocaleDateString('ar-EG')}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold w-fit ${badge.cls}`}>{badge.text}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-gray-500 text-xs">
                      {s.assigned_to_name || '—'}
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => setDoneItem(s)}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold hover:bg-emerald-100 transition"
                        >
                          ✅ تنجز
                        </button>
                        <button
                          onClick={() => { setEditItem(s); setShowModal(true); }}
                          className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-semibold hover:bg-indigo-100 transition"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-xs font-semibold hover:bg-red-100 transition"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <ScheduleModal
            item={editItem}
            devices={devices}
            users={users}
            onClose={() => setShowModal(false)}
            onSave={() => { setShowModal(false); fetchAll(); }}
          />
        )}
      </AnimatePresence>

      {/* Mark Done Modal */}
      <AnimatePresence>
        {doneItem && (
          <MarkDoneModal
            item={doneItem}
            onClose={() => setDoneItem(null)}
            onSave={(formData) => handleMarkDone(doneItem.id, formData)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Schedule Create/Edit Modal ────────────────────────────────────────────────
function ScheduleModal({ item, devices, users, onClose, onSave }) {
  const isEdit = !!item;
  const [form, setForm] = useState({
    device_id: item?.device_id || '',
    title: item?.title || '',
    description: item?.description || '',
    interval_days: item?.interval_days || 90,
    next_due: item?.next_due?.split('T')[0] || '',
    assigned_to: item?.assigned_to || '',
    auto_create_task: item?.auto_create_task !== false,
    notify_days_before: item?.notify_days_before || 7,
    is_active: item?.is_active !== false,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = isEdit
        ? `${API_URL}/maintenance-schedules/${item.id}`
        : `${API_URL}/maintenance-schedules`;
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify({ ...form, device_id: parseInt(form.device_id) || undefined, assigned_to: form.assigned_to || null }),
      });
      if (!res.ok) throw new Error();
      toast.success(isEdit ? 'تم التعديل' : 'تم الإضافة');
      onSave();
    } catch (_) {
      toast.error('حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {isEdit ? 'تعديل جدول الصيانة' : 'جدول صيانة جديد'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">الجهاز *</label>
            <select
              required
              value={form.device_id}
              onChange={e => setForm(f => ({ ...f, device_id: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">اختر الجهاز...</option>
              {devices.map(d => (
                <option key={d.id} value={d.id}>{d.brand} {d.model} — {d.asset_tag}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">العنوان *</label>
            <input
              required
              type="text"
              placeholder="مثال: صيانة دورية ربع سنوية"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">وصف</label>
            <textarea
              rows={2}
              placeholder="تفاصيل الصيانة المطلوبة..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">فترة الصيانة (أيام) *</label>
              <input
                required
                type="number"
                min={1}
                value={form.interval_days}
                onChange={e => setForm(f => ({ ...f, interval_days: parseInt(e.target.value) }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">الموعد القادم *</label>
              <input
                required
                type="date"
                value={form.next_due}
                onChange={e => setForm(f => ({ ...f, next_due: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">المسؤول</label>
              <select
                value={form.assigned_to}
                onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">غير محدد</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">تنبيه قبل (أيام)</label>
              <input
                type="number"
                min={1}
                value={form.notify_days_before}
                onChange={e => setForm(f => ({ ...f, notify_days_before: parseInt(e.target.value) }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4">
            <label className="text-sm font-semibold text-gray-700">إنشاء مهمة تلقائياً قبل الموعد</label>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, auto_create_task: !f.auto_create_task }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${form.auto_create_task ? 'bg-indigo-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.auto_create_task ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-indigo-600 text-white py-3 rounded-2xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {saving ? 'جاري الحفظ...' : isEdit ? 'حفظ التعديلات' : 'إضافة الجدول'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-2xl font-semibold hover:bg-gray-200 transition"
            >
              إلغاء
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Mark Done Modal ───────────────────────────────────────────────────────────
function MarkDoneModal({ item, onClose, onSave }) {
  const [form, setForm] = useState({
    done_date: new Date().toISOString().split('T')[0],
    notes: '',
    create_maintenance_record: true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-gray-900 mb-2">تسجيل إتمام الصيانة</h2>
        <p className="text-gray-500 text-sm mb-6">
          {item.device_name} — {item.title}
          <br />
          <span className="text-indigo-600 font-semibold">
            الموعد القادم سيُحسَب تلقائياً: بعد {item.interval_days} يوم
          </span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">تاريخ الإتمام</label>
            <input
              type="date"
              value={form.done_date}
              onChange={e => setForm(f => ({ ...f, done_date: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">ملاحظات</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="تفاصيل ما تم..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4">
            <label className="text-sm font-semibold text-gray-700">إضافة لسجل الصيانة</label>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, create_maintenance_record: !f.create_maintenance_record }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${form.create_maintenance_record ? 'bg-indigo-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.create_maintenance_record ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 bg-emerald-600 text-white py-3 rounded-2xl font-semibold hover:bg-emerald-700 transition"
            >
              ✅ تأكيد الإتمام
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-2xl font-semibold hover:bg-gray-200 transition"
            >
              إلغاء
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
