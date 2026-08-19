import React, { useState, useMemo, useEffect } from 'react';
import { X, Mail } from 'lucide-react';
import { TrainingRecord, UpcomingSession } from '../types';
import { useAppContext } from '../context';

interface MonthlyReportModalProps {
  onClose: () => void;
  records: TrainingRecord[];
  upcomingSessions: UpcomingSession[];
}

export const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({ onClose, records, upcomingSessions }) => {
  const { language } = useAppContext();
  const currentDate = new Date();
  
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());

  // Aggregate data based on month/year
  const aggregatedCourses = useMemo(() => {
    const filteredRecords = records.filter(r => {
      if (!r.attendanceDate) return false;
      const d = new Date(r.attendanceDate);
      if (isNaN(d.getTime())) return false;
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });

    const groups: Record<string, { id: string, name: string, participants: string, count: number, startDate: string }> = {};

    filteredRecords.forEach(r => {
      if (!groups[r.courseId]) {
        const session = upcomingSessions.find(s => s.id === r.courseId);
        groups[r.courseId] = {
          id: r.courseId,
          name: r.courseName || session?.courseTitle || 'Unknown Course',
          participants: session?.targetParticipants || 'Engineers',
          count: 0,
          startDate: r.attendanceDate
        };
      }
      groups[r.courseId].count += 1;
    });

    return Object.values(groups).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [records, upcomingSessions, selectedMonth, selectedYear]);

  // Select all by default when aggregatedCourses changes
  useEffect(() => {
    setSelectedCourseIds(new Set(aggregatedCourses.map(c => c.id)));
  }, [aggregatedCourses]);

  const toggleCourse = (id: string) => {
    const newSet = new Set(selectedCourseIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedCourseIds(newSet);
  };

  const handleCopyToClipboard = async () => {
    const activeCourses = aggregatedCourses.filter(c => selectedCourseIds.has(c.id));
    if (activeCourses.length === 0) {
      alert(language === 'ar' ? 'يرجى اختيار دورة واحدة على الأقل.' : 'Please select at least one course.');
      return;
    }

    const monthName = new Date(selectedYear, selectedMonth, 1).toLocaleString('en-US', { month: 'long' });
    const totalSessions = activeCourses.length;
    const totalParticipants = activeCourses.reduce((acc, curr) => acc + curr.count, 0);

    // Build HTML Table for the email body
    const tableRows = activeCourses.map((c, i) => `
      <tr>
        <td style='border: 1px solid black; padding: 5px; text-align: center; background-color: #d9e8f5;'>${i + 1}</td>
        <td style='border: 1px solid black; padding: 5px; background-color: #d9e8f5;'>${c.name}</td>
        <td style='border: 1px solid black; padding: 5px; text-align: center;'>${c.participants}</td>
        <td style='border: 1px solid black; padding: 5px; text-align: center; background-color: #d9e8f5;'>${c.count}</td>
      </tr>
    `).join('');

    const htmlBody = `
      <html>
      <head>
        <meta charset='utf-8'>
      </head>
      <body style='font-family: Arial, sans-serif; font-size: 14px;'>
        <p>Dear Eng. Yasser,</p>
        <p>Kindly find the following data :</p>
        <table style='border-collapse: collapse; width: 100%; max-width: 600px;'>
          <thead>
            <tr style='background-color: #a6a6a6; font-weight: bold;'>
              <td style='border: 1px solid black; padding: 5px; width: 30px;'></td>
              <td style='border: 1px solid black; padding: 5px; text-align: center;'>Course Name</td>
              <td style='border: 1px solid black; padding: 5px; text-align: center;'>Participant</td>
              <td style='border: 1px solid black; padding: 5px; text-align: center;'>No Of<br/>Participants</td>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <br/>
        <ul style='list-style-type: disc;'>
          <li>Total Sessions: ${totalSessions}</li>
          <li>Total Participants: ${totalParticipants}</li>
        </ul>
        <br/>
        <p>Best Regards,<br/>Nader kamel</p>
      </body>
      </html>
    `;

    try {
      const blob = new Blob([htmlBody], { type: 'text/html' });
      const clipboardItem = new ClipboardItem({ 'text/html': blob });
      await navigator.clipboard.write([clipboardItem]);
      alert(language === 'ar' ? 'تم نسخ التقرير! يمكنك الآن لصقه في بريدك الإلكتروني.' : 'Report copied! You can now paste it into your email.');
    } catch (err) {
      console.error('Failed to copy text: ', err);
      alert(language === 'ar' ? 'فشل في نسخ التقرير.' : 'Failed to copy report.');
    }
  };

  const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthsAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  
  const years = Array.from({length: 5}, (_, i) => currentDate.getFullYear() - 2 + i);

  return (
    <div className="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-[#002D62] dark:text-[#70B2FF]">
            {language === 'ar' ? 'تقرير التحديث الشهري' : 'Monthly Update Report'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6 overflow-y-auto">
          <div className="flex gap-4 items-center bg-gray-50 dark:bg-[#0E1A32] p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{language === 'ar' ? 'الشهر' : 'Month'}</label>
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-[#0D1A33] text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-[#002D62]"
              >
                {(language === 'ar' ? monthsAr : monthsEn).map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{language === 'ar' ? 'السنة' : 'Year'}</label>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-[#0D1A33] text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-[#002D62]"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex justify-between items-center">
              <span>{language === 'ar' ? 'الجلسات المكتملة' : 'Completed Sessions'}</span>
              <span className="text-sm bg-[#002D62] text-white px-2.5 py-1 rounded-md font-semibold">
                {aggregatedCourses.filter(c => selectedCourseIds.has(c.id)).length} {language === 'ar' ? 'محدد' : 'Selected'}
              </span>
            </h3>
            
            {aggregatedCourses.length === 0 ? (
              <div className="text-center p-8 bg-gray-50 dark:bg-white/[0.03] border border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400">
                {language === 'ar' ? 'لا توجد جلسات مكتملة في هذا الشهر.' : 'No completed sessions found for this month.'}
              </div>
            ) : (
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-100 dark:bg-[#0A1324] text-gray-700 dark:text-gray-200">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <input 
                          type="checkbox" 
                          checked={selectedCourseIds.size === aggregatedCourses.length && aggregatedCourses.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedCourseIds(new Set(aggregatedCourses.map(c => c.id)));
                            else setSelectedCourseIds(new Set());
                          }}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </th>
                      <th className="p-3 font-semibold">{language === 'ar' ? 'اسم الدورة' : 'Course Name'}</th>
                      <th className="p-3 font-semibold">{language === 'ar' ? 'الفئة المستهدفة' : 'Participant Category'}</th>
                      <th className="p-3 font-semibold text-center">{language === 'ar' ? 'الحضور' : 'Attendees'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregatedCourses.map((course, idx) => (
                      <tr key={course.id} className={`border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/[0.04] ${!selectedCourseIds.has(course.id) ? 'opacity-50 bg-gray-50 dark:bg-transparent' : ''}`}>
                        <td className="p-3 text-center">
                          <input 
                            type="checkbox" 
                            checked={selectedCourseIds.has(course.id)}
                            onChange={() => toggleCourse(course.id)}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 font-medium text-gray-800 dark:text-gray-100">{course.name}</td>
                        <td className="p-3 text-gray-600 dark:text-gray-300">{course.participants}</td>
                        <td className="p-3 text-center font-bold text-[#002D62] dark:text-[#70B2FF]">{course.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0E1A32] flex justify-end gap-3 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-colors">
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
          <button 
            onClick={handleCopyToClipboard}
            disabled={selectedCourseIds.size === 0}
            className="bg-[#002D62] text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            <Mail size={18} />
            {language === 'ar' ? 'نسخ التقرير للإيميل' : 'Copy Report to Email'}
          </button>
        </div>
      </div>
    </div>
  );

};
