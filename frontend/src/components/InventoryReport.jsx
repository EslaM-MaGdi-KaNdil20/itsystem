import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';

function InventoryReport() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('header'); // header, footer, options
  
  // Report settings
  const [settings, setSettings] = useState({
    // Header
    companyLogo: '',
    companyName: 'شركة تكنولوجيا المعلومات',
    companySlogan: 'حلول تقنية متكاملة',
    companyAddress: 'القاهرة - مصر',
    companyPhone: '01234567890',
    companyEmail: 'info@company.com',
    companyWebsite: 'www.company.com',
    reportTitle: 'تقرير جرد المخزون',
    showHeader: true,
    
    // Footer
    footerLine1: 'هذا التقرير سري وللاستخدام الداخلي فقط',
    footerLine2: 'تم إنشاء التقرير آلياً من نظام إدارة المخزون',
    footerPhone: '01234567890',
    footerEmail: 'inventory@company.com',
    showFooter: true,
    
    // Options
    showSummary: true,
    showPrices: true,
    preparedBy: '',
    approvedBy: ''
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    // Load saved settings from localStorage
    const saved = localStorage.getItem('inventoryReportSettings');
    if (saved) {
      setSettings(prev => ({ ...prev, ...JSON.parse(saved) }));
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  // Save settings to localStorage
  const saveSettings = () => {
    localStorage.setItem('inventoryReportSettings', JSON.stringify(settings));
    toast.success('تم حفظ الإعدادات');
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      
      const response = await fetch(`${window.location.protocol}//${window.location.hostname}:3000/api/products?${params}`);
      const data = await response.json();
      if (data.success) setProducts(data.data);
    } catch (error) {
      toast.error('حدث خطأ في جلب المنتجات');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${window.location.protocol}//${window.location.hostname}:3000/api/categories`);
      const data = await response.json();
      if (data.success) setCategories(data.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, companyLogo: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePrint = () => window.print();

  const formatDate = () => new Date().toLocaleDateString('ar-EG', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  // Stats
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + (parseInt(p.current_stock) || 0), 0);
  const lowStockCount = products.filter(p => parseInt(p.current_stock) <= parseInt(p.min_stock_alert)).length;
  const totalValue = products.reduce((sum, p) => sum + ((parseInt(p.current_stock) || 0) * (parseFloat(p.unit_price) || 0)), 0);

  // Group by category
  const groupedProducts = products.reduce((acc, product) => {
    const cat = product.category_name || 'بدون فئة';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 10mm; }
        }
      `}</style>

      {/* Fixed Control Bar */}
      <div className="no-print fixed top-0 left-0 right-0 bg-white border-b shadow-sm z-50" style={{ direction: 'rtl' }}>
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/products')} className="p-2 rounded-lg hover:bg-slate-100">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-lg font-bold text-slate-800">تقرير الجرد</h1>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
              >
                <option value="">جميع الفئات</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${showSettings ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100 text-slate-600'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                إعدادات
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                طباعة PDF
              </button>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              {/* Tabs */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setActiveTab('header')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'header' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  🏢 الهيدر
                </button>
                <button
                  onClick={() => setActiveTab('footer')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'footer' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  📄 الفوتر
                </button>
                <button
                  onClick={() => setActiveTab('options')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'options' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  ⚙️ خيارات
                </button>
                <button
                  onClick={saveSettings}
                  className="mr-auto px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                >
                  💾 حفظ الإعدادات
                </button>
              </div>

              {/* Header Settings */}
              {activeTab === 'header' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-medium text-slate-600 mb-1">لوجو الشركة</label>
                    <div className="flex items-center gap-2">
                      {settings.companyLogo && (
                        <img src={settings.companyLogo} alt="Logo" className="w-10 h-10 object-contain border rounded" />
                      )}
                      <label className="flex-1 cursor-pointer">
                        <span className="block px-3 py-2 text-sm border border-dashed border-slate-300 rounded-lg text-center hover:bg-slate-50">
                          {settings.companyLogo ? 'تغيير اللوجو' : 'رفع لوجو'}
                        </span>
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      </label>
                      {settings.companyLogo && (
                        <button onClick={() => setSettings({...settings, companyLogo: ''})} className="p-2 text-red-500 hover:bg-red-50 rounded">✕</button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">اسم الشركة</label>
                    <input type="text" value={settings.companyName} onChange={(e) => setSettings({...settings, companyName: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">شعار/وصف الشركة</label>
                    <input type="text" value={settings.companySlogan} onChange={(e) => setSettings({...settings, companySlogan: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">عنوان التقرير</label>
                    <input type="text" value={settings.reportTitle} onChange={(e) => setSettings({...settings, reportTitle: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">العنوان</label>
                    <input type="text" value={settings.companyAddress} onChange={(e) => setSettings({...settings, companyAddress: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">الهاتف</label>
                    <input type="text" value={settings.companyPhone} onChange={(e) => setSettings({...settings, companyPhone: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">البريد الإلكتروني</label>
                    <input type="text" value={settings.companyEmail} onChange={(e) => setSettings({...settings, companyEmail: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">الموقع الإلكتروني</label>
                    <input type="text" value={settings.companyWebsite} onChange={(e) => setSettings({...settings, companyWebsite: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                  </div>
                </div>
              )}

              {/* Footer Settings */}
              {activeTab === 'footer' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">السطر الأول</label>
                    <input type="text" value={settings.footerLine1} onChange={(e) => setSettings({...settings, footerLine1: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">السطر الثاني</label>
                    <input type="text" value={settings.footerLine2} onChange={(e) => setSettings({...settings, footerLine2: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">هاتف الفوتر</label>
                    <input type="text" value={settings.footerPhone} onChange={(e) => setSettings({...settings, footerPhone: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">بريد الفوتر</label>
                    <input type="text" value={settings.footerEmail} onChange={(e) => setSettings({...settings, footerEmail: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                  </div>
                </div>
              )}

              {/* Options Settings */}
              {activeTab === 'options' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">أعده</label>
                    <input type="text" value={settings.preparedBy} onChange={(e) => setSettings({...settings, preparedBy: e.target.value})} placeholder="اسم المُعد" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">اعتمده</label>
                    <input type="text" value={settings.approvedBy} onChange={(e) => setSettings({...settings, approvedBy: e.target.value})} placeholder="اسم المُعتمد" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                  </div>
                  <div className="col-span-2 flex items-center gap-4 pt-5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={settings.showHeader} onChange={(e) => setSettings({...settings, showHeader: e.target.checked})} className="w-4 h-4 rounded" />
                      <span className="text-sm">إظهار الهيدر</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={settings.showFooter} onChange={(e) => setSettings({...settings, showFooter: e.target.checked})} className="w-4 h-4 rounded" />
                      <span className="text-sm">إظهار الفوتر</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={settings.showSummary} onChange={(e) => setSettings({...settings, showSummary: e.target.checked})} className="w-4 h-4 rounded" />
                      <span className="text-sm">إظهار الملخص</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={settings.showPrices} onChange={(e) => setSettings({...settings, showPrices: e.target.checked})} className="w-4 h-4 rounded" />
                      <span className="text-sm">إظهار الأسعار</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Print Area */}
      <div id="print-area" className={`bg-slate-100 min-h-screen ${showSettings ? 'pt-44' : 'pt-16'}`} style={{ direction: 'rtl' }}>
        <div className="max-w-4xl mx-auto p-4">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="p-6">
              
              {/* Header */}
              {settings.showHeader && (
                <div className="border-b-4 border-blue-600 pb-4 mb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      {settings.companyLogo && (
                        <img src={settings.companyLogo} alt="Company Logo" className="w-20 h-20 object-contain" />
                      )}
                      <div>
                        <h1 className="text-2xl font-bold text-blue-600">{settings.companyName}</h1>
                        {settings.companySlogan && <p className="text-sm text-slate-500 italic">{settings.companySlogan}</p>}
                      </div>
                    </div>
                    <div className="text-left text-sm text-slate-600 space-y-1">
                      {settings.companyAddress && <div>📍 {settings.companyAddress}</div>}
                      {settings.companyPhone && <div>📞 {settings.companyPhone}</div>}
                      {settings.companyEmail && <div>✉️ {settings.companyEmail}</div>}
                      {settings.companyWebsite && <div>🌐 {settings.companyWebsite}</div>}
                    </div>
                  </div>
                  <div className="mt-4 bg-gradient-to-l from-blue-600 to-blue-700 text-white px-4 py-3 rounded-lg flex justify-between items-center">
                    <h2 className="text-xl font-bold">{settings.reportTitle}</h2>
                    <div className="text-sm">
                      <div>{formatDate()}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary */}
              {settings.showSummary && (
                <div className={`grid ${settings.showPrices ? 'grid-cols-4' : 'grid-cols-3'} gap-3 mb-4 text-center`}>
                  <div className="bg-slate-100 rounded-lg p-3">
                    <div className="text-2xl font-bold text-slate-800">{totalProducts}</div>
                    <div className="text-xs text-slate-600">إجمالي المنتجات</div>
                  </div>
                  <div className="bg-blue-100 rounded-lg p-3">
                    <div className="text-2xl font-bold text-blue-600">{totalStock.toLocaleString('ar-EG')}</div>
                    <div className="text-xs text-blue-600">إجمالي المخزون</div>
                  </div>
                  <div className="bg-red-100 rounded-lg p-3">
                    <div className="text-2xl font-bold text-red-600">{lowStockCount}</div>
                    <div className="text-xs text-red-600">مخزون منخفض</div>
                  </div>
                  {settings.showPrices && (
                    <div className="bg-green-100 rounded-lg p-3">
                      <div className="text-xl font-bold text-green-600">{totalValue.toLocaleString('ar-EG')}</div>
                      <div className="text-xs text-green-600">القيمة الإجمالية</div>
                    </div>
                  )}
                </div>
              )}

              {/* Products Tables */}
              {Object.entries(groupedProducts).map(([categoryName, categoryProducts]) => (
                <div key={categoryName} className="mb-4">
                  <div className="bg-slate-800 text-white px-3 py-2 rounded-t-lg font-bold text-sm flex justify-between">
                    <span>{categoryName}</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{categoryProducts.length} منتج</span>
                  </div>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-300 px-2 py-1.5 text-right w-8">#</th>
                        <th className="border border-slate-300 px-2 py-1.5 text-right">الكود</th>
                        <th className="border border-slate-300 px-2 py-1.5 text-right">المنتج</th>
                        <th className="border border-slate-300 px-2 py-1.5 text-center">الوحدة</th>
                        {settings.showPrices && <th className="border border-slate-300 px-2 py-1.5 text-center">السعر</th>}
                        <th className="border border-slate-300 px-2 py-1.5 text-center">المخزون</th>
                        <th className="border border-slate-300 px-2 py-1.5 text-center">التنبيه</th>
                        <th className="border border-slate-300 px-2 py-1.5 text-center">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryProducts.map((product, index) => {
                        const stock = parseInt(product.current_stock) || 0;
                        const minStock = parseInt(product.min_stock_alert) || 0;
                        const isLow = stock <= minStock;
                        return (
                          <tr key={product.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className="border border-slate-300 px-2 py-1.5 text-center text-slate-500">{index + 1}</td>
                            <td className="border border-slate-300 px-2 py-1.5 font-mono text-xs">{product.code}</td>
                            <td className="border border-slate-300 px-2 py-1.5 font-medium">{product.name}</td>
                            <td className="border border-slate-300 px-2 py-1.5 text-center text-slate-600">{product.unit}</td>
                            {settings.showPrices && (
                              <td className="border border-slate-300 px-2 py-1.5 text-center">{(parseFloat(product.unit_price) || 0).toLocaleString('ar-EG')}</td>
                            )}
                            <td className={`border border-slate-300 px-2 py-1.5 text-center font-bold ${isLow ? 'text-red-600 bg-red-50' : ''}`}>
                              {stock.toLocaleString('ar-EG')}
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5 text-center text-slate-500">{minStock}</td>
                            <td className={`border border-slate-300 px-2 py-1.5 text-center font-bold ${isLow ? 'text-red-600' : 'text-green-600'}`}>
                              {isLow ? '⚠️' : '✓'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}

              {/* Signatures */}
              {(settings.preparedBy || settings.approvedBy) && (
                <div className="mt-6 pt-4 border-t-2 border-slate-200 grid grid-cols-2 gap-8">
                  {settings.preparedBy && (
                    <div className="text-center">
                      <div className="text-sm text-slate-500 mb-6">أعده</div>
                      <div className="border-t-2 border-slate-400 pt-2 mx-12 font-bold">{settings.preparedBy}</div>
                    </div>
                  )}
                  {settings.approvedBy && (
                    <div className="text-center">
                      <div className="text-sm text-slate-500 mb-6">اعتمده</div>
                      <div className="border-t-2 border-slate-400 pt-2 mx-12 font-bold">{settings.approvedBy}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              {settings.showFooter && (
                <div className="mt-6 pt-4 border-t-2 border-blue-600 bg-slate-50 -mx-6 -mb-6 px-6 py-4">
                  <div className="flex justify-between items-start">
                    <div className="text-xs text-slate-600 space-y-1">
                      {settings.footerLine1 && <div>{settings.footerLine1}</div>}
                      {settings.footerLine2 && <div>{settings.footerLine2}</div>}
                    </div>
                    <div className="text-xs text-slate-600 text-left space-y-1">
                      {settings.footerPhone && <div>📞 {settings.footerPhone}</div>}
                      {settings.footerEmail && <div>✉️ {settings.footerEmail}</div>}
                      <div className="text-slate-400 mt-2">تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="h-8"></div>
      </div>
    </>
  );
}

export default InventoryReport;
