import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ImportEmployeesModal from './ImportEmployeesModal';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';

export default function Employees() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [editingEmp, setEditingEmp] = useState(null);
  const [filterDept, setFilterDept] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    employee_code: '',
    full_name: '',
    department_id: '',
    job_title: '',
    email: '',
    phone: '',
    extension: '',
    hire_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, [filterDept]);

  const fetchEmployees = async () => {
    try {
      let url = `/employees`;
      if (filterDept) url += `?department_id=${filterDept}`;
      const data = await apiGet(url);
      setEmployees(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const data = await apiGet('/departments');
      setDepartments(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingEmp) {
        await apiPut(`/employees/${editingEmp.id}`, formData);
      } else {
        await apiPost('/employees', formData);
      }

      fetchEmployees();
      closeModal();
      toast.success(editingEmp ? 'تم التحديث بنجاح' : 'تمت الإضافة بنجاح');
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'حدث خطأ');
    }
  };

  const confirmDelete = async () => {
    if (!employeeToDelete) return;
    
    try {
      await apiDelete(`/employees/${employeeToDelete.id}`);
      fetchEmployees();
      toast.success('تم حذف الموظف بنجاح');
      setShowDeleteModal(false);
      setEmployeeToDelete(null);
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'حدث خطأ أثناء الحذف');
    }
  };

  const openDeleteModal = (emp) => {
    setEmployeeToDelete(emp);
    setShowDeleteModal(true);
  };

  // Export to Excel
  const exportToExcel = async () => {
    try {
      toast.loading('جاري تحميل الملف...', { id: 'export' });
      const response = await fetch(`${window.location.protocol}//${window.location.hostname}:3000/api/employees/export/excel`);
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employees_${new Date().toISOString().split('T')[0]}.xlsx`;
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

  // Export to PDF
  const exportToPDF = async () => {
    try {
      toast.loading('جاري إنشاء التقرير...', { id: 'export-pdf' });
      const response = await fetch(`${window.location.protocol}//${window.location.hostname}:3000/api/employees/export/pdf`);
      if (!response.ok) throw new Error('PDF export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employees_report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('تم تحميل التقرير بنجاح', { id: 'export-pdf' });
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ في إنشاء التقرير', { id: 'export-pdf' });
    }
  };

  const openModal = (emp = null) => {
    if (emp) {
      setEditingEmp(emp);
      setFormData({
        employee_code: emp.employee_code || '',
        full_name: emp.full_name || '',
        department_id: emp.department_id || '',
        job_title: emp.job_title || '',
        email: emp.email || '',
        phone: emp.phone || '',
        extension: emp.extension || '',
        hire_date: emp.hire_date ? emp.hire_date.split('T')[0] : '',
        notes: emp.notes || ''
      });
    } else {
      setEditingEmp(null);
      setFormData({
        employee_code: '',
        full_name: '',
        department_id: '',
        job_title: '',
        email: '',
        phone: '',
        extension: '',
        hire_date: '',
        notes: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEmp(null);
  };

  const filteredEmployees = employees.filter(emp => 
    emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.employee_code && emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">الموظفين</h1>
          <p className="text-gray-600 mt-1">إدارة بيانات الموظفين</p>
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
            onClick={exportToPDF}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            تصدير PDF
          </button>
          <button
            onClick={() => openModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            إضافة موظف
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="بحث بالاسم أو الكود أو البريد..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">كل الأقسام</option>
          {departments.map(dept => (
            <option key={dept.id} value={dept.id}>{dept.name}</option>
          ))}
        </select>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الكود</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الاسم</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">القسم</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">المسمى الوظيفي</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">التحويلة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الأجهزة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEmployees.map((emp) => (
                <motion.tr
                  key={emp.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {emp.employee_code || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">
                          {emp.full_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{emp.full_name}</p>
                        {emp.email && (
                          <p className="text-xs text-gray-500">{emp.email}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {emp.department_name || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {emp.job_title || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600" dir="ltr">
                    {emp.extension || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      emp.device_count > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {emp.device_count || 0} جهاز
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => navigate(`/employees/${emp.id}`)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                        title="ملف الموظف"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => openModal(emp)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="تعديل"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => openDeleteModal(emp)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="حذف"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredEmployees.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-gray-500">لا يوجد موظفين</p>
          </div>
        )}
      </div>

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
              className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-100 sticky top-0 bg-white">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingEmp ? 'تعديل الموظف' : 'إضافة موظف جديد'}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">كود الموظف</label>
                    <input
                      type="text"
                      value={formData.employee_code}
                      onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل *</label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">القسم</label>
                    <select
                      value={formData.department_id}
                      onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">اختر القسم</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">المسمى الوظيفي</label>
                    <input
                      type="text"
                      value={formData.job_title}
                      onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    dir="ltr"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">التحويلة</label>
                    <input
                      type="text"
                      value={formData.extension}
                      onChange={(e) => setFormData({ ...formData, extension: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ التعيين</label>
                  <input
                    type="date"
                    value={formData.hire_date}
                    onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="3"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    {editingEmp ? 'تحديث' : 'إضافة'}
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
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
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
              className="bg-white rounded-xl w-full max-w-md shadow-xl overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">تأكيد الحذف</h3>
                <p className="text-gray-600 mb-6">
                  هل أنت متأكد من حذف الموظف 
                  <span className="font-bold text-gray-800 px-1">
                    {employeeToDelete?.full_name}
                  </span>
                  ؟ لا يمكن التراجع عن هذا الإجراء.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                  >
                    حذف الموظف
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Modal */}
      <ImportEmployeesModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={fetchEmployees}
      />
    </div>
  );
}
