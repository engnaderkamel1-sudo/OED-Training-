import React, { useState, useMemo } from 'react';
import { getVacantSessionNumbers, findConflictingSession } from '../utils/sessionSerialUtils';
import { useAppContext } from '../context';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { X, Save, Edit3, Calendar, Clock, MapPin, Users, Mail, Link as LinkIcon, Loader2, Bell, CheckCircle } from 'lucide-react';
import { UpcomingSession } from '../types';

interface EditSessionModalProps {
  session: UpcomingSession;
  onClose: () => void;
  onUpdate?: (updatedSession: UpcomingSession) => void;
}

export const EditSessionModal: React.FC<EditSessionModalProps> = ({ session, onClose, onUpdate }) => {
  const { language, upcomingSessions, updateUpcomingSession, users, setUsers } = useAppContext();

  const [courseTitle, setCourseTitle] = useState(session.courseTitle || '');
  const [startDate, setStartDate] = useState(session.startDate || '');
  const [endDate, setEndDate] = useState(session.endDate || '');
  const [startTime, setStartTime] = useState(session.startTime || '09:00 AM');
  const [location, setLocation] = useState(session.location || 'Training Room');
  const [sessionIteration, setSessionIteration] = useState(session.sessionIteration || '1');
  const [sessionNumber, setSessionNumber] = useState(session.sessionNumber || '');
  const [targetParticipants, setTargetParticipants] = useState(session.targetParticipants || 'engineers');
  const [feedbackLink, setFeedbackLink] = useState(session.feedbackLink || '');
  const [registrationDeadline, setRegistrationDeadline] = useState(session.registrationDeadline || '');
  const [isRegistrationClosed, setIsRegistrationClosed] = useState(!!session.isRegistrationClosed);
  const [ccEmails, setCcEmails] = useState((session.additionalNotificationEmails || []).join('; '));
  const [sendTargetedNotification, setSendTargetedNotification] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const conflictingSession = useMemo(() => {
    if (!sessionNumber) return undefined;
    return findConflictingSession(sessionNumber, session.id, upcomingSessions);
  }, [sessionNumber, session.id, upcomingSessions]);

  // Helper to send push notification via FCM
  const sendPushNotification = async (title: string, body: string, targetTokens: string[]) => {
    if (!targetTokens || targetTokens.length === 0) return;
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, targetTokens })
      });
    } catch (err) {
      console.error('Push notification error:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle.trim() || !startDate) {
      alert(language === 'ar' ? 'يرجى ملء اسم الدورة وتاريخ البدء.' : 'Please enter course title and start date.');
      return;
    }

    setIsSaving(true);
    try {
      const cleanCcList = ccEmails
        .split(/[;,\n]+/)
        .map(e => e.trim())
        .filter(Boolean);

      const updated: UpcomingSession = {
        ...session,
        courseTitle: courseTitle.trim(),
        startDate,
        endDate: endDate || startDate,
        startTime,
        location,
        sessionIteration,
        sessionNumber,
        targetParticipants,
        feedbackLink: feedbackLink.trim(),
        registrationDeadline: registrationDeadline || undefined,
        isRegistrationClosed,
        additionalNotificationEmails: cleanCcList
      };

      // 1. Update session in Firestore
      await setDoc(doc(db, 'upcomingSessions', session.id), updated, { merge: true });
      updateUpcomingSession(updated);
      if (onUpdate) onUpdate(updated);

      // 2. Send targeted notifications if enabled
      if (sendTargetedNotification) {
        // Filter target users based on targetParticipants
        const targetUsers = (users || []).filter(u => {
          if (!u || u.status === 'deleted') return false;
          if (u.role === 'admin') return true; // Notify admins

          const jRole = (u.jobRole || '').toLowerCase();
          const uRole = (u.role || '').toLowerCase();

          if (targetParticipants === 'engineers') {
            return jRole.includes('eng') || jRole.includes('مهندس') || uRole === 'engineer';
          }
          if (targetParticipants === 'technicians') {
            return jRole.includes('tech') || jRole.includes('فني') || jRole.includes('op') || jRole.includes('مشغل');
          }
          return true; // mixed: all trainees
        });

        // A. Add Announcement to Firestore announcements collection
        const targetLabel = targetParticipants === 'engineers' 
          ? (language === 'ar' ? 'المهندسين' : 'Engineers')
          : targetParticipants === 'technicians'
          ? (language === 'ar' ? 'الفنيين' : 'Technicians')
          : (language === 'ar' ? 'الجميع' : 'All');

        const notifTitle = language === 'ar'
          ? `📢 تحديث دورة تدريبية: ${courseTitle.trim()}`
          : `📢 Session Updated: ${courseTitle.trim()}`;

        const notifBody = language === 'ar'
          ? `تم تحديث موعد دورة (${courseTitle.trim()}) للفئة (${targetLabel}) - الموعد: من ${startDate} إلى ${endDate || startDate} - المكان: ${location} - الوقت: ${startTime}`
          : `Session (${courseTitle.trim()}) updated for (${targetLabel}) - Dates: ${startDate} to ${endDate || startDate} - Room: ${location} - Time: ${startTime}`;

        try {
          await addDoc(collection(db, 'announcements'), {
            title: notifTitle,
            content: notifBody,
            type: 'course',
            courseId: session.courseId || session.id,
            targetRole: targetParticipants,
            createdAt: serverTimestamp(),
            author: 'Admin'
          });
        } catch (annErr) {
          console.warn('Announcement write error:', annErr);
        }

        // B. Mark unread notification flag for target users in Firestore
        targetUsers.forEach(async (u) => {
          if (u.id) {
            try {
              await setDoc(doc(db, 'users', u.id), { hasUnreadNotifications: true }, { merge: true });
            } catch (uErr) {
              console.warn('User flag update error:', uErr);
            }
          }
        });

        // C. Send Push Notification to all target tokens
        const validTokens = targetUsers.map(u => u.fcmToken).filter(Boolean) as string[];
        if (validTokens.length > 0) {
          await sendPushNotification(notifTitle, notifBody, validTokens);
        }
      }

      alert(
        language === 'ar' 
          ? `تم تحديث بيانات الدورة بنجاح! ${sendTargetedNotification ? 'وتم إرسال الإشعارات لجميع الفئات المستهدفة.' : ''}`
          : `Session updated successfully! ${sendTargetedNotification ? 'Targeted notifications sent.' : ''}`
      );
      onClose();
    } catch (err: any) {
      console.error('Error updating session:', err);
      alert('Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const getTargetDescription = () => {
    if (targetParticipants === 'engineers') {
      return language === 'ar' ? 'المهندسين فقط' : 'Engineers Only';
    }
    if (targetParticipants === 'technicians') {
      return language === 'ar' ? 'الفنيين والمشغلين فقط' : 'Technicians & Operators Only';
    }
    return language === 'ar' ? 'جميع المتدربين (مختلط)' : 'All Trainees (Mixed)';
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[99999] flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-[#0E1A30] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] border border-gray-300 dark:border-slate-700 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#002D62] text-white flex justify-between items-center shrink-0 border-b border-blue-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFC000] text-[#001D42] flex items-center justify-center font-bold shadow-xs">
              <Edit3 size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black leading-tight">
                {language === 'ar' ? 'تعديل بيانات وتفاصيل الدورة' : 'Edit Session Details'}
              </h2>
              <p className="text-xs text-blue-200">
                {language === 'ar' ? `تعديل الدورة الحالية: ${session.courseTitle}` : `Editing: ${session.courseTitle}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-white p-1.5 rounded-lg transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
              📚 {language === 'ar' ? 'اسم الدورة التدريبية' : 'Course Title'}
            </label>
            <input 
              type="text" 
              required
              value={courseTitle} 
              onChange={(e) => setCourseTitle(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3.5 py-2.5 bg-white dark:bg-[#091426] text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
                📅 {language === 'ar' ? 'تاريخ البدء' : 'Start Date'}
              </label>
              <input 
                type="date" 
                required
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3.5 py-2 bg-white dark:bg-[#091426] text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
                📅 {language === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}
              </label>
              <input 
                type="date" 
                required
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3.5 py-2 bg-white dark:bg-[#091426] text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
                ⏰ {language === 'ar' ? 'التوقيت' : 'Time'}
              </label>
              <input 
                type="text" 
                value={startTime} 
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="09:00 AM"
                className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3.5 py-2 bg-white dark:bg-[#091426] text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
                📍 {language === 'ar' ? 'المكان / القاعة' : 'Location / Room'}
              </label>
              <input 
                type="text" 
                value={location} 
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Training Room"
                className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3.5 py-2 bg-white dark:bg-[#091426] text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
                🔢 {language === 'ar' ? 'رقم التكرار (Iteration)' : 'Iteration'}
              </label>
              <input 
                type="number" 
                min="1"
                value={sessionIteration} 
                onChange={(e) => setSessionIteration(e.target.value)}
                className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3.5 py-2 bg-white dark:bg-[#091426] text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
                🏷️ {language === 'ar' ? 'رقم السيشن العام' : 'Global Session #'}
              </label>
              <input 
                type="number" 
                value={sessionNumber} 
                onChange={(e) => setSessionNumber(e.target.value)}
                className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3.5 py-2 bg-white dark:bg-[#091426] text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
                👥 {language === 'ar' ? 'الفئة المستهدفة' : 'Target'}
              </label>
              <select 
                value={targetParticipants} 
                onChange={(e) => setTargetParticipants(e.target.value)}
                className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-[#091426] text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              >
                <option value="engineers">{language === 'ar' ? 'المهندسين (Engineers)' : 'Engineers'}</option>
                <option value="technicians">{language === 'ar' ? 'الفنيين (Technicians)' : 'Technicians'}</option>
                <option value="mixed">{language === 'ar' ? 'مختلط - الجميع (Mixed)' : 'Mixed'}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
              📧 {language === 'ar' ? 'إيميلات إضافية للإشعار (CC)' : 'Additional CC Notification Emails'}
            </label>
            <textarea 
              rows={2}
              value={ccEmails} 
              onChange={(e) => setCcEmails(e.target.value)}
              placeholder="email1@orascom.com; email2@orascom.com"
              className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3.5 py-2 bg-white dark:bg-[#091426] text-gray-900 dark:text-white font-mono text-xs outline-none focus:ring-2 focus:ring-blue-500"
              dir="ltr"
            />
          </div>

          {/* REGISTRATION DEADLINE & STATUS CONTROLS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20">
            <div>
              <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1.5 flex items-center justify-between">
                <span>⏰ {language === 'ar' ? 'آخر موعد للتسجيل (تاريخ وساعة)' : 'Registration Deadline'}</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                  {language === 'ar' ? '(اختياري)' : '(Optional)'}
                </span>
              </label>
              <input 
                type="datetime-local" 
                value={registrationDeadline} 
                onChange={(e) => setRegistrationDeadline(e.target.value)}
                className="w-full border border-amber-300 dark:border-amber-800 rounded-xl px-3.5 py-2 bg-white dark:bg-[#091426] text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-amber-500 text-xs sm:text-sm"
              />
            </div>

            <div className="flex flex-col justify-center">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
                🔒 {language === 'ar' ? 'حالة استقبال طلبات التسجيل' : 'Registration Status'}
              </label>
              <button
                type="button"
                onClick={() => setIsRegistrationClosed(!isRegistrationClosed)}
                className={`w-full py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                  isRegistrationClosed 
                    ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800 shadow-xs' 
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 shadow-xs'
                }`}
              >
                <span>{isRegistrationClosed ? (language === 'ar' ? '🚫 التسجيل مغلق حالياً' : '🚫 Registration Closed') : (language === 'ar' ? '✅ التسجيل مفتوح ومتاح' : '✅ Registration Open')}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
              🔗 {language === 'ar' ? 'رابط استبيان التقييم (Feedback Link)' : 'Feedback Survey Link'}
            </label>
            <input 
              type="url" 
              value={feedbackLink} 
              onChange={(e) => setFeedbackLink(e.target.value)}
              placeholder="https://forms.office.com/..."
              className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3.5 py-2 bg-white dark:bg-[#091426] text-gray-900 dark:text-white font-mono text-xs outline-none focus:ring-2 focus:ring-blue-500"
              dir="ltr"
            />
          </div>

          {/* TARGETED NOTIFICATION CHECKBOX */}
          <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/70 dark:bg-blue-950/40 flex items-start gap-3">
            <input 
              type="checkbox"
              id="sendTargetedNotif"
              checked={sendTargetedNotification}
              onChange={(e) => setSendTargetedNotification(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-[#002D62] focus:ring-[#002D62] cursor-pointer"
            />
            <label htmlFor="sendTargetedNotif" className="text-xs text-gray-800 dark:text-gray-200 cursor-pointer select-none">
              <span className="font-bold flex items-center gap-1.5 text-[#002D62] dark:text-[#93C5FD]">
                <Bell size={13} className="text-[#FFC000]" />
                {language === 'ar' ? 'إرسال إشعار فوري للفئة المستهدفة فقط' : 'Send instant notification to target group only'}
              </span>
              <span className="block text-[11px] text-gray-600 dark:text-gray-400 mt-0.5">
                {language === 'ar' 
                  ? `سيتم إرسال إشعار فوري فقط إلى: (${getTargetDescription()}) لإبلاغهم بالتحديث وموعد الدورة.`
                  : `Instant alert will be sent exclusively to: (${getTargetDescription()}).`}
              </span>
            </label>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl text-gray-700 dark:text-gray-300 font-bold text-xs hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>

            <button 
              type="submit" 
              disabled={isSaving}
              className="px-6 py-2.5 bg-[#002D62] hover:bg-blue-900 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer hover:scale-105 disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              <span>{language === 'ar' ? 'حفظ وتحديث بيانات الدورة' : 'Save Session Changes'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
