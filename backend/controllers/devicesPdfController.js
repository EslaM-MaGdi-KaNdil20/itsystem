const puppeteer = require('puppeteer');
const pool = require('../config/database');

// Generate Devices Report PDF
const generateDevicesReportPDF = async (req, res) => {
  try {
    const { status, device_type_id } = req.query;
    
    // Fetch devices with filters
    let query = `
      SELECT d.*, dt.name as device_type_name,
             e.full_name as assigned_to_name,
             dep.name as department_name
      FROM devices d
      LEFT JOIN device_types dt ON d.device_type_id = dt.id
      LEFT JOIN (
        SELECT DISTINCT ON (device_id) device_id, employee_id
        FROM device_assignments
        WHERE returned_date IS NULL
        ORDER BY device_id, assigned_date DESC
      ) da ON d.id = da.device_id
      LEFT JOIN employees e ON da.employee_id = e.id
      LEFT JOIN departments dep ON e.department_id = dep.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
      query += ` AND d.status = $${params.length + 1}`;
      params.push(status);
    }
    
    if (device_type_id) {
      query += ` AND d.device_type_id = $${params.length + 1}`;
      params.push(device_type_id);
    }
    
    query += ' ORDER BY dt.name ASC, d.brand ASC, d.model ASC';
    
    const result = await pool.query(query, params);
    const devices = result.rows;
    
    // Get statistics
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance,
        COUNT(CASE WHEN status = 'retired' THEN 1 END) as retired,
        COUNT(CASE WHEN status = 'in_stock' THEN 1 END) as in_stock
      FROM devices
    `);
    const stats = statsResult.rows[0];
    
    // Get device types for summary
    const typesResult = await pool.query(`
      SELECT dt.name, COUNT(d.id) as count
      FROM device_types dt
      LEFT JOIN devices d ON dt.id = d.device_type_id
      GROUP BY dt.id, dt.name
      ORDER BY count DESC
    `);
    const deviceTypes = typesResult.rows;
    
    const today = new Date().toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
    
    const reportDate = new Date().toISOString().split('T')[0];
    
    // Status translation
    const statusAr = {
      'active': 'نشط',
      'maintenance': 'صيانة',
      'retired': 'متقاعد',
      'in_stock': 'في المخزن'
    };
    
    const statusColors = {
      'active': '#22c55e',
      'maintenance': '#f59e0b',
      'retired': '#ef4444',
      'in_stock': '#3b82f6'
    };

    const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>تقرير جرد الأجهزة - ${reportDate}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;600;700;800&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: A4;
      margin: 10mm;
    }
    
    body {
      font-family: 'Tajawal', 'Segoe UI', Tahoma, sans-serif;
      background: #fff;
      color: #1f2937;
      font-size: 11px;
      line-height: 1.4;
      direction: rtl;
    }
    
    .page {
      padding: 15px;
      background: white;
    }
    
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #1e40af 100%);
      color: white;
      padding: 20px 25px;
      border-radius: 12px;
      margin-bottom: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .header-right h1 {
      font-size: 24px;
      font-weight: 800;
      margin-bottom: 5px;
    }
    
    .header-right p {
      font-size: 14px;
      opacity: 0.9;
    }
    
    .header-left {
      text-align: left;
      font-size: 12px;
      opacity: 0.9;
    }
    
    .header-left .date {
      font-size: 11px;
      margin-top: 5px;
      background: rgba(255,255,255,0.2);
      padding: 5px 12px;
      border-radius: 20px;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
      margin-bottom: 15px;
    }
    
    .stat-card {
      background: white;
      border-radius: 10px;
      padding: 15px;
      text-align: center;
      border: 1px solid #e5e7eb;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    
    .stat-card.total {
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      color: white;
      border: none;
    }
    
    .stat-card.active {
      border-right: 4px solid #22c55e;
    }
    
    .stat-card.maintenance {
      border-right: 4px solid #f59e0b;
    }
    
    .stat-card.retired {
      border-right: 4px solid #ef4444;
    }
    
    .stat-card.in_stock {
      border-right: 4px solid #3b82f6;
    }
    
    .stat-number {
      font-size: 28px;
      font-weight: 800;
      display: block;
      margin-bottom: 3px;
    }
    
    .stat-label {
      font-size: 11px;
      opacity: 0.8;
    }
    
    .section {
      background: white;
      border-radius: 10px;
      margin-bottom: 12px;
      border: 1px solid #e5e7eb;
      overflow: hidden;
      page-break-inside: avoid;
    }
    
    .section-header {
      padding: 12px 16px;
      font-weight: 700;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(90deg, #f8fafc 0%, #f1f5f9 100%);
      border-bottom: 2px solid #3b82f6;
    }
    
    .section-header .icon {
      width: 28px;
      height: 28px;
      background: #3b82f6;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 14px;
    }
    
    .types-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      padding: 12px;
    }
    
    .type-item {
      background: #f8fafc;
      padding: 10px 12px;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid #e2e8f0;
    }
    
    .type-name {
      font-weight: 600;
      color: #374151;
    }
    
    .type-count {
      background: #3b82f6;
      color: white;
      padding: 3px 10px;
      border-radius: 15px;
      font-weight: 700;
      font-size: 12px;
    }
    
    .table-container {
      overflow: hidden;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    
    thead {
      background: linear-gradient(90deg, #1e3a8a 0%, #3b82f6 100%);
      color: white;
    }
    
    th {
      padding: 10px 8px;
      text-align: right;
      font-weight: 600;
      white-space: nowrap;
    }
    
    td {
      padding: 8px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: middle;
    }
    
    tr:hover {
      background: #f8fafc;
    }
    
    tr:nth-child(even) {
      background: #fafafa;
    }
    
    .status-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 9px;
      font-weight: 600;
      white-space: nowrap;
    }
    
    .status-active {
      background: #dcfce7;
      color: #166534;
    }
    
    .status-maintenance {
      background: #fef3c7;
      color: #92400e;
    }
    
    .status-retired {
      background: #fee2e2;
      color: #991b1b;
    }
    
    .status-in_stock {
      background: #dbeafe;
      color: #1e40af;
    }
    
    .asset-tag {
      font-family: 'Consolas', monospace;
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      direction: ltr;
      display: inline-block;
    }
    
    .serial {
      font-family: 'Consolas', monospace;
      font-size: 9px;
      color: #6b7280;
      direction: ltr;
    }
    
    .specs {
      font-size: 9px;
      color: #6b7280;
    }
    
    .employee-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .employee-name {
      font-weight: 600;
      color: #1f2937;
    }
    
    .employee-dept {
      font-size: 9px;
      color: #6b7280;
    }
    
    .footer {
      background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
      color: white;
      padding: 12px 20px;
      border-radius: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 15px;
      font-size: 10px;
    }
    
    .footer-left {
      opacity: 0.9;
    }
    
    .footer-right {
      display: flex;
      gap: 20px;
    }
    
    .footer-stat {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    
    .footer-stat span {
      font-weight: 700;
    }
    
    .no-data {
      text-align: center;
      padding: 30px;
      color: #6b7280;
    }
    
    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="header-right">
        <h1>📊 تقرير جرد الأجهزة</h1>
        <p>إدارة تقنية المعلومات - جرد شامل للأصول التقنية</p>
      </div>
      <div class="header-left">
        <div>رقم التقرير: IT-INV-${reportDate.replace(/-/g, '')}</div>
        <div class="date">📅 ${today}</div>
      </div>
    </div>
    
    <!-- Statistics -->
    <div class="stats-grid">
      <div class="stat-card total">
        <span class="stat-number">${stats.total || 0}</span>
        <span class="stat-label">إجمالي الأجهزة</span>
      </div>
      <div class="stat-card active">
        <span class="stat-number">${stats.active || 0}</span>
        <span class="stat-label">أجهزة نشطة</span>
      </div>
      <div class="stat-card maintenance">
        <span class="stat-number">${stats.maintenance || 0}</span>
        <span class="stat-label">في الصيانة</span>
      </div>
      <div class="stat-card retired">
        <span class="stat-number">${stats.retired || 0}</span>
        <span class="stat-label">متقاعدة</span>
      </div>
      <div class="stat-card in_stock">
        <span class="stat-number">${stats.in_stock || 0}</span>
        <span class="stat-label">في المخزن</span>
      </div>
    </div>
    
    <!-- Device Types Summary -->
    <div class="section">
      <div class="section-header">
        <div class="icon">📱</div>
        <span>ملخص أنواع الأجهزة</span>
      </div>
      <div class="types-grid">
        ${deviceTypes.map(type => `
          <div class="type-item">
            <span class="type-name">${type.name || 'غير محدد'}</span>
            <span class="type-count">${type.count || 0}</span>
          </div>
        `).join('')}
      </div>
    </div>
    
    <!-- Devices Table -->
    <div class="section">
      <div class="section-header">
        <div class="icon">💻</div>
        <span>قائمة الأجهزة التفصيلية (${devices.length} جهاز)</span>
      </div>
      <div class="table-container">
        ${devices.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th style="width: 25px">#</th>
              <th>Asset Tag</th>
              <th>النوع</th>
              <th>الشركة / الموديل</th>
              <th>الرقم التسلسلي</th>
              <th>المواصفات</th>
              <th>المستلم</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            ${devices.map((device, index) => `
              <tr>
                <td style="text-align: center; font-weight: 600; color: #6b7280">${index + 1}</td>
                <td><span class="asset-tag">${device.asset_tag || '—'}</span></td>
                <td>${device.device_type_name || '—'}</td>
                <td>
                  <strong>${device.brand || '—'}</strong>
                  ${device.model ? `<br><span style="color: #6b7280; font-size: 9px">${device.model}</span>` : ''}
                </td>
                <td><span class="serial">${device.serial_number || '—'}</span></td>
                <td class="specs">
                  ${device.cpu ? `CPU: ${device.cpu}<br>` : ''}
                  ${device.ram ? `RAM: ${device.ram}` : ''}
                  ${device.storage ? `<br>Storage: ${device.storage}` : ''}
                </td>
                <td>
                  ${device.assigned_to_name ? `
                    <div class="employee-cell">
                      <span class="employee-name">${device.assigned_to_name}</span>
                      ${device.department_name ? `<span class="employee-dept">${device.department_name}</span>` : ''}
                    </div>
                  ` : '<span style="color: #9ca3af">— غير مسلم —</span>'}
                </td>
                <td>
                  <span class="status-badge status-${device.status || 'active'}">
                    ${statusAr[device.status] || device.status || 'نشط'}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : `
        <div class="no-data">
          <p>لا توجد أجهزة مطابقة للبحث</p>
        </div>
        `}
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

      // Wait for fonts to load
      await page.evaluateHandle('document.fonts.ready');

      const pdfBuffer = await page.pdf({
        format: 'A4',
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
      res.setHeader('Content-Disposition', `attachment; filename=devices_report_${reportDate}.pdf`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error('PDF Generation Error:', error);
      if (browser) await browser.close();
      res.status(500).json({ error: 'فشل في إنشاء ملف PDF', details: error.message });
    }
    
  } catch (error) {
    console.error('Error generating devices PDF:', error);
    res.status(500).json({ error: 'حدث خطأ في إنشاء التقرير' });
  }
};

module.exports = {
  generateDevicesReportPDF
};
