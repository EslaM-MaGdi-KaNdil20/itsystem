const pool = require('../config/database');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { logActivity, ACTIONS, ENTITIES } = require('./activityLogController');

// Get all products with category info and calculated stock from movements
const getAllProducts = async (req, res) => {
  try {
    const { search, category } = req.query;
    
    let query = `
      SELECT p.*, c.name as category_name,
        COALESCE((
          SELECT SUM(CASE WHEN movement_type = 'in' THEN quantity ELSE -quantity END)
          FROM stock_movements 
          WHERE product_id = p.id
        ), 0) as calculated_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
    `;
    
    const params = [];
    
    if (search) {
      query += ` AND (p.name ILIKE $${params.length + 1} OR p.code ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }
    
    if (category) {
      query += ` AND p.category_id = $${params.length + 1}`;
      params.push(category);
    }
    
    query += ' ORDER BY p.created_at DESC';
    
    const result = await pool.query(query, params);
    
    // Replace current_stock with calculated_stock
    const products = result.rows.map(p => ({
      ...p,
      current_stock: parseInt(p.calculated_stock) || 0
    }));
    
    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب المنتجات' });
  }
};

// Get single product with calculated stock
const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT p.*, c.name as category_name,
        COALESCE((
          SELECT SUM(CASE WHEN movement_type = 'in' THEN quantity ELSE -quantity END)
          FROM stock_movements 
          WHERE product_id = p.id
        ), 0) as calculated_stock
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
    }
    
    const product = {
      ...result.rows[0],
      current_stock: parseInt(result.rows[0].calculated_stock) || 0
    };
    
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب المنتج' });
  }
};

// Create new product
const createProduct = async (req, res) => {
  try {
    const { code, name, description, category_id, unit, unit_price, min_stock_alert, image_url } = req.body;
    
    // Check if code already exists
    const existingProduct = await pool.query('SELECT id FROM products WHERE code = $1', [code]);
    if (existingProduct.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'كود المنتج موجود بالفعل' });
    }
    
    const result = await pool.query(
      `INSERT INTO products (code, name, description, category_id, unit, unit_price, min_stock_alert, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [code, name, description, category_id, unit || 'قطعة', unit_price || 0, min_stock_alert || 10, image_url]
    );
    
    // Log activity
    logActivity(req, ACTIONS.CREATE, ENTITIES.PRODUCT, result.rows[0].id, 
      name, `تم إضافة منتج جديد: ${name} (${code})`);
    
    res.json({
      success: true,
      message: 'تم إضافة المنتج بنجاح',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في إضافة المنتج' });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category_id, unit, unit_price, min_stock_alert, image_url } = req.body;
    
    const result = await pool.query(
      `UPDATE products 
       SET name = $1, description = $2, category_id = $3, unit = $4, 
           unit_price = $5, min_stock_alert = $6, image_url = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [name, description, category_id, unit, unit_price, min_stock_alert, image_url, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
    }
    
    // Log activity
    logActivity(req, ACTIONS.UPDATE, ENTITIES.PRODUCT, id, 
      name, `تم تحديث المنتج: ${name}`);
    
    res.json({
      success: true,
      message: 'تم تحديث المنتج بنجاح',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في تحديث المنتج' });
  }
};

// Delete product (soft delete)
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get product name
    const prod = await pool.query('SELECT name, code FROM products WHERE id = $1', [id]);
    
    const result = await pool.query(
      'UPDATE products SET is_active = false WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
    }
    
    // Log activity
    const prodName = prod.rows[0]?.name || `منتج #${id}`;
    logActivity(req, ACTIONS.DELETE, ENTITIES.PRODUCT, id, 
      prodName, `تم حذف المنتج: ${prodName}`);
    
    res.json({
      success: true,
      message: 'تم حذف المنتج بنجاح'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في حذف المنتج' });
  }
};

// Get low stock products with calculated stock
const getLowStockProducts = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.name as category_name,
        COALESCE((
          SELECT SUM(CASE WHEN movement_type = 'in' THEN quantity ELSE -quantity END)
          FROM stock_movements 
          WHERE product_id = p.id
        ), 0) as calculated_stock
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.is_active = true
       ORDER BY calculated_stock ASC`
    );
    
    // Filter low stock and replace current_stock
    const lowStockProducts = result.rows
      .map(p => ({
        ...p,
        current_stock: parseInt(p.calculated_stock) || 0
      }))
      .filter(p => p.current_stock <= p.min_stock_alert);
    
    res.json({
      success: true,
      data: lowStockProducts
    });
  } catch (error) {
    console.error('Error fetching low stock products:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب المنتجات' });
  }
};

// Export products to Excel
const exportToExcel = async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = `
      SELECT p.code, p.name, c.name as category_name, p.unit, 
             p.unit_price, p.min_stock_alert, p.description,
        COALESCE((
          SELECT SUM(CASE WHEN movement_type = 'in' THEN quantity ELSE -quantity END)
          FROM stock_movements 
          WHERE product_id = p.id
        ), 0) as current_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
    `;
    
    const params = [];
    
    if (category) {
      query += ` AND p.category_id = $${params.length + 1}`;
      params.push(category);
    }
    
    query += ' ORDER BY p.name ASC';
    
    const result = await pool.query(query, params);
    const products = result.rows;

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'IT Inventory System';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('المنتجات', {
      properties: { tabColor: { argb: '3B82F6' } },
      views: [{ rightToLeft: true }]
    });

    // Define columns
    worksheet.columns = [
      { header: 'كود المنتج', key: 'code', width: 15 },
      { header: 'اسم المنتج', key: 'name', width: 30 },
      { header: 'الفئة', key: 'category_name', width: 20 },
      { header: 'الوحدة', key: 'unit', width: 12 },
      { header: 'السعر', key: 'unit_price', width: 12 },
      { header: 'المخزون الحالي', key: 'current_stock', width: 15 },
      { header: 'حد التنبيه', key: 'min_stock_alert', width: 12 },
      { header: 'الحالة', key: 'status', width: 12 },
      { header: 'الوصف', key: 'description', width: 35 }
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 12 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '3B82F6' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    // Add data rows
    products.forEach((product, index) => {
      const stock = parseInt(product.current_stock) || 0;
      const minStock = parseInt(product.min_stock_alert) || 0;
      const status = stock <= minStock ? 'منخفض ⚠️' : 'متوفر ✓';
      
      const row = worksheet.addRow({
        code: product.code,
        name: product.name,
        category_name: product.category_name || 'بدون فئة',
        unit: product.unit,
        unit_price: parseFloat(product.unit_price) || 0,
        current_stock: stock,
        min_stock_alert: minStock,
        status: status,
        description: product.description || ''
      });

      // Alternate row colors
      if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F3F4F6' }
        };
      }

      // Highlight low stock in red
      if (stock <= minStock) {
        row.getCell('current_stock').font = { color: { argb: 'DC2626' }, bold: true };
        row.getCell('status').font = { color: { argb: 'DC2626' }, bold: true };
      } else {
        row.getCell('status').font = { color: { argb: '16A34A' } };
      }

      row.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Add borders to all cells
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'D1D5DB' } },
          left: { style: 'thin', color: { argb: 'D1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
          right: { style: 'thin', color: { argb: 'D1D5DB' } }
        };
      });
    });

    // Add summary row
    const summaryRow = worksheet.addRow([]);
    worksheet.addRow([]);
    
    const totalRow = worksheet.addRow({
      code: 'الإجمالي',
      name: `${products.length} منتج`,
      current_stock: products.reduce((sum, p) => sum + (parseInt(p.current_stock) || 0), 0)
    });
    totalRow.font = { bold: true, size: 12 };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'E5E7EB' }
    };

    // Set response headers
    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=products_${date}.xlsx`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exporting to Excel:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في تصدير الملف' });
  }
};

// Export inventory report to PDF
const exportToPDF = async (req, res) => {
  try {
    const { category, title } = req.query;
    const reportTitle = title || 'تقرير جرد المخزون';
    
    let query = `
      SELECT p.code, p.name, c.name as category_name, p.unit, 
             p.unit_price, p.min_stock_alert, p.description,
        COALESCE((
          SELECT SUM(CASE WHEN movement_type = 'in' THEN quantity ELSE -quantity END)
          FROM stock_movements 
          WHERE product_id = p.id
        ), 0) as current_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
    `;
    
    const params = [];
    
    if (category) {
      query += ` AND p.category_id = $${params.length + 1}`;
      params.push(category);
    }
    
    query += ' ORDER BY c.name ASC, p.name ASC';
    
    const result = await pool.query(query, params);
    const products = result.rows;

    // Create PDF document
    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 50,
      bufferPages: true,
      info: {
        Title: reportTitle,
        Author: 'IT Inventory System',
        Creator: 'IT Inventory System'
      }
    });

    // Set response headers
    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=inventory_report_${date}.pdf`);
    
    doc.pipe(res);

    // Helper function to format date in Arabic
    const formatDate = () => {
      const now = new Date();
      const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      return now.toLocaleDateString('ar-EG', options);
    };

    // Helper function to reverse Arabic text for PDF
    const reverseArabic = (text) => {
      if (!text) return '';
      return text.toString().split('').reverse().join('');
    };

    // Colors
    const primaryColor = '#3B82F6';
    const darkColor = '#1E293B';
    const grayColor = '#64748B';
    const lightGray = '#F1F5F9';
    const dangerColor = '#DC2626';
    const successColor = '#16A34A';

    // Page dimensions
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 50;
    const contentWidth = pageWidth - (margin * 2);

    // Track page number
    let pageNum = 1;

    // Function to add header
    const addHeader = () => {
      // Header background
      doc.rect(0, 0, pageWidth, 80).fill(primaryColor);
      
      // Company name (right side - reversed for Arabic)
      doc.fillColor('#FFFFFF')
         .fontSize(22)
         .font('Helvetica-Bold')
         .text(reverseArabic('نظام إدارة المخزون'), margin, 25, { align: 'right', width: contentWidth });
      
      // Report title
      doc.fontSize(14)
         .font('Helvetica')
         .text(reverseArabic(reportTitle), margin, 50, { align: 'right', width: contentWidth });
      
      // Date on left
      doc.fontSize(10)
         .text(formatDate(), margin, 30, { align: 'left', width: 150 });
      
      // Reset position after header
      doc.y = 100;
    };

    // Function to add footer
    const addFooter = (currentPage, totalPages) => {
      const footerY = pageHeight - 40;
      
      // Footer line
      doc.strokeColor(primaryColor)
         .lineWidth(1)
         .moveTo(margin, footerY - 10)
         .lineTo(pageWidth - margin, footerY - 10)
         .stroke();
      
      // Page number
      doc.fillColor(grayColor)
         .fontSize(10)
         .font('Helvetica')
         .text(`${currentPage} / ${totalPages}`, margin, footerY, { align: 'center', width: contentWidth });
      
      // System name on right
      doc.text(reverseArabic('IT Inventory System'), pageWidth - margin - 150, footerY, { width: 150, align: 'right' });
    };

    // Add first page header
    addHeader();

    // Summary section
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + (parseInt(p.current_stock) || 0), 0);
    const lowStockCount = products.filter(p => parseInt(p.current_stock) <= parseInt(p.min_stock_alert)).length;
    const totalValue = products.reduce((sum, p) => sum + ((parseInt(p.current_stock) || 0) * (parseFloat(p.unit_price) || 0)), 0);

    // Summary boxes
    const boxWidth = (contentWidth - 30) / 4;
    const boxHeight = 50;
    const boxY = doc.y + 10;

    // Box 1 - Total Products
    doc.rect(margin, boxY, boxWidth, boxHeight).fill(lightGray);
    doc.fillColor(darkColor).fontSize(18).font('Helvetica-Bold')
       .text(totalProducts.toString(), margin, boxY + 10, { width: boxWidth, align: 'center' });
    doc.fillColor(grayColor).fontSize(9).font('Helvetica')
       .text(reverseArabic('إجمالي المنتجات'), margin, boxY + 32, { width: boxWidth, align: 'center' });

    // Box 2 - Total Stock
    doc.rect(margin + boxWidth + 10, boxY, boxWidth, boxHeight).fill(lightGray);
    doc.fillColor(darkColor).fontSize(18).font('Helvetica-Bold')
       .text(totalStock.toString(), margin + boxWidth + 10, boxY + 10, { width: boxWidth, align: 'center' });
    doc.fillColor(grayColor).fontSize(9).font('Helvetica')
       .text(reverseArabic('إجمالي المخزون'), margin + boxWidth + 10, boxY + 32, { width: boxWidth, align: 'center' });

    // Box 3 - Low Stock
    doc.rect(margin + (boxWidth + 10) * 2, boxY, boxWidth, boxHeight).fill('#FEE2E2');
    doc.fillColor(dangerColor).fontSize(18).font('Helvetica-Bold')
       .text(lowStockCount.toString(), margin + (boxWidth + 10) * 2, boxY + 10, { width: boxWidth, align: 'center' });
    doc.fillColor(dangerColor).fontSize(9).font('Helvetica')
       .text(reverseArabic('مخزون منخفض'), margin + (boxWidth + 10) * 2, boxY + 32, { width: boxWidth, align: 'center' });

    // Box 4 - Total Value
    doc.rect(margin + (boxWidth + 10) * 3, boxY, boxWidth, boxHeight).fill('#DCFCE7');
    doc.fillColor(successColor).fontSize(14).font('Helvetica-Bold')
       .text(totalValue.toLocaleString('ar-EG'), margin + (boxWidth + 10) * 3, boxY + 12, { width: boxWidth, align: 'center' });
    doc.fillColor(successColor).fontSize(9).font('Helvetica')
       .text(reverseArabic('القيمة الإجمالية'), margin + (boxWidth + 10) * 3, boxY + 32, { width: boxWidth, align: 'center' });

    doc.y = boxY + boxHeight + 20;

    // Table header
    const tableTop = doc.y;
    const colWidths = [40, 50, 130, 70, 50, 50, 50, 55];
    
    // Table header background
    doc.rect(margin, tableTop, contentWidth, 25).fill(primaryColor);
    
    // Table headers (reversed Arabic)
    const headers = ['الحالة', 'التنبيه', 'الوصف', 'الفئة', 'السعر', 'المخزون', 'الكود', 'اسم المنتج'];
    let xPos = margin + 5;
    
    doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
    headers.forEach((header, i) => {
      doc.text(reverseArabic(header), xPos, tableTop + 7, { width: colWidths[i], align: 'center' });
      xPos += colWidths[i];
    });

    // Table rows
    let yPos = tableTop + 25;
    const rowHeight = 22;
    const maxY = pageHeight - 80; // Leave space for footer

    products.forEach((product, index) => {
      // Check if we need a new page
      if (yPos + rowHeight > maxY) {
        // Add footer to current page
        doc.addPage();
        pageNum++;
        addHeader();
        
        // Redraw table header on new page
        const newTableTop = doc.y;
        doc.rect(margin, newTableTop, contentWidth, 25).fill(primaryColor);
        
        let newXPos = margin + 5;
        doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
        headers.forEach((header, i) => {
          doc.text(reverseArabic(header), newXPos, newTableTop + 7, { width: colWidths[i], align: 'center' });
          newXPos += colWidths[i];
        });
        
        yPos = newTableTop + 25;
      }

      // Alternate row colors
      if (index % 2 === 0) {
        doc.rect(margin, yPos, contentWidth, rowHeight).fill(lightGray);
      } else {
        doc.rect(margin, yPos, contentWidth, rowHeight).fill('#FFFFFF');
      }

      const stock = parseInt(product.current_stock) || 0;
      const minStock = parseInt(product.min_stock_alert) || 0;
      const isLowStock = stock <= minStock;
      const status = isLowStock ? 'منخفض' : 'متوفر';

      // Row data
      xPos = margin + 5;
      
      // Status with color
      doc.fillColor(isLowStock ? dangerColor : successColor)
         .fontSize(8)
         .font('Helvetica-Bold')
         .text(reverseArabic(status), xPos, yPos + 6, { width: colWidths[0], align: 'center' });
      xPos += colWidths[0];

      // Min stock alert
      doc.fillColor(darkColor).font('Helvetica')
         .text(minStock.toString(), xPos, yPos + 6, { width: colWidths[1], align: 'center' });
      xPos += colWidths[1];

      // Description (truncate if too long)
      const desc = product.description ? (product.description.length > 20 ? product.description.substring(0, 20) + '...' : product.description) : '-';
      doc.text(reverseArabic(desc), xPos, yPos + 6, { width: colWidths[2], align: 'center' });
      xPos += colWidths[2];

      // Category
      doc.text(reverseArabic(product.category_name || 'بدون فئة'), xPos, yPos + 6, { width: colWidths[3], align: 'center' });
      xPos += colWidths[3];

      // Price
      doc.text((parseFloat(product.unit_price) || 0).toFixed(2), xPos, yPos + 6, { width: colWidths[4], align: 'center' });
      xPos += colWidths[4];

      // Stock with color
      doc.fillColor(isLowStock ? dangerColor : darkColor)
         .font(isLowStock ? 'Helvetica-Bold' : 'Helvetica')
         .text(stock.toString(), xPos, yPos + 6, { width: colWidths[5], align: 'center' });
      xPos += colWidths[5];

      // Code
      doc.fillColor(darkColor).font('Helvetica')
         .text(product.code, xPos, yPos + 6, { width: colWidths[6], align: 'center' });
      xPos += colWidths[6];

      // Name
      const name = product.name.length > 18 ? product.name.substring(0, 18) + '...' : product.name;
      doc.text(reverseArabic(name), xPos, yPos + 6, { width: colWidths[7], align: 'center' });

      yPos += rowHeight;
    });

    // Draw table border
    doc.strokeColor('#E2E8F0').lineWidth(0.5);
    doc.rect(margin, tableTop, contentWidth, yPos - tableTop).stroke();

    // Get total pages and add footers
    const totalPages = doc.bufferedPageRange().count;
    
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      addFooter(i + 1, totalPages);
    }

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Error exporting to PDF:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في تصدير الملف' });
  }
};

module.exports = {
  getAllProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  exportToExcel,
  exportToPDF
};
