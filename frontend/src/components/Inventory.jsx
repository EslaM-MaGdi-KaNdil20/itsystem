import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

function Inventory() {
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    fetchMovements();
    fetchProducts();
  }, [filterType]);

  const fetchMovements = async () => {
    try {
      const params = new URLSearchParams();
      if (filterType) params.append('type', filterType);
      
      const response = await fetch(`${window.location.protocol}//${window.location.hostname}:3000/api/inventory/movements?${params}`);
      const data = await response.json();
      if (data.success) {
        setMovements(data.data);
      }
    } catch (error) {
      console.error('Error fetching movements:', error);
      toast.error('حدث خطأ في جلب الحركات');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${window.location.protocol}//${window.location.hostname}:3000/api/products`);
      const data = await response.json();
      if (data.success) {
        setProducts(data.data.filter(p => p.is_active));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">حركات المخزن</h1>
          <p className="text-slate-500 mt-2 text-lg">عرض وإدارة جميع حركات الإضافة والسحب من المخزن</p>
        </div>
        <button
          onClick={() => setShowMovementModal(true)}
          className="flex items-center justify-center space-x-2 space-x-reverse px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>تسجيل حركة جديدة</span>
        </button>
      </div>

      {/* Filter and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <label className="block text-sm font-semibold text-slate-700 mb-4">تصفية حسب النوع</label>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setFilterType('')}
              className={`px-6 py-2.5 rounded-xl font-semibold transition-all shadow-sm ${
                filterType === '' 
                  ? 'bg-blue-600 text-white shadow-blue-200 ring-2 ring-blue-100' 
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setFilterType('in')}
              className={`px-6 py-2.5 rounded-xl font-semibold transition-all shadow-sm flex items-center space-x-2 space-x-reverse ${
                filterType === 'in' 
                  ? 'bg-emerald-600 text-white shadow-emerald-200 ring-2 ring-emerald-100' 
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" /></svg>
              <span>وارد (إضافة)</span>
            </button>
            <button
              onClick={() => setFilterType('out')}
              className={`px-6 py-2.5 rounded-xl font-semibold transition-all shadow-sm flex items-center space-x-2 space-x-reverse ${
                filterType === 'out' 
                  ? 'bg-rose-600 text-white shadow-rose-200 ring-2 ring-rose-100' 
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6" /></svg>
              <span>صادر (سحب)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Movements Timeline */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
            <p className="text-slate-400 text-sm">جاري تحميل سجل الحركات...</p>
          </div>
        ) : movements.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 space-y-6">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-slate-500 text-lg font-medium">لا توجد حركات مسجلة</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
             {movements.map((movement, index) => (
              <motion.div
                key={movement.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="group flex flex-col sm:flex-row items-stretch sm:items-center space-y-4 sm:space-y-0 sm:space-x-6 sm:space-x-reverse p-6 hover:bg-slate-50/80 transition-all border-l-4 border-transparent hover:border-l-blue-500"
              >
                {/* Time & Date */}
                <div className="flex flex-col items-center justify-center sm:w-32 flex-shrink-0">
                   <div className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full mb-1">
                      {new Date(movement.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                   </div>
                   <div className="text-xs text-slate-400 font-medium">
                      {new Date(movement.created_at).toLocaleDateString('ar-EG')}
                   </div>
                </div>

                {/* Icon */}
                <div className={`hidden sm:flex flex-shrink-0 w-14 h-14 rounded-2xl items-center justify-center shadow-sm transition-transform group-hover:scale-110 ${
                  movement.movement_type === 'in' 
                    ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200' 
                    : 'bg-rose-50 text-rose-600 ring-1 ring-rose-200'
                }`}>
                  {movement.movement_type === 'in' ? (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                    </svg>
                  ) : (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                    </svg>
                  )}
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="flex flex-col">
                      <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors mb-1">
                        {movement.product_name}
                      </h3>
                      <div className="flex items-center text-sm text-slate-500 space-x-2 space-x-reverse">
                         <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{movement.product_code}</span>
                         <span>•</span>
                         <span className="font-medium">{movement.reason}</span>
                      </div>
                   </div>
                   
                   <div className="flex flex-col justify-center items-start md:items-end">
                      <div className={`text-2xl font-bold font-mono tracking-tight flex items-center ${
                          movement.movement_type === 'in' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                        {movement.movement_type === 'in' ? '+' : '-'}{movement.quantity}
                        <span className="text-xs text-slate-400 font-normal mr-2">وحدة</span>
                      </div>
                   </div>
                </div>
                
                 {/* Notes if any */}
                 {movement.notes && (
                    <div className="hidden md:block w-px h-12 bg-slate-200 mx-4"></div>
                 )}
                 {movement.notes && (
                   <div className="hidden md:flex flex-col w-48 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                      " {movement.notes} "
                   </div>
                 )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Movement Modal */}
      <AnimatePresence>
        {showMovementModal && (
          <MovementModal 
            onClose={() => setShowMovementModal(false)} 
            onSuccess={() => {
              setShowMovementModal(false);
              fetchMovements();
              fetchProducts();
            }}
            products={products}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Movement Modal Component
function MovementModal({ onClose, onSuccess, products }) {
  const [formData, setFormData] = useState({
    product_id: '',
    movement_type: 'in', // 'in' or 'out'
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
        toast.success('تم تسجيل الحركة بنجاح');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800">تسجيل حركة جديدة</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Movement Type Switcher */}
          <div className="bg-slate-100/50 p-1.5 rounded-xl flex">
              <button
                type="button"
                onClick={() => setFormData({...formData, movement_type: 'in'})}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold flex items-center justify-center space-x-2 space-x-reverse transition-all ${
                  formData.movement_type === 'in'
                    ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-black/5'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" /></svg>
                <span>إضافة للمخزن</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, movement_type: 'out'})}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold flex items-center justify-center space-x-2 space-x-reverse transition-all ${
                  formData.movement_type === 'out'
                    ? 'bg-white text-rose-600 shadow-sm ring-1 ring-black/5'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6" /></svg>
                <span>سحب من المخزن</span>
              </button>
          </div>

          {/* Product Selection */}
          <div className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">المنتج</label>
                <div className="relative">
                  <select
                    required
                    value={formData.product_id}
                    onChange={(e) => setFormData({...formData, product_id: e.target.value})}
                    className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all cursor-pointer"
                  >
                    <option value="">اختر المنتج...</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} (الكود: {product.code})
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
             </div>

             {/* Stock Info Box */}
             <AnimatePresence>
                {selectedProduct && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                     <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex justify-between items-center">
                        <div className="flex items-center space-x-3 space-x-reverse">
                           <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                           </div>
                           <div>
                              <p className="text-xs text-blue-500 font-bold uppercase tracking-wider">المخزون الحالي</p>
                              <p className="text-sm text-slate-600 font-medium">{selectedProduct.name}</p>
                           </div>
                        </div>
                        <div className="text-2xl font-bold text-slate-800 font-mono">
                           {selectedProduct.current_stock} <span className="text-xs text-slate-400 font-normal">{selectedProduct.unit}</span>
                        </div>
                     </div>
                  </motion.div>
                )}
             </AnimatePresence>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">الكمية</label>
              <input
                type="number"
                required
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-mono"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">السبب</label>
              <input
                type="text"
                required
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="مثال: شراء، تالف..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">ملاحظات (اختياري)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows="2"
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
              placeholder="أي تفاصيل إضافية..."
            ></textarea>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-bold transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-4 py-3.5 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                 formData.movement_type === 'in' 
                 ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                 : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
              }`}
            >
              {loading ? 'جاري الحفظ...' : (formData.movement_type === 'in' ? 'تأكيد الإضافة' : 'تأكيد السحب')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default Inventory;
