import { motion } from 'framer-motion';
import {
  FiRefreshCw, FiDatabase, FiShield, FiLink,
  FiCheck, FiPlus
} from 'react-icons/fi';

export default function ADDepartmentsTab({
  deptView, setDeptView,
  ousList, groupsList, syncedDepts,
  selectedOUs, setSelectedOUs,
  selectedGroups, setSelectedGroups,
  fetchingOUs, fetchingGroups, syncingDepts,
  handleFetchOUs, handleFetchGroups,
  handleSyncAsDepts, fetchSyncedDepts
}) {
  return (
    <motion.div key="departments" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>

      {/* Sub navigation */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'ous', label: 'OUs (وحدات تنظيمية)' },
          { id: 'groups', label: 'Groups (مجموعات)' },
          { id: 'synced', label: 'الأقسام المربوطة' },
        ].map(v => (
          <button key={v.id} onClick={() => setDeptView(v.id)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${deptView === v.id ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>
            {v.label}
          </button>
        ))}
      </div>

      {/* ── OUs View ── */}
      {deptView === 'ous' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <FiDatabase className="text-blue-500" /> وحدات التنظيم (OUs)
              </h3>
              <p className="text-sm text-gray-500">الهيكل التنظيمي للدومين</p>
            </div>
            <div className="flex gap-2">
              {ousList.length > 0 && selectedOUs.length > 0 && (
                <button onClick={() => handleSyncAsDepts(selectedOUs.map(i => ousList[i]))}
                  disabled={syncingDepts}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm">
                  {syncingDepts ? <FiRefreshCw className="animate-spin" /> : <FiCheck />}
                  مزامنة المحدد ({selectedOUs.length})
                </button>
              )}
              <button onClick={handleFetchOUs} disabled={fetchingOUs}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm">
                {fetchingOUs ? <FiRefreshCw className="animate-spin" /> : <FiRefreshCw />}
                جلب OUs
              </button>
            </div>
          </div>

          {ousList.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm">
              <FiDatabase className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">اضغط "جلب OUs" لعرض الوحدات المتوفرة من السيرفر</p>
            </div>
          ) : (
            <>
              {/* Select All Bar */}
              <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm mb-4 flex items-center">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer font-bold hover:text-blue-600 transition-colors select-none">
                  <input type="checkbox"
                    checked={selectedOUs.length === ousList.length}
                    onChange={() => setSelectedOUs(selectedOUs.length === ousList.length ? [] : ousList.map((_, i) => i))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4" />
                  تحديد الكل ({ousList.length})
                </label>
              </div>

              {/* Grid Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {ousList.map((ou, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setSelectedOUs(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                    className={`bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition cursor-pointer relative ${selectedOUs.includes(i) ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-100'}`}
                  >
                    <div className="absolute top-4 left-4">
                      <input 
                        type="checkbox" 
                        checked={selectedOUs.includes(i)}
                        onChange={(e) => { e.stopPropagation(); setSelectedOUs(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]); }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4" 
                      />
                    </div>
                    
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FiDatabase className="text-amber-600 w-5 h-5" />
                      </div>
                      <div className="min-w-0 pr-6">
                        <p className="text-xs text-gray-500 font-medium uppercase">OU</p>
                        <p className="font-bold text-gray-800 text-sm truncate" title={ou.display_name}>{ou.display_name}</p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                       <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-100 truncate" title={ou.distinguished_name}>
                         {ou.distinguished_name}
                       </div>
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-gray-50">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSyncAsDepts([ou]);
                        }}
                        disabled={syncingDepts}
                        className="flex-1 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                      >
                         <FiPlus size={14} /> مزامنة كقسم
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Groups View ── */}
      {deptView === 'groups' && (
        <>
          <div className="flex justify-between items-center mb-4">
             <div>
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <FiShield className="text-purple-500" /> مجموعات AD (Groups)
              </h3>
              <p className="text-sm text-gray-500">مجموعات الدومين المستخدمة</p>
            </div>
            <div className="flex gap-2">
              {groupsList.length > 0 && selectedGroups.length > 0 && (
                <button onClick={() => handleSyncAsDepts(selectedGroups.map(i => groupsList[i]))}
                  disabled={syncingDepts}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm">
                  {syncingDepts ? <FiRefreshCw className="animate-spin" /> : <FiCheck />}
                   مزامنة المحدد ({selectedGroups.length})
                </button>
              )}
              <button onClick={handleFetchGroups} disabled={fetchingGroups}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 disabled:opacity-60 transition-colors shadow-sm">
                {fetchingGroups ? <FiRefreshCw className="animate-spin" /> : <FiRefreshCw />}
                جلب Groups
              </button>
            </div>
          </div>

          {groupsList.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm">
              <FiShield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">اضغط "جلب Groups" لعرض المجموعات</p>
            </div>
          ) : (
             <>
              <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm mb-4 flex items-center">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer font-bold hover:text-purple-600 transition-colors select-none">
                  <input type="checkbox"
                    checked={selectedGroups.length === groupsList.length}
                    onChange={() => setSelectedGroups(selectedGroups.length === groupsList.length ? [] : groupsList.map((_, i) => i))}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-4 h-4" />
                  تحديد الكل ({groupsList.length})
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {groupsList.map((grp, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setSelectedGroups(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                    className={`bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition cursor-pointer relative ${selectedGroups.includes(i) ? 'border-purple-500 ring-1 ring-purple-500' : 'border-gray-100'}`}
                  >
                     <div className="absolute top-4 left-4">
                      <input 
                        type="checkbox" 
                        checked={selectedGroups.includes(i)}
                        onChange={(e) => { e.stopPropagation(); setSelectedGroups(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]); }}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-4 h-4" 
                      />
                    </div>

                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FiShield className="text-purple-600 w-5 h-5" />
                      </div>
                      <div className="min-w-0 pr-6">
                        <p className="text-xs text-gray-500 font-medium uppercase">Group</p>
                        <p className="font-bold text-gray-800 text-sm truncate" title={grp.display_name}>{grp.display_name}</p>
                      </div>
                    </div>

                     <div className="space-y-2 mb-4">
                       <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-100 truncate" title={grp.distinguished_name}>
                         {grp.distinguished_name}
                       </div>
                       <div className="flex items-center gap-1 text-xs text-gray-500">
                          <span className="font-bold text-purple-600">{grp.member_count || 0}</span> عضو
                       </div>
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-gray-50">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSyncAsDepts([grp]);
                        }}
                        disabled={syncingDepts}
                        className="flex-1 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                      >
                         <FiPlus size={14} /> مزامنة كقسم
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Synced Departments View ── */}
      {deptView === 'synced' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
              <FiLink className="text-emerald-500" /> الأقسام المربوطة بـ AD
            </h3>
            <button onClick={fetchSyncedDepts}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 font-bold bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition">
              <FiRefreshCw size={14} /> تحديث القائمة
            </button>
          </div>

          {syncedDepts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm">
              <FiLink className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium mb-1">لا توجد أقسام مربوطة بعد</p>
              <p className="text-sm text-gray-400">يمكنك جلب OUs أو Groups ثم تحويلها لأقسام</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {syncedDepts.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition"
                >
                   <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${item.type === 'ou' ? 'bg-amber-100' : 'bg-purple-100'}`}>
                        {item.type === 'ou'
                          ? <FiDatabase className={`w-5 h-5 ${item.type === 'ou' ? 'text-amber-600' : 'text-purple-600'}`} />
                          : <FiShield className={`w-5 h-5 ${item.type === 'ou' ? 'text-amber-600' : 'text-purple-600'}`} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                           <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${item.type === 'ou' ? 'bg-amber-50 text-amber-700' : 'bg-purple-50 text-purple-700'}`}>
                              {item.type}
                           </span>
                           {item.member_count > 0 && <span className="text-[10px] text-gray-400">({item.member_count})</span>}
                        </div>
                        <p className="font-bold text-gray-800 text-sm truncate" title={item.name}>{item.name}</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-2 rounded border border-gray-100 mb-3">
                         <p className="text-xs text-gray-500 truncate" title={item.distinguished_name}>
                           {item.distinguished_name}
                         </p>
                    </div>

                    {item.dept_name ? (
                      <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
                        <FiCheck size={14} className="flex-shrink-0" />
                        <span className="text-xs font-bold truncate">مربوط: {item.dept_name}</span>
                      </div>
                    ) : (
                       <div className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg border border-red-100 text-center font-bold">
                         غير مربوط بقسم
                       </div>
                    )}
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
