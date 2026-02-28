import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';

const API_URL = `${window.location.protocol}//${window.location.hostname}:3000/api`;

export default function AccessoryStock() {
  const [accessories, setAccessories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stock'); // 'stock', 'assignments', 'movements'
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedAccessory, setSelectedAccessory] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [movements, setMovements] = useState([]);
  
  const [assignForm, setAssignForm] = useState({
    accessory_id: '',
    employee_id: '',
    quantity: 1,
    serial_number: '',
    condition: 'new',
    assigned_by: '',
    notes: ''
  });
  
  const [stockForm, setStockForm] = useState({
    quantity: 0,
    type: 'add',
    notes: '',
    created_by: ''
  });

  const [returnForm, setReturnForm] = useState({
    returned_condition: 'good',
    return_notes: ''
  });

  const [accessoryForm, setAccessoryForm] = useState({
    name: '',
    name_ar: '',
    category: 'general',
    description: '',
    stock_quantity: 0,
    min_stock_level: 5,
    unit_price: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [stockRes, employeesRes, assignmentsRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/accessory-stock/stock`),
        fetch(`${API_URL}/employees`),
        fetch(`${API_URL}/accessory-stock/assignments?status=active`),
        fetch(`${API_URL}/accessory-stock/stock/summary`)
      ]);
      
      setAccessories(await stockRes.json());
      setEmployees(await employeesRes.json());
      setAssignments(await assignmentsRes.json());
      setSummary(await summaryRes.json());
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async (accessoryId = null) => {
    try {
      const url = accessoryId 
        ? `${API_URL}/accessory-stock/stock/movements?accessory_id=${accessoryId}`
        : `${API_URL}/accessory-stock/stock/movements`;
      const res = await fetch(url);
      setMovements(await res.json());
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/accessory-stock/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignForm)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success('تم تسليم الملحق بنجاح');
        setShowAssignModal(false);
        resetAssignForm();
        fetchData();
      } else {
        toast.error(data.error || 'حدث خطأ في التسليم');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ في الاتصال');
    }
  };

  const handleUpdateStock = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/accessory-stock/stock/${selectedAccessory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stockForm)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message);
        setShowStockModal(false);
        setSelectedAccessory(null);
        setStockForm({ quantity: 0, type: 'add', notes: '', created_by: '' });
        fetchData();
      } else {
        toast.error(data.error || 'حدث خطأ في تحديث المخزون');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ في الاتصال');
    }
  };

  const handleReturn = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/accessory-stock/return/${selectedAssignment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(returnForm)
      });
      
      if (res.ok) {
        toast.success('تم استرجاع الملحق بنجاح');
        setShowReturnModal(false);
        setSelectedAssignment(null);
        setReturnForm({ returned_condition: 'good', return_notes: '' });
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'حدث خطأ في الاسترجاع');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ في الاتصال');
    }
  };

  const resetAssignForm = () => {
    setAssignForm({
      accessory_id: '',
      employee_id: '',
      quantity: 1,
      serial_number: '',
      condition: 'new',
      assigned_by: '',
      notes: ''
    });
  };


  const resetAccessoryForm = () => {
    setAccessoryForm({
      name: '',
      name_ar: '',
      category: 'general',
      description: '',
      stock_quantity: 0,
      min_stock_level: 5,
      unit_price: 0
    });
  };

  const handleAddAccessory = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/accessory-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accessoryForm)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('تم إضافة الملحق بنجاح');
        setShowAddModal(false);
        resetAccessoryForm();
        fetchData();
      } else {
        toast.error(data.error || 'حدث خطأ');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ في الاتصال');
    }
  };

  const handleEditAccessory = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/accessory-stock/${selectedAccessory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accessoryForm)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('تم تحديث الملحق بنجاح');
        setShowEditModal(false);
        setSelectedAccessory(null);
        resetAccessoryForm();
        fetchData();
      } else {
        toast.error(data.error || 'حدث خطأ');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ في الاتصال');
    }
  };

  const handleDeleteAccessory = async () => {
    try {
      const res = await fetch(`${API_URL}/accessory-stock/${selectedAccessory.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('تم حذف الملحق بنجاح');
        setShowDeleteConfirm(false);
        setSelectedAccessory(null);
        fetchData();
      } else {
        toast.error(data.error || 'حدث خطأ');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ في الاتصال');
    }
  };

  const openEditModal = (accessory) => {
    setSelectedAccessory(accessory);
    setAccessoryForm({
      name: accessory.name,
      name_ar: accessory.name_ar,
      category: accessory.category,
      description: accessory.description || '',
      stock_quantity: accessory.stock_quantity,
      min_stock_level: accessory.min_stock_level,
      unit_price: accessory.unit_price || 0
    });
    setShowEditModal(true);
  };

  const openDeleteConfirm = (accessory) => {
    setSelectedAccessory(accessory);
    setShowDeleteConfirm(true);
  };
  const openStockModal = (accessory) => {
    setSelectedAccessory(accessory);
    setStockForm({ quantity: 0, type: 'add', notes: '', created_by: '' });
    setShowStockModal(true);
  };

  const openReturnModal = (assignment) => {
    setSelectedAssignment(assignment);
    setReturnForm({ returned_condition: 'good', return_notes: '' });
    setShowReturnModal(true);
  };

  const getStockStatusColor = (qty, minLevel) => {
    if (qty === 0) return 'text-red-600 bg-red-50';
    if (qty <= minLevel) return 'text-amber-600 bg-amber-50';
    return 'text-green-600 bg-green-50';
  };

  const getCategoryIcon = (category) => {
    const icons = {
      input: '🖱️',
      display: '🖥️',
      cable: '🔌',
      power: '🔋',
      accessory: '📦',
      audio: '🎧',
      video: '📷'
    };
    return icons[category] || '📦';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans" dir="rtl">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">إدارة مخزون الملحقات</h1>
        <p className="text-gray-500">تتبع المخزون وتسليم الملحقات للموظفين</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <span className="text-2xl">📦</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">أنواع الملحقات</p>
                <p className="text-2xl font-bold text-gray-800">{summary.total_types}</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-3 rounded-lg">
                <span className="text-2xl">✅</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">إجمالي المخزون</p>
                <p className="text-2xl font-bold text-green-600">{summary.total_in_stock || 0}</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-3 rounded-lg">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">مخزون منخفض</p>
                <p className="text-2xl font-bold text-amber-600">{summary.low_stock_count || 0}</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-3 rounded-lg">
                <span className="text-2xl">❌</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">نفذ من المخزون</p>
                <p className="text-2xl font-bold text-red-600">{summary.out_of_stock_count || 0}</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-3 rounded-lg">
                <span className="text-2xl">👤</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">ملحقات مسلمة</p>
                <p className="text-2xl font-bold text-purple-600">{summary.active_assignments || 0}</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setShowAssignModal(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          تسليم ملحق لموظف
        </button>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg shadow-green-200 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          إضافة ملحق جديد
        </button>
        
        {/* Export Buttons */}
        <button
          onClick={() => window.open(`${API_URL}/accessory-stock/export/excel`, '_blank')}
          className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-200 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          تصدير Excel
        </button>
        <button
          onClick={() => window.open(`${API_URL}/accessory-stock/export/pdf`, '_blank')}
          className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-medium hover:from-red-600 hover:to-rose-700 transition-all shadow-lg shadow-red-200 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          تصدير PDF
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white rounded-xl p-1.5 shadow-sm w-fit">
        <button
          onClick={() => setActiveTab('stock')}
          className={`px-5 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'stock' 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          المخزون
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`px-5 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'assignments' 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          التسليمات الحالية
        </button>
        <button
          onClick={() => { setActiveTab('movements'); fetchMovements(); }}
          className={`px-5 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'movements' 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          سجل الحركات
        </button>
      </div>

      {/* Stock Tab */}
      {activeTab === 'stock' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-right py-4 px-6 font-semibold text-gray-600">الملحق</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-600">التصنيف</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-600">المخزون</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-600">الحد الأدنى</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-600">مسلم (مع أجهزة)</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-600">مسلم (منفرد)</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-600">الحالة</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-600">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {accessories.map((acc, index) => (
                  <motion.tr
                    key={acc.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getCategoryIcon(acc.category)}</span>
                        <div>
                          <p className="font-semibold text-gray-800">{acc.name_ar}</p>
                          <p className="text-xs text-gray-400">{acc.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {acc.category}
                      </span>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${getStockStatusColor(acc.stock_quantity, acc.min_stock_level)}`}>
                        {acc.stock_quantity || 0}
                      </span>
                    </td>
                    <td className="text-center py-4 px-4 text-gray-500">
                      {acc.min_stock_level}
                    </td>
                    <td className="text-center py-4 px-4 text-blue-600 font-medium">
                      {acc.with_devices_count || 0}
                    </td>
                    <td className="text-center py-4 px-4 text-purple-600 font-medium">
                      {acc.assigned_count || 0}
                    </td>
                    <td className="text-center py-4 px-4">
                      {acc.stock_quantity === 0 ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">نفذ</span>
                      ) : acc.stock_quantity <= acc.min_stock_level ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-600">منخفض</span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600">متوفر</span>
                      )}
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openStockModal(acc)}
                          className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                        >
                          المخزون
                        </button>
                        <button
                          onClick={() => openEditModal(acc)}
                          className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => openDeleteConfirm(acc)}
                          className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assignments Tab */}
      {activeTab === 'assignments' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {assignments.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-6xl mb-4 block">📭</span>
              <p className="text-gray-500">لا توجد تسليمات حالية</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-right py-4 px-6 font-semibold text-gray-600">الملحق</th>
                    <th className="text-right py-4 px-4 font-semibold text-gray-600">الموظف</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-600">القسم</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-600">الكمية</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-600">تاريخ التسليم</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-600">الحالة</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-600">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment, index) => (
                    <motion.tr
                      key={assignment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getCategoryIcon(assignment.accessory_category)}</span>
                          <div>
                            <p className="font-semibold text-gray-800">{assignment.accessory_name_ar}</p>
                            {assignment.serial_number && (
                              <p className="text-xs text-gray-400">S/N: {assignment.serial_number}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-medium text-gray-800">{assignment.employee_name}</p>
                        <p className="text-xs text-gray-400">{assignment.employee_code}</p>
                      </td>
                      <td className="text-center py-4 px-4 text-gray-600">
                        {assignment.department_name || '-'}
                      </td>
                      <td className="text-center py-4 px-4">
                        <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">
                          {assignment.quantity}
                        </span>
                      </td>
                      <td className="text-center py-4 px-4 text-gray-500 text-sm">
                        {new Date(assignment.assigned_date).toLocaleDateString('ar-SA')}
                      </td>
                      <td className="text-center py-4 px-4">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600">
                          {assignment.condition === 'new' ? 'جديد' : assignment.condition}
                        </span>
                      </td>
                      <td className="text-center py-4 px-4">
                        <button
                          onClick={() => openReturnModal(assignment)}
                          className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors"
                        >
                          استرجاع
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Movements Tab */}
      {activeTab === 'movements' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {movements.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-6xl mb-4 block">📋</span>
              <p className="text-gray-500">لا توجد حركات مسجلة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-right py-4 px-6 font-semibold text-gray-600">التاريخ</th>
                    <th className="text-right py-4 px-4 font-semibold text-gray-600">الملحق</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-600">نوع الحركة</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-600">الكمية</th>
                    <th className="text-right py-4 px-4 font-semibold text-gray-600">ملاحظات</th>
                    <th className="text-right py-4 px-4 font-semibold text-gray-600">بواسطة</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement, index) => (
                    <motion.tr
                      key={movement.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="py-4 px-6 text-sm text-gray-500">
                        {new Date(movement.created_at).toLocaleDateString('ar-SA')}
                        <br />
                        <span className="text-xs">{new Date(movement.created_at).toLocaleTimeString('ar-SA')}</span>
                      </td>
                      <td className="py-4 px-4 font-medium text-gray-800">
                        {movement.accessory_name}
                      </td>
                      <td className="text-center py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          movement.movement_type === 'in' ? 'bg-green-100 text-green-600' :
                          movement.movement_type === 'out' ? 'bg-red-100 text-red-600' :
                          movement.movement_type === 'return' ? 'bg-blue-100 text-blue-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {movement.movement_type === 'in' ? '⬆️ وارد' :
                           movement.movement_type === 'out' ? '⬇️ صادر' :
                           movement.movement_type === 'return' ? '↩️ مرتجع' :
                           '⚙️ تعديل'}
                        </span>
                      </td>
                      <td className="text-center py-4 px-4">
                        <span className={`font-bold ${
                          movement.movement_type === 'in' || movement.movement_type === 'return' 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {movement.movement_type === 'in' || movement.movement_type === 'return' ? '+' : '-'}
                          {movement.quantity}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500">
                        {movement.notes || '-'}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500">
                        {movement.created_by || '-'}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Assign Modal */}
      <AnimatePresence>
        {showAssignModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowAssignModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="bg-gradient-to-l from-blue-600 to-indigo-700 p-6 text-white">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <span className="text-2xl">📦</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">تسليم ملحق لموظف</h2>
                    <p className="text-blue-100 text-sm">تسليم ملحق منفرد بدون جهاز</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleAssign} className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الملحق</label>
                    <select
                      value={assignForm.accessory_id}
                      onChange={(e) => setAssignForm({ ...assignForm, accessory_id: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">اختر الملحق</option>
                      {accessories.filter(a => a.stock_quantity > 0).map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name_ar} (متوفر: {acc.stock_quantity})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الموظف</label>
                    <select
                      value={assignForm.employee_id}
                      onChange={(e) => setAssignForm({ ...assignForm, employee_id: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">اختر الموظف</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.full_name} {emp.department_name ? `- ${emp.department_name}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الكمية</label>
                    <input
                      type="number"
                      min="1"
                      value={assignForm.quantity}
                      onChange={(e) => setAssignForm({ ...assignForm, quantity: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الحالة</label>
                    <select
                      value={assignForm.condition}
                      onChange={(e) => setAssignForm({ ...assignForm, condition: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="new">جديد</option>
                      <option value="good">جيد</option>
                      <option value="used">مستعمل</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">تم التسليم بواسطة</label>
                    <input
                      type="text"
                      value={assignForm.assigned_by}
                      onChange={(e) => setAssignForm({ ...assignForm, assigned_by: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="اسم الموظف المسؤول"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">ملاحظات</label>
                    <textarea
                      value={assignForm.notes}
                      onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows="2"
                      placeholder="ملاحظات إضافية..."
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => { setShowAssignModal(false); resetAssignForm(); }}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all"
                  >
                    تأكيد التسليم
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stock Update Modal */}
      <AnimatePresence>
        {showStockModal && selectedAccessory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowStockModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="bg-gradient-to-l from-teal-600 to-emerald-700 p-6 text-white">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <span className="text-2xl">{getCategoryIcon(selectedAccessory.category)}</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">تعديل المخزون</h2>
                    <p className="text-emerald-100 text-sm">{selectedAccessory.name_ar}</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleUpdateStock} className="p-6 space-y-5">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-500 mb-1">المخزون الحالي</p>
                  <p className="text-3xl font-bold text-gray-800">{selectedAccessory.stock_quantity || 0}</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">نوع العملية</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'add', label: 'إضافة', icon: '➕', color: 'green' },
                      { value: 'subtract', label: 'سحب', icon: '➖', color: 'red' },
                      { value: 'set', label: 'تعيين', icon: '✏️', color: 'blue' }
                    ].map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setStockForm({ ...stockForm, type: option.value })}
                        className={`p-3 rounded-xl border-2 transition-all ${
                          stockForm.type === option.value
                            ? `border-${option.color}-500 bg-${option.color}-50`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-xl block mb-1">{option.icon}</span>
                        <span className="text-sm font-medium">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">الكمية</label>
                  <input
                    type="number"
                    min="0"
                    value={stockForm.quantity}
                    onChange={(e) => setStockForm({ ...stockForm, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-center text-2xl font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">بواسطة</label>
                  <input
                    type="text"
                    value={stockForm.created_by}
                    onChange={(e) => setStockForm({ ...stockForm, created_by: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="اسم المسؤول"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">ملاحظات</label>
                  <input
                    type="text"
                    value={stockForm.notes}
                    onChange={(e) => setStockForm({ ...stockForm, notes: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="سبب التعديل..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowStockModal(false)}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] px-4 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-medium hover:from-teal-700 hover:to-emerald-700 transition-all"
                  >
                    حفظ التعديل
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Return Modal */}
      <AnimatePresence>
        {showReturnModal && selectedAssignment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowReturnModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="bg-gradient-to-l from-amber-500 to-orange-600 p-6 text-white">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <span className="text-2xl">↩️</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">استرجاع ملحق</h2>
                    <p className="text-amber-100 text-sm">{selectedAssignment.accessory_name_ar}</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleReturn} className="p-6 space-y-5">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">الموظف</p>
                      <p className="font-semibold text-gray-800">{selectedAssignment.employee_name}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">الكمية</p>
                      <p className="font-semibold text-gray-800">{selectedAssignment.quantity}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">تاريخ التسليم</p>
                      <p className="font-semibold text-gray-800">
                        {new Date(selectedAssignment.assigned_date).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">حالة الملحق عند الاسترجاع</label>
                  <select
                    value={returnForm.returned_condition}
                    onChange={(e) => setReturnForm({ ...returnForm, returned_condition: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="good">جيد - يعود للمخزون</option>
                    <option value="damaged">تالف - لا يعود للمخزون</option>
                    <option value="lost">مفقود - لا يعود للمخزون</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">ملاحظات</label>
                  <textarea
                    value={returnForm.return_notes}
                    onChange={(e) => setReturnForm({ ...returnForm, return_notes: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    rows="2"
                    placeholder="ملاحظات عن حالة الملحق..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowReturnModal(false)}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-700 transition-all"
                  >
                    تأكيد الاسترجاع
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Accessory Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
                <h3 className="text-xl font-bold">إضافة ملحق جديد</h3>
                <p className="text-green-100 mt-1">أضف نوع جديد من الملحقات للمخزون</p>
              </div>
              <form onSubmit={handleAddAccessory} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم (إنجليزي) *</label>
                    <input
                      type="text"
                      value={accessoryForm.name}
                      onChange={(e) => setAccessoryForm({ ...accessoryForm, name: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Mouse"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم (عربي) *</label>
                    <input
                      type="text"
                      value={accessoryForm.name_ar}
                      onChange={(e) => setAccessoryForm({ ...accessoryForm, name_ar: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="ماوس"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">التصنيف *</label>
                  <select
                    value={accessoryForm.category}
                    onChange={(e) => setAccessoryForm({ ...accessoryForm, category: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  >
                    <option value="">اختر التصنيف</option>
                    <option value="input">أجهزة إدخال</option>
                    <option value="display">شاشات</option>
                    <option value="cable">كابلات</option>
                    <option value="power">طاقة</option>
                    <option value="audio">صوتيات</option>
                    <option value="video">فيديو</option>
                    <option value="accessory">ملحقات</option>
                    <option value="general">عام</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الكمية *</label>
                    <input
                      type="number"
                      value={accessoryForm.stock_quantity}
                      onChange={(e) => setAccessoryForm({ ...accessoryForm, stock_quantity: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      min="0"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الحد الأدنى</label>
                    <input
                      type="number"
                      value={accessoryForm.min_stock_level}
                      onChange={(e) => setAccessoryForm({ ...accessoryForm, min_stock_level: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">السعر</label>
                    <input
                      type="number"
                      value={accessoryForm.unit_price}
                      onChange={(e) => setAccessoryForm({ ...accessoryForm, unit_price: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transition-all"
                  >
                    إضافة الملحق
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Accessory Modal */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 text-white">
                <h3 className="text-xl font-bold">تعديل الملحق</h3>
                <p className="text-amber-100 mt-1">تعديل بيانات الملحق</p>
              </div>
              <form onSubmit={handleEditAccessory} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم (إنجليزي) *</label>
                    <input
                      type="text"
                      value={accessoryForm.name}
                      onChange={(e) => setAccessoryForm({ ...accessoryForm, name: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم (عربي) *</label>
                    <input
                      type="text"
                      value={accessoryForm.name_ar}
                      onChange={(e) => setAccessoryForm({ ...accessoryForm, name_ar: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">التصنيف *</label>
                  <select
                    value={accessoryForm.category}
                    onChange={(e) => setAccessoryForm({ ...accessoryForm, category: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    required
                  >
                    <option value="">اختر التصنيف</option>
                    <option value="input">أجهزة إدخال</option>
                    <option value="display">شاشات</option>
                    <option value="cable">كابلات</option>
                    <option value="power">طاقة</option>
                    <option value="audio">صوتيات</option>
                    <option value="video">فيديو</option>
                    <option value="accessory">ملحقات</option>
                    <option value="general">عام</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الحد الأدنى</label>
                    <input
                      type="number"
                      value={accessoryForm.min_stock_level}
                      onChange={(e) => setAccessoryForm({ ...accessoryForm, min_stock_level: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">السعر</label>
                    <input
                      type="number"
                      value={accessoryForm.unit_price}
                      onChange={(e) => setAccessoryForm({ ...accessoryForm, unit_price: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-700 transition-all"
                  >
                    حفظ التعديلات
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-red-500 to-rose-600 p-6 text-white text-center">
                <span className="text-5xl mb-2 block">⚠️</span>
                <h3 className="text-xl font-bold">تأكيد الحذف</h3>
              </div>
              <div className="p-6 text-center">
                <p className="text-gray-600 mb-2">هل أنت متأكد من حذف الملحق:</p>
                <p className="text-lg font-bold text-gray-800">{selectedAccessory?.name_ar || selectedAccessory?.name}</p>
                <p className="text-sm text-red-500 mt-4">⚠️ سيتم حذف جميع البيانات المرتبطة بهذا الملحق</p>
                
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleDeleteAccessory}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-medium hover:from-red-600 hover:to-rose-700 transition-all"
                  >
                    حذف
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
