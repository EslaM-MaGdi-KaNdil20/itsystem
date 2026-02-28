import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';

// ─── Constants ────────────────────────────────────────────────────────────────
const LICENSE_TYPES = [
  { id: 'windows',   label: 'Windows',        color: '#0078d4', bg: '#eff6ff' },
  { id: 'office',    label: 'Microsoft Office', color: '#d83b01', bg: '#fff4f0' },
  { id: 'server',    label: 'Server',          color: '#5c2d91', bg: '#f5f0ff' },
  { id: 'antivirus', label: 'Antivirus',       color: '#107c10', bg: '#f0fff0' },
  { id: 'cad',       label: 'CAD / Design',    color: '#ca5010', bg: '#fff3ec' },
  { id: 'erp',       label: 'ERP / نظام',       color: '#0b6a0b', bg: '#f0fdf0' },
  { id: 'other',     label: 'أخرى',            color: '#4a4a4a', bg: '#f5f5f5' },
];

const KEY_TYPES = [
  { id: 'volume',       label: 'Volume License' },
  { id: 'oem',          label: 'OEM' },
  { id: 'subscription', label: 'Subscription' },
  { id: 'perpetual',    label: 'Perpetual' },
];

const typeInfo = (id) => LICENSE_TYPES.find(t => t.id === id) || LICENSE_TYPES[6];

const EMPTY_LICENSE = {
  name: '', vendor: 'Microsoft', version: '', type: 'windows',
  key_type: 'volume', license_key: '', total_quantity: 1,
  purchase_date: '', expiry_date: '', cost_per_unit: '', currency: 'EGP', notes: ''
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const PlusIcon = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const EditIcon = () => <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const TrashIcon = () => <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const AssignIcon = () => <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const KeyIcon = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>;
const XIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const ChevronIcon = ({ open }) => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>;

// ─── Sub-components ───────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color, bg }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
    <div className="w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-xl" style={{ background: bg, color }}>
      {value}
    </div>
    <div>
      <p className="font-bold text-slate-800">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const Badge = ({ type }) => {
  const t = typeInfo(type);
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold border"
      style={{ background: t.bg, color: t.color, borderColor: t.color + '33' }}>
      {t.label}
    </span>
  );
};

const Progress = ({ assigned, total }) => {
  const pct = total > 0 ? Math.min((assigned / total) * 100, 100) : 0;
  const color = pct >= 100 ? '#dc2626' : pct >= 80 ? '#f97316' : '#16a34a';
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>{assigned} مُعين</span>
        <span>{total - assigned} متاح</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: pct + '%', background: color }} />
      </div>
    </div>
  );
};

