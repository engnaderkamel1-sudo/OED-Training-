import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  CheckCircle2, 
  Trash2, 
  Clock, 
  User, 
  Globe, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  ShieldAlert,
  Terminal,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

export interface SystemErrorReport {
  id: string;
  message: string;
  stack?: string;
  componentStack?: string;
  url?: string;
  userName?: string;
  userHrCode?: string;
  userRole?: string;
  userId?: string;
  timestamp?: any;
  status?: 'open' | 'resolved';
  resolvedAt?: any;
}

export const SystemErrorsPage: React.FC = () => {
  const { language, theme, setCurrentView } = useAppContext();
  const isDark = theme === 'dark';
  const isAr = language === 'ar';

  const [errors, setErrors] = useState<SystemErrorReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [expandedErrorId, setExpandedErrorId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [simulateCrash, setSimulateCrash] = useState(false);

  if (simulateCrash) {
    throw new Error("تجربة محاكاة عطل برمجي لفحص شاشة الطوارئ وإرسال التقرير (Simulated Error Boundary Test)");
  }

  // Subscribe to real-time error reports
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'error_reports'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reports: SystemErrorReport[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as SystemErrorReport[];
      setErrors(reports);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching system errors:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleToggleStatus = async (report: SystemErrorReport) => {
    try {
      setActionLoading(report.id);
      const newStatus = report.status === 'resolved' ? 'open' : 'resolved';
      await updateDoc(doc(db, 'error_reports', report.id), {
        status: newStatus,
        resolvedAt: newStatus === 'resolved' ? serverTimestamp() : null
      });
    } catch (e) {
      console.error('Failed to update error status:', e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteError = async (id: string) => {
    if (!window.confirm(isAr ? 'هل أنت متأكد من حذف هذا السجل؟' : 'Are you sure you want to delete this error report?')) return;
    try {
      setActionLoading(id);
      await deleteDoc(doc(db, 'error_reports', id));
    } catch (e) {
      console.error('Failed to delete error report:', e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearResolved = async () => {
    const resolvedErrors = errors.filter(e => e.status === 'resolved');
    if (resolvedErrors.length === 0) return;
    if (!window.confirm(isAr ? `هل تريد حذف ${resolvedErrors.length} سجل أخطاء تم حلها؟` : `Delete ${resolvedErrors.length} resolved error reports?`)) return;
    
    try {
      setLoading(true);
      const batch = writeBatch(db);
      resolvedErrors.forEach(e => {
        batch.delete(doc(db, 'error_reports', e.id));
      });
      await batch.commit();
    } catch (e) {
      console.error('Failed to clear resolved errors:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredErrors = errors.filter(err => {
    const matchesSearch = 
      (err.message || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (err.userName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (err.userHrCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (err.url || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = 
      statusFilter === 'all' ? true :
      statusFilter === 'open' ? (err.status !== 'resolved') :
      (err.status === 'resolved');

    return matchesSearch && matchesStatus;
  });

  const openErrorsCount = errors.filter(e => e.status !== 'resolved').length;

  const cardColor = isDark ? '#111E38' : '#FFFFFF';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0';
  const textColor = isDark ? '#FFFFFF' : '#002D62';

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Page Header */}
      <div 
        className="p-5 sm:p-6 rounded-2xl border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{ backgroundColor: cardColor, borderColor }}
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-200 dark:border-red-800 shadow-xs shrink-0">
            <ShieldAlert size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black" style={{ color: textColor }}>
                {isAr ? 'سجل تقارير أخطاء النظام' : 'System Error Reports'}
              </h1>
              {openErrorsCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-500 text-white animate-pulse">
                  {openErrorsCount} {isAr ? 'خطأ مفتوح' : 'Open'}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {isAr ? 'متابعة وفحص الأعطال البرمجية المبلغ عنها تلقائياً من المستخدمين' : 'Track and investigate automated client-side error reports'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {errors.some(e => e.status === 'resolved') && (
            <button
              type="button"
              onClick={handleClearResolved}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Trash2 size={14} />
              <span>{isAr ? 'تنظيف المحلول' : 'Clear Resolved'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setSimulateCrash(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 active:scale-95 text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm border border-amber-600"
            title={isAr ? 'تجربة ظهور شاشة الخطأ وزر الرجوع وإرسال التقرير' : 'Simulate Error Screen & Recovery'}
          >
            <span>🧪 {isAr ? 'تجربة شاشة الخطأ' : 'Test Error Screen'}</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentView('dashboard')}
            className="px-4 py-2 bg-[#002D62] hover:bg-blue-900 text-[#FFC000] font-black rounded-xl cursor-pointer shadow-md transition-all hover:scale-105 flex items-center gap-2 text-xs sm:text-sm"
          >
            {isAr ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
            <span>{isAr ? 'العودة للرئيسية' : 'Back to Dashboard'}</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div 
        className="p-4 rounded-2xl border shadow-sm flex flex-col sm:flex-row gap-3.5 items-center justify-between"
        style={{ backgroundColor: cardColor, borderColor }}
      >
        <div className="relative w-full sm:w-96">
          <Search size={16} className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'بحث في رسائل الخطأ، الموظف، الرابط...' : 'Search error message, user, URL...'}
            className="w-full pl-10 pr-4 rtl:pl-4 rtl:pr-10 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border bg-slate-50 dark:bg-[#0D1829] text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            style={{ borderColor }}
          />
        </div>

        <div className="flex rounded-xl p-1 bg-gray-100 dark:bg-slate-800 border w-full sm:w-auto justify-center" style={{ borderColor }}>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${statusFilter === 'all' ? 'bg-[#002D62] text-white shadow-xs' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
          >
            {isAr ? 'الكل' : 'All'} ({errors.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('open')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${statusFilter === 'open' ? 'bg-red-600 text-white shadow-xs' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
          >
            {isAr ? 'مفتوح' : 'Open'} ({openErrorsCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('resolved')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${statusFilter === 'resolved' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
          >
            {isAr ? 'محلول' : 'Resolved'} ({errors.length - openErrorsCount})
          </button>
        </div>
      </div>

      {/* Errors Content List */}
      <div className="space-y-3.5">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-center p-8 rounded-2xl border" style={{ backgroundColor: cardColor, borderColor }}>
            <RefreshCw size={32} className="animate-spin text-blue-500 mb-3" />
            <p className="text-sm font-bold text-gray-500">{isAr ? 'جاري تحميل سجلات الأخطاء...' : 'Loading error reports...'}</p>
          </div>
        ) : filteredErrors.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center p-8 rounded-2xl border shadow-sm" style={{ backgroundColor: cardColor, borderColor }}>
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 border border-emerald-200 dark:border-emerald-800 shadow-xs">
              <CheckCircle2 size={34} />
            </div>
            <h3 className="text-lg font-black text-gray-800 dark:text-gray-100 mb-1">
              {isAr ? 'لا توجد أخطاء مسجلة' : 'No Error Reports Found'}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md">
              {isAr ? 'كافة مكونات المنظومة تعمل باستقرار تام دون تسجيل أي أعطال برمجية.' : 'System is running smoothly without logged application errors.'}
            </p>
          </div>
        ) : (
          filteredErrors.map((report) => {
            const isResolved = report.status === 'resolved';
            const isExpanded = expandedErrorId === report.id;
            const dateStr = report.timestamp?.toDate ? report.timestamp.toDate().toLocaleString(isAr ? 'ar-EG' : 'en-US') : (report.timestamp ? String(report.timestamp) : 'Just now');

            return (
              <div 
                key={report.id}
                className={`rounded-2xl border transition-all ${isResolved ? 'opacity-75 bg-slate-50/70 dark:bg-slate-900/40' : 'bg-white dark:bg-[#111E38] shadow-sm hover:shadow-md'}`}
                style={{ borderColor }}
              >
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider ${isResolved ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700' : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700'}`}>
                        {isResolved ? (isAr ? 'محلول ✅' : 'Resolved') : (isAr ? 'غير محلول ⚠️' : 'Active Error')}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 font-mono">
                        <Clock size={12} />
                        {dateStr}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-black text-red-600 dark:text-red-400 break-words font-mono">
                      {report.message}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3.5 text-xs text-gray-600 dark:text-gray-300 font-medium">
                      {report.userName && (
                        <span className="flex items-center gap-1.5">
                          <User size={13} className="text-blue-500" />
                          <span className="font-bold">{report.userName} {report.userHrCode ? `(#${report.userHrCode})` : ''}</span>
                        </span>
                      )}
                      {report.url && (
                        <span className="flex items-center gap-1.5 max-w-sm truncate text-gray-400">
                          <Globe size={13} />
                          <span className="truncate">{report.url}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(report)}
                      disabled={actionLoading === report.id}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${isResolved ? 'bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:scale-105'}`}
                    >
                      <CheckCircle2 size={15} />
                      <span>{isResolved ? (isAr ? 'إعادة فتح' : 'Re-open') : (isAr ? 'تم الحل' : 'Mark Resolved')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedErrorId(isExpanded ? null : report.id)}
                      className="p-2 rounded-xl border bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                      style={{ borderColor }}
                      title={isAr ? 'عرض التفاصيل التقنية' : 'View Stack Details'}
                    >
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteError(report.id)}
                      disabled={actionLoading === report.id}
                      className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                      title={isAr ? 'حذف السجل' : 'Delete'}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Expandable Stack Trace */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 border-t bg-slate-900 text-slate-100 rounded-b-2xl font-mono text-xs overflow-x-auto space-y-3">
                    <div>
                      <div className="text-amber-400 font-bold mb-1.5 flex items-center gap-1.5">
                        <Terminal size={14} />
                        <span>Stack Trace:</span>
                      </div>
                      <pre className="p-3.5 rounded-xl bg-black/60 text-slate-300 whitespace-pre-wrap break-all text-[11px] leading-relaxed max-h-64 overflow-y-auto border border-slate-800">
                        {report.stack || report.message || 'No stack trace available'}
                      </pre>
                    </div>

                    {report.componentStack && (
                      <div>
                        <div className="text-blue-400 font-bold mb-1.5">Component Stack:</div>
                        <pre className="p-3.5 rounded-xl bg-black/60 text-slate-300 whitespace-pre-wrap break-all text-[11px] leading-relaxed max-h-48 overflow-y-auto border border-slate-800">
                          {report.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
