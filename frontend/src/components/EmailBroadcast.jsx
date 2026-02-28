import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { apiGet, apiPost } from '../utils/api';

// ─── Icons ────────────────────────────────────────────────────────────────────
const SendIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const UsersIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const HistoryIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
  </svg>
);
const EyeIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

// ─── Template definitions ─────────────────────────────────────────────────────
const TEMPLATES = [
  { id: 'general',     label: 'إشعار رسمي',        icon: '📋', color: '#1e40af', labelBg: '#eff6ff', labelColor: '#1d4ed8', borderTop: '#1e40af', desc: 'إشعارات ومراسلات عامة' },
  { id: 'maintenance', label: 'إشعار صيانة',        icon: '🔩', color: '#92400e', labelBg: '#fffbeb', labelColor: '#92400e', borderTop: '#d97706', desc: 'توقف أو صيانة مجدولة' },
  { id: 'alert',       label: 'تنبيه عاجل',          icon: '🔴', color: '#991b1b', labelBg: '#fff1f2', labelColor: '#be123c', borderTop: '#dc2626', desc: 'تنبيهات أمنية أو عاجلة' },
  { id: 'update',      label: 'تحديث النظام',         icon: '🔵', color: '#0c4a6e', labelBg: '#f0f9ff', labelColor: '#0369a1', borderTop: '#0284c7', desc: 'إصدارات وتحديثات' },
  { id: 'success',     label: 'إشعار إيجابي',         icon: '🟢', color: '#14532d', labelBg: '#f0fdf4', labelColor: '#15803d', borderTop: '#16a34a', desc: 'إنجازات وأخبار إيجابية' },
];

// ─── Bold/Italic helpers ──────────────────────────────────────────────────────
const wrapSelection = (text, before, after, setFn, ref) => {
  const el = ref.current;
  if (!el) return;
  const { selectionStart: s, selectionEnd: e } = el;
  const selected = text.slice(s, e);
  const newText = text.slice(0, s) + before + selected + after + text.slice(e);
  setFn(newText);
  setTimeout(() => {
    el.focus();
    el.setSelectionRange(s + before.length, e + before.length);
  }, 0);
};

