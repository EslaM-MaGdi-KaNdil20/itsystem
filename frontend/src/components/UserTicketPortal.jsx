import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiMonitor, FiCpu, FiWifi, FiMail, FiLock, FiMoreHorizontal,
  FiAlertCircle, FiCheckCircle, FiClock, FiSearch, FiArrowRight,
  FiArrowLeft, FiSend, FiUser, FiPhone, FiBriefcase, FiFileText,
  FiX, FiMapPin, FiGlobe, FiFacebook, FiTwitter, FiInstagram, FiLinkedin,
  FiShield, FiExternalLink
} from 'react-icons/fi';
import { apiPost, apiGet } from '../utils/api';
import { toast } from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════════════
   🏢 COMPANY CONFIG
   ═══════════════════════════════════════════════════════════════ */
const COMPANY = {
  name: 'بوابة الدعم الفني',
  slogan: 'نحن هنا لمساعدتك، في أي وقت.',
  description: 'قدم طلبك وسيقوم فريقنا المختص بمعالجته في أسرع وقت ممكن.',
};

/* ═══════════════ CONSTANTS ═══════════════ */
const CATEGORIES = [
  { id: 'hardware', label: 'أجهزة ومعدات', desc: 'كمبيوتر، طابعة، شاشة', icon: FiMonitor, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
  { id: 'software', label: 'برامج وتطبيقات', desc: 'تثبيت، تحديث، أعطال', icon: FiCpu, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200' },
  { id: 'network', label: 'شبكة وإنترنت', desc: 'اتصال، WiFi، بطء', icon: FiWifi, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { id: 'email', label: 'بريد إلكتروني', desc: 'حساب، إرسال، استقبال', icon: FiMail, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200' },
  { id: 'access', label: 'صلاحيات ودخول', desc: 'كلمة مرور، أذونات', icon: FiLock, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-200' },
  { id: 'general', label: 'استفسار عام', desc: 'طلبات أخرى متنوعة', icon: FiMoreHorizontal, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' },
];

const PRIORITIES = [
  { id: 'low', label: 'منخفضة', desc: 'غير عاجل', color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200' },
  { id: 'medium', label: 'متوسطة', desc: 'تأثير محدود', color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200' },
  { id: 'high', label: 'عالية', desc: 'تأثير كبير', color: 'text-orange-600', bg: 'bg-orange-100', border: 'border-orange-200' },
  { id: 'urgent', label: 'عاجلة', desc: 'توقف كامل', color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200' },
];

const RESPONSE_TIMES = {
  low: { time: 'خلال ٢٤ ساعة', label: 'منخفضة', color: 'text-slate-600', bg: 'bg-slate-50' },
  medium: { time: 'خلال ٤ ساعات', label: 'متوسطة', color: 'text-blue-600', bg: 'bg-blue-50' },
  high: { time: 'خلال ساعة واحدة', label: 'عالية', color: 'text-orange-600', bg: 'bg-orange-50' },
  urgent: { time: 'فوراً (أقل من ١٥ دقيقة)', label: 'عاجلة', color: 'text-red-600', bg: 'bg-red-50' },
};

/* ═══════════════ COMPONENTS ═══════════════ */

const TrackModal = ({ isOpen, onClose }) => {
  const [ticketNumber, setTicketNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!ticketNumber.trim()) return;
    
    setLoading(true);
    setError('');
    setResult(null);
    
    try {
      const data = await apiGet(`/tickets/track/${ticketNumber.trim().toUpperCase()}`);
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.error || 'لم يتم العثور على تذكرة بهذا الرقم');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      new: { label: 'جديدة', classes: 'bg-blue-100 text-blue-700' },
      in_progress: { label: 'قيد التنفيذ', classes: 'bg-amber-100 text-amber-700' },
      resolved: { label: 'تم الحل', classes: 'bg-emerald-100 text-emerald-700' },
      closed: { label: 'مغلقة', classes: 'bg-slate-100 text-slate-700' }
    };
    const b = badges[status] || badges.new;
    return <span className={`px-3 py-1 rounded-full text-xs font-bold ${b.classes}`}>{b.label}</span>;
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
            dir="rtl"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FiSearch className="text-indigo-500" />
                تتبع حالة التذكرة
              </h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-100">
                <FiX size={20} />
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleTrack} className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">رقم التذكرة</label>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    value={ticketNumber}
                    onChange={(e) => setTicketNumber(e.target.value)}
                    placeholder="مثال: TKT-12345"
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-left font-mono"
                    dir="ltr"
                  />
                  <button 
                    type="submit" 
                    disabled={loading || !ticketNumber.trim()}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? <FiClock className="animate-spin" /> : 'بحث'}
                  </button>
                </div>
                {error && <p className="mt-3 text-sm text-red-500 flex items-center gap-1"><FiAlertCircle /> {error}</p>}
              </form>

              {result && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs text-slate-500 font-mono mb-1">{result.ticket_number}</p>
                      <h4 className="font-bold text-slate-800">{result.title}</h4>
                    </div>
                    {getStatusBadge(result.status)}
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-slate-200/60">
                      <span className="text-slate-500">تاريخ الإنشاء</span>
                      <span className="font-medium text-slate-700" dir="ltr">{new Date(result.created_at).toLocaleDateString('ar-EG')}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-200/60">
                      <span className="text-slate-500">التصنيف</span>
                      <span className="font-medium text-slate-700">{CATEGORIES.find(c => c.id === result.category)?.label || result.category}</span>
                    </div>
                    {result.assigned_to_name && (
                      <div className="flex justify-between py-2">
                        <span className="text-slate-500">الموظف المسؤول</span>
                        <span className="font-medium text-slate-700">{result.assigned_to_name}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default function UserTicketPortal() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [ticketNumber, setTicketNumber] = useState(null);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  
  const [form, setForm] = useState({
    category: '',
    title: '',
    description: '',
    priority: 'medium',
    requester_name: '',
    requester_email: '',
    requester_phone: '',
    requester_department: ''
  });

  const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleNext = () => {
    if (step === 1 && !form.category) {
      toast.error('يرجى اختيار تصنيف المشكلة أولاً');
      return;
    }
    if (step === 2 && (!form.title.trim() || !form.description.trim())) {
      toast.error('يرجى إدخال عنوان ووصف المشكلة');
      return;
    }
    setStep(s => s + 1);
  };

  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.requester_name.trim() || !form.requester_email.trim() || !form.requester_department.trim()) {
      toast.error('يرجى إكمال جميع البيانات المطلوبة');
      return;
    }

    setLoading(true);
    try {
      const res = await apiPost('/tickets', form);
      setTicketNumber(res.ticket_number || res.data?.ticket_number);
      setStep(4); // Success step
    } catch (err) {
      toast.error(err?.response?.data?.error || 'حدث خطأ أثناء إرسال الطلب');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      category: '', title: '', description: '', priority: 'medium',
      requester_name: '', requester_email: '', requester_phone: '', requester_department: ''
    });
    setTicketNumber(null);
    setStep(1);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900" dir="rtl">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-slate-200/60 z-40">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <FiMonitor className="text-white text-xl" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-lg leading-tight">{COMPANY.name}</h1>
              <p className="text-xs text-slate-500 font-medium">بوابة الخدمة الذاتية</p>
            </div>
          </div>
          <button 
            onClick={() => setIsTrackModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
          >
            <FiSearch className="text-indigo-500" />
            تتبع تذكرة
          </button>
        </div>
      </nav>

      {/* Main Content */}
      {/* Spacer equal to navbar height */}
      <div style={{ height: 80 }} />
      <main className="pb-20 px-6 pt-10">
        <div className="max-w-3xl mx-auto">
          
          {/* Header Text (Hidden on Success) */}
          {step < 4 && (
            <div className="text-center mb-8">
              <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold px-4 py-1.5 rounded-full mb-4 tracking-wide"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse inline-block"></span>
                فريق الدعم الفني متاح الآن
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
                className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight"
              >
                كيف يمكننا مساعدتك اليوم؟
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
                className="text-slate-400 text-base max-w-lg mx-auto leading-relaxed"
              >
                {COMPANY.description}
              </motion.p>
            </div>
          )}

          {/* Form Card */}
          <motion.div 
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-200/50 border border-white/50 overflow-hidden relative backdrop-blur-xl"
          >
            {/* Background Decorations within Card */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-50/50 to-purple-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            
            {/* Progress Bar - Modernized */}
            {step < 4 && (
              <div className="relative px-8 pt-10 pb-2 z-10">
                <div className="flex items-center justify-between max-w-2xl mx-auto">
                  {[
                    { num: 1, label: 'نوع المشكلة', icon: FiMonitor },
                    { num: 2, label: 'التفاصيل', icon: FiFileText },
                    { num: 3, label: 'بياناتك', icon: FiUser },
                  ].map((s, idx) => {
                     const Icon = s.icon;
                     const isActive = step === s.num;
                     const isCompleted = step > s.num;
                     
                     return (
                    <React.Fragment key={s.num}>
                      <div className="flex flex-col items-center gap-3 relative z-10">
                        <motion.div 
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all duration-300 relative overflow-hidden ${
                          isActive 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-4 ring-indigo-50' 
                            : isCompleted 
                                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                                : 'bg-slate-100 text-slate-400'
                        }`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {isActive && <motion.div className="absolute inset-0 bg-white/20" initial={{ scale: 0 }} animate={{ scale: 1.5, opacity: 0 }} transition={{ repeat: Infinity, duration: 1.5 }} />}
                          {isCompleted ? <FiCheckCircle className="text-2xl" /> : <Icon />}
                        </motion.div>
                        <span className={`text-xs font-bold transition-colors duration-300 ${
                          isActive ? 'text-indigo-700' : isCompleted ? 'text-emerald-600' : 'text-slate-400'
                        }`}>{s.label}</span>
                      </div>
                      
                      {idx < 2 && (
                        <div className="flex-1 h-1 mx-4 mb-7 bg-slate-100 rounded-full overflow-hidden relative">
                           <motion.div 
                              initial={{ width: "0%" }}
                              animate={{ width: isCompleted ? "100%" : "0%" }}
                              transition={{ duration: 0.5, ease: "easeInOut" }}
                              className="absolute top-0 right-0 h-full bg-emerald-500"
                           />
                        </div>
                      )}
                    </React.Fragment>
                  )})}
                </div>
              </div>
            )}

            <div className="p-8 md:p-10">
              <AnimatePresence mode="wait">
                
                {/* STEP 1: Category */}
                {step === 1 && (
                  <motion.div 
                    key="step1"
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <h3 className="text-xl font-bold text-slate-800 mb-6">1. حدد نوع المشكلة</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {CATEGORIES.map((cat) => {
                        const Icon = cat.icon;
                        const isSelected = form.category === cat.id;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => updateForm('category', cat.id)}
                            className={`flex items-start gap-4 p-5 rounded-2xl border-2 text-right transition-all duration-200 ${
                              isSelected 
                                ? `border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-100/50` 
                                : `border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50`
                            }`}
                          >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-indigo-600 text-white' : `${cat.bg} ${cat.color}`}`}>
                              <Icon size={24} />
                            </div>
                            <div>
                              <h4 className={`font-bold text-base mb-1 ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>{cat.label}</h4>
                              <p className={`text-sm ${isSelected ? 'text-indigo-700/70' : 'text-slate-500'}`}>{cat.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: Details */}
                {step === 2 && (
                  <motion.div 
                    key="step2"
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <h3 className="text-xl font-bold text-slate-800 mb-6">2. تفاصيل المشكلة</h3>
                    
                    <div className="space-y-5">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">عنوان المشكلة <span className="text-red-500">*</span></label>
                        <input 
                          type="text"
                          value={form.title}
                          onChange={(e) => updateForm('title', e.target.value)}
                          placeholder="مثال: الطابعة لا تعمل، لا أستطيع الدخول للبريد..."
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">وصف المشكلة <span className="text-red-500">*</span></label>
                        <textarea 
                          value={form.description}
                          onChange={(e) => updateForm('description', e.target.value)}
                          placeholder="يرجى كتابة تفاصيل المشكلة بدقة لمساعدتنا في حلها بشكل أسرع..."
                          rows={4}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">مستوى الأولوية</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {PRIORITIES.map((p) => {
                            const isSelected = form.priority === p.id;
                            return (
                              <button
                                key={p.id}
                                onClick={() => updateForm('priority', p.id)}
                                className={`p-3 rounded-xl border-2 text-center transition-all ${
                                  isSelected 
                                    ? `${p.border} ${p.bg} shadow-sm` 
                                    : `border-slate-100 bg-white hover:bg-slate-50`
                                }`}
                              >
                                <span className={`block text-sm font-bold mb-1 ${isSelected ? p.color : 'text-slate-700'}`}>{p.label}</span>
                                <span className={`block text-xs ${isSelected ? p.color : 'text-slate-400'}`}>{p.desc}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: Contact Info */}
                {step === 3 && (
                  <motion.div 
                    key="step3"
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <h3 className="text-xl font-bold text-slate-800 mb-6">3. بيانات التواصل</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">الاسم الكامل <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                            <FiUser />
                          </div>
                          <input 
                            type="text"
                            value={form.requester_name}
                            onChange={(e) => updateForm('requester_name', e.target.value)}
                            className="w-full pr-11 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">البريد الإلكتروني <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                            <FiMail />
                          </div>
                          <input 
                            type="email"
                            value={form.requester_email}
                            onChange={(e) => updateForm('requester_email', e.target.value)}
                            className="w-full pr-11 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-left"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">رقم الهاتف</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                            <FiPhone />
                          </div>
                          <input 
                            type="tel"
                            value={form.requester_phone}
                            onChange={(e) => updateForm('requester_phone', e.target.value)}
                            className="w-full pr-11 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-left"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">القسم / الإدارة <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                            <FiBriefcase />
                          </div>
                          <input 
                            type="text"
                            value={form.requester_department}
                            onChange={(e) => updateForm('requester_department', e.target.value)}
                            className="w-full pr-11 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 4: Success */}
                {step === 4 && (
                  <motion.div 
                    key="step4"
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-10"
                  >
                    <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-100/50">
                      <FiCheckCircle size={48} />
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-800 mb-2">تم إرسال طلبك بنجاح!</h2>
                    <p className="text-slate-500 mb-8">شكراً لك {form.requester_name.split(' ')[0]}، سيقوم فريقنا بمراجعة طلبك والرد عليك قريباً.</p>
                    
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 max-w-sm mx-auto mb-8">
                      <p className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-widest">رقم التذكرة</p>
                      <p className="text-4xl font-black text-indigo-600 font-mono tracking-wider">{ticketNumber}</p>
                      
                      <div className="mt-6 pt-6 border-t border-slate-200/60">
                        <p className="text-sm text-slate-500 mb-1">الوقت المتوقع للرد</p>
                        <p className={`font-bold ${RESPONSE_TIMES[form.priority]?.color}`}>
                          {RESPONSE_TIMES[form.priority]?.time}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-center gap-4">
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(ticketNumber);
                          toast.success('تم نسخ رقم التذكرة');
                        }}
                        className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                      >
                        نسخ الرقم
                      </button>
                      <button 
                        onClick={resetForm}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                      >
                        تقديم طلب جديد
                      </button>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* Footer Actions */}
            {step < 4 && (
              <div className="bg-slate-50 border-t border-slate-100 p-6 flex items-center justify-between">
                {step > 1 ? (
                  <button 
                    onClick={handleBack}
                    className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-200/50 rounded-xl transition-colors flex items-center gap-3"
                  >
                    <FiArrowRight className="text-xl shrink-0" />
                    <span className="whitespace-nowrap">رجوع</span>
                  </button>
                ) : <div />}

                {step < 3 ? (
                  <button 
                    onClick={handleNext}
                    style={{ minWidth: 140, minHeight: 48 }}
                    className="px-10 py-3 bg-indigo-600 text-white rounded-xl text-base font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 inline-flex items-center justify-center gap-3"
                  >
                    <span>التالي</span>
                    <FiArrowLeft size={20} />
                  </button>
                ) : (
                  <button 
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{ minWidth: 160, minHeight: 48 }}
                    className="px-10 py-3 bg-emerald-500 text-white rounded-xl text-base font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200 inline-flex items-center justify-center gap-3 disabled:opacity-70"
                  >
                    {loading ? <FiClock className="animate-spin" size={20} /> : <FiSend size={20} />}
                    <span>إرسال الطلب</span>
                  </button>
                )}
              </div>
            )}
          </motion.div>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-300 py-16 px-6 mt-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            
            {/* Company Info */}
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white text-xl">
                    <FiMonitor />
                </div>
                <h3 className="text-xl font-bold text-white">{COMPANY.name}</h3>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                نقدم حلولاً تقنية متكاملة لضمان استمرارية أعمالك بكفاءة وأمان. فريقنا متواجد لخدمتكم على مدار الساعة.
              </p>
              <div className="flex gap-4">
                 {[FiFacebook, FiTwitter, FiInstagram, FiLinkedin].map((Icon, i) => (
                    <a key={i} href="#" className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-indigo-600 hover:text-white transition-all">
                        <Icon size={16} />
                    </a>
                 ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
               <h4 className="text-white font-bold mb-6 text-lg">روابط سريعة</h4>
               <ul className="space-y-3 text-sm">
                  {['الرئيسية', 'تقديم طلب جديد', 'تتبع حالة طلب', 'عن الشركة'].map((item) => (
                     <li key={item}>
                        <a href="#" className="hover:text-indigo-400 transition-colors flex items-center gap-2 group">
                           <FiArrowLeft size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                           {item}
                        </a>
                     </li>
                  ))}
               </ul>
            </div>

            {/* Support */}
             <div>
               <h4 className="text-white font-bold mb-6 text-lg">مركز المساعدة</h4>
               <ul className="space-y-3 text-sm">
                  {['الأسئلة الشائعة', 'سياسة الخصوصية', 'شروط الاستخدام', 'الإبلاغ عن مشكلة أمنية'].map((item) => (
                     <li key={item}>
                        <a href="#" className="hover:text-indigo-400 transition-colors flex items-center gap-2 group">
                           <FiShield size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                           {item}
                        </a>
                     </li>
                  ))}
               </ul>
            </div>

            {/* Contact */}
            <div>
               <h4 className="text-white font-bold mb-6 text-lg">تواصل معنا</h4>
               <div className="space-y-4 text-sm">
                  <div className="flex items-start gap-3">
                     <FiMapPin className="text-indigo-500 mt-1 shrink-0" size={18} />
                     <span>المملكة العربية السعودية، الرياض، حي العليا، برج التقنية</span>
                  </div>
                  <div className="flex items-center gap-3">
                     <FiBriefcase className="text-indigo-500 shrink-0" size={18} />
                     <span dir="ltr">info@company.com</span>
                  </div>
                  <div className="flex items-center gap-3">
                     <FiPhone className="text-indigo-500 shrink-0" size={18} />
                     <span dir="ltr">+966 11 234 5678</span>
                  </div>
               </div>
            </div>
            
          </div>
          
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
             <p>© 2026 جميع الحقوق محفوظة لـ شركة الحلول التقنية.</p>
             <div className="flex items-center gap-6">
                <a href="#" className="hover:text-white transition-colors">سياسة الخصوصية</a>
                <a href="#" className="hover:text-white transition-colors">شروط الاستخدام</a>
             </div>
          </div>
        </div>
      </footer>

      <TrackModal isOpen={isTrackModalOpen} onClose={() => setIsTrackModalOpen(false)} />
    </div>
  );
}
