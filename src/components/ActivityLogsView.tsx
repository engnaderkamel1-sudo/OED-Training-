import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Activity, RefreshCw, Loader2, MapPin } from 'lucide-react';
import { useAppContext } from '../context';

export const ActivityLogsView: React.FC = () => {
  const { language } = useAppContext();
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchActivityLogs = async () => {
    setLoadingLogs(true);
    try {
      const q = query(
        collection(db, 'activity_logs'),
        orderBy('timestamp', 'desc'),
        limit(200)
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
    fetchActivityLogs();
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fadeIn">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
        <h3 className="font-bold text-[#002D62] flex items-center gap-2">
          <Activity size={20} className="text-[#FFC000]" />
          {language === 'ar' ? 'سجل نشاط المستخدمين (الجلسات)' : 'User Activity Logs'}
        </h3>
        <button 
          onClick={fetchActivityLogs}
          disabled={loadingLogs}
          className="flex items-center gap-2 text-sm bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={14} className={loadingLogs ? 'animate-spin text-[#FFC000]' : 'text-gray-500'} />
          {language === 'ar' ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left rtl:text-right">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs border-b border-gray-200">
            <tr>
              <th className="px-6 py-4">{language === 'ar' ? 'الوقت' : 'Time'}</th>
              <th className="px-6 py-4">{language === 'ar' ? 'المستخدم' : 'User'}</th>
              <th className="px-6 py-4">{language === 'ar' ? 'HR Code' : 'HR Code'}</th>
              <th className="px-6 py-4">{language === 'ar' ? 'الحدث / النشاط' : 'Action / Event'}</th>
              {/* --- ضفنا عمود اللوكيشن هنا --- */}
              <th className="px-6 py-4">{language === 'ar' ? 'الموقع الجغرافي (IP)' : 'Location (IP)'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loadingLogs ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#002D62]" />
                  {language === 'ar' ? 'جاري تحميل السجلات...' : 'Loading logs...'}
                </td>
              </tr>
            ) : activityLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  {language === 'ar' ? 'لا توجد سجلات نشاط حتى الآن' : 'No activity logs found'}
                </td>
              </tr>
            ) : (
              activityLogs.map((log) => {
                const dateObj = log.timestamp?.toDate ? log.timestamp.toDate() : new Date();
                const formattedTime = new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                }).format(dateObj);

                let actionBadge = <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">{log.action}</span>;
                if (log.action === 'system_login') {
                  actionBadge = <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-bold border border-blue-100">{language === 'ar' ? 'تسجيل دخول' : 'System Login'}</span>;
                } else if (log.action === 'session_resume') {
                  actionBadge = <span className="bg-green-50 text-green-600 px-2 py-1 rounded text-xs font-bold border border-green-100">{language === 'ar' ? 'عودة للنشاط' : 'Resumed Activity'}</span>;
                }

                return (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-500">{formattedTime}</td>
                    <td className="px-6 py-3 font-bold text-[#002D62]">{log.userName || 'Unknown'}</td>
                    <td className="px-6 py-3 text-gray-600">{log.hrCode || 'N/A'}</td>
                    <td className="px-6 py-3">{actionBadge}</td>
                    {/* --- عرض اللوكيشن في الخلية الجديدة --- */}
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                        <MapPin size={14} className={log.location && log.location !== 'Unknown' ? 'text-blue-500' : 'text-gray-400'} />
                        {log.location || 'Unknown Location'}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};