import React, { useState } from 'react';
import { CleanedRecord } from '../types';
import { 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  PlusCircle, 
  CopyCheck, 
  Search, 
  X, 
  ArrowRight,
  ShieldCheck,
  Database
} from 'lucide-react';

interface ExcelImportDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  fileName: string;
  newRecords: CleanedRecord[];
  duplicateCount: number;
  totalRowsInFile: number;
  existingTotal: number;
  isConfirming: boolean;
  language: 'ar' | 'en';
  isDark?: boolean;
}

export const ExcelImportDiffModal: React.FC<ExcelImportDiffModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  fileName,
  newRecords,
  duplicateCount,
  totalRowsInFile,
  existingTotal,
  isConfirming,
  language,
  isDark = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'new' | 'summary'>('new');

  if (!isOpen) return null;

  const filteredNewRecords = newRecords.filter(r => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (r.name && r.name.toLowerCase().includes(term)) ||
      (r.hrCode && r.hrCode.toLowerCase().includes(term)) ||
      (r.courseName && r.courseName.toLowerCase().includes(term)) ||
      (r.department && r.department.toLowerCase().includes(term))
    );
  });

  const cardBg = isDark ? '#193158' : '#FFFFFF';
  const modalBg = isDark ? '#0F1E36' : '#FFFFFF';
  const borderColor = isDark ? 'rgba(148, 190, 255, 0.22)' : '#E2E8F0';
  const textColor = isDark ? '#FFFFFF' : '#0D1B2A';
  const textMuted = isDark ? '#C8DBF6' : '#64748B';
  const inputBg = isDark ? '#132543' : '#F8FAFC';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="w-full max-w-4xl rounded-2xl shadow-2xl border flex flex-col max-h-[90vh] overflow-hidden transition-all duration-300"
        style={{ backgroundColor: modalBg, borderColor }}
      >
        {/* Header */}
        <div 
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ 
            backgroundColor: isDark ? '#132543' : '#002D62', 
            borderColor: isDark ? 'rgba(148, 190, 255, 0.15)' : '#001D42' 
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFC000] text-[#002D62] flex items-center justify-center font-black shadow-xs">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>{language === 'ar' ? 'مراجعة وتأكيد استيراد البيانات الذكية' : 'Smart Excel Import & Diff Review'}</span>
              </h2>
              <p className="text-xs text-[#FFC000] font-semibold flex items-center gap-1.5 mt-0.5">
                <span className="truncate max-w-xs">{fileName}</span>
                <span>•</span>
                <span>{language === 'ar' ? 'مقارنة البيانات ومنع التكرار' : 'De-duplication & Merge Protection'}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={isConfirming}
            className="text-white/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Comparison KPI Summary */}
        <div className="p-6 border-b" style={{ borderColor, backgroundColor: isDark ? '#142747' : '#F8FAFC' }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            
            {/* Total in file */}
            <div className="p-3.5 rounded-xl border flex flex-col items-center justify-center text-center shadow-2xs" style={{ backgroundColor: cardBg, borderColor }}>
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                {language === 'ar' ? 'إجمالي صفوف الملف' : 'Total Rows in File'}
              </span>
              <span className="text-xl font-black" style={{ color: textColor }}>
                {totalRowsInFile.toLocaleString()}
              </span>
            </div>

            {/* Preserved / Duplicates skipped */}
            <div className="p-3.5 rounded-xl border flex flex-col items-center justify-center text-center shadow-2xs border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20">
              <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1">
                <CopyCheck size={13} />
                <span>{language === 'ar' ? 'سجلات موجودة مسبقاً' : 'Existing (Safe)'}</span>
              </span>
              <span className="text-xl font-black text-blue-700 dark:text-blue-300">
                {duplicateCount.toLocaleString()}
              </span>
              <span className="text-[10px] text-blue-600/80 dark:text-blue-400 font-medium">
                {language === 'ar' ? 'لن تتكرر (تم حفظها)' : 'Protected from dup'}
              </span>
            </div>

            {/* New records to append */}
            <div className="p-3.5 rounded-xl border-2 flex flex-col items-center justify-center text-center shadow-2xs border-emerald-500/60 bg-emerald-50/60 dark:bg-emerald-950/30">
              <span className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 mb-1 flex items-center gap-1">
                <PlusCircle size={13} className="text-emerald-600 dark:text-emerald-400" />
                <span>{language === 'ar' ? 'سجلات جديدة ستضاف' : 'New Records to Add'}</span>
              </span>
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                +{newRecords.length.toLocaleString()}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                {language === 'ar' ? 'جاهزة للحفظ' : 'Ready to merge'}
              </span>
            </div>

            {/* Final expected total */}
            <div className="p-3.5 rounded-xl border flex flex-col items-center justify-center text-center shadow-2xs border-amber-300 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20">
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 mb-1 flex items-center gap-1">
                <Database size={13} />
                <span>{language === 'ar' ? 'إجمالي السجلات بعد الدمج' : 'Projected Total'}</span>
              </span>
              <span className="text-xl font-black text-amber-800 dark:text-amber-300">
                {(existingTotal + newRecords.length).toLocaleString()}
              </span>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                {language === 'ar' ? 'السابق + الجديد' : `${existingTotal} + ${newRecords.length}`}
              </span>
            </div>

          </div>

          {/* Safety Notice Banner */}
          <div className="mt-3.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center gap-2.5 text-xs text-emerald-900 dark:text-emerald-200">
            <ShieldCheck size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>
              {language === 'ar'
                ? 'ضمان حماية البيانات: لن يتم مسح أي سجلات قديمة إطلاقاً. النظام سيقوم فقط بإلحاق السجلات الجديدة بدون أي تكرار.'
                : 'Zero-Data-Loss Guarantee: Your existing records will remain 100% intact. Only brand-new unrecorded sessions will be safely appended.'}
            </span>
          </div>
        </div>

        {/* Content Area - New Records Table Preview */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-black" style={{ color: textColor }}>
                {language === 'ar' ? 'معاينة السجلات الجديدة المكتشفة' : 'Preview of New Identified Records'}
                <span className="ml-2 text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 font-bold">
                  {filteredNewRecords.length}
                </span>
              </h3>
              <p className="text-xs" style={{ color: textMuted }}>
                {language === 'ar' ? 'هذه السجلات لم تكن موجودة مسبقاً وسيتم إضافتها إلى السجلات الشاملة' : 'These records do not exist in the database and will be merged upon approval'}
              </p>
            </div>

            {newRecords.length > 0 && (
              <div className="relative min-w-[220px]">
                <Search size={14} className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={language === 'ar' ? 'بحث في السجلات الجديدة...' : 'Search new records...'}
                  className="w-full pl-8 rtl:pl-3 rtl:pr-8 pr-3 py-1.5 rounded-xl border text-xs font-medium outline-none focus:ring-2 focus:ring-[#002D62]"
                  style={{ backgroundColor: inputBg, borderColor, color: textColor }}
                />
              </div>
            )}
          </div>

          {newRecords.length === 0 ? (
            <div className="py-12 text-center border rounded-2xl p-6" style={{ borderColor, backgroundColor: cardBg }}>
              <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-3" />
              <h4 className="text-base font-black" style={{ color: textColor }}>
                {language === 'ar' ? 'جميع بيانات هذا الملف موجودة بالفعل!' : 'All Records in this File Already Exist!'}
              </h4>
              <p className="text-xs mt-1 max-w-md mx-auto" style={{ color: textMuted }}>
                {language === 'ar'
                  ? 'قام النظام بمطابقة كافة صفوف الملف مع السجلات الحالية، وتبين أن جميعها مسجل مسبقاً. لم يتم العثور على سجلات جديدة، ولا داعي للدمج لتجنب التكرار.'
                  : 'All rows match verified records currently in the database. No new sessions detected; no merge needed to prevent duplicates.'}
              </p>
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden shadow-2xs" style={{ borderColor }}>
              <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-xs text-left rtl:text-right">
                  <thead 
                    className="sticky top-0 z-10 text-[11px] font-bold uppercase tracking-wider text-white"
                    style={{ backgroundColor: isDark ? '#132543' : '#002D62' }}
                  >
                    <tr>
                      <th className="px-3 py-2.5">#</th>
                      <th className="px-3 py-2.5">{language === 'ar' ? 'الكود' : 'HR Code'}</th>
                      <th className="px-3 py-2.5">{language === 'ar' ? 'المتدرب' : 'Trainee Name'}</th>
                      <th className="px-3 py-2.5">{language === 'ar' ? 'الدورة التدريبية' : 'Course Title'}</th>
                      <th className="px-3 py-2.5">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                      <th className="px-3 py-2.5">{language === 'ar' ? 'الدرجة' : 'Score'}</th>
                      <th className="px-3 py-2.5">{language === 'ar' ? 'الفئة' : 'Role'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor }}>
                    {filteredNewRecords.slice(0, 100).map((r, idx) => (
                      <tr key={r.id || idx} className="hover:bg-blue-50/30 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-3 py-2 font-mono text-[10px]" style={{ color: textMuted }}>{idx + 1}</td>
                        <td className="px-3 py-2 font-bold font-mono text-[#002D62] dark:text-[#FFC000]">
                          #{r.hrCode || r.userId}
                        </td>
                        <td className="px-3 py-2 font-bold" style={{ color: textColor }}>
                          {r.name || r.traineeName || 'N/A'}
                        </td>
                        <td className="px-3 py-2" style={{ color: textColor }}>
                          <span className="font-semibold text-blue-700 dark:text-blue-300">{r.courseName}</span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap font-mono text-[11px]" style={{ color: textMuted }}>
                          {r.attendanceDate || r.date || 'N/A'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap font-bold text-emerald-600 dark:text-emerald-400">
                          {r.score ?? 'Pass'}
                        </td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 capitalize" style={{ color: textColor }}>
                            {r.role || 'technician'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredNewRecords.length > 100 && (
                <div className="px-4 py-2 border-t text-center text-xs font-semibold" style={{ borderColor, backgroundColor: cardBg, color: textMuted }}>
                  {language === 'ar' 
                    ? `يتم عرض أول 100 سجل من أصل ${filteredNewRecords.length} سجل جديد...`
                    : `Showing first 100 of ${filteredNewRecords.length} new records...`}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div 
          className="px-6 py-4 border-t flex items-center justify-between gap-3"
          style={{ borderColor, backgroundColor: isDark ? '#132543' : '#F8FAFC' }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className="px-4 py-2.5 rounded-xl border text-xs font-bold transition-all hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
            style={{ borderColor, color: textColor }}
          >
            {language === 'ar' ? 'إلغاء الأمر' : 'Cancel'}
          </button>

          {newRecords.length > 0 ? (
            <button
              type="button"
              onClick={onConfirm}
              disabled={isConfirming}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-[#FFC000] text-[#002D62] hover:bg-yellow-400 active:scale-95 transition-all shadow-md cursor-pointer hover:scale-[1.02] disabled:opacity-50"
            >
              <CheckCircle2 size={18} className="stroke-[2.5]" />
              <span>
                {isConfirming
                  ? (language === 'ar' ? 'جاري دمج السجلات بأمان...' : 'Safely Merging Records...')
                  : (language === 'ar' ? `موافق • اعتماد وإضافة ${newRecords.length} سجل جديد` : `Approve & Add ${newRecords.length} New Records`)}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-[#002D62] text-white hover:bg-blue-900 transition-all shadow-sm cursor-pointer"
            >
              {language === 'ar' ? 'إغلاق (لا توجد بيانات جديدة)' : 'Close (No New Data)'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
