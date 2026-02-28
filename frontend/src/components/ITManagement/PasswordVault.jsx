import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';

const API_URL = `${window.location.protocol}//${window.location.hostname}:3000/api`;

const PasswordVault = () => {
  const [passwords, setPasswords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPassword, setEditingPassword] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [filterCategory, setFilterCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    username: '',
    password: '',
    url: '',
    category: '',
    service_type: '',
    notes: '',
    tags: ''
  });

  const categories = ['social', 'email', 'banking', 'hosting', 'software', 'vpn', 'other'];

  const fetchPasswords = async () => {
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.append('category', filterCategory);
      
      const response = await fetch(`${API_URL}/password-vault?${params.toString()}`);
      const data = await response.json();
      setPasswords(data);
    } catch (error) {
      console.error('Error:', error);
      toast.error('فشل في تحميل كلمات المرور');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/password-vault/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    fetchPasswords();
    fetchStats();
  }, [filterCategory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingPassword 
        ? `${API_URL}/password-vault/${editingPassword.id}`
        : `${API_URL}/password-vault`;
      
      const method = editingPassword ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success(editingPassword ? 'تم تحديث كلمة المرور' : 'تم إضافة كلمة المرور');
        setShowAddModal(false);
        setShowEditModal(false);
        resetForm();
        fetchPasswords();
        fetchStats();
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('هل أنت متأكد من حذف كلمة المرور؟')) return;

    try {
      const response = await fetch(`${API_URL}/password-vault/${id}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('تم حذف كلمة المرور');
        fetchPasswords();
        fetchStats();
      }
    } catch (error) {
      toast.error('فشل في الحذف');
    }
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('تم النسخ!');
  };

  const toggleFavorite = async (id) => {
    try {
      await fetch(`${API_URL}/password-vault/${id}/favorite`, { method: 'PUT' });
      fetchPasswords();
    } catch (error) {
      toast.error('فشل في تحديث المفضلة');
    }
  };

  const resetForm = () => {
    setFormData({ title: '', username: '', password: '', url: '', category: '', service_type: '', notes: '', tags: '' });
    setEditingPassword(null);
  };

  const openEditModal = (item) => {
    setEditingPassword(item);
    setFormData({
      title: item.title || '',
      username: item.username || '',
      password: '',
      url: item.url || '',
      category: item.category || '',
      service_type: item.service_type || '',
      notes: item.notes || '',
      tags: item.tags || ''
    });
    setShowEditModal(true);
  };

  const filteredPasswords = passwords.filter(p => 
    p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Toaster position="top-center" />
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">🔐 خزنة كلمات المرور</h1>
        <p className="text-gray-600">إدارة وحفظ كلمات المرور بشكل آمن</p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
            <div className="text-sm opacity-90">إجمالي كلمات المرور</div>
            <div className="text-3xl font-bold mt-2">{stats.total_passwords}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-6 text-white">
            <div className="text-sm opacity-90">المفضلة</div>
            <div className="text-3xl font-bold mt-2">{stats.favorite_passwords}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
            <div className="text-sm opacity-90">الفئات</div>
            <div className="text-3xl font-bold mt-2">{stats.total_categories}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
            <div className="text-sm opacity-90">آخر تحديث</div>
            <div className="text-lg font-bold mt-2">{stats.last_accessed ? new Date(stats.last_accessed).toLocaleDateString('ar-EG') : '-'}</div>
          </motion.div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4">
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="بحث..." className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">كل الفئات</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <button onClick={() => setShowAddModal(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">+ إضافة كلمة مرور</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredPasswords.map((item) => (
            <motion.div key={item.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-lg text-gray-800">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.category}</p>
                </div>
                <button onClick={() => toggleFavorite(item.id)} className={`text-2xl ${item.is_favorite ? 'text-yellow-500' : 'text-gray-300'}`}>★</button>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between bg-gray-50 rounded p-2">
                  <span className="text-sm text-gray-600">المستخدم:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{item.username}</span>
                    <button onClick={() => copyToClipboard(item.username)} className="text-blue-500 hover:text-blue-700">📋</button>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-gray-50 rounded p-2">
                  <span className="text-sm text-gray-600">كلمة المرور:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{visiblePasswords[item.id] ? item.password : '••••••••'}</span>
                    <button onClick={() => togglePasswordVisibility(item.id)} className="text-blue-500 hover:text-blue-700">{visiblePasswords[item.id] ? '🙈' : '👁️'}</button>
                    <button onClick={() => copyToClipboard(item.password)} className="text-blue-500 hover:text-blue-700">📋</button>
                  </div>
                </div>
                {item.url && (
                  <div className="flex items-center justify-between bg-gray-50 rounded p-2">
                    <span className="text-sm text-gray-600">الرابط:</span>
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-sm truncate max-w-[150px]">{item.url}</a>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button onClick={() => openEditModal(item)} className="text-blue-600 hover:text-blue-800 text-sm">تعديل</button>
                <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800 text-sm">حذف</button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {(showAddModal || showEditModal) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-6">{editingPassword ? 'تعديل' : 'إضافة كلمة مرور'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">العنوان *</label>
                  <input type="text" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">اسم المستخدم *</label>
                  <input type="text" required value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">كلمة المرور {!editingPassword && '*'}</label>
                  <input type="password" required={!editingPassword} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2 border rounded-lg" placeholder={editingPassword ? 'اتركه فارغ إذا لم تريد التغيير' : ''} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">الرابط</label>
                  <input type="url" value={formData.url} onChange={(e) => setFormData({...formData, url: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">الفئة</label>
                  <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2 border rounded-lg">
                    <option value="">اختر الفئة</option>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ملاحظات</label>
                  <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full px-4 py-2 border rounded-lg" rows="2" />
                </div>
                <div className="flex justify-end gap-4 mt-6">
                  <button type="button" onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }} className="px-6 py-2 border rounded-lg">إلغاء</button>
                  <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editingPassword ? 'تحديث' : 'إضافة'}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PasswordVault;
