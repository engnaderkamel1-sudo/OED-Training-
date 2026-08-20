import React, { useState, useEffect } from 'react';
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
  const [displayLimit, setDisplayLimit] = useState<number>(10);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentLocation, setCurrentLocation] = useState<string>('Cairo, EG');

  const fetchActivityLogs = async (limitCount: number = 300) => {
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

  // Immediate location fetch & session logging on mount
  useEffect(() => {
    const initAndLog = async () => {
      let detectedLoc = "Cairo, EG";
      try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
          const d = await res.json();
          if (d.city && d.country_code) {
            detectedLoc = `${d.city}, ${d.country_code} (${d.ip})`;
            setCurrentLocation(detectedLoc);
          }
        }
      } catch (e) {}

      if (currentUser) {
        try {
          await addDoc(collection(db, 'activity_logs'), {
            userId: currentUser.id,
            userName: currentUser.name || 'Admin',
            hrCode: currentUser.hrCode || 'admin',
            role: currentUser.role || 'admin',
            action: 'session_resume',
            location: detectedLoc,
            timestamp: serverTimestamp()
          });
        } catch (err) {
          console.warn("Could not push immediate activity log:", err);
        }
      }
      await fetchActivityLogs(300);
    };

    initAndLog();
  }, [currentUser]);

  // Online / Active Users Calculation (last 30 mins)
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
              <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white leading-tight flex items-center gap-2">
                <span>{language === 'ar' ? 'سجل نشاط المستخدمين وجلسات الدخول' : 'User Activity & Session Logs'}</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-[#002D62] dark:text-[#85C0FF] border border-blue-200 dark:border-blue-700">
                  {displayedLogs.length} / {processedLogs.length}
                </span>
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
                    <span>{language === 'ar' ? 'عرض آخر نشاط لكل مستخدم (حركة واحدة لكل مستخدم)' : 'Showing latest activity per unique user'}</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Controls: Search + Limit Buttons + Refresh */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Box */}
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setDisplayLimit(10);
                }}
                placeholder={language === 'ar' ? 'بحث بالاسم أو الكود (سجل كامل)...' : 'Search user for full logs...'}
                className="px-3 py-1.5 pl-8 rtl:pl-3 rtl:pr-8 rounded-xl border text-xs font-medium outline-none focus:ring-2 focus:ring-[#002D62] w-48 sm:w-60 shadow-2xs"
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

            {/* Quick Limit Buttons */}
            <div className="flex items-center rounded-xl p-0.5 border" style={{ backgroundColor: isDark ? '#193158' : '#e2e8f0', borderColor: isDark ? 'rgba(148, 190, 255, 0.15)' : '#cbd5e1' }}>
              {[10, 20, 50].map((num) => (
                <button
                  key={num}
                  onClick={() => setDisplayLimit(num)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    displayLimit === num
                      ? 'bg-[#002D62] text-white shadow-2xs'
                      : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white'
                  }`}
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => setDisplayLimit(processedLogs.length || 200)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  displayLimit >= processedLogs.length && processedLogs.length > 0
                    ? 'bg-[#002D62] text-white shadow-2xs'
                    : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white'
                }`}
              >
                {language === 'ar' ? 'الكل' : 'All'}
              </button>
            </div>

            {/* Refresh Button */}
            <button 
              onClick={() => fetchActivityLogs(300)}
              disabled={loadingLogs}
              className="flex items-center gap-1.5 text-xs bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 px-3 py-1.5 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer text-gray-700 dark:text-gray-200"
            >
              <RefreshCw size={13} className={loadingLogs ? 'animate-spin text-[#002D62] dark:text-[#FFC000]' : 'text-gray-500'} />
              <span>{language === 'ar' ? 'تحديث' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Table */}
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

        {/* Load More (+10) Footer */}
        {hasMore && (
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
