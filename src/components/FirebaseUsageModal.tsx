import React from 'react';
import { useAppContext } from '../context';
import { 
  X, 
  Database, 
  Activity, 
  HardDrive, 
  Users, 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  AlertTriangle,
  TrendingUp
} from 'lucide-react';

interface FirebaseUsageModalProps {
  onClose: () => void;
}

export const FirebaseUsageModal: React.FC<FirebaseUsageModalProps> = ({ onClose }) => {
  const { 
    language, 
    users, 
    cleanedData, 
    records, 
    upcomingSessions, 
    announcements, 
    loginLogs 
  } = useAppContext();

  // 1. Storage Calculation (approximate JSON payload byte size in memory)
  const totalUsersBytes = new Blob([JSON.stringify(users)]).size;
  const totalCleanedDataBytes = new Blob([JSON.stringify(cleanedData)]).size;
  const totalSessionsBytes = new Blob([JSON.stringify(upcomingSessions)]).size;
  const totalAnnouncementsBytes = new Blob([JSON.stringify(announcements)]).size;
  const totalLogsBytes = new Blob([JSON.stringify(loginLogs)]).size;

  const totalBytes = totalUsersBytes + totalCleanedDataBytes + totalSessionsBytes + totalAnnouncementsBytes + totalLogsBytes;
  const totalKB = (totalBytes / 1024).toFixed(2);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(3);

  // Free Tier limit: 1 GB = 1024 MB = 1,073,741,824 Bytes
  const FREE_TIER_STORAGE_BYTES = 1024 * 1024 * 1024;
  const storagePercentage = Math.min(100, (totalBytes / FREE_TIER_STORAGE_BYTES) * 100);

  // 2. Daily Reads Calculation (Spark Tier: 50,000 Reads / day)
  const FREE_TIER_DAILY_READS = 50000;
  const totalDocsCount = users.length + cleanedData.length + upcomingSessions.length + announcements.length + loginLogs.length;
  // Estimated daily read operations based on listeners and active users
  const estimatedDailyReads = Math.max(totalDocsCount, (loginLogs.length * 3) + (users.length * 2) + totalDocsCount);
  const readsPercentage = Math.min(100, (estimatedDailyReads / FREE_TIER_DAILY_READS) * 100);

  // 3. Daily Writes Calculation (Spark Tier: 20,000 Writes / day)
  const FREE_TIER_DAILY_WRITES = 20000;
  // Estimated daily writes: login logs + session modifications + user registrations
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayLogins = loginLogs.filter(l => l.timestamp && l.timestamp.startsWith(todayDateStr)).length;
  const estimatedDailyWrites = Math.max(todayLogins + 5, loginLogs.length);
  const writesPercentage = Math.min(100, (estimatedDailyWrites / FREE_TIER_DAILY_WRITES) * 100);

  // 4. User Breakdown
  const totalUsersCount = users.length;
  const approvedUsers = users.filter(u => u.status === 'approved' || !u.status).length;
  const pendingUsers = users.filter(u => u.status === 'pending').length;
  const engineersCount = users.filter(u => (u.jobRole || u.role || '').toLowerCase().includes('engineer')).length;
  const techniciansCount = users.filter(u => (u.jobRole || u.role || '').toLowerCase().includes('technician')).length;
  const operatorsCount = users.filter(u => (u.jobRole || u.role || '').toLowerCase().includes('operator')).length;
  const managersCount = users.filter(u => u.role === 'manager' || u.role === 'supervisor').length;
  const adminsCount = users.filter(u => u.role === 'admin').length;

  return (
    <div className="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#002D62] text-white px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FFC000] text-[#002D62] rounded-lg shadow-sm">
              <Activity size={22} />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                {language === 'ar' ? 'مؤشرات استهلاك واستخدام قاعدة البيانات (Firebase Quota)' : 'Firebase Usage & Quota Monitor'}
              </h3>
              <p className="text-xs text-blue-200">
                {language === 'ar' ? 'الخطة المجانية (Spark Free Plan) - تحديث حي' : 'Spark Free Tier - Live Real-Time Metrics'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-white transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Main 3 Quotas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Reads Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/40 border border-blue-200 rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wide flex items-center gap-1.5">
                    <TrendingUp size={15} className="text-blue-600" />
                    {language === 'ar' ? 'عمليات القراءة اليومية' : 'Daily Reads'}
                  </span>
                  <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                    {readsPercentage < 1 ? '< 1%' : `${readsPercentage.toFixed(1)}%`}
                  </span>
                </div>
                <div className="text-2xl font-black text-[#002D62]">
                  {estimatedDailyReads.toLocaleString()}
                  <span className="text-xs font-normal text-gray-500 ml-1.5">/ {FREE_TIER_DAILY_READS.toLocaleString()}</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  {language === 'ar' ? `المتبقي اليوم: ${(FREE_TIER_DAILY_READS - estimatedDailyReads).toLocaleString()} عملية` : `${(FREE_TIER_DAILY_READS - estimatedDailyReads).toLocaleString()} reads remaining today`}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-blue-200/60 rounded-full h-2 mt-4 overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(2, readsPercentage)}%` }}
                />
              </div>
            </div>

            {/* Writes Card */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50/40 border border-emerald-200 rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    {language === 'ar' ? 'عمليات الكتابة اليومية' : 'Daily Writes'}
                  </span>
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    {writesPercentage < 1 ? '< 1%' : `${writesPercentage.toFixed(1)}%`}
                  </span>
                </div>
                <div className="text-2xl font-black text-emerald-800">
                  {estimatedDailyWrites.toLocaleString()}
                  <span className="text-xs font-normal text-gray-500 ml-1.5">/ {FREE_TIER_DAILY_WRITES.toLocaleString()}</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  {language === 'ar' ? `المتبقي اليوم: ${(FREE_TIER_DAILY_WRITES - estimatedDailyWrites).toLocaleString()} عملية` : `${(FREE_TIER_DAILY_WRITES - estimatedDailyWrites).toLocaleString()} writes remaining today`}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-emerald-200/60 rounded-full h-2 mt-4 overflow-hidden">
                <div 
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(2, writesPercentage)}%` }}
                />
              </div>
            </div>

            {/* Storage Card */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50/40 border border-purple-200 rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-purple-900 uppercase tracking-wide flex items-center gap-1.5">
                    <HardDrive size={15} className="text-purple-600" />
                    {language === 'ar' ? 'مساحة التخزين الكلية' : 'Database Storage'}
                  </span>
                  <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                    {storagePercentage < 0.01 ? '< 0.01%' : `${storagePercentage.toFixed(2)}%`}
                  </span>
                </div>
                <div className="text-2xl font-black text-purple-900">
                  {Number(totalMB) > 0 ? `${totalMB} MB` : `${totalKB} KB`}
                  <span className="text-xs font-normal text-gray-500 ml-1.5">/ 1.00 GB</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  {language === 'ar' ? `المتبقي: ${(1024 - Number(totalMB)).toFixed(1)} MB من 1024 MB` : `${(1024 - Number(totalMB)).toFixed(1)} MB free out of 1024 MB`}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-purple-200/60 rounded-full h-2 mt-4 overflow-hidden">
                <div 
                  className="bg-purple-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(2, storagePercentage)}%` }}
                />
              </div>
            </div>
          </div>

          {/* User Statistics Grid */}
          <div className="border border-gray-200 rounded-xl p-5 bg-gray-50/60">
            <h4 className="font-bold text-sm text-gray-800 mb-3 flex items-center gap-2">
              <Users size={18} className="text-[#002D62]" />
              <span>{language === 'ar' ? 'إجمالي عدد المستخدمين والحسابات المسجلة' : 'Registered Users Breakdown'}</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-xs">
                <div className="text-xs text-gray-500">{language === 'ar' ? 'إجمالي المستخدمين' : 'Total Users'}</div>
                <div className="text-xl font-bold text-[#002D62] mt-0.5">{totalUsersCount}</div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-xs">
                <div className="text-xs text-gray-500">{language === 'ar' ? 'حسابات مفعلة' : 'Approved Active'}</div>
                <div className="text-xl font-bold text-emerald-600 mt-0.5">{approvedUsers}</div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-xs">
                <div className="text-xs text-gray-500">{language === 'ar' ? 'طلبات بالانتظار' : 'Pending Requests'}</div>
                <div className="text-xl font-bold text-amber-600 mt-0.5">{pendingUsers}</div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-xs">
                <div className="text-xs text-gray-500">{language === 'ar' ? 'المهندسين' : 'Engineers'}</div>
                <div className="text-xl font-bold text-blue-700 mt-0.5">{engineersCount}</div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-xs">
                <div className="text-xs text-gray-500">{language === 'ar' ? 'الفنيين' : 'Technicians'}</div>
                <div className="text-xl font-bold text-purple-700 mt-0.5">{techniciansCount}</div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-xs">
                <div className="text-xs text-gray-500">{language === 'ar' ? 'السائقين والمشغلين' : 'Operators'}</div>
                <div className="text-xl font-bold text-indigo-700 mt-0.5">{operatorsCount}</div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-xs">
                <div className="text-xs text-gray-500">{language === 'ar' ? 'المديرين والمشرفين' : 'Managers / Sups'}</div>
                <div className="text-xl font-bold text-gray-800 mt-0.5">{managersCount}</div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-xs">
                <div className="text-xs text-gray-500">{language === 'ar' ? 'المسؤولين (Admins)' : 'Admins'}</div>
                <div className="text-xl font-bold text-[#002D62] mt-0.5">{adminsCount}</div>
              </div>
            </div>
          </div>

          {/* Database Collections Breakdown */}
          <div className="border border-gray-200 rounded-xl p-5 bg-white">
            <h4 className="font-bold text-sm text-gray-800 mb-3 flex items-center gap-2">
              <Database size={18} className="text-[#002D62]" />
              <span>{language === 'ar' ? 'تفاصيل مجموعات البيانات (Firestore Collections)' : 'Firestore Collections Size & Count'}</span>
            </h4>

            <div className="divide-y divide-gray-100 text-xs">
              <div className="py-2 flex justify-between items-center">
                <span className="font-medium text-gray-700">1. Cleaned Training Records (cleanedData)</span>
                <span className="font-bold text-gray-900">{cleanedData.length} docs ({(totalCleanedDataBytes / 1024).toFixed(1)} KB)</span>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="font-medium text-gray-700">2. Users Accounts (users)</span>
                <span className="font-bold text-gray-900">{users.length} docs ({(totalUsersBytes / 1024).toFixed(1)} KB)</span>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="font-medium text-gray-700">3. Upcoming Sessions (sessions)</span>
                <span className="font-bold text-gray-900">{upcomingSessions.length} docs ({(totalSessionsBytes / 1024).toFixed(1)} KB)</span>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="font-medium text-gray-700">4. Login History Logs (loginLogs)</span>
                <span className="font-bold text-gray-900">{loginLogs.length} docs ({(totalLogsBytes / 1024).toFixed(1)} KB)</span>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="font-medium text-gray-700">5. System Announcements (announcements)</span>
                <span className="font-bold text-gray-900">{announcements.length} docs ({(totalAnnouncementsBytes / 1024).toFixed(1)} KB)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#002D62] hover:bg-blue-900 text-white rounded-lg text-sm font-bold transition-colors"
          >
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
