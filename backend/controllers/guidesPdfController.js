const puppeteer = require('puppeteer');
const pool = require('../config/database');
const path = require('path');
const fs = require('fs');
const { getLogoHTML } = require('../utils/logoHelper');

// Generate Guide PDF
const generateGuidePDF = async (req, res) => {
  let browser;
  try {
    const { id } = req.params;
    
    // Get guide data
    const guideResult = await pool.query('SELECT * FROM user_guides WHERE id = $1', [id]);
    if (guideResult.rows.length === 0) {
      return res.status(404).json({ error: 'الدليل غير موجود' });
    }
    const guide = guideResult.rows[0];
    
    // Get steps
    const stepsResult = await pool.query(
      'SELECT * FROM guide_steps WHERE guide_id = $1 ORDER BY step_number',
      [id]
    );
    const steps = stepsResult.rows;
    
    const today = new Date().toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Category colors
    const categoryColors = {
      'Windows': { primary: '#0078d4', secondary: '#50a0e6' },
      'Office': { primary: '#d83b01', secondary: '#ea5d2d' },
      'Network': { primary: '#008272', secondary: '#00a896' },
      'Printers': { primary: '#744da9', secondary: '#9266cc' },
      'Hardware': { primary: '#107c10', secondary: '#3fa43f' },
      'Software': { primary: '#0086c7', secondary: '#33a2d6' },
      'Security': { primary: '#c50f1f', secondary: '#d93642' },
      'Email': { primary: '#0078d4', secondary: '#50a0e6' },
      'Remote Access': { primary: '#5c2d91', secondary: '#8153b5' },
      'Other': { primary: '#69797e', secondary: '#8a9a9f' }
    };
    
    const colors = categoryColors[guide.category] || categoryColors['Other'];
    
    // Convert images to base64
    const stepsWithImages = await Promise.all(steps.map(async (step) => {
      if (step.image_path) {
        try {
          const imagePath = path.join(__dirname, '..', step.image_path);
          if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            const base64Image = imageBuffer.toString('base64');
            const ext = path.extname(imagePath).substring(1);
            step.image_base64 = `data:image/${ext};base64,${base64Image}`;
          }
        } catch (error) {
          console.error('Error reading image:', error);
        }
      }
      return step;
    }));

    const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>${guide.title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;600;700;800&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: A4;
      margin: 0;
    }
    
    body {
      font-family: 'Tajawal', sans-serif;
      background: #fff;
      color: #1f2937;
      font-size: 12px;
      line-height: 1.6;
      direction: rtl;
    }
    
    /* Cover Page */
    .cover-page {
      height: 100vh;
      background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      color: white;
      text-align: center;
      padding: 40px;
      page-break-after: always;
    }
    
    .cover-icon {
      font-size: 80px;
      margin-bottom: 30px;
    }
    
    .cover-title {
      font-size: 42px;
      font-weight: 800;
      margin-bottom: 20px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    
    .cover-category {
      font-size: 24px;
      opacity: 0.9;
      margin-bottom: 40px;
      background: rgba(255,255,255,0.2);
      padding: 10px 30px;
      border-radius: 30px;
    }
    
    .cover-description {
      font-size: 16px;
      max-width: 600px;
      opacity: 0.95;
      line-height: 1.8;
      margin-bottom: 60px;
    }
    
    .cover-footer {
      margin-top: auto;
      font-size: 14px;
      opacity: 0.8;
    }
    
    /* Content Pages */
    .content-page {
      padding: 40px 50px;
      min-height: 100vh;
    }
    
    .header {
      border-bottom: 3px solid ${colors.primary};
      padding-bottom: 15px;
      margin-bottom: 30px;
    }
    
    .header-title {
      font-size: 28px;
      font-weight: 800;
      color: ${colors.primary};
      margin-bottom: 5px;
    }
    
    .header-info {
      font-size: 11px;
      color: #6b7280;
    }
    
    /* Table of Contents */
    .toc-page {
      page-break-after: always;
    }
    
    .toc-title {
      font-size: 32px;
      font-weight: 800;
      color: ${colors.primary};
      margin-bottom: 30px;
      text-align: center;
    }
    
    .toc-item {
      padding: 12px 20px;
      margin-bottom: 10px;
      background: #f9fafb;
      border-right: 4px solid ${colors.primary};
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .toc-item-number {
      font-weight: 700;
      color: ${colors.primary};
      font-size: 18px;
      margin-left: 15px;
    }
    
    .toc-item-title {
      flex: 1;
      font-weight: 600;
      font-size: 14px;
    }
    
    /* Steps */
    .step {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    
    .step-header {
      background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%);
      color: white;
      padding: 15px 25px;
      border-radius: 12px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .step-number {
      background: white;
      color: ${colors.primary};
      width: 50px;
      height: 50px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 800;
      flex-shrink: 0;
    }
    
    .step-title {
      font-size: 18px;
      font-weight: 700;
    }
    
    .step-content {
      padding: 0 25px;
    }
    
    .step-description {
      font-size: 13px;
      line-height: 1.8;
      color: #374151;
      margin-bottom: 20px;
      white-space: pre-wrap;
    }
    
    .step-image {
      width: 100%;
      max-width: 700px;
      margin: 20px auto;
      display: block;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      border: 3px solid #f3f4f6;
    }
    
    .step-notes {
      background: #fef3c7;
      border-right: 4px solid #f59e0b;
      padding: 15px 20px;
      border-radius: 8px;
      margin-top: 20px;
    }
    
    .step-notes-title {
      font-weight: 700;
      color: #92400e;
      margin-bottom: 8px;
      font-size: 13px;
    }
    
    .step-notes-content {
      color: #78350f;
      font-size: 12px;
      line-height: 1.6;
    }
    
    /* Footer */
    .page-footer {
      position: fixed;
      bottom: 20px;
      left: 50px;
      right: 50px;
      text-align: center;
      font-size: 10px;
      color: #9ca3af;
      border-top: 1px solid #e5e7eb;
      padding-top: 10px;
    }
    
    /* Contact Box */
    .contact-box {
      background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%);
      color: white;
      padding: 25px;
      border-radius: 12px;
      margin-top: 40px;
      text-align: center;
      page-break-inside: avoid;
    }
    
    .contact-title {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 15px;
    }
    
    .contact-info {
      font-size: 14px;
      opacity: 0.95;
    }
    
    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="cover-page">
    ${getLogoHTML('Sobek')}
    <div class="cover-icon">📚</div>
    <h1 class="cover-title">${guide.title}</h1>
    <div class="cover-category">${guide.category}</div>
    ${guide.description ? `<p class="cover-description">${guide.description}</p>` : ''}
    <div class="cover-footer">
      <div>إدارة تقنية المعلومات</div>
      <div style="margin-top: 10px;">${today}</div>
      ${guide.created_by ? `<div style="margin-top: 5px;">إعداد: ${guide.created_by}</div>` : ''}
    </div>
  </div>
  
  <!-- Table of Contents -->
  <div class="content-page toc-page">
    <h2 class="toc-title">📋 جدول المحتويات</h2>
    ${stepsWithImages.map(step => `
      <div class="toc-item">
        <span class="toc-item-number">${step.step_number}</span>
        <span class="toc-item-title">${step.title}</span>
      </div>
    `).join('')}
  </div>
  
  <!-- Steps -->
  ${stepsWithImages.map(step => `
    <div class="content-page">
      <div class="step">
        <div class="step-header">
          <div class="step-number">${step.step_number}</div>
          <div class="step-title">${step.title}</div>
        </div>
        
        <div class="step-content">
          ${step.description ? `<div class="step-description">${step.description}</div>` : ''}
          
          ${step.image_base64 ? `<img src="${step.image_base64}" class="step-image" alt="خطوة ${step.step_number}">` : ''}
          
          ${step.notes ? `
            <div class="step-notes">
              <div class="step-notes-title">💡 ملاحظة هامة:</div>
              <div class="step-notes-content">${step.notes}</div>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `).join('')}
  
  <!-- Contact Page -->
  <div class="content-page">
    <div class="contact-box">
      <div class="contact-title">📞 هل تحتاج للمساعدة؟</div>
      <div class="contact-info">
        <div>تواصل مع فريق الدعم الفني</div>
        <div style="margin-top: 10px; font-size: 16px; font-weight: 600;">IT Support</div>
        <div style="margin-top: 5px;">📧 البريد الإلكتروني: islam.magdy@sobek.com.eg</div>
        <div style="margin-top: 5px;">📱 الهاتف: 01098963602</div>
         <div style="margin-top: 5px;">📱 التلفون الارضي: 98</div>
      </div>
    </div>
  </div>
  
  <div class="page-footer">
    تم إنشاء هذا الدليل بواسطة نظام إدارة تقنية المعلومات • ${today}
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
      printBackground: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm'
      },
      preferCSSPageSize: true
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=guide_${id}_${Date.now()}.pdf`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF Generation Error:', error);
    if (browser) await browser.close();
    res.status(500).json({ error: 'فشل في إنشاء ملف PDF', details: error.message });
  }
};

module.exports = {
  generateGuidePDF
};
