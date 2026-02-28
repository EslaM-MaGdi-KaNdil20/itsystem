import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';

const API_URL = `${window.location.protocol}//${window.location.hostname}:3000/api`;

const Subscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [showPassword, setShowPassword] = useState({});

  const [formData, setFormData] = useState({
    name: '',
    provider: '',
    subscription_type: '',
    cost: '',
    billing_cycle: 'monthly',
    start_date: '',
    end_date: '',
    auto_renew: true,
    login_url: '',
    username: '',
    password_encrypted: '',
    notes: '',
    status: 'active'
  });

  // Fetch subscriptions
  const fetchSubscriptions = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      
      const response = await fetch(`${API_URL}/subscriptions?${params.toString()}`);
      const data = await response.json();
      setSubscriptions(data);
    } catch (error) {
      console.error('Error:', error);
      toast.error('فشل في تحميل الاشتراكات');
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/subscriptions/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
    fetchStats();
  }, [filterStatus]);

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingSubscription 
        ? `${API_URL}/subscriptions/${editingSubscription.id}`
        : `${API_URL}/subscriptions`;
      
      const method = editingSubscription ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success(editingSubscription ? 'تم تحديث الاشتراك بنجاح' : 'تم إضافة الاشتراك بنجاح');
        setShowAddModal(false);
        setShowEditModal(false);
        resetForm();
        fetchSubscriptions();
        fetchStats();
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ');
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الاشتراك؟')) return;
    
    try {
      const response = await fetch(`${API_URL}/subscriptions/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('تم حذف الاشتراك بنجاح');
        fetchSubscriptions();
        fetchStats();
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ في الحذف');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      provider: '',
      subscription_type: '',
      cost: '',
      billing_cycle: 'monthly',
      start_date: '',
      end_date: '',
      auto_renew: true,
      login_url: '',
      username: '',
      password_encrypted: '',
      notes: '',
      status: 'active'
    });
    setEditingSubscription(null);
  };

  const openEditModal = (subscription) => {
    setEditingSubscription(subscription);
    setFormData({
      name: subscription.name || '',
      provider: subscription.provider || '',
      subscription_type: subscription.subscription_type || '',
      cost: subscription.cost || '',
      billing_cycle: subscription.billing_cycle || 'monthly',
      start_date: subscription.start_date ? subscription.start_date.split('T')[0] : '',
      end_date: subscription.end_date ? subscription.end_date.split('T')[0] : '',
      auto_renew: subscription.auto_renew || false,
      login_url: subscription.login_url || '',
      username: subscription.username || '',
      password_encrypted: subscription.password_encrypted || '',
      notes: subscription.notes || '',
      status: subscription.status || 'active'
    });
    setShowEditModal(true);
  };

  const getStatusBadge = (status, alertStatus, daysRemaining) => {
    if (alertStatus === 'expired' || status === 'expired') {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">منتهي</span>;
    }
    if (alertStatus === 'expiring_soon') {
      return <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">ينتهي خلال أسبوع</span>;
    }
    if (alertStatus === 'expiring_month') {
      return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">ينتهي خلال شهر</span>;
    }
    if (status === 'active') {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">نشط</span>;
    }
    if (status === 'cancelled') {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">ملغي</span>;
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{status}</span>;
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('ar-EG');
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount);
  };

  const togglePasswordVisibility = (id) => {
    setShowPassword(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Export PDF
  const exportPDF = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      
      const response = await fetch(`${API_URL}/subscriptions/export/pdf?${params.toString()}`);
      
      if (!response.ok) throw new Error('Failed to generate PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subscriptions-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('تم تصدير التقرير بنجاح');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('فشل في تصدير التقرير');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6" dir="rtl">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">إدارة الاشتراكات</h1>
          <p className="text-gray-500 text-sm">إدارة ومتابعة جميع الاشتراكات والخدمات</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportPDF}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            تصدير PDF
          </button>
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            إضافة اشتراك
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border-r-4 border-blue-500">
            <h3 className="text-gray-500 text-sm">إجمالي الاشتراكات</h3>
            <p className="text-2xl font-bold text-gray-800">{stats.total_subscriptions}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-r-4 border-green-500">
            <h3 className="text-gray-500 text-sm">الاشتراكات النشطة</h3>
            <p className="text-2xl font-bold text-green-600">{stats.active_subscriptions}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-r-4 border-orange-500">
            <h3 className="text-gray-500 text-sm">تنتهي هذا الشهر</h3>
            <p className="text-2xl font-bold text-orange-600">{stats.expiring_month}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-r-4 border-purple-500">
            <h3 className="text-gray-500 text-sm">التكلفة الشهرية</h3>
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.monthly_cost)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex gap-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="expired">منتهي</option>
            <option value="cancelled">ملغي</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">الاشتراك</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">المزود</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">النوع</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">التكلفة</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">تاريخ الانتهاء</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">الحالة</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">بيانات الدخول</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {subscriptions.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                  لا توجد اشتراكات
                </td>
              </tr>
            ) : (
              subscriptions.map((sub) => (
                <motion.tr
                  key={sub.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{sub.name}</div>
                    {sub.auto_renew && (
                      <span className="text-xs text-green-600">تجديد تلقائي</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{sub.provider || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{sub.subscription_type || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="text-gray-800">{formatCurrency(sub.cost)}</div>
                    <div className="text-xs text-gray-500">{sub.billing_cycle === 'monthly' ? 'شهري' : sub.billing_cycle === 'yearly' ? 'سنوي' : sub.billing_cycle}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-800">{formatDate(sub.end_date)}</div>
                    {sub.days_remaining && (
                      <div className="text-xs text-gray-500">{sub.days_remaining} يوم متبقي</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(sub.status, sub.alert_status, sub.days_remaining)}
                  </td>
                  <td className="px-4 py-3">
                    {sub.login_url && (
                      <a href={sub.login_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm block">
                        رابط الدخول
                      </a>
                    )}
                    {sub.username && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">المستخدم:</span> {sub.username}
                      </div>
                    )}
                    {sub.password_encrypted && (
                      <div className="text-sm text-gray-600 flex items-center gap-2">
                        <span className="font-medium">كلمة المرور:</span>
                        <span>{showPassword[sub.id] ? sub.password_encrypted : '••••••'}</span>
                        <button onClick={() => togglePasswordVisibility(sub.id)} className="text-blue-600">
                          {showPassword[sub.id] ? '🙈' : '👁'}
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(sub)}
                        className="text-blue-600 hover:text-blue-800"
                        title="تعديل"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(sub.id)}
                        className="text-red-600 hover:text-red-800"
                        title="حذف"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(showAddModal || showEditModal) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-xl font-bold mb-4">
                {editingSubscription ? 'تعديل الاشتراك' : 'إضافة اشتراك جديد'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">اسم الاشتراك *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">المزود</label>
                    <input
                      type="text"
                      value={formData.provider}
                      onChange={(e) => setFormData({...formData, provider: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">نوع الاشتراك</label>
                    <input
                      type="text"
                      value={formData.subscription_type}
                      onChange={(e) => setFormData({...formData, subscription_type: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="مثال: برنامج، خدمة سحابية، دومين"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">التكلفة</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) => setFormData({...formData, cost: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">دورة الفوترة</label>
                    <select
                      value={formData.billing_cycle}
                      onChange={(e) => setFormData({...formData, billing_cycle: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="monthly">شهري</option>
                      <option value="quarterly">ربع سنوي</option>
                      <option value="yearly">سنوي</option>
                      <option value="one-time">مرة واحدة</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="active">نشط</option>
                      <option value="expired">منتهي</option>
                      <option value="cancelled">ملغي</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ البدء</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الانتهاء</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="auto_renew"
                    checked={formData.auto_renew}
                    onChange={(e) => setFormData({...formData, auto_renew: e.target.checked})}
                    className="rounded"
                  />
                  <label htmlFor="auto_renew" className="text-sm text-gray-700">تجديد تلقائي</label>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium text-gray-800 mb-3">بيانات الدخول</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">رابط الدخول</label>
                      <input
                        type="url"
                        value={formData.login_url}
                        onChange={(e) => setFormData({...formData, login_url: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
                      <input
                        type="password"
                        value={formData.password_encrypted}
                        onChange={(e) => setFormData({...formData, password_encrypted: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    rows="3"
                  ></textarea>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }}
                    className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingSubscription ? 'تحديث' : 'إضافة'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Subscriptions;
