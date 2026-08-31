import React from 'react';
import { useAppContext } from '../context';
import { mockCourses } from '../data';
import { DataField } from './DataField';

export const ManagerDashboard: React.FC = () => {
  const { t, user, users, records } = useAppContext();
  
  const department = user?.department || 'ORC - Katamia - Workshop';
  const deptUsers = users.filter(u => u.department === department && u.role === 'trainee');
  const deptUserIds = deptUsers.map(u => u.id);
  const deptRecords = records.filter(r => deptUserIds.includes(r.userId));

  // Calculate most attended courses
  const courseCounts: Record<string, number> = {};
  deptRecords.forEach(r => {
    courseCounts[r.courseId] = (courseCounts[r.courseId] || 0) + 1;
  });
  
  const topCourses = Object.entries(courseCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, count]) => {
      const course = mockCourses.find(c => c.id === id);
      return { title: course?.title || 'Unknown', count };
    });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 border-b-2 border-[#FFC000] pb-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#002D62] dark:text-blue-400">
            {t('managerView')}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Department Performance & Team Compliance
          </p>
        </div>
        <div className="text-gray-700 dark:text-gray-300 font-bold flex items-center gap-2 bg-white dark:bg-[#193158] px-4 py-2 rounded-xl shadow-xs border border-gray-200 dark:border-slate-700">
          <span>{t('department')}:</span> <DataField className="text-[#002D62] dark:text-[#FFC000] text-lg font-black">{department}</DataField>
        </div>
      </div>

      <section>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{t('departmentStats')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#193158] p-6 rounded-2xl shadow-sm border-t-4 border-[#002D62] dark:border-blue-500 border border-gray-200 dark:border-slate-700">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">{t('totalEngineersTrained')}</p>
            <p className="text-4xl font-black text-[#002D62] dark:text-white">{deptUsers.length}</p>
          </div>
          <div className="bg-white dark:bg-[#193158] p-6 rounded-2xl shadow-sm border-t-4 border-[#FFC000] border border-gray-200 dark:border-slate-700">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">{t('mostAttendedCourses')}</p>
            {topCourses.length > 0 ? (
              <ul className="space-y-3">
                {topCourses.map((c, i) => (
                  <li key={i} className="flex justify-between items-center bg-gray-50 dark:bg-[#0F1E36] p-2.5 rounded-xl border border-gray-100 dark:border-slate-800">
                    <span className="font-bold text-gray-800 dark:text-gray-200 text-sm"><DataField>{c.title}</DataField></span>
                    <span className="bg-[#002D62] dark:bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">{c.count} {t('attendees')}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400 dark:text-gray-500 text-sm">{t('noData')}</p>
            )}
          </div>
        </div>
      </section>

      {/* Trainees List for Manager */}
      <section className="bg-white dark:bg-[#193158] p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
         <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Team Members</h2>
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-[#0F1E36] text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider">
                  <th className="p-3 border-b dark:border-slate-700">{t('hrCode')}</th>
                  <th className="p-3 border-b dark:border-slate-700">{t('name')}</th>
                  <th className="p-3 border-b dark:border-slate-700">{t('phone')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {deptUsers.map(u => (
                  <tr key={u.id} className={`hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors ${u.status === "deleted" ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300" : "text-gray-900 dark:text-gray-200"}`}>
                    <td className="p-3 text-sm font-mono font-bold"><DataField>{u.hrCode}</DataField></td>
                    <td className="p-3 text-sm font-bold"><DataField>{u.name}</DataField></td>
                    <td className="p-3 text-sm font-mono"><DataField>{u.phone || 'N/A'}</DataField></td>
                  </tr>
                ))}
              </tbody>
            </table>
         </div>
      </section>
    </div>
  );
};
