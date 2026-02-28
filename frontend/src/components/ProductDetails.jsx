import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Calculate totals from movements
  const totalIn = movements.filter(m => m.movement_type === 'in').reduce((sum, m) => sum + m.quantity, 0);
  const totalOut = movements.filter(m => m.movement_type === 'out').reduce((sum, m) => sum + m.quantity, 0);
  const calculatedStock = totalIn - totalOut;

  useEffect(() => {
    fetchProductDetails();
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      // Fetch product info
      const productRes = await fetch(`${window.location.protocol}//${window.location.hostname}:3000/api/products/${id}`);
      const productData = await productRes.json();
      
      if (productData.success) {
        setProduct(productData.data);
      } else {
        toast.error('لم يتم العثور على المنتج');
        navigate('/products');
        return;
      }

      // Fetch movements
      const movementsRes = await fetch(`${window.location.protocol}//${window.location.hostname}:3000/api/inventory/movements?product_id=${id}`);
      const movementsData = await movementsRes.json();
      
      if (movementsData.success) {
        setMovements(movementsData.data);
      }
    } catch (error) {
      console.error('Error fetching details:', error);
      toast.error('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
     return (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-500 font-medium">جاري تحميل تفاصيل المنتج...</p>
        </div>
     );
  }

  if (!product) return null;

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen space-y-8">
      {/* Page Header */}
      <div className="flex items-center space-x-4 space-x-reverse mb-8">
         <button 
           onClick={() => navigate('/products')}
           className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:shadow-md transition-all text-slate-600"
         >
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
           </svg>
         </button>
         <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">تفاصيل المنتج</h1>
            <p className="text-slate-500 font-medium mt-1">عرض شامل لبيانات وحركات {product.name}</p>
         </div>
      </div>

      {/* Main Content Card (Previously Modal Body) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden"
      >
        {/* Header Section */}
        <div className="relative bg-gradient-to-r from-blue-700 to-blue-600 p-8 text-white overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>
          
          <div className="relative flex items-center justify-between z-10">
            <div className="flex items-center space-x-6 space-x-reverse">
              <div className="w-20 h-20 bg-white shadow-2xl shadow-blue-900/20 rounded-3xl flex items-center justify-center text-3xl font-bold text-blue-600 ring-4 ring-white/20">
                {product.name.charAt(0)}
              </div>
              <div className="flex flex-col space-y-1">
                <h2 className="text-3xl font-bold tracking-tight">{product.name}</h2>
                <div className="flex items-center space-x-3 space-x-reverse">
                  <span className="text-blue-100 text-sm font-medium">كود المنتج:</span>
                  <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-lg text-sm font-mono border border-white/10 tracking-wider font-bold">
                    {product.code}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-8">
           {/* Main Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 -mt-16 relative z-20">
            {/* Current Stock Card - MAIN */}
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 shadow-xl shadow-emerald-200/50 text-white hover:-translate-y-1 transition-transform duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  calculatedStock <= product.min_stock_alert 
                    ? 'bg-red-500/80 text-white' 
                    : 'bg-white/20 text-white'
                }`}>
                  {calculatedStock <= product.min_stock_alert ? 'تنبيه!' : 'متوفر'}
                </span>
              </div>
              <p className="text-emerald-100 font-bold text-xs mb-1 uppercase tracking-wide">المخزون الحالي</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-4xl font-black tracking-tight font-mono">
                  {calculatedStock.toLocaleString('en-US')}
                </h3>
                <span className="text-emerald-200 font-bold text-sm">{product.unit}</span>
              </div>
            </div>

            {/* Total In Card */}
            <div className="bg-white rounded-2xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-1 transition-transform duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-50 rounded-xl">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                  </svg>
                </div>
              </div>
              <p className="text-slate-500 font-bold text-xs mb-1 uppercase tracking-wide">إجمالي الوارد</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-extrabold text-blue-600 tracking-tight font-mono">
                  +{totalIn.toLocaleString('en-US')}
                </h3>
                <span className="text-slate-400 font-bold text-xs">{product.unit}</span>
              </div>
            </div>

            {/* Total Out Card */}
            <div className="bg-white rounded-2xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-1 transition-transform duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-rose-50 rounded-xl">
                  <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                  </svg>
                </div>
              </div>
              <p className="text-slate-500 font-bold text-xs mb-1 uppercase tracking-wide">إجمالي الصادر</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-extrabold text-rose-600 tracking-tight font-mono">
                  -{totalOut.toLocaleString('en-US')}
                </h3>
                <span className="text-slate-400 font-bold text-xs">{product.unit}</span>
              </div>
            </div>

            {/* Price Card */}
            <div className="bg-white rounded-2xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-1 transition-transform duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-amber-50 rounded-xl">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-slate-500 font-bold text-xs mb-1 uppercase tracking-wide">سعر الوحدة</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight font-mono">
                  {parseFloat(product.unit_price).toFixed(2)}
                </h3>
                <span className="text-slate-400 font-bold text-xs">ج.م</span>
              </div>
            </div>
          </div>

          {/* Product Info Row */}
          <div className="flex flex-wrap gap-4 mb-8">
            <div className="flex items-center bg-purple-50 rounded-xl px-4 py-2.5 border border-purple-100">
              <svg className="w-4 h-4 text-purple-600 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span className="text-purple-700 font-bold text-sm">{product.category_name || 'بدون فئة'}</span>
            </div>
            <div className="flex items-center bg-amber-50 rounded-xl px-4 py-2.5 border border-amber-100">
              <svg className="w-4 h-4 text-amber-600 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-amber-700 font-bold text-sm">حد التنبيه: {product.min_stock_alert} {product.unit}</span>
            </div>
            {product.description && (
              <div className="flex items-center bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-100 flex-1">
                <svg className="w-4 h-4 text-slate-500 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-slate-600 font-medium text-sm truncate">{product.description}</span>
              </div>
            )}
          </div>

          {/* Stock Movements Table */}
          <div className="bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <span className="p-2 bg-white rounded-lg ml-3 shadow-sm">
                   <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </span>
                سجل الحركات
              </h3>
              <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                {movements.length} حركة
              </span>
            </div>

            {movements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-3 text-slate-300">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-slate-500 font-bold text-sm">لا توجد حركات مسجلة حتى الآن</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-white border-b border-slate-100">
                      <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">النوع</th>
                      <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">الكمية</th>
                      <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">التاريخ</th>
                      <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">السبب</th>
                      <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {movements.map((movement, index) => (
                      <motion.tr
                        key={movement.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.03 }}
                        className="hover:bg-white transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className={`inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-bold ${
                            movement.movement_type === 'in'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}>
                            {movement.movement_type === 'in' ? (
                              <svg className="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                              </svg>
                            )}
                            {movement.movement_type === 'in' ? 'وارد' : 'صادر'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`font-bold font-mono text-base ${
                            movement.movement_type === 'in' ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {movement.movement_type === 'in' ? '+' : '-'}{movement.quantity.toLocaleString('en-US')}
                          </span>
                          <span className="text-slate-400 text-xs mr-1">{product.unit}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-700 font-medium text-sm">
                            {new Date(movement.created_at).toLocaleDateString('ar-EG', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                          <div className="text-slate-400 text-xs">
                            {new Date(movement.created_at).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-slate-600 text-sm font-medium">
                            {movement.reason || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-slate-500 text-sm">
                            {movement.notes || '-'}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default ProductDetails;