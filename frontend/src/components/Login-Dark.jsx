import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch(`${window.location.protocol}//${window.location.hostname}:3000/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Save token
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        toast.success(`أهلاً بك يا ${data.user.full_name}`, {
          duration: 2000,
          position: 'top-center',
          icon: '👏',
          style: {
            background: '#10B981',
            color: '#fff',
            fontWeight: 'bold',
          },
        });

        // Redirect to dashboard after short delay
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      } else {
        // فحص نوع الخطأ وعرض الرسالة المناسبة
        if (data.errorType === 'USER_NOT_FOUND') {
          toast.error('عذراً، هذا المستخدم غير مسجل في النظام', {
            duration: 4000,
            position: 'top-center',
            style: {
              background: '#EF4444',
              color: '#fff',
            },
          });
        } else if (data.errorType === 'WRONG_PASSWORD') {
          toast.error('كلمة المرور غير صحيحة، حاول مرة أخرى', {
            duration: 4000,
            position: 'top-center',
            style: {
              background: '#F59E0B',
              color: '#fff',
            },
          });
        } else {
          toast.error(data.message || 'فشل تسجيل الدخول', {
             position: 'top-center',
          });
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('حدث خطأ في الاتصال بالخادم', {
        position: 'top-center',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-4 font-sans overflow-hidden relative">
      
      {/* Background Shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-10 -left-10 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-10 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-20 w-96 h-96 bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Card Container */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl p-8 space-y-8">
          
          {/* Logo & Title */}
          <div className="text-center space-y-4">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-6 transition-transform duration-300"
            >
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </motion.div>
            <div>
              <h1 className="text-4xl font-bold text-white tracking-tight">IT System</h1>
              <p className="text-slate-400 mt-2 text-lg">لوحة تحكم المسؤول</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div className="space-y-2 group">
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 group-hover:text-blue-400 transition-colors">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pr-11 pl-4 py-4 bg-slate-900/50 border border-slate-700 text-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300 outline-none placeholder-slate-600"
                  placeholder="admin@example.com"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2 group">
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 group-hover:text-purple-400 transition-colors">
                كلمة المرور
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-slate-500 group-focus-within:text-purple-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pr-11 pl-4 py-4 bg-slate-900/50 border border-slate-700 text-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all duration-300 outline-none placeholder-slate-600"
                  placeholder="••••••••"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2 space-x-reverse">
                  <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>جاري التحقق...</span>
                </div>
              ) : (
                'تسجيل الدخول'
              )}
            </motion.button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-8 pb-4">
          © 2026 جميع الحقوق محفوظة للنظام
        </p>
      </motion.div>
    </div>
  );
}

export default Login;

