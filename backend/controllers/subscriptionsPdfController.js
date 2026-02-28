const puppeteer = require('puppeteer');
const pool = require('../config/database');
const { getLogoHTML } = require('../utils/logoHelper');

const generateSubscriptionsPDF = async (req, res) => {
  let browser;
  try {
    // Get filters from query params
    const { status, provider } = req.query;

    // Build query with filters
    let query = 'SELECT * FROM subscriptions WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (provider && provider !== 'all') {
      params.push(provider);
      query += ` AND provider = $${params.length}`;
    }

    query += ' ORDER BY end_date ASC';

    const result = await pool.query(query, params);
    const subscriptions = result.rows;

    // Calculate statistics
    const stats = {
      total: subscriptions.length,
      active: subscriptions.filter(s => s.status === 'active').length,
      expired: subscriptions.filter(s => s.status === 'expired').length,
      expiringSoon: subscriptions.filter(s => {
        if (s.status !== 'active') return false;
        const daysRemaining = Math.ceil((new Date(s.end_date) - new Date()) / (1000 * 60 * 60 * 24));
        return daysRemaining <= 30 && daysRemaining >= 0;
      }).length,
      totalCost: subscriptions.reduce((sum, s) => sum + (parseFloat(s.cost) || 0), 0),
    };

    // Generate HTML for PDF
    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            direction: rtl;
            padding: 30px;
            background: white;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #667eea;
          }
          
          .header h1 {
            color: #667eea;
            font-size: 32px;
            margin-bottom: 10px;
          }
          
          .header .date {
            color: #666;
            font-size: 14px;
          }
          
          .stats {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 15px;
            margin-bottom: 30px;
          }
          
          .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px;
            border-radius: 10px;
            text-align: center;
          }
          
          .stat-card.active {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          }
          
          .stat-card.expired {
            background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
          }
          
          .stat-card.expiring {
            background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);
          }
          
          .stat-card.cost {
            background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
          }
          
          .stat-card .value {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .stat-card .label {
            font-size: 12px;
            opacity: 0.9;
          }
          
          .filters {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
          }
          
          .filters strong {
            color: #667eea;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 12px;
          }
          
          thead {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          
          th {
            padding: 12px 8px;
            text-align: right;
            font-weight: 600;
          }
          
          td {
            padding: 10px 8px;
            text-align: right;
            border-bottom: 1px solid #dee2e6;
          }
          
          tbody tr:hover {
            background-color: #f8f9fa;
          }
          
          tbody tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          
          .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: bold;
            color: white;
          }
          
          .badge.active {
            background-color: #28a745;
          }
          
          .badge.expired {
            background-color: #dc3545;
          }
          
          .badge.expiring {
            background-color: #ffc107;
            color: #333;
          }
          
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #dee2e6;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          
          .no-data {
            text-align: center;
            padding: 40px;
            color: #666;
            font-size: 18px;
          }
          
          @media print {
            body {
              padding: 20px;
            }
          }
        </style>
      </head>
      <body>
        ${getLogoHTML('Sobek')}
        
        <div class="header">
          <h1>📋 تقرير الاشتراكات</h1>
          <div class="date">تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</div>
        </div>
        
        ${status || provider ? `
        <div class="filters">
          <strong>الفلاتر المطبقة:</strong>
          ${status && status !== 'all' ? `الحالة: ${status === 'active' ? 'نشط' : status === 'expired' ? 'منتهي' : status}` : ''}
          ${provider && provider !== 'all' ? ` | المزود: ${provider}` : ''}
        </div>
        ` : ''}
        
        <div class="stats">
          <div class="stat-card">
            <div class="value">${stats.total}</div>
            <div class="label">إجمالي الاشتراكات</div>
          </div>
          <div class="stat-card active">
            <div class="value">${stats.active}</div>
            <div class="label">نشط</div>
          </div>
          <div class="stat-card expired">
            <div class="value">${stats.expired}</div>
            <div class="label">منتهي</div>
          </div>
          <div class="stat-card expiring">
            <div class="value">${stats.expiringSoon}</div>
            <div class="label">ينتهي قريباً</div>
          </div>
          <div class="stat-card cost">
            <div class="value">${stats.totalCost.toFixed(2)}</div>
            <div class="label">إجمالي التكلفة (جنيه)</div>
          </div>
        </div>
        
        ${subscriptions.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th style="width: 5%">#</th>
              <th style="width: 20%">اسم الاشتراك</th>
              <th style="width: 15%">المزود</th>
              <th style="width: 12%">النوع</th>
              <th style="width: 10%">التكلفة</th>
              <th style="width: 10%">دورة الدفع</th>
              <th style="width: 10%">تاريخ البداية</th>
              <th style="width: 10%">تاريخ الانتهاء</th>
              <th style="width: 8%">الحالة</th>
            </tr>
          </thead>
          <tbody>
            ${subscriptions.map((sub, index) => {
              const daysRemaining = Math.ceil((new Date(sub.end_date) - new Date()) / (1000 * 60 * 60 * 24));
              const isExpiring = sub.status === 'active' && daysRemaining <= 30 && daysRemaining >= 0;
              
              return `
              <tr>
                <td>${index + 1}</td>
                <td><strong>${sub.name}</strong></td>
                <td>${sub.provider || '-'}</td>
                <td>${sub.subscription_type || '-'}</td>
                <td>${sub.cost ? parseFloat(sub.cost).toFixed(2) + ' ج' : '-'}</td>
                <td>${sub.billing_cycle === 'monthly' ? 'شهري' : 
                       sub.billing_cycle === 'yearly' ? 'سنوي' : 
                       sub.billing_cycle === 'quarterly' ? 'ربع سنوي' : 
                       sub.billing_cycle || '-'}</td>
                <td>${sub.start_date ? new Date(sub.start_date).toLocaleDateString('ar-EG') : '-'}</td>
                <td>${sub.end_date ? new Date(sub.end_date).toLocaleDateString('ar-EG') : '-'}</td>
                <td>
                  <span class="badge ${isExpiring ? 'expiring' : sub.status}">
                    ${sub.status === 'active' ? (isExpiring ? `ينتهي في ${daysRemaining} يوم` : '✓ نشط') : 
                      sub.status === 'expired' ? '✗ منتهي' : sub.status}
                  </span>
                </td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        ` : `
        <div class="no-data">
          🔍 لا توجد اشتراكات متطابقة مع الفلاتر المحددة
        </div>
        `}
        
        <div class="footer">
          <p>تم إنشاء هذا التقرير بواسطة نظام إدارة تكنولوجيا المعلومات</p>
          <p>Sobek IT Management System © 2026</p>
        </div>
      </body>
      </html>
    `;

    // Launch browser and generate PDF
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    await browser.close();

    // Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=subscriptions-report-${Date.now()}.pdf`);
    res.send(pdf);

  } catch (error) {
    console.error('Error generating subscriptions PDF:', error);
    if (browser) await browser.close();
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
};

module.exports = {
  generateSubscriptionsPDF,
};
