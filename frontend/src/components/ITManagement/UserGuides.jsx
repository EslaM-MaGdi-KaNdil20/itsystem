import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';

const API_URL = `${window.location.protocol}//${window.location.hostname}:3000/api`;

const categories = [
  { value: 'Windows', label: 'Windows', icon: '🪟', color: 'bg-blue-500' },
  { value: 'Office', label: 'Microsoft Office', icon: '📊', color: 'bg-orange-500' },
  { value: 'Network', label: 'Network', icon: '🌐', color: 'bg-teal-500' },
  { value: 'Printers', label: 'Printers', icon: '🖨️', color: 'bg-purple-500' },
  { value: 'Hardware', label: 'Hardware', icon: '🔧', color: 'bg-green-500' },
  { value: 'Software', label: 'Software', icon: '💿', color: 'bg-cyan-500' },
  { value: 'Security', label: 'Security', icon: '🔒', color: 'bg-red-500' },
  { value: 'Email', label: 'Email', icon: '📧', color: 'bg-blue-600' },
  { value: 'Remote Access', label: 'Remote Access', icon: '🖥️', color: 'bg-indigo-500' },
  { value: 'Other', label: 'Other', icon: '📁', color: 'bg-gray-500' }
];

export default function UserGuides() {
  const [guides, setGuides] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStepsModal, setShowStepsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [guideToDelete, setGuideToDelete] = useState(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form states
  const [guideForm, setGuideForm] = useState({
    title: '',
    category: '',
    description: '',
    created_by: ''
  });
  
  const [steps, setSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState({
    step_number: 1,
    title: '',
    description: '',
    image_path: '',
    notes: ''
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchData();
    fetchStats();
  }, [filterCategory, searchTerm]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.append('category', filterCategory);
      if (searchTerm) params.append('search', searchTerm);
      
      const res = await fetch(`${API_URL}/guides?${params.toString()}`);
      const data = await res.json();
      setGuides(data);
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ في تحميل الأدلة');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/guides/stats`);
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleCreateGuide = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/guides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guideForm)
      });

      if (res.ok) {
        const newGuide = await res.json();
        setSelectedGuide(newGuide);
        setShowModal(false);
        setShowStepsModal(true);
        toast.success('تم إنشاء الدليل بنجاح');
        fetchData();
        fetchStats();
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ في إنشاء الدليل');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجا');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      setUploadingImage(true);
      const res = await fetch(`${API_URL}/guides/upload`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentStep({ ...currentStep, image_path: data.path });
        toast.success('تم رفع الصورة بنجاح');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ في رفع الصورة');
    } finally {
      setUploadingImage(false);
    }
  };

  const addStep = async () => {
    if (!currentStep.title) {
      toast.error('يرجى إدخال عنوان الخطوة');
      return;
    }

    try {
      const stepData = {
        ...currentStep,
        guide_id: selectedGuide.id,
        step_number: steps.length + 1
      };

      const res = await fetch(`${API_URL}/guides/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stepData)
      });

      if (res.ok) {
        const newStep = await res.json();
        setSteps([...steps, newStep]);
        setCurrentStep({
          step_number: steps.length + 2,
          title: '',
          description: '',
          image_path: '',
          notes: ''
        });
        toast.success('تم إضافة الخطوة بنجاح');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ في إضافة الخطوة');
    }
  };

  const exportPDF = async (guideId) => {
    try {
      toast.loading('جاري إنشاء ملف PDF...', { id: 'pdf-export' });
      
      const response = await fetch(`${API_URL}/guides/${guideId}/pdf`);
      
      if (!response.ok) {
        throw new Error('فشل في إنشاء PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `guide_${guideId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('تم تنزيل الدليل بنجاح', { id: 'pdf-export' });
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ في تنزيل الدليل', { id: 'pdf-export' });
    }
  };

  const openDeleteModal = (guide) => {
    setGuideToDelete(guide);
    setShowDeleteModal(true);
  };

  const deleteGuide = async () => {
    if (!guideToDelete) return;

    try {
      const res = await fetch(`${API_URL}/guides/${guideToDelete.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        toast.success('تم حذف الدليل بنجاح');
        setShowDeleteModal(false);
        setGuideToDelete(null);
        fetchData();
        fetchStats();
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ في حذف الدليل');
    }
  };

  const getCategoryData = (categoryValue) => {
    return categories.find(c => c.value === categoryValue) || categories[categories.length - 1];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📚 أدلة المستخدم التعليمية</h1>
          <p className="text-gray-600 mt-1">إنشاء وإدارة أدلة الشرح للمستخدمين</p>
        </div>
        <button
          onClick={() => {
            setGuideForm({ title: '', category: '', description: '', created_by: '' });
            setShowModal(true);
          }}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition flex items-center gap-2 shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          إنشاء دليل جديد
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4 shadow-lg">
            <p className="text-3xl font-bold">{stats.total}</p>
            <p className="text-sm opacity-90">إجمالي الأدلة</p>
          </div>
          {stats.by_category?.slice(0, 4).map((cat) => {
            const catData = getCategoryData(cat.category);
            return (
              <div key={cat.category} className={`${catData.color} text-white rounded-xl p-4 shadow-lg`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{catData.icon}</span>
                  <p className="text-2xl font-bold">{cat.count}</p>
                </div>
                <p className="text-sm opacity-90">{catData.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الفئة</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">جميع الفئات</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">البحث</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث عن دليل..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Guides Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {guides.map((guide) => {
          const catData = getCategoryData(guide.category);
          return (
            <motion.div
              key={guide.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition"
            >
              <div className={`${catData.color} text-white p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl">{catData.icon}</span>
                  <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                    {guide.steps_count || 0} خطوة
                  </span>
                </div>
                <h3 className="font-bold text-lg">{guide.title}</h3>
              </div>
              
              <div className="p-4">
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {guide.description || 'لا يوجد وصف'}
                </p>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => exportPDF(guide.id)}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition text-sm flex items-center justify-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    تصدير PDF
                  </button>
                  <button
                    onClick={() => openDeleteModal(guide)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-red-100 hover:text-red-700 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {guides.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">لا توجد أدلة</p>
        </div>
      )}

      {/* Create Guide Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl">
                <h2 className="text-2xl font-bold">✏️ إنشاء دليل جديد</h2>
              </div>
              
              <form onSubmit={handleCreateGuide} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">عنوان الدليل *</label>
                    <input
                      type="text"
                      required
                      value={guideForm.title}
                      onChange={(e) => setGuideForm({ ...guideForm, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="مثال: طريقة إعداد البريد الإلكتروني"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">الفئة *</label>
                    <select
                      required
                      value={guideForm.category}
                      onChange={(e) => setGuideForm({ ...guideForm, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">اختر الفئة</option>
                      {categories.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.icon} {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">الوصف</label>
                    <textarea
                      value={guideForm.description}
                      onChange={(e) => setGuideForm({ ...guideForm, description: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows="3"
                      placeholder="وصف مختصر عن الدليل"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">اسم المُعد</label>
                    <input
                      type="text"
                      value={guideForm.created_by}
                      onChange={(e) => setGuideForm({ ...guideForm, created_by: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="اسمك"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    التالي - إضافة الخطوات
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Steps Modal */}
      <AnimatePresence>
        {showStepsModal && selectedGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-gradient-to-r from-green-600 to-teal-600 text-white p-6 rounded-t-2xl">
                <h2 className="text-2xl font-bold">📝 إضافة خطوات الشرح</h2>
                <p className="text-sm opacity-90 mt-1">{selectedGuide.title}</p>
              </div>
              
              <div className="p-6">
                {/* Steps List */}
                {steps.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-bold text-lg mb-3">الخطوات المضافة ({steps.length}):</h3>
                    <div className="space-y-2">
                      {steps.map((step, index) => (
                        <div key={step.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <span className="bg-green-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
                            {index + 1}
                          </span>
                          <span className="flex-1 font-medium">{step.title}</span>
                          {step.image_path && <span className="text-green-600">📷</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Current Step Form */}
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 mb-6">
                  <h3 className="font-bold text-lg mb-4">خطوة رقم {currentStep.step_number}</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">عنوان الخطوة *</label>
                      <input
                        type="text"
                        value={currentStep.title}
                        onChange={(e) => setCurrentStep({ ...currentStep, title: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="مثال: فتح إعدادات البريد"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">الشرح التفصيلي</label>
                      <textarea
                        value={currentStep.description}
                        onChange={(e) => setCurrentStep({ ...currentStep, description: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        rows="4"
                        placeholder="اشرح الخطوة بالتفصيل..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">صورة توضيحية</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                      {uploadingImage && <p className="text-sm text-blue-600 mt-2">جاري رفع الصورة...</p>}
                      {currentStep.image_path && (
                        <div className="mt-2">
                          <img 
                            src={`${window.location.protocol}//${window.location.hostname}:3000${currentStep.image_path}`} 
                            alt="Preview" 
                            className="w-32 h-32 object-cover rounded-lg border-2 border-green-500"
                          />
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات إضافية</label>
                      <textarea
                        value={currentStep.notes}
                        onChange={(e) => setCurrentStep({ ...currentStep, notes: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        rows="2"
                        placeholder="أي ملاحظات هامة..."
                      />
                    </div>
                  </div>
                  
                  <button
                    onClick={addStep}
                    className="w-full mt-4 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-medium flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    إضافة هذه الخطوة
                  </button>
                </div>
                
                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowStepsModal(false);
                      setSelectedGuide(null);
                      setSteps([]);
                      fetchData();
                    }}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    ✅ إنهاء وحفظ الدليل
                  </button>
                  {steps.length > 0 && (
                    <button
                      onClick={() => exportPDF(selectedGuide.id)}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    >
                      📄 تصدير PDF
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
              dir="rtl"
            >
              {/* Header with gradient */}
              <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">تأكيد الحذف</h3>
                    <p className="text-red-100 text-sm">هذا الإجراء لا يمكن التراجع عنه</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {guideToDelete && (
                  <div className="mb-6">
                    <p className="text-gray-700 mb-4">
                      هل أنت متأكد من حذف الدليل التالي؟
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4 border-r-4 border-red-500">
                      <div className="flex items-start gap-3">
                        <span className="text-3xl">
                          {categories.find(c => c.value === guideToDelete.category)?.icon || '📁'}
                        </span>
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900">{guideToDelete.title}</h4>
                          <p className="text-sm text-gray-500 mt-1">{guideToDelete.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                              {categories.find(c => c.value === guideToDelete.category)?.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div className="text-sm text-yellow-800">
                          <p className="font-semibold">تحذير:</p>
                          <p>سيتم حذف جميع الخطوات والصور المرتبطة بهذا الدليل بشكل نهائي</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setGuideToDelete(null);
                    }}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={deleteGuide}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    حذف نهائياً
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
