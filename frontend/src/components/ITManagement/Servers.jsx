import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';

const API_URL = `${window.location.protocol}//${window.location.hostname}:3000/api`;

const Servers = () => {
  const [servers, setServers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingServer, setEditingServer] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');

  const [formData, setFormData] = useState({
    name: '', hostname: '', public_ip: '', private_ip: '', ssh_port: '22',
    server_type: 'vps', provider: '', location: '', os: '', cpu: '', ram: '', storage: '',
    username: '', password: '', status: 'active', notes: ''
  });

  const fetchServers = async () => {
    try {
      const params = filterStatus ? `?status=${filterStatus}` : '';
      const response = await fetch(`${API_URL}/servers${params}`);
      const data = await response.json();
      setServers(data);
    } catch (error) {
      toast.error('فشل في تحميل السيرفرات');
    } finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/servers/stats`);
      setStats(await response.json());
    } catch (error) { console.error(error); }
  };

  useEffect(() => { fetchServers(); fetchStats(); }, [filterStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingServer ? `${API_URL}/servers/${editingServer.id}` : `${API_URL}/servers`;
      const response = await fetch(url, {
        method: editingServer ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        toast.success(editingServer ? 'تم تحديث السيرفر' : 'تم إضافة السيرفر');
        setShowModal(false); resetForm(); fetchServers(); fetchStats();
      }
    } catch (error) { toast.error('حدث خطأ'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('حذف السيرفر؟')) return;
    try {
      await fetch(`${API_URL}/servers/${id}`, { method: 'DELETE' });
      toast.success('تم الحذف'); fetchServers(); fetchStats();
    } catch (error) { toast.error('فشل الحذف'); }
  };

  const resetForm = () => {
    setFormData({ name: '', hostname: '', public_ip: '', private_ip: '', ssh_port: '22', server_type: 'vps', provider: '', location: '', os: '', cpu: '', ram: '', storage: '', username: '', password: '', status: 'active', notes: '' });
    setEditingServer(null);
  };

  const openEdit = (server) => {
    setEditingServer(server);
    setFormData({ ...server, password: '' });
    setShowModal(true);
  };

  const statusColors = { active: 'bg-green-100 text-green-700', maintenance: 'bg-yellow-100 text-yellow-700', inactive: 'bg-red-100 text-red-700' };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Toaster position="top-center" />
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">🖥️ إدارة السيرفرات</h1>
        <p className="text-gray-600">إدارة ومراقبة السيرفرات</p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
            <div className="text-sm opacity-90">إجمالي السيرفرات</div>
            <div className="text-3xl font-bold mt-2">{stats.total_servers}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
            <div className="text-sm opacity-90">نشط</div>
            <div className="text-3xl font-bold mt-2">{stats.active_servers}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-6 text-white">
            <div className="text-sm opacity-90">صيانة</div>
            <div className="text-3xl font-bold mt-2">{stats.maintenance_servers}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
            <div className="text-sm opacity-90">مقدمي الخدمة</div>
            <div className="text-3xl font-bold mt-2">{stats.total_providers}</div>
          </motion.div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex justify-between items-center">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2 border rounded-lg">
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="maintenance">صيانة</option>
          <option value="inactive">غير نشط</option>
        </select>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">+ إضافة سيرفر</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {servers.map((server) => (
          <motion.div key={server.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-lg shadow-md p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-lg">{server.name}</h3>
                <p className="text-sm text-gray-500">{server.provider} - {server.location}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${statusColors[server.status]}`}>{server.status}</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">IP:</span><span className="font-mono">{server.public_ip}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">OS:</span><span>{server.os}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">المواصفات:</span><span>{server.cpu} / {server.ram} / {server.storage}</span></div>
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-2 border-t">
              <button onClick={() => openEdit(server)} className="text-blue-600 text-sm">تعديل</button>
              <button onClick={() => handleDelete(server.id)} className="text-red-600 text-sm">حذف</button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6">{editingServer ? 'تعديل سيرفر' : 'إضافة سيرفر'}</h2>
              <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">الاسم *</label><input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Hostname</label><input type="text" value={formData.hostname} onChange={(e) => setFormData({...formData, hostname: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Public IP *</label><input type="text" required value={formData.public_ip} onChange={(e) => setFormData({...formData, public_ip: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Private IP</label><input type="text" value={formData.private_ip} onChange={(e) => setFormData({...formData, private_ip: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">SSH Port</label><input type="text" value={formData.ssh_port} onChange={(e) => setFormData({...formData, ssh_port: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">النوع</label><select value={formData.server_type} onChange={(e) => setFormData({...formData, server_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg"><option value="vps">VPS</option><option value="dedicated">Dedicated</option><option value="cloud">Cloud</option></select></div>
                <div><label className="block text-sm font-medium mb-1">المزود</label><input type="text" value={formData.provider} onChange={(e) => setFormData({...formData, provider: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">الموقع</label><input type="text" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">نظام التشغيل</label><input type="text" value={formData.os} onChange={(e) => setFormData({...formData, os: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">CPU</label><input type="text" value={formData.cpu} onChange={(e) => setFormData({...formData, cpu: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">RAM</label><input type="text" value={formData.ram} onChange={(e) => setFormData({...formData, ram: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Storage</label><input type="text" value={formData.storage} onChange={(e) => setFormData({...formData, storage: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Username</label><input type="text" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Password</label><input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder={editingServer ? 'اتركه فارغ' : ''} /></div>
                <div><label className="block text-sm font-medium mb-1">الحالة</label><select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg"><option value="active">نشط</option><option value="maintenance">صيانة</option><option value="inactive">غير نشط</option></select></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">ملاحظات</label><textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full px-3 py-2 border rounded-lg" rows="2" /></div>
                <div className="col-span-2 flex justify-end gap-4 mt-4">
                  <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-6 py-2 border rounded-lg">إلغاء</button>
                  <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg">{editingServer ? 'تحديث' : 'إضافة'}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Servers;
