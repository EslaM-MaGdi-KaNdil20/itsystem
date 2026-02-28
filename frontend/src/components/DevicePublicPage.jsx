import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const API_URL = `${window.location.protocol}//${window.location.hostname}:3000/api`;

const STATUS_MAP = {
  available:   { label: 'متاح',       color: '#16a34a', bg: '#dcfce7' },
  assigned:    { label: 'مُسلَّم',      color: '#2563eb', bg: '#dbeafe' },
  maintenance: { label: 'صيانة',      color: '#d97706', bg: '#fef9c3' },
  retired:     { label: 'خارج الخدمة', color: '#6b7280', bg: '#f3f4f6' },
};

const TYPE_COLORS = {
  windows:   '#0078d4', office: '#d83b01', server: '#5c2d91',
  antivirus: '#107c10', cad:    '#ca5010', erp:    '#0b6a0b', other: '#4a4a4a',
};
const TYPE_LABELS = {
  windows: 'Windows', office: 'Microsoft Office', server: 'Server',
  antivirus: 'Antivirus', cad: 'CAD/Design', erp: 'ERP', other: 'أخرى',
};

export default function DevicePublicPage() {
  const { id } = useParams();
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/devices/public/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject('not found'))
      .then(data => { setDevice(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
    </div>
  );

  if (error || !device) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="text-6xl mb-4">❌</div>
      <h1 className="text-xl font-bold text-slate-800">الجهاز غير موجود</h1>
      <p className="text-slate-500 mt-2 text-sm">تأكد من رقم الجهاز أو تواصل مع قسم IT</p>
    </div>
  );

  const status = STATUS_MAP[device.status] || STATUS_MAP.available;

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-indigo-700 to-slate-900 text-white px-5 pt-10 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center text-2xl">
            💻
          </div>
          <div>
            <p className="text-indigo-200 text-xs font-medium uppercase tracking-wide">IT Asset</p>
            <h1 className="text-2xl font-extrabold leading-tight">
              {device.brand} {device.model}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {device.asset_tag && (
            <span className="bg-white/15 backdrop-blur px-3 py-1 rounded-full text-xs font-mono font-bold">
              🏷️ {device.asset_tag}
            </span>
          )}
          <span className="px-3 py-1 rounded-full text-xs font-bold"
            style={{ background: status.bg, color: status.color }}>
            {status.label}
          </span>
          <span className="bg-white/15 backdrop-blur px-3 py-1 rounded-full text-xs">
            {device.device_type_ar}
          </span>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">

        {/* Device Info */}
        <Section title="بيانات الجهاز" icon="🖥️">
          <Row label="الماركة / الموديل" value={`${device.brand} ${device.model}`} />
          {device.serial_number && <Row label="Serial Number" value={device.serial_number} mono />}
          {device.asset_tag    && <Row label="Asset Tag"      value={device.asset_tag}     mono />}
          {device.location     && <Row label="الموقع"         value={device.location} />}
          {device.purchase_date && (
            <Row label="تاريخ الشراء" value={new Date(device.purchase_date).toLocaleDateString('ar-EG')} />
          )}
          {device.warranty_end && (
            <Row
              label="نهاية الضمان"
              value={new Date(device.warranty_end).toLocaleDateString('ar-EG')}
              highlight={new Date(device.warranty_end) < new Date() ? 'red' : new Date(device.warranty_end) < new Date(Date.now() + 30*24*60*60*1000) ? 'orange' : null}
            />
          )}
        </Section>

        {/* Current Assignment */}
        {device.current_assignment ? (
          <Section title="المستلم الحالي" icon="👤" accentColor="#2563eb">
            <Row label="الاسم"         value={device.current_assignment.employee_name} bold />
            {device.current_assignment.job_title      && <Row label="المسمى الوظيفي" value={device.current_assignment.job_title} />}
            {device.current_assignment.department_name && <Row label="القسم"          value={device.current_assignment.department_name} />}
            {device.current_assignment.windows_username && <Row label="Windows User"  value={device.current_assignment.windows_username} mono />}
            <Row label="تاريخ الاستلام" value={new Date(device.current_assignment.assigned_date).toLocaleDateString('ar-EG')} />
          </Section>
        ) : (
          <Section title="المستلم الحالي" icon="👤" accentColor="#16a34a">
            <p className="text-sm text-slate-500 py-1">الجهاز غير مُسلَّم حالياً</p>
          </Section>
        )}

        {/* Licenses */}
        {device.licenses?.length > 0 && (
          <Section title={`الليسنز المُركَّبة (${device.licenses.length})`} icon="🔑" accentColor="#7c3aed">
            <div className="space-y-2 pt-1">
              {device.licenses.map((lic, i) => (
                <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: TYPE_COLORS[lic.type] || '#4a4a4a' }}>
                    {(TYPE_LABELS[lic.type] || 'L').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{lic.name}</p>
                    <p className="text-xs text-slate-500">{lic.vendor} — {TYPE_LABELS[lic.type] || lic.type}</p>
                    {lic.license_key && (
                      <p className="text-xs font-mono text-slate-400 mt-0.5 truncate">{lic.license_key}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Recent Maintenance */}
        {device.recent_maintenance?.length > 0 && (
          <Section title="آخر الصيانات" icon="🔧" accentColor="#d97706">
            <div className="space-y-2 pt-1">
              {device.recent_maintenance.map((m, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${m.status === 'completed' ? 'bg-green-500' : 'bg-amber-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">{m.description || m.type}</p>
                    <p className="text-xs text-slate-400">{m.start_date ? new Date(m.start_date).toLocaleDateString('ar-EG') : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Notes */}
        {device.notes && (
          <Section title="ملاحظات" icon="📝">
            <p className="text-sm text-slate-600 leading-relaxed">{device.notes}</p>
          </Section>
        )}

        {/* Footer */}
        <div className="text-center py-4 text-xs text-slate-300">
          <p>نظام إدارة أصول تقنية المعلومات</p>
          <p className="mt-0.5 font-mono">Device ID: {device.id}</p>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────
function Section({ title, icon, accentColor = '#6366f1', children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-50"
        style={{ borderRight: `4px solid ${accentColor}` }}>
        <span>{icon}</span>
        <h2 className="font-bold text-slate-800 text-sm">{title}</h2>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function Row({ label, value, mono, bold, highlight }) {
  const textColor = highlight === 'red' ? 'text-red-600 font-bold' : highlight === 'orange' ? 'text-orange-600 font-bold' : bold ? 'text-slate-800 font-bold' : 'text-slate-700';
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-400 shrink-0 ml-2">{label}</span>
      <span className={`text-sm ${textColor} ${mono ? 'font-mono' : ''} text-left truncate`}>{value}</span>
    </div>
  );
}
