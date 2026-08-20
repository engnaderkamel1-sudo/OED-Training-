import React, { useState, useMemo, useEffect } from 'react';
import { X, Mail, Copy, Check, Calendar, Plus, Trash2 } from 'lucide-react';
import { TrainingRecord, UpcomingSession, CleanedRecord, User } from '../types';
import { useAppContext } from '../context';

interface MonthlyReportModalProps {
  onClose: () => void;
  records: TrainingRecord[];
  upcomingSessions: UpcomingSession[];
  cleanedData?: CleanedRecord[];
  users?: User[];
}

export const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({ 
  onClose, 
  records = [], 
  upcomingSessions = [], 
  cleanedData = [],
  users = []
}) => {
  const { language } = useAppContext();
  const currentDate = new Date();
  
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(currentDate.getMonth()); // 0-11 or 'all'
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(currentDate.getFullYear());
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  // Parse any date string into { month: 0-11, year: YYYY }
  const parseDateParts = (dateStr?: string): { month: number, year: number } | null => {
    if (!dateStr) return null;
    const str = String(dateStr).trim();
    
    // Check ISO format YYYY-MM-DD or YYYY/MM/DD
    const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (isoMatch) {
      return { year: parseInt(isoMatch[1], 10), month: parseInt(isoMatch[2], 10) - 1 };
    }
    
    // Check DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (dmyMatch) {
      return { year: parseInt(dmyMatch[3], 10), month: parseInt(dmyMatch[2], 10) - 1 };
    }

    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return { year: d.getFullYear(), month: d.getMonth() };
    }
    return null;
  };

  // Aggregate data based on month/year across records, cleanedData, and upcomingSessions
  const aggregatedCourses = useMemo(() => {
    const groups: Record<string, { id: string, name: string, participants: string, count: number, startDate: string }> = {};

    const matchesFilter = (dateStr?: string) => {
      if (!dateStr) return selectedMonth === 'all' && selectedYear === 'all';
      const parts = parseDateParts(dateStr);
      if (!parts) return false;
      const monthMatch = selectedMonth === 'all' || parts.month === selectedMonth;
      const yearMatch = selectedYear === 'all' || parts.year === selectedYear;
      return monthMatch && yearMatch;
    };

    // 1. Process Training Records (from Finalized Sessions & manual inputs)
    records.forEach(r => {
      const date = r.attendanceDate || (r as any).date;
      if (matchesFilter(date)) {
        const key = r.courseId || r.courseName || 'unknown_course';
        if (!groups[key]) {
          const session = upcomingSessions.find(s => s.id === r.courseId || s.courseTitle === r.courseName);
          groups[key] = {
            id: key,
            name: r.courseName || session?.courseTitle || key,
            participants: session?.targetParticipants || 'Engineers / Technicians',
            count: 0,
            startDate: date || session?.startDate || ''
          };
        }
        groups[key].count += 1;
      }
    });

    // 2. Process Cleaned Data (from uploaded Excel database)
    cleanedData.forEach(c => {
      const date = c.date;
      if (matchesFilter(date)) {
        const key = c.courseName || 'unknown_excel_course';
        if (!groups[key]) {
          groups[key] = {
            id: key,
            name: c.courseName,
            participants: c.role || c.department || 'All Trainees',
            count: 0,
            startDate: date || ''
          };
        }
        groups[key].count += 1;
      }
    });

    // 3. Process Completed Upcoming Sessions (if not already counted)
    upcomingSessions.forEach(s => {
      if (s.status === 'Completed' || (s.registeredUsers && s.registeredUsers.length > 0)) {
        const date = s.startDate || s.completedAt;
        if (matchesFilter(date)) {
          const key = s.id || s.courseTitle;
          const regCount = s.registeredUsers?.length || 0;
          if (!groups[key] && !groups[s.courseTitle]) {
            groups[key] = {
              id: key,
              name: s.courseTitle,
              participants: s.targetParticipants === 'engineers' ? 'Engineers' : s.targetParticipants === 'technicians' ? 'Technicians' : 'Mixed Trainees',
              count: regCount > 0 ? regCount : 1,
              startDate: s.startDate || ''
            };
          }
        }
      }
    });

    return Object.values(groups).sort((a, b) => {
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });
  }, [records, cleanedData, upcomingSessions, selectedMonth, selectedYear]);

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

    const monthLabel = selectedMonth === 'all' 
      ? (language === 'ar' ? 'جميع الأشهر' : 'All Months') 
      : new Date(typeof selectedYear === 'number' ? selectedYear : currentDate.getFullYear(), selectedMonth, 1).toLocaleString('en-US', { month: 'long' });
    
    const totalSessions = activeCourses.length;
    const totalParticipants = activeCourses.reduce((acc, curr) => acc + curr.count, 0);

    // Build HTML Table for the email body
    const tableRows = activeCourses.map((c, i) => `
      <tr>
        <td style='border: 1px solid black; padding: 6px; text-align: center; background-color: #d9e8f5; font-weight: bold;'>${i + 1}</td>
        <td style='border: 1px solid black; padding: 6px; background-color: #d9e8f5; font-weight: bold;'>${c.name}</td>
        <td style='border: 1px solid black; padding: 6px; text-align: center;'>${c.participants}</td>
        <td style='border: 1px solid black; padding: 6px; text-align: center; background-color: #d9e8f5; font-weight: bold;'>${c.count}</td>
      </tr>
    `).join('');

    const htmlBody = `
      <html>
      <head>
        <meta charset='utf-8'>
      </head>
      <body style='font-family: Arial, sans-serif; font-size: 14px;'>
        <p>Dear Eng. Yasser,</p>
        <p>Kindly find the training data report for <strong>${monthLabel} ${selectedYear !== 'all' ? selectedYear : ''}</strong>:</p>
        <table style='border-collapse: collapse; width: 100%; max-width: 650px; font-family: Arial, sans-serif;'>
          <thead>
            <tr style='background-color: #002D62; color: #ffffff; font-weight: bold;'>
              <td style='border: 1px solid black; padding: 8px; width: 30px; text-align: center;'>#</td>
              <td style='border: 1px solid black; padding: 8px; text-align: center;'>Course Name</td>
              <td style='border: 1px solid black; padding: 8px; text-align: center;'>Participant</td>
              <td style='border: 1px solid black; padding: 8px; text-align: center;'>No Of<br/>Participants</td>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <br/>
        <ul style='list-style-type: disc; font-weight: bold;'>
          <li>Total Sessions: ${totalSessions}</li>
          <li>Total Participants: ${totalParticipants}</li>
        </ul>
        <br/>
        <p>Best Regards,<br/><strong>Nader Kamel</strong><br/>Equipment Department (OED)</p>
      </body>
      </html>
    `;

    try {
      const blob = new Blob([htmlBody], { type: 'text/html' });
      const clipboardItem = new ClipboardItem({ 'text/html': blob });
      await navigator.clipboard.write([clipboardItem]);
      setCopied(true);
      setTimeout(() => setCopied(false), 3500);
      alert(language === 'ar' ? 'تم نسخ التقرير المنسق بنجاح! يمكنك الآن لصقه مباشرة في رسالة Outlook أو الإيميل.' : 'Report copied! You can now paste it into Outlook.');
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // Fallback to text copy
      navigator.clipboard.writeText(`Training Report (${monthLabel})\nTotal Sessions: ${totalSessions}\nTotal Participants: ${totalParticipants}`);
      alert(language === 'ar' ? 'تم نسخ ملخص التقرير بنجاح.' : 'Report text summary copied.');
    }
  };

  const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthsAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  
  const years = Array.from({length: 6}, (_, i) => currentDate.getFullYear() - 3 + i);

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[99999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0F1E36] w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] border border-gray-200 dark:border-slate-700 overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-800 bg-[#002D62] text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FFC000] text-[#001D42] flex items-center justify-center font-bold shadow-xs">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black leading-tight">
                {language === 'ar' ? 'تقرير التحديث الشهري الرسمي (Monthly Update Report)' : 'Official Monthly Update Report'}
              </h2>
              <p className="text-xs text-blue-200">
                {language === 'ar' ? 'تجميع شامل للدورات والحضور لتصديرها لإيميل الإدارة' : 'Aggregated training records and attendance for executive email reporting'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-white p-1.5 rounded-lg transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5 overflow-y-auto">
          {/* Filter Bar */}
          <div className="flex flex-wrap gap-4 items-center bg-gray-50 dark:bg-[#162744] p-4 rounded-2xl border border-gray-200 dark:border-slate-700/80 shadow-2xs">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
                📅 {language === 'ar' ? 'اختر الشهر' : 'Select Month'}
              </label>
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-white dark:bg-[#0D1A33] text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              >
                <option value="all">{language === 'ar' ? '🌟 جميع الأشهر (All Months)' : '🌟 All Months'}</option>
                {(language === 'ar' ? monthsAr : monthsEn).map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
                🗓️ {language === 'ar' ? 'اختر السنة' : 'Select Year'}
              </label>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-white dark:bg-[#0D1A33] text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              >
                <option value="all">{language === 'ar' ? '🌟 جميع السنوات (All Years)' : '🌟 All Years'}</option>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="self-end pb-0.5">
              <span className="inline-flex items-center gap-1.5 bg-blue-100 dark:bg-blue-900/50 text-[#002D62] dark:text-blue-200 px-3.5 py-2 rounded-xl text-xs font-black border border-blue-200 dark:border-blue-700">
                📊 {aggregatedCourses.length} {language === 'ar' ? 'دورة مطابقة' : 'matching courses'}
              </span>
            </div>
          </div>

          {/* Table Section */}
          <div>
            <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
              <h3 className="font-black text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-2">
                <span>{language === 'ar' ? 'الدورات المشمولة بالتقرير' : 'Courses in Report'}</span>
                <span className="text-xs bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 px-2.5 py-0.5 rounded-full font-bold border border-emerald-300 dark:border-emerald-700">
                  {aggregatedCourses.filter(c => selectedCourseIds.has(c.id)).length} / {aggregatedCourses.length} {language === 'ar' ? 'محدد' : 'selected'}
                </span>
              </h3>

              {aggregatedCourses.length > 0 && (
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedCourseIds(new Set(aggregatedCourses.map(c => c.id)))}
                    className="text-blue-600 dark:text-blue-300 hover:underline font-bold cursor-pointer"
                  >
                    {language === 'ar' ? 'تحديد الكل' : 'Select All'}
                  </button>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedCourseIds(new Set())}
                    className="text-gray-500 dark:text-gray-400 hover:underline font-bold cursor-pointer"
                  >
                    {language === 'ar' ? 'إلغاء التحديد' : 'Deselect All'}
                  </button>
                </div>
              )}
            </div>
            
            {aggregatedCourses.length === 0 ? (
              <div className="text-center p-10 bg-gray-50 dark:bg-[#162744] border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-2xl text-gray-600 dark:text-gray-300 space-y-2">
                <p className="font-bold text-sm">
                  {language === 'ar' ? '⚠️ لا توجد سجلات تدريب مطابقة للشهر والسنة المحددة.' : 'No training records found for the selected period.'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {language === 'ar' 
                    ? '💡 جرب اختيار "جميع الأشهر" أو قم بإنهاء دورة وتوثيق حضورها لتظهر تلقائياً هنا.' 
                    : 'Try selecting "All Months" or finalize a session to see it here.'}
                </p>
                <button
                  type="button"
                  onClick={() => { setSelectedMonth('all'); setSelectedYear('all'); }}
                  className="mt-2 px-4 py-2 bg-[#002D62] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer hover:bg-blue-900 transition-colors"
                >
                  {language === 'ar' ? 'عرض جميع الفترات والسجلات' : 'Show All Time Records'}
                </button>
              </div>
            ) : (
              <div className="border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-gray-100 dark:bg-[#0A1324] text-gray-800 dark:text-gray-100 font-bold border-b border-gray-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3.5 w-12 text-center">
                        <input 
                          type="checkbox" 
                          checked={selectedCourseIds.size === aggregatedCourses.length && aggregatedCourses.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedCourseIds(new Set(aggregatedCourses.map(c => c.id)));
                            else setSelectedCourseIds(new Set());
                          }}
                          className="w-4 h-4 cursor-pointer accent-blue-600"
                        />
                      </th>
                      <th className="p-3.5 font-bold">{language === 'ar' ? 'اسم الدورة التدريبية' : 'Course Title'}</th>
                      <th className="p-3.5 font-bold">{language === 'ar' ? 'الفئة المستهدفة' : 'Participants'}</th>
                      <th className="p-3.5 font-bold text-center">{language === 'ar' ? 'عدد الحضور' : 'Attendees'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {aggregatedCourses.map((course, idx) => (
                      <tr 
                        key={course.id} 
                        className={`transition-colors ${
                          !selectedCourseIds.has(course.id) 
                            ? 'opacity-40 bg-gray-50/50 dark:bg-transparent' 
                            : 'hover:bg-blue-50/50 dark:hover:bg-blue-950/30'
                        }`}
                      >
                        <td className="p-3.5 text-center">
                          <input 
                            type="checkbox" 
                            checked={selectedCourseIds.has(course.id)}
                            onChange={() => toggleCourse(course.id)}
                            className="w-4 h-4 cursor-pointer accent-blue-600"
                          />
                        </td>
                        <td className="p-3.5 font-bold text-gray-900 dark:text-white">{course.name}</td>
                        <td className="p-3.5 text-gray-600 dark:text-gray-300 font-medium">{course.participants}</td>
                        <td className="p-3.5 text-center font-black text-blue-600 dark:text-blue-400 text-sm">
                          {course.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-[#0D1A33] flex justify-between items-center flex-wrap gap-3">
          <div className="text-xs font-bold text-gray-700 dark:text-gray-300">
            <span>{language === 'ar' ? 'إجمالي الحضور المحدد:' : 'Total Selected Attendees:'} </span>
            <strong className="text-blue-600 dark:text-blue-400 text-sm">
              {aggregatedCourses.filter(c => selectedCourseIds.has(c.id)).reduce((acc, curr) => acc + curr.count, 0)}
            </strong>
          </div>

          <div className="flex gap-3">
            <button 
              type="button"
              onClick={onClose} 
              className="px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-xs cursor-pointer"
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button 
              type="button"
              onClick={handleCopyToClipboard}
              disabled={selectedCourseIds.size === 0}
              className="bg-[#FFC000] hover:bg-yellow-400 text-[#001D42] px-6 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer hover:scale-105"
            >
              {copied ? <Check size={16} /> : <Mail size={16} />}
              <span>{copied ? (language === 'ar' ? 'تم النسخ بنجاح! ✓' : 'Copied! ✓') : (language === 'ar' ? 'نسخ التقرير المنسق للإيميل 📋' : 'Copy Formatted Report to Email 📋')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
