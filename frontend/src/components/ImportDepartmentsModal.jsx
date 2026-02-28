import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

const API_URL = `${window.location.protocol}//${window.location.hostname}:3000/api`;

export default function ImportDepartmentsModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleClose = () => {
    setStep(1);
    setFile(null);
    setPreviewData(null);
    setImportResult(null);
    onClose();
  };

  const downloadTemplate = async () => {
    try {
      toast.loading('جاري تحميل القالب...', { id: 'template' });
      const response = await fetch(`${API_URL}/departments/import/template`);
      if (!response.ok) throw new Error('Failed to download template');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'departments_import_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('تم تحميل القالب بنجاح', { id: 'template' });
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ في تحميل القالب', { id: 'template' });
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls') || droppedFile.name.endsWith('.csv'))) {
      setFile(droppedFile);
    } else {
      toast.error('يرجى رفع ملف Excel أو CSV');
    }
  };

  const handlePreview = async () => {
    if (!file) {
      toast.error('يرجى اختيار ملف أولاً');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/departments/import/preview`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'حدث خطأ في معالجة الملف');
      }

      setPreviewData(data);
      setStep(2);
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/departments/import/execute`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'حدث خطأ في استيراد البيانات');
      }

      setImportResult(data);
      setStep(3);
      toast.success(data.message);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">استيراد الأقسام من Excel</h2>
                <p className="text-purple-100 text-sm mt-1">
                  {step === 1 && 'الخطوة 1: رفع الملف'}
                  {step === 2 && 'الخطوة 2: معاينة البيانات'}
                  {step === 3 && 'الخطوة 3: نتيجة الاستيراد'}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Progress Steps */}
            <div className="flex justify-center mt-4">
              <div className="flex items-center gap-2">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                      ${step >= s ? 'bg-white text-purple-600' : 'bg-purple-500 text-white'}`}>
                      {step > s ? '✓' : s}
                    </div>
                    {s < 3 && <div className={`w-12 h-1 mx-1 ${step > s ? 'bg-white' : 'bg-purple-500'}`} />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {/* Step 1: Upload */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-purple-900">تحميل القالب</h3>
                      <p className="text-sm text-purple-700">قم بتحميل قالب Excel واملأه بالبيانات</p>
                    </div>
                    <button
                      onClick={downloadTemplate}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm"
                    >
                      تحميل القالب
                    </button>
                  </div>
                </div>

                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition
                    ${file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'}`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                  />
                  
                  {file ? (
                    <div className="space-y-3">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-green-700">{file.name}</p>
                        <p className="text-sm text-green-600">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button
                        onClick={() => setFile(null)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        إزالة الملف
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-gray-600">اسحب الملف هنا أو</p>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="text-purple-600 font-semibold hover:underline"
                        >
                          اختر ملف من جهازك
                        </button>
                      </div>
                      <p className="text-sm text-gray-500">يدعم: Excel (.xlsx, .xls) و CSV</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Preview */}
            {step === 2 && previewData && (
              <div className="space-y-6">
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-gray-700">{previewData.summary.total}</div>
                    <div className="text-sm text-gray-500">إجمالي الصفوف</div>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{previewData.summary.valid}</div>
                    <div className="text-sm text-green-600">جديد</div>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{previewData.summary.updates}</div>
                    <div className="text-sm text-blue-600">تحديث</div>
                  </div>
                  <div className="bg-red-50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{previewData.summary.invalid}</div>
                    <div className="text-sm text-red-600">خطأ</div>
                  </div>
                </div>

                {previewData.valid.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <h3 className="font-semibold text-green-800 mb-3">✓ سيتم إضافة ({previewData.valid.length})</h3>
                    <div className="max-h-40 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="text-green-700">
                          <tr>
                            <th className="text-right p-2">الكود</th>
                            <th className="text-right p-2">الاسم</th>
                            <th className="text-right p-2">الموقع</th>
                            <th className="text-right p-2">المدير</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.valid.map((dept, i) => (
                            <tr key={i} className="border-t border-green-200">
                              <td className="p-2">{dept.code || '-'}</td>
                              <td className="p-2">{dept.name}</td>
                              <td className="p-2">{dept.location || '-'}</td>
                              <td className="p-2">{dept.manager_name || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {previewData.updates.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h3 className="font-semibold text-blue-800 mb-3">↻ سيتم تحديث ({previewData.updates.length})</h3>
                    <div className="max-h-40 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="text-blue-700">
                          <tr>
                            <th className="text-right p-2">الكود</th>
                            <th className="text-right p-2">الاسم</th>
                            <th className="text-right p-2">الموقع</th>
                            <th className="text-right p-2">المدير</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.updates.map((dept, i) => (
                            <tr key={i} className="border-t border-blue-200">
                              <td className="p-2">{dept.code}</td>
                              <td className="p-2">{dept.name}</td>
                              <td className="p-2">{dept.location || '-'}</td>
                              <td className="p-2">{dept.manager_name || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {previewData.invalid.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <h3 className="font-semibold text-red-800 mb-3">✗ أخطاء ({previewData.invalid.length})</h3>
                    <div className="max-h-40 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="text-red-700">
                          <tr>
                            <th className="text-right p-2">الصف</th>
                            <th className="text-right p-2">الاسم</th>
                            <th className="text-right p-2">الأخطاء</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.invalid.map((dept, i) => (
                            <tr key={i} className="border-t border-red-200">
                              <td className="p-2">{dept.row}</td>
                              <td className="p-2">{dept.name || '-'}</td>
                              <td className="p-2 text-red-600">{dept.errors.join('، ')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Result */}
            {step === 3 && importResult && (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-gray-800">تم الاستيراد بنجاح!</h3>
                  <p className="text-gray-600 mt-2">{importResult.message}</p>
                </div>

                <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                  <div className="bg-green-50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-green-600">{importResult.results.inserted}</div>
                    <div className="text-sm text-green-600">تم إضافتهم</div>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-blue-600">{importResult.results.updated}</div>
                    <div className="text-sm text-blue-600">تم تحديثهم</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-gray-600">{importResult.results.skipped}</div>
                    <div className="text-sm text-gray-600">تم تجاهلهم</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t p-4 flex justify-between items-center bg-gray-50">
            <button
              onClick={step === 1 ? handleClose : () => setStep(step - 1)}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 transition"
              disabled={loading || step === 3}
            >
              {step === 1 ? 'إلغاء' : step === 3 ? '' : 'السابق'}
            </button>

            {step === 1 && (
              <button
                onClick={handlePreview}
                disabled={!file || loading}
                className={`px-6 py-2 rounded-lg transition flex items-center gap-2
                  ${file && !loading ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    جاري المعالجة...
                  </>
                ) : 'معاينة'}
              </button>
            )}

            {step === 2 && (
              <button
                onClick={handleImport}
                disabled={loading || (previewData.summary.valid === 0 && previewData.summary.updates === 0)}
                className={`px-6 py-2 rounded-lg transition flex items-center gap-2
                  ${!loading && (previewData.summary.valid > 0 || previewData.summary.updates > 0)
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
              >
                {loading ? 'جاري الاستيراد...' : 'تأكيد الاستيراد'}
              </button>
            )}

            {step === 3 && (
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                إغلاق
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
