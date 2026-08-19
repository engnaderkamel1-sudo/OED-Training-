import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Activity, RefreshCw, Loader2, MapPin, Search, PlusCircle, X } from 'lucide-react';
import { useAppContext } from '../context';

export const ActivityLogsView: React.FC = () => {
  const { language, theme } = useAppContext();
  const isDark = theme === 'dark';
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [displayLimit, setDisplayLimit] = useState<number>(10);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchActivityLogs = async (limitCount: number = 200) => {
    setLoadingLogs(true);
    try {
      const q = query(
        collection(db, 'activity_logs'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      const querySnapshot = await getDocs(q);
      const logs: any[] = [];
      querySnapshot.forEach((doc) => {
        logs.push({ id: doc.id, ...doc.data() });
      });
      setActivityLogs(logs);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchActivityLogs(200);
  }, []);

  // Filter logs by search term
  const filteredLogs = activityLogs.filter((log) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.trim().toLowerCase();
    const name = String(log.userName || '').toLowerCase();
    const hr = String(log.hrCode || '').toLowerCase();
    const loc = String(log.location || '').toLowerCase();
    return name.includes(term) || hr.includes(term) || loc.includes(term);
  });

  const displayedLogs = filteredLogs.slice(0, displayLimit);
  const hasMore = displayLimit < filteredLogs.length;

  const handleLoadMore = () => {
    setDisplayLimit((prev) => prev + 10);
  };

  return (
    <div 
      className="rounded-2xl shadow-sm border overflow-hidden animate-fadeIn transition-colors"
      style={{ 
        backgroundColor: isDark ? '#0F1E36' : '#ffffff',
        borderColor: isDark ? 'rgba(148, 190, 255, 0.2)' : '#e2e8f0'
      }}
    >
      {/* Header */}
      <div 
        className="px-4 py-3 border-b flex flex-wrap gap-3 justify-between items-center"
        style={{ 
          backgroundColor: isDark ? '#0B172B' : '#f8fafc',
          borderColor: isDark ? 'rgba(148, 190, 255, 0.15)' : '#e2e8f0'
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#FFC000]/20 text-[#002D62] dark:text-[#FFC000]">
            <Activity size={18} />
          </div>
          <div>
            <h3 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white leading-tight flex items-center gap-2">
              <span>{language === 'ar' ? 'سجل نشاط المستخدمين والجلسات' : 'User Activity & Session Logs'}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                {displayedLogs.length} / {filteredLogs.length}
              </span>
            </h3>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              {language === 'ar' ? 'متابعة آخر حركات تسجيل الدخول والنشاط' : 'Track user login & resume activity events'}
            </span>
          </div>
        </div>

        {/* Controls: Search + Limit Buttons + Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={language === 'ar' ? 'بحث بالاسم أو الكود...' : 'Search by name or HR...'}
              className="px-2.5 py-1.5 pl-7 rtl:pl-2.5 rtl:pr-7 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-[#002D62] w-36 sm:w-44"
              style={{
                backgroundColor: isDark ? '#193158' : '#ffffff',
                borderColor: isDark ? 'rgba(148, 190, 255, 0.2)' : '#cbd5e1',
                color: isDark ? '#ffffff' : '#000000'
              }}
            />
            <Search size={13} className="absolute left-2 rtl:left-auto rtl:right-2 top-1/2 -translate-y-1/2 text-gray-400" />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-2 rtl:right-auto rtl:left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Quick Limit Buttons */}
          <div className="flex items-center rounded-xl p-0.5 border" style={{ backgroundColor: isDark ? '#193158' : '#e2e8f0', borderColor: isDark ? 'rgba(148, 190, 255, 0.15)' : '#cbd5e1' }}>
            {[10, 20, 50].map((num) => (
              <button
                key={num}
                onClick={() => setDisplayLimit(num)}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  displayLimit === num
                    ? 'bg-[#002D62] text-white shadow-2xs'
                    : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white'
                }`}
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => setDisplayLimit(filteredLogs.length || 200)}
              className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                displayLimit >= filteredLogs.length && filteredLogs.length > 0
                  ? 'bg-[#002D62] text-white shadow-2xs'
                  : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white'
              }`}
            >
              {language === 'ar' ? 'الكل' : 'All'}
            </button>
          </div>

          {/* Refresh Button */}
          <button 
            onClick={() => fetchActivityLogs(200)}
            disabled={loadingLogs}
            className="flex items-center gap-1.5 text-xs bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3 py-1.5 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer text-gray-700 dark:text-gray-200"
          >
            <RefreshCw size={12} className={loadingLogs ? 'animate-spin text-[#002D62] dark:text-[#FFC000]' : 'text-gray-500'} />
            <span>{language === 'ar' ? 'تحديث' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left rtl:text-right border-collapse">
          <thead 
            className="sticky top-0 z-10 text-[11px] font-bold uppercase tracking-wider border-b"
            style={{ 
              backgroundColor: isDark ? '#0B172B' : '#f1f5f9',
              borderColor: isDark ? 'rgba(148, 190, 255, 0.2)' : '#e2e8f0',
              color: isDark ? '#94a3b8' : '#475569'
            }}
          >
            <tr>
              <th className="px-3.5 py-2.5">{language === 'ar' ? 'الوقت' : 'Time'}</th>
              <th className="px-3.5 py-2.5">{language === 'ar' ? 'المستخدم' : 'User'}</th>
              <th className="px-3.5 py-2.5">{language === 'ar' ? 'HR Code' : 'HR Code'}</th>
              <th className="px-3.5 py-2.5">{language === 'ar' ? 'النشاط' : 'Action'}</th>
              <th className="px-3.5 py-2.5">{language === 'ar' ? 'الموقع و IP' : 'Location & IP'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
            {loadingLogs ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#002D62] dark:text-[#FFC000]" />
                  <span>{language === 'ar' ? 'جاري جلب السجلات...' : 'Loading logs...'}</span>
                </td>
              </tr>
            ) : displayedLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-xs">
                  {language === 'ar' ? 'لا توجد سجلات مطابقة للبحث' : 'No matching activity logs found'}
                </td>
              </tr>
            ) : (
              displayedLogs.map((log) => {
                const dateObj = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp || Date.now());
                const formattedTime = new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                }).format(dateObj);

                let actionBadge = (
                  <span className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-md text-[10px] font-bold">
                    {log.action}
                  </span>
                );
                if (log.action === 'system_login') {
                  actionBadge = (
                    <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md text-[10px] font-bold border border-blue-200 dark:border-blue-800">
                      {language === 'ar' ? 'تسجيل دخول' : 'System Login'}
                    </span>
                  );
                } else if (log.action === 'session_resume') {
                  actionBadge = (
                    <span className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                      {language === 'ar' ? 'عودة للنشاط' : 'Resumed Activity'}
                    </span>
                  );
                }

                const locationText = log.location && log.location !== 'Unknown' && !log.location.includes('undefined')
                  ? log.location 
                  : 'Cairo, EG';

                return (
                  <tr 
                    key={log.id} 
                    className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-3.5 py-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap text-[11px]">
                      {formattedTime}
                    </td>
                    <td className="px-3.5 py-2 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                      {log.userName || 'Unknown'}
                    </td>
                    <td className="px-3.5 py-2 font-mono text-[11px] font-semibold text-[#002D62] dark:text-[#FFC000] whitespace-nowrap">
                      {log.hrCode || 'N/A'}
                    </td>
                    <td className="px-3.5 py-2 whitespace-nowrap">
                      {actionBadge}
                    </td>
                    <td className="px-3.5 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-300">
                        <MapPin size={12} className="text-blue-500 shrink-0" />
                        <span>{locationText}</span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Load More (+10) Footer */}
      {hasMore && (
        <div 
          className="p-3 border-t flex justify-center items-center"
          style={{ 
            backgroundColor: isDark ? '#0B172B' : '#f8fafc',
            borderColor: isDark ? 'rgba(148, 190, 255, 0.15)' : '#e2e8f0'
          }}
        >
          <button
            onClick={handleLoadMore}
            className="px-5 py-2 bg-[#002D62] hover:bg-blue-900 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-all hover:scale-105 cursor-pointer"
          >
            <PlusCircle size={15} className="text-[#FFC000]" />
            <span>
              {language === 'ar' 
                ? `عرض 10 سجلات إضافية (+10)` 
                : `Load 10 More Logs (+10)`}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
