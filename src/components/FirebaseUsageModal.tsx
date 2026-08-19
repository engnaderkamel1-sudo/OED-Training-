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
    user: currentUser,
    theme // تم استدعاء حالة الثيم
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
  const realUsers = users.filter(u => u && u.id && !String(u.id).startsWith('derived_'));
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

  (realUsers || []).forEach(u => {
    if (u.lastLogin) {
      const logTime = new Date(u.lastLogin).getTime();
      if (!isNaN(logTime) && (now - logTime) <= THIRTY_MINUTES) {
        if (!onlineUsersMap.has(u.id)) {
          const diffMinutes = Math.max(1, Math.round((now - logTime) / 60000));
          onlineUsersMap.set(u.id, {
            name: u.name || u.id,
            hrCode: u.hrCode || '',
            role: u.role || 'trainee',
            lastSeen: language === 'ar' ? `منذ ${diffMinutes} دقيقة` : `${diffMinutes}m ago`
          });
        }
      }
    }
  });

  (loginLogs || []).forEach(log => {
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

  const isDark = theme === 'dark';

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[99999] flex items-center justify-center p-4 cursor-pointer animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] cursor-default border"
        style={{ 
          backgroundColor: isDark ? '#0a1628' : '#ffffff',
          borderColor: isDark ? '#1a2e4c' : '#e5e7eb'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div 
          className="text-white px-6 py-4 flex justify-between items-center border-b"
          style={{ 
            backgroundColor: isDark ? '#061020' : '#002D62',
            borderColor: isDark ? '#1a2e4c' : 'transparent'
          }}
        >
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
            <div 
              className="p-1 rounded-lg flex border text-xs"
              style={{
                backgroundColor: isDark ? '#112238' : 'rgba(30, 58, 138, 0.6)',
                borderColor: isDark ? '#1a2e4c' : 'rgba(96, 165, 250, 0.3)'
              }}
            >
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
          <div 
            className="border rounded-xl p-5 shadow-xs"
            style={{ 
              backgroundColor: isDark ? 'rgba(2, 44, 34, 0.3)' : 'rgba(236, 253, 245, 0.7)',
              borderColor: isDark ? 'rgba(6, 78, 59, 0.6)' : '#6ee7b7'
            }}
          >
            <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
              <h4 
                className="font-bold text-sm flex items-center gap-2"
                style={{ color: isDark ? '#6ee7b7' : '#022c22' }}
              >
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
                </span>
                <span>{language === 'ar' ? 'المستخدمون المتواجدون على التطبيق حالياً:' : 'Active Users Online Right Now:'}</span>
              </h4>
              <span 
                className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ 
                  backgroundColor: isDark ? 'rgba(6, 78, 59, 0.6)' : 'rgba(167, 243, 208, 0.8)',
                  color: isDark ? '#a7f3d0' : '#064e3b'
                }}
              >
                {onlineUsersList.length} {language === 'ar' ? 'متصل الآن' : 'Online Now'}
              </span>
            </div>

            {onlineUsersList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                {onlineUsersList.map((u, idx) => (
                  <div 
                    key={idx} 
                    className="border rounded-lg p-2.5 flex items-center justify-between shadow-2xs"
                    style={{ 
                      backgroundColor: isDark ? '#112238' : '#ffffff',
                      borderColor: isDark ? 'rgba(6, 78, 59, 0.5)' : '#a7f3d0'
                    }}
                  >
                    <div className="min-w-0 pr-2">
                      <div 
                        className="font-bold text-xs truncate"
                        style={{ color: isDark ? '#e2e8f0' : '#1f2937' }}
                      >{u.name}</div>
                      <div 
                        className="text-[11px]"
                        style={{ color: isDark ? '#94a3b8' : '#6b7280' }}
                      >
                        {u.hrCode && <span>HR: {u.hrCode} • </span>}
                        <span className="capitalize">{u.role}</span>
                      </div>
                    </div>
                    <span 
                      className="text-[10px] font-medium px-2 py-0.5 rounded whitespace-nowrap"
                      style={{ 
                        backgroundColor: isDark ? 'rgba(6, 78, 59, 0.6)' : '#d1fae5',
                        color: isDark ? '#6ee7b7' : '#065f46'
                      }}
                    >
                      {u.lastSeen}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div 
                className="text-xs italic"
                style={{ color: isDark ? '#34d399' : '#065f46' }}
              >
                {language === 'ar' ? 'لا يوجد مستخدمين آخرين نشطين في الوقت الحالي.' : 'No other active users in the last few minutes.'}
              </div>
            )}
          </div>

          {/* 3 QUOTA CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Reads Card */}
            <div 
              className="border rounded-xl p-4 flex flex-col justify-between shadow-sm"
              style={{
                background: isDark ? 'linear-gradient(to bottom right, #112238, #0a1628)' : 'linear-gradient(to bottom right, #eff6ff, rgba(238, 242, 255, 0.4))',
                borderColor: isDark ? '#1e3a8a' : '#bfdbfe'
              }}
            >
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span 
                    className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5"
                    style={{ color: isDark ? '#93c5fd' : '#1e3a8a' }}
                  >
                    <TrendingUp size={15} style={{ color: isDark ? '#60a5fa' : '#2563eb' }} />
                    {period === 'daily' ? (language === 'ar' ? 'عمليات القراءة اليومية' : 'Daily Reads') : (language === 'ar' ? 'عمليات القراءة الشهرية' : 'Monthly Reads')}
                  </span>
                  <span 
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ 
                      backgroundColor: isDark ? '#172554' : '#dbeafe',
                      color: isDark ? '#93c5fd' : '#1e40af'
                    }}
                  >
                    {readsPercentage < 1 ? '< 1%' : `${readsPercentage.toFixed(1)}%`}
                  </span>
                </div>
                <div 
                  className="text-2xl font-black"
                  style={{ color: isDark ? '#ffffff' : '#002D62' }}
                >
                  {currentReads.toLocaleString()}
                  <span 
                    className="text-xs font-normal ml-1.5"
                    style={{ color: isDark ? '#94a3b8' : '#6b7280' }}
                  >/ {currentReadsLimit.toLocaleString()}</span>
                </div>
                <p 
                  className="text-[11px] mt-1"
                  style={{ color: isDark ? '#94a3b8' : '#6b7280' }}
                >
                  {language === 'ar' ? `المتبقي: ${(currentReadsLimit - currentReads).toLocaleString()} عملية` : `${(currentReadsLimit - currentReads).toLocaleString()} reads left`}
                </p>
              </div>

              <div 
                className="w-full rounded-full h-2 mt-4 overflow-hidden"
                style={{ backgroundColor: isDark ? 'rgba(30, 58, 138, 0.6)' : 'rgba(191, 219, 254, 0.6)' }}
              >
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    backgroundColor: isDark ? '#3b82f6' : '#2563eb',
                    width: `${Math.max(2, readsPercentage)}%` 
                  }}
                />
              </div>
            </div>

            {/* Writes Card */}
            <div 
              className="border rounded-xl p-4 flex flex-col justify-between shadow-sm"
              style={{
                background: isDark ? 'linear-gradient(to bottom right, #064e3b, #022c22)' : 'linear-gradient(to bottom right, #ecfdf5, rgba(240, 253, 250, 0.4))',
                borderColor: isDark ? '#047857' : '#a7f3d0'
              }}
            >
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span 
                    className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5"
                    style={{ color: isDark ? '#6ee7b7' : '#064e3b' }}
                  >
                    <CheckCircle2 size={15} style={{ color: isDark ? '#34d399' : '#059669' }} />
                    {period === 'daily' ? (language === 'ar' ? 'عمليات الكتابة اليومية' : 'Daily Writes') : (language === 'ar' ? 'عمليات الكتابة الشهرية' : 'Monthly Writes')}
                  </span>
                  <span 
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ 
                      backgroundColor: isDark ? '#022c22' : '#d1fae5',
                      color: isDark ? '#6ee7b7' : '#065f46'
                    }}
                  >
                    {writesPercentage < 1 ? '< 1%' : `${writesPercentage.toFixed(1)}%`}
                  </span>
                </div>
                <div 
                  className="text-2xl font-black"
                  style={{ color: isDark ? '#ffffff' : '#065f46' }}
                >
                  {currentWrites.toLocaleString()}
                  <span 
                    className="text-xs font-normal ml-1.5"
                    style={{ color: isDark ? '#94a3b8' : '#6b7280' }}
                  >/ {currentWritesLimit.toLocaleString()}</span>
                </div>
                <p 
                  className="text-[11px] mt-1"
                  style={{ color: isDark ? '#94a3b8' : '#6b7280' }}
                >
                  {language === 'ar' ? `المتبقي: ${(currentWritesLimit - currentWrites).toLocaleString()} عملية` : `${(currentWritesLimit - currentWrites).toLocaleString()} writes left`}
                </p>
              </div>

              <div 
                className="w-full rounded-full h-2 mt-4 overflow-hidden"
                style={{ backgroundColor: isDark ? 'rgba(4, 120, 87, 0.6)' : 'rgba(167, 243, 208, 0.6)' }}
              >
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    backgroundColor: isDark ? '#10b981' : '#059669',
                    width: `${Math.max(2, writesPercentage)}%` 
                  }}
                />
              </div>
            </div>

            {/* Storage Card */}
            <div 
              className="border rounded-xl p-4 flex flex-col justify-between shadow-sm"
              style={{
                background: isDark ? 'linear-gradient(to bottom right, #4c1d95, #2e1065)' : 'linear-gradient(to bottom right, #faf5ff, rgba(253, 244, 255, 0.4))',
                borderColor: isDark ? '#6d28d9' : '#e9d5ff'
              }}
            >
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span 
                    className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5"
                    style={{ color: isDark ? '#d8b4fe' : '#581c87' }}
                  >
                    <HardDrive size={15} style={{ color: isDark ? '#c084fc' : '#9333ea' }} />
                    {language === 'ar' ? 'مساحة التخزين الكلية' : 'Database Storage'}
                  </span>
                  <span 
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ 
                      backgroundColor: isDark ? '#3b0764' : '#f3e8ff',
                      color: isDark ? '#d8b4fe' : '#6b21a8'
                    }}
                  >
                    {storagePercentage < 0.01 ? '< 0.01%' : `${storagePercentage.toFixed(2)}%`}
                  </span>
                </div>
                <div 
                  className="text-2xl font-black"
                  style={{ color: isDark ? '#ffffff' : '#3b0764' }}
                >
                  {totalKB} KB
                  <span 
                    className="text-xs font-normal ml-1.5"
                    style={{ color: isDark ? '#94a3b8' : '#6b7280' }}
                  >/ 1.00 GB</span>
                </div>
                <p 
                  className="text-[11px] mt-1"
                  style={{ color: isDark ? '#94a3b8' : '#6b7280' }}
                >
                  {language === 'ar' ? `المستهلك: ${(Number(totalMB)).toFixed(2)} MB من 1024 MB` : `${(Number(totalMB)).toFixed(2)} MB used out of 1024 MB`}
                </p>
              </div>

              <div 
                className="w-full rounded-full h-2 mt-4 overflow-hidden"
                style={{ backgroundColor: isDark ? 'rgba(109, 40, 217, 0.6)' : 'rgba(233, 213, 255, 0.6)' }}
              >
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    backgroundColor: isDark ? '#a855f7' : '#9333ea',
                    width: `${Math.max(2, storagePercentage)}%` 
                  }}
                />
              </div>
            </div>
          </div>

          {/* REAL REGISTERED ACCOUNTS BREAKDOWN */}
          <div 
            className="border rounded-xl p-5"
            style={{ 
              backgroundColor: isDark ? '#112238' : 'rgba(249, 250, 251, 0.6)',
              borderColor: isDark ? '#1e3a8a' : '#e5e7eb'
            }}
          >
            <div className="flex justify-between items-center mb-3">
              <h4 
                className="font-bold text-sm flex items-center gap-2"
                style={{ color: isDark ? '#f8fafc' : '#1f2937' }}
              >
                <Users size={18} style={{ color: isDark ? '#60a5fa' : '#002D62' }} />
                <span>{language === 'ar' ? 'الحسابات الفعلية المسجلة بالتطبيق (Real Registered Accounts)' : 'Real Registered User Accounts'}</span>
              </h4>
              <span 
                className="text-xs"
                style={{ color: isDark ? '#94a3b8' : '#6b7280' }}
              >
                {language === 'ar' ? '(لا تشمل السجلات المستوردة من Excel)' : '(Excludes imported Excel data)'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div 
                className="p-3.5 rounded-lg border shadow-xs"
                style={{ backgroundColor: isDark ? '#0a1628' : '#ffffff', borderColor: isDark ? '#1e3a8a' : '#bfdbfe' }}
              >
                <div className="text-xs font-medium" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>{language === 'ar' ? 'إجمالي الحسابات الفعلية' : 'Real Accounts'}</div>
                <div className="text-2xl font-black mt-0.5" style={{ color: isDark ? '#ffffff' : '#002D62' }}>{realUsers.length}</div>
              </div>

              <div 
                className="p-3.5 rounded-lg border shadow-xs"
                style={{ backgroundColor: isDark ? '#0a1628' : '#ffffff', borderColor: isDark ? '#064e3b' : '#a7f3d0' }}
              >
                <div className="text-xs font-medium" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>{language === 'ar' ? 'حسابات نشطة ومفعلة' : 'Active Approved'}</div>
                <div className="text-2xl font-black mt-0.5" style={{ color: isDark ? '#34d399' : '#059669' }}>{realApprovedUsers.length}</div>
              </div>

              <div 
                className="p-3.5 rounded-lg border shadow-xs"
                style={{ backgroundColor: isDark ? '#0a1628' : '#ffffff', borderColor: isDark ? '#78350f' : '#fde68a' }}
              >
                <div className="text-xs font-medium" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>{language === 'ar' ? 'طلبات بالانتظار' : 'Pending Requests'}</div>
                <div className="text-2xl font-black mt-0.5" style={{ color: isDark ? '#fbbf24' : '#d97706' }}>{realPendingUsers.length}</div>
              </div>

              <div 
                className="p-3.5 rounded-lg border shadow-xs"
                style={{ backgroundColor: isDark ? '#0a1628' : '#ffffff', borderColor: isDark ? '#312e81' : '#c7d2fe' }}
              >
                <div className="text-xs font-medium" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>{language === 'ar' ? 'المهندسين' : 'Engineers'}</div>
                <div className="text-2xl font-black mt-0.5" style={{ color: isDark ? '#818cf8' : '#4338ca' }}>{realEngineers.length}</div>
              </div>

              <div 
                className="p-3.5 rounded-lg border shadow-xs"
                style={{ backgroundColor: isDark ? '#0a1628' : '#ffffff', borderColor: isDark ? '#4c1d95' : '#e9d5ff' }}
              >
                <div className="text-xs font-medium" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>{language === 'ar' ? 'الفنيين' : 'Technicians'}</div>
                <div className="text-2xl font-black mt-0.5" style={{ color: isDark ? '#c084fc' : '#7e22ce' }}>{realTechnicians.length}</div>
              </div>

              <div 
                className="p-3.5 rounded-lg border shadow-xs"
                style={{ backgroundColor: isDark ? '#0a1628' : '#ffffff', borderColor: isDark ? '#134e4a' : '#99f6e4' }}
              >
                <div className="text-xs font-medium" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>{language === 'ar' ? 'السائقين والمشغلين' : 'Operators'}</div>
                <div className="text-2xl font-black mt-0.5" style={{ color: isDark ? '#2dd4bf' : '#0f766e' }}>{realOperators.length}</div>
              </div>

              <div 
                className="p-3.5 rounded-lg border shadow-xs"
                style={{ backgroundColor: isDark ? '#0a1628' : '#ffffff', borderColor: isDark ? '#1f2937' : '#e5e7eb' }}
              >
                <div className="text-xs font-medium" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>{language === 'ar' ? 'المديرين والمشرفين' : 'Managers / Sups'}</div>
                <div className="text-2xl font-black mt-0.5" style={{ color: isDark ? '#e2e8f0' : '#1f2937' }}>{realManagers.length}</div>
              </div>

              <div 
                className="p-3.5 rounded-lg border shadow-xs"
                style={{ backgroundColor: isDark ? '#0a1628' : '#ffffff', borderColor: isDark ? '#1e3a8a' : '#93c5fd' }}
              >
                <div className="text-xs font-medium" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>{language === 'ar' ? 'المسؤولين (Admins)' : 'Admins'}</div>
                <div className="text-2xl font-black mt-0.5" style={{ color: isDark ? '#60a5fa' : '#002D62' }}>{realAdmins.length}</div>
              </div>
            </div>
          </div>

          {/* Cleaned Training Records Info */}
          <div 
            className="border rounded-xl p-4 flex justify-between items-center shadow-sm"
            style={{ 
              backgroundColor: isDark ? '#0a1628' : '#ffffff',
              borderColor: isDark ? '#1e3a8a' : '#e5e7eb'
            }}
          >
            <div>
              <div 
                className="font-bold text-sm"
                style={{ color: isDark ? '#e2e8f0' : '#1f2937' }}
              >
                {language === 'ar' ? 'إجمالي سجلات الدورات التاريخية (Cleaned Data Records):' : 'Imported Historical Course Records:'}
              </div>
              <div 
                className="text-xs mt-0.5"
                style={{ color: isDark ? '#94a3b8' : '#6b7280' }}
              >
                {language === 'ar' ? 'البيانات التاريخية المحفوظة في قاعدة البيانات' : 'Total historical trainee records stored in Firebase'}
              </div>
            </div>
            <div 
              className="text-2xl font-black"
              style={{ color: isDark ? '#60a5fa' : '#1d4ed8' }}
            >
              {cleanedData.length.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div 
          className="border-t px-6 py-3 flex justify-end"
          style={{ 
            backgroundColor: isDark ? '#061020' : '#f9fafb',
            borderColor: isDark ? '#1e3a8a' : '#e5e7eb'
          }}
        >
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