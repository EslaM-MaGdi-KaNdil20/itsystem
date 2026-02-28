const puppeteer = require('puppeteer');
const pool = require('../config/database');
const { getLogoHTML } = require('../utils/logoHelper');

// Generate Assignments Report PDF
const generateAssignmentsReportPDF = async (req, res) => {
  try {
    // Fetch assignments with filters
    let query = `
      SELECT da.*, 
             d.asset_tag, d.brand, d.model, d.serial_number,
             dt.name as device_type_name,
             e.full_name as employee_name, e.employee_code,
             dep.name as department_name
      FROM device_assignments da
      LEFT JOIN devices d ON da.device_id = d.id
      LEFT JOIN device_types dt ON d.device_type_id = dt.id
      LEFT JOIN employees e ON da.employee_id = e.id
      LEFT JOIN departments dep ON e.department_id = dep.id
      ORDER BY da.assigned_date DESC
    `;
    
    const result = await pool.query(query);
    const assignments = result.rows;
    
    // Get statistics
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN returned_date IS NULL THEN 1 END) as active,
        COUNT(CASE WHEN returned_date IS NOT NULL THEN 1 END) as returned,
        COUNT(DISTINCT employee_id) as unique_employees,
        COUNT(DISTINCT device_id) as unique_devices
      FROM device_assignments
    `);
    const stats = statsResult.rows[0];
    
    // Get department summary
    const deptResult = await pool.query(`
      SELECT dep.name, COUNT(da.id) as count
      FROM device_assignments da
      LEFT JOIN employees e ON da.employee_id = e.id
      LEFT JOIN departments dep ON e.department_id = dep.id
      WHERE da.returned_date IS NULL
      GROUP BY dep.id, dep.name
      ORDER BY count DESC
      LIMIT 6
    `);
    const departments = deptResult.rows;
    
    const today = new Date().toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
    
    const reportDate = new Date().toISOString().split('T')[0];

    const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>تقرير التسليمات - ${reportDate}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;600;700;800&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: A4 landscape;
      margin: 8mm;
    }
    
    body {
      font-family: 'Tajawal', 'Segoe UI', Tahoma, sans-serif;
      background: #fff;
      color: #1f2937;
      font-size: 10px;
      line-height: 1.4;
      direction: rtl;
    }
    
    .page {
      padding: 12px;
      background: white;
    }
    
    .header {
      background: linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #8b5cf6 100%);
      color: white;
      padding: 18px 22px;
      border-radius: 12px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .header-right h1 {
      font-size: 22px;
      font-weight: 800;
      margin-bottom: 4px;
    }
    
    .header-right p {
      font-size: 13px;
      opacity: 0.9;
    }
    
    .header-left {
      text-align: left;
      font-size: 11px;
      opacity: 0.9;
    }
    
    .header-left .date {
      font-size: 10px;
      margin-top: 5px;
      background: rgba(255,255,255,0.2);
      padding: 4px 10px;
      border-radius: 15px;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 10px;
      margin-bottom: 12px;
    }
    
    .stat-card {
      background: white;
      border-radius: 10px;
      padding: 12px;
      text-align: center;
      border: 1px solid #e5e7eb;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    
    .stat-card.total {
      background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
      color: white;
      border: none;
    }
    
    .stat-card.active {
      border-right: 4px solid #22c55e;
    }
    
    .stat-card.returned {
      border-right: 4px solid #6b7280;
    }
    
    .stat-card.employees {
      border-right: 4px solid #3b82f6;
    }
    
    .stat-card.devices {
      border-right: 4px solid #f59e0b;
    }
    
    .stat-number {
      font-size: 24px;
      font-weight: 800;
      display: block;
      margin-bottom: 2px;
    }
    
    .stat-label {
      font-size: 10px;
      opacity: 0.8;
    }
    
    .content-grid {
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: 12px;
    }
    
    .sidebar {
      background: white;
      border-radius: 10px;
      border: 1px solid #e5e7eb;
      overflow: hidden;
    }
    
    .sidebar-header {
      padding: 10px 12px;
      font-weight: 700;
      font-size: 12px;
      background: linear-gradient(90deg, #f3e8ff 0%, #faf5ff 100%);
      border-bottom: 2px solid #a855f7;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .dept-list {
      padding: 8px;
    }
    
    .dept-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 10px;
      border-radius: 6px;
      margin-bottom: 4px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
    }
    
    .dept-name {
      font-weight: 600;
      color: #374151;
      font-size: 10px;
    }
    
    .dept-count {
      background: #7c3aed;
      color: white;
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 10px;
    }
    
    .main-content {
      background: white;
      border-radius: 10px;
      border: 1px solid #e5e7eb;
      overflow: hidden;
    }
    
    .section-header {
      padding: 10px 14px;
      font-weight: 700;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(90deg, #f3e8ff 0%, #faf5ff 100%);
      border-bottom: 2px solid #a855f7;
    }
    
    .section-header .icon {
      width: 26px;
      height: 26px;
      background: #7c3aed;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
    }
    
    .table-container {
      overflow: hidden;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
    }
    
    thead {
      background: linear-gradient(90deg, #7c3aed 0%, #a855f7 100%);
      color: white;
    }
    
    th {
      padding: 8px 6px;
      text-align: right;
      font-weight: 600;
      white-space: nowrap;
    }
    
    td {
      padding: 6px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: middle;
    }
    
    tr:hover {
      background: #faf5ff;
    }
    
    tr:nth-child(even) {
      background: #fafafa;
    }
    
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 8px;
      font-weight: 600;
      white-space: nowrap;
    }
    
    .status-active {
      background: #dcfce7;
      color: #166534;
    }
    
    .status-returned {
      background: #f3f4f6;
      color: #4b5563;
    }
    
    .asset-tag {
      font-family: 'Consolas', monospace;
      background: #f1f5f9;
      padding: 2px 5px;
      border-radius: 4px;
      font-size: 8px;
      direction: ltr;
      display: inline-block;
    }
    
    .employee-cell {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    
    .employee-name {
      font-weight: 600;
      color: #1f2937;
    }
    
    .employee-dept {
      font-size: 8px;
      color: #6b7280;
    }
    
    .device-cell {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    
    .device-type {
      font-weight: 600;
      color: #7c3aed;
    }
    
    .device-model {
      font-size: 8px;
      color: #6b7280;
    }
    
    .date-cell {
      font-size: 9px;
      color: #374151;
    }
    
    .footer {
      background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%);
      color: white;
      padding: 10px 18px;
      border-radius: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 12px;
      font-size: 9px;
    }
    
    .footer-left {
      opacity: 0.9;
    }
    
    .footer-right {
      display: flex;
      gap: 15px;
    }
    
    .footer-stat {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .footer-stat span {
      font-weight: 700;
    }
    
    .no-data {
      text-align: center;
      padding: 25px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  ${getLogoHTML('Sobek')}
  
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="header-right">
        <h1>📋 تقرير تسليمات الأجهزة</h1>
        <p>إدارة تقنية المعلومات - سجل تسليم واستلام الأجهزة</p>
      </div>
      <div class="header-left">
        <div>رقم التقرير: IT-ASN-${reportDate.replace(/-/g, '')}</div>
        <div class="date">📅 ${today}</div>
      </div>
    </div>
    
    <!-- Statistics -->
    <div class="stats-grid">
      <div class="stat-card total">
        <span class="stat-number">${stats.total || 0}</span>
        <span class="stat-label">إجمالي التسليمات</span>
      </div>
      <div class="stat-card active">
        <span class="stat-number">${stats.active || 0}</span>
        <span class="stat-label">تسليمات نشطة</span>
      </div>
      <div class="stat-card returned">
        <span class="stat-number">${stats.returned || 0}</span>
        <span class="stat-label">تم الإرجاع</span>
      </div>
      <div class="stat-card employees">
        <span class="stat-number">${stats.unique_employees || 0}</span>
        <span class="stat-label">موظفين مستلمين</span>
      </div>
      <div class="stat-card devices">
        <span class="stat-number">${stats.unique_devices || 0}</span>
        <span class="stat-label">أجهزة مسلمة</span>
      </div>
    </div>
    
    <!-- Content Grid -->
    <div class="content-grid">
      <!-- Sidebar - Departments -->
      <div class="sidebar">
        <div class="sidebar-header">
          <span>🏢</span> التسليمات حسب القسم
        </div>
        <div class="dept-list">
          ${departments.length > 0 ? departments.map(dept => `
            <div class="dept-item">
              <span class="dept-name">${dept.name || 'غير محدد'}</span>
              <span class="dept-count">${dept.count || 0}</span>
            </div>
          `).join('') : '<div class="no-data">لا توجد بيانات</div>'}
        </div>
      </div>
      
      <!-- Main Content - Assignments Table -->
      <div class="main-content">
        <div class="section-header">
          <div class="icon">📝</div>
          <span>سجل التسليمات (${assignments.length} تسليم)</span>
        </div>
        <div class="table-container">
          ${assignments.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th style="width: 20px">#</th>
                <th>الموظف</th>
                <th>الجهاز</th>
                <th>Asset Tag</th>
                <th>تاريخ التسليم</th>
                <th>تاريخ الإرجاع</th>
                <th>المسلِّم</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${assignments.slice(0, 25).map((assignment, index) => `
                <tr>
                  <td style="text-align: center; font-weight: 600; color: #6b7280">${index + 1}</td>
                  <td>
                    <div class="employee-cell">
                      <span class="employee-name">${assignment.employee_name || '—'}</span>
                      <span class="employee-dept">${assignment.department_name || ''}</span>
                    </div>
                  </td>
                  <td>
                    <div class="device-cell">
                      <span class="device-type">${assignment.device_type_name || '—'}</span>
                      <span class="device-model">${assignment.brand || ''} ${assignment.model || ''}</span>
                    </div>
                  </td>
                  <td><span class="asset-tag">${assignment.asset_tag || '—'}</span></td>
                  <td class="date-cell">${assignment.assigned_date ? new Date(assignment.assigned_date).toLocaleDateString('ar-SA') : '—'}</td>
                  <td class="date-cell">${assignment.returned_date ? new Date(assignment.returned_date).toLocaleDateString('ar-SA') : '—'}</td>
                  <td style="font-size: 8px">${assignment.assigned_by || '—'}</td>
                  <td>
                    <span class="status-badge ${assignment.returned_date ? 'status-returned' : 'status-active'}">
                      ${assignment.returned_date ? '✓ مُرجع' : '● نشط'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${assignments.length > 25 ? `<div style="text-align: center; padding: 8px; color: #6b7280; font-size: 9px">... و ${assignments.length - 25} تسليم آخر</div>` : ''}
          ` : `
          <div class="no-data">
            <p>لا توجد تسليمات مسجلة</p>
          </div>
          `}
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="footer-left">
        تم إنشاء هذا التقرير بواسطة نظام إدارة تقنية المعلومات | ${today}
      </div>
      <div class="footer-right">
        <div class="footer-stat">
          <span>✓</span> تم التحقق
        </div>
        <div class="footer-stat">
          الصفحة <span>1</span> من <span>1</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--font-render-hinting=none'
        ]
      });

      const page = await browser.newPage();
      
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      await page.evaluateHandle('document.fonts.ready');

      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: {
          top: '5mm',
          right: '5mm',
          bottom: '5mm',
          left: '5mm'
        },
        preferCSSPageSize: true
      });

      await browser.close();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=assignments_report_${reportDate}.pdf`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error('PDF Generation Error:', error);
      if (browser) await browser.close();
      res.status(500).json({ error: 'فشل في إنشاء ملف PDF', details: error.message });
    }
    
  } catch (error) {
    console.error('Error generating assignments PDF:', error);
    res.status(500).json({ error: 'حدث خطأ في إنشاء التقرير' });
  }
};

module.exports = {
  generateAssignmentsReportPDF
};
