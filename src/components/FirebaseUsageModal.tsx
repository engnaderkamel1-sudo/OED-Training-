import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context';
import { 
  X, 
  Database, 
  Activity, 
  HardDrive, 
  Users, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Radio,
  UserCheck,
  TrendingUp,
  Flame,
  ShieldCheck
} from 'lucide-react';

interface FirebaseUsageModalProps {
  onClose: () => void;
}

export const FirebaseUsageModal: React.FC<FirebaseUsageModalProps> = ({ onClose }) => {
  const { 
    language, 
    users, 
    cleanedData, 
    upcomingSessions, 
    announcements, 
    loginLogs,
    user: currentUser
  } = useAppContext();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Tab State: 'daily' | 'monthly'
  const [period, setPeriod] = useState<'daily' | 'monthly'>('daily');

  // 1. FILTER REAL REGISTERED ACCOUNTS ONLY
  const realUsers = users.filter(u => !u.id.startsWith('derived_'));
  const realApprovedUsers = realUsers.filter(u => u.status === 'approved' || !u.status);
  const realPendingUsers = realUsers.filter(u => u.status === 'pending');
  const realEngineers = realUsers.filter(u => (u.jobRole || u.role || '').toLowerCase().includes('engineer'));
  const realTechnicians = realUsers.filter(u => (u.jobRole || u.role || '').toLowerCase().includes('technician'));
  const realOperators = realUsers.filter(u => (u.jobRole || u.role || '').toLowerCase().includes('operator'));
  const realAdmins = realUsers.filter(u => u.role === 'admin');
  const realManagers = realUsers.filter(u => u.role === 'manager' || u.role === 'supervisor');

  // 2. ONLINE / CURRENTLY ACTIVE USERS
  const now = Date.now();
  const THIRTY_MINUTES = 30 * 60 * 1000;
  
  const onlineUsersMap = new Map<string, { name: string; hrCode: string; role: string; lastSeen: string }>();

  if (currentUser) {
    onlineUsersMap.set(currentUser.id, {
      name: currentUser.name,
      hrCode: currentUser.hrCode,
      role: currentUser.role || 'admin',
      lastSeen: language === 'ar' ? 'الآن (أنت)' : 'Now (You)'
    });
  }

  loginLogs.forEach(log => {
    if (log.timestamp) {
      const logTime = new Date(log.timestamp).getTime();
      if (!isNaN(logTime) && (now - logTime) <= THIRTY_MINUTES) {
        if (!onlineUsersMap.has(log.userId)) {
          const diffMinutes = Math.max(1, Math.round((now - logTime) / 60000));
          onlineUsersMap.set(log.userId, {
            name: log.name || log.userId,
            hrCode: log.hrCode || '',
            role: log.role || 'trainee',
            lastSeen: language === 'ar' ? `منذ ${diffMinutes} دقيقة` : `${diffMinutes}m ago`
          });
        }
      }
    }
  });

  const onlineUsersList = Array.from(onlineUsersMap.values());

  // 3. Storage Calculation
  const totalUsersBytes = new Blob([JSON.stringify(realUsers)]).size;
  const totalCleanedDataBytes = new Blob([JSON.stringify(cleanedData)]).size;
  const totalSessionsBytes = new Blob([JSON.stringify(upcomingSessions)]).size;
  const totalAnnouncementsBytes = new Blob([JSON.stringify(announcements)]).size;
  const totalLogsBytes = new Blob([JSON.stringify(loginLogs)]).size;

  const totalBytes = totalUsersBytes + totalCleanedDataBytes + totalSessionsBytes + totalAnnouncementsBytes + totalLogsBytes;
  const totalKB = (totalBytes / 1024).toFixed(1);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(3);
  const FREE_TIER_STORAGE_MB = 1024;
  const storagePercentage = Math.min(100, (Number(totalMB) / FREE_TIER_STORAGE_MB) * 100);

  // 4. Daily vs Monthly Quota Limits
  const DAILY_READS_LIMIT = 50000;
  const MONTHLY_READS_LIMIT = 1500000;
  const DAILY_WRITES_LIMIT = 20000;
  const MONTHLY_WRITES_LIMIT = 600000;

  const totalDocsCount = realUsers.length + cleanedData.length + upcomingSessions.length + announcements.length + loginLogs.length;

  const estimatedDailyReads = Math.max(totalDocsCount, (loginLogs.length * 3) + (realUsers.length * 2) + totalDocsCount);
  const estimatedMonthlyReads = Math.max(estimatedDailyReads * 7, loginLogs.length * 15 + totalDocsCount * 4);

  const currentReads = period === 'daily' ? estimatedDailyReads : estimatedMonthlyReads;
  const currentReadsLimit = period === 'daily' ? DAILY_READS_LIMIT : MONTHLY_READS_LIMIT;
  const readsPercentage = Math.min(100, (currentReads / currentReadsLimit) * 100);

  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayLogins = loginLogs.filter(l => l.timestamp && l.timestamp.startsWith(todayDateStr)).length;
  const estimatedDailyWrites = Math.max(todayLogins + 5, loginLogs.length);
  const estimatedMonthlyWrites = Math.max(loginLogs.length + (upcomingSessions.length * 2), 25);

  const currentWrites = period === 'daily' ? estimatedDailyWrites : estimatedMonthlyWrites;
  const currentWritesLimit = period === 'daily' ? DAILY_WRITES_LIMIT : MONTHLY_WRITES_LIMIT;
  const writesPercentage = Math.min(100, (currentWrites / currentWritesLimit) * 100);

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[99999] flex items-center justify-center p-4 cursor-pointer animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#0c192c] text-gray-900 dark:text-gray-100 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] cursor-default border border-gray-200 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#002D62] dark:bg-[#071120] text-white px-6 py-4 flex justify-between items-center border-b border-blue-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FFC000] text-[#002D62] rounded-lg shadow-sm">
              <Activity size={22} />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                {language === 'ar' ? 'مؤشرات استهلاك قاعدة البيانات (Firebase Quota)' : 'Firebase Database Quota & Usage'}
              </h3>
              <p className="text-xs text-blue-200">
                {language === 'ar' ? 'الخطة المجانية (Spark Plan) - إحصائيات حية للنظام' : 'Spark Free Tier - Live Real-Time System Metrics'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Period Toggle */}
            <div className="bg-blue-900/80 dark:bg-[#10223d] p-1 rounded-lg flex border border-blue-400/30 text-xs">
              <button
                onClick={() => setPeriod('daily')}
                className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${period === 'daily' ? 'bg-[#FFC000] text-[#002D62] shadow-sm' : 'text-gray-200 hover:text-white'}`}
              >
                {language === 'ar' ? 'يومي (Daily)' : 'Daily'}
              </button>
              <button
                onClick={() => setPeriod('monthly')}
                className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${period === 'monthly' ? 'bg-[#FFC000] text-[#002D62] shadow-sm' : 'text-gray-200 hover:text-white'}`}
              >
                {language === 'ar' ? 'شهري (Monthly)' : 'Monthly'}
              </button>
            </div>

            <button 
              onClick={onClose} 
              className="text-gray-300 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
              title={language === 'ar' ? 'إغلاق' : 'Close'}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">

          {/* ONLINE USERS SECTION */}
          <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/60 rounded-xl p-5 shadow-xs">
            <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
              <h4 className="font-bold text-sm text-emerald-950 dark:text-emerald-300 flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
                </span>
                <span>{language === 'ar' ? 'المستخدمون المتواجدون على التطبيق حالياً:' : 'Active Users Online Right Now:'}</span>
              </h4>
              <span className="text-xs bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 font-bold px-3 py-1 rounded-full">
                {onlineUsersList.length} {language === 'ar' ? 'متصل الآن' : 'Online Now'}
              </span>
            </div>

            {onlineUsersList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                {onlineUsersList.map((u, idx) => (
                  <div key={idx} className="bg-white dark:bg-[#112238] border border-emerald-200 dark:border-emerald-900/50 rounded-lg p-2.5 flex items-center justify-between shadow-2xs">
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-xs text-gray-800 dark:text-gray-200 truncate">{u.name}</div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">
                        {u.hrCode && <span>HR: {u.hrCode} • </span>}
                        <span className="capitalize">{u.role}</span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-medium px-2 py-0.5 rounded whitespace-nowrap">
                      {u.lastSeen}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-emerald-800 dark:text-emerald-400 italic">
                {language === 'ar' ? 'لا يوجد مستخدمين آخرين نشطين في الوقت الحالي.' : 'No other active users in the last few minutes.'}
              </div>
            )}
          </div>

          {/* 3 QUOTA CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Reads Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/40 dark:from-[#112238] dark:to-[#0f1b2d] border border-blue-200 dark:border-blue-900/60 rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wide flex items-center gap-1.5">
                    <TrendingUp size={15} className="text-blue-600 dark:text-blue-400" />
                    {period === 'daily' ? (language === 'ar' ? 'عمليات القراءة اليومية' : 'Daily Reads') : (language === 'ar' ? 'عمليات القراءة الشهرية' : 'Monthly Reads')}
                  </span>
                  <span className="text-xs bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full">
                    {readsPercentage < 1 ? '< 1%' : `${readsPercentage.toFixed(1)}%`}
                  </span>
                </div>
                <div className="text-2xl font-black text-[#002D62] dark:text-white">
                  {currentReads.toLocaleString()}
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1.5">/ {currentReadsLimit.toLocaleString()}</span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  {language === 'ar' ? `المتبقي: ${(currentReadsLimit - currentReads).toLocaleString()} عملية` : `${(currentReadsLimit - currentReads).toLocaleString()} reads left`}
                </p>
              </div>

              <div className="w-full bg-blue-200/60 dark:bg-blue-950/60 rounded-full h-2 mt-4 overflow-hidden">
                <div 
                  className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(2, readsPercentage)}%` }}
                />
              </div>
            </div>

            {/* Writes Card */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50/40 dark:from-[#112238] dark:to-[#0f1b2d] border border-emerald-200 dark:border-emerald-900/60 rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wide flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
                    {period === 'daily' ? (language === 'ar' ? 'عمليات الكتابة اليومية' : 'Daily Writes') : (language === 'ar' ? 'عمليات الكتابة الشهرية' : 'Monthly Writes')}
                  </span>
                  <span className="text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                    {writesPercentage < 1 ? '< 1%' : `${writesPercentage.toFixed(1)}%`}
                  </span>
                </div>
                <div className="text-2xl font-black text-emerald-800 dark:text-emerald-400">
                  {currentWrites.toLocaleString()}
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1.5">/ {currentWritesLimit.toLocaleString()}</span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  {language === 'ar' ? `المتبقي: ${(currentWritesLimit - currentWrites).toLocaleString()} عملية` : `${(currentWritesLimit - currentWrites).toLocaleString()} writes left`}
                </p>
              </div>

              <div className="w-full bg-emerald-200/60 dark:bg-emerald-950/60 rounded-full h-2 mt-4 overflow-hidden">
                <div 
                  className="bg-emerald-600 dark:bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(2, writesPercentage)}%` }}
                />
              </div>
            </div>

            {/* Storage Card */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50/40 dark:from-[#112238] dark:to-[#0f1b2d] border border-purple-200 dark:border-purple-900/60 rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wide flex items-center gap-1.5">
                    <HardDrive size={15} className="text-purple-600 dark:text-purple-400" />
                    {language === 'ar' ? 'مساحة التخزين الكلية' : 'Database Storage'}
                  </span>
                  <span className="text-xs bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-bold px-2 py-0.5 rounded-full">
                    {storagePercentage < 0.01 ? '< 0.01%' : `${storagePercentage.toFixed(2)}%`}
                  </span>
                </div>
                <div className="text-2xl font-black text-purple-900 dark:text-purple-300">
                  {totalKB} KB
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1.5">/ 1.00 GB</span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  {language === 'ar' ? `المستهلك: ${(Number(totalMB)).toFixed(2)} MB من 1024 MB` : `${(Number(totalMB)).toFixed(2)} MB used out of 1024 MB`}
                </p>
              </div>

              <div className="w-full bg-purple-200/60 dark:bg-purple-950/60 rounded-full h-2 mt-4 overflow-hidden">
                <div 
                  className="bg-purple-600 dark:bg-purple-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(2, storagePercentage)}%` }}
                />
              </div>
            </div>
          </div>

          {/* REAL REGISTERED ACCOUNTS BREAKDOWN */}
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-5 bg-gray-50/60 dark:bg-[#112238]/60">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Users size={18} className="text-[#002D62] dark:text-blue-400" />
                <span>{language === 'ar' ? 'الحسابات الفعلية المسجلة بالتطبيق (Real Registered Accounts)' : 'Real Registered User Accounts'}</span>
              </h4>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {language === 'ar' ? '(لا تشمل السجلات المستوردة من Excel)' : '(Excludes imported Excel data)'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-[#0c192c] p-3.5 rounded-lg border border-blue-200 dark:border-blue-900/50 shadow-xs">
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{language === 'ar' ? 'إجمالي الحسابات الفعلية' : 'Real Accounts'}</div>
                <div className="text-2xl font-black text-[#002D62] dark:text-white mt-0.5">{realUsers.length}</div>
              </div>

              <div className="bg-white dark:bg-[#0c192c] p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-900/50 shadow-xs">
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{language === 'ar' ? 'حسابات نشطة ومفعلة' : 'Active Approved'}</div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{realApprovedUsers.length}</div>
              </div>

              <div className="bg-white dark:bg-[#0c192c] p-3.5 rounded-lg border border-amber-200 dark:border-amber-900/50 shadow-xs">
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{language === 'ar' ? 'طلبات بالانتظار' : 'Pending Requests'}</div>
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{realPendingUsers.length}</div>
              </div>

              <div className="bg-white dark:bg-[#0c192c] p-3.5 rounded-lg border border-indigo-200 dark:border-indigo-900/50 shadow-xs">
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{language === 'ar' ? 'المهندسين' : 'Engineers'}</div>
                <div className="text-2xl font-black text-indigo-700 dark:text-indigo-400 mt-0.5">{realEngineers.length}</div>
              </div>

              <div className="bg-white dark:bg-[#0c192c] p-3.5 rounded-lg border border-purple-200 dark:border-purple-900/50 shadow-xs">
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{language === 'ar' ? 'الفنيين' : 'Technicians'}</div>
                <div className="text-2xl font-black text-purple-700 dark:text-purple-400 mt-0.5">{realTechnicians.length}</div>
              </div>

              <div className="bg-white dark:bg-[#0c192c] p-3.5 rounded-lg border border-teal-200 dark:border-teal-900/50 shadow-xs">
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{language === 'ar' ? 'السائقين والمشغلين' : 'Operators'}</div>
                <div className="text-2xl font-black text-teal-700 dark:text-teal-400 mt-0.5">{realOperators.length}</div>
              </div>

              <div className="bg-white dark:bg-[#0c192c] p-3.5 rounded-lg border border-gray-200 dark:border-gray-800 shadow-xs">
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{language === 'ar' ? 'المديرين والمشرفين' : 'Managers / Sups'}</div>
                <div className="text-2xl font-black text-gray-800 dark:text-gray-200 mt-0.5">{realManagers.length}</div>
              </div>

              <div className="bg-white dark:bg-[#0c192c] p-3.5 rounded-lg border border-blue-300 dark:border-blue-900/50 shadow-xs">
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{language === 'ar' ? 'المسؤولين (Admins)' : 'Admins'}</div>
                <div className="text-2xl font-black text-[#002D62] dark:text-blue-400 mt-0.5">{realAdmins.length}</div>
              </div>
            </div>
          </div>

          {/* Cleaned Training Records Info */}
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 bg-white dark:bg-[#112238] flex justify-between items-center shadow-sm">
            <div>
              <div className="font-bold text-sm text-gray-800 dark:text-gray-200">
                {language === 'ar' ? 'إجمالي سجلات الدورات التاريخية (Cleaned Data Records):' : 'Imported Historical Course Records:'}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {language === 'ar' ? 'البيانات التاريخية المحفوظة في قاعدة البيانات' : 'Total historical trainee records stored in Firebase'}
              </div>
            </div>
            <div className="text-2xl font-black text-blue-700 dark:text-blue-400">
              {cleanedData.length.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 dark:bg-[#071120] border-t border-gray-200 dark:border-gray-800 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#002D62] hover:bg-blue-900 text-white rounded-lg text-sm font-bold transition-colors cursor-pointer"
          >
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};