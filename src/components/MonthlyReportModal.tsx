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

  const handleGenerateEML = () => {
    const activeCourses = aggregatedCourses.filter(c => selectedCourseIds.has(c.id));
    if (activeCourses.length === 0) {
      alert(language === 'ar' ? '???? ????? ???? ????? ??? ?????.' : 'Please select at least one course.');
      return;
    }

    const monthName = new Date(selectedYear, selectedMonth, 1).toLocaleString('en-US', { month: 'long' });
    const totalSessions = activeCourses.length;
    const totalParticipants = activeCourses.reduce((acc, curr) => acc + curr.count, 0);

    const emailSubject = "RE: Technical Training Monthly Update - " + monthName + " " + selectedYear;
    
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

    const emlContent = `To: Yasser.Elsaied@orascom.com\nCc: Rami.Samir@orascom.com\nSubject: ${emailSubject}\nX-Unsent: 1\nContent-Type: text/html; charset=utf-8\n\n${htmlBody}`;

    const blob = new Blob(['\ufeff', emlContent], { type: 'message/rfc822' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = "Monthly_Update_" + monthName + "_" + selectedYear + ".eml";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthsAr = ['?????', '??????', '????', '?????', '????', '?????', '?????', '?????', '??????', '??????', '??????', '??????'];
  
  const years = Array.from({length: 5}, (_, i) => currentDate.getFullYear() - 2 + i);

  return (
    <div className="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-[#002D62]">
            {language === 'ar' ? '????? ??????? ??????' : 'Monthly Update Report'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6 overflow-y-auto">
          <div className="flex gap-4 items-center bg-gray-50 p-4 rounded border border-gray-200">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">{language === 'ar' ? '?????' : 'Month'}</label>
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="border border-gray-300 rounded px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-[#002D62]"
              >
                {(language === 'ar' ? monthsAr : monthsEn).map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">{language === 'ar' ? '?????' : 'Year'}</label>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="border border-gray-300 rounded px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-[#002D62]"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-800 mb-3 flex justify-between items-center">
              <span>{language === 'ar' ? '??????? ????????' : 'Completed Sessions'}</span>
              <span className="text-sm bg-[#002D62] text-white px-2 py-1 rounded">
                {aggregatedCourses.filter(c => selectedCourseIds.has(c.id)).length} {language === 'ar' ? '?????' : 'Selected'}
              </span>
            </h3>
            
            {aggregatedCourses.length === 0 ? (
              <div className="text-center p-8 bg-gray-50 border border-dashed rounded text-gray-500">
                {language === 'ar' ? '?? ???? ????? ?????? ?? ??? ?????.' : 'No completed sessions found for this month.'}
              </div>
            ) : (
              <div className="border border-gray-200 rounded overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-100">
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
                      <th className="p-3 font-semibold">{language === 'ar' ? '??? ??????' : 'Course Name'}</th>
                      <th className="p-3 font-semibold">{language === 'ar' ? '????? ?????????' : 'Participant Category'}</th>
                      <th className="p-3 font-semibold text-center">{language === 'ar' ? '??? ????????' : 'Attendees'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregatedCourses.map((course, idx) => (
                      <tr key={course.id} className={order-t border-gray-100 hover:bg-gray-50 }>
                        <td className="p-3 text-center">
                          <input 
                            type="checkbox" 
                            checked={selectedCourseIds.has(course.id)}
                            onChange={() => toggleCourse(course.id)}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 font-medium text-gray-800">{course.name}</td>
                        <td className="p-3 text-gray-600">{course.participants}</td>
                        <td className="p-3 text-center font-bold text-[#002D62]">{course.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded font-bold text-gray-700 hover:bg-gray-100 transition-colors">
            {language === 'ar' ? '?????' : 'Cancel'}
          </button>
          <button 
            onClick={handleGenerateEML}
            disabled={selectedCourseIds.size === 0}
            className="bg-[#002D62] text-white px-6 py-2 rounded font-bold flex items-center gap-2 hover:bg-blue-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            <Mail size={18} />
            {language === 'ar' ? '????? ????? ???? (.eml)' : 'Generate Email (.eml)'}
          </button>
        </div>
      </div>
    </div>
  );
};

