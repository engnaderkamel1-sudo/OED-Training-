import React from 'react';
import { useAppContext } from '../context';
import { mockCourses } from '../data';
import { DataField } from './DataField';

export const ManagerDashboard: React.FC = () => {
  const { t, user, users, records } = useAppContext();
  
  const department = user?.department || 'Heavy Machinery';
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
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 border-b-2 border-[#FFC000] pb-2">
        <h1 className="text-2xl md:text-3xl font-bold text-[#002D62]">
          {t('managerView')}
        </h1>
        <div className="text-gray-600 font-medium flex items-center gap-2">
          <span>{t('department')}:</span> <DataField className="text-[#002D62] text-lg">{department}</DataField>
        </div>
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-800">{t('departmentStats')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow border-t-4 border-[#002D62]">
            <p className="text-sm text-gray-500 mb-2">{t('totalEngineersTrained')}</p>
            <p className="text-4xl font-bold text-[#002D62]">{deptUsers.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border-t-4 border-[#FFC000]">
            <p className="text-sm text-gray-500 mb-4">{t('mostAttendedCourses')}</p>
            {topCourses.length > 0 ? (
              <ul className="space-y-3">
                {topCourses.map((c, i) => (
                  <li key={i} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                    <span className="font-medium text-gray-800"><DataField>{c.title}</DataField></span>
                    <span className="bg-[#002D62] text-white text-xs font-bold px-2 py-1 rounded-full">{c.count} {t('attendees')}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400">{t('noData')}</p>
            )}
          </div>
        </div>
      </section>

      {/* Trainees List for Manager */}
      <section className="bg-white p-6 rounded-lg shadow overflow-hidden">
         <h2 className="text-xl font-semibold mb-4 text-gray-800">Team Members</h2>
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-600 text-sm">
                  <th className="p-3 border-b">{t('hrCode')}</th>
                  <th className="p-3 border-b">{t('name')}</th>
                  <th className="p-3 border-b">{t('phone')}</th>
                </tr>
              </thead>
              <tbody>
                {deptUsers.map(u => (
                  <tr key={u.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="p-3 text-sm"><DataField>{u.hrCode}</DataField></td>
                    <td className="p-3 text-sm font-medium"><DataField>{u.name}</DataField></td>
                    <td className="p-3 text-sm"><DataField>{u.phone}</DataField></td>
                  </tr>
                ))}
              </tbody>
            </table>
         </div>
      </section>
    </div>
  );
};
