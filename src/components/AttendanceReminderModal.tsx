import React, { useState, useMemo } from 'react';
import { UpcomingSession, User } from '../types';
import { X, Search, CheckSquare, Square, BellRing, Sparkles, Send, Users, UserCheck } from 'lucide-react';

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

  // All company trainees
  const allTrainees = useMemo(() => {
    return allUsers.filter(u => u.role === 'trainee');
  }, [allUsers]);

  // Registered trainees for this course (or nominated)
  const registeredTrainees = useMemo(() => {
    const regCodes = (session.registeredUsers || []).map(c => c.trim().toLowerCase());
    
    const matched = allTrainees.filter(u => 
      regCodes.includes((u.hrCode || '').toLowerCase()) || 
      regCodes.includes((u.id || '').toLowerCase())
    );

    if (matched.length === 0) {
      return allTrainees;
    }
    return matched;
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
      <div className="bg-white dark:bg-[#0E1A32] w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-gray-200 dark:border-slate-700 animate-scale-in">
        
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
            <label className="block text-xs font-black text-gray-800 dark:text-gray-200">
              {language === 'ar' ? 'نص رسالة التنبيه (خلال ساعة):' : 'Reminder Message (Within 1 Hour):'}
            </label>
            <textarea
              rows={3}
              required
              value={reminderMessage}
              onChange={(e) => setReminderMessage(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-[#132543] border border-gray-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-400 font-medium leading-relaxed"
              dir="auto"
            />
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-3 text-gray-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={language === 'ar' ? 'بحث في المتدربين المسجلين...' : 'Search registered trainees...'}
              className="w-full pl-9 pr-4 rtl:pr-9 rtl:pl-4 py-2.5 bg-gray-50 dark:bg-[#132543] border border-gray-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
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

            <span className="text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 px-3 py-1 rounded-full border border-amber-300 dark:border-amber-700">
              {language === 'ar' ? `المستهدفين بالتنبيه: ${selectedHrCodes.length}` : `Targeted: ${selectedHrCodes.length}`}
            </span>
          </div>

          {/* Trainees Checkbox List */}
          <div className="border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-[#11203D]">
            {filteredList.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-xs italic">
                {language === 'ar' ? 'لا توجد أسماء مسجلة مطابقة' : 'No registered trainees found'}
              </div>
            ) : (
              filteredList.map(u => {
                const isSelected = selectedHrCodes.includes(u.hrCode);
                return (
                  <div
                    key={u.id || u.hrCode}
                    onClick={() => toggleUser(u.hrCode)}
                    className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-amber-50/70 dark:bg-amber-950/30 font-bold text-gray-900 dark:text-white' 
                        : 'hover:bg-gray-50 dark:hover:bg-slate-800/60 text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-amber-500 shrink-0">
                        {isSelected ? <CheckSquare size={18} className="text-amber-600 dark:text-amber-400" /> : <Square size={18} className="text-gray-300 dark:text-gray-600" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-black truncate">
                          {u.name}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-0.5">
                          <span>{language === 'ar' ? 'الكود:' : 'HR:'} <strong className="font-mono text-gray-700 dark:text-gray-300">{u.hrCode}</strong></span>
                          <span>•</span>
                          <span className="truncate">{u.department || 'OED'}</span>
                        </div>
                      </div>
                    </div>

                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border shrink-0 ${
                      isSelected 
                        ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700' 
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-500 border-gray-200 dark:border-slate-700'
                    }`}>
                      {isSelected ? (language === 'ar' ? 'سيتم إرسال التنبيه' : 'Selected') : (language === 'ar' ? 'مستثنى' : 'Excluded')}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-xl hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors cursor-pointer"
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
