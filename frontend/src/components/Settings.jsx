import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import { apiGet, apiPut } from '../utils/api';
import {
  FiSettings, FiImage, FiClock, FiShield, FiAlertTriangle,
  FiCheckCircle, FiUsers, FiSave, FiRefreshCw, FiZap,
  FiTrendingUp, FiTarget, FiArrowUp
} from 'react-icons/fi';

const API_URL = `${window.location.protocol}//${window.location.hostname}:3000/api`;

export default function Settings() {
  const [activeTab, setActiveTab] = useState('logo');
  const [logoInfo, setLogoInfo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  // SLA State
  const [slaPolicies, setSlaPolicies] = useState([]);
  const [slaStats, setSlaStats] = useState(null);
  const [itUsers, setItUsers] = useState([]);
  const [slaLoading, setSlaLoading] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(null);

  useEffect(() => {
    fetchLogoInfo();
  }, []);

  useEffect(() => {
    if (activeTab === 'sla') {
      fetchSLAData();
    }
  }, [activeTab]);

  const fetchSLAData = async () => {
    setSlaLoading(true);
    try {
      const [policies, stats, users] = await Promise.all([
        apiGet('/sla/policies'),
        apiGet('/sla/stats'),
        apiGet('/tickets/it-users')
      ]);
      setSlaPolicies(policies);
      setSlaStats(stats);
      setItUsers(users);
    } catch (err) {
      console.error('Error fetching SLA data:', err);
      toast.error('حدث خطأ في جلب بيانات SLA');
    } finally {
      setSlaLoading(false);
    }
  };

  const updatePolicy = async (id, updates) => {
    setSavingPolicy(id);
    try {
      await apiPut(`/sla/policies/${id}`, updates);
      toast.success('تم تحديث السياسة بنجاح');
      fetchSLAData();
    } catch (err) {
      toast.error('حدث خطأ في تحديث السياسة');
    } finally {
      setSavingPolicy(null);
    }
  };

  const fetchLogoInfo = async () => {
    try {
      const res = await fetch(`${API_URL}/logo/info`);
      const data = await res.json();
      setLogoInfo(data);
      
      if (data.exists) {
        setPreviewUrl(`${API_URL.replace('/api', '')}${data.path}?t=${Date.now()}`);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار صورة فقط');
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 2 ميجابايت');
      return;
    }

    // Upload
    const formData = new FormData();
    formData.append('logo', file);

    try {
      setUploading(true);
      const res = await fetch(`${API_URL}/logo/upload`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        toast.success('تم رفع اللوجو بنجاح');
        fetchLogoInfo();
      } else {
        toast.error('فشل في رفع اللوجو');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ في رفع اللوجو');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('هل أنت متأكد من حذف اللوجو؟')) return;

    try {
      const res = await fetch(`${API_URL}/logo`, {
        method: 'DELETE'
      });

      if (res.ok) {
        toast.success('تم حذف اللوجو بنجاح');
        setPreviewUrl(null);
        fetchLogoInfo();
      } else {
        toast.error('فشل في حذف اللوجو');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ في حذف اللوجو');
    }
  };

  const formatMinutes = (mins) => {
    if (!mins || mins <= 0) return '—';
    if (mins < 60) return `${mins} دقيقة`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (m === 0) return `${h} ساعة`;
    return `${h} ساعة و ${m} دقيقة`;
  };

  const priorityConfig = {
    urgent: { label: 'عاجل', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: '🔴' },
    high:   { label: 'عالي', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', icon: '🟠' },
    medium: { label: 'متوسط', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: '🔵' },
    low:    { label: 'منخفض', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', icon: '⚪' },
  };

  const tabs = [
    { id: 'logo', label: 'اللوجو', icon: FiImage },
    { id: 'sla', label: 'إدارة SLA', icon: FiShield },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      <Toaster position="top-center" />
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FiSettings className="text-indigo-500" /> إعدادات النظام
        </h1>
        <p className="text-gray-500 text-sm">إدارة إعدادات النظام العامة وسياسات SLA</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white rounded-xl p-1.5 shadow-sm border border-gray-100 w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
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
        {/* ═══════════════════ LOGO TAB ═══════════════════ */}
        {activeTab === 'logo' && (
          <motion.div
            key="logo"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <div className="flex items-center gap-3 mb-6 pb-4 border-b">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <FiImage className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">لوجو الشركة</h2>
                <p className="text-sm text-gray-500">سيظهر اللوجو في جميع التقارير PDF</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">المعاينة</h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 flex items-center justify-center min-h-[200px]">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Company Logo" className="max-w-full max-h-[180px] object-contain" />
                  ) : (
                    <div className="text-center text-gray-400">
                      <FiImage className="w-16 h-16 mx-auto mb-2" />
                      <p>لا يوجد لوجو</p>
                    </div>
                  )}
                </div>
                {logoInfo?.exists && (
                  <div className="mt-3 text-xs text-gray-500 space-y-1">
                    <p>📁 الحجم: {(logoInfo.size / 1024).toFixed(2)} KB</p>
                    <p>📅 آخر تعديل: {new Date(logoInfo.modified).toLocaleString('ar-EG')}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">رفع لوجو جديد</h3>
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                    <p className="font-semibold mb-1">💡 نصائح:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>الحجم الأقصى: 2 ميجابايت</li>
                      <li>الصيغ المدعومة: PNG, JPG, GIF</li>
                      <li>الأبعاد الموصى بها: 200x80 بكسل</li>
                    </ul>
                  </div>
                  <label className="block">
                    <input type="file" accept="image/*" onChange={handleFileSelect} disabled={uploading} className="hidden" />
                    <div className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                      uploading ? 'border-gray-300 bg-gray-50 cursor-not-allowed' : 'border-blue-400 bg-blue-50 hover:bg-blue-100'
                    }`}>
                      {uploading ? (
                        <div className="flex items-center justify-center gap-2">
                          <FiRefreshCw className="animate-spin text-blue-600" />
                          <span className="text-blue-600">جاري الرفع...</span>
                        </div>
                      ) : (
                        <>
                          <FiImage className="w-12 h-12 mx-auto mb-2 text-blue-600" />
                          <p className="text-blue-600 font-semibold">انقر لاختيار صورة</p>
                        </>
                      )}
                    </div>
                  </label>
                  {previewUrl && (
                    <button onClick={handleDelete} className="w-full py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium flex items-center justify-center gap-2">
                      حذف اللوجو
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════ SLA TAB ═══════════════════ */}
        {activeTab === 'sla' && (
          <motion.div
            key="sla"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {slaLoading ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <FiRefreshCw className="w-8 h-8 mx-auto mb-3 text-indigo-500 animate-spin" />
                <p className="text-gray-500">جاري تحميل بيانات SLA...</p>
              </div>
            ) : (
              <>
                {/* SLA Overview Cards */}
                {slaStats && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                          <FiCheckCircle className="text-emerald-600" size={20} />
                        </div>
                        <span className="text-2xl font-black text-emerald-600">{slaStats.compliance.response_rate}%</span>
                      </div>
                      <p className="text-sm font-bold text-gray-700">التزام الاستجابة</p>
                      <p className="text-xs text-gray-400 mt-1">نسبة التذاكر المستجاب لها في الوقت</p>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FiTarget className="text-blue-600" size={20} />
                        </div>
                        <span className="text-2xl font-black text-blue-600">{slaStats.compliance.resolution_rate}%</span>
                      </div>
                      <p className="text-sm font-bold text-gray-700">التزام الحل</p>
                      <p className="text-xs text-gray-400 mt-1">نسبة التذاكر المحلولة في الوقت</p>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                          <FiAlertTriangle className="text-red-600" size={20} />
                        </div>
                        <span className="text-2xl font-black text-red-600">{slaStats.compliance.total_breaches}</span>
                      </div>
                      <p className="text-sm font-bold text-gray-700">إجمالي التجاوزات</p>
                      <p className="text-xs text-gray-400 mt-1">{slaStats.compliance.response_breaches} استجابة · {slaStats.compliance.resolution_breaches} حل</p>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                          <FiArrowUp className="text-amber-600" size={20} />
                        </div>
                        <span className="text-2xl font-black text-amber-600">{slaStats.compliance.escalated}</span>
                      </div>
                      <p className="text-sm font-bold text-gray-700">تصعيدات</p>
                      <p className="text-xs text-gray-400 mt-1">تذاكر تم تصعيدها تلقائياً</p>
                    </motion.div>
                  </div>
                )}

                {/* Average Times */}
                {slaStats?.avg_times && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <h3 className="text-base font-bold text-gray-700 mb-4 flex items-center gap-2">
                      <FiTrendingUp className="text-indigo-500" /> متوسط الأوقات
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-indigo-50 rounded-lg p-4 text-center">
                        <p className="text-xs text-indigo-500 font-bold mb-1">متوسط وقت الاستجابة</p>
                        <p className="text-xl font-black text-indigo-700">
                          {formatMinutes(slaStats.avg_times.avg_response_minutes)}
                        </p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4 text-center">
                        <p className="text-xs text-purple-500 font-bold mb-1">متوسط وقت الحل</p>
                        <p className="text-xl font-black text-purple-700">
                          {formatMinutes(slaStats.avg_times.avg_resolution_minutes)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* SLA Policies Configuration */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <FiShield className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-800">سياسات SLA</h2>
                        <p className="text-sm text-gray-500">تحديد أوقات الاستجابة والحل لكل مستوى أولوية</p>
                      </div>
                    </div>
                    <button onClick={fetchSLAData} className="text-indigo-500 hover:bg-indigo-50 p-2 rounded-lg transition">
                      <FiRefreshCw size={18} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {slaPolicies.map((policy) => {
                      const config = priorityConfig[policy.priority] || priorityConfig.medium;
                      return (
                        <SLAPolicyCard
                          key={policy.id}
                          policy={policy}
                          config={config}
                          itUsers={itUsers}
                          saving={savingPolicy === policy.id}
                          onSave={(updates) => updatePolicy(policy.id, updates)}
                          formatMinutes={formatMinutes}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* At Risk Tickets */}
                {slaStats?.at_risk?.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-red-100 p-6">
                    <h3 className="text-base font-bold text-red-700 mb-4 flex items-center gap-2">
                      <FiAlertTriangle className="text-red-500" /> تذاكر معرضة للخطر ({slaStats.at_risk.length})
                    </h3>
                    <div className="space-y-3">
                      {slaStats.at_risk.map(ticket => (
                        <div key={ticket.id} className="flex items-center justify-between bg-red-50 border border-red-100 rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-red-500 font-bold">{ticket.ticket_number}</span>
                            <span className="text-sm font-bold text-gray-800 truncate max-w-[200px]">{ticket.title}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${config?.bg || 'bg-gray-100'} ${config?.color || 'text-gray-600'}`}>
                              {priorityConfig[ticket.priority]?.label}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-red-600">
                            {ticket.response_minutes_left != null && ticket.response_minutes_left > 0
                              ? `⏰ استجابة: ${formatMinutes(Math.round(ticket.response_minutes_left))}`
                              : ticket.resolution_minutes_left != null && ticket.resolution_minutes_left > 0
                              ? `⏰ حل: ${formatMinutes(Math.round(ticket.resolution_minutes_left))}`
                              : 'منتهي'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Breaches */}
                {slaStats?.recent_breaches?.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-base font-bold text-gray-700 mb-4 flex items-center gap-2">
                      <FiClock className="text-gray-500" /> آخر التجاوزات
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-gray-500 text-xs border-b">
                            <th className="text-right py-2 px-3">التذكرة</th>
                            <th className="text-right py-2 px-3">النوع</th>
                            <th className="text-right py-2 px-3">الهدف</th>
                            <th className="text-right py-2 px-3">الفعلي</th>
                            <th className="text-right py-2 px-3">التاريخ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {slaStats.recent_breaches.slice(0, 10).map(breach => (
                            <tr key={breach.id} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="py-2 px-3 font-mono text-xs font-bold text-indigo-600">{breach.ticket_number}</td>
                              <td className="py-2 px-3">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                  breach.breach_type === 'response' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {breach.breach_type === 'response' ? 'استجابة' : 'حل'}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-gray-600">{formatMinutes(breach.target_minutes)}</td>
                              <td className="py-2 px-3 text-red-600 font-bold">{formatMinutes(breach.actual_minutes)}</td>
                              <td className="py-2 px-3 text-gray-400 text-xs">{new Date(breach.breached_at).toLocaleString('ar-EG')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLA Policy Card Component
// ═══════════════════════════════════════════════════════════════
function SLAPolicyCard({ policy, config, itUsers, saving, onSave, formatMinutes }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    response_time_minutes: policy.response_time_minutes,
    resolution_time_minutes: policy.resolution_time_minutes,
    escalation_enabled: policy.escalation_enabled,
    escalation_after_minutes: policy.escalation_after_minutes,
    escalation_to: policy.escalation_to || '',
    is_active: policy.is_active,
  });

  const handleSave = () => {
    onSave({
      ...form,
      escalation_to: form.escalation_to || null,
    });
    setEditing(false);
  };

  return (
    <motion.div
      layout
      className={`border-2 rounded-xl p-5 transition-all ${
        editing ? 'border-indigo-300 bg-indigo-50/30 shadow-lg' : `${config.border} ${config.bg}/30 hover:shadow-md`
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <h4 className={`font-bold text-lg ${config.color}`}>{policy.name}</h4>
            <p className="text-xs text-gray-400">الأولوية: {config.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
            policy.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {policy.is_active ? 'مفعّلة' : 'معطّلة'}
          </span>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="text-indigo-500 hover:bg-indigo-100 p-2 rounded-lg transition text-sm font-bold">
              <FiSettings size={16} />
            </button>
          ) : (
            <div className="flex gap-1">
              <button onClick={handleSave} disabled={saving} className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-1 disabled:opacity-50">
                {saving ? <FiRefreshCw className="animate-spin" size={12} /> : <FiSave size={12} />}
                حفظ
              </button>
              <button onClick={() => setEditing(false)} className="text-gray-500 hover:bg-gray-100 px-3 py-1.5 rounded-lg text-xs font-bold">
                إلغاء
              </button>
            </div>
          )}
        </div>
      </div>

      {!editing ? (
        /* View Mode */
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <p className="text-[10px] text-gray-400 font-bold mb-1 flex items-center gap-1"><FiZap size={10} /> وقت الاستجابة</p>
            <p className="text-base font-black text-gray-800">{formatMinutes(policy.response_time_minutes)}</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <p className="text-[10px] text-gray-400 font-bold mb-1 flex items-center gap-1"><FiClock size={10} /> وقت الحل</p>
            <p className="text-base font-black text-gray-800">{formatMinutes(policy.resolution_time_minutes)}</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <p className="text-[10px] text-gray-400 font-bold mb-1 flex items-center gap-1"><FiArrowUp size={10} /> التصعيد بعد</p>
            <p className="text-base font-black text-gray-800">
              {policy.escalation_enabled ? formatMinutes(policy.escalation_after_minutes) : 'معطّل'}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <p className="text-[10px] text-gray-400 font-bold mb-1 flex items-center gap-1"><FiUsers size={10} /> التصعيد إلى</p>
            <p className="text-base font-black text-gray-800 truncate">
              {policy.escalation_user_name || '—'}
            </p>
          </div>
        </div>
      ) : (
        /* Edit Mode */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">وقت الاستجابة (بالدقائق)</label>
            <input type="number" value={form.response_time_minutes} onChange={e => setForm({...form, response_time_minutes: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" min="1" />
            <p className="text-[10px] text-gray-400 mt-1">= {formatMinutes(form.response_time_minutes)}</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">وقت الحل (بالدقائق)</label>
            <input type="number" value={form.resolution_time_minutes} onChange={e => setForm({...form, resolution_time_minutes: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" min="1" />
            <p className="text-[10px] text-gray-400 mt-1">= {formatMinutes(form.resolution_time_minutes)}</p>
          </div>
          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-gray-600 mb-2">
              <input type="checkbox" checked={form.escalation_enabled} onChange={e => setForm({...form, escalation_enabled: e.target.checked})}
                className="w-4 h-4 text-indigo-600 rounded" />
              تفعيل التصعيد التلقائي
            </label>
            {form.escalation_enabled && (
              <input type="number" value={form.escalation_after_minutes} onChange={e => setForm({...form, escalation_after_minutes: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" min="1"
                placeholder="التصعيد بعد (دقائق)" />
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">التصعيد إلى</label>
            <select value={form.escalation_to} onChange={e => setForm({...form, escalation_to: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none">
              <option value="">— بدون تصعيد —</option>
              {itUsers.map(u => (
                <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-600">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})}
                className="w-4 h-4 text-indigo-600 rounded" />
              السياسة مفعّلة
            </label>
          </div>
        </div>
      )}
    </motion.div>
  );
}
