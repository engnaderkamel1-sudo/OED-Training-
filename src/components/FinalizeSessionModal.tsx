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
  const { language, records = [], cleanedData = [] } = useAppContext() as any;
  
  // State for each trainee's attendance and score
  const [traineeData, setTraineeData] = useState<Record<string, { days: number, score: number }>>({});
  const [isConfirming, setIsConfirming] = useState(false);

  // Initialize form with defaults or pre-existing saved grades if session was completed
  useEffect(() => {
    const initial: Record<string, { days: number, score: number }> = {};
    registeredUsers.forEach(u => {
      // Find existing record in cleanedData or records
      const existingCleaned = (cleanedData || []).find((c: any) => 
        (c.hrCode === u.hrCode || c.name === u.name) && 
        (c.courseName === session.courseTitle || c.id?.includes(session.id))
      );
      const existingRec = (records || []).find((r: any) => 
        (r.hrCode === u.hrCode || r.userId === u.id) && 
        (r.courseName === session.courseTitle || r.courseId === session.id)
      );

      let savedScore = 0;
      let savedDays = 1;

      if (existingCleaned) {
        const rawScore = String(existingCleaned.score ?? '').replace('%', '').trim();
        savedScore = (!rawScore || isNaN(Number(rawScore))) ? 0 : Number(rawScore);
        savedDays = Number(existingCleaned.attendedDays || 1);
      } else if (existingRec) {
        const rawScore = String(existingRec.score ?? '').replace('%', '').trim();
        savedScore = (!rawScore || isNaN(Number(rawScore))) ? 0 : Number(rawScore);
        savedDays = Number(existingRec.daysAttended || existingRec.days || 1);
      }

      initial[u.id] = { days: savedDays, score: savedScore };
    });
    setTraineeData(initial);
  }, [registeredUsers, session, records, cleanedData]);

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
            <div style="font-size: 20px; font-weight: 900; font-style: italic; color: #002D62; letter-spacing: 1px;">ORASCOM</div>
            <div style="font-size: 9px; font-weight: bold; color: #4c6d99; letter-spacing: 1px;">EQUIPMENT DEPARTMENT</div>
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
      <div className="bg-white dark:bg-[#13223F] w-full max-w-4xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-200 dark:border-white/[0.12]">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-[#002D62] dark:text-[#70B2FF]">
            {session.status === 'Completed'
              ? (language === 'ar' ? 'تعديل درجات وتقييم الدورة المنتهية 📝' : 'Edit Completed Session Grades & Evaluation 📝')
              : (language === 'ar' ? 'إنهاء الدورة وتسجيل الحضور والدرجات' : 'Finalize Course & Attendance')}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {!isConfirming ? (
            <>
              <div className="mb-6 bg-blue-50 dark:bg-blue-950/40 p-4 rounded-xl border border-blue-100 dark:border-blue-800/40 flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h3 className="font-bold text-blue-900 dark:text-blue-200 text-base">{session.courseTitle}</h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-0.5">{session.startDate} - {registeredUsers.length} {language === 'ar' ? 'مسجلين' : 'Registered'}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={exportToWord} className="bg-white dark:bg-[#0D1A33] border border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-2 shadow-sm cursor-pointer">
                    <FileText size={16} /> {language === 'ar' ? 'تقرير Word' : 'Word Report'}
                  </button>
                  <button onClick={draftEmail} className="bg-white dark:bg-[#0D1A33] border border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-2 shadow-sm cursor-pointer">
                    <Mail size={16} /> {language === 'ar' ? 'مسودة إيميل' : 'Draft Email'}
                  </button>
                </div>
              </div>

              {/* Quick 1-Click Automation Actions Bar */}
              <div className="mb-4 p-3.5 bg-slate-50 dark:bg-[#0B172B] border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-[#002D62] dark:text-[#93C5FD] uppercase tracking-wider">
                    ⚡ {language === 'ar' ? 'إجراءات الأتمتة السريعة:' : 'Quick 1-Click Actions:'}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const totalDays = Number(session.duration || 2) || 1;
                      const updated: Record<string, { days: number, score: number }> = {};
                      registeredUsers.forEach(u => {
                        const prevScore = (traineeData[u.id] || { score: 85 }).score || 85;
                        updated[u.id] = { days: totalDays, score: prevScore };
                      });
                      setTraineeData(updated);
                    }}
                    className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 shadow-2xs hover:scale-105 cursor-pointer"
                  >
                    <CheckCircle size={13} />
                    <span>{language === 'ar' ? 'تحضير الكل (كامل الأيام)' : 'Mark All Present (Full Days)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const updated: Record<string, { days: number, score: number }> = {};
                      registeredUsers.forEach(u => {
                        const prevDays = (traineeData[u.id] || { days: 1 }).days;
                        updated[u.id] = { days: prevDays, score: 85 };
                      });
                      setTraineeData(updated);
                    }}
                    className="px-3 py-1.5 bg-blue-100 dark:bg-blue-950/80 hover:bg-blue-200 dark:hover:bg-blue-900 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 shadow-2xs hover:scale-105 cursor-pointer"
                  >
                    <span>🎯 {language === 'ar' ? 'درجة نجاح موحدة (85%)' : 'Auto-Fill 85% Score'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const updated: Record<string, { days: number, score: number }> = {};
                      registeredUsers.forEach(u => {
                        const prevDays = (traineeData[u.id] || { days: 1 }).days;
                        updated[u.id] = { days: prevDays, score: 90 };
                      });
                      setTraineeData(updated);
                    }}
                    className="px-3 py-1.5 bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 shadow-2xs hover:scale-105 cursor-pointer"
                  >
                    <span>⭐ {language === 'ar' ? 'درجة تفوق (90%)' : 'Auto-Fill 90% Score'}</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-xl">
                <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                  <thead className="bg-[#002D62] dark:bg-[#0A1324] text-white border-b border-blue-900 dark:border-gray-700">
                    <tr>
                      <th className="p-3.5 font-bold text-white text-xs sm:text-sm">{language === 'ar' ? 'الاسم' : 'Name'}</th>
                      <th className="p-3.5 font-bold text-white text-xs sm:text-sm">{language === 'ar' ? 'القسم' : 'Department'}</th>
                      <th className="p-3.5 font-bold text-white text-xs sm:text-sm w-32 text-center">{language === 'ar' ? 'أيام الحضور' : 'Attended Days'}</th>
                      <th className="p-3.5 font-bold text-white text-xs sm:text-sm w-32 text-center">{language === 'ar' ? 'النتيجة %' : 'Score %'}</th>
                      <th className="p-3.5 font-bold text-white text-xs sm:text-sm w-36 text-center">{language === 'ar' ? 'تبديل الحالة السريع' : 'Quick Toggle'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registeredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-gray-500 dark:text-gray-400 italic">
                          {language === 'ar' ? 'لا يوجد متدربون مسجلون في هذه الجلسة.' : 'No registered trainees.'}
                        </td>
                      </tr>
                    ) : (
                      registeredUsers.map(u => {
                        const userTraineeData = traineeData[u.id] || { days: 1, score: 0 };
                        const days = userTraineeData.days;
                        const isAbsent = days === 0;
                        return (
                          <tr key={u.id} className={"border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors "}>
                            <td className="p-3 font-medium text-gray-800 dark:text-gray-100">{u.name} <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">({u.hrCode})</span></td>
                            <td className="p-3 text-gray-600 dark:text-gray-300">{u.department}</td>
                            <td className="p-3 text-center">
                              <input 
                                type="number" 
                                min="0" 
                                className="w-20 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-center bg-white dark:bg-[#0D1A33] text-gray-900 dark:text-gray-100"
                                value={days}
                                onChange={(e) => handleDataChange(u.id, 'days', Number(e.target.value))}
                              />
                            </td>
                            <td className="p-3 text-center">
                              <input 
                                type="number" 
                                min="0" 
                                max="100" 
                                className="w-20 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-center bg-white dark:bg-[#0D1A33] text-gray-900 dark:text-gray-100 disabled:opacity-50"
                                value={userTraineeData.score}
                                disabled={isAbsent}
                                onChange={(e) => handleDataChange(u.id, 'score', Number(e.target.value))}
                              />
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  const totalDays = Number(session.duration || 2) || 1;
                                  if (isAbsent) {
                                    handleDataChange(u.id, 'days', totalDays);
                                    if (userTraineeData.score === 0) handleDataChange(u.id, 'score', 85);
                                  } else {
                                    handleDataChange(u.id, 'days', 0);
                                  }
                                }}
                                className="cursor-pointer transition-transform active:scale-95"
                                title={language === 'ar' ? 'اضغط لتبديل الحالة بين حاضر وغائب' : 'Click to toggle Present / Absent'}
                              >
                                {isAbsent ? (
                                  <span className="inline-flex items-center text-xs font-black text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/80 px-3 py-1.5 rounded-xl gap-1.5 border border-red-300 dark:border-red-700 hover:bg-red-200 shadow-2xs">
                                    <Ban size={13}/>
                                    <span>{language === 'ar' ? 'غائب ❌' : 'Absent ❌'}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-xs font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-3 py-1.5 rounded-xl gap-1.5 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-200 shadow-2xs">
                                    <CheckCircle size={13}/>
                                    <span>{language === 'ar' ? 'حاضر ✓' : 'Present ✓'}</span>
                                  </span>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 italic">
                * {language === 'ar' ? 'المتدربون الذين لديهم 0 أيام حضور سيعتبرون غائبين وسيتم استبعادهم من التقارير.' : 'Trainees with 0 attended days will be considered absent and excluded from reports, emails, and database.'}
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 rounded-xl p-4">
                <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-2">
                  {language === 'ar' ? 'تأكيد البيانات قبل الحفظ النهائي' : 'Confirm Data Before Final Save'}
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  {language === 'ar' ? `سيتم إضافة ${activeTrainees.length} متدربين إلى قاعدة البيانات بنجاح واستبعاد الغائبين.` : `${activeTrainees.length} trainees will be successfully added to the database. Absentees are excluded.`}
                </p>
              </div>

              <div className="border border-green-200 dark:border-green-800/40 rounded-xl overflow-hidden">
                <div className="bg-green-50 dark:bg-green-950/40 p-3 border-b border-green-200 dark:border-green-800/40 font-bold text-green-900 dark:text-green-200">
                  {language === 'ar' ? 'المتدربون الذين سيتم حفظهم (حاضر):' : 'Trainees to be saved (Attended):'}
                </div>
                <div className="max-h-60 overflow-y-auto p-3 bg-white dark:bg-[#0D1A33]">
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {activeTrainees.length > 0 ? activeTrainees.map(u => (
                      <li key={u.id} className="text-gray-700 dark:text-gray-200">
                        <span className="font-bold">{u.name}</span> ({u.hrCode}) - {language === 'ar' ? 'أيام:' : 'Days:'} {(traineeData[u.id] || { days: 1 }).days} - {language === 'ar' ? 'الدرجة:' : 'Score:'} {(traineeData[u.id] || { score: 0 }).score}%
                      </li>
                    )) : (
                      <li className="text-gray-500 dark:text-gray-400 italic">{language === 'ar' ? 'لا يوجد حاضرين.' : 'No attendees.'}</li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="border border-red-200 dark:border-red-800/40 rounded-xl overflow-hidden">
                <div className="bg-red-50 dark:bg-red-950/40 p-3 border-b border-red-200 dark:border-red-800/40 font-bold text-red-900 dark:text-red-200">
                  {language === 'ar' ? 'المتدربون الذين سيتم استبعادهم (غائب):' : 'Trainees to be excluded (Absent):'}
                </div>
                <div className="max-h-40 overflow-y-auto p-3 bg-white dark:bg-[#0D1A33]">
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {registeredUsers.filter(u => (traineeData[u.id] || { days: 1 }).days === 0).length > 0 ? (
                      registeredUsers.filter(u => (traineeData[u.id] || { days: 1 }).days === 0).map(u => (
                        <li key={u.id} className="text-gray-500 dark:text-gray-400 line-through">{u.name} ({u.hrCode})</li>
                      ))
                    ) : (
                      <li className="text-gray-500 dark:text-gray-400 italic">{language === 'ar' ? 'لا يوجد غائبين.' : 'No absentees.'}</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0E1A32] flex justify-end gap-3 rounded-b-xl">
          {!isConfirming ? (
            <>
              <button onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-colors">
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button 
                onClick={handleFinalize} 
                disabled={registeredUsers.length === 0}
                className="bg-[#FFC000] text-[#002D62] px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
              >
                {language === 'ar' ? 'مراجعة وتأكيد' : 'Review & Confirm'}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setIsConfirming(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-colors">
                {language === 'ar' ? 'الرجوع للتعديل' : 'Back to Edit'}
              </button>
              <button 
                onClick={handleConfirmSave} 
                className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-md cursor-pointer"
              >
                <Save size={18} />
                {language === 'ar' ? 'تأكيد الحفظ النهائي' : 'Confirm Final Save'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
