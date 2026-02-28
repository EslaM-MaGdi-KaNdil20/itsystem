import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';

const API_URL = `${window.location.protocol}//${window.location.hostname}:3000/api`;

const NetworkIPs = () => {
  const [ips, setIPs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingIP, setEditingIP] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');

  const [formData, setFormData] = useState({
    ip_address: '', subnet_mask: '255.255.255.0', gateway: '', vlan: '', mac_address: '',
    device_type: '', assigned_to: '', location: '', status: 'available', notes: ''
  });

  const fetchIPs = async () => {
    try {
      const params = filterStatus ? `?status=${filterStatus}` : '';
      const response = await fetch(`${API_URL}/network-ips${params}`);
      setIPs(await response.json());
    } catch (error) { toast.error('فشل في التحميل'); }
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/network-ips/stats`);
      setStats(await response.json());
    } catch (error) { console.error(error); }
  };

  useEffect(() => { fetchIPs(); fetchStats(); }, [filterStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingIP ? `${API_URL}/network-ips/${editingIP.id}` : `${API_URL}/network-ips`;
      const response = await fetch(url, {
        method: editingIP ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        toast.success(editingIP ? 'تم التحديث' : 'تم الإضافة');
        setShowModal(false); resetForm(); fetchIPs(); fetchStats();
      }
    } catch (error) { toast.error('حدث خطأ'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('حذف الـ IP؟')) return;
    try {
      await fetch(`${API_URL}/network-ips/${id}`, { method: 'DELETE' });
      toast.success('تم الحذف'); fetchIPs(); fetchStats();
    } catch (error) { toast.error('فشل الحذف'); }
  };

  const resetForm = () => {
    setFormData({ ip_address: '', subnet_mask: '255.255.255.0', gateway: '', vlan: '', mac_address: '', device_type: '', assigned_to: '', location: '', status: 'available', notes: '' });
    setEditingIP(null);
  };

  const openEdit = (ip) => { setEditingIP(ip); setFormData({ ...ip }); setShowModal(true); };

  const statusColors = { available: 'bg-green-100 text-green-700', assigned: 'bg-blue-100 text-blue-700', reserved: 'bg-yellow-100 text-yellow-700', blocked: 'bg-red-100 text-red-700' };
  const statusLabels = { available: 'متاح', assigned: 'مخصص', reserved: 'محجوز', blocked: 'محظور' };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Toaster position="top-center" />
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">🌐 إدارة عناوين IP</h1>
        <p className="text-gray-600">إدارة وتخصيص عناوين الشبكة</p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
            <div className="text-sm opacity-90">إجمالي IPs</div>
            <div className="text-3xl font-bold mt-2">{stats.total_ips}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
            <div className="text-sm opacity-90">متاح</div>
            <div className="text-3xl font-bold mt-2">{stats.available_ips}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
            <div className="text-sm opacity-90">مخصص</div>
            <div className="text-3xl font-bold mt-2">{stats.assigned_ips}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-6 text-white">
            <div className="text-sm opacity-90">محجوز</div>
            <div className="text-3xl font-bold mt-2">{stats.reserved_ips}</div>
          </motion.div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex justify-between items-center">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2 border rounded-lg">
          <option value="">كل الحالات</option>
          <option value="available">متاح</option>
          <option value="assigned">مخصص</option>
          <option value="reserved">محجوز</option>
          <option value="blocked">محظور</option>
        </select>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">+ إضافة IP</button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">IP Address</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">VLAN</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">مخصص لـ</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الموقع</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {ips.map((ip) => (
              <tr key={ip.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-mono text-sm">{ip.ip_address}</td>
                <td className="px-6 py-4 text-sm">{ip.vlan || '-'}</td>
                <td className="px-6 py-4 text-sm">{ip.assigned_to || '-'}</td>
                <td className="px-6 py-4 text-sm">{ip.location || '-'}</td>
                <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs ${statusColors[ip.status]}`}>{statusLabels[ip.status]}</span></td>
                <td className="px-6 py-4 text-sm">
                  <button onClick={() => openEdit(ip)} className="text-blue-600 mr-3">تعديل</button>
                  <button onClick={() => handleDelete(ip.id)} className="text-red-600">حذف</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg p-6 max-w-lg w-full">
              <h2 className="text-2xl font-bold mb-6">{editingIP ? 'تعديل IP' : 'إضافة IP'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1">IP Address *</label><input type="text" required value={formData.ip_address} onChange={(e) => setFormData({...formData, ip_address: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="192.168.1.1" /></div>
                  <div><label className="block text-sm font-medium mb-1">Subnet Mask</label><input type="text" value={formData.subnet_mask} onChange={(e) => setFormData({...formData, subnet_mask: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                  <div><label className="block text-sm font-medium mb-1">Gateway</label><input type="text" value={formData.gateway} onChange={(e) => setFormData({...formData, gateway: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                  <div><label className="block text-sm font-medium mb-1">VLAN</label><input type="text" value={formData.vlan} onChange={(e) => setFormData({...formData, vlan: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                  <div><label className="block text-sm font-medium mb-1">MAC Address</label><input type="text" value={formData.mac_address} onChange={(e) => setFormData({...formData, mac_address: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                  <div><label className="block text-sm font-medium mb-1">نوع الجهاز</label><input type="text" value={formData.device_type} onChange={(e) => setFormData({...formData, device_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                  <div><label className="block text-sm font-medium mb-1">مخصص لـ</label><input type="text" value={formData.assigned_to} onChange={(e) => setFormData({...formData, assigned_to: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                  <div><label className="block text-sm font-medium mb-1">الموقع</label><input type="text" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                  <div className="col-span-2"><label className="block text-sm font-medium mb-1">الحالة</label><select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg"><option value="available">متاح</option><option value="assigned">مخصص</option><option value="reserved">محجوز</option><option value="blocked">محظور</option></select></div>
                </div>
                <div><label className="block text-sm font-medium mb-1">ملاحظات</label><textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full px-3 py-2 border rounded-lg" rows="2" /></div>
                <div className="flex justify-end gap-4 mt-6">
                  <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-6 py-2 border rounded-lg">إلغاء</button>
                  <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg">{editingIP ? 'تحديث' : 'إضافة'}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NetworkIPs;
