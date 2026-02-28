import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    console.log('🔐 Attempting login...');

    try {
      console.log('📡 Sending login request to:', `${window.location.protocol}//${window.location.hostname}:3000/api/auth/login`);
      const response = await fetch(`${window.location.protocol}//${window.location.hostname}:3000/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('✅ Response received:', response.status);
      const data = await response.json();
      console.log('📦 Response data:', data);

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        toast.success('تم تسجيل الدخول بنجاح');
        console.log('✅ Login successful, navigating to dashboard...');
        navigate('/dashboard');
      } else {
        if (data.errorType === 'USER_NOT_FOUND') {
          toast.error('البريد الإلكتروني غير مسجل');
        } else if (data.errorType === 'WRONG_PASSWORD') {
          toast.error('كلمة المرور غير صحيحة');
        } else {
          toast.error(data.message || 'حدث خطأ في تسجيل الدخول');
        }
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      toast.error('حدث خطأ في الاتصال بالسيرفر');
    } finally {
      console.log('✅ Login process finished');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            borderRadius: ["30%", "50%", "30%"],
          }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-300/20 to-cyan-300/20 blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
            borderRadius: ["40%", "60%", "40%"],
          }}
          transition={{ duration: 25, repeat: Infinity }}
          className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-300/20 to-pink-300/20 blur-3xl"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-200/50 p-8 shadow-2xl shadow-slate-300/50">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">مرحباً بك</h1>
            <p className="text-slate-600">سجل دخولك للنظام</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">البريد الإلكتروني أو اسم المستخدم</label>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border-2 border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="example@itsystem.com أو اسم المستخدم AD"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">كلمة المرور</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border-2 border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="••••••••"
                dir="ltr"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-3.5 rounded-xl font-bold hover:shadow-lg hover:shadow-blue-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center space-x-2 space-x-reverse">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>جاري تسجيل الدخول...</span>
                </span>
              ) : (
                'تسجيل الدخول'
              )}
            </button>
          </form>

          {/* Demo Accounts */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-xs text-slate-600 mb-2 font-semibold">حسابات تجريبية:</p>
            <div className="text-xs text-slate-600 space-y-1">
              <p className="font-mono">super@itsystem.com / Super@123</p>
              <p className="font-mono">admin@itsystem.com / admin123</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default Login;
