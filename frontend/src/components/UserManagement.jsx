import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

const API_URL = `${window.location.protocol}//${window.location.hostname}:3000/api`;
const token   = () => localStorage.getItem('token');
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

// ─── Permission Groups ────────────────────────────────────────────────────────
const PERM_GROUPS = [
  { group: 'لوحة التحكم', icon: '📊', perms: [
    { key: 'dashboard', label: 'عرض لوحة التحكم', single: true },
  ]},
  { group: 'إدارة الأصول IT', icon: '💻', perms: [
    { key: 'devices',     label: 'الأجهزة' },
    { key: 'assignments', label: 'التسليمات' },
    { key: 'maintenance', label: 'الصيانة' },
    { key: 'departments', label: 'الأقسام' },
    { key: 'employees',   label: 'الموظفين' },
  ]},
  { group: 'المخزون والمنتجات', icon: '📦', perms: [
    { key: 'products',    label: 'المنتجات' },
    { key: 'categories',  label: 'الفئات' },
    { key: 'accessories', label: 'مخزون الملحقات' },
  ]},
  { group: 'الليسنز', icon: '🔑', perms: [
    { key: 'licenses', label: 'الليسنز' },
  ]},
  { group: 'نظام الطلبات', icon: '🎫', perms: [
    { key: 'tickets', label: 'التذاكر' },
  ]},
  { group: 'إدارة IT', icon: '🖥️', perms: [
    { key: 'it_subscriptions',  label: 'الاشتراكات' },
    { key: 'it_servers',        label: 'السيرفرات' },
    { key: 'it_password_vault', label: 'خزنة كلمات المرور' },
    { key: 'it_network_ips',    label: 'عناوين IP' },
    { key: 'it_email_accounts', label: 'حسابات البريد' },
    { key: 'it_user_guides',    label: 'أدلة المستخدم' },
    { key: 'email_broadcast',   label: 'البريد الجماعي', single: true },
  ]},
  { group: 'النظام', icon: '⚙️', perms: [
    { key: 'activity_logs',   label: 'سجل النشاطات', single: true },
    { key: 'settings',        label: 'الإعدادات',    single: true },
    { key: 'user_management', label: 'إدارة المستخدمين', single: true },
  ]},
];

const ROLE_LABELS = { super_admin: 'سوبر ادمن', admin: 'مدير', support: 'دعم فني', user: 'مستخدم' };
const ROLE_COLORS = {
  super_admin: 'bg-purple-100 text-purple-700 ring-1 ring-purple-200',
  admin:       'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200',
  support:     'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
  user:        'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
};

// Quick Role Presets
const PRESETS = {
  'IT فني': {
    devices_view: true, devices_manage: true,
    assignments_view: true, assignments_manage: true,
    maintenance_view: true, maintenance_manage: true,
    licenses_view: true, licenses_manage: false,
    tickets_view: true, tickets_manage: true,
    it_servers_view: true, it_servers_manage: false,
    it_network_ips_view: true, it_network_ips_manage: false,
    dashboard: true,
  },
  'مشرف HR': {
    employees_view: true, employees_manage: true,
    departments_view: true, departments_manage: true,
    tickets_view: true, tickets_manage: false,
    dashboard: true,
  },
  'قراءة فقط': Object.fromEntries(
    PERM_GROUPS.flatMap(g => g.perms.flatMap(p =>
      p.single ? [[p.key, true]] : [[`${p.key}_view`, true], [`${p.key}_manage`, false]]
    ))
  ),
  'كل الصلاحيات': Object.fromEntries(
    PERM_GROUPS.flatMap(g => g.perms.flatMap(p =>
      p.single ? [[p.key, true]] : [[`${p.key}_view`, true], [`${p.key}_manage`, true]]
    ))
  ),
};

const emptyPerms = () => Object.fromEntries(
  PERM_GROUPS.flatMap(g => g.perms.flatMap(p =>
    p.single ? [[p.key, false]] : [[`${p.key}_view`, false], [`${p.key}_manage`, false]]
  ))
);

// ─── Toggle Switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none
        ${checked ? 'bg-indigo-600' : 'bg-slate-200'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform
        ${checked ? 'translate-x-4' : 'translate-x-1'}`} />
    </button>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 9 }) {
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const colors = ['bg-indigo-500','bg-purple-500','bg-rose-500','bg-amber-500','bg-teal-500','bg-cyan-500'];
  const color  = colors[name?.charCodeAt(0) % colors.length] || colors[0];
  return (
    <div className={`w-${size} h-${size} rounded-full ${color} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
      {initials}
    </div>
  );
}

