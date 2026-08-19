import React, { useState } from 'react';
import { useAppContext } from '../context';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { X, Save, Edit3 } from 'lucide-react';
import { TrainingRecord, CleanedRecord } from '../types';

interface EditRecordModalProps {
  record: TrainingRecord | any;
  onClose: () => void;
}

export const EditRecordModal: React.FC<EditRecordModalProps> = ({ record, onClose }) => {
  const { language, setRecords, records, setCleanedData, cleanedData, users } = useAppContext();

  // Find user data if available
  const user = users.find((u) => u.id === record.userId || u.hrCode === record.userId || u.hrCode === record.hrCode);

  const [hrCode, setHrCode] = useState(record.hrCode || user?.hrCode || '');
  const [name, setName] = useState(record.traineeName || user?.name || record.userId || '');
  const [department, setDepartment] = useState(record.department || user?.department || '');
  const [courseName, setCourseName] = useState(record.courseName || record.raw?.['Course Title'] || '');
  const [duration, setDuration] = useState(record.totalDays || record.raw?.['Course Duration'] || '1');
  const [attendedDays, setAttendedDays] = useState(record.daysAttended || record.raw?.['Attended Days'] || '1');
  
  // Format initial score without percent sign for the number input
  const initialScore = String(record.raw?.['Score'] || record.score || '100').replace('%', '').trim();
  const [score, setScore] = useState(initialScore);
  const [date, setDate] = useState(record.attendanceDate || record.date || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const formattedScore = score.includes('%') ? score : `${score}%`;

      const updatedCleanedRecord: CleanedRecord = {
        id: record.id,
        hrCode: hrCode.trim(),
        name: name.trim(),
        department: department.trim(),
        role: record.raw?.['Role'] || user?.jobRole || user?.role || 'trainee',
        courseName: courseName.trim(),
        duration: String(duration),
        attendedDays: String(attendedDays),
        score: formattedScore,
        date: date,
        raw: {
          ...(record.raw || {}),
          'Course Title': courseName.trim(),
          'Course Duration': duration,
          'Attended Days': attendedDays,
          'Score': formattedScore,
          'Role': record.raw?.['Role'] || user?.jobRole || user?.role || 'trainee',
        }
      };

      // Save to Firebase Firestore
      await setDoc(doc(db, "cleanedData", record.id), updatedCleanedRecord, { merge: true });

      // Update in local records state
      setRecords(records.map(r => r.id === record.id ? {
        ...r,
        hrCode: hrCode.trim(),
        traineeName: name.trim(),
        department: department.trim(),
        courseName: courseName.trim(),
        totalDays: duration,
        daysAttended: attendedDays,
        score: formattedScore,
        attendanceDate: date,
        raw: updatedCleanedRecord.raw
      } as TrainingRecord : r));

      // Update in cleanedData state
      setCleanedData(cleanedData.map(c => c.id === record.id ? updatedCleanedRecord : c));

      alert(language === 'ar' ? 'تم تحديث بيانات السجل بنجاح!' : 'Record updated successfully!');
      onClose();
    } catch (err: any) {
      console.error("Error saving record:", err);
      alert(language === 'ar' ? `حدث خطأ أثناء الحفظ: ${err.message}` : `Error saving record: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-[#002D62] text-white px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Edit3 size={20} className="text-[#FFC000]" />
            <h3 className="font-bold text-lg">
              {language === 'ar' ? 'تعديل بيانات السجل' : 'Edit Training Record'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* HR Code */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                {language === 'ar' ? 'كود الموظف (HR Code)' : 'HR Code'}
              </label>
              <input
                type="text"
                required
                value={hrCode}
                onChange={(e) => setHrCode(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#002D62] outline-none"
              />
            </div>

            {/* Trainee Name */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                {language === 'ar' ? 'اسم المتدرب' : 'Trainee Name'}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#002D62] outline-none"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                {language === 'ar' ? 'القسم / الإدارة' : 'Department'}
              </label>
              <input
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#002D62] outline-none"
              />
            </div>

            {/* Course Title */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                {language === 'ar' ? 'اسم الدورة' : 'Course Title'}
              </label>
              <input
                type="text"
                required
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#002D62] outline-none"
              />
            </div>

            {/* Course Duration */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                {language === 'ar' ? 'مدة الدورة (أيام)' : 'Duration (Days)'}
              </label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#002D62] outline-none"
              />
            </div>

            {/* Attended Days */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                {language === 'ar' ? 'أيام الحضور' : 'Attended Days'}
              </label>
              <input
                type="number"
                min="0"
                value={attendedDays}
                onChange={(e) => setAttendedDays(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#002D62] outline-none"
              />
            </div>

            {/* Score */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                {language === 'ar' ? 'الدرجة (%)' : 'Score (%)'}
              </label>
              <input
                type="text"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="e.g. 100"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#002D62] outline-none"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                {language === 'ar' ? 'تاريخ الحضور' : 'Attendance Date'}
              </label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="YYYY-MM-DD or DD-MMM-YYYY"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#002D62] outline-none"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-[#002D62] hover:bg-blue-900 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
            >
              <Save size={16} />
              <span>{isSaving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ التعديلات' : 'Save Changes')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
