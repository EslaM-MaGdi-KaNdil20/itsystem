import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import ImportDepartmentsModal from './ImportDepartmentsModal';

const API_URL = `${window.location.protocol}//${window.location.hostname}:3000/api`;

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    location: '',
    manager_name: '',
    phone: ''
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${API_URL}/departments`);
      const data = await res.json();
      setDepartments(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingDept 
        ? `${API_URL}/departments/${editingDept.id}`
        : `${API_URL}/departments`;
      
      const res = await fetch(url, {
        method: editingDept ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        fetchDepartments();
        closeModal();
      } else {
        const error = await res.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const openDeleteModal = (dept) => {
    setDeptToDelete(dept);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deptToDelete) return;

    try {
      const res = await fetch(`${API_URL}/departments/${deptToDelete.id}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        fetchDepartments();
        setShowDeleteModal(false);
        setDeptToDelete(null);
        toast.success('تم حذف القسم بنجاح');
      } else {
        const error = await res.json();
        toast.error(error.error || 'حدث خطأ أثناء الحذف');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ غير متوقع');
    }
  };

  // Export to Excel
  const exportToExcel = async () => {
    try {
      toast.loading('جاري تحميل الملف...', { id: 'export' });
      const response = await fetch(`${API_URL}/departments/export/excel`);
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `departments_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('تم تحميل الملف بنجاح', { id: 'export' });
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ في تصدير الملف', { id: 'export' });
    }
  };

  const openModal = (dept = null) => {
    if (dept) {
      setEditingDept(dept);
      setFormData({
        name: dept.name || '',
        code: dept.code || '',
        location: dept.location || '',
        manager_name: dept.manager_name || '',
        phone: dept.phone || ''
      });
    } else {
      setEditingDept(null);
      setFormData({
        name: '',
        code: '',
        location: '',
        manager_name: '',
        phone: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDept(null);
    setFormData({
      name: '',
      code: '',
      location: '',
      manager_name: '',
      phone: ''
    });
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
          <h1 className="text-2xl font-bold text-gray-800">الأقسام</h1>
          <p className="text-gray-600 mt-1">إدارة أقسام الشركة</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            استيراد من Excel
          </button>
          <button
            onClick={exportToExcel}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            تصدير Excel
          </button>
          <button
            onClick={() => openModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            إضافة قسم
          </button>
        </div>
      </div>
      {/* Departments Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {departments.map((dept) => (
          <motion.div
            key={dept.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 hover:shadow-md transition"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-800 text-sm truncate" title={dept.name}>{dept.name}</h3>
                  {dept.code && <p className="text-[10px] text-gray-500 truncate">({dept.code})</p>}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => openModal(dept)}
                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={() => openDeleteModal(dept)}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="space-y-1.5 text-xs mb-2">
              {dept.location && (
                <div className="flex items-center gap-1.5 text-gray-600 truncate" title={dept.location}>
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="truncate">{dept.location}</span>
                </div>
              )}
              {dept.manager_name && (
                <div className="flex items-center gap-1.5 text-gray-600 truncate" title={dept.manager_name}>
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="truncate">{dept.manager_name}</span>
                </div>
              )}
              {dept.phone && (
                <div className="flex items-center gap-1.5 text-gray-600 truncate">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span dir="ltr" className="truncate">{dept.phone}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500">عدد الموظفين</span>
                <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                  {dept.employee_count || 0}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {departments.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-gray-500">لا توجد أقسام</p>
          <button
            onClick={() => openModal()}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            إضافة قسم جديد
          </button>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-xl"
            >
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingDept ? 'تعديل القسم' : 'إضافة قسم جديد'}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم القسم *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">كود القسم</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="مثال: IT, HR, FIN"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الموقع</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="مثال: الطابق الثاني - مبنى A"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">مدير القسم</label>
                  <input
                    type="text"
                    value={formData.manager_name}
                    onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    dir="ltr"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    {editingDept ? 'تحديث' : 'إضافة'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">تأكيد الحذف</h3>
                <p className="text-gray-500 mb-6">
                  هل أنت متأكد من حذف هذا القسم؟ لا يمكن التراجع عن هذا الإجراء.
                </p>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={confirmDelete}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition font-medium"
                  >
                    نعم، احذف
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition font-medium"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Import Modal */}
      <ImportDepartmentsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={fetchDepartments}
      />
    </div>
  );
}
