import React, { useState, useMemo } from 'react';
import { UpcomingSession, User } from '../types';
import { X, Search, CheckSquare, Square, BellRing, Sparkles, Send } from 'lucide-react';

interface AttendanceReminderModalProps {
  session: UpcomingSession;
  allUsers: User[];
  onClose: () => void;
  onSendCustomReminder: (sessionId: string, targetHrCodes: string[], customMessage: string) => void;
  language: 'en' | 'ar';
}

export const AttendanceReminderModal: React.FC<AttendanceReminderModalProps> = ({
  session,
  allUsers,
  onClose,
  onSendCustomReminder,
  language
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Default Attendance Reminder Message (within 1 hour)
  const defaultMessage = language === 'ar'
    ? `🟢 تذكير فوري: يرجى مسح رمز الـ QR لتسجيل حضورك في دورة [${session.courseTitle}] خلال ساعة من الآن.`
    : `🟢 Urgent Reminder: Please scan the QR code to record your attendance in [${session.courseTitle}] within 1 hour.`;

  const [reminderMessage, setReminderMessage] = useState(defaultMessage);

  // All company trainees deduplicated by HR Code
  const allTrainees = useMemo(() => {
    const map = new Map<string, User>();
    (allUsers || []).filter(u => u.role === 'trainee').forEach(u => {
      const codeKey = (u.hrCode || u.id || '').trim();
      if (codeKey && !map.has(codeKey.toLowerCase())) {
        map.set(codeKey.toLowerCase(), u);
      }
    });
    return Array.from(map.values());
  }, [allUsers]);

  // Registered trainees for this course (strictly deduplicated)
  const registeredTrainees = useMemo(() => {
    const regCodes = (session.registeredUsers || []).map(c => c.trim().toLowerCase());
    
    if (regCodes.length === 0) {
      return allTrainees;
    }

    const map = new Map<string, User>();
    allTrainees.forEach(u => {
      const uHr = (u.hrCode || '').toLowerCase();
      const uId = (u.id || '').toLowerCase();

      if (regCodes.includes(uHr) || regCodes.includes(uId)) {
        const uniqueKey = (u.hrCode || u.id || '').trim();
        if (uniqueKey && !map.has(uniqueKey.toLowerCase())) {
          map.set(uniqueKey.toLowerCase(), u);
        }
      }
    });

    return Array.from(map.values());
  }, [allTrainees, session]);

  // By default, select all registered trainees
  const [selectedHrCodes, setSelectedHrCodes] = useState<string[]>(() => {
    return registeredTrainees.map(u => u.hrCode).filter(Boolean);
  });

  const [isSent, setIsSent] = useState(false);

  // Filtered list by search
  const filteredList = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return registeredTrainees;
    return registeredTrainees.filter(u => 
      (u.name && u.name.toLowerCase().includes(q)) || 
      (u.hrCode && u.hrCode.toLowerCase().includes(q)) || 
      (u.department && u.department.toLowerCase().includes(q))
    );
  }, [registeredTrainees, searchTerm]);

  const toggleUser = (hrCode: string) => {
    setSelectedHrCodes(prev => 
      prev.includes(hrCode) ? prev.filter(c => c !== hrCode) : [...prev, hrCode]
    );
  };

  const handleSelectAll = () => {
    const visibleCodes = filteredList.map(u => u.hrCode).filter(Boolean);
    const allSelected = visibleCodes.every(code => selectedHrCodes.includes(code));
    
    if (allSelected) {
      setSelectedHrCodes(prev => prev.filter(code => !visibleCodes.includes(code)));
    } else {
      setSelectedHrCodes(prev => Array.from(new Set([...prev, ...visibleCodes])));
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedHrCodes.length === 0) return;
    
    onSendCustomReminder(session.id, selectedHrCodes, reminderMessage);
    setIsSent(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[99999] flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-[#0E1A32] w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-300 dark:border-slate-700 animate-scale-in">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#002D62] via-blue-900 to-[#104080] text-white p-4 sm:p-5 flex justify-between items-center shrink-0 border-b border-blue-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#FFC000] text-[#002D62] font-black shadow-sm animate-bounce">
              <BellRing size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black leading-tight">
                {language === 'ar' ? 'إرسال تنبيه تسجيل الحضور' : 'Send Attendance Reminder'}
              </h2>
              <p className="text-xs text-blue-200 mt-0.5 font-medium">
                {session.courseTitle}
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

        {/* Modal Body Form */}
        <form onSubmit={handleSend} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* Message Text Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-slate-900 dark:text-gray-200">
              {language === 'ar' ? 'نص رسالة التنبيه (خلال ساعة):' : 'Reminder Message (Within 1 Hour):'}
            </label>
            <textarea
              rows={3}
              required
              value={reminderMessage}
              onChange={(e) => setReminderMessage(e.target.value)}
              className="w-full p-3.5 bg-slate-50 dark:bg-[#132543] border-2 border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#002D62] dark:focus:ring-amber-400 font-bold leading-relaxed"
              dir="auto"
            />
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-3.5 text-slate-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={language === 'ar' ? 'بحث في المتدربين المسجلين...' : 'Search registered trainees...'}
              className="w-full pl-9 pr-4 rtl:pr-9 rtl:pl-4 py-2.5 bg-slate-50 dark:bg-[#132543] border-2 border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#002D62] font-bold"
            />
          </div>

          {/* Quick Selection Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-2 px-1">
            <button
              type="button"
              onClick={handleSelectAll}
              className="flex items-center gap-2 text-xs font-black text-[#002D62] dark:text-[#93C5FD] hover:underline cursor-pointer"
            >
              <CheckSquare size={16} />
              <span>
                {filteredList.every(u => selectedHrCodes.includes(u.hrCode))
                  ? (language === 'ar' ? 'إلغاء تحديد الكل' : 'Deselect All')
                  : (language === 'ar' ? `تحديد الكل (${filteredList.length})` : `Select All (${filteredList.length})`)}
              </span>
            </button>

            <span className="text-xs font-black bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-300 px-3.5 py-1 rounded-full border border-amber-400 dark:border-amber-700 shadow-2xs">
              {language === 'ar' ? `المستهدفين بالتنبيه: ${selectedHrCodes.length}` : `Targeted: ${selectedHrCodes.length}`}
            </span>
          </div>

          {/* Trainees Checkbox List */}
          <div className="border-2 border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-[#11203D] shadow-inner">
            {filteredList.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs italic font-bold">
                {language === 'ar' ? 'لا توجد أسماء مسجلة مطابقة' : 'No registered trainees found'}
              </div>
            ) : (
              filteredList.map(u => {
                const isSelected = selectedHrCodes.includes(u.hrCode);
                return (
                  <div
                    key={u.id || u.hrCode}
                    onClick={() => toggleUser(u.hrCode)}
                    className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-slate-900 dark:text-white font-black' 
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-amber-600 dark:text-amber-400 shrink-0">
                        {isSelected ? <CheckSquare size={19} className="text-amber-600 dark:text-amber-400" /> : <Square size={19} className="text-slate-300 dark:text-gray-600" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-black truncate text-slate-900 dark:text-white">
                          {u.name}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-gray-400 flex items-center gap-2 mt-0.5 font-bold">
                          <span>{language === 'ar' ? 'الكود:' : 'HR:'} <strong className="font-mono text-slate-900 dark:text-gray-200">{u.hrCode}</strong></span>
                          <span>•</span>
                          <span className="truncate">{u.department || 'OED'}</span>
                        </div>
                      </div>
                    </div>

                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-md border shrink-0 ${
                      isSelected 
                        ? 'bg-amber-500 text-white dark:bg-amber-900/80 dark:text-amber-200 border-amber-600 dark:border-amber-700 shadow-2xs' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-gray-400 border-slate-300 dark:border-slate-700'
                    }`}>
                      {isSelected ? (language === 'ar' ? 'محدد للتنبيه ✓' : 'Selected ✓') : (language === 'ar' ? 'مستثنى' : 'Excluded')}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-gray-200 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-slate-300 dark:border-slate-600"
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={selectedHrCodes.length === 0}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:opacity-50 text-[#001D42] text-xs sm:text-sm font-black rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
            >
              {isSent ? <Sparkles size={16} /> : <Send size={16} />}
              <span>
                {isSent 
                  ? (language === 'ar' ? 'تم إرسال التنبيه بنجاح! 🔔' : 'Alert Broadcasted! 🔔') 
                  : (language === 'ar' ? `إرسال التنبيه (${selectedHrCodes.length}) الآن 🚀` : `Send Alert (${selectedHrCodes.length}) 🚀`)}
              </span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
