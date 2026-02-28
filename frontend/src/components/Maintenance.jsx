import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';

const API_URL = `${window.location.protocol}//${window.location.hostname}:3000/api`;

const statusColors = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'قيد الانتظار' },
  in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'جاري العمل' },
  completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'مكتمل' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'ملغي' }
};

const maintenanceTypes = [
  'صيانة دورية',
  'إصلاح عطل',
  'تحديث برمجيات',
  'استبدال قطع',
  'تنظيف',
  'فحص',
  'أخرى'
];

export default function Maintenance() {
  const [records, setRecords] = useState([]);
  const [devices, setDevices] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  const [formData, setFormData] = useState({
    device_id: '',
    maintenance_type: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    performed_by: '',
    cost: '',
    status: 'pending',
    notes: ''
  });

  useEffect(() => {
    fetchData();
    fetchStats();
  }, [filterStatus]);

  const fetchData = async () => {
    try {
      let url = `/maintenance`;
      if (filterStatus) url += `?status=${filterStatus}`;
      
      const [recordsData, devicesData] = await Promise.all([
        apiGet(url),
        apiGet('/devices')
      ]);
      
      setRecords(recordsData);
      setDevices(devicesData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await apiGet(`/maintenance/stats?month=${selectedMonth}&year=${selectedYear}`);
      setStats(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRecord) {
        await apiPut(`/maintenance/${editingRecord.id}`, formData);
      } else {
        await apiPost('/maintenance', formData);
      }

      fetchData();
      fetchStats();
      closeModal();
      toast.success(editingRecord ? 'تم التحديث بنجاح' : 'تمت الإضافة بنجاح');
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'حدث خطأ');
    }
  };

  const openDeleteModal = (record) => {
    setRecordToDelete(record);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;

    try {
      await apiDelete(`/maintenance/${recordToDelete.id}`);
      fetchData();
      fetchStats();
      toast.success('تم الحذف بنجاح');
      setShowDeleteModal(false);
      setRecordToDelete(null);
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'حدث خطأ');
    }
  };

  const openModal = (record = null) => {
    if (record) {
      setEditingRecord(record);
      setFormData({
        device_id: record.device_id || '',
        maintenance_type: record.maintenance_type || '',
        description: record.description || '',
        start_date: record.start_date ? record.start_date.split('T')[0] : '',
        end_date: record.end_date ? record.end_date.split('T')[0] : '',
        performed_by: record.performed_by || '',
        cost: record.cost || '',
        status: record.status || 'pending',
        notes: record.notes || ''
      });
    } else {
      setEditingRecord(null);
      setFormData({
        device_id: '',
        maintenance_type: '',
        description: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        performed_by: '',
        cost: '',
        status: 'pending',
        notes: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRecord(null);
  };

  // Export Maintenance Report PDF
  const exportMaintenancePDF = async () => {
    try {
      toast.loading('جاري إنشاء تقرير الصيانة...', { id: 'pdf-export' });
      
      const queryParams = new URLSearchParams();
      if (filterStatus) queryParams.append('status', filterStatus);
      if (dateFrom) queryParams.append('start_date', dateFrom);
      if (dateTo) queryParams.append('end_date', dateTo);
      
      const response = await fetch(`${API_URL}/maintenance/export/pdf?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('فشل في إنشاء التقرير');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Create filename with filter info
      let filename = 'maintenance_report';
      if (dateFrom || dateTo) {
        filename += `_${dateFrom || 'start'}_to_${dateTo || 'end'}`;
      }
      if (filterStatus) {
        filename += `_${filterStatus}`;
      }
      filename += '.pdf';
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('تم تنزيل التقرير بنجاح', { id: 'pdf-export' });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('حدث خطأ في إنشاء التقرير', { id: 'pdf-export' });
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
    <div className="p-6">
      <Toaster position="top-center" />
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">سجل الصيانة</h1>
          <p className="text-gray-600 mt-1">متابعة صيانة الأجهزة</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportMaintenancePDF}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            تقرير PDF
          </button>
          <button
            onClick={() => openModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            إضافة صيانة
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-2xl font-bold text-gray-800">{stats.totals?.total_records || 0}</p>
            <p className="text-xs text-gray-500">إجمالي السجلات</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-2xl font-bold text-yellow-600">{stats.totals?.pending || 0}</p>
            <p className="text-xs text-gray-500">قيد الانتظار</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-2xl font-bold text-blue-600">{stats.totals?.in_progress || 0}</p>
            <p className="text-xs text-gray-500">جاري العمل</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-2xl font-bold text-green-600">{stats.totals?.completed || 0}</p>
            <p className="text-xs text-gray-500">مكتمل</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-2xl font-bold text-purple-600">{parseFloat(stats.totals?.total_cost || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-500">إجمالي التكلفة</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الحالة</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">كل الحالات</option>
              {Object.entries(statusColors).map(([key, value]) => (
                <option key={key} value={key}>{value.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">من تاريخ</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">إلى تاريخ</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterStatus('');
                setDateFrom('');
                setDateTo('');
              }}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              مسح الفلتر
            </button>
          </div>
        </div>
      </div>

      {/* Month/Year Stats Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <select
          value={selectedMonth}
          onChange={(e) => {
            setSelectedMonth(parseInt(e.target.value));
            fetchStats();
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {[...Array(12)].map((_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(2000, i).toLocaleDateString('ar-SA', { month: 'long' })}
            </option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={(e) => {
            setSelectedYear(parseInt(e.target.value));
            fetchStats();
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {[...Array(5)].map((_, i) => {
            const year = new Date().getFullYear() - 2 + i;
            return <option key={year} value={year}>{year}</option>;
          })}
        </select>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الجهاز</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">نوع الصيانة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الوصف</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">التاريخ</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الفني</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">التكلفة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الحالة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{record.device_type_ar}</p>
                      <p className="text-xs text-gray-500">{record.brand} {record.model}</p>
                      <p className="text-xs text-gray-400">{record.asset_tag}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{record.maintenance_type || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                    {record.description || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {record.start_date ? new Date(record.start_date).toLocaleDateString('ar-SA') : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">{record.performed_by || '-'}</td>
                  <td className="px-4 py-3 text-sm">{record.cost ? `${parseFloat(record.cost).toLocaleString()}` : '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      statusColors[record.status]?.bg
                    } ${statusColors[record.status]?.text}`}>
                      {statusColors[record.status]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => openModal(record)}
                        className="p-1.openDeleteModal(recor:text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {records.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-gray-500">لا توجد سجلات صيانة</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
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
                  {editingRecord ? 'تعديل سجل الصيانة' : 'إضافة صيانة جديدة'}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الجهاز *</label>
                  <select
                    value={formData.device_id}
                    onChange={(e) => setFormData({ ...formData, device_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={editingRecord}
                  >
                    <option value="">اختر الجهاز</option>
                    {devices.map(device => (
                      <option key={device.id} value={device.id}>
                        {device.device_type_ar} - {device.brand} {device.model} ({device.asset_tag || 'بدون Asset Tag'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">نوع الصيانة</label>
                  <select
                    value={formData.maintenance_type}
                    onChange={(e) => setFormData({ ...formData, maintenance_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">اختر النوع</option>
                    {maintenanceTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="3"
                    placeholder="وصف المشكلة أو العمل المطلوب..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ البدء</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الانتهاء</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الفني المسؤول</label>
                    <input
                      type="text"
                      value={formData.performed_by}
                      onChange={(e) => setFormData({ ...formData, performed_by: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">التكلفة</label>
                    <input
                      type="number"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Object.entries(statusColors).map(([key, value]) => (
                      <option key={key} value={key}>{value.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="2"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    {editingRecord ? 'تحديث' : 'إضافة'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition"
                  >

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
                  هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء.
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
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
