import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

function CategorySelect({ categories, value, onChange, onCategoryAdded }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showAddNew, setShowAddNew] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Get selected category name
  const selectedCategory = categories.find(c => c.id == value);
  
  // Filter categories based on search
  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(search.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowAddNew(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      toast.error('أدخل اسم الفئة');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${window.location.protocol}//${window.location.hostname}:3000/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory)
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('تم إضافة الفئة بنجاح');
        onChange(data.data.id); // Select the new category
        setNewCategory({ name: '', description: '' });
        setShowAddNew(false);
        setIsOpen(false);
        if (onCategoryAdded) onCategoryAdded(); // Refresh categories list
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('حدث خطأ في إضافة الفئة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Input Field */}
      <div 
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 cursor-pointer flex items-center justify-between hover:border-slate-300 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={selectedCategory ? 'text-slate-800' : 'text-slate-400'}>
          {selectedCategory ? selectedCategory.name : 'اختر الفئة (اختياري)'}
        </span>
        <svg className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
          >
            {/* Search Input */}
            <div className="p-3 border-b border-slate-100">
              <input
                ref={inputRef}
                type="text"
                placeholder="ابحث عن فئة..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Categories List */}
            <div className="max-h-48 overflow-y-auto">
              {/* Clear Selection Option */}
              <div
                className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-slate-400 text-sm flex items-center"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
              >
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                بدون فئة
              </div>
              
              {filteredCategories.length === 0 ? (
                <div className="px-4 py-3 text-slate-400 text-sm text-center">
                  لا توجد فئات مطابقة
                </div>
              ) : (
                filteredCategories.map(cat => (
                  <div
                    key={cat.id}
                    className={`px-4 py-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition-colors ${
                      value == cat.id ? 'bg-blue-50 text-blue-600' : 'text-slate-700'
                    }`}
                    onClick={() => {
                      onChange(cat.id);
                      setIsOpen(false);
                      setSearch('');
                    }}
                  >
                    <span className="font-medium">{cat.name}</span>
                    {value == cat.id && (
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add New Category Section */}
            <div className="border-t border-slate-100">
              {!showAddNew ? (
                <button
                  type="button"
                  className="w-full px-4 py-3 text-blue-600 hover:bg-blue-50 text-sm font-medium flex items-center justify-center transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAddNew(true);
                  }}
                >
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  إضافة فئة جديدة
                </button>
              ) : (
                <div className="p-3 space-y-3 bg-slate-50" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    placeholder="اسم الفئة الجديدة"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  />
                  <textarea
                    placeholder="الوصف (اختياري)"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                    rows="2"
                    value={newCategory.description}
                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  ></textarea>
                  <div className="flex space-x-2 space-x-reverse">
                    <button
                      type="button"
                      className="flex-1 px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                      onClick={() => {
                        setShowAddNew(false);
                        setNewCategory({ name: '', description: '' });
                      }}
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      onClick={handleAddCategory}
                      disabled={loading}
                    >
                      {loading ? 'جاري الإضافة...' : 'إضافة'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CategorySelect;
