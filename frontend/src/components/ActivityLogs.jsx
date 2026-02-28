import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiGet } from '../utils/api';

// Icons
const Icons = {
  Activity: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  Filter: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  Search: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  User: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Clock: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Plus: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>,
  Edit: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>,
  Eye: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>,
  Download: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>,
  Upload: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>,
  Login: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>,
  Link: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  Unlink: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18.84 12.25 1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71"/><path d="m5.17 11.75-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71"/><line x1="8" x2="8" y1="2" y2="5"/><line x1="2" x2="5" y1="8" y2="8"/><line x1="16" x2="16" y1="19" y2="22"/><line x1="19" x2="22" y1="16" y2="16"/></svg>,
  ChevronLeft: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>,
  ChevronRight: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>,
  Refresh: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>,
  BarChart: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg>,
};

// Action translations
const actionLabels = {
  create: 'إنشاء',
  update: 'تعديل',
  delete: 'حذف',
  view: 'عرض',
  export: 'تصدير',
  import: 'استيراد',
  login: 'تسجيل دخول',
  logout: 'تسجيل خروج',
  assign: 'تسليم',
  unassign: 'استلام'
};

// Entity translations
const entityLabels = {
  device: 'جهاز',
  employee: 'موظف',
  department: 'قسم',
  maintenance: 'صيانة',
  subscription: 'اشتراك',
  server: 'خادم',
  product: 'منتج',
  inventory: 'مخزون',
  password: 'كلمة مرور',
  network_ip: 'عنوان IP',
  email_account: 'حساب بريد',
  user: 'مستخدم',
  assignment: 'عهدة',
  accessory: 'ملحق'
};

// Action icons and colors
const actionStyles = {
  create: { icon: Icons.Plus, color: 'bg-emerald-100 text-emerald-600', badgeColor: 'bg-emerald-500' },
  update: { icon: Icons.Edit, color: 'bg-blue-100 text-blue-600', badgeColor: 'bg-blue-500' },
  delete: { icon: Icons.Trash, color: 'bg-red-100 text-red-600', badgeColor: 'bg-red-500' },
  view: { icon: Icons.Eye, color: 'bg-gray-100 text-gray-600', badgeColor: 'bg-gray-500' },
  export: { icon: Icons.Download, color: 'bg-violet-100 text-violet-600', badgeColor: 'bg-violet-500' },
  import: { icon: Icons.Upload, color: 'bg-amber-100 text-amber-600', badgeColor: 'bg-amber-500' },
  login: { icon: Icons.Login, color: 'bg-indigo-100 text-indigo-600', badgeColor: 'bg-indigo-500' },
  logout: { icon: Icons.Login, color: 'bg-gray-100 text-gray-600', badgeColor: 'bg-gray-500' },
  assign: { icon: Icons.Link, color: 'bg-teal-100 text-teal-600', badgeColor: 'bg-teal-500' },
  unassign: { icon: Icons.Unlink, color: 'bg-orange-100 text-orange-600', badgeColor: 'bg-orange-500' }
};

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalItems: 0 });
  const [stats, setStats] = useState(null);
  const [showStats, setShowStats] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    action: '',
    entity_type: '',
    start_date: '',
    end_date: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [pagination.page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 30,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      });
      
      const data = await apiGet(`/activity-logs?${params}`);
      setLogs(data.logs || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, totalItems: 0 });
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await apiGet('/activity-logs/stats?days=30');
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleFilter = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchLogs();
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      action: '',
      entity_type: '',
      start_date: '',
      end_date: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
    setTimeout(fetchLogs, 100);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    if (days < 7) return `منذ ${days} يوم`;
    return formatDate(dateString);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
              <Icons.Activity />
            </div>
            سجل النشاطات
          </h1>
          <p className="text-gray-500 mt-1">متابعة جميع التعديلات والإجراءات في النظام</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setShowStats(!showStats)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
              showStats ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
            }`}
          >
            <Icons.BarChart />
            الإحصائيات
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
              showFilters ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
            }`}
          >
            <Icons.Filter />
            فلترة
          </button>
          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-xl border border-gray-200 hover:border-indigo-300 transition-all"
          >
            <Icons.Refresh />
            تحديث
          </button>
        </div>
      </div>

      {/* Stats Section */}
      <AnimatePresence>
        {showStats && stats && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            <StatCard 
              title="إجمالي النشاطات" 
              value={pagination.totalItems} 
              color="indigo"
            />
            <StatCard 
              title="عمليات الإنشاء" 
              value={stats.actionStats?.find(a => a.action === 'create')?.count || 0} 
              color="emerald"
            />
            <StatCard 
              title="عمليات التعديل" 
              value={stats.actionStats?.find(a => a.action === 'update')?.count || 0} 
              color="blue"
            />
            <StatCard 
              title="عمليات الحذف" 
              value={stats.actionStats?.find(a => a.action === 'delete')?.count || 0} 
              color="red"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters Section */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm"
          >
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">بحث</label>
                <div className="relative">
                  <input
                    type="text"
                    value={filters.search}
                    onChange={e => setFilters({ ...filters, search: e.target.value })}
                    placeholder="اسم المستخدم أو التفاصيل..."
                    className="w-full px-4 py-2 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <Icons.Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نوع العملية</label>
                <select
                  value={filters.action}
                  onChange={e => setFilters({ ...filters, action: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">الكل</option>
                  {Object.entries(actionLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نوع العنصر</label>
                <select
                  value={filters.entity_type}
                  onChange={e => setFilters({ ...filters, entity_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">الكل</option>
                  {Object.entries(entityLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">من تاريخ</label>
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={e => setFilters({ ...filters, start_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">إلى تاريخ</label>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={e => setFilters({ ...filters, end_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleFilter}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
              >
                تطبيق الفلتر
              </button>
              <button
                onClick={clearFilters}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
              >
                مسح الفلتر
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Activity List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Icons.Activity className="mx-auto mb-4 opacity-50" />
            <p>لا توجد نشاطات مسجلة</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map((log, index) => {
              const style = actionStyles[log.action] || actionStyles.view;
              const ActionIcon = style.icon;
              
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`p-2.5 rounded-xl ${style.color}`}>
                      <ActionIcon />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900">{log.user_name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs text-white ${style.badgeColor}`}>
                          {actionLabels[log.action] || log.action}
                        </span>
                        <span className="text-gray-600">
                          {entityLabels[log.entity_type] || log.entity_type}
                        </span>
                        {log.entity_name && (
                          <span className="font-medium text-indigo-600">"{log.entity_name}"</span>
                        )}
                      </div>
                      
                      {log.details && (
                        <p className="text-sm text-gray-500 mt-1">{log.details}</p>
                      )}
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Icons.Clock />
                          {getRelativeTime(log.created_at)}
                        </span>
                        {log.ip_address && (
                          <span>IP: {log.ip_address}</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Timestamp */}
                    <div className="text-left text-sm text-gray-400 whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
        
        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <div className="text-sm text-gray-500">
              صفحة {pagination.page} من {pagination.totalPages} ({pagination.totalItems} سجل)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.page === 1}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <Icons.ChevronRight />
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <Icons.ChevronLeft />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const StatCard = ({ title, value, color }) => {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
  };
  
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
      <div className={`text-sm font-medium px-2 py-1 rounded-lg inline-block ${colors[color]}`}>
        {title}
      </div>
    </div>
  );
};