export default function UserManagement() {
  const [users, setUsers]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');

  // Modals
  const [showForm,   setShowForm]       = useState(false);
  const [showPerms,  setShowPerms]      = useState(false);
  const [showPwd,    setShowPwd]        = useState(false);
  const [editUser,   setEditUser]       = useState(null);
  const [permUser,   setPermUser]       = useState(null);
  const [pwdUser,    setPwdUser]        = useState(null);

  // Form state
  const [form, setForm] = useState({ full_name:'', email:'', password:'', role:'user', phone:'', is_active: true });
  const [perms, setPerms] = useState(emptyPerms());
  const [newPwd, setNewPwd] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const r = await fetch(`${API_URL}/users`, { headers: headers() });
      const data = await r.json();
      if (Array.isArray(data)) setUsers(data);
    } catch { toast.error('خطأ في جلب المستخدمين'); }
    finally { setLoading(false); }
  };

  const openAdd = () => {
    setEditUser(null);
    setForm({ full_name:'', email:'', password:'', role:'user', phone:'', is_active: true });
    setShowForm(true);
  };

  const openEdit = (u) => {
    setEditUser(u);
    setForm({ full_name: u.full_name, email: u.email, password:'', role: u.role, phone: u.phone||'', is_active: u.is_active });
    setShowForm(true);
  };

  const openPerms = (u) => {
    setPermUser(u);
    setPerms({ ...emptyPerms(), ...(u.permissions || {}) });
    setShowPerms(true);
  };

  const openPwd = (u) => { setPwdUser(u); setNewPwd(''); setShowPwd(true); };

  const saveUser = async () => {
    if (!form.full_name || !form.email) { toast.error('اسم الإيميل مطلوبان'); return; }
    if (!editUser && !form.password)    { toast.error('كلمة المرور مطلوبة'); return; }
    setSaving(true);
    try {
      const body = { ...form };
      if (!body.password) delete body.password;
      const r = editUser
        ? await fetch(`${API_URL}/users/${editUser.id}`, { method:'PUT', headers: headers(), body: JSON.stringify(body) })
        : await fetch(`${API_URL}/users`,                 { method:'POST', headers: headers(), body: JSON.stringify(body) });
      if (!r.ok) { const d = await r.json(); toast.error(d.error || 'خطأ'); return; }
      toast.success(editUser ? 'تم تعديل المستخدم' : 'تم إنشاء المستخدم');
      setShowForm(false);
      fetchUsers();
    } catch { toast.error('خطأ في الحفظ'); }
    finally { setSaving(false); }
  };

  const savePerms = async () => {
    setSaving(true);
    try {
      const r = await fetch(`${API_URL}/users/${permUser.id}/permissions`, {
        method: 'PUT', headers: headers(), body: JSON.stringify({ permissions: perms }),
      });
      if (!r.ok) { const d = await r.json(); toast.error(d.error || 'خطأ'); return; }
      toast.success('تم حفظ الصلاحيات');
      setShowPerms(false);
      fetchUsers();
    } catch { toast.error('خطأ في حفظ الصلاحيات'); }
    finally { setSaving(false); }
  };

  const savePwd = async () => {
    if (!newPwd || newPwd.length < 6) { toast.error('كلمة المرور 6 أحرف على الأقل'); return; }
    setSaving(true);
    try {
      const r = await fetch(`${API_URL}/users/${pwdUser.id}/change-password`, {
        method: 'PUT', headers: headers(), body: JSON.stringify({ password: newPwd }),
      });
      if (!r.ok) { const d = await r.json(); toast.error(d.error||'خطأ'); return; }
      toast.success('تم تغيير كلمة المرور');
      setShowPwd(false);
    } catch { toast.error('خطأ'); }
    finally { setSaving(false); }
  };

  const deleteUser = async (u) => {
    if (!confirm(`تأكيد حذف ${u.full_name}؟`)) return;
    try {
      const r = await fetch(`${API_URL}/users/${u.id}`, { method:'DELETE', headers: headers() });
      if (!r.ok) { const d = await r.json(); toast.error(d.error||'خطأ'); return; }
      toast.success('تم الحذف');
      fetchUsers();
    } catch { toast.error('خطأ'); }
  };

  const toggleActive = async (u) => {
    try {
      const r = await fetch(`${API_URL}/users/${u.id}`, {
        method:'PUT', headers: headers(),
        body: JSON.stringify({ is_active: !u.is_active }),
      });
      if (!r.ok) return;
      fetchUsers();
    } catch {}
  };

  const applyPreset = (name) => {
    const base = emptyPerms();
    const patch = PRESETS[name] || {};
    setPerms({ ...base, ...patch });
  };

  const permCount = (p) => Object.values(p).filter(Boolean).length;

  const filtered = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">إدارة المستخدمين</h1>
          <p className="text-slate-500 text-sm mt-0.5">تحكم كامل في الحسابات والصلاحيات</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-colors text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
          </svg>
          مستخدم جديد
        </button>
      </div>

      {/* Search + Stats */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الإيميل..."
            className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"/>
        </div>
        <div className="flex gap-3 text-sm">
          <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg font-medium">{users.length} مستخدم</span>
          <span className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-medium">{users.filter(u => u.is_active).length} نشط</span>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <div className="text-4xl mb-3">👥</div>
            <p className="font-medium">لا يوجد مستخدمين</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-right font-semibold text-slate-500 px-5 py-3.5">المستخدم</th>
                <th className="text-right font-semibold text-slate-500 px-4 py-3.5">الدور</th>
                <th className="text-right font-semibold text-slate-500 px-4 py-3.5 hidden md:table-cell">الصلاحيات</th>
                <th className="text-right font-semibold text-slate-500 px-4 py-3.5">الحالة</th>
                <th className="text-right font-semibold text-slate-500 px-4 py-3.5">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <motion.tr key={u.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.full_name} />
                      <div>
                        <p className="font-bold text-slate-800">{u.full_name}</p>
                        <p className="text-slate-400 text-xs">{u.email}</p>
                        {u.phone && <p className="text-slate-400 text-xs">{u.phone}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${ROLE_COLORS[u.role] || ROLE_COLORS.user}`}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    {u.role === 'super_admin' ? (
                      <span className="text-xs text-purple-600 font-bold bg-purple-50 px-2 py-1 rounded-lg">كل الصلاحيات</span>
                    ) : (
                      <button onClick={() => openPerms(u)}
                        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors bg-slate-50 hover:bg-indigo-50 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-indigo-200">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7z"/>
                        </svg>
                        {permCount(u.permissions || {})} صلاحية
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {u.role === 'super_admin' ? (
                      <span className="text-xs text-green-600 font-semibold">نشط دائماً</span>
                    ) : (
                      <button onClick={() => toggleActive(u)}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors border
                          ${u.is_active
                            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                            : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-green-500' : 'bg-red-400'}`}/>
                        {u.is_active ? 'نشط' : 'موقوف'}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      {/* Edit */}
                      <button onClick={() => openEdit(u)} title="تعديل"
                        className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                      </button>
                      {/* Permissions */}
                      {u.role !== 'super_admin' && (
                        <button onClick={() => openPerms(u)} title="الصلاحيات"
                          className="p-1.5 hover:bg-purple-50 text-slate-400 hover:text-purple-600 rounded-lg transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                          </svg>
                        </button>
                      )}
                      {/* Change Password */}
                      <button onClick={() => openPwd(u)} title="تغيير كلمة المرور"
                        className="p-1.5 hover:bg-amber-50 text-slate-400 hover:text-amber-600 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                        </svg>
                      </button>
                      {/* Delete */}
                      {u.role !== 'super_admin' && (
                        <button onClick={() => deleteUser(u)} title="حذف"
                          className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Add/Edit User Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" dir="rtl">
            <motion.div initial={{ opacity:0, scale:.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-white font-bold text-lg">{editUser ? 'تعديل مستخدم' : 'مستخدم جديد'}</h2>
                <button onClick={() => setShowForm(false)} className="text-indigo-200 hover:text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <Field label="الاسم الكامل *">
                    <input value={form.full_name} onChange={e => setForm(p=>({...p, full_name: e.target.value}))}
                      placeholder="محمد أحمد" className="input-field"/>
                  </Field>
                  <Field label="البريد الإلكتروني *">
                    <input type="email" value={form.email} onChange={e => setForm(p=>({...p, email: e.target.value}))}
                      placeholder="user@company.com" className="input-field" dir="ltr"/>
                  </Field>
                  <Field label={editUser ? 'كلمة المرور الجديدة (اتركها فارغة للاحتفاظ)' : 'كلمة المرور *'}>
                    <input type="password" value={form.password} onChange={e => setForm(p=>({...p, password: e.target.value}))}
                      placeholder="••••••••" className="input-field" dir="ltr"/>
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="الدور">
                      <select value={form.role} onChange={e => setForm(p=>({...p, role: e.target.value}))} className="input-field">
                        <option value="user">مستخدم</option>
                        <option value="support">دعم فني</option>
                        <option value="admin">مدير</option>
                      </select>
                    </Field>
                    <Field label="رقم الهاتف">
                      <input value={form.phone} onChange={e => setForm(p=>({...p, phone: e.target.value}))}
                        placeholder="05xxxxxxxx" className="input-field" dir="ltr"/>
                    </Field>
                  </div>
                  {editUser && (
                    <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                      <Toggle checked={form.is_active} onChange={v => setForm(p=>({...p, is_active: v}))}/>
                      <span className="text-sm text-slate-700 font-medium">الحساب نشط</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-6 pb-6 flex gap-3 justify-end">
                <button onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">إلغاء</button>
                <button onClick={saveUser} disabled={saving}
                  className="px-6 py-2.5 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-60">
                  {saving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Permissions Modal ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {showPerms && permUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" dir="rtl">
            <motion.div initial={{ opacity:0, scale:.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <Avatar name={permUser.full_name} size={8}/>
                  <div>
                    <h2 className="text-white font-bold">صلاحيات {permUser.full_name}</h2>
                    <p className="text-purple-200 text-xs">{permCount(perms)} صلاحية مفعلة</p>
                  </div>
                </div>
                <button onClick={() => setShowPerms(false)} className="text-purple-200 hover:text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              {/* Presets */}
              <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2 flex-wrap flex-shrink-0 bg-slate-50">
                <span className="text-xs font-semibold text-slate-500 ml-1">قالب سريع:</span>
                {Object.keys(PRESETS).map(name => (
                  <button key={name} onClick={() => applyPreset(name)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-indigo-300 hover:text-indigo-600 transition-colors font-medium text-slate-600">
                    {name}
                  </button>
                ))}
                <button onClick={() => setPerms(emptyPerms())}
                  className="text-xs px-3 py-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-500 font-medium transition-colors">
                  مسح الكل
                </button>
              </div>

              {/* Column Headers */}
              <div className="px-6 py-2 flex items-center bg-slate-50 border-b border-slate-100 flex-shrink-0">
                <div className="flex-1 text-xs font-bold text-slate-500">الصفحة / الوحدة</div>
                <div className="w-20 text-center text-xs font-bold text-slate-500">عرض</div>
                <div className="w-20 text-center text-xs font-bold text-slate-500">إدارة</div>
              </div>

              {/* Permission Groups */}
              <div className="overflow-y-auto flex-1">
                {PERM_GROUPS.map(group => (
                  <div key={group.group}>
                    <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                      <span className="text-xs font-bold text-slate-600">{group.icon} {group.group}</span>
                    </div>
                    {group.perms.map(perm => (
                      <div key={perm.key} className="flex items-center px-6 py-3 border-b border-slate-50 hover:bg-slate-50/50">
                        <div className="flex-1 text-sm text-slate-700 font-medium">{perm.label}</div>
                        {perm.single ? (
                          <>
                            <div className="w-20 flex justify-center">
                              <Toggle checked={!!perms[perm.key]} onChange={v => setPerms(p=>({...p, [perm.key]: v}))}/>
                            </div>
                            <div className="w-20 flex justify-center">
                              <span className="text-xs text-slate-300">—</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-20 flex justify-center">
                              <Toggle
                                checked={!!perms[`${perm.key}_view`]}
                                onChange={v => setPerms(p=>({
                                  ...p,
                                  [`${perm.key}_view`]: v,
                                  [`${perm.key}_manage`]: v ? p[`${perm.key}_manage`] : false,
                                }))}
                              />
                            </div>
                            <div className="w-20 flex justify-center">
                              <Toggle
                                checked={!!perms[`${perm.key}_manage`]}
                                disabled={!perms[`${perm.key}_view`]}
                                onChange={v => setPerms(p=>({...p, [`${perm.key}_manage`]: v}))}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end flex-shrink-0">
                <button onClick={() => setShowPerms(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">إلغاء</button>
                <button onClick={savePerms} disabled={saving}
                  className="px-6 py-2.5 text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors disabled:opacity-60">
                  {saving ? 'جاري الحفظ...' : 'حفظ الصلاحيات'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Change Password Modal ───────────────────────────────────────────── */}
      <AnimatePresence>
        {showPwd && pwdUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" dir="rtl">
            <motion.div initial={{ opacity:0, scale:.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex items-center justify-between">
                <h2 className="text-white font-bold">تغيير كلمة المرور</h2>
                <button onClick={() => setShowPwd(false)} className="text-amber-100 hover:text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600">تغيير كلمة مرور: <strong>{pwdUser.full_name}</strong></p>
                <Field label="كلمة المرور الجديدة">
                  <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
                    placeholder="6 أحرف على الأقل" className="input-field" dir="ltr"/>
                </Field>
              </div>
              <div className="px-6 pb-6 flex gap-3 justify-end">
                <button onClick={() => setShowPwd(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">إلغاء</button>
                <button onClick={savePwd} disabled={saving}
                  className="px-6 py-2.5 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors disabled:opacity-60">
                  {saving ? 'جاري الحفظ...' : 'تغيير'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .input-field {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          background: #fff;
        }
        .input-field:focus { border-color: #818cf8; box-shadow: 0 0 0 3px rgba(129,140,248,0.15); }
        select.input-field { cursor: pointer; }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-600">{label}</label>
      {children}
    </div>
  );
}
