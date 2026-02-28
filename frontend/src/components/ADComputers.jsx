import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import { API_URL, getAuthHeaders, handleAuthError } from '../utils/api';

const ADComputers = () => {
  const [computers, setComputers] = useState([]);
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedComputer, setSelectedComputer] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [detailsLoading, setDetailsLoading] = useState(false);

  const authFetch = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: { ...getAuthHeaders(), ...(options.headers || {}) }
    });
    await handleAuthError(response);
    return response;
  };

  const downloadAgentScript = async (type = 'agent') => {
    try {
      const endpoint = type === 'gpo' ? 'gpo-script' : 'collector-script';
      const filename = type === 'gpo' ? 'IT-Agent-Install.bat' : 'IT-Agent.ps1';
      const response = await authFetch(`${API_URL}/ad/computers/${endpoint}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast.success(`تم تحميل ${filename}`, { icon: '📥' });
      } else {
        toast.error('فشل في التحميل');
      }
    } catch (error) {
      toast.error('خطأ في التحميل');
    }
  };

  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [showKeysModal, setShowKeysModal] = useState(false);
  const [agentKeys, setAgentKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState(null);
  const [keysLoading, setKeysLoading] = useState(false);

  const loadAgentKeys = async () => {
    setKeysLoading(true);
    try {
      const res = await authFetch(`${API_URL}/agent/keys`);
      if (res.ok) setAgentKeys(await res.json());
    } catch { toast.error('فشل تحميل المفاتيح'); }
    finally { setKeysLoading(false); }
  };

  const createAgentKey = async () => {
    if (!newKeyName.trim()) return toast.error('أدخل اسماً للـ Key');
    try {
      const res = await authFetch(`${API_URL}/agent/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedKey(data.key);
        setNewKeyName('');
        loadAgentKeys();
        toast.success('تم إنشاء API Key', { icon: '🔑' });
      }
    } catch { toast.error('حدث خطأ'); }
  };

  const revokeAgentKey = async (id) => {
    try {
      const res = await authFetch(`${API_URL}/agent/keys/${id}/revoke`, { method: 'PATCH' });
      if (res.ok) { loadAgentKeys(); toast.success('تم إلغاء تفعيل الـ Key'); }
    } catch { toast.error('حدث خطأ'); }
  };

  const deleteAgentKey = async (id) => {
    if (!confirm('حذف هذا الـ Key نهائياً؟')) return;
    try {
      const res = await authFetch(`${API_URL}/agent/keys/${id}`, { method: 'DELETE' });
      if (res.ok) { loadAgentKeys(); toast.success('تم حذف الـ Key'); }
    } catch { toast.error('حدث خطأ'); }
  };

  const downloadSetupScript = async () => {
    if (!generatedKey) return toast.error('أنشئ API Key أولاً');
    try {
      const serverUrl = window.location.origin.replace('5173', '3000');
      const res = await authFetch(`${API_URL}/agent/setup?key=${encodeURIComponent(generatedKey)}&server=${encodeURIComponent(serverUrl)}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'IT-Agent-Setup.ps1';
        document.body.appendChild(a); a.click(); a.remove();
        window.URL.revokeObjectURL(url);
        toast.success('تم تحميل IT-Agent-Setup.ps1', { icon: '📥' });
      }
    } catch { toast.error('فشل التحميل'); }
  };

  const fetchComputers = async () => {
    setLoading(true);
    try {
      const response = await authFetch(`${API_URL}/ad/computers/fetch`);
      if (response.ok) {
        const data = await response.json();
        setComputers(data.computers || []);
        setStats(data.stats || null);
        toast.success(`تم تحديث ${data.computers?.length || 0} جهاز من AD`, { icon: '🔄' });
      } else {
        const err = await response.json();
        toast.error(err.error || 'فشل في سحب الكمبيوترات');
      }
    } catch (error) {
      toast.error('فشل في الاتصال بالـ AD');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API_URL}/employees`);
      if (response.ok) setEmployees(await response.json());
    } catch (error) { console.error(error); }
  };

  const fetchDetails = async (name) => {
    setDetailsLoading(true);
    try {
      const response = await authFetch(`${API_URL}/ad/computers/${encodeURIComponent(name)}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedComputer(data);
        setShowDetailsModal(true);
      } else {
        toast.error('فشل في جلب التفاصيل');
      }
    } catch (error) {
      toast.error('خطأ في الاتصال');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!assignTarget) return;
    try {
      const response = await authFetch(`${API_URL}/ad/computers/assign`, {
        method: 'POST',
        body: JSON.stringify({
          computer_name: assignTarget.name,
          employee_id: assignEmployeeId || null
        })
      });
      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        setShowAssignModal(false);
        setAssignTarget(null);
        setAssignEmployeeId('');
        fetchCachedComputers();
      } else {
        toast.error('فشل في الربط');
      }
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const fetchCachedComputers = async () => {
    setLoading(true);
    try {
      const response = await authFetch(`${API_URL}/ad/computers`);
      if (response.ok) {
        const data = await response.json();
        if (data.computers?.length > 0) {
          setComputers(data.computers);
          setStats(data.stats || null);
        }
      }
    } catch (error) {
      console.error('Failed to load cached computers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCachedComputers();
    fetchEmployees();
  }, []);

  // Filter
  const filtered = computers.filter(c => {
    const matchSearch = !search || 
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.dns_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.os || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.ou || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.managed_by?.displayName || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.assigned_user?.employee_name || '').toLowerCase().includes(search.toLowerCase());
    
    const matchType = typeFilter === 'all' || c.type === typeFilter;
    const matchStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && c.is_active) ||
      (statusFilter === 'inactive' && !c.is_active) ||
      (statusFilter === 'enabled' && c.is_enabled) ||
      (statusFilter === 'disabled' && !c.is_enabled);
    
    return matchSearch && matchType && matchStatus;
  });

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatDateTime = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const typeLabels = { workstation: 'محطة عمل', server: 'سيرفر', domain_controller: 'Domain Controller', lab: 'معمل', other: 'أخرى' };
  const typeColors = { workstation: 'bg-blue-100 text-blue-700', server: 'bg-purple-100 text-purple-700', domain_controller: 'bg-amber-100 text-amber-700', lab: 'bg-teal-100 text-teal-700', other: 'bg-slate-100 text-slate-600' };
  const typeIcons = { workstation: '🖥️', server: '🗄️', domain_controller: '🏰', lab: '🔬', other: '📟' };

  return (
    <div className="p-6 max-w-[1600px] mx-auto" dir="rtl">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            أجهزة الكمبيوتر - Active Directory
          </h1>
          <p className="text-slate-500 text-sm mt-1">عرض وإدارة جميع أجهزة الكمبيوتر المسجلة في الـ AD</p>
        </div>
        <div className="flex items-center gap-3">
          {stats?.last_sync && (
            <span className="text-xs text-slate-400 hidden md:block">
              آخر تحديث: {new Date(stats.last_sync).toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {/* Agent Download Dropdown */}
          <div className="relative">
            <button onClick={() => setShowAgentMenu(!showAgentMenu)}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/40 transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Agent
              <svg className={`w-4 h-4 transition-transform ${showAgentMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showAgentMenu && (
              <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                <button onClick={() => { downloadAgentScript('agent'); setShowAgentMenu(false); }}
                  className="w-full px-4 py-3 text-right hover:bg-emerald-50 flex items-center gap-3 transition-colors border-b border-slate-100">
                  <span className="text-2xl">📄</span>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">IT-Agent.ps1</p>
                    <p className="text-xs text-slate-500">سكريبت بسيط - شغله يدوياً</p>
                  </div>
                </button>
                <button onClick={() => { downloadAgentScript('gpo'); setShowAgentMenu(false); }}
                  className="w-full px-4 py-3 text-right hover:bg-emerald-50 flex items-center gap-3 transition-colors">
                  <span className="text-2xl">⚙️</span>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">IT-Agent-Install.bat</p>
                    <p className="text-xs text-slate-500">للنشر عبر GPO أو SCCM</p>
                  </div>
                </button>
                <div className="border-t border-slate-200"/>
                <button onClick={() => { setShowAgentMenu(false); setGeneratedKey(null); loadAgentKeys(); setShowKeysModal(true); }}
                  className="w-full px-4 py-3 text-right hover:bg-indigo-50 flex items-center gap-3 transition-colors">
                  <span className="text-2xl">🔑</span>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">إدارة API Keys</p>
                    <p className="text-xs text-slate-500">مفاتيح دائمة للـ Agent</p>
                  </div>
                </button>
              </div>
            )}
          </div>
          <button onClick={fetchComputers} disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/40 transition-all disabled:opacity-50">
            {loading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            )}
            {loading ? 'جاري التحديث...' : 'تحديث من AD'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'إجمالي', value: stats.total, color: 'from-slate-500 to-slate-600', icon: '🖥️' },
            { label: 'نشط', value: stats.active, color: 'from-emerald-500 to-green-600', icon: '🟢' },
            { label: 'غير نشط', value: stats.inactive, color: 'from-red-500 to-rose-600', icon: '🔴' },
            { label: 'محطة عمل', value: stats.workstations, color: 'from-blue-500 to-indigo-600', icon: '💻' },
            { label: 'سيرفر', value: stats.servers, color: 'from-purple-500 to-violet-600', icon: '🗄️' },
            { label: 'DC', value: stats.domain_controllers, color: 'from-amber-500 to-orange-600', icon: '🏰' },
            { label: 'بمواصفات', value: stats.specs_count || 0, color: 'from-teal-500 to-cyan-600', icon: '⚙️' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{s.icon}</span>
                <span className={`text-2xl font-bold bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.value}</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">{s.label}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* OS Breakdown */}
      {stats?.os_breakdown && Object.keys(stats.os_breakdown).length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 mb-6">
          <h3 className="text-sm font-bold text-slate-700 mb-3">أنظمة التشغيل</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.os_breakdown).sort((a, b) => b[1] - a[1]).map(([os, count]) => (
              <span key={os} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg text-xs font-medium text-slate-700 border border-slate-200">
                {os.includes('Server') ? '🗄️' : os.includes('10') ? '🪟' : os.includes('11') ? '🪟' : '💻'}
                <span>{os}</span>
                <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md text-[10px] font-bold">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      {computers.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <svg className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم، النظام، القسم، المستخدم..."
                className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500" />
            </div>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30">
              <option value="all">كل الأنواع</option>
              <option value="workstation">محطة عمل</option>
              <option value="server">سيرفر</option>
              <option value="domain_controller">Domain Controller</option>
              <option value="lab">معمل</option>
              <option value="other">أخرى</option>
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30">
              <option value="all">كل الحالات</option>
              <option value="active">نشط (آخر 90 يوم)</option>
              <option value="inactive">غير نشط</option>
              <option value="enabled">مفعّل</option>
              <option value="disabled">معطّل</option>
            </select>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            عرض {filtered.length} من {computers.length} جهاز
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && computers.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-center py-20 bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="text-6xl mb-4">🖥️</div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">لم يتم سحب الأجهزة بعد</h3>
          <p className="text-slate-500 mb-6">اضغط على "تحديث من AD" لجلب قائمة الكمبيوترات من Active Directory</p>
          <button onClick={fetchComputers} className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all">
            تحديث من AD
          </button>
        </motion.div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-20">
          <svg className="w-12 h-12 animate-spin mx-auto text-cyan-500 mb-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          <p className="text-slate-500 font-medium">جاري سحب البيانات من Active Directory...</p>
        </div>
      )}

      {/* Computers Grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((comp, idx) => (
            <motion.div key={comp.name || idx}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}
              className={`bg-white rounded-xl shadow-sm border hover:shadow-lg transition-all cursor-pointer group ${
                !comp.is_active ? 'border-slate-200 opacity-75' : comp.type === 'server' || comp.type === 'domain_controller' ? 'border-purple-200' : 'border-slate-100'
              }`}
              onClick={() => fetchDetails(comp.name)}
            >
              {/* Card Header */}
              <div className={`px-4 py-3 rounded-t-xl flex items-center justify-between ${
                comp.type === 'domain_controller' ? 'bg-gradient-to-r from-amber-50 to-orange-50' :
                comp.type === 'server' ? 'bg-gradient-to-r from-purple-50 to-violet-50' :
                comp.is_active ? 'bg-gradient-to-r from-blue-50 to-cyan-50' : 'bg-slate-50'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{typeIcons[comp.type] || '📟'}</span>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 group-hover:text-cyan-600 transition-colors">{comp.name}</h3>
                    {comp.dns_name && <p className="text-[10px] text-slate-400 font-mono">{comp.dns_name}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {comp.is_active ? (
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-sm shadow-emerald-500/50"></span>
                  ) : (
                    <span className="w-2.5 h-2.5 bg-slate-300 rounded-full"></span>
                  )}
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${typeColors[comp.type] || 'bg-slate-100 text-slate-600'}`}>
                    {typeLabels[comp.type] || comp.type}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="px-4 py-3 space-y-2">
                {/* OS */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">💿</span>
                  <span className="text-slate-600 truncate">{comp.os || 'غير معروف'}</span>
                  {comp.os_version && <span className="text-slate-400 text-[10px]">v{comp.os_version}</span>}
                </div>

                {/* OU */}
                {comp.ou && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">📂</span>
                    <span className="text-slate-500 truncate">{comp.ou}</span>
                  </div>
                )}

                {/* Last Logon */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">🕐</span>
                  <span className={comp.is_active ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                    {comp.last_logon ? formatDate(comp.last_logon) : 'لم يسجل دخول'}
                  </span>
                </div>

                {/* Specs Preview */}
                {comp.specs && (
                  <div className="flex items-center gap-3 text-xs pt-1 border-t border-slate-100">
                    {comp.specs.ram_gb && (
                      <span className="flex items-center gap-1 text-teal-600">
                        <span>💾</span>{comp.specs.ram_gb} GB
                      </span>
                    )}
                    {comp.specs.processor && (
                      <span className="flex items-center gap-1 text-slate-500 truncate flex-1" title={comp.specs.processor}>
                        <span>⚡</span>{comp.specs.processor.split('@')[0].replace(/\(TM\)|\(R\)|CPU|Processor/gi, '').trim().slice(0, 25)}
                      </span>
                    )}
                  </div>
                )}

                {/* Managed By or Assigned User */}
                {(comp.managed_by || comp.assigned_user) && (
                  <div className="flex items-center gap-2 text-xs pt-1 border-t border-slate-100">
                    <span className="text-slate-400">👤</span>
                    <span className="text-indigo-600 font-medium truncate">
                      {comp.assigned_user?.employee_name || comp.managed_by?.displayName || '—'}
                    </span>
                    {comp.assigned_user?.department && (
                      <span className="text-[10px] text-slate-400">({comp.assigned_user.department})</span>
                    )}
                  </div>
                )}

                {/* Description */}
                {comp.description && (
                  <div className="text-[11px] text-slate-400 truncate pt-1">
                    {comp.description}
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="px-4 py-2 border-t border-slate-50 flex items-center justify-between bg-slate-50/50 rounded-b-xl">
                <button onClick={(e) => { e.stopPropagation(); setAssignTarget(comp); setAssignEmployeeId(comp.assigned_user?.employee_id || ''); setShowAssignModal(true); }}
                  className="text-[11px] text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-1 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                  {comp.assigned_user ? 'تغيير الربط' : 'ربط موظف'}
                </button>
                <span className="text-[10px] text-slate-400">
                  {!comp.is_enabled && '🚫 معطّل'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedComputer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDetailsModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden"
              onClick={e => e.stopPropagation()}>
              {/* Modal Header */}
              <div className={`px-6 py-4 ${
                selectedComputer.type === 'domain_controller' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                selectedComputer.type === 'server' ? 'bg-gradient-to-r from-purple-500 to-violet-600' :
                'bg-gradient-to-r from-cyan-500 to-blue-600'
              } text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{typeIcons[selectedComputer.type] || '📟'}</span>
                    <div>
                      <h2 className="text-xl font-bold">{selectedComputer.name}</h2>
                      {selectedComputer.dns_name && <p className="text-sm opacity-80 font-mono">{selectedComputer.dns_name}</p>}
                    </div>
                  </div>
                  <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
                {/* Status Row */}
                <div className="flex flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold ${selectedComputer.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {selectedComputer.is_active ? '🟢 نشط' : '🔴 غير نشط'}
                  </span>
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold ${selectedComputer.is_enabled ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                    {selectedComputer.is_enabled ? '✅ مفعّل' : '🚫 معطّل'}
                  </span>
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold ${typeColors[selectedComputer.type]}`}>
                    {typeLabels[selectedComputer.type]}
                  </span>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <InfoRow icon="💿" label="نظام التشغيل" value={selectedComputer.os || 'غير معروف'} />
                  <InfoRow icon="📦" label="الإصدار" value={selectedComputer.os_version || '—'} />
                  <InfoRow icon="📂" label="OU" value={selectedComputer.ou || '—'} />
                  <InfoRow icon="🕐" label="آخر تسجيل دخول" value={formatDateTime(selectedComputer.last_logon)} />
                  <InfoRow icon="📅" label="تاريخ الإنشاء" value={formatDateTime(selectedComputer.created)} />
                  <InfoRow icon="🔄" label="آخر تعديل" value={formatDateTime(selectedComputer.last_changed)} />
                  {selectedComputer.description && <InfoRow icon="📝" label="الوصف" value={selectedComputer.description} />}
                  {selectedComputer.location && <InfoRow icon="📍" label="الموقع" value={selectedComputer.location} />}
                </div>

                {/* Managed By */}
                {selectedComputer.managed_by && (
                  <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                    <h4 className="text-sm font-bold text-indigo-800 mb-2 flex items-center gap-2">
                      <span>👤</span> المسؤول (Managed By)
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-indigo-400 text-xs">الاسم:</span> <span className="text-indigo-800 font-medium">{selectedComputer.managed_by.displayName}</span></div>
                      <div><span className="text-indigo-400 text-xs">اليوزر:</span> <span className="text-indigo-800 font-mono text-xs">{selectedComputer.managed_by.username}</span></div>
                      {selectedComputer.managed_by.department && <div><span className="text-indigo-400 text-xs">القسم:</span> <span className="text-indigo-800">{selectedComputer.managed_by.department}</span></div>}
                      {selectedComputer.managed_by.email && <div><span className="text-indigo-400 text-xs">الإيميل:</span> <span className="text-indigo-800 text-xs">{selectedComputer.managed_by.email}</span></div>}
                    </div>
                  </div>
                )}

                {/* Assigned User */}
                {selectedComputer.assigned_user && (
                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                    <h4 className="text-sm font-bold text-emerald-800 mb-2 flex items-center gap-2">
                      <span>🔗</span> الموظف المرتبط
                    </h4>
                    <div className="text-sm text-emerald-800">
                      <span className="font-medium">{selectedComputer.assigned_user.full_name_en || selectedComputer.assigned_user.employee_name}</span>
                      {selectedComputer.assigned_user.department_name && <span className="text-emerald-500 text-xs mr-2">({selectedComputer.assigned_user.department_name})</span>}
                    </div>
                  </div>
                )}

                {/* Hardware Specs */}
                {selectedComputer.specs && (
                  <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-100">
                    <h4 className="text-sm font-bold text-teal-800 mb-3 flex items-center gap-2">
                      <span>⚙️</span> مواصفات الجهاز
                      {selectedComputer.specs.updated_at && (
                        <span className="text-[10px] text-teal-400 font-normal mr-auto">
                          تحديث: {formatDateTime(selectedComputer.specs.updated_at)}
                        </span>
                      )}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedComputer.specs.processor && (
                        <div className="col-span-2 bg-white/60 rounded-lg p-2.5 border border-teal-100">
                          <p className="text-[10px] text-teal-400 font-bold uppercase">المعالج</p>
                          <p className="text-sm text-teal-800 font-medium">{selectedComputer.specs.processor}</p>
                        </div>
                      )}
                      {selectedComputer.specs.ram_gb && (
                        <div className="bg-white/60 rounded-lg p-2.5 border border-teal-100">
                          <p className="text-[10px] text-teal-400 font-bold uppercase">الذاكرة RAM</p>
                          <p className="text-lg text-teal-700 font-bold">{selectedComputer.specs.ram_gb} <span className="text-sm font-normal">GB</span></p>
                        </div>
                      )}
                      {selectedComputer.specs.disk_size_gb && (
                        <div className="bg-white/60 rounded-lg p-2.5 border border-teal-100">
                          <p className="text-[10px] text-teal-400 font-bold uppercase">إجمالي التخزين</p>
                          <p className="text-lg text-teal-700 font-bold">
                            {selectedComputer.specs.disk_size_gb} <span className="text-sm font-normal">GB</span>
                            {selectedComputer.specs.disk_free_gb && (
                              <span className="text-xs text-teal-500 font-normal mr-1">
                                ({selectedComputer.specs.disk_free_gb} فارغ)
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                      {/* Individual Disks */}
                      {selectedComputer.specs.disks && selectedComputer.specs.disks.length > 0 && (
                        <div className="col-span-2 bg-white/60 rounded-lg p-2.5 border border-teal-100">
                          <p className="text-[10px] text-teal-400 font-bold uppercase mb-2">الأقراص ({selectedComputer.specs.disks.length})</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {selectedComputer.specs.disks.map((disk, idx) => (
                              <div key={idx} className="bg-teal-50 rounded-lg p-2 border border-teal-200">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="text-lg">💾</span>
                                  <span className="font-bold text-teal-800">{disk.drive}</span>
                                  {disk.label && <span className="text-[10px] text-teal-500">({disk.label})</span>}
                                </div>
                                <div className="text-xs text-teal-700">
                                  <span className="font-medium">{disk.size_gb} GB</span>
                                  <span className="text-teal-400 mx-1">|</span>
                                  <span className="text-emerald-600">{disk.free_gb} GB فارغ</span>
                                </div>
                                <div className="mt-1 h-1.5 bg-teal-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
                                    style={{ width: `${Math.min(100, ((disk.size_gb - disk.free_gb) / disk.size_gb) * 100)}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedComputer.specs.manufacturer && (
                        <div className="bg-white/60 rounded-lg p-2.5 border border-teal-100">
                          <p className="text-[10px] text-teal-400 font-bold uppercase">الشركة المصنعة</p>
                          <p className="text-sm text-teal-800 font-medium">{selectedComputer.specs.manufacturer}</p>
                        </div>
                      )}
                      {selectedComputer.specs.model && (
                        <div className="bg-white/60 rounded-lg p-2.5 border border-teal-100">
                          <p className="text-[10px] text-teal-400 font-bold uppercase">الموديل</p>
                          <p className="text-sm text-teal-800 font-medium">{selectedComputer.specs.model}</p>
                        </div>
                      )}
                      {selectedComputer.specs.serial_number && (
                        <div className="bg-white/60 rounded-lg p-2.5 border border-teal-100">
                          <p className="text-[10px] text-teal-400 font-bold uppercase">الرقم التسلسلي</p>
                          <p className="text-xs text-teal-800 font-mono">{selectedComputer.specs.serial_number}</p>
                        </div>
                      )}
                      {selectedComputer.specs.ip_address && (
                        <div className="bg-white/60 rounded-lg p-2.5 border border-teal-100">
                          <p className="text-[10px] text-teal-400 font-bold uppercase">IP Address</p>
                          <p className="text-sm text-teal-800 font-mono">{selectedComputer.specs.ip_address}</p>
                        </div>
                      )}
                      {selectedComputer.specs.mac_address && (
                        <div className="bg-white/60 rounded-lg p-2.5 border border-teal-100">
                          <p className="text-[10px] text-teal-400 font-bold uppercase">MAC Address</p>
                          <p className="text-xs text-teal-800 font-mono">{selectedComputer.specs.mac_address}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Groups */}
                {selectedComputer.groups?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      <span>🏷️</span> المجموعات ({selectedComputer.groups.length})
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedComputer.groups.map((g, i) => (
                        <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-mono">{g}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* DN */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Distinguished Name</p>
                  <p className="text-xs text-slate-600 font-mono break-all">{selectedComputer.dn}</p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3 border-t border-slate-100 flex gap-2 bg-slate-50">
                <button onClick={() => { setAssignTarget(selectedComputer); setAssignEmployeeId(selectedComputer.assigned_user?.assigned_employee_id || ''); setShowAssignModal(true); setShowDetailsModal(false); }}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
                  🔗 ربط موظف
                </button>
                <button onClick={() => setShowDetailsModal(false)}
                  className="px-6 py-2.5 bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-300 transition-colors">
                  إغلاق
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assign Modal */}
      <AnimatePresence>
        {showAssignModal && assignTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAssignModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
              onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                🔗 ربط موظف بالجهاز
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                الجهاز: <span className="font-bold text-cyan-600">{assignTarget.name}</span>
              </p>

              <select value={assignEmployeeId} onChange={e => setAssignEmployeeId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 mb-4">
                <option value="">— بدون ربط —</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name_en || emp.full_name_ar} {emp.employee_code ? `(${emp.employee_code})` : ''}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <button onClick={handleAssign}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
                  {assignEmployeeId ? 'ربط' : 'إلغاء الربط'}
                </button>
                <button onClick={() => { setShowAssignModal(false); setAssignTarget(null); }}
                  className="px-6 py-2.5 bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-300 transition-colors">
                  إلغاء
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agent API Keys Modal */}
      <AnimatePresence>
        {showKeysModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowKeysModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold">🔑 Agent API Keys</h2>
                    <p className="text-sm opacity-80 mt-0.5">مفاتيح دائمة للـ Agent — لا تنتهي صلاحيتها</p>
                  </div>
                  <button onClick={() => setShowKeysModal(false)} className="text-white/80 hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Generated Key Display */}
                {generatedKey && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-amber-800 font-bold text-sm mb-2">⚠️ احفظ هذا الـ Key الآن — لن يظهر مرة أخرى!</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-white border border-amber-300 rounded-lg px-3 py-2 text-xs font-mono text-amber-900 break-all select-all">{generatedKey}</code>
                      <button onClick={() => { navigator.clipboard.writeText(generatedKey); toast.success('تم النسخ'); }}
                        className="p-2 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors text-amber-700" title="نسخ">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      </button>
                    </div>
                    <button onClick={downloadSetupScript}
                      className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      تحميل IT-Agent-Setup.ps1 (مع هذا الـ Key)
                    </button>
                  </div>
                )}

                {/* Create New Key */}
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">إنشاء Key جديد</p>
                  <div className="flex gap-2">
                    <input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && createAgentKey()}
                      placeholder="اسم الجهاز أو المجموعة... مثل: Lab-Computers"
                      className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none" />
                    <button onClick={createAgentKey}
                      className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors whitespace-nowrap">
                      + إنشاء
                    </button>
                  </div>
                </div>

                {/* Keys List */}
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">المفاتيح الحالية</p>
                  {keysLoading ? (
                    <div className="flex justify-center py-6"><svg className="w-8 h-8 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg></div>
                  ) : agentKeys.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-sm">لا توجد مفاتيح حتى الآن</div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {agentKeys.map(k => (
                        <div key={k.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${k.is_active ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                          <span className="text-xl">{k.is_active ? '✅' : '🔒'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{k.name}</p>
                            <p className="text-xs text-slate-500 font-mono">{k.key_preview}</p>
                            {k.last_used && <p className="text-[10px] text-slate-400">آخر استخدام: {new Date(k.last_used).toLocaleDateString('ar-EG')} · {k.use_count} مرة</p>}
                          </div>
                          <div className="flex gap-1">
                            {k.is_active && (
                              <button onClick={() => revokeAgentKey(k.id)} title="تعطيل"
                                className="p-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-xs">🚫</button>
                            )}
                            <button onClick={() => deleteAgentKey(k.id)} title="حذف"
                              className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-xs">🗑️</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Details Loading Overlay */}
      {detailsLoading && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-3">
            <svg className="w-10 h-10 animate-spin text-cyan-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            <p className="text-slate-600 font-medium">جاري تحميل التفاصيل...</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Info Row Component
const InfoRow = ({ icon, label, value }) => (
  <div className="flex items-start gap-2 bg-slate-50 rounded-lg p-2.5 border border-slate-100">
    <span className="text-sm mt-0.5">{icon}</span>
    <div className="min-w-0">
      <p className="text-[10px] text-slate-400 font-bold uppercase">{label}</p>
      <p className="text-sm text-slate-700 font-medium truncate">{value}</p>
    </div>
  </div>
);

export default ADComputers;
