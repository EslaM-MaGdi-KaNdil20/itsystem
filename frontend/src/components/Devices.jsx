import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';
import ImportDevicesModal from './ImportDevicesModal';

const API_URL = `${window.location.protocol}//${window.location.hostname}:3000/api`;

// Device type icons
const deviceIcons = {
  computer: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  laptop: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  monitor: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  printer: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
  ),
  server: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
    </svg>
  ),
  switch: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  phone: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
  camera: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  router: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
    </svg>
  ),
  wifi: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
    </svg>
  ),
  ups: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  scanner: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  other: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  )
};

const statusColors = {
  available: { bg: 'bg-green-100', text: 'text-green-700', label: 'متاح' },
  assigned: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'مسلم' },
  maintenance: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'صيانة' },
  retired: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'متقاعد' },
  disposed: { bg: 'bg-red-100', text: 'text-red-700', label: 'مستهلك' }
};

const getWarrantyBadge = (warranty_end) => {
  if (!warranty_end) return null;
  const days = Math.round((new Date(warranty_end) - new Date()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { text: `انتهى الضمان`, cls: 'bg-red-100 text-red-700 border border-red-200', urgent: true };
  if (days <= 30) return { text: `ضمان: ${days} يوم`, cls: 'bg-red-100 text-red-700 border border-red-200', urgent: true };
  if (days <= 60) return { text: `ضمان: ${days} يوم`, cls: 'bg-orange-100 text-orange-700 border border-orange-200', urgent: false };
  return null;
};

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [deviceTypes, setDeviceTypes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [qrDevice, setQrDevice] = useState(null);
  const [editingDevice, setEditingDevice] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // grid or table
  const [timelineDevice, setTimelineDevice] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const openTimeline = async (device) => {
    setTimelineDevice(device);
    setTimelineData(null);
    setTimelineLoading(true);
    try {
      const res = await fetch(`${API_URL}/devices/${device.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setTimelineData(data);
    } catch (e) {
      console.error('Error loading timeline', e);
    } finally {
      setTimelineLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    device_type_id: '',
    asset_tag: '',
    brand: '',
    model: '',
    serial_number: '',
    cpu: '',
    ram: '',
    storage: '',
    os: '',
    ip_address: '',
    mac_address: '',
    purchase_date: '',
    warranty_end: '',
    purchase_price: '',
    supplier: '',
    status: 'available',
    condition: 'good',
    location: '',
    notes: ''
  });

  useEffect(() => {
    fetchDeviceTypes();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [filterType, filterStatus]);

  const fetchDeviceTypes = async () => {
    try {
      const data = await apiGet('/devices/types');
      setDeviceTypes(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchDevices = async () => {
    try {
      let url = `/devices?`;
      if (filterType) url += `device_type_id=${filterType}&`;
      if (filterStatus) url += `status=${filterStatus}`;
      
      const data = await apiGet(url);
      setDevices(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await apiGet('/devices/stats');
      setStats(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDevice) {
        await apiPut(`/devices/${editingDevice.id}`, formData);
      } else {
        await apiPost('/devices', formData);
      }

      fetchDevices();
      fetchStats();
      closeModal();
      toast.success(editingDevice ? 'تم التحديث بنجاح' : 'تمت الإضافة بنجاح');
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'حدث خطأ');
    }
  };

  const openDeleteModal = (device) => {
    setDeviceToDelete(device);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deviceToDelete) return;

    try {
      await apiDelete(`/devices/${deviceToDelete.id}`);
      fetchDevices();
      fetchStats();
      toast.success('تم الحذف بنجاح');
      setShowDeleteModal(false);
      setDeviceToDelete(null);
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'حدث خطأ');
    }
  };


  // Export to Excel
  const exportToExcel = async () => {
    try {
      toast.loading('جاري تحميل الملف...', { id: 'export' });
      const response = await fetch(`${API_URL}/devices/export/excel`);
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `devices_${new Date().toISOString().split('T')[0]}.xlsx`;
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
      toast.loading('جاري إنشاء التقرير...', { id: 'pdf' });
      const response = await fetch(`${API_URL}/devices/export/pdf`);
      if (!response.ok) throw new Error('PDF Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `devices_report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('تم إنشاء التقرير بنجاح', { id: 'pdf' });
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ في إنشاء التقرير', { id: 'pdf' });
    }
  };
  const openModal = (device = null) => {
    if (device) {
      setEditingDevice(device);
      setFormData({
        device_type_id: device.device_type_id || '',
        asset_tag: device.asset_tag || '',
        brand: device.brand || '',
        model: device.model || '',
        serial_number: device.serial_number || '',
        cpu: device.cpu || '',
        ram: device.ram || '',
        storage: device.storage || '',
        os: device.os || '',
        ip_address: device.ip_address || '',
        mac_address: device.mac_address || '',
        purchase_date: device.purchase_date ? device.purchase_date.split('T')[0] : '',
        warranty_end: device.warranty_end ? device.warranty_end.split('T')[0] : '',
        purchase_price: device.purchase_price || '',
        supplier: device.supplier || '',
        status: device.status || 'available',
        condition: device.condition || 'good',
        location: device.location || '',
        notes: device.notes || ''
      });
    } else {
      setEditingDevice(null);
      setFormData({
        device_type_id: '',
        asset_tag: '',
        brand: '',
        model: '',
        serial_number: '',
        cpu: '',
        ram: '',
        storage: '',
        os: '',
        ip_address: '',
        mac_address: '',
        purchase_date: '',
        warranty_end: '',
        purchase_price: '',
        supplier: '',
        status: 'available',
        condition: 'good',
        location: '',
        notes: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDevice(null);
  };

  const filteredDevices = devices.filter(device => 
    (device.asset_tag && device.asset_tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (device.brand && device.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (device.model && device.model.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (device.serial_number && device.serial_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedType = deviceTypes.find(t => t.id === parseInt(formData.device_type_id));
  const showComputerFields = selectedType && ['Computer', 'Laptop', 'Server'].includes(selectedType.name);
  const showNetworkFields = selectedType && ['Switch', 'Core Switch', 'Router', 'Access Point', 'IP Phone', 'Camera'].includes(selectedType.name);

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
          <h1 className="text-2xl font-bold text-gray-800">الأجهزة</h1>
          <p className="text-gray-600 mt-1">إدارة أصول تقنية المعلومات</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 11l3 3 3-3" />
            </svg>
            استيراد Excel
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
            تقرير PDF
          </button>
          <button
            onClick={() => openModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            إضافة جهاز
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.totals?.total_devices || 0}</p>
                <p className="text-xs text-gray-500">إجمالي الأجهزة</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.totals?.available || 0}</p>
                <p className="text-xs text-gray-500">متاح</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.totals?.assigned || 0}</p>
                <p className="text-xs text-gray-500">مسلم</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.totals?.in_maintenance || 0}</p>
                <p className="text-xs text-gray-500">في الصيانة</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="بحث بالـ Asset Tag أو الموديل أو Serial..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">كل الأنواع</option>
          {deviceTypes.map(type => (
            <option key={type.id} value={type.id}>{type.name_ar}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">كل الحالات</option>
          {Object.entries(statusColors).map(([key, value]) => (
            <option key={key} value={key}>{value.label}</option>
          ))}
        </select>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded ${viewMode === 'table' ? 'bg-white shadow' : ''}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Devices Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDevices.map((device) => (
            <motion.div
              key={device.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    statusColors[device.status]?.bg || 'bg-gray-100'
                  } ${statusColors[device.status]?.text || 'text-gray-600'}`}>
                    {deviceIcons[device.icon] || deviceIcons.other}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{device.device_type_ar}</p>
                    <p className="font-medium text-gray-800 text-sm">{device.asset_tag || '-'}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    statusColors[device.status]?.bg || 'bg-gray-100'
                  } ${statusColors[device.status]?.text || 'text-gray-600'}`}>
                    {statusColors[device.status]?.label || device.status}
                  </span>
                  {(() => { const wb = getWarrantyBadge(device.warranty_end); return wb ? (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${wb.cls}`}>
                      {wb.urgent && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />}
                      🛡️ {wb.text}
                    </span>
                  ) : null; })()}
                </div>
              </div>

              <div className="space-y-1 text-sm mb-3">
                <p className="text-gray-800 font-medium">{device.brand} {device.model}</p>
                {device.serial_number && (
                  <p className="text-gray-500 text-xs" dir="ltr">S/N: {device.serial_number}</p>
                )}
                {device.assigned_to && (
                  <p className="text-blue-600 text-xs flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {device.assigned_to}
                  </p>
                )}
              </div>

              <div className="flex gap-1 pt-2 border-t border-gray-100">
                <button
                  onClick={() => openModal(device)}
                  className="flex-1 py-1 text-xs text-gray-600 hover:bg-gray-50 rounded transition"
                >
                  تعديل
                </button>
                <button
                  onClick={() => openTimeline(device)}
                  className="flex-1 py-1 text-xs text-violet-600 hover:bg-violet-50 rounded transition"
                  title="تاريخ الجهاز"
                >
                  📋 التاريخ
                </button>
                <button
                  onClick={() => setQrDevice(device)}
                  className="flex-1 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded transition"
                >
                  QR
                </button>
                <button
                  onClick={() => openDeleteModal(device)}
                  className="flex-1 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition"
                >
                  حذف
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Devices Table View */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">النوع</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Asset Tag</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الماركة/الموديل</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Serial</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الحالة</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">مسلم لـ</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDevices.map((device) => (
                  <tr key={device.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`p-1 rounded ${statusColors[device.status]?.bg} ${statusColors[device.status]?.text}`}>
                          {deviceIcons[device.icon] || deviceIcons.other}
                        </span>
                        <span className="text-sm">{device.device_type_ar}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{device.asset_tag || '-'}</td>
                    <td className="px-4 py-3 text-sm">{device.brand} {device.model}</td>
                    <td className="px-4 py-3 text-sm text-gray-500" dir="ltr">{device.serial_number || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium w-fit ${
                          statusColors[device.status]?.bg
                        } ${statusColors[device.status]?.text}`}>
                          {statusColors[device.status]?.label}
                        </span>
                        {(() => { const wb = getWarrantyBadge(device.warranty_end); return wb ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold w-fit flex items-center gap-1 ${wb.cls}`}>
                            {wb.urgent && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />}
                            🛡️ {wb.text}
                          </span>
                        ) : null; })()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{device.assigned_to || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openModal(device)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="تعديل"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openTimeline(device)}
                          className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded"
                          title="تاريخ الجهاز"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setQrDevice(device)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                          title="QR Code"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 4v.01M12 20h.01M4 4h4v4H4V4zm12 0h4v4h-4V4zM4 16h4v4H4v-4z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openDeleteModal(device)}
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
        </div>
      )}

      {filteredDevices.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500">لا توجد أجهزة</p>
          <button
            onClick={() => openModal()}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            إضافة جهاز جديد
          </button>
        </div>
      )}

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
              className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingDevice ? 'تعديل الجهاز' : 'إضافة جهاز جديد'}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">نوع الجهاز *</label>
                    <select
                      value={formData.device_type_id}
                      onChange={(e) => setFormData({ ...formData, device_type_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">اختر النوع</option>
                      {deviceTypes.map(type => (
                        <option key={type.id} value={type.id}>{type.name_ar}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Asset Tag</label>
                    <input
                      type="text"
                      value={formData.asset_tag}
                      onChange={(e) => setFormData({ ...formData, asset_tag: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="مثال: PC-001"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الماركة</label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="مثال: Dell, HP, Cisco"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الموديل</label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                    <input
                      type="text"
                      value={formData.serial_number}
                      onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Computer/Server specific fields */}
                {showComputerFields && (
                  <div className="p-4 bg-blue-50 rounded-lg space-y-4">
                    <h3 className="font-medium text-blue-800 text-sm">مواصفات الجهاز</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">المعالج (CPU)</label>
                        <input
                          type="text"
                          value={formData.cpu}
                          onChange={(e) => setFormData({ ...formData, cpu: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="مثال: Intel Core i5-10400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">الذاكرة (RAM)</label>
                        <input
                          type="text"
                          value={formData.ram}
                          onChange={(e) => setFormData({ ...formData, ram: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="مثال: 16GB DDR4"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">التخزين</label>
                        <input
                          type="text"
                          value={formData.storage}
                          onChange={(e) => setFormData({ ...formData, storage: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="مثال: 512GB SSD"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">نظام التشغيل</label>
                        <input
                          type="text"
                          value={formData.os}
                          onChange={(e) => setFormData({ ...formData, os: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="مثال: Windows 11 Pro"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Network device specific fields */}
                {showNetworkFields && (
                  <div className="p-4 bg-green-50 rounded-lg space-y-4">
                    <h3 className="font-medium text-green-800 text-sm">إعدادات الشبكة</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">عنوان IP</label>
                        <input
                          type="text"
                          value={formData.ip_address}
                          onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          dir="ltr"
                          placeholder="192.168.1.1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">MAC Address</label>
                        <input
                          type="text"
                          value={formData.mac_address}
                          onChange={(e) => setFormData({ ...formData, mac_address: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          dir="ltr"
                          placeholder="00:1A:2B:3C:4D:5E"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Purchase Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الشراء</label>
                    <input
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">انتهاء الضمان</label>
                    <input
                      type="date"
                      value={formData.warranty_end}
                      onChange={(e) => setFormData({ ...formData, warranty_end: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">سعر الشراء</label>
                    <input
                      type="number"
                      value={formData.purchase_price}
                      onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">المورد</label>
                    <input
                      type="text"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Status & Location */}
                <div className="grid grid-cols-3 gap-4">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">الحالة الفنية</label>
                    <select
                      value={formData.condition}
                      onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="excellent">ممتاز</option>
                      <option value="good">جيد</option>
                      <option value="fair">مقبول</option>
                      <option value="poor">ضعيف</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الموقع</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="مثال: غرفة السيرفر"
                    />
                  </div>
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
                    {editingDevice ? 'تحديث' : 'إضافة'}
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

      {/* Device Timeline Modal */}
      <AnimatePresence>
        {timelineDevice && (
          <DeviceTimelineModal
            device={timelineDevice}
            data={timelineData}
            loading={timelineLoading}
            onClose={() => { setTimelineDevice(null); setTimelineData(null); }}
          />
        )}
      </AnimatePresence>

      {/* QR Code Print Modal */}
      <AnimatePresence>
        {qrDevice && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
              dir="rtl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">طباعة QR Code</h3>
                <button onClick={() => setQrDevice(null)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* QR Print Area */}
              <div id="qr-print-area" className="p-6 flex flex-col items-center gap-4 bg-white">
                <div className="border-2 border-slate-100 rounded-2xl p-4 bg-white">
                  <QRCodeSVG
                    value={`${window.location.protocol}//${window.location.hostname}:${window.location.port || 5173}/device/${qrDevice.id}`}
                    size={180}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <div className="text-center">
                  <p className="font-extrabold text-slate-800 text-lg">{qrDevice.brand} {qrDevice.model}</p>
                  {qrDevice.asset_tag && (
                    <p className="font-mono text-indigo-600 font-bold text-sm mt-0.5">{qrDevice.asset_tag}</p>
                  )}
                  {qrDevice.serial_number && (
                    <p className="font-mono text-slate-400 text-xs mt-0.5" dir="ltr">S/N: {qrDevice.serial_number}</p>
                  )}
                  <p className="text-slate-300 text-[11px] mt-2">امسح الكود لعرض بيانات الجهاز</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 px-5 pb-5">
                <button
                  onClick={() => {
                    const printWin = window.open('', '_blank');
                    const qrUrl = `${window.location.protocol}//${window.location.hostname}:${window.location.port || 5173}/device/${qrDevice.id}`;
                    printWin.document.write(`
                      <html><head><title>QR - ${qrDevice.asset_tag || qrDevice.id}</title>
                      <style>body{font-family:Arial,sans-serif;text-align:center;padding:20px;direction:rtl}h2{margin:8px 0;font-size:18px}p{margin:4px 0;color:#666;font-size:13px}.mono{font-family:monospace;color:#4f46e5}img{display:block;margin:12px auto}</style></head>
                      <body>
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}" width="200" height="200" />
                        <h2>${qrDevice.brand} ${qrDevice.model}</h2>
                        ${qrDevice.asset_tag ? `<p class="mono">${qrDevice.asset_tag}</p>` : ''}
                        ${qrDevice.serial_number ? `<p>S/N: ${qrDevice.serial_number}</p>` : ''}
                        <p style="color:#ccc;font-size:11px;margin-top:10px">نظام إدارة أصول IT</p>
                        <script>window.onload=()=>{window.print();window.close();}<\/script>
                      </body></html>`);
                    printWin.document.close();
                  }}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold text-sm transition"
                >
                  🖨️ طباعة
                </button>
                <button
                  onClick={() => window.open(`/device/${qrDevice.id}`, '_blank')}
                  className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 py-2.5 rounded-xl font-bold text-sm transition"
                >
                  🔗 فتح الصفحة
                </button>
              </div>
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
                  هل أنت متأكد من حذف هذا الجهاز؟ لا يمكن التراجع عن هذا الإجراء.
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

      {/* Import Devices Modal */}
      <ImportDevicesModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          fetchDevices();
          setShowImportModal(false);
        }}
      />
    </div>
  );
}

// ── Device Timeline Modal ─────────────────────────────────────────────────────
function DeviceTimelineModal({ device, data, loading, onClose }) {
  // Build sorted timeline events from data
  const events = [];

  if (data) {
    // Purchase
    if (data.purchase_date) {
      events.push({
        date: new Date(data.purchase_date),
        type: 'purchase',
        icon: '🛒',
        color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
        title: 'تم الشراء',
        detail: data.supplier ? `من: ${data.supplier}` : (data.purchase_price ? `${parseFloat(data.purchase_price).toLocaleString('ar-EG')} ج.م` : ''),
      });
    }

    // Warranty end
    if (data.warranty_end) {
      const wDays = Math.round((new Date(data.warranty_end) - new Date()) / (1000 * 60 * 60 * 24));
      events.push({
        date: new Date(data.warranty_end),
        type: 'warranty',
        icon: '🛡️',
        color: wDays < 0 ? 'bg-gray-100 text-gray-500 border-gray-200' : wDays <= 30 ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200',
        dot: wDays < 0 ? 'bg-gray-400' : wDays <= 30 ? 'bg-red-500' : 'bg-amber-500',
        title: wDays < 0 ? 'انتهى الضمان' : 'نهاية الضمان',
        detail: wDays < 0 ? `منذ ${Math.abs(wDays)} يوم` : `بعد ${wDays} يوم`,
        isFuture: wDays >= 0,
      });
    }

    // Assignments
    (data.assignment_history || []).forEach(a => {
      events.push({
        date: new Date(a.assigned_date),
        type: 'assigned',
        icon: '👤',
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        dot: 'bg-blue-500',
        title: `تسليم لـ ${a.employee_name}`,
        detail: a.department_name || '',
      });
      if (a.returned_date) {
        events.push({
          date: new Date(a.returned_date),
          type: 'returned',
          icon: '↩️',
          color: 'bg-slate-100 text-slate-600 border-slate-200',
          dot: 'bg-slate-400',
          title: `إرجاع من ${a.employee_name}`,
          detail: '',
        });
      }
    });

    // Maintenance records
    (data.maintenance_records || []).forEach(m => {
      events.push({
        date: new Date(m.start_date || m.created_at),
        type: 'maintenance_in',
        icon: '🔧',
        color: 'bg-amber-100 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
        title: `دخول صيانة: ${m.maintenance_type || 'عام'}`,
        detail: m.description ? m.description.slice(0, 60) + (m.description.length > 60 ? '...' : '') : '',
      });
      if (m.end_date) {
        events.push({
          date: new Date(m.end_date),
          type: 'maintenance_out',
          icon: '✅',
          color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
          dot: 'bg-emerald-400',
          title: `انتهاء الصيانة`,
          detail: m.cost ? `تكلفة: ${parseFloat(m.cost).toLocaleString('ar-EG')} ج.م` : '',
        });
      }
    });

    // Sort: past events ascending, future events at end
    events.sort((a, b) => a.date - b.date);
  }

  const fmt = (d) => new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        dir="rtl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-l from-violet-50 to-white">
          <div>
            <h3 className="text-lg font-extrabold text-slate-800">📋 تاريخ الجهاز</h3>
            <p className="text-sm text-slate-500 mt-0.5">{device.brand} {device.model} {device.asset_tag ? `· ${device.asset_tag}` : ''}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Device meta strip */}
        {data && (
          <div className="flex gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100 text-xs text-slate-600 flex-wrap">
            {data.serial_number && <span>🔢 <span className="font-mono">{data.serial_number}</span></span>}
            {data.purchase_price && <span>💰 {parseFloat(data.purchase_price).toLocaleString('ar-EG')} ج.م</span>}
            {data.location && <span>📍 {data.location}</span>}
            {data.condition && <span>📊 الحالة: {data.condition}</span>}
          </div>
        )}

        {/* Timeline body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <div className="text-5xl mb-3">📭</div>
              <p>لا يوجد تاريخ مسجل لهذا الجهاز</p>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute top-0 bottom-0 right-[19px] w-0.5 bg-slate-200" />

              <div className="space-y-6">
                {events.map((ev, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className={`flex gap-4 relative ${ev.isFuture ? 'opacity-60' : ''}`}
                  >
                    {/* Dot */}
                    <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-lg z-10 border-2 border-white shadow-sm ${ev.dot} text-white`}>
                      <span className="text-base">{ev.icon}</span>
                    </div>

                    {/* Content */}
                    <div className={`flex-1 rounded-2xl p-3 border ${ev.color} min-w-0`}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-sm leading-tight">{ev.title}</span>
                        <span className="text-[11px] font-medium shrink-0 opacity-70">
                          {fmt(ev.date)}{ev.isFuture ? ' 🔮' : ''}
                        </span>
                      </div>
                      {ev.detail && (
                        <p className="text-xs mt-1 opacity-75 leading-relaxed">{ev.detail}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center">
          <span className="text-xs text-slate-400">{events.filter(e => !e.isFuture).length} حدث مسجل</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition"
          >
            إغلاق
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
