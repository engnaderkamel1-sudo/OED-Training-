import React, { useState } from 'react';
import { X, Trash2, Globe, Megaphone, Loader2 } from 'lucide-react';
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppContext } from '../context';
import { formatDateToStandard } from '../utils/formatters';

interface AnnouncementManagerModalProps {
  onClose: () => void;
}

export const AnnouncementManagerModal: React.FC<AnnouncementManagerModalProps> = ({ onClose }) => {
  const { announcements, deleteAnnouncement, language } = useAppContext();
  const [isClearingAll, setIsClearingAll] = useState(false);

  // Sort by date descending
  const sortedAnnouncements = [...announcements].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleClearAllAnnouncements = async () => {
    const confirmMsg = language === 'ar' 
      ? 'هل أنت متأكد من تصفير وحذف جميع التنبيهات والإعلانات؟ سيتم حذفها نهائياً من حسابات كافة المتدربين والمسؤولين.' 
      : 'Are you sure you want to purge and reset all announcements & notifications for all users and admins?';
    if (!window.confirm(confirmMsg)) return;

    setIsClearingAll(true);
    try {
      // 1. Delete announcements
      const annSnap = await getDocs(collection(db, "announcements"));
      const batch = writeBatch(db);
      annSnap.forEach(d => batch.delete(d.ref));
      await batch.commit();

      // 2. Delete system_announcements
      const sysAnnSnap = await getDocs(collection(db, "system_announcements"));
      const batch2 = writeBatch(db);
      sysAnnSnap.forEach(d => batch2.delete(d.ref));
      await batch2.commit();

      // 3. Clear user alert flags
      const usersSnap = await getDocs(collection(db, "users"));
      const batch3 = writeBatch(db);
      usersSnap.forEach(d => {
        batch3.update(d.ref, { hasUnreadNotifications: false });
      });
      await batch3.commit();

      try {
        localStorage.removeItem('oed_read_notifications');
      } catch (e) {}

      alert(language === 'ar' ? 'تم تصفير وحذف جميع التنبيهات بنجاح!' : 'All announcements and notifications purged successfully!');
      onClose();
    } catch (e: any) {
      console.error(e);
      alert('Error: ' + e.message);
    } finally {
      setIsClearingAll(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
        
        <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">
            {language === 'ar' ? 'إدارة التنبيهات المرسلة' : 'Manage Announcements'}
          </h2>
          <div className="flex items-center gap-2">
            {sortedAnnouncements.length > 0 && (
              <button 
                type="button"
                onClick={handleClearAllAnnouncements}
                disabled={isClearingAll}
                className="text-xs font-bold bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-red-300 disabled:opacity-50"
              >
                {isClearingAll ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span>{isClearingAll ? '...' : (language === 'ar' ? 'تصفير وحذف الكل' : 'Purge All')}</span>
              </button>
            )}
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition-colors cursor-pointer">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1 bg-gray-100">
          {sortedAnnouncements.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              {language === 'ar' ? 'لا يوجد تنبيهات مرسلة حالياً.' : 'No announcements sent yet.'}
            </div>
          ) : (
            <div className="space-y-3">
              {sortedAnnouncements.map(ann => (
                <div key={ann.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-start">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 uppercase tracking-wider ${
                        ann.isGlobal 
                          ? 'bg-red-100 text-red-700 border border-red-200' 
                          : 'bg-blue-100 text-[#002D62] border border-blue-200'
                      }`}>
                        {ann.isGlobal ? <Globe size={10} /> : <Megaphone size={10} />}
                        {ann.isGlobal 
                          ? (language === 'ar' ? 'إعلان عام' : 'Global Broadcast') 
                          : (language === 'ar' ? 'تنبيه دورة' : 'Session Announcement')}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        {formatDateToStandard(ann.date)}
                      </span>
                    </div>
                    
                    <h3 className="font-bold text-gray-800 text-base">{ann.title}</h3>
                    
                    {ann.courseName && !ann.isGlobal && (
                      <div className="text-sm text-gray-500 font-medium">
                        {ann.courseName}
                      </div>
                    )}
                    
                    <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">
                      {ann.message}
                    </div>
                    
                    <div className="text-xs text-gray-400">
                      {language === 'ar' ? 'المرسل:' : 'Sender:'} <span className="font-medium text-gray-600">{ann.author}</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => {
                      if (window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا التنبيه؟ سيتم سحبه من جميع المتدربين.' : 'Are you sure you want to delete this announcement?')) {
                        deleteAnnouncement(ann.id);
                      }
                    }}
                    className="shrink-0 p-2 text-red-500 hover:bg-red-50 hover:text-red-700 rounded transition-colors"
                    title={language === 'ar' ? 'حذف / إلغاء الإرسال' : 'Delete / Revoke'}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-white flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 text-sm font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 rounded transition-colors"
          >
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
