import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import { apiGet, apiPut } from '../utils/api';

const BACKEND = `${window.location.protocol}//${window.location.hostname}:3000`;
const API = `${BACKEND}/api`;

// Password strength helper
function calcStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: 'ضعيفة', color: 'bg-red-500' };
  if (score <= 3) return { score, label: 'متوسطة', color: 'bg-yellow-500' };
  return { score, label: 'قوية', color: 'bg-green-500' };
}

function EyeIcon({ show }) {
  return show ? (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const [formData, setFormData] = useState({ full_name: '', email: '', phone: '' });
  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });

  const [stats, setStats] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadProfile();
    loadStats();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        updateUserState(data.user);
      }
    } catch {
      // Fallback to localStorage
      const stored = localStorage.getItem('user');
      if (stored) updateUserState(JSON.parse(stored));
    } finally {
      setLoading(false);
    }
  };

  const updateUserState = (u) => {
    setUser(u);
    setFormData({ full_name: u.full_name || '', email: u.email || '', phone: u.phone || '' });
    if (u.avatar) setAvatarPreview(null); // let render use u.avatar directly
    // Sync localStorage
    const stored = localStorage.getItem('user');
    if (stored) {
      const prev = JSON.parse(stored);
      localStorage.setItem('user', JSON.stringify({ ...prev, ...u }));
    }
  };

  const loadStats = async () => {
    try {
      const data = await apiGet('/activity-logs/stats?days=30');
      setStats(data);
    } catch {}
  };

  // ── Avatar upload ──────────────────────────────────────────
  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.error('حجم الصورة يجب أن يكون أقل من 3MB'); return; }

    // Instant preview
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);

    // Upload
    setAvatarUploading(true);
    try {
      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await fetch(`${API}/auth/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      const data = await res.json();
      if (data.success) {
        const updated = { ...user, avatar: data.avatar };
        setUser(updated);
        const stored = localStorage.getItem('user');
        if (stored) localStorage.setItem('user', JSON.stringify({ ...JSON.parse(stored), avatar: data.avatar }));
        toast.success('تم تحديث الصورة الشخصية');
      } else {
        toast.error(data.error || 'فشل رفع الصورة');
        setAvatarPreview(null);
      }
    } catch {
      toast.error('حدث خطأ أثناء رفع الصورة');
      setAvatarPreview(null);
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  // ── Profile update ─────────────────────────────────────────
  const handleSave = async () => {
    if (!formData.full_name.trim()) { toast.error('الاسم الكامل مطلوب'); return; }
    setSaving(true);
    try {
      const data = await apiPut('/auth/profile', formData);
      if (data.success) {
        updateUserState(data.user);
        setEditing(false);
        toast.success('تم تحديث الملف الشخصي');
      } else {
        toast.error(data.error || 'فشل التحديث');
      }
    } catch { toast.error('حدث خطأ'); }
    finally { setSaving(false); }
  };

  // ── Change password ────────────────────────────────────────
  const handleChangePassword = async () => {
    const { current_password, new_password, confirm_password } = passwordData;
    if (!current_password || !new_password || !confirm_password) { toast.error('يرجى ملء جميع الحقول'); return; }
    if (new_password !== confirm_password) { toast.error('كلمات المرور الجديدة غير متطابقة'); return; }
    const str = calcStrength(new_password);
    if (str.score < 2) { toast.error('كلمة المرور ضعيفة جداً'); return; }
    setSavingPw(true);
    try {
      const data = await apiPut('/auth/change-password', { current_password, new_password });
      if (data.success) {
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        setChangingPassword(false);
        toast.success('تم تغيير كلمة المرور');
      } else {
        toast.error(data.error || 'فشل تغيير كلمة المرور');
      }
    } catch { toast.error('حدث خطأ'); }
    finally { setSavingPw(false); }
  };

  const strength = calcStrength(passwordData.new_password);

  const roleLabels = { admin: 'مدير النظام', supervisor: 'مشرف', user: 'مستخدم', viewer: 'مشاهد فقط' };
  const roleColors = { admin: 'bg-red-100 text-red-700', supervisor: 'bg-orange-100 text-orange-700', user: 'bg-blue-100 text-blue-700', viewer: 'bg-gray-100 text-gray-700' };

  const avatarSrc = avatarPreview
    ? avatarPreview
    : user?.avatar
      ? `${BACKEND}${user.avatar}`
      : null;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6" dir="rtl">
      <Toaster position="top-center" />

      {/* Header card */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-l from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row items-center gap-6">

          {/* Clickable avatar */}
          <div className="relative group cursor-pointer" onClick={handleAvatarClick} title="تغيير الصورة">
            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white/40 shadow-lg">
              {avatarSrc ? (
                <img src={avatarSrc} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/20 flex items-center justify-center text-4xl font-bold">
                  {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
            </div>
            {/* Camera overlay */}
            <div className="absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {avatarUploading ? (
                <div className="w-7 h-7 border-3 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-xs text-white mt-1">تغيير</span>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden" onChange={handleAvatarChange} />
          </div>

          <div className="text-center sm:text-right">
            <h1 className="text-2xl font-bold">{user?.full_name}</h1>
            <p className="text-blue-100 mt-1">{user?.email}</p>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${roleColors[user?.role] || 'bg-white/20 text-white'}`}>
                {roleLabels[user?.role] || user?.role}
              </span>
              {user?.phone && (
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm">{user.phone}</span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats row */}
      {stats && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-4">
          {[
            { label: 'نشاطات اليوم', value: stats.today || 0, color: 'text-blue-600' },
            { label: 'نشاطات الأسبوع', value: stats.week || 0, color: 'text-green-600' },
            { label: 'نشاطات الشهر', value: stats.month || 0, color: 'text-purple-600' }
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm text-center border border-gray-100">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Edit profile card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 text-lg">المعلومات الشخصية</h2>
          {!editing ? (
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              تعديل
            </button>
          ) : (
            <button onClick={() => { setEditing(false); updateUserState(user); }}
              className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm">إلغاء</button>
          )}
        </div>

        <div className="p-6">
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
                <input value={formData.full_name}
                  onChange={(e) => setFormData(p => ({ ...p, full_name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                <input value={formData.email}
                  onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                  type="email"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                <input value={formData.phone}
                  onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button onClick={handleSave} disabled={saving}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium transition-colors flex items-center justify-center gap-2">
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
              </button>
            </div>
          ) : (
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { label: 'الاسم الكامل', value: user?.full_name },
                { label: 'البريد الإلكتروني', value: user?.email },
                { label: 'رقم الهاتف', value: user?.phone || '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
                  <dd className="mt-1 text-gray-900 font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </motion.div>

      {/* Change password card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
          onClick={() => setChangingPassword(!changingPassword)}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="font-bold text-gray-800 text-lg">تغيير كلمة المرور</span>
          </div>
          <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${changingPassword ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <AnimatePresence>
          {changingPassword && (
            <motion.div key="pw-form" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
              <div className="p-6 space-y-4">

                {/* Current password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور الحالية</label>
                  <div className="relative">
                    <input
                      type={showPw.current ? 'text' : 'password'}
                      value={passwordData.current_password}
                      onChange={(e) => setPasswordData(p => ({ ...p, current_password: e.target.value }))}
                      className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                      placeholder="أدخل كلمة المرور الحالية" />
                    <button type="button" tabIndex={-1}
                      onClick={() => setShowPw(p => ({ ...p, current: !p.current }))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <EyeIcon show={showPw.current} />
                    </button>
                  </div>
                </div>

                {/* New password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور الجديدة</label>
                  <div className="relative">
                    <input
                      type={showPw.new ? 'text' : 'password'}
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData(p => ({ ...p, new_password: e.target.value }))}
                      className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                      placeholder="أدخل كلمة المرور الجديدة" />
                    <button type="button" tabIndex={-1}
                      onClick={() => setShowPw(p => ({ ...p, new: !p.new }))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <EyeIcon show={showPw.new} />
                    </button>
                  </div>
                  {/* Strength meter */}
                  {passwordData.new_password && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1 h-1.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className={`flex-1 rounded-full transition-colors duration-300 ${
                            i <= strength.score ? strength.color : 'bg-gray-200'
                          }`} />
                        ))}
                      </div>
                      <p className={`text-xs font-medium ${
                        strength.color === 'bg-red-500' ? 'text-red-500'
                        : strength.color === 'bg-yellow-500' ? 'text-yellow-600'
                        : 'text-green-600'
                      }`}>قوة كلمة المرور: {strength.label}</p>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تأكيد كلمة المرور الجديدة</label>
                  <div className="relative">
                    <input
                      type={showPw.confirm ? 'text' : 'password'}
                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData(p => ({ ...p, confirm_password: e.target.value }))}
                      className={`w-full px-4 py-2.5 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                        passwordData.confirm_password && passwordData.confirm_password !== passwordData.new_password
                          ? 'border-red-400 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="أعد إدخال كلمة المرور الجديدة" />
                    <button type="button" tabIndex={-1}
                      onClick={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <EyeIcon show={showPw.confirm} />
                    </button>
                  </div>
                  {passwordData.confirm_password && passwordData.confirm_password !== passwordData.new_password && (
                    <p className="text-xs text-red-500 mt-1">كلمات المرور غير متطابقة</p>
                  )}
                </div>

                <div className="flex gap-3 pt-1">
                  <button onClick={handleChangePassword} disabled={savingPw}
                    className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-60 font-medium transition-colors flex items-center justify-center gap-2">
                    {savingPw && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {savingPw ? 'جارٍ التغيير...' : 'تغيير كلمة المرور'}
                  </button>
                  <button onClick={() => { setChangingPassword(false); setPasswordData({ current_password: '', new_password: '', confirm_password: '' }); }}
                    className="px-5 py-2.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Account info footer */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-bold text-gray-700 mb-4 text-sm uppercase tracking-wide">معلومات الحساب</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">تاريخ الإنشاء</dt>
            <dd className="text-gray-800 font-medium mt-0.5">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">الصلاحية</dt>
            <dd className="mt-0.5">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[user?.role] || 'bg-gray-100 text-gray-700'}`}>
                {roleLabels[user?.role] || user?.role}
              </span>
            </dd>
          </div>
        </dl>
      </motion.div>
    </div>
  );
}
