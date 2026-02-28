import { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';

const API_URL = `${window.location.protocol}//${window.location.hostname}:3000/api`;
const token = () => localStorage.getItem('token');
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

// ─── Constants ───────────────────────────────────────────────────────────────
const COLUMNS = [
  { id: 'todo',        label: 'قائمة المهام',    color: 'bg-slate-50/50 border-slate-200/60', dot: 'bg-slate-400',   text: 'text-slate-700' },
  { id: 'in_progress', label: 'قيد التنفيذ',      color: 'bg-indigo-50/30 border-indigo-100',  dot: 'bg-indigo-500',  text: 'text-indigo-700' },
  { id: 'review',      label: 'مراجعة',           color: 'bg-amber-50/30 border-amber-100',    dot: 'bg-amber-500',   text: 'text-amber-700' },
  { id: 'done',        label: 'مكتمل',            color: 'bg-emerald-50/30 border-emerald-100',dot: 'bg-emerald-500', text: 'text-emerald-700' },
];

const PRIORITY = {
  low:    { label: 'منخفضة', cls: 'bg-slate-100 text-slate-600',    icon: '↓' },
  medium: { label: 'متوسطة', cls: 'bg-blue-50 text-blue-600',       icon: '−' },
  high:   { label: 'عالية',  cls: 'bg-orange-50 text-orange-600',   icon: '↑' },
  urgent: { label: 'عاجلة',  cls: 'bg-red-50 text-red-600',         icon: '⚡' },
};

const STATUS_LABELS = { todo: 'قائمة المهام', in_progress: 'قيد التنفيذ', review: 'مراجعة', done: 'مكتمل' };

// ─── Helper ──────────────────────────────────────────────────────────────────
function Avatar({ name, avatar, size = 6 }) {
  if (avatar) return <img src={avatar} className={`w-${size} h-${size} rounded-full object-cover ring-2 ring-white`} alt={name} />;
  const initials = name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  const colors = ['bg-indigo-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];
  const color = colors[name?.charCodeAt(0) % colors.length] || 'bg-slate-400';
  return (
    <div className={`w-${size} h-${size} rounded-full ${color} flex items-center justify-center text-white font-bold ring-2 ring-white shadow-sm`}
      style={{ fontSize: size * 2 }}>
      {initials}
    </div>
  );
}

function formatDate(d) {
  if (!d) return null;
  const date = new Date(d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((date - today) / 86400000);
  if (diff < 0) return { text: `متأخر ${Math.abs(diff)} يوم`, cls: 'text-rose-600 bg-rose-50 font-medium' };
  if (diff === 0) return { text: 'اليوم', cls: 'text-amber-600 bg-amber-50 font-medium' };
  if (diff <= 3) return { text: `بعد ${diff} أيام`, cls: 'text-amber-600 bg-amber-50' };
  return { text: date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }), cls: 'text-slate-500 bg-slate-50' };
}

// ─── Task Card ───────────────────────────────────────────────────────────────
function TaskCard({ task, index, onOpen, onDelete }) {
  const p = PRIORITY[task.priority] || PRIORITY.medium;
  const due = formatDate(task.due_date);
  return (
    <Draggable draggableId={`task-${task.id}`} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onOpen(task)}
          className={`bg-white rounded-xl border border-slate-200 p-3.5 mb-3 cursor-pointer shadow-sm hover:shadow-md hover:border-indigo-300 transition-all select-none group
            ${snapshot.isDragging ? 'shadow-xl rotate-2 opacity-95 border-indigo-400 ring-2 ring-indigo-100' : ''}`}
        >
          {/* Header: Priority & Delete */}
          <div className="flex items-start justify-between gap-2 mb-2.5">
            <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 ${p.cls}`}>
              <span>{p.icon}</span> {p.label}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
              className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-rose-50"
              title="حذف المهمة"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Title */}
          <p className={`text-sm font-semibold text-slate-800 leading-snug mb-3 line-clamp-2 ${task.status === 'done' ? 'line-through text-slate-400' : ''}`}>
            {task.title}
          </p>

          {/* Footer: Assignee & Due Date */}
          <div className="flex items-center justify-between mt-auto pt-1">
            <div className="flex items-center gap-1.5">
              {task.assigned_to_name ? (
                <div className="flex items-center gap-2" title={task.assigned_to_name}>
                  <Avatar name={task.assigned_to_name} avatar={task.assigned_to_avatar} size={6} />
                  <span className="text-xs font-medium text-slate-600 hidden sm:block truncate max-w-[80px]">{task.assigned_to_name.split(' ')[0]}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full border border-dashed border-slate-300 flex items-center justify-center text-slate-400 bg-slate-50">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">غير معين</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {task.comments?.length > 0 && (
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  {task.comments.length}
                </span>
              )}
              {due && (
                <span className={`text-[11px] px-1.5 py-0.5 rounded-md flex items-center gap-1 ${due.cls}`}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  {due.text}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

// ─── Create Task Modal ────────────────────────────────────────────────────────
function CreateTaskModal({ isOpen, onClose, onCreated, users }) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', status: 'todo', assigned_to: '', due_date: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('عنوان المهمة مطلوب');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ ...form, assigned_to: form.assigned_to || null })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('تم إنشاء المهمة');
      onCreated(data);
      onClose();
      setForm({ title: '', description: '', priority: 'medium', status: 'todo', assigned_to: '', due_date: '' });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
          <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </span>
              مهمة جديدة
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-1.5 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">عنوان المهمة <span className="text-rose-500">*</span></label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-slate-50/50 focus:bg-white"
                placeholder="ما الذي يجب إنجازه؟" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">التفاصيل</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none transition-all bg-slate-50/50 focus:bg-white"
                rows={3} placeholder="أضف وصفاً أو ملاحظات..." />
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">الأولوية</label>
                <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-slate-50/50 focus:bg-white appearance-none">
                  <option value="low">↓ منخفضة</option>
                  <option value="medium">− متوسطة</option>
                  <option value="high">↑ عالية</option>
                  <option value="urgent">⚡ عاجلة</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">الحالة</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-slate-50/50 focus:bg-white appearance-none">
                  {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">تعيين إلى</label>
                <select value={form.assigned_to} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-slate-50/50 focus:bg-white appearance-none">
                  <option value="">— غير معين —</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">تاريخ الاستحقاق</label>
                <input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-slate-50/50 focus:bg-white" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors">إلغاء</button>
              <button type="submit" disabled={loading}
                className="px-6 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center gap-2 shadow-sm shadow-indigo-200">
                {loading && <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                إنشاء المهمة
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Task Detail Drawer (Slide-over) ──────────────────────────────────────────
function TaskDetailDrawer({ task, users, onClose, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: task.title, description: task.description || '', priority: task.priority, status: task.status, assigned_to: task.assigned_to || '', due_date: task.due_date ? task.due_date.split('T')[0] : '' });
  const [comments, setComments] = useState(task.comments || []);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/tasks/${task.id}`, {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({ ...form, assigned_to: form.assigned_to || null })
      });
      if (String(form.assigned_to) !== String(task.assigned_to || '')) {
        await fetch(`${API_URL}/tasks/${task.id}/assign`, {
          method: 'PUT', headers: headers(),
          body: JSON.stringify({ assigned_to: form.assigned_to || null })
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('تم حفظ التعديلات');
      onSave({ ...data, assigned_to_name: users.find(u => u.id === parseInt(form.assigned_to))?.full_name, assigned_to_avatar: users.find(u => u.id === parseInt(form.assigned_to))?.avatar });
      setEditing(false);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await fetch(`${API_URL}/tasks/${task.id}/comments`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ comment: newComment })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setComments(prev => [...prev, data]);
      setNewComment('');
    } catch (e) { toast.error(e.message); }
  };

  const p = PRIORITY[form.priority] || PRIORITY.medium;
  const due = formatDate(form.due_date);

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40" onClick={onClose} />
      
      {/* Drawer */}
      <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 left-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-r border-slate-200" dir="rtl">
        
        {/* Header Actions */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            <span className="text-xs font-medium text-slate-500 bg-slate-200/50 px-2 py-1 rounded-md">TASK-{task.id}</span>
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button onClick={() => setEditing(false)} className="text-xs font-medium text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-200/50 transition-colors">إلغاء</button>
                <button onClick={handleSave} disabled={loading} className="text-xs font-medium bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200">
                  {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)} className="text-xs font-medium text-slate-600 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  تعديل
                </button>
                <button onClick={() => { onDelete(task.id); onClose(); }} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="حذف">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Title */}
          <div className="mb-6">
            {editing ? (
              <textarea value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className="w-full text-xl font-bold text-slate-800 border-none focus:ring-0 p-0 resize-none outline-none bg-transparent placeholder-slate-300"
                rows={2} placeholder="عنوان المهمة..." autoFocus />
            ) : (
              <h1 className="text-xl font-bold text-slate-800 leading-snug">{task.title}</h1>
            )}
          </div>

          {/* Properties Grid */}
          <div className="grid grid-cols-2 gap-y-4 gap-x-6 mb-8 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            {/* Status */}
            <div>
              <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">الحالة</span>
              {editing ? (
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full text-sm border-none bg-white rounded-lg py-1.5 px-2 shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none">
                  {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-white border border-slate-200 shadow-sm text-slate-700">
                  {STATUS_LABELS[form.status]}
                </span>
              )}
            </div>

            {/* Priority */}
            <div>
              <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">الأولوية</span>
              {editing ? (
                <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                  className="w-full text-sm border-none bg-white rounded-lg py-1.5 px-2 shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none">
                  <option value="low">↓ منخفضة</option>
                  <option value="medium">− متوسطة</option>
                  <option value="high">↑ عالية</option>
                  <option value="urgent">⚡ عاجلة</option>
                </select>
              ) : (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${p.cls}`}>
                  <span>{p.icon}</span> {p.label}
                </span>
              )}
            </div>

            {/* Assignee */}
            <div>
              <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">المسؤول</span>
              {editing ? (
                <select value={form.assigned_to} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}
                  className="w-full text-sm border-none bg-white rounded-lg py-1.5 px-2 shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none">
                  <option value="">— غير معين —</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              ) : (
                <div className="flex items-center gap-2">
                  {task.assigned_to_name ? (
                    <>
                      <Avatar name={task.assigned_to_name} avatar={task.assigned_to_avatar} size={6} />
                      <span className="text-sm font-medium text-slate-700">{task.assigned_to_name}</span>
                    </>
                  ) : (
                    <span className="text-sm text-slate-400 italic">غير معين</span>
                  )}
                </div>
              )}
            </div>

            {/* Due Date */}
            <div>
              <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">تاريخ الاستحقاق</span>
              {editing ? (
                <input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                  className="w-full text-sm border-none bg-white rounded-lg py-1.5 px-2 shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
              ) : (
                <div className="flex items-center gap-1.5">
                  {due ? (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${due.cls}`}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      {due.text}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400 italic">غير محدد</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
              الوصف
            </h3>
            {editing ? (
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none bg-slate-50/50 focus:bg-white transition-colors min-h-[120px]"
                placeholder="أضف تفاصيل المهمة..." />
            ) : (
              <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50/50 p-4 rounded-xl border border-slate-100 min-h-[80px]">
                {task.description || <span className="text-slate-400 italic">لا يوجد وصف للمهمة.</span>}
              </div>
            )}
          </div>

          {/* Comments */}
          {!editing && (
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                التعليقات ({comments.length})
              </h3>
              
              <div className="space-y-4 mb-6">
                {comments.map(c => (
                  <div key={c.id} className="flex gap-3">
                    <Avatar name={c.created_by_name} avatar={c.created_by_avatar} size={8} />
                    <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl rounded-tr-none p-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-slate-700">{c.created_by_name}</span>
                        <span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
                      </div>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">{c.comment}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Comment */}
              <div className="flex gap-3 items-start">
                <div className="flex-1 relative">
                  <textarea value={newComment} onChange={e => setNewComment(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none bg-slate-50/50 focus:bg-white transition-colors pr-12"
                    rows={2} placeholder="اكتب تعليقاً..." />
                  <button onClick={addComment} disabled={!newComment.trim()}
                    className="absolute left-2 bottom-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transform: 'rotate(180deg)' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filterUser, setFilterUser] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTasks = useCallback(async () => {
    try {
      const [tasksRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/tasks`, { headers: headers() }),
        fetch(`${API_URL}/tasks/users-list`, { headers: headers() })
      ]);
      const [tasksData, usersData] = await Promise.all([tasksRes.json(), usersRes.json()]);
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (e) {
      toast.error('حدث خطأ في تحميل المهام');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const getColumnTasks = (colId) => {
    return tasks
      .filter(t => t.status === colId)
      .filter(t => !filterUser || String(t.assigned_to) === filterUser)
      .filter(t => !filterPriority || t.priority === filterPriority)
      .filter(t => !searchTerm || t.title.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.position - b.position);
  };

  const onDragEnd = async (result) => {
    const { draggableId, source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const taskId = parseInt(draggableId.replace('task-', ''));
    const newStatus = destination.droppableId;
    const newPosition = destination.index;

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, position: newPosition } : t));

    try {
      await fetch(`${API_URL}/tasks/${taskId}/move`, {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({ status: newStatus, position: newPosition })
      });
    } catch (e) {
      toast.error('حدث خطأ في تحريك المهمة');
      fetchTasks(); // revert
    }
  };

  const handleTaskCreated = (newTask) => {
    setTasks(prev => [...prev, newTask]);
  };

  const handleTaskSaved = (updated) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
    setSelectedTask(prev => prev ? { ...prev, ...updated } : null);
  };

  const handleDelete = async (taskId) => {
    try {
      await fetch(`${API_URL}/tasks/${taskId}`, { method: 'DELETE', headers: headers() });
      setTasks(prev => prev.filter(t => t.id !== taskId));
      setSelectedTask(null);
      toast.success('تم حذف المهمة');
    } catch (e) {
      toast.error('حدث خطأ في الحذف');
    }
  };

  const openTaskDetail = async (task) => {
    try {
      const res = await fetch(`${API_URL}/tasks/${task.id}`, { headers: headers() });
      const data = await res.json();
      setSelectedTask(data);
    } catch {
      setSelectedTask(task);
    }
  };

  const totalByStatus = (colId) => tasks.filter(t => t.status === colId).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          <p className="text-slate-500 font-medium text-sm">جاري تحميل المهام...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-[calc(100vh-64px)] bg-[#f8fafc]" dir="rtl">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">إدارة المهام</h1>
            <p className="text-slate-500 mt-0.5 text-sm font-medium">
              {tasks.length} مهمة إجمالية • {tasks.filter(t => t.status === 'done').length} مكتملة
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Search */}
          <div className="relative flex-1 lg:flex-none lg:w-56">
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-slate-50 focus:bg-white"
              placeholder="بحث في المهام..." />
            <span className="absolute right-3 top-3 text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </span>
          </div>
          {/* Filter by user */}
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-slate-50 focus:bg-white appearance-none pr-8 relative">
            <option value="">كل المستخدمين</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
          {/* Filter by priority */}
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-slate-50 focus:bg-white appearance-none pr-8">
            <option value="">كل الأولويات</option>
            <option value="urgent">⚡ عاجلة</option>
            <option value="high">↑ عالية</option>
            <option value="medium">− متوسطة</option>
            <option value="low">↓ منخفضة</option>
          </select>
          {/* New task */}
          <button onClick={() => setShowCreate(true)}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 font-medium shadow-sm shadow-indigo-200 ml-auto lg:ml-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            مهمة جديدة
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
          {COLUMNS.map(col => {
            const colTasks = getColumnTasks(col.id);
            const total = totalByStatus(col.id);
            return (
              <div key={col.id} className={`rounded-2xl border ${col.color} flex flex-col min-h-[500px] transition-colors`}>
                {/* Column Header */}
                <div className="p-4 flex items-center justify-between border-b border-slate-200/50">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.dot} shadow-sm`}></span>
                    <span className={`font-bold text-sm ${col.text}`}>{col.label}</span>
                  </div>
                  <span className="bg-white/60 backdrop-blur-sm border border-slate-200/60 rounded-full px-2.5 py-0.5 text-xs font-bold text-slate-600 shadow-sm">
                    {total}
                  </span>
                </div>

                {/* Droppable area */}
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 p-3 transition-colors rounded-b-2xl ${snapshot.isDraggingOver ? 'bg-indigo-50/50' : ''}`}
                    >
                      {colTasks.length === 0 && !snapshot.isDraggingOver && (
                        <div className="text-center text-slate-400 text-sm mt-10 flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-full bg-white/50 flex items-center justify-center border border-slate-200/50 shadow-sm">
                            <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          </div>
                          <span className="font-medium">لا توجد مهام</span>
                        </div>
                      )}
                      {colTasks.map((task, idx) => (
                        <TaskCard key={task.id} task={task} index={idx} onOpen={openTaskDetail} onDelete={handleDelete} />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                {/* Quick add */}
                <div className="p-3 pt-0">
                  <button onClick={() => { setShowCreate(true); }}
                    className="w-full py-2.5 text-sm font-medium text-slate-500 hover:text-indigo-600 hover:bg-white/80 rounded-xl transition-all border border-dashed border-slate-300 hover:border-indigo-300 flex items-center justify-center gap-1.5 bg-white/40">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    إضافة مهمة
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Create Modal */}
      <CreateTaskModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleTaskCreated}
        users={users}
      />

      {/* Detail Drawer */}
      {selectedTask && (
        <TaskDetailDrawer
          task={selectedTask}
          users={users}
          onClose={() => setSelectedTask(null)}
          onSave={handleTaskSaved}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