export default function EmailBroadcast() {
  const [tab, setTab] = useState('compose'); // compose | history
  const [template, setTemplate] = useState('general');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [departments, setDepartments] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [showRecipients, setShowRecipients] = useState(false);
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const bodyRef = { current: null };

  const tpl = TEMPLATES.find(t => t.id === template) || TEMPLATES[0];

  // Load departments once
  useEffect(() => {
    apiGet('/email-broadcast/departments')
      .then(setDepartments)
      .catch(() => {});
  }, []);

  // Refresh recipients whenever filter changes
  const fetchRecipients = useCallback(async () => {
    setRecipientsLoading(true);
    try {
      const params = new URLSearchParams();
      if (deptFilter) params.append('department_id', deptFilter);
      if (statusFilter) params.append('status', statusFilter);
      const data = await apiGet(`/email-broadcast/recipients?${params}`);
      setRecipients(data.recipients || []);
    } catch {
      setRecipients([]);
    } finally {
      setRecipientsLoading(false);
    }
  }, [deptFilter, statusFilter]);

  useEffect(() => { fetchRecipients(); }, [fetchRecipients]);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await apiGet('/email-broadcast/history');
      setHistory(data);
    } catch {
      toast.error('تعذر جلب السجل');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'history') fetchHistory();
  }, [tab]);

  const handleSend = async () => {
    if (!subject.trim()) { toast.error('أدخل موضوع الرسالة'); return; }
    if (!body.trim()) { toast.error('أدخل محتوى الرسالة'); return; }
    if (recipients.length === 0) { toast.error('لا يوجد مستلمون'); return; }

    setSending(true);
    try {
      const res = await apiPost('/email-broadcast/send', {
        subject,
        body,
        template,
        department_id: deptFilter || null,
        status_filter: statusFilter,
      });
      toast.success(`✅ تم الإرسال لـ ${res.sent} مستلم${res.failed > 0 ? ` (${res.failed} فشل)` : ''}`);
      setSubject('');
      setBody('');
      setTemplate('general');
    } catch (err) {
      toast.error(err?.message || 'حدث خطأ أثناء الإرسال');
    } finally {
      setSending(false);
    }
  };

  // ── Render body preview (basic markdown) ─────────────────────────────────
  const renderPreview = (text) =>
    text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">📧 البريد الجماعي</h1>
          <p className="text-slate-500 mt-1">إرسال رسائل منسقة وإشعارات رسمية لجميع الموظفين أو قسم محدد</p>
        </div>
        <div className="flex gap-2">
          {['compose', 'history'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                tab === t
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
              }`}
            >
              {t === 'compose' ? <><SendIcon /> إنشاء رسالة</> : <><HistoryIcon /> سجل الإرسال</>}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* ════════════════════════════════════════════════════════════════
            COMPOSE TAB
        ════════════════════════════════════════════════════════════════ */}
        {tab === 'compose' && (
          <motion.div
            key="compose"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid grid-cols-1 xl:grid-cols-3 gap-6"
          >
            {/* ── Left: Compose Form ───────────────────────────────────── */}
            <div className="xl:col-span-2 space-y-6">

              {/* Template Picker */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h2 className="text-base font-bold text-slate-700 mb-4">🎨 اختر قالب الرسالة</h2>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {TEMPLATES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTemplate(t.id)}
                      className={`flex flex-col items-start gap-1.5 rounded-xl p-3.5 border-2 transition-all text-right ${
                        template === t.id ? 'shadow-md scale-[1.02]' : 'border-slate-100 hover:border-slate-300'
                      }`}
                      style={template === t.id ? { borderColor: t.borderTop, background: t.labelBg } : {}}
                    >
                      <div className="w-full flex items-center justify-between">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ background: t.borderTop }}
                        />
                        {template === t.id && (
                          <span className="w-4 h-4 rounded-full flex items-center justify-center text-white" style={{ background: t.borderTop }}>
                            <CheckIcon />
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-800 leading-tight">{t.label}</span>
                      <span className="text-[10px] text-slate-400 leading-tight">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">موضوع الرسالة *</label>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="مثال: إشعار بصيانة مجدولة يوم الجمعة"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all text-base"
                />
              </div>

              {/* Body */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-slate-700">محتوى الرسالة *</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => wrapSelection(body, '**', '**', setBody, bodyRef)}
                      className="px-2 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                    >B</button>
                    <button
                      onClick={() => wrapSelection(body, '*', '*', setBody, bodyRef)}
                      className="px-2 py-1 rounded-lg border border-slate-200 text-xs italic text-slate-600 hover:bg-slate-50 transition"
                    >I</button>
                    <span className="text-xs text-slate-400">**عريض** • *مائل*</span>
                  </div>
                </div>
                <textarea
                  ref={el => (bodyRef.current = el)}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={10}
                  placeholder={`اكتب محتوى الرسالة هنا...\n\nيمكنك استخدام:\n**نص عريض**\n*نص مائل*`}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all resize-none font-sans text-sm leading-relaxed"
                />
                <p className="text-xs text-slate-400 mt-2">{body.length} حرف</p>
              </div>

              {/* Preview Toggle */}
              {(subject || body) && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setPreview(p => !p)}
                    className="w-full flex items-center justify-between px-6 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <span className="flex items-center gap-2"><EyeIcon /> معاينة الرسالة كما ستبدو في البريد</span>
                    <svg className={`w-4 h-4 transition-transform ${preview ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <AnimatePresence>
                    {preview && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6">
                          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-inner">
                            {/* Fake email header */}
                            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
                              <div className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold" style={{ background: tpl.borderTop }}>IT</div>
                              <div>
                                <p className="text-xs font-bold text-slate-700">إدارة تكنولوجيا المعلومات</p>
                                <p className="text-xs text-slate-400">إلى: الموظفون المحددون</p>
                              </div>
                            </div>
                            {/* Fake email body */}
                            <div className="p-0 bg-slate-100">
                              <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 0' }}>
                                {/* top accent */}
                                <div style={{ height: 4, background: tpl.borderTop, borderRadius: '4px 4px 0 0' }} />
                                {/* header row */}
                                <div style={{ background: '#fff', padding: '20px 28px 16px', borderRight: '1px solid #e5e7eb', borderLeft: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                                  <div>
                                    <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#9ca3af', textTransform: 'uppercase' }}>إدارة تكنولوجيا المعلومات</p>
                                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>{subject || '(الموضوع)'}</p>
                                  </div>
                                  <span style={{ display: 'inline-block', background: tpl.labelBg, color: tpl.labelColor, border: `1px solid ${tpl.labelColor}44`, borderRadius: 4, padding: '3px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{tpl.label}</span>
                                </div>
                                {/* divider */}
                                <div style={{ background: '#fff', borderRight: '1px solid #e5e7eb', borderLeft: '1px solid #e5e7eb' }}>
                                  <div style={{ height: 1, background: '#f3f4f6', margin: '0 28px' }} />
                                </div>
                                {/* body */}
                                <div style={{ background: '#fff', padding: '20px 28px', borderRight: '1px solid #e5e7eb', borderLeft: '1px solid #e5e7eb', fontSize: 13, lineHeight: 1.85, color: '#374151' }}
                                  dangerouslySetInnerHTML={{ __html: renderPreview(body) || '<span style="color:#9ca3af">محتوى الرسالة...</span>' }}
                                />
                                {/* sender */}
                                <div style={{ background: '#f9fafb', padding: '14px 28px', borderRight: '1px solid #e5e7eb', borderLeft: '1px solid #e5e7eb', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between' }}>
                                  <div>
                                    <p style={{ margin: '0 0 1px', fontSize: 10, color: '#9ca3af' }}>صادر عن</p>
                                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111827' }}>قسم تكنولوجيا المعلومات</p>
                                  </div>
                                  <p style={{ margin: 0, fontSize: 10, color: '#9ca3af', alignSelf: 'flex-end' }}>{new Date().toLocaleDateString('ar-EG')}</p>
                                </div>
                                {/* footer */}
                                <div style={{ background: '#f3f4f6', padding: '12px 28px', borderRadius: '0 0 4px 4px', border: '1px solid #e5e7eb', borderTop: 'none' }}>
                                  <p style={{ margin: 0, fontSize: 10, color: '#9ca3af', lineHeight: 1.6 }}>هذه رسالة رسمية صادرة تلقائياً — يُرجى عدم الرد على هذا البريد مباشرةً</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* ── Right: Filters + Recipient Summary + Send ────────────── */}
            <div className="space-y-6">

              {/* Filters */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-700">🎯 فلترة المستلمين</h2>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">القسم</label>
                  <select
                    value={deptFilter}
                    onChange={e => setDeptFilter(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="">كل الأقسام</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.employee_count})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">الحالة الوظيفية</label>
                  <div className="flex rounded-xl overflow-hidden border border-slate-200">
                    {[['active', 'نشط'], ['inactive', 'غير نشط'], ['', 'الكل']].map(([val, lbl]) => (
                      <button
                        key={val}
                        onClick={() => setStatusFilter(val)}
                        className={`flex-1 py-2 text-sm font-bold transition-all ${
                          statusFilter === val
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >{lbl}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recipients Summary */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-slate-700 flex items-center gap-2">
                    <UsersIcon /> المستلمون
                  </h2>
                  <button
                    onClick={() => setShowRecipients(p => !p)}
                    className="text-xs text-indigo-600 font-bold hover:underline"
                  >{showRecipients ? 'إخفاء' : 'عرض الكل'}</button>
                </div>

                {recipientsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-6 h-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-indigo-50 border border-indigo-100 mb-3">
                      <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-extrabold text-xl">
                        {recipients.length}
                      </div>
                      <div>
                        <p className="font-bold text-indigo-800 text-lg">{recipients.length} مستلم</p>
                        <p className="text-xs text-indigo-500">سيصلهم الإيميل</p>
                      </div>
                    </div>

                    <AnimatePresence>
                      {showRecipients && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="max-h-48 overflow-y-auto space-y-1 mt-2">
                            {recipients.map(r => (
                              <div key={r.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50 text-sm">
                                <span className="font-medium text-slate-700 truncate">{r.full_name}</span>
                                <span className="text-xs text-slate-400 truncate max-w-[140px]">{r.email}</span>
                              </div>
                            ))}
                            {recipients.length === 0 && (
                              <p className="text-sm text-slate-400 text-center py-3">لا يوجد مستلمون</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>

              {/* Send Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleSend}
                disabled={sending || recipients.length === 0 || !subject.trim() || !body.trim()}
                className="w-full py-4 rounded-2xl font-extrabold text-white text-base flex items-center justify-center gap-3 shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: sending ? '#1e40af' : tpl.borderTop, boxShadow: `0 4px 16px ${tpl.borderTop}44` }}
              >
                {sending ? (
                  <>
                    <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <SendIcon />
                    إرسال لـ {recipients.length} مستلم
                  </>
                )}
              </motion.button>

              {/* Tips */}
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-700 space-y-1.5">
                <p className="font-bold text-amber-800 mb-2">💡 نصائح</p>
                <p>• استخدم **نص** لتسميك الكلمات</p>
                <p>• استخدم *نص* للمائل</p>
                <p>• اضغط "معاينة" قبل الإرسال</p>
                <p>• الرسائل تُرسل على دفعات لتجنب الحظر</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            HISTORY TAB
        ════════════════════════════════════════════════════════════════ */}
        {tab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {historyLoading ? (
              <div className="flex items-center justify-center py-24">
                <div className="w-10 h-10 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
                <p className="text-5xl mb-4">📭</p>
                <h3 className="text-lg font-bold text-slate-700">لا يوجد سجل إرسال بعد</h3>
                <p className="text-slate-400 mt-1">ابدأ بإرسال أول رسالة جماعية</p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map(h => {
                  const t = TEMPLATES.find(t => t.id === h.template) || TEMPLATES[0];
                  return (
                    <motion.div
                      key={h.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4 hover:border-slate-200 transition"
                    >
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-sm font-extrabold shrink-0"
                        style={{ background: t.borderTop }}
                      >
                        IT
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-800 text-base truncate">{h.subject}</h3>
                          <span
                            className="text-xs font-bold px-3 py-1 rounded border shrink-0"
                            style={{ background: t.labelBg, color: t.labelColor, borderColor: t.labelColor + '33' }}
                          >{t.label}</span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">{h.body}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <UsersIcon />
                            {h.recipients_count} مستلم
                          </span>
                          <span>بواسطة: <span className="text-slate-600 font-bold">{h.sent_by}</span></span>
                          <span>{new Date(h.created_at).toLocaleDateString('ar-EG', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
