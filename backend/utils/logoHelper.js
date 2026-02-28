const fs = require('fs');
const path = require('path');

// Get logo as base64 for PDF embedding
const getLogoBase64 = () => {
  try {
    const logoPath = path.join(__dirname, '../public/assets/logo.png');
    
    // Check if custom logo exists
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      return `data:image/png;base64,${logoBuffer.toString('base64')}`;
    }
    
    // Return default placeholder logo (1x1 transparent pixel)
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  } catch (error) {
    console.error('Error reading logo:', error);
    return null;
  }
};

// Check if logo exists
const hasLogo = () => {
  const logoPath = path.join(__dirname, '../public/assets/logo.png');
  return fs.existsSync(logoPath);
};

// Get logo HTML for PDF header
const getLogoHTML = (companyName = 'Sobek') => {
  const logoBase64 = getLogoBase64();
  const hasCustomLogo = hasLogo();
  
  if (hasCustomLogo && logoBase64) {
    return `
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${logoBase64}" alt="Company Logo" style="max-width: 200px; max-height: 80px; object-fit: contain;" />
      </div>
    `;
  }
  
  // Fallback to text logo if no image
  return `
    <div style="text-align: center; margin-bottom: 20px;">
      <h1 style="color: #667eea; font-size: 36px; margin: 0; font-weight: bold;">${companyName}</h1>
      <p style="color: #999; font-size: 12px; margin-top: 5px;">IT Management System</p>
    </div>
  `;
};

module.exports = {
  getLogoBase64,
  hasLogo,
  getLogoHTML
};
