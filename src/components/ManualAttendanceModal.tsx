import React, { useState, useMemo } from 'react';
import { UpcomingSession, User } from '../types';
import { X, Search, CheckSquare, Square, UserCheck, Check, Sparkles, Users, UserPlus } from 'lucide-react';

interface ManualAttendanceModalProps {
  session: UpcomingSession;
  allUsers: User[];
  onClose: () => void;
  onSaveAttendance: (sessionId: string, selectedUserCodes: string[]) => void;
  language: 'en' | 'ar';
}

export const ManualAttendanceModal: React.FC<ManualAttendanceModalProps> = ({
  session,
  allUsers,
  onClose,
  onSaveAttendance,
  language
}) => {
  const [activeTab, setActiveTab] = useState<'courseOnly' | 'allStaff'>('courseOnly');
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  
  // All company trainees deduplicated
  const allTraineesList = useMemo(() => {
    const map = new Map<string, User>();
    (allUsers || []).filter(u => u.role === 'trainee').forEach(u => {
      const codeKey = (u.hrCode || u.id || '').trim();
      if (codeKey && !map.has(codeKey.toLowerCase())) {
        map.set(codeKey.toLowerCase(), u);
      }
    });
    return Array.from(map.values());
  }, [allUsers]);

  // Trainees who belong to this course specifically (strictly deduplicated)
  const courseTraineesList = useMemo(() => {
    const regCodes = (session.registeredUsers || []).map(c => c.trim().toLowerCase());
    
    // 1. First priority: Users explicitly registered in this session
    const map = new Map<string, User>();
    allTraineesList.forEach(u => {
      const uHr = (u.hrCode || '').toLowerCase();
      const uId = (u.id || '').toLowerCase();
      if (regCodes.includes(uHr) || regCodes.includes(uId)) {
        const uniqueKey = (u.hrCode || u.id || '').trim();
        if (uniqueKey && !map.has(uniqueKey.toLowerCase())) {
          map.set(uniqueKey.toLowerCase(), u);
        }
      }
    });

    const registeredList = Array.from(map.values());

    // 2. If session registered list is empty, fallback to target role match (e.g. Engineers / Technicians)
    if (registeredList.length === 0) {
      const targetStr = (session.targetParticipants || '').toLowerCase();
      if (!targetStr || targetStr.includes('all') || targetStr.includes('الجميع') || targetStr.includes('mixed')) {
        return allTraineesList;
      }
      return allTraineesList.filter(u => {
        const uRole = `${u.jobRole || ''} ${u.department || ''}`.toLowerCase();
        if (targetStr.includes('engineer') || targetStr.includes('مهندس')) {
          return uRole.includes('engineer') || uRole.includes('مهندس') || uRole.includes('eng');
        }
        if (targetStr.includes('technician') || targetStr.includes('فني')) {
          return uRole.includes('technician') || uRole.includes('فني') || uRole.includes('tech');
        }
        if (targetStr.includes('operator') || targetStr.includes('مشغل') || targetStr.includes('سائق')) {
          return uRole.includes('operator') || uRole.includes('مشغل') || uRole.includes('سائق');
        }
        return true;
      });
    }

    return registeredList;
  }, [allTraineesList, session]);

  // Selected trainees for attendance (defaults to all currently registered in this session)
  const [selectedHrCodes, setSelectedHrCodes] = useState<string[]>(() => {
    return Array.from(new Set((session.registeredUsers || []).map(code => code.trim()))).filter(Boolean);
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Active list based on selected tab
  const currentBaseList = activeTab === 'courseOnly' ? courseTraineesList : allTraineesList;

  // Filtered list based on search and department
  const filteredTrainees = useMemo(() => {
    return currentBaseList.filter(u => {
      const q = searchTerm.trim().toLowerCase();
      const matchSearch = !q || 
        (u.name && u.name.toLowerCase().includes(q)) || 
        (u.hrCode && u.hrCode.toLowerCase().includes(q)) || 
        (u.department && u.department.toLowerCase().includes(q));

      const matchDept = !departmentFilter || u.department === departmentFilter;

      return matchSearch && matchDept;
    });
  }, [currentBaseList, searchTerm, departmentFilter]);

  // Departments list for quick filtering
  const departments = useMemo(() => {
    const set = new Set<string>();
    currentBaseList.forEach(u => {
      if (u.department && u.department.trim()) set.add(u.department.trim());
    });
    return Array.from(set).sort();
  }, [currentBaseList]);

  const toggleSelectUser = (hrCode: string) => {
    setSelectedHrCodes(prev => 
      prev.includes(hrCode) ? prev.filter(c => c !== hrCode) : [...prev, hrCode]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredCodes = filteredTrainees.map(u => u.hrCode).filter(Boolean);
    const allSelected = filteredCodes.every(code => selectedHrCodes.includes(code));
    
    if (allSelected) {
      // Unselect filtered
      setSelectedHrCodes(prev => prev.filter(code => !filteredCodes.includes(code)));
    } else {
      // Select all filtered
      setSelectedHrCodes(prev => Array.from(new Set([...prev, ...filteredCodes])));
    }
  };

  const handleConfirmSave = () => {
    onSaveAttendance(session.id, selectedHrCodes);
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[99999] flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-[#0E1A32] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-gray-200 dark:border-slate-700 animate-scale-in">
        
        {/* Header */}
        <div className="bg-[#002D62] text-white p-4 sm:p-5 flex justify-between items-center shrink-0 border-b border-blue-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-400 text-[#002D62] font-bold shadow-sm">
              <UserCheck size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black leading-tight">
                {language === 'ar' ? 'تسجيل حضور متدربي الدورة' : 'Course Trainees Attendance'}
              </h2>
              <p className="text-xs text-blue-200 mt-0.5 font-medium">
                {session.courseTitle} • {session.startDate}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <X size={22} />
          </button>
        </div>

        {/* 2 Tabs: Course Trainees (Default) vs All Staff */}
        <div className="flex border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-[#0B1528] px-4 pt-3 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => { setActiveTab('courseOnly'); setSearchTerm(''); }}
            className={`pb-3 px-4 text-xs sm:text-sm font-black border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'courseOnly'
                ? 'border-[#002D62] dark:border-[#FFC000] text-[#002D62] dark:text-[#FFC000]'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <Users size={16} />
            <span>{language === 'ar' ? 'متدربو هذه الدورة فقط' : 'Course Trainees Only'}</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-black ${
              activeTab === 'courseOnly'
                ? 'bg-[#002D62] text-white dark:bg-yellow-400 dark:text-[#002D62]'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
            }`}>
              {courseTraineesList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('allStaff'); setSearchTerm(''); }}
            className={`pb-3 px-4 text-xs sm:text-sm font-black border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'allStaff'
                ? 'border-[#002D62] dark:border-[#FFC000] text-[#002D62] dark:text-[#FFC000]'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <UserPlus size={16} />
            <span>{language === 'ar' ? 'إضافة من كافة موظفي الشركة' : 'Add from All Staff'}</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
              {allTraineesList.length}
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* Instruction Note */}
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
            <Sparkles size={17} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>
                {activeTab === 'courseOnly' 
                  ? (language === 'ar' ? 'قائمة متدربي الدورة الحالية:' : 'Current Course Trainees:')
                  : (language === 'ar' ? 'إضافة متدربين إضافيين من الشركة:' : 'Add Extra Trainees from Company Staff:')}
              </strong>
              <p className="mt-0.5 leading-relaxed">
                {activeTab === 'courseOnly'
                  ? (language === 'ar' ? 'حدد المتدربين الحاضرين في القاعة (أو اضغط "تحديد الكل" لتحضير جميع متدربي الدورة دفعة واحدة).' : 'Select trainees present in the hall (or click "Select All" to mark all course trainees present).')
                  : (language === 'ar' ? 'ابحث عن أي متدرب إضافي من خارج القائمة الأساسية لإضافته وتسجيل حضوره.' : 'Search for any extra trainee from outside the default roster to add and check in.')}
              </p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-3.5 text-slate-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={language === 'ar' ? 'بحث بالاسم أو الكود الوظيفي...' : 'Search by name or HR code...'}
                className="w-full pl-9 pr-4 rtl:pr-9 rtl:pl-4 py-2.5 bg-slate-50 dark:bg-[#132543] border-2 border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#002D62] font-bold"
              />
            </div>

            <div>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-[#132543] border-2 border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#002D62] font-bold cursor-pointer"
              >
                <option value="">{language === 'ar' ? '🏢 جميع الأقسام والورش' : '🏢 All Departments'}</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Select All & Summary Bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 px-1 pt-1">
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="flex items-center gap-2 text-xs font-black text-[#002D62] dark:text-[#93C5FD] hover:underline cursor-pointer"
            >
              <CheckSquare size={16} />
              <span>
                {filteredTrainees.every(u => selectedHrCodes.includes(u.hrCode))
                  ? (language === 'ar' ? 'إلغاء تحديد المعروضين' : 'Deselect Displayed')
                  : (language === 'ar' ? `تحديد الكل في القائمة (${filteredTrainees.length})` : `Select All Displayed (${filteredTrainees.length})`)}
              </span>
            </button>

            <span className="text-xs font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-950 dark:text-emerald-300 px-3.5 py-1 rounded-full border border-emerald-400 dark:border-emerald-700 shadow-2xs">
              {language === 'ar' ? `تم تحديد: ${selectedHrCodes.length} متدرب للحضور` : `Marked Present: ${selectedHrCodes.length}`}
            </span>
          </div>

          {/* Trainees List */}
          <div className="border-2 border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-[#11203D] shadow-inner">
            {filteredTrainees.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs sm:text-sm italic font-bold">
                {language === 'ar' ? 'لا توجد أسماء مطابقة' : 'No matching names'}
              </div>
            ) : (
              filteredTrainees.map(u => {
                const isSelected = selectedHrCodes.includes(u.hrCode);
                return (
                  <div
                    key={u.id || u.hrCode}
                    onClick={() => toggleSelectUser(u.hrCode)}
                    className={`p-3 sm:p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-slate-900 dark:text-white font-black' 
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-emerald-600 dark:text-emerald-400 shrink-0">
                        {isSelected ? <CheckSquare size={19} className="text-emerald-600 dark:text-emerald-400" /> : <Square size={19} className="text-slate-300 dark:text-gray-600" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-black truncate text-slate-900 dark:text-white">
                          {u.name}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-gray-400 flex items-center gap-2 mt-0.5 font-bold">
                          <span>{language === 'ar' ? 'الكود:' : 'HR:'} <strong className="font-mono text-slate-900 dark:text-gray-200">{u.hrCode}</strong></span>
                          <span>•</span>
                          <span className="truncate">{u.department || 'OED Workshop'}</span>
                        </div>
                      </div>
                    </div>

                    <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg border shrink-0 ${
                      isSelected
                        ? 'bg-emerald-600 text-white dark:bg-emerald-900/80 dark:text-emerald-200 border-emerald-700 dark:border-emerald-700 shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-gray-400 border-slate-300 dark:border-slate-700'
                    }`}>
                      {isSelected ? (language === 'ar' ? 'حاضر ✓' : 'Present ✓') : (language === 'ar' ? 'غير مسجل' : 'Not Recorded')}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B1528] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-gray-200 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-slate-300 dark:border-slate-600"
          >
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>

          <button
            type="button"
            onClick={handleConfirmSave}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
          >
            {savedSuccess ? <Check size={18} /> : <UserCheck size={18} />}
            <span>
              {savedSuccess 
                ? (language === 'ar' ? 'تم حفظ الحضور بنجاح! ✓' : 'Attendance Saved! ✓') 
                : (language === 'ar' ? `حفظ حضور (${selectedHrCodes.length}) متدربين فوراً` : `Save Attendance (${selectedHrCodes.length})`)}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
