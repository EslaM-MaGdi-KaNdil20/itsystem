import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${window.location.protocol}//${window.location.hostname}:3000/api/categories`);
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      toast.error('حدث خطأ في جلب الفئات');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;
    
    try {
      const response = await fetch(`${window.location.protocol}//${window.location.hostname}:3000/api/categories/${selectedCategory.id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success('تم حذف الفئة بنجاح');
        fetchCategories();
        setShowDeleteModal(false);
        setSelectedCategory(null);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('حدث خطأ في حذف الفئة');
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-[1200px] mx-auto min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200/60">
        <div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-600 tracking-tight mb-2">
            إدارة الفئات
          </h1>
          <p className="text-slate-500 text-lg font-medium">تنظيم وإدارة فئات المنتجات</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 space-x-reverse px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 hover:-translate-y-0.5 transition-all active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>فئة جديدة</span>
        </button>
      </div>

      {/* Categories Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">لا توجد فئات</h3>
          <p className="text-slate-500">أضف فئة جديدة للبدء</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-lg transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20">
                  {category.name.charAt(0)}
                </div>
                <div className="flex items-center space-x-1 space-x-reverse opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setSelectedCategory(category);
                      setShowEditModal(true);
                    }}
                    className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                    title="تعديل"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCategory(category);
                      setShowDeleteModal(true);
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
              
              <h3 className="text-xl font-bold text-slate-800 mb-2">{category.name}</h3>
              <p className="text-slate-500 text-sm mb-4 line-clamp-2">
                {category.description || 'لا يوجد وصف'}
              </p>
              
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <span className="text-sm text-slate-500">المنتجات</span>
                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm font-bold">
                  {category.products_count || 0}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <CategoryModal
            onClose={() => setShowAddModal(false)}
            onSuccess={() => {
              setShowAddModal(false);
              fetchCategories();
            }}
          />
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && selectedCategory && (
          <CategoryModal
            category={selectedCategory}
            onClose={() => {
              setShowEditModal(false);
              setSelectedCategory(null);
            }}
            onSuccess={() => {
              setShowEditModal(false);
              setSelectedCategory(null);
              fetchCategories();
            }}
          />
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && selectedCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8"
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 text-center mb-2">حذف الفئة</h3>
              <p className="text-slate-500 text-center mb-6">
                هل أنت متأكد من حذف فئة "{selectedCategory.name}"؟
              </p>
              <div className="flex space-x-3 space-x-reverse">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedCategory(null);
                  }}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors"
                >
                  حذف
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Category Modal (Add/Edit)
function CategoryModal({ category, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || ''
  });
  const [loading, setLoading] = useState(false);
  const isEdit = !!category;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = isEdit 
        ? `${window.location.protocol}//${window.location.hostname}:3000/api/categories/${category.id}`
        : `${window.location.protocol}//${window.location.hostname}:3000/api/categories`;
      
      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success(isEdit ? 'تم تحديث الفئة بنجاح' : 'تم إضافة الفئة بنجاح');
        onSuccess();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('حدث خطأ');
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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold">{isEdit ? 'تعديل الفئة' : 'فئة جديدة'}</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">
              اسم الفئة <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="مثال: إلكترونيات"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent outline-none transition-all"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">الوصف</label>
            <textarea
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent outline-none transition-all min-h-[100px] resize-none"
              placeholder="وصف مختصر للفئة..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            ></textarea>
          </div>

          <div className="flex space-x-3 space-x-reverse pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
            >
              {loading ? 'جاري الحفظ...' : (isEdit ? 'تحديث' : 'إضافة')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default Categories;
