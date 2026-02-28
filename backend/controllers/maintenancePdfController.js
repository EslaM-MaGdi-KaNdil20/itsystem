const puppeteer = require('puppeteer');
const pool = require('../config/database');
const { getLogoHTML } = require('../utils/logoHelper');

// Generate Maintenance Report PDF
const generateMaintenancePDF = async (req, res) => {
  let browser;
  try {
    const { status, start_date, end_date } = req.query;
    
    // Build query
    let query = `
      SELECT m.*, 
             d.asset_tag, d.brand, d.model, d.serial_number,
             dt.name as device_type, dt.name_ar as device_type_ar,
             e.full_name as assigned_to
      FROM maintenance_records m
      JOIN devices d ON m.device_id = d.id
      JOIN device_types dt ON d.device_type_id = dt.id
      LEFT JOIN device_assignments da ON d.id = da.device_id AND da.returned_date IS NULL
      LEFT JOIN employees e ON da.employee_id = e.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND m.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (start_date) {
      query += ` AND m.start_date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }
    
    if (end_date) {
      query += ` AND m.start_date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }
    
    query += ' ORDER BY m.start_date DESC';
    
    const result = await pool.query(query, params);
    const records = result.rows;
    
    // Get statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        COALESCE(SUM(cost), 0) as total_cost,
        COALESCE(AVG(cost), 0) as avg_cost
      FROM maintenance_records m
      WHERE 1=1
      ${status ? `AND status = '${status}'` : ''}
      ${start_date ? `AND start_date >= '${start_date}'` : ''}
      ${end_date ? `AND start_date <= '${end_date}'` : ''}
    `;
    
    const statsResult = await pool.query(statsQuery);
    const stats = statsResult.rows[0];
    
    const today = new Date().toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
    
    const reportDate = new Date().toISOString().split('T')[0];
    
    // Filter description
    let filterDesc = 'جميع السجلات';
    if (status || start_date || end_date) {
      filterDesc = '';
      if (status) {
        const statusLabels = {
          pending: 'قيد الانتظار',
          in_progress: 'جاري العمل',
          completed: 'مكتمل',
          cancelled: 'ملغي'
        };
        filterDesc += `الحالة: ${statusLabels[status] || status}`;
      }
      if (start_date) {
        filterDesc += `${filterDesc ? ' • ' : ''}من: ${start_date}`;
      }
      if (end_date) {
        filterDesc += `${filterDesc ? ' • ' : ''}إلى: ${end_date}`;
      }
    }

    const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>تقرير الصيانة - ${reportDate}</title>
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
      font-family: 'Tajawal', sans-serif;
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
      background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
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
    
    .filter-info {
      background: #f3f4f6;
      padding: 8px 12px;
      border-radius: 8px;
      margin-bottom: 12px;
      font-size: 11px;
      color: #4b5563;
      text-align: center;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    
    .stat-card {
      background: white;
      border-radius: 8px;
      padding: 10px;
      text-align: center;
      border: 1px solid #e5e7eb;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    
    .stat-card.total { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; border: none; }
    .stat-card.pending { background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); color: white; border: none; }
    .stat-card.in-progress { background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); color: white; border: none; }
    .stat-card.completed { background: linear-gradient(135deg, #10b981 0%, #34d399 100%); color: white; border: none; }
    .stat-card.cancelled { background: linear-gradient(135deg, #ef4444 0%, #f87171 100%); color: white; border: none; }
    
    .stat-value {
      font-size: 20px;
      font-weight: 800;
      margin-bottom: 3px;
    }
    
    .stat-label {
      font-size: 9px;
      opacity: 0.9;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      font-size: 9px;
    }
    
    thead {
      background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
      color: white;
    }
    
    th {
      padding: 8px 6px;
      text-align: center;
      font-weight: 700;
      font-size: 10px;
    }
    
    td {
      padding: 6px 5px;
      text-align: center;
      border-bottom: 1px solid #f3f4f6;
    }
    
    tbody tr:hover {
      background: #f9fafb;
    }
    
    tbody tr:last-child td {
      border-bottom: none;
    }
    
    .status-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 8px;
      font-weight: 600;
    }
    
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-in_progress { background: #dbeafe; color: #1e40af; }
    .status-completed { background: #d1fae5; color: #065f46; }
    .status-cancelled { background: #fee2e2; color: #991b1b; }
    
    .footer {
      margin-top: 15px;
      text-align: center;
      color: #9ca3af;
      font-size: 9px;
      padding-top: 10px;
      border-top: 2px solid #e5e7eb;
    }
    
    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  </style>
</head>
<body>
  ${getLogoHTML('Sobek')}
  
  <div class="page">
    <div class="header">
      <div class="header-right">
        <h1>📋 تقرير سجلات الصيانة</h1>
        <p>نظام إدارة تقنية المعلومات</p>
      </div>
      <div class="header-left">
        <div><strong>تاريخ التقرير:</strong> ${today}</div>
        <div style="margin-top: 5px; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 15px;">
          ${reportDate}
        </div>
      </div>
    </div>
    
    <div class="filter-info">
      <strong>الفلتر المطبق:</strong> ${filterDesc}
    </div>
    
    <div class="stats-grid">
      <div class="stat-card total">
        <div class="stat-value">${stats.total}</div>
        <div class="stat-label">إجمالي السجلات</div>
      </div>
      <div class="stat-card pending">
        <div class="stat-value">${stats.pending}</div>
        <div class="stat-label">قيد الانتظار</div>
      </div>
      <div class="stat-card in-progress">
        <div class="stat-value">${stats.in_progress}</div>
        <div class="stat-label">جاري العمل</div>
      </div>
      <div class="stat-card completed">
        <div class="stat-value">${stats.completed}</div>
        <div class="stat-label">مكتمل</div>
      </div>
      <div class="stat-card cancelled">
        <div class="stat-value">${stats.cancelled}</div>
        <div class="stat-label">ملغي</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${parseFloat(stats.total_cost || 0).toLocaleString('ar-EG')} ج.م</div>
        <div class="stat-label">التكلفة الإجمالية</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${parseFloat(stats.avg_cost || 0).toFixed(0)} ج.م</div>
        <div class="stat-label">متوسط التكلفة</div>
      </div>
    </div>
    
    <table>
      <thead>
        <tr>
          <th style="width: 5%;">#</th>
          <th style="width: 10%;">Asset Tag</th>
          <th style="width: 12%;">نوع الجهاز</th>
          <th style="width: 13%;">نوع الصيانة</th>
          <th style="width: 18%;">الوصف</th>
          <th style="width: 9%;">تاريخ البدء</th>
          <th style="width: 9%;">تاريخ الانتهاء</th>
          <th style="width: 10%;">القائم بالصيانة</th>
          <th style="width: 7%;">التكلفة</th>
          <th style="width: 7%;">الحالة</th>
        </tr>
      </thead>
      <tbody>
        ${records.length === 0 ? '<tr><td colspan="10" style="padding: 20px; text-align: center; color: #9ca3af;">لا توجد سجلات صيانة</td></tr>' : ''}
        ${records.map((record, index) => {
          const statusLabels = {
            pending: 'قيد الانتظار',
            in_progress: 'جاري العمل',
            completed: 'مكتمل',
            cancelled: 'ملغي'
          };
          
          return `
            <tr>
              <td>${index + 1}</td>
              <td style="font-family: monospace; font-weight: 600;">${record.asset_tag || '—'}</td>
              <td>${record.device_type_ar || record.device_type || '—'}</td>
              <td>${record.maintenance_type || '—'}</td>
              <td style="text-align: right; font-size: 8px;">${record.description ? record.description.substring(0, 60) + (record.description.length > 60 ? '...' : '') : '—'}</td>
              <td>${record.start_date ? new Date(record.start_date).toLocaleDateString('ar-SA') : '—'}</td>
              <td>${record.end_date ? new Date(record.end_date).toLocaleDateString('ar-SA') : '—'}</td>
              <td>${record.performed_by || '—'}</td>
              <td style="font-family: monospace; font-weight: 600;">${record.cost ? parseFloat(record.cost).toLocaleString('ar-EG') : '—'}</td>
              <td><span class="status-badge status-${record.status}">${statusLabels[record.status] || record.status}</span></td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
    
    <div class="footer">
      تم إنشاء هذا التقرير تلقائياً بواسطة نظام إدارة تقنية المعلومات • ${today}
    </div>
  </div>
</body>
</html>
    `;

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

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
    res.setHeader('Content-Disposition', `attachment; filename=maintenance_report_${reportDate}.pdf`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF Generation Error:', error);
    if (browser) await browser.close();
    res.status(500).json({ error: 'فشل في إنشاء ملف PDF', details: error.message });
  }
};

module.exports = {
  generateMaintenancePDF
};
