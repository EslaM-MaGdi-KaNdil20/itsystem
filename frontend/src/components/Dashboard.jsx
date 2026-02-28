import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart, RadialBar
} from 'recharts';

const API_URL = `${window.location.protocol}//${window.location.hostname}:3000/api`;

/* ═══════════════════════ ICONS ═══════════════════════ */
const I = {
  Devices: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/></svg>,
  Users: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  Ticket: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg>,
  Wrench: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>,
  Package: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/></svg>,
  Wallet: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 100 4 2 2 0 000-4z"/></svg>,
  Tasks: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  Alert: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Trend: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  Plus: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Refresh: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
  Shield: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Settings: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  Report: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  Box: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>,
  Clock: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  ArrowUp: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
  Close: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Dept: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>,
  External: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
};

/* ═══════════════════════ COLORS ═══════════════════════ */
const CHART_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];
const PIE_COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b'];

/* ═══════════════════════ CUSTOM TOOLTIP ═══════════════════════ */
const CustomTooltip = ({ active, payload, label, suffix = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700/50 text-xs">
      <p className="text-slate-400 font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold" style={{ color: p.color || '#fff' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString('ar-EG') : p.value} {suffix}
        </p>
      ))}
    </div>
  );
};

/* ═══════════════════════ MAIN COMPONENT ═══════════════════════ */
export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${API_URL}/dashboard/stats`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStats(await res.json());
    } catch (e) {
      console.error('Dashboard fetch error:', e);
      setStats({
        devices: { total_devices: 0, active_devices: 0, maintenance_devices: 0, retired_devices: 0, by_type: [] },
        employees: { total_employees: 0, active_employees: 0 },
        departments: { total_departments: 0 },
        maintenance: { total_maintenance: 0, pending_maintenance: 0, in_progress_maintenance: 0, completed_maintenance: 0, total_cost: '0' },
        assignments: { total_assignments: 0, active_assignments: 0 },
        subscriptions: { total_subscriptions: 0, active_subscriptions: 0, expiring_soon: 0, monthly_cost: 0, yearly_cost: 0 },
        inventory: { total_products: 0, total_quantity: 0, low_stock_items: 0 },
        tickets: { total_tickets: 0, open_tickets: 0, in_progress_tickets: 0, resolved_tickets: 0, urgent_open: 0, today_tickets: 0, week_tickets: 0 },
        tasks: { total: 0, todo: 0, in_progress: 0, review: 0, done: 0, overdue: 0 },
        recent_activities: [],
        charts: { maintenance_monthly: [], devices_monthly: [], emp_by_dept: [], tickets_monthly: [], warranty_expiring: [] }
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const totalMonthlyCost = useMemo(() => {
    if (!stats) return 0;
    return parseFloat(stats.subscriptions?.monthly_cost || 0) + (parseFloat(stats.subscriptions?.yearly_cost || 0) / 12);
  }, [stats]);

  const ticketResolution = useMemo(() => {
    if (!stats?.tickets?.total_tickets) return 0;
    return Math.round((parseInt(stats.tickets.resolved_tickets || 0) / parseInt(stats.tickets.total_tickets)) * 100);
  }, [stats]);

  const currentDate = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  /* ═══════════════ LOADING STATE ═══════════════ */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin"></div>
          </div>
          <p className="text-slate-500 text-sm font-medium animate-pulse">جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  /* ═══════════════ KPI CARDS DATA ═══════════════ */
  const kpiCards = [
    {
      title: 'إجمالي الأجهزة', value: stats.devices?.total_devices || 0,
      sub: `${stats.devices?.active_devices || 0} نشط`, subIcon: 'up',
      icon: I.Devices, gradient: 'from-indigo-500 to-indigo-600', light: 'bg-indigo-50 text-indigo-600',
      ring: 'ring-indigo-500/20', path: '/devices',
    },
    {
      title: 'الموظفون', value: stats.employees?.total_employees || 0,
      sub: `${stats.employees?.active_employees || 0} نشط`, subIcon: 'up',
      icon: I.Users, gradient: 'from-cyan-500 to-teal-500', light: 'bg-cyan-50 text-cyan-600',
      ring: 'ring-cyan-500/20', path: '/employees',
    },
    {
      title: 'التذاكر المفتوحة', value: stats.tickets?.open_tickets || 0,
      sub: stats.tickets?.urgent_open > 0 ? `${stats.tickets.urgent_open} عاجلة` : `${stats.tickets?.today_tickets || 0} اليوم`,
      subIcon: stats.tickets?.urgent_open > 0 ? 'alert' : 'neutral',
      icon: I.Ticket, gradient: 'from-violet-500 to-purple-600', light: 'bg-violet-50 text-violet-600',
      ring: 'ring-violet-500/20', path: '/tickets',
    },
    {
      title: 'طلبات الصيانة', value: (parseInt(stats.maintenance?.pending_maintenance || 0) + parseInt(stats.maintenance?.in_progress_maintenance || 0)),
      sub: `${stats.maintenance?.completed_maintenance || 0} منجزة`, subIcon: 'neutral',
      icon: I.Wrench, gradient: 'from-amber-500 to-orange-500', light: 'bg-amber-50 text-amber-600',
      ring: 'ring-amber-500/20', path: '/maintenance',
    },
    {
      title: 'الاشتراكات', value: stats.subscriptions?.active_subscriptions || 0,
      sub: stats.subscriptions?.expiring_soon > 0 ? `${stats.subscriptions.expiring_soon} تنتهي قريباً` : 'الكل نشط',
      subIcon: stats.subscriptions?.expiring_soon > 0 ? 'alert' : 'up',
      icon: I.Package, gradient: 'from-emerald-500 to-green-500', light: 'bg-emerald-50 text-emerald-600',
      ring: 'ring-emerald-500/20', path: '/it/subscriptions',
    },
    {
      title: 'التكلفة الشهرية', value: `${Math.round(totalMonthlyCost).toLocaleString('ar-EG')}`,
      sub: 'ج.م تقديري', subIcon: 'neutral',
      icon: I.Wallet, gradient: 'from-rose-500 to-pink-500', light: 'bg-rose-50 text-rose-600',
      ring: 'ring-rose-500/20', path: '/it/subscriptions',
    },
  ];

  /* ═══════════════ TASK RADIAL DATA ═══════════════ */
  const taskTotal = stats.tasks?.total || 0;
  const taskDone = stats.tasks?.done || 0;
  const taskPct = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1800px] mx-auto min-h-screen bg-slate-50/80" dir="rtl">

      {/* ═══════════════ HEADER ═══════════════ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">لوحة التحكم</h1>
          <p className="text-slate-500 text-sm mt-0.5">{currentDate}</p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ rotate: 180 }}
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all text-sm font-medium text-slate-600 disabled:opacity-50"
          >
            <I.Refresh className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            تحديث
          </motion.button>
          <button
            onClick={() => setIsReportsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700 transition-all text-sm font-medium"
          >
            <I.Report className="w-4 h-4" />
            التقارير
          </button>
        </div>
      </div>

      {/* ═══════════════ KPI CARDS ═══════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((card, idx) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => navigate(card.path)}
            className={`relative bg-white rounded-2xl p-4 cursor-pointer group border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-300 ring-0 hover:ring-2 ${card.ring}`}
          >
            {/* Gradient accent line */}
            <div className={`absolute top-0 left-4 right-4 h-0.5 bg-gradient-to-r ${card.gradient} rounded-b opacity-0 group-hover:opacity-100 transition-opacity`} />
            
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${card.light} flex items-center justify-center transition-transform group-hover:scale-110`}>
                <card.icon className="w-5 h-5" />
              </div>
              <div className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                card.subIcon === 'alert' ? 'text-red-600 bg-red-50' :
                card.subIcon === 'up' ? 'text-emerald-600 bg-emerald-50' :
                'text-slate-500 bg-slate-50'
              }`}>
                {card.subIcon === 'alert' && <I.Alert className="w-3 h-3" />}
                {card.subIcon === 'up' && <I.ArrowUp className="w-3 h-3" />}
                {card.sub}
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{typeof card.value === 'number' ? card.value.toLocaleString('ar-EG') : card.value}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">{card.title}</div>
          </motion.div>
        ))}
      </div>

      {/* ═══════════════ TICKET RESOLUTION BAR ═══════════════ */}
      {stats.tickets?.total_tickets > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 lg:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                <I.Ticket className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">معدل حل التذاكر</h3>
                <p className="text-xs text-slate-400">{stats.tickets.resolved_tickets || 0} من {stats.tickets.total_tickets} تذكرة</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              {[
                { l: 'مفتوحة', v: stats.tickets.open_tickets, c: 'text-amber-600 bg-amber-50' },
                { l: 'جاري', v: stats.tickets.in_progress_tickets, c: 'text-blue-600 bg-blue-50' },
                { l: 'محلولة', v: stats.tickets.resolved_tickets, c: 'text-emerald-600 bg-emerald-50' },
              ].map(t => (
                <span key={t.l} className={`${t.c} px-2.5 py-1 rounded-lg font-semibold`}>{t.l}: {t.v || 0}</span>
              ))}
            </div>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${ticketResolution}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full" />
          </div>
          <p className="text-left text-xs font-bold text-slate-600 mt-1.5">{ticketResolution}%</p>
        </motion.div>
      )}

      {/* ═══════════════ MAIN GRID ═══════════════ */}
      <div className="grid grid-cols-12 gap-4 lg:gap-6">

        {/* ── Devices by Type (Pie) ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="col-span-12 lg:col-span-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 text-sm">توزيع الأجهزة</h3>
            <button onClick={() => navigate('/devices')} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
              عرض الكل <I.External className="w-3 h-3" />
            </button>
          </div>

          {stats.devices?.by_type?.some(t => parseInt(t.count) > 0) ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={stats.devices.by_type.filter(t => parseInt(t.count) > 0).map((t, i) => ({ name: t.type, value: parseInt(t.count), fill: PIE_COLORS[i % PIE_COLORS.length] }))}
                    cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {stats.devices.by_type.filter(t => parseInt(t.count) > 0).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip suffix="جهاز" />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-2">
                {stats.devices.by_type.filter(t => parseInt(t.count) > 0).slice(0, 6).map((t, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {t.type} ({t.count})
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">لا توجد بيانات</div>
          )}
        </motion.div>

        {/* ── Device Status + Maintenance Cards ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="col-span-12 lg:col-span-4 space-y-4">
          
          {/* Device Status */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 text-sm mb-4">حالة الأجهزة</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'نشط', value: stats.devices?.active_devices || 0, color: 'bg-emerald-500', bg: 'bg-emerald-50 text-emerald-700' },
                { label: 'صيانة', value: stats.devices?.maintenance_devices || 0, color: 'bg-amber-500', bg: 'bg-amber-50 text-amber-700' },
                { label: 'متقاعد', value: stats.devices?.retired_devices || 0, color: 'bg-slate-400', bg: 'bg-slate-50 text-slate-600' },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                  <div className="text-xl font-bold">{s.value}</div>
                  <div className="text-[11px] font-semibold mt-0.5">{s.label}</div>
                  <div className={`w-full h-1 ${s.color} rounded-full mt-2 opacity-40`} />
                </div>
              ))}
            </div>
          </div>

          {/* Maintenance summary */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 text-sm">الصيانة</h3>
              <button onClick={() => navigate('/maintenance')} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">سجل الصيانة</button>
            </div>
            <div className="space-y-3">
              {[
                { label: 'معلقة', value: stats.maintenance?.pending_maintenance || 0, color: 'bg-amber-500' },
                { label: 'قيد التنفيذ', value: stats.maintenance?.in_progress_maintenance || 0, color: 'bg-blue-500' },
                { label: 'مكتملة', value: stats.maintenance?.completed_maintenance || 0, color: 'bg-emerald-500' },
              ].map(m => {
                const total = parseInt(stats.maintenance?.total_maintenance || 1);
                const pct = Math.round((parseInt(m.value) / total) * 100) || 0;
                return (
                  <div key={m.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">{m.label}</span>
                      <span className="text-slate-800 font-bold">{m.value}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${m.color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* ── Quick Actions + Tasks ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="col-span-12 lg:col-span-4 space-y-4">

          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 rounded-2xl p-5 text-white shadow-lg shadow-indigo-500/20">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-indigo-100">
              <I.Trend className="w-4 h-4" /> وصول سريع
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: I.Plus, label: 'جهاز جديد', path: '/devices' },
                { icon: I.Users, label: 'موظف جديد', path: '/employees' },
                { icon: I.Wrench, label: 'طلب صيانة', path: '/maintenance' },
                { icon: I.Box, label: 'المخزون', path: '/inventory' },
                { icon: I.Report, label: 'التقارير', action: () => setIsReportsModalOpen(true) },
                { icon: I.Settings, label: 'الإعدادات', path: '/settings' },
              ].map(btn => (
                <button key={btn.label} onClick={btn.action || (() => navigate(btn.path))}
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all text-center">
                  <btn.icon className="w-5 h-5" />
                  <span className="text-[11px] font-medium leading-tight">{btn.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Task Summary */}
          {stats.tasks && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800 text-sm">المهام</h3>
                <button onClick={() => navigate('/tasks')} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">عرض الكل</button>
              </div>
              <div className="flex items-center gap-4">
                {/* Radial progress */}
                <div className="relative w-20 h-20 shrink-0">
                  <ResponsiveContainer width={80} height={80} minWidth={0}>
                    <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" startAngle={90} endAngle={-270}
                      data={[{ value: taskPct, fill: '#6366f1' }]}>
                      <RadialBar dataKey="value" cornerRadius={10} background={{ fill: '#e2e8f0' }} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-slate-800">{taskPct}%</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 flex-1">
                  {[
                    { l: 'للتنفيذ', v: stats.tasks.todo, c: 'text-slate-600' },
                    { l: 'قيد العمل', v: stats.tasks.in_progress, c: 'text-blue-600' },
                    { l: 'مراجعة', v: stats.tasks.review, c: 'text-amber-600' },
                    { l: 'منجزة', v: stats.tasks.done, c: 'text-emerald-600' },
                  ].map(t => (
                    <div key={t.l} className="text-center p-1.5 rounded-lg bg-slate-50">
                      <div className={`text-base font-bold ${t.c}`}>{t.v}</div>
                      <div className="text-[10px] text-slate-500 font-medium">{t.l}</div>
                    </div>
                  ))}
                </div>
              </div>
              {stats.tasks.overdue > 0 && (
                <div className="mt-3 flex items-center gap-2 p-2 bg-red-50 rounded-xl text-red-600 text-xs font-semibold border border-red-100">
                  <I.Alert className="w-3.5 h-3.5" />
                  {stats.tasks.overdue} مهمة متأخرة
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* ═══════════════ CHARTS ROW ═══════════════ */}

        {/* Tickets Trend (Area) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="col-span-12 lg:col-span-8 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-slate-800 text-sm">تذاكر الدعم الشهرية</h3>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> إجمالي</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> محلولة</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={stats.charts?.tickets_monthly || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gTickets" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month_label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2.5} fill="url(#gTickets)" name="إجمالي" dot={{ r: 3, fill: '#6366f1' }} activeDot={{ r: 5 }} />
              <Area type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2.5} fill="url(#gResolved)" name="محلولة" dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="col-span-12 lg:col-span-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2">
            <I.Clock className="w-4 h-4 text-slate-400" /> النشاط الأخير
          </h3>
          <div className="space-y-0">
            {stats.recent_activities?.length > 0 ? stats.recent_activities.slice(0, 6).map((a, i) => (
              <div key={i} className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0 group">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  a.type === 'device' ? 'bg-indigo-50 text-indigo-500' :
                  a.type === 'employee' ? 'bg-cyan-50 text-cyan-500' :
                  a.type === 'maintenance' ? 'bg-amber-50 text-amber-500' :
                  'bg-slate-50 text-slate-500'
                }`}>
                  {a.type === 'device' ? <I.Devices className="w-3.5 h-3.5" /> :
                   a.type === 'employee' ? <I.Users className="w-3.5 h-3.5" /> :
                   <I.Wrench className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 font-medium leading-relaxed line-clamp-2">{a.description}</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {new Date(a.timestamp).toLocaleDateString('ar-EG')} • {new Date(a.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )) : (
              <p className="text-slate-400 text-xs text-center py-8">لا يوجد نشاط حديث</p>
            )}
          </div>
        </motion.div>

        {/* Devices Monthly (Bar) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="col-span-12 lg:col-span-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 text-sm mb-1">الأجهزة المضافة شهرياً</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.charts?.devices_monthly || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#818cf8" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month_label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip suffix="جهاز" />} />
              <Bar dataKey="count" name="أجهزة" radius={[6, 6, 0, 0]} maxBarSize={40}>
                {(stats.charts?.devices_monthly || []).map((_, i) => (
                  <Cell key={i} fill="url(#barGradient)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Maintenance Monthly (Bar) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="col-span-12 lg:col-span-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-slate-800 text-sm">الصيانة الشهرية</h3>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> طلبات</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-200" /> تكلفة</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.charts?.maintenance_monthly || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month_label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar yAxisId="left" dataKey="count" name="طلبات" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={35} />
              <Bar yAxisId="right" dataKey="cost" name="تكلفة (ج.م)" fill="#fde68a" radius={[6, 6, 0, 0]} maxBarSize={35} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Employees by Dept (Horizontal Bar) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="col-span-12 lg:col-span-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 text-sm mb-1">الموظفون حسب القسم</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.charts?.emp_by_dept || []} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="dept" tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip suffix="موظف" />} />
              <Bar dataKey="count" name="موظفون" radius={[6, 6, 0, 0]} maxBarSize={36}>
                {(stats.charts?.emp_by_dept || []).map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Alerts + Inventory */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="col-span-12 lg:col-span-6 space-y-4">

          {/* Inventory */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800 text-sm">المخزون</h3>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                stats.inventory?.low_stock_items > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
              }`}>
                {stats.inventory?.low_stock_items > 0 ? `${stats.inventory.low_stock_items} منخفض` : 'مخزون جيد ✓'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-slate-800">{stats.inventory?.total_products || 0}</div>
                <div className="text-[11px] text-slate-500 font-medium">إجمالي المنتجات</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-slate-800">{parseInt(stats.inventory?.total_quantity || 0).toLocaleString('ar-EG')}</div>
                <div className="text-[11px] text-slate-500 font-medium">الكمية الإجمالية</div>
              </div>
            </div>
          </div>

          {/* Warranty Expiring */}
          {stats.charts?.warranty_expiring?.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
                <I.Shield className="w-4 h-4 text-amber-500" /> ضمانات تنتهي قريباً
              </h3>
              <div className="space-y-2">
                {stats.charts.warranty_expiring.map(d => (
                  <div key={d.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate">{d.name}</div>
                      <div className="text-[10px] text-slate-400">{d.asset_tag} · {d.device_type}</div>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap ${
                      d.days_left <= 7 ? 'bg-red-50 text-red-600 ring-1 ring-red-200' :
                      d.days_left <= 30 ? 'bg-amber-50 text-amber-600 ring-1 ring-amber-200' :
                      'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200'
                    }`}>
                      {d.days_left} يوم
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

      </div>

      {/* ═══════════════ REPORTS MODAL ═══════════════ */}
      <AnimatePresence>
        {isReportsModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-bold text-slate-900">التقارير المتاحة</h2>
                <button onClick={() => setIsReportsModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600">
                  <I.Close className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { title: 'جرد المخزون', desc: 'حالة المخزون', icon: I.Box, color: 'indigo', path: '/inventory-report' },
                  { title: 'تقرير الأجهزة', desc: 'الأجهزة وحالتها', icon: I.Devices, color: 'cyan', path: '/devices' },
                  { title: 'تقرير الموظفين', desc: 'بيانات الموظفين', icon: I.Users, color: 'emerald', path: '/employees' },
                  { title: 'تقرير العهدة', desc: 'توزيع العهد', icon: I.Report, color: 'amber', path: '/assignments' },
                  { title: 'سجل الصيانة', desc: 'تاريخ الإصلاحات', icon: I.Wrench, color: 'rose', path: '/maintenance' },
                  { title: 'تقرير الأقسام', desc: 'الأقسام والتوزيع', icon: I.Dept, color: 'violet', path: '/departments' },
                ].map(r => {
                  const colorMap = {
                    indigo: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white',
                    cyan: 'bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white',
                    emerald: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white',
                    amber: 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white',
                    rose: 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white',
                    violet: 'bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white',
                  };
                  return (
                    <button key={r.title} onClick={() => { setIsReportsModalOpen(false); navigate(r.path); }}
                      className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all text-right group">
                      <div className={`p-2.5 rounded-xl transition-colors ${colorMap[r.color]}`}>
                        <r.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">{r.title}</div>
                        <div className="text-[11px] text-slate-400">{r.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
