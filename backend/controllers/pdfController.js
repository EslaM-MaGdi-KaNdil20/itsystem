const puppeteer = require('puppeteer');

// Generate Assignment PDF
const generateAssignmentPDF = async (req, res) => {
  const { device, assignment } = req.body;
  
  if (!device || !assignment) {
    return res.status(400).json({ error: 'بيانات الجهاز والتسليم مطلوبة' });
  }

  const today = new Date().toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });

  const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>أمر تسليم - ${assignment.employee_name || 'جهاز'}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: A4;
      margin: 8mm;
    }
    
    body {
      font-family: 'Tajawal', 'Segoe UI', Tahoma, sans-serif;
      background: #fff;
      color: #1f2937;
      font-size: 12px;
      line-height: 1.5;
      direction: rtl;
    }
    
    .page {
      padding: 10px;
      background: white;
    }
    
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #1e40af 100%);
      color: white;
      padding: 18px 20px;
      border-radius: 10px;
      margin-bottom: 12px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 22px;
      font-weight: 800;
      margin-bottom: 4px;
    }
    
    .header p {
      font-size: 13px;
      opacity: 0.95;
    }
    
    .meta-bar {
      display: flex;
      justify-content: space-between;
      background: #f1f5f9;
      padding: 10px 16px;
      border-radius: 8px;
      margin-bottom: 12px;
      border: 1px solid #e2e8f0;
      font-size: 12px;
    }
    
    .meta-item strong {
      color: #3b82f6;
    }
    
    .section {
      background: white;
      border-radius: 8px;
      margin-bottom: 10px;
      border: 1px solid #e5e7eb;
      overflow: hidden;
    }
    
    .section-header {
      padding: 8px 14px;
      font-weight: 700;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .section-header.blue {
      background: linear-gradient(90deg, #dbeafe 0%, #eff6ff 100%);
      color: #1e40af;
      border-bottom: 2px solid #3b82f6;
    }
    
    .section-header.green {
      background: linear-gradient(90deg, #dcfce7 0%, #f0fdf4 100%);
      color: #166534;
      border-bottom: 2px solid #22c55e;
    }
    
    .section-header.amber {
      background: linear-gradient(90deg, #fef3c7 0%, #fffbeb 100%);
      color: #92400e;
      border-bottom: 2px solid #f59e0b;
    }
    
    .section-header.pink {
      background: linear-gradient(90deg, #fce7f3 0%, #fdf2f8 100%);
      color: #9d174d;
      border-bottom: 2px solid #ec4899;
    }
    
    .section-body {
      padding: 12px 14px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    
    .info-item {
      background: #f9fafb;
      padding: 8px 10px;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
    }
    
    .info-label {
      font-size: 10px;
      color: #6b7280;
      margin-bottom: 2px;
      display: block;
    }
    
    .info-value {
      font-weight: 600;
      color: #1f2937;
      font-size: 12px;
    }
    
    .info-value.ltr {
      direction: ltr;
      text-align: left;
      font-family: 'Consolas', 'Monaco', monospace;
    }
    
    .credentials-warning {
      background: #fef3c7;
      border: 1px solid #fcd34d;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 10px;
      font-size: 11px;
      color: #92400e;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .credentials-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    
    .credential-box {
      background: white;
      padding: 10px;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
    }
    
    .credential-label {
      font-size: 9px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    
    .credential-value {
      font-family: 'Consolas', 'Monaco', monospace;
      font-weight: 600;
      color: #1f2937;
      direction: ltr;
      text-align: left;
      font-size: 12px;
    }
    
    .terms-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    
    .terms-list li {
      padding: 5px 0;
      padding-right: 20px;
      position: relative;
      font-size: 11px;
      color: #4b5563;
      border-bottom: 1px dashed #e5e7eb;
    }
    
    .terms-list li:last-child {
      border-bottom: none;
    }
    
    .terms-list li::before {
      content: '✓';
      position: absolute;
      right: 0;
      color: #22c55e;
      font-weight: bold;
    }
    
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-top: 12px;
    }
    
    .signature-box {
      text-align: center;
      padding: 12px;
      border: 2px dashed #d1d5db;
      border-radius: 10px;
      background: #fafafa;
    }
    
    .signature-title {
      color: #6b7280;
      font-weight: 600;
      font-size: 12px;
      margin-bottom: 30px;
    }
    
    .signature-line {
      border-top: 2px solid #374151;
      margin: 0 12px;
      padding-top: 8px;
    }
    
    .signature-name {
      font-weight: 700;
      color: #1f2937;
      font-size: 12px;
    }
    
    .signature-date {
      font-size: 10px;
      color: #9ca3af;
      margin-top: 3px;
    }
    
    .footer {
      background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
      color: white;
      padding: 10px 16px;
      border-radius: 8px;
      text-align: center;
      font-size: 10px;
      margin-top: 12px;
    }
    
    .status-badge {
      display: inline-block;
      background: #dcfce7;
      color: #166534;
      padding: 4px 10px;
      border-radius: 15px;
      font-size: 11px;
      font-weight: 600;
      border: 1px solid #bbf7d0;
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
      <div class="meta-item">
        <strong>رقم النموذج:</strong> IT-ASN-${String(assignment.id || '000').padStart(4, '0')}
      </div>
      <div class="meta-item">
        <strong>التاريخ:</strong> ${assignment.assigned_date || today}
      </div>
    </div>
    
    <div class="section">
      <div class="section-header blue">
        <span>👤</span> بيانات الموظف المستلم
      </div>
      <div class="section-body">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">الاسم الكامل</span>
            <span class="info-value">${assignment.employee_name || '—'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">القسم / الإدارة</span>
            <span class="info-value">${assignment.department_name || '—'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">الرقم الوظيفي</span>
            <span class="info-value">${assignment.employee_id || '—'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">تاريخ التسليم</span>
            <span class="info-value">${assignment.assigned_date || today}</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-header green">
        <span>💻</span> بيانات الجهاز / المعدات
      </div>
      <div class="section-body">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">نوع الجهاز</span>
            <span class="info-value">${device.device_type_ar || device.device_type_name || '—'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Asset Tag</span>
            <span class="info-value ltr">${device.asset_tag || '—'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">الشركة المصنعة</span>
            <span class="info-value">${device.brand || '—'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">الموديل</span>
            <span class="info-value">${device.model || '—'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">الرقم التسلسلي</span>
            <span class="info-value ltr">${device.serial_number || '—'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">حالة الجهاز</span>
            <span class="status-badge">✓ صالح للاستخدام</span>
          </div>
          ${device.cpu ? `
          <div class="info-item">
            <span class="info-label">المعالج (CPU)</span>
            <span class="info-value ltr">${device.cpu}</span>
          </div>
          ` : ''}
          ${device.ram ? `
          <div class="info-item">
            <span class="info-label">الذاكرة (RAM)</span>
            <span class="info-value">${device.ram}</span>
          </div>
          ` : ''}
          ${device.storage ? `
          <div class="info-item">
            <span class="info-label">التخزين</span>
            <span class="info-value">${device.storage}</span>
          </div>
          ` : ''}
          ${device.ip_address ? `
          <div class="info-item">
            <span class="info-label">عنوان IP</span>
            <span class="info-value ltr">${device.ip_address}</span>
          </div>
          ` : ''}
        </div>
      </div>
    </div>
    
    ${(assignment.windows_username || assignment.email_account) ? `
    <div class="section">
      <div class="section-header amber">
        <span>🔐</span> بيانات الدخول والحسابات
      </div>
      <div class="section-body">
        <div class="credentials-warning">
          <span>⚠️</span>
          <span>هذه البيانات سرية للغاية - يرجى الحفاظ عليها وعدم مشاركتها</span>
        </div>
        <div class="credentials-grid">
          ${assignment.windows_username ? `
          <div class="credential-box">
            <div class="credential-label">اسم مستخدم Windows</div>
            <div class="credential-value">${assignment.windows_username}</div>
          </div>
          ` : ''}
          ${assignment.windows_password ? `
          <div class="credential-box">
            <div class="credential-label">كلمة مرور Windows</div>
            <div class="credential-value">${assignment.windows_password}</div>
          </div>
          ` : ''}
          ${assignment.email_account ? `
          <div class="credential-box">
            <div class="credential-label">البريد الإلكتروني</div>
            <div class="credential-value">${assignment.email_account}</div>
          </div>
          ` : ''}
          ${assignment.email_password ? `
          <div class="credential-box">
            <div class="credential-label">كلمة مرور البريد</div>
            <div class="credential-value">${assignment.email_password}</div>
          </div>
          ` : ''}
        </div>
      </div>
    </div>
    ` : ''}
    
    <div class="section">
      <div class="section-header pink">
        <span>📋</span> التعهدات والشروط
      </div>
      <div class="section-body">
        <ul class="terms-list">
          <li>أتعهد بالمحافظة على الجهاز المسلم إليّ واستخدامه لأغراض العمل الرسمية فقط</li>
          <li>أتعهد بعدم تثبيت أي برامج غير مرخصة أو غير معتمدة من إدارة تقنية المعلومات</li>
          <li>أتعهد بإبلاغ إدارة تقنية المعلومات فوراً عند حدوث أي خلل أو عطل في الجهاز</li>
          <li>أتعهد بإعادة الجهاز بحالة جيدة عند انتهاء خدمتي أو عند طلب الإدارة</li>
          <li>أتحمل المسؤولية الكاملة عن أي ضرر ينتج عن سوء الاستخدام أو الإهمال</li>
        </ul>
      </div>
    </div>
    
    <div class="signatures">
      <div class="signature-box">
        <div class="signature-title">توقيع الموظف المستلم</div>
        <div class="signature-line">
          <div class="signature-name">${assignment.employee_name || '................................'}</div>
          <div class="signature-date">التاريخ: ${assignment.assigned_date || today}</div>
        </div>
      </div>
      <div class="signature-box">
        <div class="signature-title">توقيع مسؤول تقنية المعلومات</div>
        <div class="signature-line">
          <div class="signature-name">${assignment.assigned_by || '................................'}</div>
          <div class="signature-date">التاريخ: ${assignment.assigned_date || today}</div>
        </div>
      </div>
    </div>
    
    <div class="footer">
      يُحفظ هذا النموذج في: ملف الموظف • إدارة تقنية المعلومات • الموارد البشرية
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
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      },
      preferCSSPageSize: true
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=assignment_${assignment.id || 'document'}.pdf`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF Generation Error:', error);
    if (browser) await browser.close();
    res.status(500).json({ error: 'فشل في إنشاء ملف PDF', details: error.message });
  }
};

module.exports = {
  generateAssignmentPDF
};