// ─── Modal wrapper ────────────────────────────────────────────────────────────
const Modal = ({ open, onClose, title, children, wide }) => (
  <AnimatePresence>
    {open && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.45)' }}
      >
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
          className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto`}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
            <h2 className="text-lg font-bold text-slate-800">{title}</h2>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"><XIcon /></button>
          </div>
          <div className="p-6">{children}</div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ─── Field helper ─────────────────────────────────────────────────────────────
const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-xs font-bold text-slate-600 mb-1.5">{label}{required && <span className="text-red-500 mr-1">*</span>}</label>
    {children}
  </div>
);

const Input = (props) => (
  <input {...props} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition" />
);

const Select = ({ children, ...props }) => (
  <select {...props} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white transition">
    {children}
  </select>
);

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function Licenses() {
  const [licenses, setLicenses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  // Modals
  const [licModal, setLicModal] = useState(false);
  const [editingLic, setEditingLic] = useState(null);
  const [form, setForm] = useState(EMPTY_LICENSE);

  const [assignModal, setAssignModal] = useState(false);
  const [assigningLic, setAssigningLic] = useState(null);
  const [assignForm, setAssignForm] = useState({ employee_id: '', device_id: '', license_key: '', assigned_date: new Date().toISOString().split('T')[0], notes: '' });
  const [employees, setEmployees] = useState([]);
  const [devices, setDevices] = useState([]);

  const [saving, setSaving] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const [lics, st] = await Promise.all([
        apiGet('/licenses'),
        apiGet('/licenses/stats'),
      ]);
      setLicenses(lics);
      setStats(st);
    } catch { toast.error('حدث خطأ في جلب البيانات'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Open detail toggle ────────────────────────────────────────────────────
  const toggleExpand = async (id) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
  };

  // ── License CRUD ──────────────────────────────────────────────────────────
  const openAdd = () => { setEditingLic(null); setForm(EMPTY_LICENSE); setLicModal(true); };
  const openEdit = (lic) => { setEditingLic(lic); setForm({ ...lic, purchase_date: lic.purchase_date?.split('T')[0] || '', expiry_date: lic.expiry_date?.split('T')[0] || '', cost_per_unit: lic.cost_per_unit || '' }); setLicModal(true); };

  const saveLicense = async () => {
    if (!form.name.trim() || !form.vendor.trim()) { toast.error('الاسم والمورد مطلوبان'); return; }
    setSaving(true);
    try {
      if (editingLic) { await apiPut(`/licenses/${editingLic.id}`, form); toast.success('تم التعديل'); }
      else { await apiPost('/licenses', form); toast.success('تم الإضافة'); }
      setLicModal(false); load();
    } catch (e) { toast.error(e?.message || 'حدث خطأ'); }
    finally { setSaving(false); }
  };

  const deleteLic = async (id, name) => {
    if (!confirm(`حذف الليسنز "${name}"؟ سيتم حذف جميع التعيينات المرتبطة به.`)) return;
    try { await apiDelete(`/licenses/${id}`); toast.success('تم الحذف'); load(); }
    catch (e) { toast.error(e?.message || 'حدث خطأ'); }
  };

  // ── Assign ────────────────────────────────────────────────────────────────
  const openAssign = async (lic) => {
    setAssigningLic(lic);
    setAssignForm({ employee_id: '', device_id: '', license_key: '', assigned_date: new Date().toISOString().split('T')[0], notes: '' });
    if (!employees.length) {
      try {
        const [emps, devs] = await Promise.all([apiGet('/employees'), apiGet('/devices')]);
        setEmployees(emps);
        setDevices(devs);
      } catch { toast.error('تعذر جلب الموظفين والأجهزة'); }
    }
    setAssignModal(true);
  };

  const saveAssign = async () => {
    if (!assignForm.employee_id && !assignForm.device_id) { toast.error('اختر موظف أو جهاز على الأقل'); return; }
    setSaving(true);
    try {
      await apiPost('/licenses/assignments/assign', { license_id: assigningLic.id, ...assignForm });
      toast.success('تم تعيين الليسنز بنجاح');
      setAssignModal(false);
      load();
      if (expandedId === assigningLic.id) { setExpandedId(null); setTimeout(() => setExpandedId(assigningLic.id), 100); }
    } catch (e) { toast.error(e?.message || 'حدث خطأ'); }
    finally { setSaving(false); }
  };

  const revoke = async (assignId) => {
    if (!confirm('استرداد هذا الليسنز؟')) return;
    try { await apiPut(`/licenses/assignments/${assignId}/revoke`, {}); toast.success('تم الاسترداد'); load(); if (expandedId) { setExpandedId(null); setTimeout(() => setExpandedId(expandedId), 100); } }
    catch { toast.error('حدث خطأ'); }
  };

  // ── Filter ────────────────────────────────────────────────────────────────
  const visible = licenses.filter(l => {
    if (typeFilter && l.type !== typeFilter) return false;
    if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !l.vendor.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ── Expanded detail ───────────────────────────────────────────────────────
  const LicenseDetail = ({ lic }) => {
    const [detail, setDetail] = useState(null);
    useEffect(() => {
      apiGet(`/licenses/${lic.id}`).then(setDetail).catch(() => {});
    }, [lic.id]);

    if (!detail) return <div className="py-6 text-center text-slate-400 text-sm">جاري التحميل...</div>;

    const active = detail.assignments?.filter(a => a.is_current) || [];
    const history = detail.assignments?.filter(a => !a.is_current) || [];

    return (
      <div className="pt-4 space-y-4">
        {/* Meta row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {detail.license_key && (
            <div className="col-span-2 bg-slate-50 rounded-xl p-3 flex items-center gap-2 border border-slate-100">
              <KeyIcon /><span className="font-mono text-xs text-slate-600 break-all">{detail.license_key}</span>
            </div>
          )}
          {detail.expiry_date && (
            <div className={`rounded-xl p-3 border text-xs ${new Date(detail.expiry_date) < new Date() ? 'bg-red-50 border-red-100 text-red-700' : new Date(detail.expiry_date) < new Date(Date.now() + 60*24*60*60*1000) ? 'bg-orange-50 border-orange-100 text-orange-700' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
              <p className="font-bold mb-0.5">تاريخ الانتهاء</p>
              <p>{new Date(detail.expiry_date).toLocaleDateString('ar-EG')}</p>
            </div>
          )}
          {detail.cost_per_unit && (
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs text-slate-600">
              <p className="font-bold mb-0.5">التكلفة / نسخة</p>
              <p>{Number(detail.cost_per_unit).toLocaleString('ar-EG')} {detail.currency}</p>
            </div>
          )}
          {detail.cost_per_unit && detail.total_quantity && (
            <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100 text-xs text-indigo-700">
              <p className="font-bold mb-0.5">إجمالي التكلفة</p>
              <p>{(Number(detail.cost_per_unit) * detail.total_quantity).toLocaleString('ar-EG')} {detail.currency}</p>
            </div>
          )}
        </div>

        {/* Active assignments */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-slate-700">التعيينات الحالية ({active.length})</h4>
            <button onClick={() => openAssign(lic)}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 border border-indigo-200 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition">
              <PlusIcon /> تعيين ليسنز
            </button>
          </div>
          {active.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center bg-slate-50 rounded-xl">لم يتم تعيين أي نسخة بعد</p>
          ) : (
            <div className="space-y-2">
              {active.map(a => (
                <div key={a.id} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="flex-1 min-w-0">
                    {a.employee_name && <p className="text-sm font-bold text-slate-800 truncate">👤 {a.employee_name}</p>}
                    {a.asset_tag && <p className="text-xs text-slate-500 truncate">🖥️ {a.brand} {a.model} — {a.asset_tag}</p>}
                    {!a.employee_name && !a.asset_tag && <p className="text-xs text-slate-400">بدون مستلم</p>}
                    {a.license_key && <p className="text-xs font-mono text-slate-400 mt-0.5 truncate"><KeyIcon /> {a.license_key}</p>}
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(a.assigned_date).toLocaleDateString('ar-EG')}</p>
                  </div>
                  <button onClick={() => revoke(a.id)} className="text-xs text-rose-600 border border-rose-200 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition font-bold shrink-0">
                    استرداد
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* History */}
        {history.length > 0 && (
          <details className="bg-slate-50 rounded-xl border border-slate-100">
            <summary className="px-3 py-2.5 text-xs font-bold text-slate-500 cursor-pointer list-none">
              سجل التعيينات السابقة ({history.length})
            </summary>
            <div className="px-3 pb-3 space-y-1.5">
              {history.map(a => (
                <div key={a.id} className="flex items-center gap-2 text-xs text-slate-400 py-1 border-t border-slate-100">
                  {a.employee_name && <span>👤 {a.employee_name}</span>}
                  {a.asset_tag && <span>🖥️ {a.asset_tag}</span>}
                  {a.returned_date && <span className="mr-auto">{new Date(a.returned_date).toLocaleDateString('ar-EG')}</span>}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">🔑 إدارة الليسنز</h1>
          <p className="text-slate-500 mt-1">تتبع تراخيص البرمجيات وتعيينها على الأجهزة والموظفين</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-200 transition">
          <PlusIcon /> إضافة ليسنز
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard label="إجمالي المنتجات" value={stats.total_licenses} sub="نوع ليسنز" color="#4338ca" bg="#eef2ff" />
          <StatCard label="إجمالي النسخ" value={stats.total_seats} sub="مقعد ترخيص" color="#0284c7" bg="#e0f2fe" />
          <StatCard label="مُعينة" value={stats.assigned_seats} sub="نسخة مُوزَّعة" color="#d97706" bg="#fef9c3" />
          <StatCard label="متاحة" value={stats.available_seats} sub="نسخة جاهزة" color="#16a34a" bg="#dcfce7" />
          {stats.expiring_soon > 0 && <StatCard label="تنتهي قريباً" value={stats.expiring_soon} sub="خلال 60 يوم" color="#ea580c" bg="#ffedd5" />}
          {stats.expired > 0 && <StatCard label="منتهية" value={stats.expired} sub="تحتاج تجديد" color="#dc2626" bg="#fee2e2" />}
        </div>
      )}

      {/* Type filter tabs */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setTypeFilter('')} className={`px-4 py-2 rounded-xl text-sm font-bold border transition ${!typeFilter ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
          الكل
        </button>
        {LICENSE_TYPES.map(t => (
          <button key={t.id} onClick={() => setTypeFilter(t.id === typeFilter ? '' : t.id)}
            className="px-4 py-2 rounded-xl text-sm font-bold border transition"
            style={typeFilter === t.id ? { background: t.color, color: '#fff', borderColor: t.color } : { background: '#fff', color: '#475569', borderColor: '#e2e8f0' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في اسم الليسنز أو المورد..."
          className="w-full md:w-80 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition" />
      </div>

      {/* License cards */}
      {visible.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <p className="text-4xl mb-3">🔑</p>
          <h3 className="text-lg font-bold text-slate-700">لا يوجد ليسنز</h3>
          <p className="text-slate-400 mt-1">اضغط "إضافة ليسنز" لبدء سجل التراخيص</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(lic => {
            const ti = typeInfo(lic.type);
            const isExpired = lic.expiry_date && new Date(lic.expiry_date) < new Date();
            const isExpiringSoon = !isExpired && lic.expiry_date && new Date(lic.expiry_date) < new Date(Date.now() + 60*24*60*60*1000);
            const isExpanded = expandedId === lic.id;

            return (
              <motion.div key={lic.id} layout
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${isExpired ? 'border-red-200' : isExpiringSoon ? 'border-orange-200' : 'border-slate-100'}`}>
                {/* Card header - always visible */}
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Color block */}
                    <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center font-extrabold text-sm"
                      style={{ background: ti.bg, color: ti.color }}>
                      {lic.total_quantity}
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-800 text-base">{lic.name}</h3>
                            {lic.version && <span className="text-xs text-slate-400 font-mono">{lic.version}</span>}
                            <Badge type={lic.type} />
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded font-mono">
                              {KEY_TYPES.find(k => k.id === lic.key_type)?.label || lic.key_type}
                            </span>
                            {isExpired && <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded font-bold">منتهية ⚠️</span>}
                            {isExpiringSoon && <span className="text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded font-bold">تنتهي قريباً</span>}
                          </div>
                          <p className="text-sm text-slate-500 mt-1">{lic.vendor}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => openAssign(lic)} title="تعيين"
                            className="p-2 rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition">
                            <AssignIcon />
                          </button>
                          <button onClick={() => openEdit(lic)} title="تعديل"
                            className="p-2 rounded-lg border border-slate-100 text-slate-500 hover:bg-slate-100 transition">
                            <EditIcon />
                          </button>
                          <button onClick={() => deleteLic(lic.id, lic.name)} title="حذف"
                            className="p-2 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition">
                            <TrashIcon />
                          </button>
                          <button onClick={() => toggleExpand(lic.id)}
                            className="p-2 rounded-lg border border-slate-100 text-slate-400 hover:bg-slate-50 transition">
                            <ChevronIcon open={isExpanded} />
                          </button>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3">
                        <Progress assigned={lic.assigned_count} total={lic.total_quantity} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-5 pb-5 border-t border-slate-50">
                        <LicenseDetail lic={lic} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Add/Edit License Modal ────────────────────────────────────────── */}
      <Modal open={licModal} onClose={() => setLicModal(false)} title={editingLic ? 'تعديل الليسنز' : 'إضافة ليسنز جديد'} wide>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="اسم الليسنز" required>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="مثال: Windows 11 Pro" />
          </Field>
          <Field label="المورد / الشركة" required>
            <Input value={form.vendor} onChange={e => setForm(p => ({ ...p, vendor: e.target.value }))} placeholder="Microsoft, Adobe, Kaspersky..." />
          </Field>
          <Field label="الإصدار / الفئة">
            <Input value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))} placeholder="2024, 22H2, Enterprise..." />
          </Field>
          <Field label="النوع" required>
            <Select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
              {LICENSE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </Select>
          </Field>
          <Field label="نوع الترخيص">
            <Select value={form.key_type} onChange={e => setForm(p => ({ ...p, key_type: e.target.value }))}>
              {KEY_TYPES.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
            </Select>
          </Field>
          <Field label="عدد النسخ (المقاعد)" required>
            <Input type="number" min="1" value={form.total_quantity} onChange={e => setForm(p => ({ ...p, total_quantity: e.target.value }))} />
          </Field>
          <Field label="مفتاح الترخيص العام (اختياري)">
            <Input value={form.license_key} onChange={e => setForm(p => ({ ...p, license_key: e.target.value }))} placeholder="XXXXX-XXXXX-XXXXX-XXXXX" style={{ fontFamily: 'monospace' }} />
          </Field>
          <Field label="سعر النسخة الواحدة">
            <div className="flex gap-2">
              <Input type="number" step="0.01" value={form.cost_per_unit} onChange={e => setForm(p => ({ ...p, cost_per_unit: e.target.value }))} placeholder="0.00" />
              <Select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))} style={{ width: 90 }}>
                {['EGP','USD','EUR','SAR'].map(c => <option key={c}>{c}</option>)}
              </Select>
            </div>
          </Field>
          <Field label="تاريخ الشراء">
            <Input type="date" value={form.purchase_date} onChange={e => setForm(p => ({ ...p, purchase_date: e.target.value }))} />
          </Field>
          <Field label="تاريخ الانتهاء">
            <Input type="date" value={form.expiry_date} onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))} />
          </Field>
          <div className="md:col-span-2">
            <Field label="ملاحظات">
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
            </Field>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
          <button onClick={() => setLicModal(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50">إلغاء</button>
          <button onClick={saveLicense} disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow disabled:opacity-60 transition">
            {saving ? 'جاري الحفظ...' : editingLic ? 'حفظ التعديلات' : 'إضافة الليسنز'}
          </button>
        </div>
      </Modal>

      {/* ── Assign Modal ─────────────────────────────────────────────────── */}
      <Modal open={assignModal} onClose={() => setAssignModal(false)} title={`تعيين ليسنز — ${assigningLic?.name || ''}`}>
        {assigningLic && (
          <div className="space-y-4">
            {/* Availability badge */}
            <div className={`rounded-xl p-3 text-sm font-bold text-center ${assigningLic.available_count > 0 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {assigningLic.available_count > 0
                ? `✅ متاح ${assigningLic.available_count} نسخة من إجمالي ${assigningLic.total_quantity}`
                : '❌ المخزون نفد — لا توجد نسخ متاحة'
              }
            </div>

            <Field label="الموظف">
              <Select value={assignForm.employee_id} onChange={e => setAssignForm(p => ({ ...p, employee_id: e.target.value }))}>
                <option value="">-- اختر موظف (اختياري) --</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.full_name} — {e.department_name || 'بدون قسم'}</option>)}
              </Select>
            </Field>
            <Field label="الجهاز">
              <Select value={assignForm.device_id} onChange={e => setAssignForm(p => ({ ...p, device_id: e.target.value }))}>
                <option value="">-- اختر جهاز (اختياري) --</option>
                {devices.map(d => <option key={d.id} value={d.id}>{d.brand} {d.model} — {d.asset_tag || d.serial_number}</option>)}
              </Select>
            </Field>
            <Field label="مفتاح الترخيص الخاص بهذه النسخة (اختياري)">
              <Input value={assignForm.license_key} onChange={e => setAssignForm(p => ({ ...p, license_key: e.target.value }))} placeholder="XXXXX-XXXXX-XXXXX" style={{ fontFamily: 'monospace' }} />
            </Field>
            <Field label="تاريخ التعيين">
              <Input type="date" value={assignForm.assigned_date} onChange={e => setAssignForm(p => ({ ...p, assigned_date: e.target.value }))} />
            </Field>
            <Field label="ملاحظات">
              <textarea value={assignForm.notes} onChange={e => setAssignForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
            </Field>
          </div>
        )}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
          <button onClick={() => setAssignModal(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50">إلغاء</button>
          <button onClick={saveAssign} disabled={saving || assigningLic?.available_count <= 0}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow disabled:opacity-60 transition">
            {saving ? 'جاري التعيين...' : 'تعيين الليسنز'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
