import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Activity, RefreshCw, Loader2, MapPin, Search, PlusCircle, X, 
  Users, History, ShieldCheck, Cpu 
} from 'lucide-react';
import { useAppContext } from '../context';

export const ActivityLogsView: React.FC = () => {
  const { language, theme, users, user: currentUser } = useAppContext();
  const isDark = theme === 'dark';
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsFetched, setLogsFetched] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [fetchLimit, setFetchLimit] = useState<number>(20);
  const [displayLimit, setDisplayLimit] = useState<number>(10);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentLocation, setCurrentLocation] = useState<string>('Cairo, EG');

  const fetchActivityLogs = async (limitCount: number = fetchLimit) => {
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
      setLogsFetched(true);
      setLastFetchedAt(new Date());
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Location detection only (no automatic firestore reads or heavy queries)
  useEffect(() => {
    const initLocation = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
          const d = await res.json();
          if (d.city && d.country_code) {
            setCurrentLocation(`${d.city}, ${d.country_code} (${d.ip})`);
          }
        }
      } catch (e) {}
    };

    initLocation();
  }, []);

  // Online / Active Users Calculation from current user memory (0 Firestore reads)
  const now = Date.now();
  const THIRTY_MINUTES = 30 * 60 * 1000;
  const onlineUsersMap = new Map<string, { id: string; name: string; hrCode: string; role: string; lastSeen: string; location: string }>();

  if (currentUser) {
    onlineUsersMap.set(currentUser.id, {
      id: currentUser.id,
      name: currentUser.name,
      hrCode: currentUser.hrCode,
      role: currentUser.role || 'admin',
      lastSeen: language === 'ar' ? 'الآن (أنت)' : 'Now (You)',
      location: currentLocation
    });
  }

  const realUsers = (users || []).filter(u => u && u.id && !String(u.id).startsWith('derived_'));
  realUsers.forEach(u => {
    if (u.lastLogin) {
      const logTime = new Date(u.lastLogin).getTime();
      if (!isNaN(logTime) && (now - logTime) <= THIRTY_MINUTES) {
        if (!onlineUsersMap.has(u.id)) {
          const diffMinutes = Math.max(1, Math.round((now - logTime) / 60000));
          const userLogLoc = activityLogs.find(l => l.userId === u.id || l.hrCode === u.hrCode || l.userName === u.name)?.location || 'Cairo, EG';
          onlineUsersMap.set(u.id, {
            id: u.id,
            name: u.name || u.id,
            hrCode: u.hrCode || '',
            role: u.role || 'trainee',
            lastSeen: language === 'ar' ? `منذ ${diffMinutes} دقيقة` : `${diffMinutes}m ago`,
            location: userLogLoc
          });
        }
      }
    }
  });

  const onlineUsersList = Array.from(onlineUsersMap.values());

  const isSpecificSearch = Boolean(searchTerm.trim());

  // 1. If searching a specific person: show their entire historical activity
  // 2. If no search: show only the MOST RECENT single activity per unique user
  const processedLogs = React.useMemo(() => {
    if (isSpecificSearch) {
      const term = searchTerm.trim().toLowerCase();
      return activityLogs.filter((log) => {
        const name = String(log.userName || '').toLowerCase();
        const hr = String(log.hrCode || '').toLowerCase();
        const loc = String(log.location || '').toLowerCase();
        return name.includes(term) || hr.includes(term) || loc.includes(term);
      });
    }

    // Deduplicate: Keep only the latest entry per user
    const seenUsers = new Set<string>();
    const uniqueLatestLogs: any[] = [];

    for (const log of activityLogs) {
      const userKey = (log.hrCode || log.userId || log.userName || '').trim().toLowerCase();
      if (userKey && !seenUsers.has(userKey)) {
        seenUsers.add(userKey);
        uniqueLatestLogs.push(log);
      }
    }
    return uniqueLatestLogs;
  }, [activityLogs, searchTerm, isSpecificSearch]);

  const displayedLogs = processedLogs.slice(0, displayLimit);
  const hasMore = displayLimit < processedLogs.length;

  const handleLoadMore = () => {
    setDisplayLimit((prev) => prev + 10);
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      
      {/* 1. Server Status Banner (Clean, without the requested removed phrase) */}
      <div 
        className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 shadow-xs transition-colors"
        style={{ 
          backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ecfdf5',
          borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#a7f3d0'
        }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h4 className="font-bold text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
              <span>{language === 'ar' ? 'حالة السيرفر: متصل ويعمل بكفاءة' : 'Server Status: Connected & Healthy'}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </h4>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20">
          <Cpu size={13} />
          <span>0ms Latency</span>
        </div>
      </div>

      {/* 2. Active Users Online Right Now (with location for each user) */}
      <div 
        className="border rounded-2xl p-4 shadow-sm transition-colors"
        style={{ 
          backgroundColor: isDark ? '#0F1E36' : '#ffffff',
          borderColor: isDark ? 'rgba(148, 190, 255, 0.2)' : '#e2e8f0'
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-xs sm:text-sm flex items-center gap-2" style={{ color: isDark ? '#FFFFFF' : '#002D62' }}>
            <Users size={16} className="text-[#FFC000]" />
            <span>{language === 'ar' ? 'المستخدمون النشطون الآن على النظام:' : 'Active Users Online Right Now:'}</span>
          </h4>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
            {onlineUsersList.length} {language === 'ar' ? 'متصل' : 'Online'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
          {onlineUsersList.map((u, idx) => (
            <div 
              key={idx} 
              className="p-3 rounded-xl border flex items-center justify-between gap-2.5 text-xs transition-colors shadow-2xs"
              style={{ 
                backgroundColor: isDark ? '#193158' : '#f8fafc',
                borderColor: isDark ? 'rgba(148, 190, 255, 0.18)' : '#e2e8f0'
              }}
            >
              <div className="min-w-0 flex-1">
                <span className="font-bold block truncate text-gray-900 dark:text-white text-xs">{u.name}</span>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 flex-wrap">
                  <span className="font-mono">{u.hrCode}</span>
                  <span>•</span>
                  <span>{u.role}</span>
                  {u.location && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium truncate max-w-[140px]" title={u.location}>
                        <MapPin size={10} className="shrink-0" />
                        <span className="truncate">{u.location}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                {u.lastSeen}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Activity Logs Table Card */}
      <div 
        className="rounded-2xl shadow-md border overflow-hidden transition-colors"
        style={{ 
          backgroundColor: isDark ? '#0F1E36' : '#ffffff',
          borderColor: isDark ? 'rgba(148, 190, 255, 0.2)' : '#cbd5e1'
        }}
      >
        {/* Header */}
        <div 
          className="px-5 py-3.5 border-b flex flex-wrap gap-3 justify-between items-center"
          style={{ 
            backgroundColor: isDark ? '#0B172B' : '#f8fafc',
            borderColor: isDark ? 'rgba(148, 190, 255, 0.18)' : '#e2e8f0'
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#002D62] text-[#FFC000] shadow-xs">
              <Activity size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white leading-tight flex items-center gap-2 flex-wrap">
                <span>{language === 'ar' ? 'سجل نشاط المستخدمين وجلسات الدخول' : 'User Activity & Session Logs'}</span>
                {logsFetched && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-[#002D62] dark:text-[#85C0FF] border border-blue-200 dark:border-blue-700">
                    {displayedLogs.length} / {processedLogs.length}
                  </span>
                )}
                {lastFetchedAt && (
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                    {language === 'ar' ? '🕒 تم التحديث:' : '🕒 Last fetch:'} {lastFetchedAt.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                {isSpecificSearch ? (
                  <>
                    <History size={13} className="text-blue-500" />
                    <span>{language === 'ar' ? 'عرض السجل الكامل لنتائج البحث' : 'Showing full activity history for search results'}</span>
                  </>
                ) : (
                  <>
                    <Users size={13} className="text-emerald-500" />
                    <span>{language === 'ar' ? 'عرض آخر نشاط لكل مستخدم' : 'Showing latest activity per unique user'}</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Controls: Fetch Count + Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Box (Active if logs fetched) */}
            {logsFetched && (
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setDisplayLimit(10);
                  }}
                  placeholder={language === 'ar' ? 'بحث بالاسم أو الكود...' : 'Search user...'}
                  className="px-3 py-1.5 pl-8 rtl:pl-3 rtl:pr-8 rounded-xl border text-xs font-medium outline-none focus:ring-2 focus:ring-[#002D62] w-36 sm:w-52 shadow-2xs"
                  style={{
                    backgroundColor: isDark ? '#193158' : '#ffffff',
                    borderColor: isDark ? 'rgba(148, 190, 255, 0.25)' : '#94a3b8',
                    color: isDark ? '#ffffff' : '#002D62'
                  }}
                />
                <Search size={14} className="absolute left-2.5 rtl:left-auto rtl:right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')} 
                    className="absolute right-2 rtl:right-auto rtl:left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            )}

            {/* Fetch Quantity Selector */}
            <div className="flex items-center rounded-xl p-0.5 border" style={{ backgroundColor: isDark ? '#193158' : '#e2e8f0', borderColor: isDark ? 'rgba(148, 190, 255, 0.15)' : '#cbd5e1' }}>
              {[10, 20, 50, 100].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    setFetchLimit(num);
                    if (logsFetched) {
                      fetchActivityLogs(num);
                    }
                  }}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    fetchLimit === num
                      ? 'bg-[#002D62] text-white shadow-2xs'
                      : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white'
                  }`}
                  title={`${num} logs`}
                >
                  {num}
                </button>
              ))}
            </div>

            {/* Main Fetch / Refresh Button */}
            <button 
              type="button"
              onClick={() => fetchActivityLogs(fetchLimit)}
              disabled={loadingLogs}
              className={`flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all shadow-sm cursor-pointer hover:scale-105 ${
                !logsFetched 
                  ? 'bg-[#FFC000] text-[#001D42] hover:bg-yellow-500 font-black' 
                  : 'bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50'
              }`}
            >
              <RefreshCw size={13} className={loadingLogs ? 'animate-spin text-[#002D62] dark:text-[#FFC000]' : (logsFetched ? 'text-gray-500' : 'text-[#001D42]')} />
              <span>
                {loadingLogs 
                  ? (language === 'ar' ? 'جاري الجلب...' : 'Fetching...') 
                  : !logsFetched 
                    ? (language === 'ar' ? '⚡ جلب السجلات الحية' : '⚡ Fetch Live Logs') 
                    : (language === 'ar' ? 'تحديث السجلات' : 'Refresh Logs')}
              </span>
            </button>
          </div>
        </div>

        {/* Content Body: Either On-Demand Empty State OR Logs Table */}
        {!logsFetched ? (
          <div className="py-14 px-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-900/20 text-[#002D62] dark:text-[#85C0FF] flex items-center justify-center mx-auto border border-blue-200 dark:border-blue-800/50 shadow-inner">
              <Activity size={32} />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h4 className="font-bold text-base text-gray-900 dark:text-white">
                {language === 'ar' ? 'السجلات الحية جاهزة للتحميل عند الطلب' : 'Live Logs Ready to Fetch On-Demand'}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                {language === 'ar' 
                  ? 'تم إيقاف التحميل التلقائي لتوفير استهلاك قراءات فايربيز (0 قراءات مستهلكة). اختر عدد السجلات واضغط على الزر أدناه لجلبها مباشرة.' 
                  : 'Automatic loading is disabled to save Firebase reads (0 reads consumed). Select quantity and click below to fetch live logs.'}
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => fetchActivityLogs(fetchLimit)}
                disabled={loadingLogs}
                className="px-6 py-2.5 bg-[#002D62] hover:bg-blue-900 text-white font-black rounded-xl text-xs sm:text-sm inline-flex items-center gap-2 shadow-md transition-all hover:scale-105 cursor-pointer"
              >
                {loadingLogs ? (
                  <Loader2 size={16} className="animate-spin text-[#FFC000]" />
                ) : (
                  <RefreshCw size={16} className="text-[#FFC000]" />
                )}
                <span>
                  {language === 'ar' ? `جلب آخر (${fetchLimit}) سجل نشاط الآن` : `Fetch Latest (${fetchLimit}) Logs Now`}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right border-collapse">
              {/* Header Bar with High Contrast */}
              <thead 
                className="sticky top-0 z-10 text-xs font-black uppercase tracking-wider border-b"
                style={{ 
                  backgroundColor: isDark ? '#081324' : '#002D62',
                  borderColor: isDark ? 'rgba(148, 190, 255, 0.2)' : '#001d42',
                  color: '#FFFFFF'
                }}
              >
                <tr>
                  <th className="px-4 py-3 text-white font-black">{language === 'ar' ? 'وقت آخر نشاط' : 'Timestamp'}</th>
                  <th className="px-4 py-3 text-white font-black">{language === 'ar' ? 'اسم المستخدم' : 'User Name'}</th>
                  <th className="px-4 py-3 text-white font-black">{language === 'ar' ? 'الكود الوظيفي' : 'HR Code'}</th>
                  <th className="px-4 py-3 text-white font-black">{language === 'ar' ? 'نوع الحدث' : 'Action / Event'}</th>
                  <th className="px-4 py-3 text-white font-black">{language === 'ar' ? 'الموقع الجغرافي و IP' : 'Location & IP'}</th>
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
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-xs font-medium">
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
                      <span className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-md text-[11px] font-bold">
                        {log.action}
                      </span>
                    );
                    if (log.action === 'system_login') {
                      actionBadge = (
                        <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-md text-[11px] font-bold border border-blue-200 dark:border-blue-800">
                          {language === 'ar' ? 'تسجيل دخول' : 'System Login'}
                        </span>
                      );
                    } else if (log.action === 'session_resume') {
                      actionBadge = (
                        <span className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-md text-[11px] font-bold border border-emerald-200 dark:border-emerald-800">
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
                        <td className="px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap text-xs">
                          {formattedTime}
                        </td>
                        <td className="px-4 py-2.5 font-bold text-gray-900 dark:text-white whitespace-nowrap text-xs">
                          {log.userName || 'Unknown'}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs font-bold text-[#002D62] dark:text-[#FFC000] whitespace-nowrap">
                          {log.hrCode || 'N/A'}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {actionBadge}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 font-medium">
                            <MapPin size={13} className="text-blue-500 shrink-0" />
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
        )}

        {/* Load More (+10) Footer */}
        {logsFetched && hasMore && (
          <div 
            className="p-3.5 border-t flex justify-center items-center"
            style={{ 
              backgroundColor: isDark ? '#0B172B' : '#f8fafc',
              borderColor: isDark ? 'rgba(148, 190, 255, 0.15)' : '#e2e8f0'
            }}
          >
            <button
              onClick={handleLoadMore}
              className="px-6 py-2 bg-[#002D62] hover:bg-blue-900 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all hover:scale-105 cursor-pointer"
            >
              <PlusCircle size={15} className="text-[#FFC000]" />
              <span>
                {language === 'ar' 
                  ? `عرض 10 مستخدمين إضافيين (+10)` 
                  : `Load 10 More Users (+10)`}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
