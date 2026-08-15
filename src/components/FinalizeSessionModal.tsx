import React, { useState, useMemo, useEffect } from 'react';
import { UpcomingSession, User, TrainingRecord } from '../types';
import { useAppContext } from '../context';
import { X, Save, FileText, Mail, CheckCircle, Ban } from 'lucide-react';

interface FinalizeSessionModalProps {
  session: UpcomingSession;
  registeredUsers: User[];
  onClose: () => void;
  onFinalize: (newRecords: TrainingRecord[]) => void;
}

export const FinalizeSessionModal: React.FC<FinalizeSessionModalProps> = ({
  session,
  registeredUsers,
  onClose,
  onFinalize
}) => {
  const { language } = useAppContext();
  
  // State for each trainee's attendance and score
  const [traineeData, setTraineeData] = useState<Record<string, { days: number, score: number }>>({});
  const [isConfirming, setIsConfirming] = useState(false);

  // Initialize form with defaults
  useEffect(() => {
    const initial: Record<string, { days: number, score: number }> = {};
    registeredUsers.forEach(u => {
      // Default to 1 day and 0 score
      initial[u.id] = { days: 1, score: 0 };
    });
    setTraineeData(initial);
  }, [registeredUsers]);

  const handleDataChange = (userId: string, field: 'days' | 'score', value: number) => {
    setTraineeData(prev => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: value }
    }));
  };

  const activeTrainees = useMemo(() => {
    return registeredUsers.filter(u => (traineeData[u.id] || { days: 1 }).days > 0);
  }, [registeredUsers, traineeData]);

  // Export to Word (HTML to .doc trick)
  const exportToWord = () => {
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Course Report</title></head><body>`;
    const footer = "</body></html>";
    
    const content = `
      <table style="width: 100%; margin-bottom: 20px; font-family: Arial, sans-serif;">
        <tr>
          <td style="font-size: 28px; font-weight: bold; color: #7f7f7f;">Training Register</td>
          <td style="text-align: right;">
            <div style="font-size: 24px; font-weight: 900; font-style: italic; color: #7093b1; letter-spacing: 1px;">ORASCOM</div>
            <div style="font-size: 10px; font-weight: bold; color: #4c6d99; letter-spacing: 2px;">CONSTRUCTION</div>
          </td>
        </tr>
      </table>

      <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; text-align: center; margin-bottom: 30px; font-size: 14px;">
        <tr>
          <td style="font-weight: bold;">Course Title</td>
          <td>${session.courseTitle}</td>
          <td style="font-weight: bold;">Instructor</td>
          <td>Nader Reda</td>
          <td style="font-weight: bold;">Number Of Participants</td>
          <td>${activeTrainees.length}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Start Date</td>
          <td>${session.startDate}</td>
          <td style="font-weight: bold;">End Date</td>
          <td>${session.endDate || session.startDate}</td>
          <td style="font-weight: bold;">Duration (Days)</td>
          <td>${session.duration || '2'}</td>
        </tr>
      </table>

      <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; text-align: center; font-size: 14px;">
        <tr style="background-color: #e0e0e0; font-weight: bold;">
          <td style="width: 40px;"></td>
          <td>Participant Name</td>
          <td>Department</td>
          <td>ID</td>
          <td>Post Test %</td>
          <td>Attendance Days</td>
        </tr>
        ${activeTrainees.map((u, idx) => `
          <tr style="background-color: ${idx % 2 === 0 ? '#d9e8f5' : '#ffffff'};">
            <td>${idx + 1}</td>
            <td>${u.name.toUpperCase()}</td>
            <td>${u.department}</td>
            <td>${u.hrCode}</td>
            <td>${(traineeData[u.id] || { score: 0 }).score}%</td>
            <td>${(traineeData[u.id] || { days: 1 }).days}</td>
          </tr>
        `).join('')}
        ${Array.from({ length: Math.max(0, 10 - activeTrainees.length) }).map((_, i) => `
          <tr style="background-color: ${(activeTrainees.length + i) % 2 === 0 ? '#d9e8f5' : '#ffffff'}; height: 35px;">
            <td>${activeTrainees.length + i + 1}</td>
            <td></td><td></td><td></td><td></td><td></td>
          </tr>
        `).join('')}
      </table>
    `;

    const blob = new Blob(['\ufeff', header + content + footer], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Dynamic Filename Generation
    const sessionNumMap: Record<string, string> = { sessionOne: '1', sessionTwo: '2', sessionThree: '3' };
    const sNum = sessionNumMap[session.sessionNumber || ''] || '1';
    
    let month = 'Month';
    let year = 'Year';
    const d = new Date(session.startDate);
    if (!isNaN(d.getTime())) {
      month = d.toLocaleString('en-US', { month: 'long' });
      year = d.getFullYear().toString();
    }
    const numId = session.id.replace(/\D/g, '').slice(-3) || Math.floor(Math.random() * 900) + 100;
    const fileName = `${numId}.Training Register ${session.courseTitle.trim()} ${month} ${year} (${sNum}).doc`;
    
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate Email Draft
  const draftEmail = () => {
    if (activeTrainees.length === 0) {
      alert(language === 'ar' ? 'Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…ØªØ¯Ø±Ø¨ÙŠÙ† Ø­Ø§Ø¶Ø±ÙŠÙ† Ù„Ø¥Ø±Ø³Ø§Ù„ Ø¥ÙŠÙ…ÙŠÙ„ Ù„Ù‡Ù…' : 'No active trainees to email.');
      return;
    }

    const toEmails = activeTrainees.map(u => u.email).filter(Boolean).join(';');
    const ccEmails = activeTrainees.flatMap(u => u.managerEmails || []).filter(Boolean).join(';');
    
    const subject = encodeURIComponent(`Training Completed: ${session.courseTitle}`);
    const bodyText = `Dear Team,\n\nWe are pleased to inform you that the following training session has been successfully completed:\n\nCourse: ${session.courseTitle}\nDate: ${session.startDate}\n\nPlease find the attached completion report with attendance and scores.\n\nBest Regards,\nOED Training Dept`;
    const body = encodeURIComponent(bodyText);

    const mailtoUrl = `mailto:${toEmails}?cc=${ccEmails}&subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
  };

  const handleFinalize = () => {
    setIsConfirming(true);
  };

  const handleConfirmSave = () => {
    const newRecords: TrainingRecord[] = activeTrainees.map(u => ({
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      courseId: session.id, // Ensure we map correctly 
      courseName: session.courseTitle,
      userId: u.id,
      hrCode: u.hrCode,
      traineeName: u.name,
      department: u.department,
      attendanceDate: session.startDate,
      totalDays: session.duration || '2',
      score: `${(traineeData[u.id] || { score: 0 }).score}%`,
      status: 'Completed',
      raw: {
        'Course Title': session.courseTitle,
        'Instructor': 'Nader Reda',
        'Attended Days': (traineeData[u.id] || { days: 1 }).days,
        'Score': `${(traineeData[u.id] || { score: 0 }).score}%`
      }
    }));

    onFinalize(newRecords);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-[#002D62]">
            {language === 'ar' ? 'إنهاء الدورة وتسجيل الحضور' : 'Finalize Course & Attendance'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-600 transition-colors">
            <X size={24} />
          </button>
        </div>

                <div className="p-6 overflow-y-auto flex-1">
          {!isConfirming ? (
            <>
              <div className="mb-6 bg-blue-50 p-4 rounded border border-blue-100 flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h3 className="font-bold text-blue-900">{session.courseTitle}</h3>
                  <p className="text-sm text-blue-700">{session.startDate} - {registeredUsers.length} {language === 'ar' ? 'Absent' : 'Registered'}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={exportToWord} className="bg-white border border-blue-300 text-blue-800 px-3 py-1.5 rounded text-sm font-bold hover:bg-blue-100 transition-colors flex items-center gap-2 shadow-sm">
                    <FileText size={16} /> {language === 'ar' ? 'Name ????' : 'Word Report'}
                  </button>
                  <button onClick={draftEmail} className="bg-white border border-blue-300 text-blue-800 px-3 py-1.5 rounded text-sm font-bold hover:bg-blue-100 transition-colors flex items-center gap-2 shadow-sm">
                    <Mail size={16} /> {language === 'ar' ? 'Name Name' : 'Draft Email'}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="p-3 font-semibold text-gray-700">{language === 'ar' ? 'Name' : 'Name'}</th>
                      <th className="p-3 font-semibold text-gray-700">{language === 'ar' ? 'Absent?' : 'Department'}</th>
                      <th className="p-3 font-semibold text-gray-700 w-32">{language === 'ar' ? '???? Absent' : 'Attended Days'}</th>
                      <th className="p-3 font-semibold text-gray-700 w-32">{language === 'ar' ? 'Absent %' : 'Score %'}</th>
                      <th className="p-3 font-semibold text-gray-700 w-24 text-center">{language === 'ar' ? 'Absent' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registeredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-gray-500 italic">
                          {language === 'ar' ? '?? ???? Absent? Absent' : 'No registered trainees.'}
                        </td>
                      </tr>
                    ) : (
                      registeredUsers.map(u => {
                        const userTraineeData = traineeData[u.id] || { days: 1, score: 0 };
                        const days = userTraineeData.days;
                        const isAbsent = days === 0;
                        return (
                          <tr key={u.id} className={"border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors "}>
                            <td className="p-3 font-medium text-gray-800">{u.name} <span className="text-xs text-gray-400 ml-2">({u.hrCode})</span></td>
                            <td className="p-3 text-gray-600">{u.department}</td>
                            <td className="p-3">
                              <input 
                                type="number" 
                                min="0" 
                                className="w-full border border-gray-300 rounded px-2 py-1 text-center"
                                value={days}
                                onChange={(e) => handleDataChange(u.id, 'days', Number(e.target.value))}
                              />
                            </td>
                            <td className="p-3">
                              <input 
                                type="number" 
                                min="0"
                                max="100"
                                className="w-full border border-gray-300 rounded px-2 py-1 text-center"
                                value={userTraineeData.score}
                                disabled={isAbsent}
                                onChange={(e) => handleDataChange(u.id, 'score', Number(e.target.value))}
                              />
                            </td>
                            <td className="p-3 text-center">
                              {isAbsent ? (
                                <span className="inline-flex items-center text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded gap-1"><Ban size={12}/> {language === 'ar' ? 'غائب' : 'Absent'}</span>
                              ) : (
                                <span className="inline-flex items-center text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded gap-1"><CheckCircle size={12}/> {language === 'ar' ? 'حاضر' : 'Attended'}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 text-xs text-gray-500 italic">
                * {language === 'ar' ? 'المتدربون الذين لديهم 0 أيام حضور سيعتبرون غائبين وسيتم استبعادهم من التقارير.' : 'Trainees with 0 attended days will be considered absent and excluded from reports, emails, and database.'}
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <h3 className="font-bold text-blue-900 mb-2">
                  {language === 'ar' ? 'تأكيد البيانات قبل الحفظ النهائي' : 'Confirm Data Before Final Save'}
                </h3>
                <p className="text-sm text-blue-800">
                  {language === 'ar' ? `Ø³ÙŠØªÙ… Ø¥Ø¶Ø§ÙØ© ${activeTrainees.length} Ù…ØªØ¯Ø±Ø¨ÙŠÙ† Ø¥Ù„Ù‰ Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø¨Ù†Ø¬Ø§Ø­ ÙˆØ§Ø³ØªØ¨Ø¹Ø§Ø¯ Ø§Ù„ØºØ§Ø¦Ø¨ÙŠÙ†.` : `${activeTrainees.length} trainees will be successfully added to the database. Absentees are excluded.`}
                </p>
              </div>

              <div className="border border-green-200 rounded">
                <div className="bg-green-50 p-3 border-b border-green-200 font-bold text-green-900">
                  {language === 'ar' ? 'المتدربون الذين سيتم حفظهم (حاضر):' : 'Trainees to be saved (Attended):'}
                </div>
                <div className="max-h-60 overflow-y-auto p-3 bg-white">
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {activeTrainees.length > 0 ? activeTrainees.map(u => (
                      <li key={u.id} className="text-gray-700">
                        <span className="font-bold">{u.name}</span> ({u.hrCode}) - {language === 'ar' ? 'أيام:' : 'Days:'} {(traineeData[u.id] || { days: 1 }).days} - {language === 'ar' ? 'Absent:' : 'Score:'} {(traineeData[u.id] || { score: 0 }).score}%
                      </li>
                    )) : (
                      <li className="text-gray-500 italic">{language === 'ar' ? 'لا يوجد حاضرين.' : 'No attendees.'}</li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="border border-red-200 rounded">
                <div className="bg-red-50 p-3 border-b border-red-200 font-bold text-red-900">
                  {language === 'ar' ? 'المتدربون الذين سيتم استبعادهم (غائب):' : 'Trainees to be excluded (Absent):'}
                </div>
                <div className="max-h-40 overflow-y-auto p-3 bg-white">
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {registeredUsers.filter(u => (traineeData[u.id] || { days: 1 }).days === 0).length > 0 ? (
                      registeredUsers.filter(u => (traineeData[u.id] || { days: 1 }).days === 0).map(u => (
                        <li key={u.id} className="text-gray-500 line-through">{u.name} ({u.hrCode})</li>
                      ))
                    ) : (
                      <li className="text-gray-500 italic">{language === 'ar' ? 'لا يوجد غائبين.' : 'No absentees.'}</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
          {!isConfirming ? (
            <>
              <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded font-bold text-gray-700 hover:bg-gray-100 transition-colors">
                {language === 'ar' ? 'Name' : 'Cancel'}
              </button>
              <button 
                onClick={handleFinalize} 
                disabled={registeredUsers.length === 0}
                className="bg-[#FFC000] text-[#002D62] px-6 py-2 rounded font-bold flex items-center gap-2 hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {language === 'ar' ? 'Absent Absent' : 'Review & Confirm'}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setIsConfirming(false)} className="px-4 py-2 border border-gray-300 rounded font-bold text-gray-700 hover:bg-gray-100 transition-colors">
                {language === 'ar' ? '???? Absent?' : 'Back to Edit'}
              </button>
              <button 
                onClick={handleConfirmSave} 
                className="bg-emerald-600 text-white px-6 py-2 rounded font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-md"
              >
                <Save size={18} />
                {language === 'ar' ? 'Name Name Absent?' : 'Confirm Final Save'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

