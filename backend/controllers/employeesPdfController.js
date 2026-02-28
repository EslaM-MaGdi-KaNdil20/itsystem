const puppeteer = require('puppeteer');
const pool = require('../config/database');

// Generate Employees Report PDF
const generateEmployeesReportPDF = async (req, res) => {
  try {
    // Fetch employees with department info
    const result = await pool.query(`
      SELECT e.*, d.name as department_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      ORDER BY e.full_name
    `);
    const employees = result.rows;
    
    // Get statistics
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT department_id) as departments_count
      FROM employees
    `);
    const stats = statsResult.rows[0];
    
    // Get department summary
    const deptResult = await pool.query(`
      SELECT d.name, COUNT(e.id) as count
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      GROUP BY d.id, d.name
      ORDER BY count DESC
      LIMIT 8
    `);
    const departments = deptResult.rows;
    
    // Get job titles summary
    const jobsResult = await pool.query(`
      SELECT job_title, COUNT(*) as count
      FROM employees
      WHERE job_title IS NOT NULL AND job_title != ''
      GROUP BY job_title
      ORDER BY count DESC
      LIMIT 6
    `);
    const jobTitles = jobsResult.rows;
    
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
  <title>تقرير الموظفين - ${reportDate}</title>
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
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #2563eb 100%);
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
      grid-template-columns: repeat(4, 1fr);
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
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      border: none;
    }
    
    .stat-card.departments {
      border-right: 4px solid #8b5cf6;
    }
    
    .stat-card.jobs {
      border-right: 4px solid #f59e0b;
    }
    
    .stat-card.active {
      border-right: 4px solid #22c55e;
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
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    
    .sidebar-card {
      background: white;
      border-radius: 10px;
      border: 1px solid #e5e7eb;
      overflow: hidden;
    }
    
    .sidebar-header {
      padding: 10px 12px;
      font-weight: 700;
      font-size: 11px;
      background: linear-gradient(90deg, #dbeafe 0%, #eff6ff 100%);
      border-bottom: 2px solid #3b82f6;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .dept-list, .job-list {
      padding: 8px;
    }
    
    .dept-item, .job-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 8px;
      border-radius: 6px;
      margin-bottom: 4px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
    }
    
    .dept-name, .job-name {
      font-weight: 600;
      color: #374151;
      font-size: 9px;
    }
    
    .dept-count, .job-count {
      background: #3b82f6;
      color: white;
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 9px;
    }
    
    .job-count {
      background: #f59e0b;
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
      background: linear-gradient(90deg, #dbeafe 0%, #eff6ff 100%);
      border-bottom: 2px solid #3b82f6;
    }
    
    .section-header .icon {
      width: 26px;
      height: 26px;
      background: #3b82f6;
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
      background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%);
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
      background: #eff6ff;
    }
    
    tr:nth-child(even) {
      background: #fafafa;
    }
    
    .employee-code {
      font-family: 'Consolas', monospace;
      background: #dbeafe;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      color: #1d4ed8;
      font-weight: 600;
    }
    
    .employee-name {
      font-weight: 600;
      color: #1f2937;
    }
    
    .department-badge {
      background: #f3e8ff;
      color: #7c3aed;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 8px;
      font-weight: 600;
    }
    
    .job-badge {
      background: #fef3c7;
      color: #b45309;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 8px;
      font-weight: 600;
    }
    
    .contact-cell {
      font-size: 8px;
      color: #6b7280;
    }
    
    .contact-cell a {
      color: #3b82f6;
      text-decoration: none;
    }
    
    .footer {
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
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
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="header-right">
        <h1>👥 تقرير بيانات الموظفين</h1>
        <p>إدارة الموارد البشرية - سجل الموظفين الشامل</p>
      </div>
      <div class="header-left">
        <div>رقم التقرير: HR-EMP-${reportDate.replace(/-/g, '')}</div>
        <div class="date">📅 ${today}</div>
      </div>
    </div>
    
    <!-- Statistics -->
    <div class="stats-grid">
      <div class="stat-card total">
        <span class="stat-number">${stats.total || 0}</span>
        <span class="stat-label">إجمالي الموظفين</span>
      </div>
      <div class="stat-card departments">
        <span class="stat-number">${stats.departments_count || 0}</span>
        <span class="stat-label">عدد الأقسام</span>
      </div>
      <div class="stat-card jobs">
        <span class="stat-number">${jobTitles.length || 0}</span>
        <span class="stat-label">المسميات الوظيفية</span>
      </div>
      <div class="stat-card active">
        <span class="stat-number">${stats.total || 0}</span>
        <span class="stat-label">موظفين نشطين</span>
      </div>
    </div>
    
    <!-- Content Grid -->
    <div class="content-grid">
      <!-- Sidebar -->
      <div class="sidebar">
        <div class="sidebar-card">
          <div class="sidebar-header">
            <span>🏢</span> الموظفين حسب القسم
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
        
        <div class="sidebar-card">
          <div class="sidebar-header">
            <span>💼</span> المسميات الوظيفية
          </div>
          <div class="job-list">
            ${jobTitles.length > 0 ? jobTitles.map(job => `
              <div class="job-item">
                <span class="job-name">${job.job_title || 'غير محدد'}</span>
                <span class="job-count">${job.count || 0}</span>
              </div>
            `).join('') : '<div class="no-data">لا توجد بيانات</div>'}
          </div>
        </div>
      </div>
      
      <!-- Main Content - Employees Table -->
      <div class="main-content">
        <div class="section-header">
          <div class="icon">📋</div>
          <span>سجل الموظفين (${employees.length} موظف)</span>
        </div>
        <div class="table-container">
          ${employees.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th style="width: 20px">#</th>
                <th>الكود</th>
                <th>الاسم الكامل</th>
                <th>القسم</th>
                <th>المسمى الوظيفي</th>
                <th>البريد الإلكتروني</th>
                <th>الهاتف</th>
                <th>التحويلة</th>
              </tr>
            </thead>
            <tbody>
              ${employees.slice(0, 30).map((emp, index) => `
                <tr>
                  <td style="text-align: center; font-weight: 600; color: #6b7280">${index + 1}</td>
                  <td><span class="employee-code">${emp.employee_code || '—'}</span></td>
                  <td class="employee-name">${emp.full_name || '—'}</td>
                  <td><span class="department-badge">${emp.department_name || '—'}</span></td>
                  <td><span class="job-badge">${emp.job_title || '—'}</span></td>
                  <td class="contact-cell">${emp.email || '—'}</td>
                  <td class="contact-cell" style="direction: ltr; text-align: right">${emp.phone || '—'}</td>
                  <td style="text-align: center">${emp.extension || '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${employees.length > 30 ? `<div style="text-align: center; padding: 8px; color: #6b7280; font-size: 9px">... و ${employees.length - 30} موظف آخر</div>` : ''}
          ` : `
          <div class="no-data">
            <p>لا يوجد موظفين مسجلين</p>
          </div>
          `}
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="footer-left">
        تم إنشاء هذا التقرير بواسطة نظام إدارة الموارد البشرية | ${today}
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
      res.setHeader('Content-Disposition', `attachment; filename=employees_report_${reportDate}.pdf`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error('PDF Generation Error:', error);
      if (browser) await browser.close();
      res.status(500).json({ error: 'فشل في إنشاء ملف PDF', details: error.message });
    }
    
  } catch (error) {
    console.error('Error generating employees PDF:', error);
    res.status(500).json({ error: 'حدث خطأ في إنشاء التقرير' });
  }
};

module.exports = {
  generateEmployeesReportPDF
};
