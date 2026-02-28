import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';

const API_URL = `${window.location.protocol}//${window.location.hostname}:3000/api`;

export default function DeviceAssignments() {
  const [devices, setDevices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [accessories, setAccessories] = useState([]);
  const [selectedAccessories, setSelectedAccessories] = useState([]);
  const [availableLicenses, setAvailableLicenses] = useState([]);
  const [selectedLicenses, setSelectedLicenses] = useState([]);
  
  const [assignForm, setAssignForm] = useState({
    device_id: '',
    employee_id: '',
    windows_username: '',
    windows_password: '',
    email_account: '',
    email_password: '',
    assigned_by: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const authHeaders = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };

      const [devicesRes, employeesRes, accessoriesRes, licensesRes] = await Promise.all([
        fetch(`${API_URL}/devices?status=assigned`),
        fetch(`${API_URL}/employees`),
        fetch(`${API_URL}/accessories`),
        fetch(`${API_URL}/licenses`, { headers: authHeaders })
      ]);
      
      const devicesData = await devicesRes.json();
      const employeesData = await employeesRes.json();
      const accessoriesData = await accessoriesRes.json();
      const licensesData = licensesRes.ok ? await licensesRes.json() : [];
      
      // Fetch available devices separately
      const availableRes = await fetch(`${API_URL}/devices?status=available`);
      const availableData = await availableRes.json();
      
      setDevices([...devicesData, ...availableData]);
      setEmployees(employeesData);
      setAccessories(accessoriesData);
      setAvailableLicenses(Array.isArray(licensesData) ? licensesData.filter(l => Number(l.available_count) > 0) : []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/devices/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignForm)
      });

      if (res.ok) {
        const assignmentData = await res.json();
        
        // إضافة الملحقات المختارة للتسليم
        if (selectedAccessories.length > 0 && assignmentData.id) {
          await fetch(`${API_URL}/accessories/assignment/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              assignment_id: assignmentData.id,
              accessories: selectedAccessories.map(accId => ({
                accessory_id: accId,
                quantity: 1,
                condition: 'new'
              }))
            })
          });
        }

        // Assign selected licenses
        if (selectedLicenses.length > 0) {
          const token = localStorage.getItem('token');
          const authHeaders = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
          await Promise.allSettled(
            selectedLicenses.map(licId =>
              fetch(`${API_URL}/licenses/assignments/assign`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({
                  license_id: licId,
                  employee_id: assignForm.employee_id || null,
                  device_id: assignForm.device_id || null,
                  assigned_date: new Date().toISOString().split('T')[0]
                })
              })
            )
          );
        }

        toast.success('تم تسليم الجهاز بنجاح' + (selectedLicenses.length ? ` وتعيين ${selectedLicenses.length} ليسنز` : ''));
        fetchData();
        closeAssignModal();
      } else {
        const error = await res.json();
        toast.error(error.error || 'حدث خطأ في التسليم');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ في الاتصال');
    }
  };

  const handleReturn = async () => {
    try {
      const res = await fetch(`${API_URL}/devices/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment_id: selectedAssignment.id,
          notes: 'تم استرجاع الجهاز'
        })
      });

      if (res.ok) {
        fetchData();
        setShowReturnModal(false);
        setSelectedAssignment(null);
      } else {
        const error = await res.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const openAssignModal = (device = null) => {
    setSelectedDevice(device);
    setAssignForm({
      device_id: device?.id || '',
      employee_id: '',
      windows_username: '',
      windows_password: '',
      email_account: '',
      email_password: '',
      assigned_by: '',
      notes: ''
    });
    setShowAssignModal(true);
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    setSelectedDevice(null);
    setAssignForm({
      device_id: '',
      employee_id: '',
      windows_username: '',
      windows_password: '',
      email_account: '',
      email_password: '',
      assigned_by: '',
      notes: ''
    });
    setSelectedAccessories([]);
    setSelectedLicenses([]);
  };

  // Export to Excel
  const exportToExcel = async () => {
    try {
      toast.loading('جاري تحميل الملف...', { id: 'export' });
      const response = await fetch(`${API_URL}/assignments/export/excel`);
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assignments_${new Date().toISOString().split('T')[0]}.xlsx`;
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
      const response = await fetch(`${API_URL}/assignments/export/pdf`);
      if (!response.ok) throw new Error('PDF export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assignments_report_${new Date().toISOString().split('T')[0]}.pdf`;
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

  const viewDeviceDetails = async (deviceId) => {
    try {
      const res = await fetch(`${API_URL}/devices/${deviceId}`);
      const data = await res.json();
      setSelectedAssignment(data.current_assignment);
      setSelectedDevice(data);
      setShowReturnModal(true);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Print Assignment Form directly
  const downloadAssignmentPDF = async (device, assignment) => {
    // Open print window directly
    printAssignmentForm(device, assignment);
  };

  // Fallback Print Assignment Form
  const printAssignmentForm = (device, assignment) => {
    const today = new Date().toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    printWindow.document.write(`
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>أمر تسليم - ${assignment.employee_name || 'جهاز'}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    @page { size: A4; margin: 8mm; }
    
    body {
      font-family: 'Tajawal', sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #1f2937;
      direction: rtl;
    }
    
    .page {
      width: 210mm;
      max-height: 287mm;
      padding: 8mm 10mm;
      margin: 0 auto;
      background: white;
    }
    
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      color: white;
      padding: 12px 15px;
      border-radius: 8px;
      margin-bottom: 10px;
      text-align: center;
    }
    
    .header h1 { font-size: 18px; font-weight: 700; margin-bottom: 2px; }
    .header p { font-size: 12px; opacity: 0.9; }
    
    .meta-bar {
      display: flex;
      justify-content: space-between;
      background: #f1f5f9;
      padding: 8px 12px;
      border-radius: 6px;
      margin-bottom: 10px;
      font-size: 11px;
    }
    
    .meta-bar strong { color: #3b82f6; }
    
    .section {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      margin-bottom: 8px;
      overflow: hidden;
    }
    
    .section-header {
      padding: 6px 12px;
      font-weight: 700;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .section-header.blue { background: #dbeafe; color: #1e40af; border-bottom: 2px solid #3b82f6; }
    .section-header.green { background: #dcfce7; color: #166534; border-bottom: 2px solid #22c55e; }
    .section-header.amber { background: #fef3c7; color: #92400e; border-bottom: 2px solid #f59e0b; }
    .section-header.pink { background: #fce7f3; color: #9d174d; border-bottom: 2px solid #ec4899; }
    
    .section-body { padding: 10px 12px; }
    
    /* Compact inline data rows */
    .data-row {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 15px;
      margin-bottom: 4px;
    }
    
    .data-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
    }
    
    .data-item .label {
      color: #6b7280;
      font-weight: 500;
    }
    
    .data-item .value {
      font-weight: 600;
      color: #1f2937;
    }
    
    .data-item .value.ltr {
      direction: ltr;
      font-family: 'Consolas', monospace;
    }
    
    /* Credentials compact */
    .cred-warning {
      background: #fef3c7;
      border: 1px solid #fcd34d;
      border-radius: 4px;
      padding: 5px 8px;
      margin-bottom: 6px;
      font-size: 10px;
      color: #92400e;
    }
    
    .cred-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
    }
    
    .cred-box {
      background: #f9fafb;
      padding: 6px 8px;
      border-radius: 4px;
      border: 1px solid #e5e7eb;
    }
    
    .cred-box .label { font-size: 9px; color: #6b7280; text-transform: uppercase; }
    .cred-box .value { font-family: 'Consolas', monospace; font-weight: 600; direction: ltr; text-align: left; font-size: 11px; }
    
    /* Terms compact */
    .terms-list {
      list-style: none;
      padding: 0;
      columns: 2;
      column-gap: 15px;
    }
    
    .terms-list li {
      padding: 3px 0;
      padding-right: 15px;
      position: relative;
      font-size: 10px;
      color: #4b5563;
      break-inside: avoid;
    }
    
    .terms-list li::before {
      content: '✓';
      position: absolute;
      right: 0;
      color: #22c55e;
      font-weight: bold;
      font-size: 10px;
    }
    
    /* Signatures compact */
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-top: 10px;
    }
    
    .signature-box {
      text-align: center;
      padding: 10px;
      border: 1px dashed #d1d5db;
      border-radius: 8px;
      background: #fafafa;
    }
    
    .signature-title {
      color: #6b7280;
      font-weight: 600;
      font-size: 11px;
      margin-bottom: 25px;
    }
    
    .signature-line {
      border-top: 2px solid #374151;
      margin: 0 10px;
      padding-top: 6px;
    }
    
    .signature-name { font-weight: 700; font-size: 11px; }
    .signature-date { font-size: 9px; color: #9ca3af; margin-top: 2px; }
    
    .footer {
      background: #1e3a8a;
      color: white;
      padding: 8px 15px;
      border-radius: 6px;
      text-align: center;
      font-size: 10px;
      margin-top: 10px;
    }
    
    .status-badge {
      display: inline-block;
      background: #dcfce7;
      color: #166534;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 600;
    }
    
    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .page { padding: 0; width: 100%; max-height: none; }
      .header { background: #1e3a8a !important; }
      .footer { background: #1e3a8a !important; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <h1>إدارة تقنية المعلومات</h1>
      <p>نموذج تسليم جهاز / معدات تقنية</p>
    </div>
    
    <div class="meta-bar">
      <div><strong>رقم النموذج:</strong> IT-ASN-${String(assignment.id || '000').padStart(4, '0')}</div>
      <div><strong>التاريخ:</strong> ${assignment.assigned_date || today}</div>
    </div>
    
    <!-- بيانات الموظف - مضغوطة في سطرين -->
    <div class="section">
      <div class="section-header blue">👤 بيانات الموظف المستلم</div>
      <div class="section-body">
        <div class="data-row">
          <div class="data-item"><span class="label">الاسم:</span> <span class="value">${assignment.employee_name || '—'}</span></div>
          <div class="data-item"><span class="label">القسم:</span> <span class="value">${assignment.department_name || '—'}</span></div>
          <div class="data-item"><span class="label">الرقم الوظيفي:</span> <span class="value">${assignment.employee_id || '—'}</span></div>
          <div class="data-item"><span class="label">تاريخ التسليم:</span> <span class="value">${assignment.assigned_date || today}</span></div>
        </div>
      </div>
    </div>
    
    <!-- بيانات الجهاز - مضغوطة -->
    <div class="section">
      <div class="section-header green">💻 بيانات الجهاز / المعدات</div>
      <div class="section-body">
        <div class="data-row">
          <div class="data-item"><span class="label">النوع:</span> <span class="value">${device.device_type_ar || device.device_type_name || '—'}</span></div>
          <div class="data-item"><span class="label">Asset Tag:</span> <span class="value ltr">${device.asset_tag || '—'}</span></div>
          <div class="data-item"><span class="label">الشركة:</span> <span class="value">${device.brand || '—'}</span></div>
          <div class="data-item"><span class="label">الموديل:</span> <span class="value">${device.model || '—'}</span></div>
        </div>
        <div class="data-row">
          <div class="data-item"><span class="label">الرقم التسلسلي:</span> <span class="value ltr">${device.serial_number || '—'}</span></div>
          <div class="data-item"><span class="label">الحالة:</span> <span class="status-badge">✓ صالح</span></div>
          ${device.cpu ? `<div class="data-item"><span class="label">CPU:</span> <span class="value ltr">${device.cpu}</span></div>` : ''}
          ${device.ram ? `<div class="data-item"><span class="label">RAM:</span> <span class="value">${device.ram}</span></div>` : ''}
        </div>
        ${(device.storage || device.ip_address) ? `
        <div class="data-row">
          ${device.storage ? `<div class="data-item"><span class="label">التخزين:</span> <span class="value">${device.storage}</span></div>` : ''}
          ${device.ip_address ? `<div class="data-item"><span class="label">IP:</span> <span class="value ltr">${device.ip_address}</span></div>` : ''}
        </div>
        ` : ''}
      </div>
    </div>
    
    ${(assignment.windows_username || assignment.email_account) ? `
    <!-- بيانات الدخول - مضغوطة -->
    <div class="section">
      <div class="section-header amber">🔐 بيانات الدخول</div>
      <div class="section-body">
        <div class="cred-warning">⚠️ بيانات سرية - يرجى عدم مشاركتها</div>
        <div class="cred-grid">
          ${assignment.windows_username ? `<div class="cred-box"><div class="label">مستخدم Windows</div><div class="value">${assignment.windows_username}</div></div>` : ''}
          ${assignment.windows_password ? `<div class="cred-box"><div class="label">كلمة مرور Windows</div><div class="value">${assignment.windows_password}</div></div>` : ''}
          ${assignment.email_account ? `<div class="cred-box"><div class="label">البريد الإلكتروني</div><div class="value">${assignment.email_account}</div></div>` : ''}
          ${assignment.email_password ? `<div class="cred-box"><div class="label">كلمة مرور البريد</div><div class="value">${assignment.email_password}</div></div>` : ''}
        </div>
      </div>
    </div>
    ` : ''}
    
    <!-- التعهدات - مضغوطة في عمودين -->
    <div class="section">
      <div class="section-header pink">📋 التعهدات والشروط</div>
      <div class="section-body">
        <ul class="terms-list">
          <li>المحافظة على الجهاز واستخدامه للعمل فقط</li>
          <li>عدم تثبيت برامج غير مرخصة</li>
          <li>إبلاغ IT فوراً عند أي عطل</li>
          <li>إعادة الجهاز عند انتهاء الخدمة</li>
          <li>تحمل مسؤولية سوء الاستخدام</li>
        </ul>
      </div>
    </div>
    
    <!-- التوقيعات -->
    <div class="signatures">
      <div class="signature-box">
        <div class="signature-title">توقيع الموظف المستلم</div>
        <div class="signature-line">
          <div class="signature-name">${assignment.employee_name || '.....................'}</div>
          <div class="signature-date">التاريخ: ___/___/______</div>
        </div>
      </div>
      <div class="signature-box">
        <div class="signature-title">توقيع مسؤول IT</div>
        <div class="signature-line">
          <div class="signature-name">${assignment.assigned_by || '.....................'}</div>
          <div class="signature-date">التاريخ: ___/___/______</div>
        </div>
      </div>
    </div>
    
    <div class="footer">
      يُحفظ في: ملف الموظف • إدارة IT • الموارد البشرية
    </div>
  </div>
  
  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 300); };
  </script>
</body>
</html>
    `);
    
    printWindow.document.close();
  };

  const assignedDevices = devices.filter(d => d.status === 'assigned');
  const availableDevices = devices.filter(d => d.status === 'available');

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
          <h1 className="text-2xl font-bold text-gray-800">تسليم الأجهزة</h1>
          <p className="text-gray-600 mt-1">إدارة تسليم واسترجاع الأجهزة</p>
        </div>
        <div className="flex gap-2">
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
          onClick={() => openAssignModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          تسليم جهاز
        </button>
      </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-3xl font-bold text-blue-600">{assignedDevices.length}</p>
          <p className="text-sm text-gray-500">جهاز مسلم</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-3xl font-bold text-green-600">{availableDevices.length}</p>
          <p className="text-sm text-gray-500">جهاز متاح</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-3xl font-bold text-purple-600">{employees.length}</p>
          <p className="text-sm text-gray-500">موظف</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-3xl font-bold text-gray-600">{devices.length}</p>
          <p className="text-sm text-gray-500">إجمالي الأجهزة</p>
        </div>
      </div>

      {/* Assigned Devices Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">الأجهزة المسلمة</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الجهاز</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Asset Tag</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">مسلم لـ</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">تاريخ التسليم</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {assignedDevices.map((device) => (
                <tr key={device.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-800">{device.device_type_ar}</p>
                      <p className="text-sm text-gray-500">{device.brand} {device.model}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">{device.asset_tag || '-'}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-800">{device.assigned_to || '-'}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">-</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => viewDeviceDetails(device.id)}
                        className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-200 transition"
                      >
                        عرض التفاصيل
                      </button>
                      <button
                        onClick={() => viewDeviceDetails(device.id)}
                        className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-lg hover:bg-orange-200 transition"
                      >
                        استرجاع
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {assignedDevices.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-500">لا توجد أجهزة مسلمة</p>
            </div>
          )}
        </div>
      </div>

      {/* Assign Modal */}
      <AnimatePresence>
        {showAssignModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans"
            onClick={(e) => e.target === e.currentTarget && closeAssignModal()}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-l from-blue-600 to-indigo-700 p-6 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">تسليم جهاز جديد</h2>
                    <p className="text-blue-100 text-xs opacity-90">يرجى تعبئة بيانات التسليم بدقة</p>
                  </div>
                </div>
                <button 
                  onClick={closeAssignModal}
                  className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="overflow-y-auto flex-1 p-6 md:p-8 custom-scrollbar">
                <form id="assignForm" onSubmit={handleAssign} className="space-y-8">
                  
                  {/* Main Info Section */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        الجهاز المراد تسليمه
                      </label>
                      <div className="relative">
                        <select
                          value={assignForm.device_id}
                          onChange={(e) => setAssignForm({ ...assignForm, device_id: e.target.value })}
                          className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none text-gray-700 font-medium"
                          required
                        >
                          <option value="">اختر الجهاز من القائمة</option>
                          {availableDevices.map(device => (
                            <option key={device.id} value={device.id}>
                              {device.device_type_ar} | {device.brand} {device.model} ({device.asset_tag || 'No Tag'})
                            </option>
                          ))}
                        </select>
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        الموظف المستلم
                      </label>
                      <div className="relative">
                        <select
                          value={assignForm.employee_id}
                          onChange={(e) => {
                            const selectedEmp = employees.find(emp => emp.id === parseInt(e.target.value));
                            setAssignForm({ 
                              ...assignForm, 
                              employee_id: e.target.value,
                              email_account: selectedEmp?.email || ''
                            });
                          }}
                          className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none text-gray-700 font-medium"
                          required
                        >
                          <option value="">اختر الموظف من القائمة</option>
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>
                              {emp.full_name} {emp.department_name ? `— ${emp.department_name}` : ''}
                            </option>
                          ))}
                        </select>
                         <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  <hr className="border-gray-100" />

                  {/* Credentials Section */}
                  <div className="bg-amber-50/50 rounded-2xl p-6 border border-amber-100">
                    <div className="flex items-center gap-2 mb-4 text-amber-800">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <h3 className="font-bold text-sm">بيانات الدخول والحسابات (اختياري)</h3>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-5">
                      <div className="relative group">
                        <label className="absolute -top-2.5 right-3 bg-amber-50 px-2 text-xs font-semibold text-amber-700 transition-all group-focus-within:text-amber-600">
                          Windows User
                        </label>
                        <input
                          type="text"
                          value={assignForm.windows_username}
                          onChange={(e) => setAssignForm({ ...assignForm, windows_username: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all placeholder-gray-300 text-left font-mono text-sm"
                          placeholder="j.smith"
                          dir="ltr"
                        />
                      </div>
                      <div className="relative group">
                        <label className="absolute -top-2.5 right-3 bg-amber-50 px-2 text-xs font-semibold text-amber-700 transition-all group-focus-within:text-amber-600">
                          Windows Password
                        </label>
                        <input
                          type="text"
                          value={assignForm.windows_password}
                          onChange={(e) => setAssignForm({ ...assignForm, windows_password: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all placeholder-gray-300 text-left font-mono text-sm"
                          placeholder="••••••••"
                          dir="ltr"
                        />
                      </div>

                      <div className="relative group">
                        <label className="absolute -top-2.5 right-3 bg-amber-50 px-2 text-xs font-semibold text-amber-700 transition-all group-focus-within:text-amber-600">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={assignForm.email_account}
                          onChange={(e) => setAssignForm({ ...assignForm, email_account: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all placeholder-gray-300 text-left font-mono text-sm"
                          placeholder="name@company.com"
                          dir="ltr"
                        />
                      </div>
                      <div className="relative group">
                        <label className="absolute -top-2.5 right-3 bg-amber-50 px-2 text-xs font-semibold text-amber-700 transition-all group-focus-within:text-amber-600">
                          Email Password
                        </label>
                        <input
                          type="text"
                          value={assignForm.email_password}
                          onChange={(e) => setAssignForm({ ...assignForm, email_password: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all placeholder-gray-300 text-left font-mono text-sm"
                          placeholder="••••••••"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>


                  {/* Accessories Section */}
                  <div className="bg-teal-50/50 rounded-2xl p-6 border border-teal-100">
                    <div className="flex items-center gap-2 mb-4 text-teal-800">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <h3 className="font-bold text-sm">الملحقات المسلمة مع الجهاز</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {accessories.map(acc => (
                        <label 
                          key={acc.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedAccessories.includes(acc.id)
                              ? 'border-teal-500 bg-teal-100/50 shadow-sm'
                              : 'border-gray-200 bg-white hover:border-teal-300 hover:bg-teal-50/30'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedAccessories.includes(acc.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAccessories([...selectedAccessories, acc.id]);
                              } else {
                                setSelectedAccessories(selectedAccessories.filter(id => id !== acc.id));
                              }
                            }}
                            className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="block font-medium text-gray-800 text-sm truncate">{acc.name_ar || acc.name}</span>
                            <span className="block text-xs text-gray-500">{acc.category}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                    
                    {selectedAccessories.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-teal-200">
                        <div className="flex items-center gap-2 text-teal-700">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm font-medium">تم اختيار {selectedAccessories.length} ملحق</span>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Licenses Section */}
                  {availableLicenses.length > 0 && (
                    <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100">
                      <div className="flex items-center gap-2 mb-4 text-indigo-800">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <h3 className="font-bold text-sm">الليسنز المتاحة في المخزون (اختياري)</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {availableLicenses.map(lic => (
                          <label
                            key={lic.id}
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                              selectedLicenses.includes(lic.id)
                                ? 'border-indigo-500 bg-indigo-100/50 shadow-sm'
                                : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedLicenses.includes(lic.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedLicenses(prev => [...prev, lic.id]);
                                else setSelectedLicenses(prev => prev.filter(id => id !== lic.id));
                              }}
                              className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="block font-semibold text-gray-800 text-sm truncate">{lic.name}</span>
                              <span className="block text-xs text-gray-500">{lic.vendor} — {lic.available_count} نسخة متاحة</span>
                            </div>
                          </label>
                        ))}
                      </div>
                      {selectedLicenses.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-indigo-200 flex items-center gap-2 text-indigo-700">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm font-medium">سيتم تعيين {selectedLicenses.length} ليسنز مع هذا التسليم</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">تم التسليم بواسطة</label>
                      <input
                        type="text"
                        value={assignForm.assigned_by}
                        onChange={(e) => setAssignForm({ ...assignForm, assigned_by: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder="اسم الموظف المسؤول"
                      />
                    </div>
                     <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">ملاحظات إضافية</label>
                      <input
                        value={assignForm.notes}
                        onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                         className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder="أي ملاحظات حول حالة الجهاز أو التسليم"
                      />
                    </div>
                  </div>
                </form>
              </div>

              {/* Footer */}
              <div className="p-4 md:p-6 border-t border-gray-100 bg-gray-50 flex gap-3 shrink-0">
                <button
                  onClick={closeAssignModal}
                  className="flex-1 px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                >
                  إلغاء الأمر
                </button>
                <button
                  type="submit"
                  form="assignForm"
                  className="flex-[2] px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  تأكيد وتسليم الجهاز
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Return/Details Modal */}
      <AnimatePresence>
        {showReturnModal && selectedDevice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="bg-gray-900 text-white p-6 flex justify-between items-center shrink-0">
                <div>
                   <h2 className="text-xl font-bold flex items-center gap-2">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    ملف الجهاز
                    <span className="text-sm font-normal text-gray-400 mr-2 bg-gray-800 px-2 py-1 rounded-md">{selectedDevice.asset_tag}</span>
                   </h2>
                </div>
                <button onClick={() => setShowReturnModal(false)} className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                
                {/* Device Info Card */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-2 h-full bg-blue-500"></div>
                  <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    المواصفات الفنية
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="block text-xs text-gray-400">النوع</span>
                      <span className="font-medium text-gray-700">{selectedDevice.device_type_ar}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-400">الماركة</span>
                      <span className="font-medium text-gray-700">{selectedDevice.brand}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-400">الموديل</span>
                      <span className="font-medium text-gray-700">{selectedDevice.model}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-400">Serial No</span>
                      <span className="font-mono text-gray-700">{selectedDevice.serial_number || '-'}</span>
                    </div>
                    {selectedDevice.ip_address && (
                      <div>
                        <span className="block text-xs text-gray-400">IP Address</span>
                        <span className="font-mono text-gray-700">{selectedDevice.ip_address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Current Assignment or Available Status */}
                {selectedAssignment ? (
                  <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500"></div>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-emerald-800 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        العهدة الحالية (مسلم)
                      </h3>
                      <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full font-bold">نشط</span>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div>
                          <span className="text-xs text-emerald-600 block mb-1">الموظف المسؤول</span>
                          <p className="font-bold text-gray-800 text-lg">{selectedAssignment.employee_name}</p>
                          <p className="text-sm text-gray-500">{selectedAssignment.department_name || 'بدون قسم'}</p>
                        </div>
                        <div>
                          <span className="text-xs text-emerald-600 block mb-1">تاريخ الاستلام</span>
                          <p className="font-mono text-gray-700">{selectedAssignment.assigned_date ? new Date(selectedAssignment.assigned_date).toLocaleDateString('ar-SA') : '-'}</p>
                        </div>
                      </div>

                      <div className="bg-white/50 rounded-lg p-3 border border-emerald-100/50">
                        <h4 className="text-xs font-bold text-emerald-800 mb-2 uppercase tracking-wider">بيانات الدخول</h4>
                        <div className="space-y-2 text-sm">
                           {selectedAssignment.windows_username ? (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Win User:</span>
                              <span className="font-mono select-all text-gray-700">{selectedAssignment.windows_username}</span>
                            </div>
                           ) : <span className="text-xs text-gray-400 block">لا يوجد اسم مستخدم ويندوز</span>}
                            {selectedAssignment.email_account ? (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Email:</span>
                              <span className="font-mono select-all text-gray-700">{selectedAssignment.email_account}</span>
                            </div>
                           ) : <span className="text-xs text-gray-400 block">لا يوجد بريد إلكتروني</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-gray-600 mb-1">الجهاز متاح حالياً</h3>
                    <p className="text-sm text-gray-400">يمكنك تسليم هذا الجهاز لموظف جديد من القائمة الرئيسية</p>
                  </div>
                )}

                {/* Assignment History Section */}
                {selectedDevice.assignment_history && selectedDevice.assignment_history.length > 0 && (
                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                       <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      سجل الحركات السابق
                    </h3>
                    <div className="overflow-x-auto rounded-lg border border-gray-100">
                      <table className="w-full text-sm text-right">
                        <thead className="bg-gray-50 text-gray-500">
                          <tr>
                            <th className="px-4 py-2 font-medium">الموظف</th>
                            <th className="px-4 py-2 font-medium">تاريخ التسليم</th>
                            <th className="px-4 py-2 font-medium">تاريخ الارجاع</th>
                            <th className="px-4 py-2 font-medium">الحالة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedDevice.assignment_history.map((hist) => (
                            <tr key={hist.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-medium text-gray-800">{hist.employee_name}</td>
                              <td className="px-4 py-2 text-gray-600">{new Date(hist.assigned_date).toLocaleDateString('ar-SA')}</td>
                              <td className="px-4 py-2 text-gray-600">
                                {hist.returned_date ? new Date(hist.returned_date).toLocaleDateString('ar-SA') : '-'}
                              </td>
                               <td className="px-4 py-2">
                                {hist.is_current ? (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">حالياً</span>
                                ) : (
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">مسترجع</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>

              {/* Footer Actions */}
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex gap-3 shrink-0">
                {selectedAssignment && (
                  <>
                    <button
                      onClick={() => downloadAssignmentPDF(selectedDevice, selectedAssignment)}
                      className="flex-1 bg-white text-gray-700 border border-gray-300 py-3 rounded-xl hover:bg-gray-50 transition-all font-medium flex items-center justify-center gap-2 hover:shadow-sm"
                    >
                       <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      طباعة أمر التسليم
                    </button>
                    <button
                      onClick={handleReturn}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 text-white py-3 rounded-xl hover:from-orange-600 hover:to-amber-700 transition-all font-medium shadow-lg shadow-orange-200 flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      تسجيل استرجاع
                    </button>
                  </>
                )}
                 <button
                  onClick={() => setShowReturnModal(false)}
                  className="px-6 py-3 rounded-xl bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all font-medium"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
