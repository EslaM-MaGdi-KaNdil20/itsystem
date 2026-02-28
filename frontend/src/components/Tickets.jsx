import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiPlus, FiSearch, FiFilter, FiX, FiMessageSquare, FiUser,
  FiClock, FiAlertCircle, FiCheckCircle, FiLoader, FiEdit2,
  FiTrash2, FiUserCheck, FiSend, FiChevronDown, FiPhone, FiMail,
  FiMonitor, FiCalendar, FiFlag, FiTag, FiRefreshCw, FiShield,
  FiAlertTriangle, FiArrowUp
} from 'react-icons/fi';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';
import { toast } from 'react-hot-toast';

const Tickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [itUsers, setItUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    search: ''
  });
  const [newComment, setNewComment] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'general',
    priority: 'medium',
    requester_id: '',
    requester_name: '',
    requester_email: '',
    requester_phone: '',
    requester_department: '',
    device_id: ''
  });

  const categories = [
    { value: 'general', label: 'عام', icon: '📋' },
    { value: 'hardware', label: 'أجهزة', icon: '💻' },
    { value: 'software', label: 'برامج', icon: '💿' },
    { value: 'network', label: 'شبكات', icon: '🌐' },
    { value: 'email', label: 'بريد إلكتروني', icon: '📧' },
    { value: 'printer', label: 'طابعات', icon: '🖨️' },
    { value: 'access', label: 'صلاحيات', icon: '🔐' },
    { value: 'other', label: 'أخرى', icon: '📌' }
  ];

  const priorities = [
    { value: 'low', label: 'منخفضة', color: 'bg-gray-100 text-gray-700' },
    { value: 'medium', label: 'متوسطة', color: 'bg-blue-100 text-blue-700' },
    { value: 'high', label: 'عالية', color: 'bg-orange-100 text-orange-700' },
    { value: 'urgent', label: 'عاجلة', color: 'bg-red-100 text-red-700' }
  ];

  const statuses = [
    { value: 'new', label: 'جديد', color: 'bg-blue-100 text-blue-700', icon: FiAlertCircle },
    { value: 'in_progress', label: 'قيد التنفيذ', color: 'bg-yellow-100 text-yellow-700', icon: FiLoader },
    { value: 'resolved', label: 'تم الحل', color: 'bg-green-100 text-green-700', icon: FiCheckCircle },
    { value: 'closed', label: 'مغلق', color: 'bg-gray-100 text-gray-700', icon: FiCheckCircle }
  ];

  useEffect(() => {
    fetchTickets();
    fetchStats();
    fetchEmployees();
    fetchITUsers();
    fetchDevices();

    // Auto-refresh every 10 seconds
    const intervalId = setInterval(() => {
      fetchTickets();
      fetchStats();
    }, 10000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [filters]);

  const fetchTickets = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.category) params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);
      
      const data = await apiGet(`/tickets?${params}`);
      setTickets(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await apiGet('/tickets/stats');
      setStats(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await apiGet('/employees');
      setEmployees(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchITUsers = async () => {
    try {
      const data = await apiGet('/tickets/it-users');
      setItUsers(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchDevices = async () => {
    try {
      const data = await apiGet('/devices');
      setDevices(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchTicketDetails = async (id) => {
    try {
      console.log('Fetching ticket details for ID:', id);
      const data = await apiGet(`/tickets/${id}`);
      console.log('Ticket data received:', data);
      if (data) {
        setSelectedTicket(data);
        setShowDetailModal(true);
      } else {
        toast.error('لم يتم العثور على بيانات الطلب');
      }
    } catch (error) {
      console.error('Error fetching ticket:', error);
      toast.error('حدث خطأ في جلب تفاصيل الطلب');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode && selectedTicket) {
        await apiPut(`/tickets/${selectedTicket.id}`, formData);
      } else {
        await apiPost('/tickets', formData);
      }
      setShowModal(false);
      resetForm();
      fetchTickets();
      fetchStats();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;
    try {
      await apiDelete(`/tickets/${id}`);
      toast.success('تم حذف الطلب بنجاح');
      fetchTickets();
      fetchStats();
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ في حذف الطلب');
    }
  };

  const handleAssign = async (ticketId, userId, userName) => {
    try {
      await apiPut(`/tickets/${ticketId}/assign`, {
        assigned_to: userId,
        assigned_to_name: userName
      });
      toast.success(`تم إسناد الطلب إلى ${userName}`);
      fetchTickets();
      if (selectedTicket?.id === ticketId) {
        fetchTicketDetails(ticketId);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ في إسناد الطلب');
    }
  };

  const handleStatusChange = async (ticketId, newStatus, resolution = null) => {
    try {
      await apiPut(`/tickets/${ticketId}/status`, {
        status: newStatus,
        resolution
      });
      const statusLabels = { new: 'جديد', in_progress: 'قيد التنفيذ', resolved: 'تم الحل', closed: 'مغلق' };
      toast.success(`تم تغيير الحالة إلى: ${statusLabels[newStatus]}`);
      fetchTickets();
      fetchStats();
      if (selectedTicket?.id === ticketId) {
        fetchTicketDetails(ticketId);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ في تغيير الحالة');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await apiPost(`/tickets/${selectedTicket.id}/comments`, {
        comment: newComment
      });
      toast.success('تم إضافة التعليق');
      setNewComment('');
      fetchTicketDetails(selectedTicket.id);
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ في إضافة التعليق');
    }
  };

  const handleEmployeeSelect = (employeeId) => {
    const employee = employees.find(e => e.id === parseInt(employeeId));
    if (employee) {
      setFormData({
        ...formData,
        requester_id: employee.id,
        requester_name: employee.full_name,
        requester_email: employee.email,
        requester_phone: employee.phone,
        requester_department: employee.department_name || ''
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'general',
      priority: 'medium',
      requester_id: '',
      requester_name: '',
      requester_email: '',
      requester_phone: '',
      requester_department: '',
      device_id: ''
    });
    setEditMode(false);
    setSelectedTicket(null);
  };

  const openEditModal = (ticket) => {
    setFormData({
      title: ticket.title,
      description: ticket.description || '',
      category: ticket.category,
      priority: ticket.priority,
      requester_id: ticket.requester_id || '',
      requester_name: ticket.requester_name || '',
      requester_email: ticket.requester_email || '',
      requester_phone: ticket.requester_phone || '',
      requester_department: ticket.requester_department || '',
      device_id: ticket.device_id || ''
    });
    setSelectedTicket(ticket);
    setEditMode(true);
    setShowModal(true);
  };

  const getStatusInfo = (status) => statuses.find(s => s.value === status) || statuses[0];
  const getPriorityInfo = (priority) => priorities.find(p => p.value === priority) || priorities[1];
  const getCategoryInfo = (category) => categories.find(c => c.value === category) || categories[0];

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              نظام الطلبات
              <motion.span
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="flex items-center gap-1 text-xs font-normal bg-green-100 text-green-700 px-2 py-1 rounded-full"
              >
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Live
              </motion.span>
            </h1>
            <p className="text-gray-500 text-sm mt-1">إدارة ومتابعة طلبات الدعم الفني • تحديث تلقائي كل 10 ثواني</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05, rotate: 180 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { fetchTickets(); fetchStats(); }}
            className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors shadow-sm border border-blue-100"
            title="تحديث البيانات"
          >
            <FiRefreshCw className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FiAlertCircle className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.new_count}</p>
                <p className="text-xs text-gray-500">جديد</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <FiLoader className="text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.in_progress_count}</p>
                <p className="text-xs text-gray-500">قيد التنفيذ</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FiCheckCircle className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.resolved_count}</p>
                <p className="text-xs text-gray-500">تم الحل</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <FiFlag className="text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.urgent_open || 0}</p>
                <p className="text-xs text-gray-500">عاجل</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <FiCalendar className="text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.today_count}</p>
                <p className="text-xs text-gray-500">اليوم</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <FiTag className="text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                <p className="text-xs text-gray-500">الإجمالي</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="بحث برقم الطلب أو العنوان..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">كل الحالات</option>
            {statuses.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">كل الأولويات</option>
            {priorities.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>

          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">كل التصنيفات</option>
            {categories.map(c => (
              <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
            ))}
          </select>

          <button
            onClick={() => { fetchTickets(); fetchStats(); }}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <FiRefreshCw />
          </button>
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <FiLoader className="animate-spin text-4xl text-blue-500 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">جاري تحميل الطلبات...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiMessageSquare className="text-4xl text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">لا توجد طلبات</h3>
            <p className="text-gray-500">لم يتم العثور على أي طلبات مطابقة للبحث</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tickets.map((ticket, index) => {
              const statusInfo = getStatusInfo(ticket.status);
              const priorityInfo = getPriorityInfo(ticket.priority);
              const categoryInfo = getCategoryInfo(ticket.category);
              const StatusIcon = statusInfo.icon;

              return (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 overflow-hidden cursor-pointer"
                  onClick={() => fetchTicketDetails(ticket.id)}
                >
                  {/* Decorative Gradient Background (Subtle) */}
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-slate-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* Priority Strip (Right Side) */}
                  <div className={`absolute top-0 right-0 bottom-0 w-1.5 z-10 ${
                    ticket.priority === 'urgent' ? 'bg-gradient-to-b from-red-500 to-red-600 shadow-[0_0_10px_rgba(239,68,68,0.5)]' :
                    ticket.priority === 'high' ? 'bg-gradient-to-b from-orange-500 to-orange-600' :
                    ticket.priority === 'medium' ? 'bg-gradient-to-b from-blue-500 to-blue-600' : 
                    'bg-gradient-to-b from-gray-300 to-gray-400'
                  }`} />

                  <div className="p-5 pr-7 relative z-10">
                    {/* Header: Ticket # & Status */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                           <span className="font-mono font-bold text-slate-400 text-xs tracking-wider">#{ticket.ticket_number.split('-').pop()}</span>
                           <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${priorityInfo.color.replace('bg-', 'border-').replace('text-', 'text-')} bg-transparent`}>
                              {priorityInfo.label}
                           </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 leading-tight group-hover:text-blue-700 transition-colors">
                          {ticket.title}
                        </h3>
                      </div>
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm ${statusInfo.color}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                       <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-3 group-hover:bg-white group-hover:shadow-sm transition-all">
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-lg shadow-sm border border-slate-100">
                            {categoryInfo.icon}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 font-medium">التصنيف</span>
                            <span className="text-xs text-slate-700 font-bold">{categoryInfo.label}</span>
                          </div>
                       </div>
                       
                       <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-3 group-hover:bg-white group-hover:shadow-sm transition-all">
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-100 text-blue-500">
                            <FiUser />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 font-medium">مقدم الطلب</span>
                            <span className="text-xs text-slate-700 font-bold truncate max-w-[80px]">{ticket.requester_name || 'غير محدد'}</span>
                          </div>
                       </div>
                    </div>

                    {/* SLA Indicator */}
                    {ticket.sla_policy_id && ticket.status !== 'resolved' && ticket.status !== 'closed' && (() => {
                      const isResponseBreached = ticket.response_breached;
                      const isResolutionBreached = ticket.resolution_breached;
                      const responseLeft = ticket.response_minutes_left;
                      const resolutionLeft = ticket.resolution_minutes_left;
                      const isEscalated = ticket.escalated;
                      
                      if (isResponseBreached || isResolutionBreached) {
                        return (
                          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 mb-2">
                            <FiAlertTriangle className="text-red-500 w-3.5 h-3.5 shrink-0" />
                            <span className="text-[10px] font-bold text-red-600">
                              تجاوز SLA {isResponseBreached && !ticket.first_response_at ? '(استجابة)' : '(حل)'}
                            </span>
                            {isEscalated && <span className="text-[10px] font-bold text-amber-600 mr-1">⬆ تم التصعيد</span>}
                          </div>
                        );
                      }
                      
                      const minLeft = responseLeft != null && !ticket.first_response_at ? responseLeft : resolutionLeft;
                      if (minLeft != null && minLeft > 0 && minLeft <= 30) {
                        return (
                          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mb-2">
                            <FiClock className="text-amber-500 w-3.5 h-3.5 shrink-0 animate-pulse" />
                            <span className="text-[10px] font-bold text-amber-600">
                              متبقي {Math.round(minLeft)} دقيقة {!ticket.first_response_at && responseLeft != null ? 'للاستجابة' : 'للحل'}
                            </span>
                          </div>
                        );
                      }
                      
                      return null;
                    })()}

                    {/* Footer: Date & Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100/80 mt-2">
                       <div className="flex items-center gap-4">
                          {/* Assignee Mini Badge */}
                          {ticket.assigned_to_name ? (
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-blue-50/50 pr-1 pl-2.5 py-1 rounded-full border border-blue-100 max-w-[140px]">
                               <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-[9px] shadow-sm">
                                  {ticket.assigned_to_name.charAt(0)}
                               </div>
                               <span className="truncate">{ticket.assigned_to_name}</span>
                            </div>
                          ) : (
                             <span className="text-xs text-slate-400 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md">
                               <FiUserCheck className="w-3 h-3" /> غير مسند
                             </span>
                          )}
                          
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                             <FiClock className="w-3 h-3" /> {formatDate(ticket.created_at)}
                          </span>
                       </div>

                       <button
                        onClick={(e) => {
                          e.stopPropagation();
                          fetchTicketDetails(ticket.id);
                        }}
                        className="
                           flex items-center gap-1.5 px-4 py-1.5
                           bg-slate-900 text-white text-xs font-bold rounded-lg
                           hover:bg-blue-600 transition-all duration-300
                           shadow-md hover:shadow-lg hover:shadow-blue-500/20
                           transform hover:-translate-y-0.5
                           group-hover:translate-x-0
                        "
                      >
                        عرض و تحكم <FiEdit2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-800">
                    {editMode ? 'تعديل الطلب' : 'طلب جديد'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <FiX />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    عنوان الطلب <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="مثال: الكمبيوتر لا يعمل"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    وصف المشكلة
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="اشرح المشكلة بالتفصيل..."
                  />
                </div>

                {/* Category & Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">التصنيف</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {categories.map(c => (
                        <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الأولوية</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {priorities.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Requester Selection */}
                <div className="border-t border-gray-100 pt-4">
                  <h3 className="font-medium text-gray-800 mb-3">بيانات مقدم الطلب</h3>
                  
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">اختيار موظف</label>
                    <select
                      value={formData.requester_id}
                      onChange={(e) => handleEmployeeSelect(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- اختر موظف أو أدخل البيانات يدوياً --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.full_name} - {emp.department_name || 'بدون قسم'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label>
                      <input
                        type="text"
                        value={formData.requester_name}
                        onChange={(e) => setFormData({ ...formData, requester_name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">القسم</label>
                      <input
                        type="text"
                        value={formData.requester_department}
                        onChange={(e) => setFormData({ ...formData, requester_department: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                      <input
                        type="email"
                        value={formData.requester_email}
                        onChange={(e) => setFormData({ ...formData, requester_email: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                      <input
                        type="tel"
                        value={formData.requester_phone}
                        onChange={(e) => setFormData({ ...formData, requester_phone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Device Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الجهاز المرتبط (اختياري)</label>
                  <select
                    value={formData.device_id}
                    onChange={(e) => setFormData({ ...formData, device_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- بدون جهاز --</option>
                    {devices.map(device => (
                      <option key={device.id} value={device.id}>
                        {device.name} - {device.serial_number}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Submit */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editMode ? 'حفظ التعديلات' : 'إنشاء الطلب'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ticket Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedTicket && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-gray-500">{selectedTicket.ticket_number}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${getStatusInfo(selectedTicket.status).color}`}>
                        {getStatusInfo(selectedTicket.status).label}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs ${getPriorityInfo(selectedTicket.priority).color}`}>
                        {getPriorityInfo(selectedTicket.priority).label}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">{selectedTicket.title}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(selectedTicket.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors text-sm font-semibold border border-red-200 hover:border-red-300"
                      title="حذف الطلب نهائياً"
                    >
                      <FiTrash2 className="w-4 h-4" />
                      <span>حذف الطلب</span>
                    </button>
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                      title="إغلاق"
                    >
                      <FiX className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 grid grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="col-span-2 space-y-6">
                  {/* Description */}
                  <div>
                    <h3 className="font-medium text-gray-800 mb-2">الوصف</h3>
                    <p className="text-gray-600 bg-gray-50 rounded-lg p-4">
                      {selectedTicket.description || 'لا يوجد وصف'}
                    </p>
                  </div>

                  {/* Resolution */}
                  {selectedTicket.resolution && (
                    <div>
                      <h3 className="font-medium text-gray-800 mb-2">الحل</h3>
                      <p className="text-gray-600 bg-green-50 rounded-lg p-4 border border-green-100">
                        {selectedTicket.resolution}
                      </p>
                    </div>
                  )}

                  {/* Status Actions */}
                  <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                    <h3 className="font-bold text-gray-800 mb-3 text-lg">⚡ تغيير حالة الطلب</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {statuses.map(s => {
                        const StatusIcon = s.icon;
                        return (
                          <button
                            key={s.value}
                            onClick={() => handleStatusChange(selectedTicket.id, s.value)}
                            disabled={selectedTicket.status === s.value}
                            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                              selectedTicket.status === s.value
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : `${s.color} hover:scale-105 hover:shadow-md cursor-pointer`
                            }`}
                          >
                            <StatusIcon className="w-4 h-4" />
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Comments */}
                  <div>
                    <h3 className="font-medium text-gray-800 mb-3">التعليقات</h3>
                    <div className="space-y-3 mb-4">
                      {selectedTicket.comments?.length > 0 ? (
                        selectedTicket.comments.map((comment) => (
                          <div
                            key={comment.id}
                            className="bg-gray-50 rounded-lg p-3"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-800">{comment.user_name}</span>
                              <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                            </div>
                            <p className="text-gray-600 text-sm">{comment.comment}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-400 text-sm">لا توجد تعليقات</p>
                      )}
                    </div>

                    {/* Add Comment */}
                    <div className="flex gap-2 bg-gray-50 p-3 rounded-lg border-2 border-gray-200">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="💬 اكتب تعليقك هنا..."
                        className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                      />
                      <button
                        onClick={handleAddComment}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                        title="إرسال التعليق"
                      >
                        <FiSend className="w-4 h-4" />
                        <span>إرسال</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  {/* Requester Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-800 mb-3">مقدم الطلب</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <FiUser className="text-gray-400" />
                        <span>{selectedTicket.requester_name || 'غير محدد'}</span>
                      </div>
                      {selectedTicket.requester_department && (
                        <div className="flex items-center gap-2">
                          <FiTag className="text-gray-400" />
                          <span>{selectedTicket.requester_department}</span>
                        </div>
                      )}
                      {selectedTicket.requester_email && (
                        <div className="flex items-center gap-2">
                          <FiMail className="text-gray-400" />
                          <span>{selectedTicket.requester_email}</span>
                        </div>
                      )}
                      {selectedTicket.requester_phone && (
                        <div className="flex items-center gap-2">
                          <FiPhone className="text-gray-400" />
                          <span>{selectedTicket.requester_phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Assignment */}
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                    <h4 className="font-bold text-gray-800 mb-3 text-base flex items-center gap-2">
                      <FiUserCheck className="w-5 h-5 text-blue-600" />
                      👤 إسناد الطلب
                    </h4>
                    <select
                      value={selectedTicket.assigned_to || ''}
                      onChange={(e) => {
                        const user = itUsers.find(u => u.id === parseInt(e.target.value));
                        if (user) {
                          handleAssign(selectedTicket.id, user.id, user.full_name);
                        }
                      }}
                      className="w-full px-3 py-2.5 border-2 border-blue-300 rounded-lg text-sm font-medium bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="">-- اختر موظف IT --</option>
                      {itUsers.map(user => (
                        <option key={user.id} value={user.id}>{user.full_name}</option>
                      ))}
                    </select>
                    {selectedTicket.assigned_to_name && (
                      <div className="mt-3 p-2 bg-white rounded border border-blue-200">
                        <p className="text-sm text-gray-600">
                          معين لـ: <strong className="text-blue-600">{selectedTicket.assigned_to_name}</strong>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Device */}
                  {selectedTicket.device_name && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-800 mb-3">الجهاز</h4>
                      <div className="flex items-center gap-2 text-sm">
                        <FiMonitor className="text-gray-400" />
                        <span>{selectedTicket.device_name}</span>
                      </div>
                      {selectedTicket.device_serial && (
                        <p className="text-xs text-gray-500 mt-1">
                          S/N: {selectedTicket.device_serial}
                        </p>
                      )}
                    </div>
                  )}

                  {/* SLA Status */}
                  {selectedTicket.sla_policy_id && (
                    <div className={`rounded-lg p-4 border ${selectedTicket.response_breached || selectedTicket.resolution_breached ? 'bg-red-50 border-red-200' : selectedTicket.escalated ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                      <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                        <FiShield className="text-indigo-500" /> حالة SLA
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">وقت الاستجابة:</span>
                          {selectedTicket.first_response_at ? (
                            <span className={`font-bold ${selectedTicket.response_breached ? 'text-red-600' : 'text-emerald-600'}`}>
                              {selectedTicket.response_breached ? '❌ تم التجاوز' : '✅ في الوقت'}
                            </span>
                          ) : selectedTicket.response_deadline ? (
                            <span className={`font-bold ${new Date(selectedTicket.response_deadline) < new Date() ? 'text-red-600' : 'text-amber-600'}`}>
                              {new Date(selectedTicket.response_deadline) < new Date() ? '❌ منتهي' : `⏰ ${new Date(selectedTicket.response_deadline).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`}
                            </span>
                          ) : <span>—</span>}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">وقت الحل:</span>
                          {selectedTicket.status === 'resolved' || selectedTicket.status === 'closed' ? (
                            <span className={`font-bold ${selectedTicket.resolution_breached ? 'text-red-600' : 'text-emerald-600'}`}>
                              {selectedTicket.resolution_breached ? '❌ تم التجاوز' : '✅ في الوقت'}
                            </span>
                          ) : selectedTicket.resolution_deadline ? (
                            <span className={`font-bold ${new Date(selectedTicket.resolution_deadline) < new Date() ? 'text-red-600' : 'text-blue-600'}`}>
                              {new Date(selectedTicket.resolution_deadline) < new Date() ? '❌ منتهي' : `⏰ ${new Date(selectedTicket.resolution_deadline).toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                            </span>
                          ) : <span>—</span>}
                        </div>
                        {selectedTicket.escalated && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">التصعيد:</span>
                            <span className="font-bold text-amber-600">⬆ تم التصعيد</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-800 mb-3">التواريخ</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">تم الإنشاء:</span>
                        <span>{formatDate(selectedTicket.created_at)}</span>
                      </div>
                      {selectedTicket.first_response_at && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">أول استجابة:</span>
                          <span>{formatDate(selectedTicket.first_response_at)}</span>
                        </div>
                      )}
                      {selectedTicket.resolved_at && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">تم الحل:</span>
                          <span>{formatDate(selectedTicket.resolved_at)}</span>
                        </div>
                      )}
                      {selectedTicket.closed_at && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">تم الإغلاق:</span>
                          <span>{formatDate(selectedTicket.closed_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tickets;
