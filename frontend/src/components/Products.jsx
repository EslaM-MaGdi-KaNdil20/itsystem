import CategorySelect from './CategorySelect';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [productToEdit, setProductToEdit] = useState(null);
  const [showMovementModal, setShowMovementModal] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [searchTerm, selectedCategory]);

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory) params.append('category', selectedCategory);
      
      const response = await fetch(`${window.location.protocol}//${window.location.hostname}:3000/api/products?${params}`);
      const data = await response.json();
      if (data.success) {
        setProducts(data.data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('حدث خطأ في جلب المنتجات');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${window.location.protocol}//${window.location.hostname}:3000/api/categories`);
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const confirmDelete = (product) => {
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  const openEditModal = (product) => {
    setProductToEdit(product);
    setShowEditModal(true);
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    
    try {
      const response = await fetch(`${window.location.protocol}//${window.location.hostname}:3000/api/products/${productToDelete.id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success('تم حذف المنتج بنجاح');
        fetchProducts();
        setShowDeleteModal(false);
        setProductToDelete(null);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('حدث خطأ في حذف المنتج');
    }
  };


  
  const openInventoryReport = () => {
    const params = new URLSearchParams();
    if (selectedCategory) params.append('category', selectedCategory);
    window.open(`/inventory-report?${params}`, '_blank');
  };

  const exportToExcel = async () => {
    try {
      toast.loading('جاري تحميل الملف...', { id: 'export' });
      
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      
      const response = await fetch(`${window.location.protocol}//${window.location.hostname}:3000/api/products/export/excel?${params}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast.success('تم تحميل الملف بنجاح', { id: 'export' });
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('حدث خطأ في تصدير الملف', { id: 'export' });
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200/60">
        <div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-600 tracking-tight mb-2">
            إدارة المنتجات
          </h1>
          <p className="text-slate-500 text-lg font-medium">نظرة عامة وإدارة شاملة للمخزون</p>
        </div>
        <div className="flex items-center space-x-4 space-x-reverse">
          <button
            onClick={openInventoryReport}
            className="flex items-center space-x-2 space-x-reverse px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-600/20 hover:shadow-red-600/30 hover:-translate-y-0.5 transition-all active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span>تقرير الجرد</span>
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center space-x-2 space-x-reverse px-6 py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-600/20 hover:shadow-green-600/30 hover:-translate-y-0.5 transition-all active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>تصدير Excel</span>
          </button>
          <button
            onClick={() => setShowMovementModal(true)}
            className="flex items-center space-x-2 space-x-reverse px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 hover:-translate-y-0.5 transition-all active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
            <span>حركة سريعة</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 space-x-reverse px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 hover:-translate-y-0.5 transition-all active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>منتج جديد</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 p-1 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 p-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 mr-1">البحث</label>
            <div className="relative group">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث باسم المنتج أو الكود..."
                className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 text-slate-800 rounded-xl px-4 py-3 pr-11 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-400 font-medium"
              />
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="md:w-1/3">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 mr-1">تصفية بالفئة</label>
            <div className="relative group">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full appearance-none bg-slate-50 border-0 ring-1 ring-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all cursor-pointer font-medium"
              >
                <option value="">جميع الفئات</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-full flex flex-col items-center justify-center p-20 space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <p className="text-slate-400 text-sm">جاري تحميل البيانات...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center p-20 space-y-6">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-slate-500 text-lg font-medium">لا توجد منتجات مسجلة</p>
          </div>
        ) : (
          products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => navigate(`/products/${product.id}`)}
              className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:border-blue-200/50 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
            >
              <div>
                {/* Product Icon/Initial */}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 rounded-2xl flex items-center justify-center font-bold text-xl shadow-inner group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-blue-200/50 transition-all duration-300">
                    {product.name.charAt(0)}
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${
                    product.current_stock <= product.min_stock_alert 
                      ? 'bg-red-50 text-red-600 ring-1 ring-red-100' 
                      : product.current_stock <= product.min_stock_alert * 2
                      ? 'bg-amber-50 text-amber-600 ring-1 ring-amber-100'
                      : 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100'
                  }`}>
                    {product.current_stock <= product.min_stock_alert ? 'منخفض' : 'متوفر'}
                  </div>
                </div>

                {/* Product Name */}
                <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {product.name}
                </h3>
                
                {/* Product Code */}
                <p className="text-xs text-slate-400 mb-4 font-mono bg-slate-50 inline-block px-2 py-1 rounded border border-slate-100">
                  {product.code}
                </p>
              </div>

              <div>
                {/* Stock & Price */}
                <div className="flex items-end justify-between pt-4 border-t border-slate-50">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">المخزون</p>
                    <div className={`flex items-baseline gap-1 ${
                      product.current_stock <= product.min_stock_alert 
                        ? 'text-red-600' 
                        : product.current_stock <= product.min_stock_alert * 2
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                    }`}>
                      <span className="text-2xl font-bold font-mono tracking-tight">
                        {product.current_stock.toLocaleString('en-US')}
                      </span>
                      <span className="text-xs font-medium text-slate-400">{product.unit}</span>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">السعر</p>
                    <div className="flex items-baseline gap-1 text-slate-800">
                      <span className="text-lg font-bold">
                        {parseFloat(product.unit_price).toFixed(2)}
                      </span>
                      <span className="text-xs text-slate-400">ج.م</span>
                    </div>
                  </div>
                </div>

                {/* Category & Actions */}
                <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                  <span className="inline-flex items-center px-2 py-1 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-bold border border-slate-100">
                    {product.category_name || 'بدون فئة'}
                  </span>
                  
                  <div className="flex items-center space-x-1 space-x-reverse opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(product);
                      }}
                      className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                      title="تعديل"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDelete(product);
                      }}
                      className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                      title="حذف"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Add Product Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddProductModal 
            onClose={() => setShowAddModal(false)} 
            onSuccess={() => {
              setShowAddModal(false);
              fetchProducts();
            }}
            categories={categories}
            onCategoryAdded={fetchCategories}
          />
        )}
      </AnimatePresence>



      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <DeleteConfirmationModal
            onClose={() => setShowDeleteModal(false)}
            onConfirm={handleDelete}
            itemName={productToDelete?.name}
          />
        )}
      </AnimatePresence>

      {/* Edit Product Modal */}
      <AnimatePresence>
        {showEditModal && productToEdit && (
          <EditProductModal 
            onClose={() => {
              setShowEditModal(false);
              setProductToEdit(null);
            }} 
            onSuccess={() => {
              setShowEditModal(false);
              setProductToEdit(null);
              fetchProducts();
            }}
            categories={categories}
            onCategoryAdded={fetchCategories}
            product={productToEdit}
          />
        )}
      </AnimatePresence>

      {/* Movement Modal */}
      <AnimatePresence>
        {showMovementModal && (
          <MovementModal 
            onClose={() => setShowMovementModal(false)} 
            onSuccess={() => {
              setShowMovementModal(false);
              fetchProducts();
            }}
            products={products}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Add Product Modal Component
function AddProductModal({ onClose, onSuccess, categories, onCategoryAdded }) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    category_id: '',
    unit: 'قطعة',
    unit_price: '',
    min_stock_alert: 10
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${window.location.protocol}//${window.location.hostname}:3000/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('تم إضافة المنتج بنجاح');
        onSuccess();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('حدث خطأ في إضافة المنتج');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 ring-1 ring-white/50"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3"></div>
           <div className="relative flex justify-between items-center z-10">
              <div className="flex items-center space-x-4 space-x-reverse">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                   <h2 className="text-2xl font-bold tracking-tight">إضافة منتج جديد</h2>
                   <p className="text-blue-100 text-sm font-medium opacity-90">أدخل تفاصيل المنتج الجديد بدقة</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
           </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center">
                كود المنتج
                <span className="text-red-500 mr-1">*</span>
              </label>
              <div className="relative group">
                 <input
                  type="text"
                  required
                  placeholder="مثال: P-1001"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pl-10 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent outline-none transition-all font-mono text-slate-800 placeholder:text-slate-400"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center">
                الفئة
                <span className="text-slate-400 text-xs mr-2">(اختياري)</span>
              </label>
              <CategorySelect
                categories={categories}
                value={formData.category_id}
                onChange={(val) => setFormData({...formData, category_id: val})}
                onCategoryAdded={onCategoryAdded}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 flex items-center">
              اسم المنتج
              <span className="text-red-500 mr-1">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="اسم المنتج كاملاً..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent outline-none transition-all text-slate-800 placeholder:text-slate-400"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">الوصف</label>
            <textarea
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent outline-none transition-all text-slate-800 placeholder:text-slate-400 min-h-[80px] resize-none"
              rows="3"
              placeholder="تفاصيل إضافية عن المنتج..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            ></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center">الوحدة</label>
              <input
                type="text"
                required
                placeholder="قطعة، كجم..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent outline-none transition-all text-slate-800"
                value={formData.unit}
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center">السعر</label>
              <div className="relative">
                 <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pl-10 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent outline-none transition-all text-slate-800 font-mono"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({...formData, unit_price: e.target.value})}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 text-sm font-bold">
                   ج.م
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center">تنبيه المخزون</label>
              <input
                type="number"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent outline-none transition-all text-slate-800"
                value={formData.min_stock_alert}
                onChange={(e) => setFormData({...formData, min_stock_alert: e.target.value})}
              />
            </div>
          </div>

          <div className="pt-6 flex gap-4 border-t border-slate-50">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-slate-800 font-bold transition-all text-base"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-base shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center space-x-2 space-x-reverse"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span>حفظ المنتج الجديد</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// Edit Product Modal Component
function EditProductModal({ onClose, onSuccess, categories, product }) {
  const [formData, setFormData] = useState({
    name: product.name || '',
    description: product.description || '',
    category_id: product.category_id || '',
    unit: product.unit || 'قطعة',
    unit_price: product.unit_price || '',
    min_stock_alert: product.min_stock_alert || 10
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${window.location.protocol}//${window.location.hostname}:3000/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('تم تحديث بيانات المنتج بنجاح');
        onSuccess();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('حدث خطأ في تحديث المنتج');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 ring-1 ring-white/50"
      >
        {/* Header with Gradient */}
        <div className="relative p-8 bg-gradient-to-r from-blue-600 to-indigo-600 overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
           <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/30 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4"></div>

           <div className="relative z-10 flex justify-between items-start">
              <div className="flex items-center space-x-4 space-x-reverse">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
                   <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                   </svg>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white tracking-tight">تعديل المنتج</h2>
                  <p className="text-blue-100 text-sm mt-1 font-medium bg-blue-800/30 inline-block px-3 py-1 rounded-full backdrop-blur-sm border border-blue-400/30">
                     كود المنتج: <span className="font-mono font-bold tracking-wider">{product.code}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
           </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
           {/* General Info Section */}
           <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 col-span-2 md:col-span-1">
                  <label className="text-sm font-bold text-slate-700">اسم المنتج <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-2 col-span-2 md:col-span-1">
                   <label className="text-sm font-bold text-slate-700">الفئة <span className="text-red-500">*</span></label>
                   <div className="relative group">
                      <select
                        required
                        value={formData.category_id}
                        onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                        className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all cursor-pointer font-medium"
                      >
                        <option value="">اختر الفئة...</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                   </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">الوصف</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="2"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none font-medium placeholder:text-slate-400"
                ></textarea>
              </div>
           </div>

           <div className="w-full h-px bg-slate-100"></div>

           {/* Pricing & Inventory Section */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">وحدة القياس <span className="text-red-500">*</span></label>
                <div className="relative">
                   <input
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    placeholder="قطعة، كجم، ..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">سعر الوحدة</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.unit_price}
                    onChange={(e) => setFormData({...formData, unit_price: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all pl-12 font-mono font-bold"
                  />
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-slate-400 text-sm font-bold">ل.س</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">حد التنبيه <span className="text-amber-500 text-xs">(Low Stock)</span></label>
                <input
                  type="number"
                  required
                  value={formData.min_stock_alert}
                  onChange={(e) => setFormData({...formData, min_stock_alert: e.target.value})}
                  className="w-full bg-amber-50 border border-amber-100 text-slate-800 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition-all font-mono font-bold"
                />
              </div>
           </div>

           {/* Actions */}
           <div className="pt-6 flex gap-4 border-t border-slate-50">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-slate-800 font-bold transition-all text-base"
            >
              إلغاء التعديلات
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-blue-500/25 transition-all flex items-center justify-center space-x-2 space-x-reverse disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  <span>حفظ التعديلات</span>
                </>
              )}
            </button>
           </div>
        </form>
      </motion.div>
    </div>
  );
}

// Delete Confirmation Modal
function DeleteConfirmationModal({ onClose, onConfirm, itemName }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 ring-1 ring-white/50"
      >
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-red-50/50">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">تأكيد الحذف</h3>
          <p className="text-slate-500 mb-8 text-lg leading-relaxed">
            هل أنت متأكد من حذف <br/><span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded mx-1">"{itemName}"</span>؟ <br/>
            <span className="text-sm text-red-500 font-bold mt-2 block">لا يمكن التراجع عن هذا الإجراء!</span>
          </p>
          
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-bold transition-colors text-base"
            >
              إلغاء
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-6 py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-red-500/20 transition-all text-base active:scale-[0.98]"
            >
              نعم، حذف
            </button>
           </div>
        </div>
      </motion.div>
    </div>
  );
}

// Movement Modal Component
function MovementModal({ onClose, onSuccess, products }) {
  const [formData, setFormData] = useState({
    product_id: '',
    movement_type: 'in',
    quantity: '',
    reason: '',
    notes: '',
    user_id: 1
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${window.location.protocol}//${window.location.hostname}:3000/api/inventory/movement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success(formData.movement_type === 'in' ? 'تم إضافة الكمية للمخزون' : 'تم سحب الكمية من المخزون');
        onSuccess();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('حدث خطأ في تسجيل الحركة');
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = products.find(p => p.id === parseInt(formData.product_id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 ring-1 ring-white/50"
      >
        {/* Header */}
        <div className={`relative p-8 text-white transition-colors duration-500 ${
           formData.movement_type === 'in' 
             ? 'bg-gradient-to-r from-emerald-600 to-teal-600' 
             : 'bg-gradient-to-r from-rose-600 to-pink-600'
        }`}>
           <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
           
           <div className="relative flex justify-between items-center z-10">
              <div className="flex items-center space-x-4 space-x-reverse">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-lg transition-colors duration-300">
                   {formData.movement_type === 'in' ? (
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 11l5-5m0 0l5 5m-5-5v12" /></svg>
                   ) : (
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 13l-5 5m0 0l-5-5m5 5V6" /></svg>
                   )}
                </div>
                <div>
                   <h2 className="text-2xl font-bold tracking-tight">
                     {formData.movement_type === 'in' ? 'إضافة مخزون' : 'صرف مخزون'}
                   </h2>
                   <p className="text-white/80 text-sm font-medium opacity-90">
                     {formData.movement_type === 'in' ? 'تسجيل واردات جديدة' : 'تسجيل صادرات أو استهلاك'}
                   </p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
           </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Movement Type Switcher */}
          <div className="bg-slate-50 p-1.5 rounded-2xl flex border border-slate-100">
              <button
                type="button"
                onClick={() => setFormData({...formData, movement_type: 'in'})}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center space-x-2 space-x-reverse transition-all duration-300 ${
                  formData.movement_type === 'in'
                    ? 'bg-white text-emerald-600 shadow-md shadow-emerald-900/5 ring-1 ring-black/5'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" /></svg>
                <span>إضافة للمخزن (وارد)</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, movement_type: 'out'})}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center space-x-2 space-x-reverse transition-all duration-300 ${
                  formData.movement_type === 'out'
                    ? 'bg-white text-rose-600 shadow-md shadow-rose-900/5 ring-1 ring-black/5'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6" /></svg>
                <span>سحب من المخزن (صادر)</span>
              </button>
          </div>

          {/* Product Selection */}
          <div className="space-y-2">
             <label className="text-sm font-bold text-slate-700">المنتج</label>
             <div className="relative group">
                <select
                  required
                  value={formData.product_id}
                  onChange={(e) => setFormData({...formData, product_id: e.target.value})}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all cursor-pointer font-medium"
                >
                  <option value="">اختر المنتج...</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} — {product.code}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
             </div>
          </div>

          {/* Stock Info Box */}
          <AnimatePresence>
            {selectedProduct && (
              <motion.div 
                initial={{ height: 0, opacity: 0, y: -10 }}
                animate={{ height: "auto", opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -10 }}
                className="overflow-hidden"
              >
                 <div className={`border rounded-xl p-4 flex justify-between items-center ${
                    formData.movement_type === 'in' 
                      ? 'bg-emerald-50/50 border-emerald-100' 
                      : 'bg-rose-50/50 border-rose-100'
                 }`}>
                    <div className="flex items-center space-x-3 space-x-reverse">
                       <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          formData.movement_type === 'in' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                       }`}>
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                       </div>
                       <div>
                          <p className={`text-xs font-bold uppercase tracking-wider ${
                             formData.movement_type === 'in' ? 'text-emerald-600' : 'text-rose-600'
                          }`}>المخزون الحالي</p>
                          <p className="text-sm text-slate-700 font-bold">{selectedProduct.name}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <div className="text-2xl font-bold text-slate-800 font-mono tracking-tight">
                         {selectedProduct.current_stock.toLocaleString('en-US')}
                       </div>
                       <div className="text-xs text-slate-400 font-medium">{selectedProduct.unit}</div>
                    </div>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">الكمية</label>
              <input
                type="number"
                required
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-mono text-lg font-bold"
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">السبب</label>
              <input
                type="text"
                required
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="مثال: فاتورة شراء، تالف..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">ملاحظات (اختياري)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows="2"
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
              placeholder="أي تفاصيل إضافية..."
            ></textarea>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex gap-4 border-t border-slate-50">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-slate-800 font-bold transition-all text-base"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-[2] px-6 py-4 text-white rounded-xl font-bold text-base hover:shadow-xl transition-all flex items-center justify-center space-x-2 space-x-reverse disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98] ${
                 formData.movement_type === 'in' 
                 ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25'
                 : 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 shadow-lg shadow-rose-500/25'
              }`}
            >
              {loading ? (
                <>
                   <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                   {formData.movement_type === 'in' ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                   ) : (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                   )}
                   <span>{formData.movement_type === 'in' ? 'تأكيد إضافة المخزون' : 'تأكيد صرف المخزون'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default Products;

