import React, { useState, useEffect, useMemo } from 'react';
import { X, Printer, Save, FileText, Plus, Trash2, Check, Download, AlertCircle } from 'lucide-react';
import { UpcomingSession, User, TrainingRecord, CleanedRecord } from '../types';
import { useAppContext } from '../context';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import html2pdf from 'html2pdf.js';

interface TrainingRegisterPreviewModalProps {
  session: UpcomingSession;
  onClose: () => void;
  users: User[];
  records: TrainingRecord[];
  cleanedData?: CleanedRecord[];
  onSaveSuccess?: () => void;
}

interface AttendeeRow {
  id: string; // unique row id
  userId?: string;
  name: string;
  department: string;
  hrCode: string;
  score: string | number;
  days: string | number;
}

export const TrainingRegisterPreviewModal: React.FC<TrainingRegisterPreviewModalProps> = ({
  session,
  onClose,
  users = [],
  records = [],
  cleanedData = [],
  onSaveSuccess
}) => {
  const { language } = useAppContext();

  // Header Details (Editable)
  const [courseTitle, setCourseTitle] = useState(session.courseTitle || '');
  const [instructor, setInstructor] = useState('Nader Reda');
  const [startDate, setStartDate] = useState(session.startDate || '');
  const [endDate, setEndDate] = useState(session.endDate || session.startDate || '');
  
  // Compute initial duration in days
  const initialDuration = useMemo(() => {
    if (!session.startDate) return 1;
    const start = new Date(session.startDate);
    const end = new Date(session.endDate || session.startDate);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
    }
    return 1;
  }, [session.startDate, session.endDate]);

  const [durationDays, setDurationDays] = useState<number | string>(initialDuration);

  // Trainee Rows (Editable)
  const [rows, setRows] = useState<AttendeeRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize Rows from Registered Users + Existing Records
  useEffect(() => {
    const regList = session.registeredUsers || [];
    const matchedUsers = users.filter(u => 
      regList.includes(u.hrCode) || 
      regList.includes(u.id) || 
      regList.includes(`HR${u.id}`)
    );

    const initialRows: AttendeeRow[] = [];

    matchedUsers.forEach((u, index) => {
      // Find existing saved score
      const existingCleaned = cleanedData.find(c => 
        (c.hrCode === u.hrCode || c.name === u.name) && 
        (c.courseName === session.courseTitle || c.id?.includes(session.id))
      );
      const existingRec = records.find(r => 
        (r.hrCode === u.hrCode || r.userId === u.id) && 
        (r.courseName === session.courseTitle || r.courseId === session.id)
      );

      let savedScore: string | number = '';
      let savedDays: string | number = durationDays;

      if (existingCleaned) {
        savedScore = existingCleaned.score !== undefined ? String(existingCleaned.score).replace('%', '') : '';
        savedDays = existingCleaned.attendedDays !== undefined ? existingCleaned.attendedDays : durationDays;
      } else if (existingRec) {
        savedScore = existingRec.score !== undefined ? String(existingRec.score).replace('%', '') : '';
        savedDays = existingRec.daysAttended !== undefined ? existingRec.daysAttended : durationDays;
      }

      initialRows.push({
        id: `row_${u.id}_${index}`,
        userId: u.id,
        name: u.name,
        department: u.department || 'Workshop',
        hrCode: u.hrCode,
        score: savedScore,
        days: savedDays
      });
    });

    // If no registered users found, check cleanedData directly
    if (initialRows.length === 0) {
      const directRecords = cleanedData.filter(c => 
        c.courseName === session.courseTitle || c.id?.includes(session.id)
      );
      directRecords.forEach((c, idx) => {
        initialRows.push({
          id: `row_direct_${c.id || idx}`,
          name: c.name,
          department: c.department || '',
          hrCode: c.hrCode || '',
          score: c.score !== undefined ? String(c.score).replace('%', '') : '',
          days: c.attendedDays || 1
        });
      });
    }

    // Default minimum 5 rows for appearance if empty
    if (initialRows.length === 0) {
      initialRows.push({
        id: `row_new_1`,
        name: '',
        department: '',
        hrCode: '',
        score: '',
        days: 1
      });
    }

    setRows(initialRows);
  }, [session, users, records, cleanedData, durationDays]);

  const handleRowChange = (id: string, field: keyof AttendeeRow, value: any) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleAddRow = () => {
    setRows(prev => [
      ...prev,
      {
        id: `row_manual_${Date.now()}_${Math.random()}`,
        name: '',
        department: '',
        hrCode: '',
        score: '',
        days: durationDays || 1
      }
    ]);
  };

  const handleRemoveRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
  };

  // Save changes to Firestore
  const handleSaveToDatabase = async () => {
    setIsSaving(true);
    try {
      // 1. Update each valid trainee in cleanedData
      for (const row of rows) {
        if (!row.name.trim() && !row.hrCode.trim()) continue;

        const recordId = `rec_${session.id}_${row.hrCode || row.id}`;
        const cleanedRecord: CleanedRecord = {
          id: recordId,
          courseName: courseTitle || session.courseTitle,
          department: row.department || '',
          role: 'trainee',
          date: startDate || session.startDate,
          hrCode: row.hrCode || '',
          name: row.name || '',
          score: row.score !== '' ? `${row.score}%` : 'N/A',
          attendedDays: row.days || 1,
          duration: String(durationDays || '1'),
          raw: {
            'Course Title': courseTitle || session.courseTitle,
            'Instructor': instructor,
            'Attended Days': row.days || 1,
            'Score': row.score !== '' ? `${row.score}%` : 'N/A'
          }
        };

        await setDoc(doc(db, 'cleanedData', recordId), cleanedRecord, { merge: true });
      }

      // 2. Update session details in upcomingSessions
      const updatedSession: UpcomingSession = {
        ...session,
        courseTitle: courseTitle || session.courseTitle,
        startDate: startDate || session.startDate,
        endDate: endDate || session.endDate,
        registeredUsers: rows.filter(r => r.hrCode).map(r => r.hrCode)
      };
      await setDoc(doc(db, 'upcomingSessions', session.id), updatedSession, { merge: true });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
      if (onSaveSuccess) onSaveSuccess();
      alert(language === 'ar' ? 'تم حفظ التعديلات بنجاح في قاعدة البيانات! ✓' : 'Changes saved successfully to database! ✓');
    } catch (err: any) {
      console.error('Error saving records:', err);
      alert('Error saving: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Generate HTML for PDF / Print / Word
  const generatePrintableHTML = () => {
    const validRows = rows.filter(r => r.name.trim() || r.hrCode.trim());
    const totalRowsCount = Math.max(20, validRows.length);

    let tableRowsHTML = '';
    for (let i = 0; i < totalRowsCount; i++) {
      const t = validRows[i];
      if (t) {
        tableRowsHTML += `
          <tr style="background-color: ${i % 2 === 0 ? '#d9e8f5' : '#ffffff'};">
            <td style="border: 1px solid black; padding: 6px; text-align: center; font-weight: bold; font-size: 11px;">${i + 1}</td>
            <td style="border: 1px solid black; padding: 6px; font-weight: bold; font-size: 11px; text-transform: uppercase;">${t.name}</td>
            <td style="border: 1px solid black; padding: 6px; font-size: 11px;">${t.department}</td>
            <td style="border: 1px solid black; padding: 6px; text-align: center; font-size: 11px; font-weight: bold;">${t.hrCode}</td>
            <td style="border: 1px solid black; padding: 6px; text-align: center; font-weight: bold; font-size: 11px;">${t.score !== '' ? `${t.score}%` : ''}</td>
            <td style="border: 1px solid black; padding: 6px; text-align: center; font-weight: bold; font-size: 11px;">${t.days}</td>
          </tr>
        `;
      } else {
        tableRowsHTML += `
          <tr style="background-color: ${i % 2 === 0 ? '#d9e8f5' : '#ffffff'}; height: 26px;">
            <td style="border: 1px solid black; padding: 6px; text-align: center; font-size: 11px;">${i + 1}</td>
            <td style="border: 1px solid black; padding: 6px;"></td>
            <td style="border: 1px solid black; padding: 6px;"></td>
            <td style="border: 1px solid black; padding: 6px;"></td>
            <td style="border: 1px solid black; padding: 6px;"></td>
            <td style="border: 1px solid black; padding: 6px;"></td>
          </tr>
        `;
      }
    }

    return `
      <!DOCTYPE html>
      <html lang="en" dir="ltr">
      <head>
        <meta charset="UTF-8">
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            color: #000;
            margin: 0;
            padding: 15px 25px;
            background: #fff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
          }
          .header h1 {
            color: #7f7f7f;
            font-size: 26px;
            margin: 0;
            font-weight: bold;
            letter-spacing: 0.5px;
          }
          .header .logo-area {
            text-align: right;
          }
          .header .logo-area .orascom {
            font-size: 20px;
            font-weight: 900;
            font-style: italic;
            color: #002D62;
            letter-spacing: 1px;
          }
          .header .logo-area .oed {
            font-size: 8.5px;
            font-weight: bold;
            color: #4c6d99;
            letter-spacing: 1.5px;
          }
          .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            border: 2px solid #000;
          }
          .info-table td {
            border: 1px solid #000;
            padding: 6px 8px;
            font-size: 11px;
            text-align: center;
          }
          .info-table .label {
            font-weight: bold;
            background-color: #f5f5f5;
            width: 18%;
          }
          .info-table .val {
            font-weight: bold;
            color: #000;
            width: 15%;
          }
          .main-table {
            width: 100%;
            border-collapse: collapse;
            border: 2px solid #000;
          }
          .main-table th {
            border: 1px solid #000;
            padding: 7px;
            font-size: 11px;
            font-weight: bold;
            text-align: center;
            background-color: #d9d9d9;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Training Register</h1>
          <div class="logo-area">
            <div class="orascom">ORASCOM</div>
            <div class="oed">EQUIPMENT DEPARTMENT</div>
          </div>
        </div>

        <table class="info-table">
          <tr>
            <td class="label">Course Title</td>
            <td class="val" style="width: 25%;">${courseTitle}</td>
            <td class="label">Instructor</td>
            <td class="val">${instructor}</td>
            <td class="label">Number Of<br/>Participants</td>
            <td class="val">${validRows.length}</td>
          </tr>
          <tr>
            <td class="label">Start Date</td>
            <td class="val">${startDate}</td>
            <td class="label">End Date</td>
            <td class="val">${endDate}</td>
            <td class="label">Duration<br/>(Days)</td>
            <td class="val">${durationDays}</td>
          </tr>
        </table>

        <table class="main-table">
          <thead>
            <tr>
              <th style="width: 32px;">#</th>
              <th>Participant Name</th>
              <th style="width: 140px;">Department</th>
              <th style="width: 80px;">ID</th>
              <th style="width: 90px;">Post Test %</th>
              <th style="width: 110px;">Attendance Days</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHTML}
          </tbody>
        </table>
      </body>
      </html>
    `;
  };

  // Print PDF using native vector engine and fallback
  const handlePrintPDF = async () => {
    setIsPrinting(true);
    const html = generatePrintableHTML();

    try {
      // 1. Create a hidden iframe for 100% reliable, zero-blank native PDF print
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.error(e);
          } finally {
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
            }, 1000);
          }
        }, 250);
      }
    } catch (err) {
      console.error('Print error:', err);
      // Fallback: Open print window
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
    } finally {
      setIsPrinting(false);
    }
  };

  // Export to Word (.doc)
  const handleExportWord = () => {
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Training Register</title></head><body>`;
    const footer = "</body></html>";
    const bodyContent = generatePrintableHTML();

    const blob = new Blob(['\ufeff', header + bodyContent + footer], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Training_Register_${courseTitle.replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const validAttendeesCount = rows.filter(r => r.name.trim() || r.hrCode.trim()).length;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-[99999] flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-[#0E1A30] w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[95vh] border border-gray-300 dark:border-slate-700 overflow-hidden">
        
        {/* Modal Top Bar */}
        <div className="px-6 py-4 bg-[#002D62] text-white flex justify-between items-center shrink-0 border-b border-blue-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFC000] text-[#001D42] flex items-center justify-center font-bold shadow-xs">
              <Printer size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black leading-tight">
                {language === 'ar' ? 'معاينة وتعديل كشف التدريب الرسمي (Training Register)' : 'Official Training Register Preview & Edit'}
              </h2>
              <p className="text-xs text-blue-200">
                {language === 'ar' ? 'قم بتعديل البيانات أو إضافة وحذف المتدربين ثم احفظ واطبع الكشف' : 'Edit details or trainees, save changes, and print the official register'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-300 hover:text-white p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X size={22} />
          </button>
        </div>

        {/* Modal Scrollable Workspace */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Top Sheet Header Editor (Orascom Style) */}
          <div className="bg-gray-50 dark:bg-[#152744] p-4 sm:p-5 rounded-2xl border border-gray-300 dark:border-slate-700 shadow-2xs space-y-4">
            <div className="flex justify-between items-center border-b pb-3 border-gray-200 dark:border-slate-700">
              <span className="font-black text-gray-800 dark:text-gray-100 text-sm flex items-center gap-2">
                🏛️ {language === 'ar' ? 'بيانات ترويسة الكشف الرسمي' : 'Official Register Header Info'}
              </span>
              <span className="text-xs font-mono font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-900 dark:text-blue-200 px-3 py-1 rounded-full border border-blue-300 dark:border-blue-700">
                👥 {validAttendeesCount} {language === 'ar' ? 'متدرب بالكشف' : 'Participants'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-200 mb-1">
                  📚 {language === 'ar' ? 'اسم الدورة (Course Title):' : 'Course Title:'}
                </label>
                <input 
                  type="text" 
                  value={courseTitle} 
                  onChange={(e) => setCourseTitle(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-[#0D1A33] text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-200 mb-1">
                  👨‍🏫 {language === 'ar' ? 'المحاضر (Instructor):' : 'Instructor:'}
                </label>
                <input 
                  type="text" 
                  value={instructor} 
                  onChange={(e) => setInstructor(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-[#0D1A33] text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-200 mb-1">
                  ⏱️ {language === 'ar' ? 'المدة بالأيام (Duration Days):' : 'Duration (Days):'}
                </label>
                <input 
                  type="number" 
                  min="1"
                  value={durationDays} 
                  onChange={(e) => setDurationDays(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-[#0D1A33] text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-200 mb-1">
                  📅 {language === 'ar' ? 'تاريخ البدء (Start Date):' : 'Start Date:'}
                </label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-[#0D1A33] text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-200 mb-1">
                  📅 {language === 'ar' ? 'تاريخ الانتهاء (End Date):' : 'End Date:'}
                </label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-[#0D1A33] text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-end pb-0.5">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <Plus size={15} />
                  <span>{language === 'ar' ? 'إضافة متدرب للكشف (+)' : 'Add Trainee (+)'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Trainee Rows Table */}
          <div className="space-y-2">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h3 className="font-black text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                <span>📝 {language === 'ar' ? 'جدول درجات وحضور المتدربين' : 'Trainees Register & Scores'}</span>
                <span className="text-xs text-gray-500 font-normal">
                  ({language === 'ar' ? 'يمكنك تعديل أي خانة مباشرة' : 'You can edit any cell directly'})
                </span>
              </h3>

              <button
                type="button"
                onClick={handleAddRow}
                className="text-xs font-bold text-blue-600 dark:text-blue-300 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus size={13} /> {language === 'ar' ? 'إضافة سطر جديد' : 'Add New Row'}
              </button>
            </div>

            <div className="border border-gray-300 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto max-h-[360px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-100 dark:bg-[#091426] text-gray-800 dark:text-gray-100 font-bold border-b border-gray-300 dark:border-slate-700 sticky top-0 z-10">
                    <tr>
                      <th className="p-3 w-10 text-center">#</th>
                      <th className="p-3 font-bold min-w-[180px]">{language === 'ar' ? 'اسم المتدرب (Participant Name)' : 'Participant Name'}</th>
                      <th className="p-3 font-bold min-w-[130px]">{language === 'ar' ? 'القسم (Department)' : 'Department'}</th>
                      <th className="p-3 font-bold w-28 text-center">{language === 'ar' ? 'الرقم الوظيفي (ID)' : 'ID'}</th>
                      <th className="p-3 font-bold w-24 text-center">{language === 'ar' ? 'الدرجة %' : 'Post Test %'}</th>
                      <th className="p-3 font-bold w-24 text-center">{language === 'ar' ? 'أيام الحضور' : 'Days'}</th>
                      <th className="p-3 w-12 text-center">{language === 'ar' ? 'حذف' : 'Del'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                    {rows.map((row, idx) => (
                      <tr 
                        key={row.id} 
                        className={idx % 2 === 0 ? 'bg-blue-50/40 dark:bg-slate-900/40' : 'bg-white dark:bg-[#0D1A33]'}
                      >
                        <td className="p-2.5 text-center font-bold text-gray-500 dark:text-gray-400">
                          {idx + 1}
                        </td>
                        <td className="p-2">
                          <input 
                            type="text" 
                            value={row.name} 
                            placeholder={language === 'ar' ? 'اسم المتدرب...' : 'Trainee name...'}
                            onChange={(e) => handleRowChange(row.id, 'name', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-[#091426] text-gray-900 dark:text-white font-bold outline-none focus:ring-1 focus:ring-blue-500 uppercase text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            type="text" 
                            value={row.department} 
                            placeholder="Department..."
                            onChange={(e) => handleRowChange(row.id, 'department', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-[#091426] text-gray-900 dark:text-white font-medium outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            type="text" 
                            value={row.hrCode} 
                            placeholder="HR Code"
                            onChange={(e) => handleRowChange(row.id, 'hrCode', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-[#091426] text-gray-900 dark:text-white font-mono font-bold text-center outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            type="number" 
                            min="0"
                            max="100"
                            value={row.score} 
                            placeholder="%"
                            onChange={(e) => handleRowChange(row.id, 'score', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-[#091426] text-blue-600 dark:text-blue-400 font-bold text-center outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            type="number" 
                            min="0"
                            value={row.days} 
                            placeholder="Days"
                            onChange={(e) => handleRowChange(row.id, 'days', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-[#091426] text-gray-900 dark:text-white font-bold text-center outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            className="text-red-500 hover:text-red-700 dark:hover:text-red-300 p-1 rounded transition-colors cursor-pointer"
                            title={language === 'ar' ? 'حذف هذا السطر' : 'Delete row'}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 px-6 border-t border-gray-300 dark:border-slate-800 bg-gray-50 dark:bg-[#091426] flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={handleExportWord}
              className="px-3.5 py-2.5 border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 text-blue-900 dark:text-blue-200 hover:bg-blue-50 dark:hover:bg-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <FileText size={15} className="text-blue-600" />
              <span>{language === 'ar' ? 'تصدير Word (.doc)' : 'Export Word (.doc)'}</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={onClose} 
              className="px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-xs cursor-pointer"
            >
              {language === 'ar' ? 'إغلاق' : 'Close'}
            </button>

            {/* Save Button */}
            <button 
              type="button"
              disabled={isSaving}
              onClick={handleSaveToDatabase}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50 hover:scale-105"
            >
              {isSaving ? <span className="animate-spin">⏳</span> : (saveSuccess ? <Check size={16} /> : <Save size={16} />)}
              <span>{saveSuccess ? (language === 'ar' ? 'تم الحفظ بنجاح! ✓' : 'Saved! ✓') : (language === 'ar' ? '💾 حفظ التعديلات في المنظومة' : '💾 Save Changes')}</span>
            </button>

            {/* Print Button */}
            <button 
              type="button"
              disabled={isPrinting}
              onClick={handlePrintPDF}
              className="bg-[#FFC000] hover:bg-yellow-400 text-[#001D42] px-6 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer hover:scale-105 disabled:opacity-50"
            >
              {isPrinting ? <span className="animate-spin">⏳</span> : <Printer size={16} />}
              <span>{isPrinting ? (language === 'ar' ? 'جارٍ الطباعة...' : 'Printing...') : (language === 'ar' ? '🖨️ طباعة الكشف الرسمي (PDF)' : '🖨️ Print Official Register (PDF)')}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
