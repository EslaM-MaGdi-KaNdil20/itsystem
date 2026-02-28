const nodemailer = require('nodemailer');

// Create email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: parseInt(process.env.EMAIL_PORT) === 465, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000, // 10 seconds
  socketTimeout: 10000, // 10 seconds
});

// Send subscription expiration alert
const sendSubscriptionAlert = async (subscription) => {
  try {
    const daysRemaining = Math.ceil(
      (new Date(subscription.end_date) - new Date()) / (1000 * 60 * 60 * 24)
    );

    const mailOptions = {
      from: `"IT System" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_RECIPIENT || process.env.EMAIL_USER,
      subject: `⚠️ تنبيه: اشتراك ${subscription.name} ينتهي قريباً`,
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #f4f4f4;
              padding: 20px;
              direction: rtl;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: white;
              border-radius: 10px;
              overflow: hidden;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .content {
              padding: 30px;
            }
            .alert-box {
              background-color: #fff3cd;
              border-right: 4px solid #ffc107;
              padding: 20px;
              margin: 20px 0;
              border-radius: 5px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 12px 0;
              border-bottom: 1px solid #eee;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .label {
              font-weight: bold;
              color: #666;
            }
            .value {
              color: #333;
            }
            .footer {
              background-color: #f8f9fa;
              padding: 20px;
              text-align: center;
              color: #666;
              font-size: 14px;
            }
            .days-remaining {
              font-size: 36px;
              font-weight: bold;
              color: #dc3545;
              text-align: center;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 تنبيه انتهاء اشتراك</h1>
            </div>
            <div class="content">
              <div class="alert-box">
                <p style="margin: 0; font-size: 16px; color: #856404;">
                  ⚠️ يوجد اشتراك يقترب من تاريخ الانتهاء ويحتاج إلى تجديد
                </p>
              </div>
              
              <div class="days-remaining">
                ${daysRemaining} يوم متبقي
              </div>

              <div style="margin-top: 30px;">
                <div class="info-row">
                  <span class="label">اسم الاشتراك:</span>
                  <span class="value">${subscription.name}</span>
                </div>
                <div class="info-row">
                  <span class="label">نوع الاشتراك:</span>
                  <span class="value">${subscription.subscription_type || 'غير محدد'}</span>
                </div>
                <div class="info-row">
                  <span class="label">المزود:</span>
                  <span class="value">${subscription.provider || 'غير محدد'}</span>
                </div>
                <div class="info-row">
                  <span class="label">تاريخ الانتهاء:</span>
                  <span class="value">${new Date(subscription.end_date).toLocaleDateString('ar-EG')}</span>
                </div>
                <div class="info-row">
                  <span class="label">التكلفة:</span>
                  <span class="value">${subscription.cost ? subscription.cost + ' جنيه' : 'غير محدد'}</span>
                </div>
                <div class="info-row">
                  <span class="label">الحالة:</span>
                  <span class="value" style="color: ${subscription.status === 'active' ? '#28a745' : '#dc3545'};">
                    ${subscription.status === 'active' ? '✓ نشط' : '✗ غير نشط'}
                  </span>
                </div>
              </div>

              <div style="margin-top: 30px; padding: 20px; background-color: #e7f3ff; border-radius: 5px; text-align: center;">
                <p style="margin: 0; color: #004085;">
                  💡 يرجى اتخاذ الإجراء المناسب لتجديد هذا الاشتراك قبل انتهاء صلاحيته
                </p>
              </div>
            </div>
            <div class="footer">
              <p>هذه رسالة تلقائية من نظام إدارة تكنولوجيا المعلومات</p>
              <p style="margin: 5px 0;">تم الإرسال في: ${new Date().toLocaleString('ar-EG')}</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent for subscription: ${subscription.name} - Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    throw error;
  }
};

// Test email connection
const testConnection = async () => {
  try {
    await transporter.verify();
    console.log('✅ Email server is ready to send messages');
    return true;
  } catch (error) {
    console.error('❌ Email server connection failed:', error.message);
    return false;
  }
};

module.exports = {
  sendSubscriptionAlert,
  testConnection,
};
