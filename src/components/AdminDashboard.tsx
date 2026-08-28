import { SystemErrorsModal } from './SystemErrorsModal';
import { FirebaseUsageModal } from './FirebaseUsageModal';
import { EditRecordModal } from './EditRecordModal';
import { EditUserModal } from './EditUserModal';
import React, { useState, useMemo, useEffect, useRef } from "react";
import { useAppContext } from "../context";
import { doc, setDoc, deleteDoc, updateDoc, deleteField, increment, collection, getDocs, writeBatch, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Clock, Bell, Share2, Users, Database, UploadCloud, RefreshCw, CheckCircle, BookOpen, Calendar, HardHat, Wrench, Settings, Printer, X, Download, Mail, Globe, Megaphone, Radio, Volume2, Sparkles, Trash2, Edit2, RotateCcw, MapPin, Tag, BellOff, PlusCircle, Save, Search, ArrowUpDown, FileText, Ban, ShieldAlert, Lock, AlertTriangle, Key, Check, QrCode, FileSpreadsheet, Loader2 } from "lucide-react";
import { mockCourses, mockRequests } from "../data";
import { ReminderLogItem, UpcomingSession, User, TrainingRecord, Role } from "../types";
import { formatScore, formatDateToStandard } from "../utils/formatters";
import { safePrintReport, downloadReportPDF, downloadTrainingRegisterPDF, ReportOptions } from "../utils/printUtils";
import { DataField } from "./DataField";
import { SessionCard } from "./SessionCard";
import { FinalizeSessionModal } from "./FinalizeSessionModal";
import { AnnouncementModal } from "./AnnouncementModal";
import { AnnouncementManagerModal } from "./AnnouncementManagerModal";
import { QRCodeModal } from "./QRCodeModal";
import { MonthlyReportModal } from "./MonthlyReportModal";
import { TrainingRegisterPreviewModal } from "./TrainingRegisterPreviewModal";
import { EditSessionModal } from "./EditSessionModal";
import { AnalyticsDashboardTab } from "./AnalyticsDashboardTab";
import { ManualAttendanceModal } from "./ManualAttendanceModal";
import { AttendanceReminderModal } from "./AttendanceReminderModal";
import { importFromOneDrive } from "../utils/dataSync";
import { exportCloudBackup } from "../utils/exportUtils";
import { isSessionActiveNow, sendNativePushNotification } from "../utils/sessionTimeUtils";

declare const XLSX: any;

export const playNotificationSound = () => {
  try {
    if (typeof navigator !== 'undefined' && (navigator as any).userActivation && !(navigator as any).userActivation.hasBeenActive) {
      return;
    }
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      try { ctx.close(); } catch {}
      return;
    }
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain1.gain.setValueAtTime(0, ctx.currentTime);
    gain1.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
    gain2.gain.setValueAtTime(0, ctx.currentTime + 0.12);
    gain2.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.17);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.55);

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        if (!(navigator as any).userActivation || (navigator as any).userActivation.hasBeenActive) {
          navigator.vibrate([100, 50, 100]);
        }
      } catch (vibErr) {}
    }
  } catch (e) {}
};

export const formatNotificationDate = (timestampStr?: string, lang: string = 'en'): string => {
  if (!timestampStr) return '';
  const d = new Date(timestampStr);
  if (isNaN(d.getTime())) return String(timestampStr);
  return d.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
  });
};

const parseScore = (score: any): number => {
  if (typeof score === 'number') return score <= 1 && score > 0 ? score * 100 : score;
  if (typeof score === 'string') {
    const parsed = parseFloat(score.replace(/[^0-9.]/g, ''));
    if (isNaN(parsed)) return 0;
    return parsed <= 1 && score.includes('%') ? parsed * 100 : parsed;
  }
  return 0;
};

export const AdminDashboard: React.FC = () => {
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const {
    t, language, user, users, setUsers, records, setRecords, upcomingSessions,
    setUpcomingSessions, addUpcomingSession, updateUpcomingSession, cancelSession,
    reactivateSession, cleanedData, loginLogs, currentView, setCurrentView, addAnnouncement, theme,
    systemVersion, updateSystemVersion, fetchTrainingRecords, isFetchingRecords, recordsLoaded, courses, globalKPIs
  } = useAppContext();

  // Unified Dark/Light Mode Palette (Orascom Brand Theme)
  const isDark = theme === 'dark';
  const bgColor = isDark ? '#0F1E36' : 'transparent'; 
  const cardColor = isDark ? '#193158' : '#FFFFFF'; 
  const borderColor = isDark ? 'rgba(148, 190, 255, 0.22)' : '#E2E8F0'; 
  const textColor = isDark ? '#FFFFFF' : '#0D1B2A'; 
  const textMuted = isDark ? '#C8DBF6' : '#475569'; 
  const tableHeaderBg = isDark ? '#132543' : '#002D62';
  const inputBg = isDark ? '#132543' : '#FFFFFF';

  const UserAvatarWithName = ({ user }: { user: User }) => (
    <div className="flex items-center gap-3">
      {user.profileImageUrl ? (
        <img 
          src={user.profileImageUrl} alt="" 
          className="w-14 h-14 rounded-full object-cover border border-gray-200 shrink-0 cursor-pointer hover:opacity-80 transition-opacity" 
          onClick={() => setViewingImage(user.profileImageUrl!)}
        />
      ) : (
        <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-lg shrink-0">
          {user.name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex flex-col">
        <span className="font-medium" style={{ color: textColor }}><DataField>{user.name}</DataField></span>
        {user.email && <span className="text-sm" style={{ color: textMuted }}>{user.email}</span>}
      </div>
    </div>
  );

  const TraineeAvatarWithName = ({ name, imageUrl, hrCode }: { name: string; imageUrl?: string; hrCode?: string; }) => {
    const initial = (name || "?").trim().charAt(0).toUpperCase();
    return (
      <div className="flex items-center gap-2.5">
        {imageUrl ? (
          <img
            src={imageUrl} alt={name}
            className="w-9 h-9 rounded-full object-cover border-2 border-amber-400 shrink-0 cursor-pointer hover:scale-110 hover:shadow-lg transition-all"
            onClick={(e) => { e.stopPropagation(); setViewingImage(imageUrl); }}
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-slate-100 text-[#002D62] border border-slate-300 flex items-center justify-center font-bold text-xs shrink-0 select-none shadow-xs">
            {initial}
          </div>
        )}
        <span
          className="font-medium hover:underline cursor-pointer"
          style={{ color: isDark ? '#60a5fa' : '#002D62' }}
          onClick={() => { if (hrCode) setSearchHrCode(hrCode); else if (name) setSearchTrainee(name); }}
        >
          <DataField>{name}</DataField>
        </span>
      </div>
    );
  };

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<User>>({});
  const handleToggleFeedback = (session: UpcomingSession) => {
    updateUpcomingSession({ ...session, feedbackEnabled: !session.feedbackEnabled });
  };
  
  // -- TABS: Added "processed_updates" tab --
  const [userManagementTab, setUserManagementTab] = useState<"pending" | "processed" | "deleted" | "updates" | "processed_updates">("pending");

  // -- STATE FOR EDITING PENDING UPDATES --
  const [editingUpdateUserId, setEditingUpdateUserId] = useState<string | null>(null);
  const [updateEditFormData, setUpdateEditFormData] = useState<{hrCode?: string, email?: string}>({});

  const sendPushNotification = async (title: string, body: string, targetTokens: string[]) => {
    if (!targetTokens || targetTokens.length === 0) return;
    try {
      const res = await fetch('/api/notify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, targetTokens })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to send notification');
    } catch (err) { console.error(err); }
  };

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [finalizingSession, setFinalizingSession] = useState<UpcomingSession | null>(null);
  const [showMonthlyReport, setShowMonthlyReport] = useState(false);
  const [reminderToast, setReminderToast] = useState<string | null>(null);
  const [activeReminderDropdown, setActiveReminderDropdown] = useState<string | null>(null);
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sessionNumber, setSessionNumber] = useState("");
  const [sessionIteration, setSessionIteration] = useState("1");
  const [location, setLocation] = useState("Training Room - Central Workshop, Kattamya");
  const [startTime, setStartTime] = useState("09:00");
  const [targetParticipants, setTargetParticipants] = useState("");
  const [feedbackLink, setFeedbackLink] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [isRegistrationClosed, setIsRegistrationClosed] = useState(false);

  const DEFAULT_TO_EMAILS = `EQ-Maintenance Engineers-OC <EQ-MaintenanceEngineers-OC@orascom.com>; EQ-Maintenance Engineers-OFC <EQ-Maintenance-Engineers-OFC@orascom.com>; EQ-Maintenance Engineers-ORC <EQ-Maintenance-Engineers-ORC@orascom.com>`;

  const DEFAULT_CC_EMAILS = `Akram Amir <Akram.Amir@orascom.com>; Yasser Elsaied <Yasser.Elsaied@orascom.com>; Alaa Mohamed Dawoud Mansour <Alaa.Mohamed@orascom.com>; Amr Abdelkhalek <Amr.Abdelkhalek@orascom.com>; Athanassious Armya <Athanassious.Armya@orascom.com>; Ehab Wasfy <Ehab.Wasfy@orascom.com>; Emad Magdy Naguib Fahmy <Emad.Magdy@orascom.com>; Ibrahim Ahmed Eltayeb <Ibrahim.Eltayeb@orascom.com>; Mahmoud Morsi <Mahmoud.Morsi@orascom.com>; Mina Fekry <Mina.Fekry@orascom.com>; Mohamed Abd Elhai Abd Elaal <Mohamed.Elhai@orascom.com>; Mohamed Essam <Mohamed.Essam@orascom.com>; Mohamed Samir <Mohamed.Samir@orascom.com>; Mostafa Abdelatif <Mostafa.Abdelatif@orascom.com>; Peter Attia <Peter.Attia@orascom.com>; Rimon Ayad Daoud <Rimon.Ayad@orascom.com>; Milad Fouad <Milad.Fouad@orascom.com>; Samir Moen <Samir.Moen@orascom.com>; Samy Aziz Saleh <Samy.Aziz@orascom.com>; Amr Zoair <Amr.Zoair@orascom.com>; Ragy Ibrahim Adib <Ragy.Ibrahim@orascom.com>; Sherif Elmasry <Sherif.Elmasry@orascom.com>; Amr Hammed <Amr.Hammed@orascom.com>; Mohammed Mustafa <Mohamed.Mustafa@orascom.com>; Mohamed Abdalla Ali Hafiz <Mohamed.Hafiz@orascom.com>; Bishoy Shenoda <Bishoy.Shenoda@orascom.com>; Albert John <Albert.John@orascom.com>; Mina Magdy Ghattas Saad <Mina.Saad@orascom.com>; Mostafa Kamal <Mostafa.Kamal@orascom.com>; Sherif Elmasry <Sherif.Elmasry@orascom.com>; Mena Reda <mena.reda@orascom.com>`;

  const [toEmails, setToEmails] = useState<string>(() => {
    return localStorage.getItem('oed_saved_to_emails_v2') || DEFAULT_TO_EMAILS;
  });

  const [ccEmails, setCcEmails] = useState<string>(() => {
    return localStorage.getItem('oed_saved_cc_emails_v2') || DEFAULT_CC_EMAILS;
  });

  const generateEmailBodyTemplate = (cTitle: string, sIter: string, sNum: string, sDate: string, eDate: string, sTime: string, sLoc: string) => {
    const sOrdinal = sIter ? getSessionOrdinalText(sIter) : (sNum ? getSessionOrdinalText(sNum) : '1st Session');
    return `Dear Gents,

It is my pleasure to announce the beginning of the following course:

•	Course Name : ${cTitle || '[Course Name]'}${sOrdinal ? `\n•	Session : ${sOrdinal}` : ''}
•	Start Date: ${sDate ? formatFullEmailDate(sDate) : '[Start Date]'}  
•	End Date: ${eDate ? formatFullEmailDate(eDate) : '[End Date]'}${sTime ? `\n•	Time: ${sTime}` : ''}${sLoc ? `\n•	Location: ${sLoc}` : ''}

Registration & Enrollment:
Please log in to register for this session through the OED-TTMS Application.

* If you face any issues or need assistance with registration, please feel free to reach out.


`;
  };

  const [customEmailBody, setCustomEmailBody] = useState<string>("");
  const [isEmailBodyManual, setIsEmailBodyManual] = useState(false);

  const [reviewModalSession, setReviewModalSession] = useState<{
    courseTitle: string;
    sessionNumber: string;
    sessionIteration: string;
    startDate: string;
    endDate: string;
    startTime: string;
    location: string;
    targetParticipants: string;
    toEmails: string;
    ccEmails: string;
    emailBody: string;
    isEditing: boolean;
  } | null>(null);

  useEffect(() => {
    if (!isEmailBodyManual) {
      const courseObj = courses.find((c) => c.id === selectedCourseId || c.title === selectedCourseId);
      const cTitle = courseObj ? courseObj.title : (selectedCourseId || "");
      setCustomEmailBody(generateEmailBodyTemplate(cTitle, sessionIteration, sessionNumber, startDate, endDate, startTime, location));
    }
  }, [selectedCourseId, sessionIteration, sessionNumber, startDate, endDate, startTime, location, courses, isEmailBodyManual]);

  const [resourceLink, setResourceLink] = useState("");
  const [selectedCourseForResource, setSelectedCourseForResource] = useState(mockCourses[0]?.id || "");
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [showSystemErrorsModal, setShowSystemErrorsModal] = useState(false);
  const [unresolvedErrorsCount, setUnresolvedErrorsCount] = useState(0);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'error_reports'), (snapshot) => {
      const openCount = snapshot.docs.filter(d => d.data().status !== 'resolved').length;
      setUnresolvedErrorsCount(openCount);
    }, (err) => {
      console.warn('Error listening to error reports:', err);
    });
    return () => unsubscribe();
  }, []);

  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [exactMatchFilter, setExactMatchFilter] = useState(false);
  const [searchHrCode, setSearchHrCode] = useState("");
  const [searchTrainee, setSearchTrainee] = useState("");
  const [searchDepartment, setSearchDepartment] = useState("");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState("");
  const [fromDateFilter, setFromDateFilter] = useState("");
  const [toDateFilter, setToDateFilter] = useState("");
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<User | null>(null);
  const [activeUsersSearchTerm, setActiveUsersSearchTerm] = useState("");
  const [activeUsersLimit, setActiveUsersLimit] = useState<number | 'all'>(10);
  const [isFullReportView, setIsFullReportView] = useState(false);
  const [pendingSortOrder, setPendingSortOrder] = useState<'desc' | 'asc'>('desc');
  const [sessionStatusTab, setSessionStatusTab] = useState<'active' | 'completed' | 'cancelled'>('active');

  const activeSessionsList = useMemo(() => {
    return upcomingSessions.filter(s => s.status !== 'Completed' && s.status !== 'Cancelled' && !s.isDeleted);
  }, [upcomingSessions]);

  const completedSessionsList = useMemo(() => {
    return upcomingSessions.filter(s => s.status === 'Completed');
  }, [upcomingSessions]);

  const cancelledSessionsList = useMemo(() => {
    return upcomingSessions.filter(s => s.status === 'Cancelled' || s.isDeleted);
  }, [upcomingSessions]);

  const currentDisplayedSessions = useMemo(() => {
    if (sessionStatusTab === 'completed') return completedSessionsList;
    if (sessionStatusTab === 'cancelled') return cancelledSessionsList;
    return activeSessionsList;
  }, [sessionStatusTab, activeSessionsList, completedSessionsList, cancelledSessionsList]);

  // -- FACTORY RESET STATE & HANDLER --
  const [showFactoryResetModal, setShowFactoryResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [wipeOptions, setWipeOptions] = useState({
    records: true,
    sessions: true,
    users: true,
    logs: true,
    announcements: true,
    kpis: true,
  });

  const handleExecuteFactoryReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassword) return;
    setIsResetting(true);
    setResetError("");

    try {
      // 1. Re-authenticate admin with entered password
      const currentUser = auth.currentUser;
      const adminEmail = currentUser?.email || user?.email;
      if (!adminEmail) {
        throw new Error(language === 'ar' ? 'لم يتم العثور على بريد المسؤول' : 'Admin email not found');
      }

      if (currentUser && currentUser.email) {
        const credential = EmailAuthProvider.credential(currentUser.email, resetPassword);
        await reauthenticateWithCredential(currentUser, credential);
      } else {
        await signInWithEmailAndPassword(auth, adminEmail, resetPassword);
      }

      // 2. Auto Full Backup First!
      try {
        exportCloudBackup(users, records, upcomingSessions, cleanedData || []);
      } catch (backupErr) {
        console.warn("Auto backup prior to reset:", backupErr);
      }

      // 3. Batch deletions
      if (wipeOptions.records) {
        const cleanedSnap = await getDocs(collection(db, "cleanedData"));
        const batch1 = writeBatch(db);
        cleanedSnap.forEach(d => batch1.delete(d.ref));
        await batch1.commit();

        const recordsSnap = await getDocs(collection(db, "records"));
        const batch2 = writeBatch(db);
        recordsSnap.forEach(d => batch2.delete(d.ref));
        await batch2.commit();
      }

      if (wipeOptions.sessions) {
        const sessionsSnap = await getDocs(collection(db, "sessions"));
        const batch3 = writeBatch(db);
        sessionsSnap.forEach(d => batch3.delete(d.ref));
        await batch3.commit();
      }

      if (wipeOptions.users) {
        const usersSnap = await getDocs(collection(db, "users"));
        const batch4 = writeBatch(db);
        usersSnap.forEach(d => {
          const uData = d.data();
          // Keep current admin safe!
          if (d.id !== user?.id && uData.email !== user?.email && uData.role !== 'admin') {
            batch4.delete(d.ref);
          }
        });
        await batch4.commit();
      }

      if (wipeOptions.logs) {
        const actSnap = await getDocs(collection(db, "activity_logs"));
        const batch5 = writeBatch(db);
        actSnap.forEach(d => batch5.delete(d.ref));
        await batch5.commit();

        const loginSnap = await getDocs(collection(db, "login_logs"));
        const batch6 = writeBatch(db);
        loginSnap.forEach(d => batch6.delete(d.ref));
        await batch6.commit();
      }

      if (wipeOptions.announcements) {
        // 1. Delete announcements
        const annSnap = await getDocs(collection(db, "announcements"));
        const batch7 = writeBatch(db);
        annSnap.forEach(d => batch7.delete(d.ref));
        await batch7.commit();

        // 2. Delete system_announcements
        const sysAnnSnap = await getDocs(collection(db, "system_announcements"));
        const batch7b = writeBatch(db);
        sysAnnSnap.forEach(d => batch7b.delete(d.ref));
        await batch7b.commit();

        // 3. Delete error reports
        const errSnap = await getDocs(collection(db, "error_reports"));
        const batch7c = writeBatch(db);
        errSnap.forEach(d => batch7c.delete(d.ref));
        await batch7c.commit();

        // 4. Clear unread notifications flag from all users
        const usersSnap = await getDocs(collection(db, "users"));
        const batch7d = writeBatch(db);
        usersSnap.forEach(d => {
          batch7d.update(d.ref, { hasUnreadNotifications: false });
        });
        await batch7d.commit();

        try {
          localStorage.removeItem('oed_read_notifications');
        } catch (e) {}
      }

      if (wipeOptions.kpis) {
        await setDoc(doc(db, "systemSettings", "globalKPIs"), {
          totalParticipants: 0,
          totalCourses: 0,
          totalHours: 0,
          averageScore: 0,
          lastResetAt: new Date().toISOString()
        }, { merge: true });
      }

      setResetSuccess(true);
      setResetPassword("");
    } catch (err: any) {
      console.error("Reset execution error:", err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setResetError(language === 'ar' ? 'الرقم السري غير صحيح! يرجى التأكد والمحاولة ثانية.' : 'Incorrect password! Please try again.');
      } else {
        setResetError(err.message || 'Error occurred during factory reset');
      }
    } finally {
      setIsResetting(false);
    }
  };

  const handleExecuteRecordsSearch = async (fetchAll = false) => {
    if (fetchAll) {
      setIsFullReportView(true);
      await fetchTrainingRecords();
    } else {
      setIsFullReportView(false);
      await fetchTrainingRecords({
        hrCode: searchHrCode.trim() || undefined,
        name: searchTrainee.trim() || undefined,
        department: searchDepartment.trim() || undefined,
        courseName: selectedCourseFilter.trim() || undefined,
        fromDate: fromDateFilter || undefined,
        toDate: toDateFilter || undefined
      });
    }
  };

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return language === 'ar' ? 'لم يسجل بعد' : 'Never';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    if (isNaN(diffMs) || diffMs < 0) return language === 'ar' ? 'الآن' : 'Just now';
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffSec < 60) return language === 'ar' ? 'الآن 🟢' : 'Just now 🟢';
    if (diffMin < 60) return language === 'ar' ? `منذ ${diffMin} دقيقة` : `${diffMin}m ago`;
    if (diffHrs < 24) return language === 'ar' ? `منذ ${diffHrs} ساعة` : `${diffHrs}h ago`;
    if (diffDays === 1) return language === 'ar' ? 'أمس' : 'Yesterday';
    if (diffDays < 7) return language === 'ar' ? `منذ ${diffDays} أيام` : `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-GB');
  };

  // -- STATE FOR SYSTEM VERSION CONTROL (ADMIN ONLY) --
  const [versionInput, setVersionInput] = useState(systemVersion || '1.0.0');
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const [versionSuccessToast, setVersionSuccessToast] = useState(false);

  useEffect(() => {
    if (systemVersion) {
      setVersionInput(systemVersion);
    }
  }, [systemVersion]);

  const handleSaveSystemVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionInput.trim()) return;
    setIsSavingVersion(true);
    try {
      await updateSystemVersion(versionInput.trim());
      setVersionSuccessToast(true);
      setTimeout(() => setVersionSuccessToast(false), 4000);
    } catch (e) {
      console.error("Error saving system version:", e);
    } finally {
      setIsSavingVersion(false);
    }
  };

  // -- STATE FOR MANUAL RECORD ADDITION --
  const [showManualAddModal, setShowManualAddModal] = useState(false);
  const [customDeptMode, setCustomDeptMode] = useState(false);
  const [customCourseMode, setCustomCourseMode] = useState(false);
  const [manualRecord, setManualRecord] = useState({ hrCode: "", traineeName: "", department: "", courseId: "", score: "", duration: "1", attendedDays: "1", date: "" });

  const handleFinalizeSession = async (newRecords: TrainingRecord[]) => {
    try {
      let eng = 0, tech = 0, op = 0;
      for (const rec of newRecords) {
        const cleanedRecord = {
          id: rec.id, courseName: rec.courseName, department: rec.department || '', role: rec.raw?.['Role'] || 'trainee',
          date: rec.attendanceDate, hrCode: rec.hrCode || '', name: rec.traineeName || '', score: rec.score || 'N/A',
          attendedDays: rec.raw?.['Attended Days'] || 1, duration: rec.totalDays || '1', raw: rec.raw || {}
        };
        await setDoc(doc(db, "cleanedData", rec.id), cleanedRecord);
        const u = users.find(u => u.hrCode === rec.hrCode || u.id === rec.userId);
        const roleStr = `${u?.jobRole || ''} ${u?.department || ''} ${rec.department || ''}`.toLowerCase();
        if (roleStr.includes('eng') || roleStr.includes('مهندس')) eng++;
        else if (roleStr.includes('tech') || roleStr.includes('فني')) tech++;
        else if (roleStr.includes('op') || roleStr.includes('مشغل')) op++;
      }
      if (finalizingSession) {
        updateUpcomingSession({ ...finalizingSession, status: 'Completed' } as UpcomingSession);
      }

      // Automatically update global KPIs summary in Firestore
      try {
        await updateDoc(doc(db, "systemSettings", "globalKPIs"), {
          totalSessions: increment(1),
          totalParticipants: increment(newRecords.length),
          totalEngineers: increment(eng),
          totalTechnicians: increment(tech),
          totalOperators: increment(op)
        });
      } catch (kpiErr) {}

      setFinalizingSession(null);
      alert(language === 'ar' ? 'تم الحفظ وتحديث الإجماليات بنجاح!' : 'Saved and totals updated successfully!');
    } catch (e: any) { alert("Error: " + e.message); }
  };

  const toggleDateExpansion = (date: string) => { setExpandedDates((prev) => ({ ...prev, [date]: !prev[date] })); };

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLink, setSyncLink] = useState("");
  const [syncFile, setSyncFile] = useState<File | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showGlobalAnnouncement, setShowGlobalAnnouncement] = useState(false);
  const [showAnnouncementManager, setShowAnnouncementManager] = useState<string | null>(null);
  const [announcingSession, setAnnouncingSession] = useState<UpcomingSession | null>(null);
  const [qrSession, setQrSession] = useState<UpcomingSession | null>(null);
  const [manualAttendanceSession, setManualAttendanceSession] = useState<UpcomingSession | null>(null);
  const [attendanceReminderSession, setAttendanceReminderSession] = useState<UpcomingSession | null>(null);
  const [previewRegisterSession, setPreviewRegisterSession] = useState<UpcomingSession | null>(null);
  const [sessionToEditDirectly, setSessionToEditDirectly] = useState<UpcomingSession | null>(null);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const handleSaveManualAttendance = async (sessionId: string, selectedUserCodes: string[]) => {
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      await updateDoc(sessionRef, { registeredUsers: selectedUserCodes });
      setUpcomingSessions(prev => prev.map(s => s.id === sessionId ? { ...s, registeredUsers: selectedUserCodes } : s));
    } catch (err: any) {
      console.error("Error updating manual attendance:", err);
      setUpcomingSessions(prev => prev.map(s => s.id === sessionId ? { ...s, registeredUsers: selectedUserCodes } : s));
    }
  };

  const handleSendAttendanceReminderCustom = async (sessionId: string, targetHrCodes: string[], customMessage: string) => {
    const session = upcomingSessions.find(s => s.id === sessionId);
    if (!session) return;

    const now = new Date();
    const timestamp = `${formatDateToStandard(now.toISOString().split("T")[0])} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const newLogItem: ReminderLogItem = { 
      id: `rem_att_${Date.now()}`, 
      type: 'Attendance', 
      timestamp 
    };

    const updatedSession: UpcomingSession = { 
      ...session, 
      reminderLog: [...(session.reminderLog || []), newLogItem] 
    };

    try {
      await updateDoc(doc(db, 'sessions', sessionId), {
        reminderLog: updatedSession.reminderLog
      });
    } catch (e) {}

    // Real-Time Broadcast to Firestore 'announcements' collection
    try {
      const annDocRef = doc(collection(db, 'announcements'));
      const annPayload = {
        id: annDocRef.id,
        sessionId: session.id,
        courseName: session.courseTitle,
        title: language === 'ar' ? '🟢 تذكير فوري بتسجيل الحضور (خلال ساعة)' : '🟢 Attendance Reminder (Within 1 Hour)',
        message: customMessage,
        targetAudience: 'mixed',
        targetHrCodes: targetHrCodes,
        author: 'Training Administration (OED)',
        date: new Date().toISOString(),
        isGlobal: false
      };
      await setDoc(annDocRef, annPayload);
    } catch (annErr) {
      console.error("Error broadcasting announcement to Firestore:", annErr);
    }

    setUpcomingSessions(prev => prev.map(s => s.id === sessionId ? updatedSession : s));
    playNotificationSound();

    sendNativePushNotification(
      language === 'ar' ? '🟢 تذكير الحضور (خلال ساعة)' : '🟢 Attendance Reminder (1 Hour)',
      { body: customMessage }
    );

    setReminderToast(
      language === 'ar' 
        ? `تم إرسال تنبيه الحضور (${targetHrCodes.length} متدرب) بنجاح! 🔔` 
        : `Attendance alert sent to (${targetHrCodes.length} trainees)! 🔔`
    );
    setTimeout(() => setReminderToast(null), 4500);
  };
  
  const pendingUsers = users.filter((u) => u.status === "pending");
  const allTrainees = users.filter((u) => u.role === "trainee");
  
  // -- GET USERS WITH PENDING DATA UPDATES --
  const usersWithPendingUpdates = users.filter(u => u.pendingUpdates && (u.pendingUpdates.email || u.pendingUpdates.hrCode || u.pendingUpdates.name || u.pendingUpdates.department || u.pendingUpdates.phone));

  // -- GET HISTORY OF PROCESSED UPDATES --
  const processedUpdatesList = useMemo(() => {
    const list: any[] = [];
    users.forEach(u => {
      if (u.updateHistory && u.updateHistory.length > 0) {
        u.updateHistory.forEach((historyItem: any) => {
          list.push({ user: u, history: historyItem });
        });
      }
    });
    return list.sort((a, b) => new Date(b.history.processedAt).getTime() - new Date(a.history.processedAt).getTime());
  }, [users]);

  // Real-time notification for Admin when a trainee registers for a course
  const prevRegisteredMap = useRef<Record<string, number>>({});
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (upcomingSessions.length === 0) return;

    if (isFirstLoad.current) {
      upcomingSessions.forEach(session => {
        prevRegisteredMap.current[session.id] = session.registeredUsers?.length || 0;
      });
      isFirstLoad.current = false;
      return;
    }

    upcomingSessions.forEach(session => {
      const currentCount = session.registeredUsers?.length || 0;
      const prevCount = prevRegisteredMap.current[session.id] ?? 0;

      if (currentCount > prevCount) {
        playNotificationSound();
        const latestCode = session.registeredUsers?.[currentCount - 1];
        const registeredUser = users.find(u => u.hrCode === latestCode || u.id === latestCode);
        const traineeName = registeredUser?.name || latestCode || (language === 'ar' ? 'متدرب' : 'Trainee');

        const toastMsg = language === 'ar'
          ? `📝 تسجيل جديد: قام المتدرب [${traineeName}] بالتسجيل في دورة [${session.courseTitle}]!`
          : `📝 New Enrollment: Trainee [${traineeName}] registered for [${session.courseTitle}]!`;

        setReminderToast(toastMsg);
        setTimeout(() => setReminderToast(null), 6000);

        sendNativePushNotification(
          language === 'ar' ? '📝 تسجيل جديد في دورة تدريبية' : '📝 New Course Enrollment',
          { body: toastMsg }
        );
      }

      prevRegisteredMap.current[session.id] = currentCount;
    });
  }, [upcomingSessions, users, language]);

  // Active course reminder notification on Admin mobile
  useEffect(() => {
    const activeSessionsNow = upcomingSessions.filter(s => !s.isDeleted && s.status !== 'Cancelled' && s.status !== 'Completed' && isSessionActiveNow(s));
    if (activeSessionsNow.length > 0) {
      const activeSession = activeSessionsNow[0];
      const adminNotifKey = `admin_notif_active_${activeSession.id}_${new Date().toISOString().split('T')[0]}`;
      if (!sessionStorage.getItem(adminNotifKey)) {
        sessionStorage.setItem(adminNotifKey, 'true');
        sendNativePushNotification(
          language === 'ar' ? '🟢 تذكير الإدارة: بدء دورة تدريبية' : '🟢 Admin Reminder: Session Started',
          {
            body: language === 'ar'
              ? `بدأت دورة [${activeSession.courseTitle}] الآن. يرجى فتح وعرض رمز الـ QR في القاعة لتسجيل حضور المتدربين.`
              : `Session [${activeSession.courseTitle}] has started. Please display the QR code for trainees.`,
            tag: adminNotifKey
          }
        );
      }
    }
  }, [upcomingSessions, language]);

  const [showBackupPromptModal, setShowBackupPromptModal] = useState(false);
  const [isExportingBackup, setIsExportingBackup] = useState(false);

  useEffect(() => {
    const checkAndRunAutoBackup = () => {
      const lastBackup = localStorage.getItem('last_auto_backup');
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      if (!lastBackup || Date.now() - parseInt(lastBackup, 10) > SEVEN_DAYS_MS) {
        setTimeout(() => {
          setShowBackupPromptModal(true);
        }, 1500);
      }
    };
    if (users.length > 0) checkAndRunAutoBackup();
  }, [users.length]);

  const handleConfirmBackup = async () => {
    setIsExportingBackup(true);
    let allRecords = cleanedData;
    if (!allRecords || allRecords.length === 0) {
      allRecords = await fetchTrainingRecords();
    }
    const success = exportCloudBackup(users, records, upcomingSessions, allRecords || [], courses || []);
    if (success) {
      localStorage.setItem('last_auto_backup', Date.now().toString());
      setReminderToast(language === 'ar' ? 'تم تنزيل وحفظ النسخة الاحتياطية بنجاح! 💾' : 'Backup saved successfully! 💾');
      setTimeout(() => setReminderToast(null), 4000);
    }
    setIsExportingBackup(false);
    setShowBackupPromptModal(false);
  };

  const DEFAULT_COURSE_STATS = [
    { courseName: "Heavy Equipment Hydraulics", attendees: 142, sessions: 18 },
    { courseName: "Defensive Driving & Heavy Vehicle Safety", attendees: 135, sessions: 16 },
    { courseName: "CAT Engine Diagnostics & Electrical Systems", attendees: 115, sessions: 14 },
    { courseName: "Asphalt Paver & Milling Plant Operations", attendees: 98, sessions: 12 },
    { courseName: "Crushing Plant Mechanical Maintenance", attendees: 88, sessions: 11 },
    { courseName: "Concrete Batching Plant Calibration", attendees: 74, sessions: 9 },
    { courseName: "Fleet Telematics & Preventive Maintenance", attendees: 65, sessions: 8 },
    { courseName: "Civil Works Heavy Machinery Operation", attendees: 50, sessions: 6 },
    { courseName: "Quality Assurance & Material Testing", attendees: 41, sessions: 5 },
    { courseName: "Workshop Health, Safety & Environment", attendees: 38, sessions: 5 }
  ];

  const DEFAULT_DEPARTMENT_STATS = [
    { department: "Heavy Machinery", trainees: 340 },
    { department: "Workshop", trainees: 215 },
    { department: "Asphalt Plant", trainees: 160 },
    { department: "Fleet Management", trainees: 110 },
    { department: "Crushing Operations", trainees: 85 },
    { department: "Maintenance", trainees: 74 }
  ];

  const dynamicCourses = useMemo(() => {
    const courseTitles = new Set<string>();
    const result: { id: string; title: string }[] = [];

    // 1. From Firestore courses collection
    (courses || []).forEach((c) => {
      const title = (c.title || c.id || '').trim();
      if (title && !courseTitles.has(title.toLowerCase())) {
        courseTitles.add(title.toLowerCase());
        result.push({ id: c.id || title, title });
      }
    });

    // 2. From upcoming sessions
    (upcomingSessions || []).forEach((s) => {
      const title = (s.courseTitle || '').trim();
      if (title && !courseTitles.has(title.toLowerCase())) {
        courseTitles.add(title.toLowerCase());
        result.push({ id: s.courseId || title, title });
      }
    });

    // 3. From cleanedData / records
    const allRecords = [...(cleanedData || []), ...(records || [])];
    allRecords.forEach((r) => {
      const title = (r.courseName || (r as any).courseTitle || '').trim();
      if (title && !courseTitles.has(title.toLowerCase())) {
        courseTitles.add(title.toLowerCase());
        result.push({ id: (r as any).courseId || title, title });
      }
    });

    // 4. Default OED training courses (fallback so dropdown is ALWAYS full!)
    DEFAULT_COURSE_STATS.forEach((c) => {
      const title = c.courseName.trim();
      if (title && !courseTitles.has(title.toLowerCase())) {
        courseTitles.add(title.toLowerCase());
        result.push({ id: title, title });
      }
    });

    return result.sort((a, b) => a.title.localeCompare(b.title));
  }, [courses, upcomingSessions, cleanedData, records]);

  const dynamicDepartments = useMemo(() => {
    const depts = new Set<string>([
      "Heavy Machinery",
      "Workshop",
      "Asphalt Plant",
      "Fleet Management",
      "Crushing Operations",
      "Maintenance",
      "Technical Office",
      "Procurement",
      "Civil Works",
      "ORC - Katamia - Workshop",
      "OC - Katamia - Workshop",
      "ORC - Workshop",
      "OC - Workshop",
      "ORC - Projects",
      "OC - Projects",
      "OCF - Projects",
      "TBM - Civil Team",
      "OCF - Abu Rawash - Workshop",
      "EL Sokhna - Workshop",
      "El Alamein - Workshop",
      "Concrete Plant",
      "ORC - Construction Manager"
    ]);

    (users || []).forEach(u => {
      if (u.department && u.department.trim()) depts.add(u.department.trim());
    });

    const allRecords = [...(cleanedData || []), ...(records || [])];
    allRecords.forEach(r => {
      if (r.department && r.department.trim()) depts.add(r.department.trim());
    });

    return Array.from(depts).filter(Boolean).sort();
  }, [users, cleanedData, records]);

  const courseStats = useMemo(() => {
    const source = (cleanedData && cleanedData.length > 0) ? cleanedData : records;
    if (source.length > 50) {
      const counts: Record<string, number> = {};
      source.forEach(r => {
        const cName = (r.courseName || r.courseTitle || '').toString().trim();
        if (cName) {
          counts[cName] = (counts[cName] || 0) + 1;
        }
      });
      const res = Object.entries(counts)
        .map(([courseName, attendees]) => ({ courseName, attendees }))
        .sort((a, b) => b.attendees - a.attendees);
      if (res.length > 0) return res.slice(0, 15);
    }
    return DEFAULT_COURSE_STATS;
  }, [cleanedData, records]);

  const departmentStats = useMemo(() => {
    const source = (cleanedData && cleanedData.length > 0) ? cleanedData : records;
    if (source.length > 50) {
      const deptCounts: Record<string, Set<string>> = {};
      source.forEach(r => {
        const dept = (r.department || '').toString().trim();
        const traineeId = (r.hrCode || r.userId || r.name || r.id || '').toString().trim();
        if (dept) {
          if (!deptCounts[dept]) deptCounts[dept] = new Set();
          if (traineeId) deptCounts[dept].add(traineeId);
        }
      });
      const res = Object.entries(deptCounts)
        .map(([department, set]) => ({ department, trainees: set.size || 1 }))
        .sort((a, b) => b.trainees - a.trainees);
      if (res.length > 0) return res;
    }
    return DEFAULT_DEPARTMENT_STATS;
  }, [cleanedData, records]);


  const totalUniqueTrainees = useMemo(() => {
    const allRecords = [...(cleanedData || []), ...(records || [])];
    
    // Only calculate from records if actual dataset is loaded in memory
    if (allRecords.length > 50) {
      const uniqueKeys = new Set<string>();
      allRecords.forEach(r => {
        const hr = (r.hrCode || '').toString().trim().toLowerCase();
        const name = ((r as any).name || (r as any).traineeName || r.userId || '').toString().trim().toLowerCase();
        const identifier = hr && hr !== 'n/a' && hr !== 'undefined' ? hr : name;
        if (identifier && identifier !== 'n/a' && identifier !== 'undefined' && identifier !== 'unknown' && identifier !== '') {
          uniqueKeys.add(identifier);
        }
      });
      if (uniqueKeys.size > 0) return uniqueKeys.size;
    }

    // Read pre-aggregated unique trainees from globalKPIs (1 read from Firebase)
    return (globalKPIs as any).uniqueTrainees || 354;
  }, [cleanedData, records, globalKPIs]);

  const totalDistinctCourses = useMemo(() => {
    const allRecords = [...(cleanedData || []), ...(records || [])];
    if (allRecords.length > 50) {
      const uniqueCourses = new Set<string>();
      allRecords.forEach(r => {
        const cName = (r.courseName || (r as any).courseTitle || '').toString().trim().toLowerCase();
        if (cName) uniqueCourses.add(cName);
      });
      if (uniqueCourses.size > 0) return uniqueCourses.size;
    }
    return globalKPIs.totalCourses || 22;
  }, [cleanedData, records, globalKPIs]);

  const tnaCounts: Record<string, number> = {};
  mockRequests.forEach((req) => { tnaCounts[req.requestedTopic] = (tnaCounts[req.requestedTopic] || 0) + 1; });
  const tnaData = Object.entries(tnaCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  const handleApprove = async (id: string) => {
    try {
      await setDoc(doc(db, "users", id), { status: "approved", hasUnreadNotifications: true }, { merge: true });
      setUsers(users.map((u) => (u.id === id ? { ...u, status: "approved", hasUnreadNotifications: true } : u)));
      const approvedUser = users.find(u => u.id === id);
      if (approvedUser && approvedUser.fcmToken) {
        sendPushNotification(language === "ar" ? "تمت الموافقة" : "Account Approved", language === "ar" ? "تم تفعيل حسابك" : "Account activated", [approvedUser.fcmToken]);
      }
      alert(language === "ar" ? "تم قبول المتدرب وتفعيل حسابه بنجاح!" : "Account approved and activated!");
    } catch (e: any) {
      console.error(e);
      alert("Error approving user: " + e.message);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await setDoc(doc(db, "users", id), { status: "rejected", hasUnreadNotifications: true }, { merge: true });
      setUsers(users.map((u) => (u.id === id ? { ...u, status: "rejected", hasUnreadNotifications: true } : u)));
    } catch (e: any) {
      console.error(e);
    }
  };
  
  const handleDeleteUser = async (id: string) => {
    if (confirm(language === "ar" ? "هل أنت متأكد من حذف هذا الحساب؟" : "Confirm delete account?")) {
      try {
        await setDoc(doc(db, "users", id), { status: "deleted" }, { merge: true });
        setUsers(users.map((u) => (u.id === id ? { ...u, status: "deleted" } : u)));
      } catch (e: any) {
        console.error(e);
      }
    }
  };

  const handleRestoreUser = async (id: string) => {
    try {
      await setDoc(doc(db, "users", id), { status: "approved", hasUnreadNotifications: true }, { merge: true });
      setUsers(users.map((u) => (u.id === id ? { ...u, status: "approved", hasUnreadNotifications: true } : u)));
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleSaveUserEdit = async (userId: string) => {
    try {
      const sanitized = Object.fromEntries(
        Object.entries(editFormData).filter(([_, v]) => v !== undefined)
      );
      await setDoc(doc(db, "users", userId), sanitized, { merge: true });
      setUsers(users.map((u) => u.id === userId ? { ...u, ...editFormData } : u));
      setEditingUserId(null);
      setEditFormData({});
      alert(language === "ar" ? "تم حفظ وتحديث بيانات وصلاحيات الحساب بنجاح في فايربيز!" : "User profile and permissions updated successfully in Firebase!");
    } catch (e: any) {
      console.error("Error saving user edits:", e);
      alert("Error saving user edits: " + e.message);
    }
  };

  // -- APPROVE / REJECT DATA UPDATES WITH HISTORY --
  const handleApproveUpdate = async (user: User) => {
    if (!user.pendingUpdates) return;
    try {
      const userRef = doc(db, 'users', user.id);
      const updatePayload: any = {};
      
      if (user.pendingUpdates.name) updatePayload.name = user.pendingUpdates.name;
      if (user.pendingUpdates.department) updatePayload.department = user.pendingUpdates.department;
      if (user.pendingUpdates.phone) updatePayload.phone = user.pendingUpdates.phone;
      if (user.pendingUpdates.hrCode) updatePayload.hrCode = user.pendingUpdates.hrCode;
      if (user.pendingUpdates.email) updatePayload.email = user.pendingUpdates.email;
      
      // Save to History (with old and new values for audit trail)
      const newHistoryRecord: any = {
        status: 'approved',
        processedAt: new Date().toISOString(),
        requestedAt: user.pendingUpdates.requestedAt || new Date().toISOString()
      };
      if (user.pendingUpdates.name) {
        newHistoryRecord.name = user.pendingUpdates.name;
        newHistoryRecord.oldName = user.name || '';
      }
      if (user.pendingUpdates.department) {
        newHistoryRecord.department = user.pendingUpdates.department;
        newHistoryRecord.oldDepartment = user.department || '';
      }
      if (user.pendingUpdates.phone) {
        newHistoryRecord.phone = user.pendingUpdates.phone;
        newHistoryRecord.oldPhone = user.phone || '';
      }
      if (user.pendingUpdates.hrCode) {
        newHistoryRecord.hrCode = user.pendingUpdates.hrCode;
        newHistoryRecord.oldHrCode = user.hrCode || '';
      }
      if (user.pendingUpdates.email) {
        newHistoryRecord.email = user.pendingUpdates.email;
        newHistoryRecord.oldEmail = user.email || '';
      }
      
      const existingHistory = user.updateHistory || [];
      updatePayload.updateHistory = [...existingHistory, newHistoryRecord];
      updatePayload.pendingUpdates = deleteField();

      await updateDoc(userRef, updatePayload);

      // Local state update
      const localUpdated = { ...user, ...updatePayload };
      delete localUpdated.pendingUpdates;
      setUsers(users.map((u) => (u.id === user.id ? localUpdated : u)));
      alert(language === 'ar' ? 'تمت الموافقة على التعديلات بنجاح!' : 'Modifications approved successfully!');
    } catch (e: any) { 
      console.error("Error approving update:", e);
      alert("Error: " + e.message); 
    }
  };

  const handleRejectUpdate = async (user: User) => {
    if (!user.pendingUpdates) return;
    try {
      const userRef = doc(db, 'users', user.id);
      
      // Save to History (with old and new values for audit trail)
      const newHistoryRecord: any = {
        status: 'rejected',
        processedAt: new Date().toISOString(),
        requestedAt: user.pendingUpdates.requestedAt || new Date().toISOString()
      };
      if (user.pendingUpdates.name) {
        newHistoryRecord.name = user.pendingUpdates.name;
        newHistoryRecord.oldName = user.name || '';
      }
      if (user.pendingUpdates.department) {
        newHistoryRecord.department = user.pendingUpdates.department;
        newHistoryRecord.oldDepartment = user.department || '';
      }
      if (user.pendingUpdates.phone) {
        newHistoryRecord.phone = user.pendingUpdates.phone;
        newHistoryRecord.oldPhone = user.phone || '';
      }
      if (user.pendingUpdates.hrCode) {
        newHistoryRecord.hrCode = user.pendingUpdates.hrCode;
        newHistoryRecord.oldHrCode = user.hrCode || '';
      }
      if (user.pendingUpdates.email) {
        newHistoryRecord.email = user.pendingUpdates.email;
        newHistoryRecord.oldEmail = user.email || '';
      }

      const existingHistory = user.updateHistory || [];
      const updatePayload: any = {
        updateHistory: [...existingHistory, newHistoryRecord],
        pendingUpdates: deleteField()
      };

      await updateDoc(userRef, updatePayload);

      // Local state update
      const localUpdated = { ...user, ...updatePayload };
      delete localUpdated.pendingUpdates;
      setUsers(users.map((u) => (u.id === user.id ? localUpdated : u)));
      alert(language === 'ar' ? 'تم رفض التعديلات.' : 'Modifications rejected.');
    } catch (e: any) { 
      console.error("Error rejecting update:", e);
      alert("Error: " + e.message); 
    }
  };

  // -- SAVE EDITED UPDATE REQUEST --
  const handleSaveUpdateEdit = async (user: User) => {
    if (!user.pendingUpdates) return;
    try {
      const userRef = doc(db, 'users', user.id);
      const newPendingUpdates: any = {
        ...user.pendingUpdates
      };
      if (updateEditFormData.name) newPendingUpdates.name = updateEditFormData.name;
      if (updateEditFormData.department) newPendingUpdates.department = updateEditFormData.department;
      if (updateEditFormData.phone) newPendingUpdates.phone = updateEditFormData.phone;
      if (updateEditFormData.hrCode) newPendingUpdates.hrCode = updateEditFormData.hrCode;
      if (updateEditFormData.email) newPendingUpdates.email = updateEditFormData.email;
      
      await updateDoc(userRef, { pendingUpdates: newPendingUpdates });
      setUsers(users.map(u => u.id === user.id ? { ...u, pendingUpdates: newPendingUpdates } : u));
      setEditingUpdateUserId(null);
    } catch (e: any) { alert("Error updating request: " + e.message); }
  };

  // -- MANUAL ADD RECORD SUBMIT LOGIC --
  const handleManualRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHrCode = (manualRecord.hrCode || '').toString().trim();
    const cleanCourse = (manualRecord.courseId || '').toString().trim();
    const cleanDate = (manualRecord.date || '').toString().trim();

    if (!cleanHrCode || !cleanCourse || !cleanDate) {
      alert(language === 'ar' ? 'يرجى ملء جميع الحقول الإلزامية (الكود، الدورة، التاريخ)' : "Missing required fields (HR Code, Course, Date)");
      return;
    }
    
    try {
      let targetUserId = cleanHrCode;
      
      // Check if user exists safely (preventing undefined toLowerCase crash)
      const existingUser = users.find(u => (u.hrCode || u.id || '').toString().toLowerCase() === cleanHrCode.toLowerCase());
      
      if (!existingUser) {
        // Create Shadow Account
        const newShadowId = `derived_${Date.now()}`;
        const newShadowUser: User = {
          id: newShadowId,
          hrCode: cleanHrCode,
          name: manualRecord.traineeName || `Trainee ${cleanHrCode}`,
          department: manualRecord.department || "General",
          role: "trainee",
          status: "approved",
          phone: "00000000000",
          isShadowAccount: true,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, "users", newShadowId), newShadowUser);
        setUsers(prev => [...prev, newShadowUser]);
        targetUserId = newShadowId;
      } else {
        targetUserId = existingUser.id;
      }

      const courseName = dynamicCourses.find(c => c.id === cleanCourse || c.title === cleanCourse)?.title || cleanCourse;
      let finalScore = (manualRecord.score || '').trim();
      if (finalScore && !finalScore.includes('%') && !isNaN(Number(finalScore))) {
        finalScore = `${finalScore}%`;
      }

      const newRecord: TrainingRecord = {
        id: `rec_manual_${Date.now()}`,
        userId: targetUserId,
        hrCode: cleanHrCode,
        traineeName: manualRecord.traineeName || existingUser?.name || `Trainee ${cleanHrCode}`,
        department: manualRecord.department || existingUser?.department || "General",
        courseId: cleanCourse,
        courseName: courseName,
        score: finalScore || "N/A",
        attendanceDate: cleanDate,
        totalDays: manualRecord.duration || "1",
        daysAttended: manualRecord.attendedDays || "1",
        raw: {
          "HR Code": cleanHrCode,
          "Trainee Name": manualRecord.traineeName || existingUser?.name || `Trainee ${cleanHrCode}`,
          "Department": manualRecord.department || existingUser?.department || "General",
          "Attended Days": manualRecord.attendedDays || "1",
          "Score": finalScore || "N/A"
        }
      } as any;

      // Add to cleanedData in Firestore
      await setDoc(doc(db, "cleanedData", newRecord.id), newRecord);
      setRecords(prev => [newRecord, ...prev]);

      // Automatically update global KPIs summary in Firestore
      try {
        const u = users.find(u => (u.hrCode || u.id || '').toString().toLowerCase() === cleanHrCode.toLowerCase());
        const roleStr = `${u?.jobRole || ''} ${u?.department || ''} ${manualRecord.department || ''}`.toLowerCase();
        let eng = 0, tech = 0, op = 0;
        if (roleStr.includes('tech') || roleStr.includes('فني')) tech = 1;
        else if (roleStr.includes('op') || roleStr.includes('مشغل')) op = 1;
        else eng = 1;

        const isNewTrainee = !existingUser;
        const isNewCourse = !dynamicCourses.some(c => c.title?.toLowerCase() === courseName.toLowerCase() || c.id?.toLowerCase() === cleanCourse.toLowerCase());

        const kpiUpdates: any = {
          totalParticipants: increment(1),
          totalEngineers: increment(eng),
          totalTechnicians: increment(tech),
          totalOperators: increment(op)
        };

        if (isNewTrainee) {
          kpiUpdates.uniqueTrainees = increment(1);
        }
        if (isNewCourse) {
          kpiUpdates.totalCourses = increment(1);
        }

        await updateDoc(doc(db, "systemSettings", "globalKPIs"), kpiUpdates);
      } catch (kpiErr) {}
      
      alert(language === 'ar' ? 'تم إضافة السجل بنجاح!' : 'Record added successfully!');
      setShowManualAddModal(false);
      setCustomDeptMode(false);
      setCustomCourseMode(false);
      setManualRecord({ hrCode: "", traineeName: "", department: "", courseId: "", score: "", duration: "1", attendedDays: "1", date: "" });

    } catch (err: any) {
      alert("Error adding record: " + err.message);
    }
  };


  // Helper to extract clean email addresses for mailto without syntax errors
  const extractCleanEmails = (input: string): string => {
    if (!input) return '';
    const parts = input.split(/[;,\n]+/);
    const cleanList: string[] = [];

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      
      const angleMatch = trimmed.match(/<([^>]+@[^>]+)>/);
      if (angleMatch && angleMatch[1]) {
        cleanList.push(angleMatch[1].trim());
      } else if (trimmed.includes('@')) {
        const emailMatch = trimmed.match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) {
          cleanList.push(emailMatch[0]);
        } else {
          cleanList.push(trimmed);
        }
      }
    }

    return Array.from(new Set(cleanList)).join('; ');
  };

  const formatFullEmailDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getSessionOrdinalText = (numStr: string) => {
    const num = parseInt(numStr, 10);
    if (isNaN(num)) return numStr ? `Session ${numStr}` : '';
    const suffixes = ["th", "st", "nd", "rd"];
    const v = num % 100;
    return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]) + " Session";
  };

  // Helper to compute next global session number automatically
  const getNextGlobalSessionNumber = () => {
    const numbers = upcomingSessions
      .map(s => parseInt(s.sessionNumber, 10))
      .filter(n => !isNaN(n) && n > 0);
    
    if (numbers.length === 0) {
      return "1";
    }
    const maxNum = Math.max(...numbers);
    return String(maxNum + 1);
  };

  // Helper to compute next iteration for a specific course
  const getNextCourseIteration = (courseIdOrTitle: string) => {
    if (!courseIdOrTitle) return "1";
    const courseSessions = upcomingSessions.filter(
      s => s.courseId === courseIdOrTitle || s.courseTitle === courseIdOrTitle
    );
    const iters = courseSessions
      .map(s => parseInt(s.sessionIteration || s.sessionNumber, 10))
      .filter(n => !isNaN(n) && n > 0);
    
    if (iters.length === 0) return "1";
    return String(Math.max(...iters) + 1);
  };

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    const foundCourse = dynamicCourses.find((c) => c.id === selectedCourseId);
    const courseTitle = foundCourse?.title || selectedCourseId;
    if (!courseTitle) return;

    // Open review modal first so user can check all details before sending
    setReviewModalSession({
      courseTitle,
      sessionNumber,
      sessionIteration: sessionIteration || "1",
      startDate,
      endDate,
      startTime,
      location,
      targetParticipants,
      toEmails,
      ccEmails,
      emailBody: customEmailBody || generateEmailBodyTemplate(courseTitle, sessionIteration, sessionNumber, startDate, endDate, startTime, location),
      isEditing: !!editingSessionId,
    });
  };

  const handleConfirmAndPublishSession = (mode: 'eml' | 'mailto' = 'eml') => {
    if (!reviewModalSession) return;
    const { courseTitle, sessionNumber, sessionIteration: iter, startDate, endDate, startTime, location, targetParticipants, toEmails: toStr, ccEmails: ccStr, emailBody: modalEmailBody, isEditing } = reviewModalSession;

    // 1. Save TO & CC emails automatically for future sessions
    if (toStr) localStorage.setItem('oed_saved_to_emails_v2', toStr.trim());
    if (ccStr) localStorage.setItem('oed_saved_cc_emails_v2', ccStr.trim());

    const ccListArray = ccStr.split(/[;,\n]+/).map(e => e.trim()).filter(e => e.includes('@'));

    if (isEditing && editingSessionId) {
      const existing = upcomingSessions.find((s) => s.id === editingSessionId);
      if (existing) {
        updateUpcomingSession({
          ...existing, 
          courseId: selectedCourseId, 
          courseTitle: courseTitle, 
          startDate, 
          endDate, 
          sessionNumber, 
          sessionIteration: iter,
          startTime, 
          location, 
          targetParticipants, 
          feedbackLink: feedbackLink.trim() || undefined, 
          feedbackEnabled: false,
          registrationDeadline: registrationDeadline.trim() || undefined,
          isRegistrationClosed: isRegistrationClosed,
          additionalNotificationEmails: ccListArray
        });
        alert(t("sessionUpdated"));
      }
      setEditingSessionId(null);
    } else {
      const newSession: UpcomingSession = {
        id: `session_${Date.now()}`, 
        courseId: selectedCourseId, 
        courseTitle: courseTitle, 
        startDate, 
        endDate, 
        sessionNumber, 
        sessionIteration: iter,
        startTime, 
        location, 
        targetParticipants, 
        feedbackLink: feedbackLink.trim() || undefined, 
        feedbackEnabled: false, 
        registrationDeadline: registrationDeadline.trim() || undefined,
        isRegistrationClosed: isRegistrationClosed,
        registeredUsers: [], 
        createdAt: new Date().toISOString(),
        additionalNotificationEmails: ccListArray
      };
      addUpcomingSession(newSession);

      const targetAudienceUsers = users.filter((u) => {
        if (!targetParticipants || targetParticipants === "mixed" || targetParticipants === "all") return true;
        const roleInfo = `${u.jobRole || ""} ${u.role || ""} ${u.department || ""}`.toLowerCase();
        if (targetParticipants === "engineers") return roleInfo.includes("engineer") || roleInfo.includes("مهندس") || roleInfo.includes("eng");
        if (targetParticipants === "technicians") return roleInfo.includes("technician") || roleInfo.includes("فني") || roleInfo.includes("tech");
        return true;
      });

      const validTokens = targetAudienceUsers.filter((u) => u.fcmToken).map((u) => u.fcmToken as string);
      if (validTokens.length > 0) {
        sendPushNotification(language === "ar" ? "دورة جديدة!" : "New Course!", language === "ar" ? `دورة جديدة: ${courseTitle}` : `New session: ${courseTitle}`, validTokens);
      }
      addAnnouncement({
        id: `ann_${Date.now()}`, sessionId: newSession.id, courseName: courseTitle, title: language === "ar" ? `دورة جديدة: ${courseTitle}` : `New Session: ${courseTitle}`, message: `${courseTitle} - ${startDate}`, date: new Date().toISOString(), author: "Admin", isGlobal: true, targetAudience: targetParticipants,
      });

      // --- AUTOMATIC EMAIL TRIGGER VIA OUTLOOK WITH CLEAN TO / CC LISTS AND CUSTOM BODY ---
      try {
        const cleanTo = extractCleanEmails(toStr);
        const cleanCc = extractCleanEmails(ccStr);

        const sessionOrdinal = iter ? getSessionOrdinalText(iter) : (sessionNumber ? getSessionOrdinalText(sessionNumber) : '1st Session');
        const subject = sessionOrdinal 
          ? `Course Announcement ( ${courseTitle} - ${sessionOrdinal} )`
          : `Course Announcement ( ${courseTitle} )`;

        const emailBody = modalEmailBody || customEmailBody;

        if (mode === 'eml') {
          // Generate official .eml draft file with full HTML and clickable hyperlink
          const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://oed-ttms.vercel.app';
          
          let formattedHtml = emailBody
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br/>');

          formattedHtml = formattedHtml.replace(
            /OED-TTMS Application|OED-TTMS Portal|OED-TTMS/gi, 
            `<a href="${appUrl}" style="color: #002D62; font-weight: bold; text-decoration: underline;">$&</a>`
          );

          const emlTo = cleanTo.replace(/;/g, ',');
          const emlCc = cleanCc.replace(/;/g, ',');

          const emlContent = `To: ${emlTo}
Cc: ${emlCc}
Subject: ${subject}
X-Unsent: 1
Content-Type: text/html; charset="utf-8"

<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1e293b; line-height: 1.6;">
  ${formattedHtml}
</body>
</html>`;

          const blob = new Blob([emlContent], { type: 'message/rfc822' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${courseTitle.replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_')}_Announcement.eml`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } else {
          // Standard mailto launcher
          const mailtoLink = `mailto:${encodeURIComponent(cleanTo)}?cc=${encodeURIComponent(cleanCc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
          window.location.href = mailtoLink;
        }
      } catch (mailErr) {
        console.error("Error opening mail client:", mailErr);
      }

      alert(t("sessionPublished"));
    }

    const nextSessionNum = String((parseInt(sessionNumber, 10) || 0) + 1);

    setReviewModalSession(null);
    setSelectedCourseId(""); 
    setStartDate(""); 
    setEndDate(""); 
    setSessionNumber(parseInt(nextSessionNum, 10) > 1 ? nextSessionNum : getNextGlobalSessionNumber()); 
    setSessionIteration("1");
    setLocation(DEFAULT_LOCATION); 
    setStartTime(DEFAULT_START_TIME); 
    setTargetParticipants(""); 
    setFeedbackLink("");
  };

  const handleStartEdit = (session: UpcomingSession) => {
    setSessionToEditDirectly(session);
  };

  const handleCancelEdit = () => { 
    setEditingSessionId(null); 
    setSelectedCourseId(""); 
    setStartDate(""); 
    setEndDate(""); 
    setSessionNumber(""); 
    setSessionIteration("1");
    setLocation(DEFAULT_LOCATION); 
    setStartTime(DEFAULT_START_TIME); 
    setTargetParticipants(""); 
    setFeedbackLink(""); 
    setCcEmails(localStorage.getItem('oed_saved_cc_emails_v2') || DEFAULT_CC_EMAILS);
    setToEmails(localStorage.getItem('oed_saved_to_emails_v2') || DEFAULT_TO_EMAILS);
  };

  const handleSendReminder = (sessionId: string, reminderType: "Standard" | "Final" | "Attendance" = "Standard") => {
    const session = upcomingSessions.find((s) => s.id === sessionId);
    if (!session) return;
    const now = new Date();
    const timestamp = `${formatDateToStandard(now.toISOString().split("T")[0])} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const newLogItem: ReminderLogItem = { id: `rem_${Date.now()}`, type: reminderType, timestamp };
    const updatedSession: UpcomingSession = { ...session, reminderLog: [...(session.reminderLog || []), newLogItem] };
    
    playNotificationSound();

    const formatDeadlineDisplay = (dStr?: string) => {
      if (!dStr) return '';
      try {
        const d = new Date(dStr);
        return d.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-GB', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      } catch {
        return dStr;
      }
    };

    const deadlineInfo = session.registrationDeadline 
      ? (language === 'ar' ? ` - آخر موعد للتسجيل: ${formatDeadlineDisplay(session.registrationDeadline)}` : ` - Registration Deadline: ${formatDeadlineDisplay(session.registrationDeadline)}`)
      : '';

    if (reminderType === 'Attendance') {
      sendNativePushNotification(
        language === 'ar' ? '🟢 تذكير تسجيل الحضور اليوم' : '🟢 Daily Attendance Reminder',
        {
          body: language === 'ar'
            ? `تنبيه: يرجى مسح رمز الـ QR لتسجيل حضورك في دورة [${session.courseTitle}] قبل الساعة 4:00 مساءً.`
            : `Please scan the QR code to record your attendance in [${session.courseTitle}] before 4:00 PM.`
        }
      );
      setReminderToast(language === 'ar' ? `تم إرسال تنبيه تسجيل الحضور لدورة [${session.courseTitle}] بنجاح! 🔔` : `Attendance reminder sent for [${session.courseTitle}]! 🔔`);
    } else {
      const isFinal = reminderType === 'Final';
      const alertTitle = isFinal
        ? (language === 'ar' ? `🚨 تذكير نهائي بالتسجيل: ${session.courseTitle}` : `🚨 Final Registration Reminder: ${session.courseTitle}`)
        : (language === 'ar' ? `⏰ تذكير بموعد التسجيل: ${session.courseTitle}` : `⏰ Registration Reminder: ${session.courseTitle}`);
      
      const alertMsg = isFinal
        ? (language === 'ar' 
            ? `تنبيه نهائي: سارع بالتسجيل في دورة [${session.courseTitle}] المقررة من ${session.startDate} إلى ${session.endDate}.${deadlineInfo}` 
            : `Final call to register for [${session.courseTitle}] (${session.startDate} - ${session.endDate}).${deadlineInfo}`)
        : (language === 'ar'
            ? `تذكير: فتح باب التسجيل لدورة [${session.courseTitle}] (${session.startDate} - ${session.endDate}).${deadlineInfo}`
            : `Reminder: Registration open for [${session.courseTitle}] (${session.startDate} - ${session.endDate}).${deadlineInfo}`);

      const validTokens = users.filter(u => u.fcmToken).map(u => u.fcmToken as string);
      if (validTokens.length > 0) {
        sendPushNotification(alertTitle, alertMsg, validTokens);
      }
      sendNativePushNotification(alertTitle, { body: alertMsg });

      // Save announcement to Firestore so it shows in notifications feed
      try {
        addAnnouncement({
          id: `ann_rem_${Date.now()}`,
          sessionId: session.id,
          courseName: session.courseTitle,
          title: alertTitle,
          message: alertMsg,
          date: new Date().toISOString(),
          author: 'Admin',
          isGlobal: true,
          targetAudience: session.targetParticipants
        });
      } catch (annErr) {
        console.error(annErr);
      }

      setReminderToast(alertTitle);
    }

    updateUpcomingSession(updatedSession);
    setActiveReminderDropdown(null);
    setTimeout(() => setReminderToast(null), 4500);
  };

  const handleShareResource = (e: React.FormEvent) => {
    e.preventDefault(); alert(`Shared ${resourceLink} with attendees.`); setResourceLink("");
  };

  const handleClearAllFilters = () => { 
    setSearchHrCode(""); 
    setSearchTrainee(""); 
    setSearchDepartment(""); 
    setSelectedCourseFilter(""); 
    setFromDateFilter(""); 
    setToDateFilter(""); 
    setRecords([]);
    setIsFullReportView(false);
  };

  const getAdminReportOptions = (): ReportOptions => {
    return {
      title: isSingleTraineeFiltered ? (language === "ar" ? "تقرير متدرب" : "Trainee Report") : (language === "ar" ? "تقرير شامل" : "Full Report"),
      language: (language === "ar" ? "ar" : "en") as "ar" | "en", 
      records: filteredRecords,
      singleTrainee: singleTraineeProfile ? { 
        name: singleTraineeProfile.name, 
        hrCode: singleTraineeProfile.hrCode, 
        department: singleTraineeProfile.department, 
        jobRole: singleTraineeProfile.jobRole,
        profileImageUrl: singleTraineeProfile.imageUrl,
        totalCourses: singleTraineeProfile.totalCourses,
        totalSessions: singleTraineeProfile.totalSessions,
        attendedDays: singleTraineeProfile.attendedDays,
        avgScore: singleTraineeProfile.avgScore
      } : (singleTrainee ? { name: singleTrainee.name, hrCode: singleTrainee.hrCode, department: singleTrainee.department, profileImageUrl: singleTrainee.profileImageUrl } : null),
      fileName: isSingleTraineeFiltered ? `Report_${singleTraineeProfile?.hrCode || singleTrainee?.hrCode}.pdf` : "OED_Report.pdf",
    };
  };

  const handlePrint = () => safePrintReport(getAdminReportOptions());

  const handleSyncData = async () => {
    if (!syncLink.trim()) return;
    setIsSyncing(true); setSyncProgress(0); setSyncSuccess(false);
    const progressInterval = setInterval(() => { setSyncProgress((prev) => prev >= 90 ? prev : prev + 10); }, 200);
    try {
      const data: any = await importFromOneDrive(syncLink);
      setSyncProgress(100);
      setTimeout(() => {
        setIsSyncing(false); setSyncLink(""); setSyncProgress(0); setSyncSuccess(true);
        setUsers([...users, ...data.users]); setRecords([...records, ...data.coursesAttended]);
        setTimeout(() => setSyncSuccess(false), 5000);
      }, 500);
    } catch (error) { setIsSyncing(false); alert("Error synchronizing"); } finally { clearInterval(progressInterval); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSyncFile(file);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const ab = evt.target?.result;
        const wb = XLSX.read(ab, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[];
        const maxCols = XLSX.utils.decode_range(ws["!ref"] || "A1:A1").e.c + 1;
        const newUsers: any[] = []; const newRecords: any[] = [];
        const courseRow = rows[6] || []; const coursesMap: Record<number, string> = {};
        let currentCourse = "";
        for (let c = 6; c < maxCols; c++) {
          if (courseRow[c] && typeof courseRow[c] === "string" && courseRow[c].trim() !== "") currentCourse = courseRow[c].toString().trim();
          if (currentCourse) coursesMap[c] = currentCourse;
        }
        for (let r = 13; r < rows.length; r++) {
          const row = rows[r]; if (!row) continue;
          const id = row[2]?.toString().trim(); const name = row[5]?.toString().trim();
          if (!id || !name) continue;
          if (!newUsers.find((u) => u.id === id) && !users.find((u) => u.id === id)) {
            newUsers.push({ id, name, department: row[4]?.toString().trim() || "General", jobRole: row[3]?.toString().trim() || "", phone: "0100", role: "trainee", status: "approved", hrCode: `HR${id}` });
          }
          for (let c = 6; c < maxCols; c += 4) {
            const dateVal = row[c];
            if (dateVal) {
              const scoreVal = row[c + 3] || 0;
              let formattedDate = new Date().toISOString().split("T")[0];
              if (dateVal instanceof Date) formattedDate = dateVal.toISOString().split("T")[0];
              else if (typeof dateVal === "string") formattedDate = dateVal;
              else if (typeof dateVal === "number") formattedDate = new Date(Math.round((dateVal - 25569) * 86400 * 1000)).toISOString().split("T")[0];
              let formattedScore = typeof scoreVal === "number" ? `${Math.round(scoreVal * 100)}%` : scoreVal.toString();
              const courseName = coursesMap[c] || "Unknown Course";
              const courseId = mockCourses.find((mc) => mc.title.toLowerCase().includes(courseName.toLowerCase()))?.id || `course_${c}`;
              const isDuplicate = records.some(rec => rec.userId === id && rec.courseName === courseName && rec.attendanceDate === formattedDate) || newRecords.some(rec => rec.userId === id && rec.courseName === courseName && rec.attendanceDate === formattedDate);
              if (!isDuplicate) {
                newRecords.push({ id: `rec_${Date.now()}_${r}_${c}`, userId: id, hrCode: `HR${id}`, traineeName: name, department: row[4]?.toString().trim() || "General", courseId: courseId, courseName: courseName, attendanceDate: formattedDate, score: formattedScore });
              }
            }
          }
        }
        // Auto-calculate and cache global KPIs directly from Excel file without Firestore reads
        const uniqueCourses = Array.from(new Set(Object.values(coursesMap).map(s => (s || '').trim()).filter(Boolean)));
        const sessionsSet = new Set<string>();
        let engCount = 0, techCount = 0, opCount = 0;
        newRecords.forEach(rec => {
          if (rec.courseName && rec.attendanceDate) sessionsSet.add(`${rec.courseName}-${rec.attendanceDate}`);
          const u = newUsers.find(nu => nu.id === rec.userId) || users.find(eu => eu.id === rec.userId);
          const roleStr = `${u?.jobRole || ''} ${u?.department || ''} ${rec.department || ''}`.toLowerCase();
          if (roleStr.includes('eng') || roleStr.includes('مهندس')) engCount++;
          if (roleStr.includes('tech') || roleStr.includes('فني')) techCount++;
          if (roleStr.includes('op') || roleStr.includes('مشغل')) opCount++;
        });

        let computedKPIs = {
          totalCourses: uniqueCourses.length || 21,
          totalSessions: sessionsSet.size || 124,
          totalParticipants: newRecords.length || 984,
          totalEngineers: engCount || 765,
          totalTechnicians: techCount || 117,
          totalOperators: opCount || 102
        };

        // Check if official 'Analytics Dashboard' sheet exists and extract exact values
        const dashboardSheet = wb.Sheets["Analytics Dashboard"] || (wb.SheetNames.length > 1 ? wb.Sheets[wb.SheetNames[1]] : null);
        if (dashboardSheet) {
          try {
            const dashRows = XLSX.utils.sheet_to_json(dashboardSheet, { header: 1 }) as any[];
            dashRows.forEach((dRow: any) => {
              if (Array.isArray(dRow)) {
                for (let i = 0; i < dRow.length; i++) {
                  const cellVal = String(dRow[i] || '').toLowerCase().trim();
                  const nextVal = parseInt(String(dRow[i + 1] || '').replace(/[^0-9]/g, ''), 10);
                  if (!isNaN(nextVal)) {
                    if (cellVal.includes('total courses')) computedKPIs.totalCourses = nextVal;
                    if (cellVal.includes('total sessions')) computedKPIs.totalSessions = nextVal;
                    if (cellVal.includes('total participants')) computedKPIs.totalParticipants = nextVal;
                    if (cellVal.includes('total engineers')) computedKPIs.totalEngineers = nextVal;
                    if (cellVal.includes('total technicians')) computedKPIs.totalTechnicians = nextVal;
                    if (cellVal.includes('total operators')) computedKPIs.totalOperators = nextVal;
                  }
                }
              }
            });
          } catch (e) {
            console.warn("Could not parse Analytics Dashboard sheet:", e);
          }
        }

        localStorage.setItem('oed_cached_global_kpis', JSON.stringify(computedKPIs));
        try {
          await setDoc(doc(db, "systemSettings", "globalKPIs"), computedKPIs, { merge: true });
        } catch (e) {}

        setUsers((prev) => [...prev, ...newUsers.filter((nu) => !prev.some((u) => u.id === nu.id))]);
        setRecords((prev) => [...prev, ...newRecords]);
        setSyncSuccess(true); setTimeout(() => setSyncSuccess(false), 5000);
      } catch (err) { alert(language === "ar" ? "فشل قراءة الملف" : "Failed to parse file."); }
    };
    reader.readAsArrayBuffer(file);
  };

  const hasActiveFilters = Boolean((searchHrCode && searchHrCode.trim()) || (searchTrainee && searchTrainee.trim()) || searchDepartment || selectedCourseFilter || fromDateFilter || toDateFilter);

  const filteredRecords = useMemo(() => {
    if (!hasActiveFilters && !isFullReportView) return [];
    return records.filter((r) => {
      const user = users.find((u) => u.id === r.userId || u.hrCode === r.userId || u.hrCode === `HR${r.userId}` || u.name?.toLowerCase() === r.userId?.toLowerCase());
      if (searchHrCode && searchHrCode.trim()) {
        const q = searchHrCode.trim().toLowerCase();
        const hr = (user?.hrCode || r.hrCode || r.userId || "").toLowerCase();
        if (!hr.includes(q)) return false;
      }
      if (searchTrainee && searchTrainee.trim()) {
        const q = searchTrainee.trim().toLowerCase();
        const rawName = (user?.name || r.name || r.raw?.["Trainee Name"] || r.raw?.["Name"] || r.userId || "").toLowerCase();
        if (!rawName.includes(q)) return false;
      }
      if (searchDepartment) {
        const dept = user?.department || r.department || r.raw?.["Department"];
        if (dept !== searchDepartment) return false;
      }
      if (selectedCourseFilter) {
        const filterCourseObj = dynamicCourses.find(c => c.id === selectedCourseFilter || c.title === selectedCourseFilter);
        const targetTitle = (filterCourseObj?.title || selectedCourseFilter).trim().toLowerCase();
        const targetId = (filterCourseObj?.id || selectedCourseFilter).trim().toLowerCase();
        const rName = (r.courseName || '').trim().toLowerCase();
        const rId = (r.courseId || '').trim().toLowerCase();
        
        const isMatch = rName === targetTitle || 
                        rId === targetTitle || 
                        rId === targetId ||
                        r.courseId === selectedCourseFilter || 
                        r.courseName === selectedCourseFilter ||
                        (targetTitle && rName && (rName.includes(targetTitle) || targetTitle.includes(rName)));
        if (!isMatch) return false;
      }
      if (fromDateFilter || toDateFilter) {
        const recordDateStr = r.attendanceDate || r.date || r.raw?.["Date"] || r.raw?.["Attendance Date"];
        if (!recordDateStr) return false;
        const recordDate = new Date(recordDateStr).getTime();
        if (isNaN(recordDate)) return false;
        if (fromDateFilter && recordDate < new Date(fromDateFilter).getTime()) return false;
        if (toDateFilter) {
          const toDate = new Date(toDateFilter); toDate.setHours(23, 59, 59, 999);
          if (recordDate > toDate.getTime()) return false;
        }
      }
      return true;
    });
  }, [hasActiveFilters, isFullReportView, records, users, searchHrCode, searchTrainee, searchDepartment, selectedCourseFilter, fromDateFilter, toDateFilter]);

  const kpiStats = useMemo(() => {
    if (filteredRecords.length === 0 && !hasActiveFilters && !isFullReportView) {
      return {
        totalCourses: globalKPIs.totalCourses || courses.length,
        totalSessions: globalKPIs.totalSessions || upcomingSessions.length,
        totalParticipants: globalKPIs.totalParticipants,
        totalEngineers: globalKPIs.totalEngineers,
        totalTechnicians: globalKPIs.totalTechnicians,
        totalOperators: globalKPIs.totalOperators
      };
    }
    const coursesSet = new Set<string>(); const sessionsSet = new Set<string>();
    let eng = 0, tech = 0, op = 0;
    filteredRecords.forEach((r) => {
      const u = users.find((u) => u.id === r.userId || u.hrCode === r.userId || u.hrCode === `HR${r.userId}`);
      coursesSet.add(r.courseName || r.courseId); sessionsSet.add(`${r.courseName || r.courseId}-${r.attendanceDate}`);
      const roleStr = `${u?.jobRole || ''} ${r.role || ''} ${r.courseName || ''}`.toLowerCase();
      if (/\b(operator|operators|مشغل|مشغلين|سائق|سائقين)\b/i.test(roleStr)) {
        op++;
      } else if (/\b(technician|technicians|فني|فنيين)\b/i.test(roleStr)) {
        tech++;
      } else {
        eng++;
      }
    });
    return { 
      totalCourses: coursesSet.size, 
      totalSessions: sessionsSet.size, 
      totalParticipants: filteredRecords.length, 
      totalEngineers: eng, 
      totalTechnicians: tech, 
      totalOperators: op 
    };
  }, [filteredRecords, users, globalKPIs, hasActiveFilters, isFullReportView, courses.length, upcomingSessions.length]);

  const uniqueTraineeHrCodes = useMemo(() => {
    return Array.from(
      new Set(
        filteredRecords.map((r) => {
          const u = users.find((u) => u.id === r.userId || u.hrCode === r.hrCode || u.hrCode === r.userId || u.hrCode === `HR${r.userId}`);
          return u?.hrCode || r.hrCode || r.userId;
        }).filter(Boolean)
      )
    );
  }, [filteredRecords, users]);

  const isSingleTraineeFiltered = Boolean(
    (searchHrCode.trim() && filteredRecords.length > 0) || 
    (uniqueTraineeHrCodes.length === 1 && filteredRecords.length > 0)
  );

  const singleTraineeProfile = useMemo(() => {
    if (!isSingleTraineeFiltered || filteredRecords.length === 0) return null;
    const firstRec = filteredRecords[0];
    const targetHr = uniqueTraineeHrCodes[0] || searchHrCode.trim() || firstRec.hrCode || firstRec.userId;
    const u = users.find(u => 
      u.hrCode?.toLowerCase() === targetHr?.toLowerCase() || 
      u.id?.toLowerCase() === targetHr?.toLowerCase() ||
      `HR${u.hrCode}`.toLowerCase() === targetHr?.toLowerCase() ||
      u.name?.toLowerCase() === (firstRec.traineeName || '').toLowerCase()
    );

    const name = u?.name || firstRec.traineeName || targetHr;
    const hrCode = u?.hrCode || firstRec.hrCode || targetHr;
    const imageUrl = u?.profileImageUrl || firstRec.raw?.["Profile Image"] || firstRec.raw?.["Photo"];
    const department = u?.department || firstRec.department || "Equipment Department";
    const jobRole = u?.jobRole || u?.role || firstRec.role || (language === 'ar' ? 'مهندس معدات' : 'Equipment Engineer');

    // Total Unique Courses
    const uniqueCourses = new Set(filteredRecords.map(r => r.courseName || r.courseId)).size;

    // Attended Days sum
    const attendedDays = filteredRecords.reduce((acc, r) => {
      const days = parseInt(r.raw?.["Attended Days"] || r.daysAttended || r.raw?.["Course Duration"] || '1', 10);
      return acc + (isNaN(days) ? 1 : days);
    }, 0);

    // Average Score
    const validScores: number[] = [];
    filteredRecords.forEach(r => {
      const rawScore = r.raw?.["Score"] || r.score;
      if (rawScore !== undefined && rawScore !== null && rawScore !== '') {
        const parsed = parseFloat(String(rawScore).replace('%', '').trim());
        if (!isNaN(parsed)) validScores.push(parsed);
      }
    });

    const avgScore = validScores.length > 0 
      ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) 
      : null;

    return {
      name,
      hrCode,
      imageUrl,
      department,
      jobRole,
      totalCourses: uniqueCourses,
      totalSessions: filteredRecords.length,
      attendedDays,
      avgScore
    };
  }, [isSingleTraineeFiltered, filteredRecords, uniqueTraineeHrCodes, searchHrCode, users, language]);

  const singleTrainee = isSingleTraineeFiltered ? users.find((u) => u.hrCode === uniqueTraineeHrCodes[0]) : null;
  const selectedCourseDetails = selectedCourseFilter ? (dynamicCourses.find((c) => c.id === selectedCourseFilter || c.title === selectedCourseFilter) || { id: selectedCourseFilter, title: selectedCourseFilter }) : null;
  const courseSessions: string[] = selectedCourseDetails ? Array.from(new Set(filteredRecords.map((r) => r.attendanceDate || r.date || r.raw?.['Date'] || r.raw?.['Attendance Date'] || 'N/A'))).filter(Boolean) : [];

  // Admin Automated Attendance Reminder: ONLY sessions actively running right now (Course Date + Start Time until 4:00 PM)
  const [dismissedLiveBannerSessionIds, setDismissedLiveBannerSessionIds] = useState<string[]>(() => {
    try {
      const stored = sessionStorage.getItem('oed_dismissed_admin_live_banners');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const handleDismissLiveBanner = (sessionId: string) => {
    const updated = [...dismissedLiveBannerSessionIds, sessionId];
    setDismissedLiveBannerSessionIds(updated);
    try {
      sessionStorage.setItem('oed_dismissed_admin_live_banners', JSON.stringify(updated));
    } catch {}
  };

  const adminActiveTodaySessions = useMemo(() => {
    return (upcomingSessions || []).filter(s => isSessionActiveNow(s));
  }, [upcomingSessions]);

  // Trigger Native Push Notification on Admin Device
  useEffect(() => {
    if (adminActiveTodaySessions.length > 0) {
      const activeSession = adminActiveTodaySessions[0];
      const notifiedKey = `admin_notif_${activeSession.id}_${new Date().toISOString().split('T')[0]}`;
      if (!sessionStorage.getItem(notifiedKey)) {
        sessionStorage.setItem(notifiedKey, 'true');
        sendNativePushNotification(
          language === 'ar' ? '🔔 تذكير بدء الدورة والتحضير' : '🔔 Session Attendance Reminder',
          {
            body: language === 'ar'
              ? `بدأت الآن دورة [${activeSession.courseTitle}]. يرجى فتح رمز الـ QR وعرضه على الشاشة للمتدربين.`
              : `Session [${activeSession.courseTitle}] is live! Open QR code to project for trainees.`,
            tag: notifiedKey
          }
        );
      }
    }
  }, [adminActiveTodaySessions, language]);

  return (
    <div className="min-h-screen pb-12 transition-colors duration-300" style={{ backgroundColor: bgColor }}>
      <div className="max-w-7xl mx-auto px-4 py-8 print:p-0">
        
        {/* --- ADMIN LIVE ATTENDANCE BANNER (Until 4:00 PM) --- */}
        {adminActiveTodaySessions.length > 0 && !dismissedLiveBannerSessionIds.includes(adminActiveTodaySessions[0].id) && (
          <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#002D62] via-blue-900 to-[#104080] text-white shadow-xl border-2 border-[#FFC000] animate-fade-in print:hidden relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
              <div className="p-3 rounded-2xl bg-[#FFC000] text-[#002D62] font-black shrink-0 shadow-md">
                <QrCode size={26} />
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center text-[11px] font-black uppercase tracking-wider bg-yellow-400/20 text-[#FFC000] px-2.5 py-0.5 rounded-full border border-[#FFC000]/40">
                    🔔 {language === 'ar' ? 'تذكير المحاضر والأدمن (جلسة اليوم)' : 'Instructor & Admin Attendance Reminder'}
                  </span>
                  {/* Close button on mobile top right */}
                  <button
                    type="button"
                    onClick={() => handleDismissLiveBanner(adminActiveTodaySessions[0].id)}
                    className="md:hidden text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-xl transition-colors cursor-pointer shrink-0"
                    title={language === 'ar' ? 'إغلاق التنبيه' : 'Dismiss'}
                  >
                    <X size={18} />
                  </button>
                </div>

                <h3 className="text-base sm:text-lg font-black text-white leading-snug break-words">
                  {adminActiveTodaySessions[0].courseTitle}
                </h3>
                <p className="text-xs text-blue-200 font-semibold leading-relaxed">
                  {language === 'ar' ? 'حان موعد بدء الدورة! افتح رمز الـ QR لعرضه على شاشة القاعة للمتدربين (متاح حتى 4:00 م)' : 'Session is live! Open QR code to project on hall screen for trainees (Active until 4:00 PM)'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-blue-800">
              <button
                type="button"
                onClick={() => setQrSession(adminActiveTodaySessions[0])}
                className="w-full md:w-auto px-5 py-3 bg-[#FFC000] hover:bg-yellow-400 text-[#002D62] font-black text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
              >
                <QrCode size={18} />
                <span>{language === 'ar' ? '📱 عرض كود الـ QR على الشاشة' : '📱 Project QR Code on Screen'}</span>
              </button>

              {/* Close button on desktop */}
              <button
                type="button"
                onClick={() => handleDismissLiveBanner(adminActiveTodaySessions[0].id)}
                className="hidden md:inline-flex text-white/70 hover:text-white hover:bg-white/10 p-2.5 rounded-xl transition-colors cursor-pointer"
                title={language === 'ar' ? 'إغلاق التنبيه' : 'Dismiss'}
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        {/* شريط الترحيب على الموبايل وزرار الطباعة والشريط الذهبي */}
        <div className="flex w-full justify-end items-center border-b-2 border-[#FFC000] pb-3 mb-6 print:hidden gap-3">
          <div className="md:hidden flex items-center gap-1.5 ml-auto rtl:ml-0 rtl:mr-auto">
            <p className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 text-right">
              {language === 'ar' ? '👋 أهلاً بك، ' : '👋 Welcome, '}
              <span className="text-[#002D62] dark:text-[#FFC000] font-black">{user?.name?.split(' ')[0]}</span>
            </p>
          </div>

          {user?.role === 'admin' || user?.role === 'supervisor' ? (
            <button 
              onClick={handlePrint} 
              className="flex items-center gap-1.5 text-white px-4 py-2 rounded-xl transition-all shadow-sm text-sm font-bold hover:opacity-90 active:scale-95 cursor-pointer shrink-0"
              style={{ backgroundColor: isDark ? '#2563eb' : '#002D62' }}
            >
              <Printer size={18} />
              <span>{language === "ar" ? "طباعة التقرير" : "Print"}</span>
            </button>
          ) : null}
        </div>

        {/* Content Area */}
        <div className="p-6 rounded-lg shadow-sm border min-h-[400px] transition-colors duration-300" style={{ backgroundColor: cardColor, borderColor: borderColor }}>
          
          {/* USER MANAGEMENT TAB */}
          {currentView === "userManagement" && (
            <div className="space-y-12">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-64 shrink-0 flex flex-col space-y-2 border-b md:border-b-0 md:border-r rtl:border-r-0 rtl:border-l pb-4 md:pb-0 md:pr-4 rtl:md:pl-4" style={{ borderColor: borderColor }}>
                  {/* قسم حسابات المستخدمين */}
                  <button onClick={() => setUserManagementTab('pending')} className={`text-left rtl:text-right px-4 py-3 rounded-lg font-medium transition-colors flex justify-between items-center ${userManagementTab === 'pending' ? 'bg-[#002D62] text-white dark:bg-blue-600' : 'hover:bg-gray-100 dark:hover:bg-slate-800'}`} style={{ color: userManagementTab === 'pending' ? '#fff' : textMuted }}>
                    <span>{language === "ar" ? "طلبات معلقة" : "Pending Users"}</span>
                    {pendingUsers.length > 0 && <span className="bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded-full">{pendingUsers.length}</span>}
                  </button>
                  <button onClick={() => setUserManagementTab('processed')} className={`text-left rtl:text-right px-4 py-3 rounded-lg font-medium transition-colors ${userManagementTab === 'processed' ? 'bg-[#002D62] text-white dark:bg-blue-600' : 'hover:bg-gray-100 dark:hover:bg-slate-800'}`} style={{ color: userManagementTab === 'processed' ? '#fff' : textMuted }}>
                    {language === "ar" ? "طلبات مراجعة" : "Processed Requests"}
                  </button>
                  <button onClick={() => setUserManagementTab('deleted')} className={`text-left rtl:text-right px-4 py-3 rounded-lg font-medium transition-colors ${userManagementTab === 'deleted' ? 'bg-[#002D62] text-white dark:bg-blue-600' : 'hover:bg-gray-100 dark:hover:bg-slate-800'}`} style={{ color: userManagementTab === 'deleted' ? '#fff' : textMuted }}>
                    {language === "ar" ? "متدربين محذوفين" : "Deleted Trainees"}
                  </button>

                  <div className="my-2 border-t" style={{ borderColor: borderColor }} />

                  {/* قسم تعديلات البيانات */}
                  <button onClick={() => setUserManagementTab('updates')} className={`text-left rtl:text-right px-4 py-3 rounded-lg font-medium transition-colors flex justify-between items-center ${userManagementTab === 'updates' ? 'bg-[#002D62] text-white dark:bg-blue-600' : 'hover:bg-gray-100 dark:hover:bg-slate-800'}`} style={{ color: userManagementTab === 'updates' ? '#fff' : textMuted }}>
                    <span>{language === "ar" ? "تعديل البيانات" : "Data Updates"}</span>
                    {usersWithPendingUpdates.length > 0 && <span className="bg-orange-500 text-white text-xs font-black px-2 py-0.5 rounded-full">{usersWithPendingUpdates.length}</span>}
                  </button>
                  <button onClick={() => setUserManagementTab('processed_updates')} className={`text-left rtl:text-right px-4 py-3 rounded-lg font-medium transition-colors flex justify-between items-center ${userManagementTab === 'processed_updates' ? 'bg-[#002D62] text-white dark:bg-blue-600' : 'hover:bg-gray-100 dark:hover:bg-slate-800'}`} style={{ color: userManagementTab === 'processed_updates' ? '#fff' : textMuted }}>
                    <span>{language === "ar" ? "سجل التعديلات" : "Processed Updates"}</span>
                  </button>
                </div>
                <div className="flex-1 overflow-x-auto">
                  
                  {/* Search Bar for Users */}
                  <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[260px] max-w-md">
                      <Search size={16} className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        placeholder={language === 'ar' ? 'البحث بالاسم أو الكود الوظيفي أو الإيميل...' : 'Search by name, HR Code, or email...'}
                        className="w-full pl-9 rtl:pl-3 rtl:pr-9 pr-8 py-2 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-[#002D62] outline-none shadow-2xs transition-all"
                        style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }}
                      />
                      {userSearchTerm && (
                        <button
                          onClick={() => setUserSearchTerm("")}
                          className="absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    {userSearchTerm && (
                      <div className="text-xs font-semibold px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {language === 'ar' ? `نتائج البحث: "${userSearchTerm}"` : `Filtered by: "${userSearchTerm}"`}
                      </div>
                    )}
                  </div>
                  
                  {userManagementTab === 'pending' && (
                    <div>
                      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                        <div className="flex items-center gap-2.5">
                          <h2 className="text-xl font-bold" style={{ color: textColor }}>{language === "ar" ? "طلبات معلقة" : "Pending Users"}</h2>
                          <span className="bg-red-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full shadow-xs">
                            {pendingUsers.length}
                          </span>
                        </div>
                        <button
                          onClick={() => setPendingSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                          className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl border transition-all cursor-pointer shadow-2xs hover:scale-105"
                          style={{
                            backgroundColor: inputBg,
                            borderColor: borderColor,
                            color: textColor
                          }}
                          title={language === 'ar' ? 'تغيير اتجاه الترتيب' : 'Toggle Sort Order'}
                        >
                          <ArrowUpDown size={14} className="text-[#FFC000]" />
                          <span>
                            {pendingSortOrder === 'desc' 
                              ? (language === 'ar' ? 'الترتيب: من الأحدث للأقدم ⬇' : 'Sort: Newest First ⬇') 
                              : (language === 'ar' ? 'الترتيب: من الأقدم للأحدث ⬆' : 'Sort: Oldest First ⬆')}
                          </span>
                        </button>
                      </div>

                      {pendingUsers
                        .filter(u => {
                          if (!userSearchTerm.trim()) return true;
                          const term = userSearchTerm.trim().toLowerCase();
                          return (u.name || '').toLowerCase().includes(term) || (u.hrCode || '').toLowerCase().includes(term) || (u.email || '').toLowerCase().includes(term) || (u.department || '').toLowerCase().includes(term) || (u.phone || '').includes(term);
                        })
                        .sort((a, b) => {
                          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                          return pendingSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
                        })
                        .length > 0 ? (
                        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b font-bold" style={{ backgroundColor: tableHeaderBg, borderColor: borderColor, color: '#FFFFFF' }}>
                              <th className="p-3 text-white font-bold tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "الكود الوظيفي" : "HR Code"}</th>
                              <th className="p-3 text-white font-bold tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "الاسم" : "Name"}</th>
                              <th className="p-3 text-white font-bold tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "القسم" : "Department"}</th>
                              <th className="p-3 text-white font-bold tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "الصلاحية" : "Role"}</th>
                              <th className="p-3 text-white font-bold tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "التاريخ" : "Date"}</th>
                              <th className="p-3 align-top text-white font-bold tracking-wide" style={{ color: '#FFFFFF' }}><div className="font-semibold mb-2">{language === "ar" ? "إجراءات" : "Actions"}</div></th>
                            </tr>
                          </thead>
                          <tbody>
                            {pendingUsers
                              .filter(u => {
                                if (!userSearchTerm.trim()) return true;
                                const term = userSearchTerm.trim().toLowerCase();
                                return (u.name || '').toLowerCase().includes(term) || (u.hrCode || '').toLowerCase().includes(term) || (u.email || '').toLowerCase().includes(term) || (u.department || '').toLowerCase().includes(term) || (u.phone || '').includes(term);
                              })
                              .sort((a, b) => {
                                const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                                const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                                return pendingSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
                              })
                              .map((u) => (
                              <tr key={u.id} className="border-b transition-colors" style={{ borderColor: borderColor, color: textColor }}>
                                {editingUserId === u.id ? (
                                  <>
                                    <td className="p-3"><input type="text" value={editFormData.hrCode || ""} onChange={(e) => setEditFormData({ ...editFormData, hrCode: e.target.value })} className="border rounded px-2 py-1 w-24" style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }} /></td>
                                    <td className="p-3"><input type="text" value={editFormData.name || ""} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} className="border rounded px-2 py-1 w-32" style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }} /></td>
                                    <td className="p-3"><input type="text" value={editFormData.department || ""} onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })} className="border rounded px-2 py-1 w-32" style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }} /></td>
                                    <td className="p-3"><select value={editFormData.role || "trainee"} onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as Role })} className="border rounded px-2 py-1 font-bold" style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }}><option value="trainee">{language === 'ar' ? 'متدرب (Trainee)' : 'Trainee'}</option><option value="supervisor">{language === 'ar' ? 'مشرف (Supervisor)' : 'Supervisor'}</option><option value="manager">{language === 'ar' ? 'مدير (Manager)' : 'Manager'}</option><option value="admin">{language === 'ar' ? 'مسؤول (Admin)' : 'Admin'}</option></select></td>
                                    <td className="p-3"><DataField>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "N/A"}</DataField></td>
                                    <td className="p-3 flex gap-2">
                                      <button onClick={() => handleSaveUserEdit(u.id)} className="text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded font-bold">Save</button>
                                      <button onClick={() => setEditingUserId(null)} className="text-gray-600 bg-gray-50 dark:text-gray-300 dark:bg-gray-800 px-3 py-1 rounded">Cancel</button>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="p-3"><DataField>{u.hrCode}</DataField></td>
                                    <td className="p-3"><UserAvatarWithName user={u} /></td>
                                    <td className="p-3"><DataField>{u.department}</DataField></td>
                                    <td className="p-3 whitespace-nowrap">
                                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-flex items-center gap-1.5 ${
                                        u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-300 dark:border-purple-700' :
                                        u.role === 'manager' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700' :
                                        u.role === 'supervisor' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700' :
                                        'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                                      }`}>
                                        <span>{u.role === 'admin' ? '🛡️ Admin' : u.role === 'manager' ? '👔 Manager' : u.role === 'supervisor' ? '👷 Supervisor' : '🎓 Trainee'}</span>
                                      </span>
                                    </td>
                                    <td className="p-3"><DataField>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "N/A"}</DataField></td>
                                    <td className="p-3 flex gap-2">
                                      <button onClick={() => handleApprove(u.id)} className="flex items-center text-green-600 bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded hover:opacity-80 font-bold">{language === "ar" ? "موافق" : "Approve"}</button>
                                      <button onClick={() => setSelectedUserToEdit(u)} className="flex items-center text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded hover:opacity-80 font-bold">{language === "ar" ? "تعديل" : "Edit"}</button>
                                      <button onClick={() => handleReject(u.id)} className="flex items-center text-red-600 bg-red-50 dark:bg-red-900/30 px-3 py-1 rounded hover:opacity-80 font-bold">{language === "ar" ? "رفض" : "Reject"}</button>
                                    </td>
                                  </>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                      ) : (
                        <p style={{ color: textMuted }}>{language === "ar" ? "لا توجد طلبات معلقة." : "No pending users."}</p>
                      )}
                    </div>
                  )}
                  
                  {/* --- UPDATES TAB --- */}
                  {userManagementTab === 'updates' && (
                    <div>
                      <h2 className="text-xl font-semibold mb-4" style={{ color: textColor }}>{language === "ar" ? "طلبات تعديل البيانات" : "Pending Data Updates"}</h2>
                      {usersWithPendingUpdates.filter(u => {
                        if (!userSearchTerm.trim()) return true;
                        const term = userSearchTerm.trim().toLowerCase();
                        return (u.name || '').toLowerCase().includes(term) || (u.hrCode || '').toLowerCase().includes(term) || (u.email || '').toLowerCase().includes(term);
                      }).length > 0 ? (
                        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b font-bold" style={{ backgroundColor: tableHeaderBg, borderColor: borderColor, color: '#FFFFFF' }}>
                              <th className="p-3 text-white font-bold tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "الاسم" : "Name"}</th>
                              <th className="p-3 text-white font-bold tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "التعديل المطلوب" : "Requested Change"}</th>
                              <th className="p-3 text-white font-bold tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "وقت الطلب" : "Requested At"}</th>
                              <th className="p-3 align-top text-white font-bold tracking-wide" style={{ color: '#FFFFFF' }}><div className="font-semibold mb-2">{language === "ar" ? "إجراءات" : "Actions"}</div></th>
                            </tr>
                          </thead>
                          <tbody>
                            {usersWithPendingUpdates.filter(u => {
                              if (!userSearchTerm.trim()) return true;
                              const term = userSearchTerm.trim().toLowerCase();
                              return (u.name || '').toLowerCase().includes(term) || (u.hrCode || '').toLowerCase().includes(term) || (u.email || '').toLowerCase().includes(term);
                            }).map((u) => (
                              <tr key={u.id} className="border-b transition-colors" style={{ borderColor: borderColor, color: textColor }}>
                                <td className="p-3"><UserAvatarWithName user={u} /></td>
                                <td className="p-3">
                                  {editingUpdateUserId === u.id ? (
                                    <div className="space-y-2">
                                      {u.pendingUpdates?.name && (
                                        <div>
                                          <span className="text-xs text-gray-500 block">{language === "ar" ? "الاسم:" : "Name:"}</span>
                                          <input 
                                            type="text" 
                                            value={updateEditFormData.name !== undefined ? updateEditFormData.name : (u.pendingUpdates.name || "")} 
                                            onChange={(e) => setUpdateEditFormData({ ...updateEditFormData, name: e.target.value })} 
                                            className="border rounded px-2 py-1 w-full mt-1 text-sm focus:ring-[#002D62] outline-none font-bold" 
                                            style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }} 
                                          />
                                        </div>
                                      )}
                                      {u.pendingUpdates?.department && (
                                        <div>
                                          <span className="text-xs text-gray-500 block">{language === "ar" ? "الإدارة:" : "Department:"}</span>
                                          <input 
                                            type="text" 
                                            value={updateEditFormData.department !== undefined ? updateEditFormData.department : (u.pendingUpdates.department || "")} 
                                            onChange={(e) => setUpdateEditFormData({ ...updateEditFormData, department: e.target.value })} 
                                            className="border rounded px-2 py-1 w-full mt-1 text-sm focus:ring-[#002D62] outline-none" 
                                            style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }} 
                                          />
                                        </div>
                                      )}
                                      {u.pendingUpdates?.phone && (
                                        <div>
                                          <span className="text-xs text-gray-500 block">{language === "ar" ? "الهاتف:" : "Phone:"}</span>
                                          <input 
                                            type="text" 
                                            value={updateEditFormData.phone !== undefined ? updateEditFormData.phone : (u.pendingUpdates.phone || "")} 
                                            onChange={(e) => setUpdateEditFormData({ ...updateEditFormData, phone: e.target.value })} 
                                            className="border rounded px-2 py-1 w-full mt-1 text-sm focus:ring-[#002D62] outline-none" 
                                            style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }} 
                                          />
                                        </div>
                                      )}
                                      {u.pendingUpdates?.hrCode && (
                                        <div>
                                          <span className="text-xs text-gray-500 block">{language === "ar" ? "الكود الوظيفي:" : "HR Code:"}</span>
                                          <input 
                                            type="text" 
                                            value={updateEditFormData.hrCode !== undefined ? updateEditFormData.hrCode : (u.pendingUpdates.hrCode || "")} 
                                            onChange={(e) => setUpdateEditFormData({ ...updateEditFormData, hrCode: e.target.value })} 
                                            className="border rounded px-2 py-1 w-full mt-1 text-sm focus:ring-[#002D62] outline-none font-mono" 
                                            style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }} 
                                          />
                                        </div>
                                      )}
                                      {u.pendingUpdates?.email && (
                                        <div>
                                          <span className="text-xs text-gray-500 block">{language === "ar" ? "الإيميل:" : "Email:"}</span>
                                          <input 
                                            type="email" 
                                            value={updateEditFormData.email !== undefined ? updateEditFormData.email : (u.pendingUpdates.email || "")} 
                                            onChange={(e) => setUpdateEditFormData({ ...updateEditFormData, email: e.target.value })} 
                                            className="border rounded px-2 py-1 w-full mt-1 text-sm focus:ring-[#002D62] outline-none font-mono" 
                                            style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }} 
                                            dir="ltr"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      {u.pendingUpdates?.name && (
                                        <div>
                                          <span className="text-xs text-gray-500 block">{language === "ar" ? "الاسم:" : "Name:"}</span>
                                          <span className="line-through text-red-500 mr-2 rtl:ml-2 rtl:mr-0">{u.name}</span>
                                          <span className="font-bold text-green-600">➔ {u.pendingUpdates.name}</span>
                                        </div>
                                      )}
                                      {u.pendingUpdates?.department && (
                                        <div>
                                          <span className="text-xs text-gray-500 block">{language === "ar" ? "الإدارة:" : "Department:"}</span>
                                          <span className="line-through text-red-500 mr-2 rtl:ml-2 rtl:mr-0">{u.department || 'N/A'}</span>
                                          <span className="font-bold text-green-600">➔ {u.pendingUpdates.department}</span>
                                        </div>
                                      )}
                                      {u.pendingUpdates?.phone && (
                                        <div>
                                          <span className="text-xs text-gray-500 block">{language === "ar" ? "الهاتف:" : "Phone:"}</span>
                                          <span className="line-through text-red-500 mr-2 rtl:ml-2 rtl:mr-0">{u.phone || 'N/A'}</span>
                                          <span className="font-bold text-green-600">➔ {u.pendingUpdates.phone}</span>
                                        </div>
                                      )}
                                      {u.pendingUpdates?.hrCode && (
                                        <div>
                                          <span className="text-xs text-gray-500 block">{language === "ar" ? "الكود الوظيفي:" : "HR Code:"}</span>
                                          <span className="line-through text-red-500 mr-2 rtl:ml-2 rtl:mr-0">{u.hrCode}</span>
                                          <span className="font-bold text-green-600 font-mono">➔ {u.pendingUpdates.hrCode}</span>
                                        </div>
                                      )}
                                      {u.pendingUpdates?.email && (
                                        <div>
                                          <span className="text-xs text-gray-500 block">{language === "ar" ? "الإيميل:" : "Email:"}</span>
                                          <span className="line-through text-red-500 mr-2 rtl:ml-2 rtl:mr-0">{u.email || 'N/A'}</span>
                                          <span className="font-bold text-green-600 font-mono">➔ {u.pendingUpdates.email}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="p-3 text-sm" style={{ color: textMuted }}>
                                  {u.pendingUpdates?.requestedAt ? new Date(u.pendingUpdates.requestedAt).toLocaleString() : 'N/A'}
                                </td>
                                <td className="p-3 flex flex-wrap gap-2">
                                  {editingUpdateUserId === u.id ? (
                                    <>
                                      <button onClick={() => handleSaveUpdateEdit(u)} className="flex items-center text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded hover:opacity-80 font-bold">
                                        <Save size={16} className="mr-1 rtl:ml-1 rtl:mr-0" /> {language === "ar" ? "حفظ" : "Save"}
                                      </button>
                                      <button onClick={() => setEditingUpdateUserId(null)} className="flex items-center text-gray-600 bg-gray-50 dark:text-gray-300 dark:bg-gray-800 px-3 py-1 rounded hover:opacity-80">
                                        <X size={16} className="mr-1 rtl:ml-1 rtl:mr-0" /> {language === "ar" ? "إلغاء" : "Cancel"}
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button onClick={() => handleApproveUpdate(u)} className="flex items-center text-green-600 bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded hover:opacity-80 font-bold">
                                        <CheckCircle size={16} className="mr-1 rtl:ml-1 rtl:mr-0" /> {language === "ar" ? "موافق" : "Approve"}
                                      </button>
                                      <button onClick={() => { setEditingUpdateUserId(u.id); setUpdateEditFormData({ name: u.pendingUpdates?.name, department: u.pendingUpdates?.department, phone: u.pendingUpdates?.phone, hrCode: u.pendingUpdates?.hrCode, email: u.pendingUpdates?.email }); }} className="flex items-center text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded hover:opacity-80 font-bold">
                                        <Edit2 size={16} className="mr-1 rtl:ml-1 rtl:mr-0" /> {language === "ar" ? "تعديل" : "Edit"}
                                      </button>
                                      <button onClick={() => handleRejectUpdate(u)} className="flex items-center text-red-600 bg-red-50 dark:bg-red-900/30 px-3 py-1 rounded hover:opacity-80 font-bold">
                                        <X size={16} className="mr-1 rtl:ml-1 rtl:mr-0" /> {language === "ar" ? "رفض" : "Reject"}
                                      </button>
                                    </>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                      ) : (
                        <p style={{ color: textMuted }}>{language === "ar" ? "لا توجد طلبات تعديل." : "No pending updates."}</p>
                      )}
                    </div>
                  )}

                  {/* --- NEW TAB: PROCESSED UPDATES HISTORY --- */}
                  {userManagementTab === 'processed_updates' && (
                    <div>
                      <h2 className="text-xl font-semibold mb-4" style={{ color: textColor }}>{language === "ar" ? "سجل التعديلات المكتملة" : "Processed Data Updates"}</h2>
                      {processedUpdatesList.filter(item => {
                        if (!userSearchTerm.trim()) return true;
                        const term = userSearchTerm.trim().toLowerCase();
                        return (item.user.name || '').toLowerCase().includes(term) || (item.user.hrCode || '').toLowerCase().includes(term) || (item.user.email || '').toLowerCase().includes(term);
                      }).length > 0 ? (
                        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b font-bold" style={{ backgroundColor: tableHeaderBg, borderColor: borderColor, color: '#FFFFFF' }}>
                              <th className="p-3 text-white font-bold tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "الاسم" : "Name"}</th>
                              <th className="p-3 text-white font-bold tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "التعديل الذي طُلب" : "Requested Change"}</th>
                              <th className="p-3 text-white font-bold tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "الحالة" : "Status"}</th>
                              <th className="p-3 text-white font-bold tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "وقت التنفيذ" : "Processed At"}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {processedUpdatesList.filter(item => {
                              if (!userSearchTerm.trim()) return true;
                              const term = userSearchTerm.trim().toLowerCase();
                              return (item.user.name || '').toLowerCase().includes(term) || (item.user.hrCode || '').toLowerCase().includes(term) || (item.user.email || '').toLowerCase().includes(term);
                            }).map((item, index) => (
                              <tr key={`${item.user.id}_${index}`} className="border-b transition-colors" style={{ borderColor: borderColor, color: textColor }}>
                                <td className="p-3"><UserAvatarWithName user={item.user} /></td>
                                <td className="p-3">
                                  {item.history.name && (
                                    <div className="mb-1.5 text-sm">
                                      <span className="text-xs text-gray-500 block">{language === "ar" ? "الاسم:" : "Name:"}</span>
                                      {item.history.oldName && (
                                        <span className="line-through text-red-500 mr-2 rtl:ml-2 rtl:mr-0">{item.history.oldName}</span>
                                      )}
                                      <span className="font-bold text-green-600">➔ {item.history.name}</span>
                                    </div>
                                  )}
                                  {item.history.phone && (
                                    <div className="mb-1.5 text-sm">
                                      <span className="text-xs text-gray-500 block">{language === "ar" ? "الهاتف:" : "Phone:"}</span>
                                      {item.history.oldPhone && (
                                        <span className="line-through text-red-500 mr-2 rtl:ml-2 rtl:mr-0 font-mono" dir="ltr">{item.history.oldPhone}</span>
                                      )}
                                      <span className="font-bold text-green-600 font-mono" dir="ltr">➔ {item.history.phone}</span>
                                    </div>
                                  )}
                                  {item.history.department && (
                                    <div className="mb-1.5 text-sm">
                                      <span className="text-xs text-gray-500 block">{language === "ar" ? "القسم:" : "Department:"}</span>
                                      {item.history.oldDepartment && (
                                        <span className="line-through text-red-500 mr-2 rtl:ml-2 rtl:mr-0">{item.history.oldDepartment}</span>
                                      )}
                                      <span className="font-bold text-green-600">➔ {item.history.department}</span>
                                    </div>
                                  )}
                                  {item.history.email && (
                                    <div className="mb-1.5 text-sm">
                                      <span className="text-xs text-gray-500 block">{language === "ar" ? "الإيميل:" : "Email:"}</span>
                                      {item.history.oldEmail && (
                                        <span className="line-through text-red-500 mr-2 rtl:ml-2 rtl:mr-0 font-mono">{item.history.oldEmail}</span>
                                      )}
                                      <span className="font-bold text-green-600 font-mono">➔ {item.history.email}</span>
                                    </div>
                                  )}
                                  {item.history.hrCode && (
                                    <div className="mb-1.5 text-sm">
                                      <span className="text-xs text-gray-500 block">{language === "ar" ? "الكود:" : "HR Code:"}</span>
                                      {item.history.oldHrCode && (
                                        <span className="line-through text-red-500 mr-2 rtl:ml-2 rtl:mr-0 font-mono">{item.history.oldHrCode}</span>
                                      )}
                                      <span className="font-bold text-green-600 font-mono">➔ {item.history.hrCode}</span>
                                    </div>
                                  )}
                                </td>
                                <td className="p-3">
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                                    item.history.status === "approved" 
                                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                  }`}>
                                    {item.history.status === "approved" ? (language === "ar" ? "تمت الموافقة" : "Approved") : (language === "ar" ? "مرفوض" : "Rejected")}
                                  </span>
                                </td>
                                <td className="p-3 text-sm" style={{ color: textMuted }}>
                                  {new Date(item.history.processedAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-GB')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                      ) : (
                        <p style={{ color: textMuted }}>{language === "ar" ? "لا يوجد سجل للتعديلات السابقة." : "No history of processed updates."}</p>
                      )}
                    </div>
                  )}

                  {userManagementTab === 'processed' && (
                    <div>
                      <h2 className="text-xl font-semibold mb-4" style={{ color: textColor }}>{language === "ar" ? "طلبات مراجعة" : "Processed Requests"}</h2>
                      {users.filter(u => (u.status === "approved" || u.status === "rejected") && u.createdAt).filter(u => {
                        if (!userSearchTerm.trim()) return true;
                        const term = userSearchTerm.trim().toLowerCase();
                        return (
                          (u.name || '').toLowerCase().includes(term) ||
                          (u.hrCode || '').toLowerCase().includes(term) ||
                          (u.email || '').toLowerCase().includes(term) ||
                          (u.phone || '').toLowerCase().includes(term) ||
                          (u.department || '').toLowerCase().includes(term) ||
                          (u.role || '').toLowerCase().includes(term)
                        );
                      }).length > 0 ? (
                        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b font-bold" style={{ backgroundColor: tableHeaderBg, borderColor: borderColor, color: '#FFFFFF' }}>
                              <th className="p-3 text-white font-bold tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "الكود الوظيفي" : "HR Code"}</th>
                              <th className="p-3 text-white font-bold tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "الاسم" : "Name"}</th>
                              <th className="p-3 text-white font-bold tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "القسم" : "Department"}</th>
                              <th className="p-3 text-white font-bold tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "الصلاحية" : "Role"}</th>
                              <th className="p-3 text-white font-bold tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "الحالة" : "Status"}</th>
                              <th className="p-3 align-top text-white font-bold tracking-wide" style={{ color: '#FFFFFF' }}><div className="font-semibold mb-2">{language === "ar" ? "إجراءات" : "Actions"}</div></th>
                            </tr>
                          </thead>
                          <tbody>
                            {users.filter(u => (u.status === "approved" || u.status === "rejected") && u.createdAt).filter(u => {
                              if (!userSearchTerm.trim()) return true;
                              const term = userSearchTerm.trim().toLowerCase();
                              return (
                                (u.name || '').toLowerCase().includes(term) ||
                                (u.hrCode || '').toLowerCase().includes(term) ||
                                (u.email || '').toLowerCase().includes(term) ||
                                (u.phone || '').toLowerCase().includes(term) ||
                                (u.department || '').toLowerCase().includes(term) ||
                                (u.role || '').toLowerCase().includes(term)
                              );
                            }).map((u) => (
                              <tr key={u.id} className="border-b transition-colors" style={{ borderColor: borderColor, color: textColor }}>
                                <td className="p-3"><DataField>{u.hrCode}</DataField></td>
                                <td className="p-3"><UserAvatarWithName user={u} /></td>
                                <td className="p-3"><DataField>{u.department}</DataField></td>
                                <td className="p-3 whitespace-nowrap">
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-flex items-center gap-1.5 ${
                                    u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-300 dark:border-purple-700' :
                                    u.role === 'manager' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700' :
                                    u.role === 'supervisor' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700' :
                                    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                                  }`}>
                                    <span>{u.role === 'admin' ? '🛡️ Admin' : u.role === 'manager' ? '👔 Manager' : u.role === 'supervisor' ? '👷 Supervisor' : '🎓 Trainee'}</span>
                                  </span>
                                </td>
                                <td className="p-3">
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${u.status === "approved" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                                    {u.status === "approved" ? (language === "ar" ? "معتمد" : "Approved") : (language === "ar" ? "مرفوض" : "Rejected")}
                                  </span>
                                </td>
                                <td className="p-3 flex gap-2">
                                  <button 
                                    onClick={() => handleOpenEditUser(u)} 
                                    className="flex items-center gap-1.5 text-blue-600 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all border border-blue-200 dark:border-blue-800 shadow-2xs"
                                  >
                                    <Edit2 size={13} /> {language === "ar" ? "تعديل" : "Edit"}
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteUser(u.id)} 
                                    className="flex items-center gap-1.5 text-red-600 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/60 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all border border-red-200 dark:border-red-800 shadow-2xs"
                                  >
                                    <Trash2 size={13} /> {language === "ar" ? "حذف" : "Delete"}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                      ) : (
                        <p style={{ color: textMuted }}>{language === "ar" ? "لا توجد طلبات مطابقة." : "No matching requests found."}</p>
                      )}
                    </div>
                  )}
                  {userManagementTab === 'deleted' && (
                    <div>
                      <h2 className="text-xl font-semibold mb-4" style={{ color: textColor }}>{language === "ar" ? "متدربين محذوفين" : "Deleted Trainees"}</h2>
                      {users.filter(u => u.status === "deleted").filter(u => {
                        if (!userSearchTerm.trim()) return true;
                        const term = userSearchTerm.trim().toLowerCase();
                        return (u.name || '').toLowerCase().includes(term) || (u.hrCode || '').toLowerCase().includes(term) || (u.department || '').toLowerCase().includes(term);
                      }).length > 0 ? (
                        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b font-bold" style={{ backgroundColor: tableHeaderBg, borderColor: borderColor, color: '#FFFFFF' }}>
                              <th className="p-3 text-white font-bold tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "الكود الوظيفي" : "HR Code"}</th>
                              <th className="p-3 text-white font-bold tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "الاسم" : "Name"}</th>
                              <th className="p-3 text-white font-bold tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "القسم" : "Department"}</th>
                              <th className="p-3 align-top text-white font-bold tracking-wide" style={{ color: '#FFFFFF' }}><div className="font-semibold mb-2">{language === "ar" ? "إجراءات" : "Actions"}</div></th>
                            </tr>
                          </thead>
                          <tbody>
                            {users.filter(u => u.status === "deleted").filter(u => {
                              if (!userSearchTerm.trim()) return true;
                              const term = userSearchTerm.trim().toLowerCase();
                              return (u.name || '').toLowerCase().includes(term) || (u.hrCode || '').toLowerCase().includes(term) || (u.department || '').toLowerCase().includes(term);
                            }).map(u => (
                              <tr key={u.id} className="border-b opacity-80" style={{ backgroundColor: isDark ? 'rgba(153, 27, 27, 0.1)' : '#fef2f2', borderColor: borderColor, color: textColor }}>
                                <td className="p-3">{u.hrCode}</td>
                                <td className="p-3"><UserAvatarWithName user={u} /></td>
                                <td className="p-3">{u.department}</td>
                                <td className="p-3">
                                  <button onClick={() => handleRestoreUser(u.id)} className="text-green-600 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded hover:opacity-80 font-bold">
                                    {language === "ar" ? "استرجاع" : "Restore"}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                      ) : (
                        <p style={{ color: textMuted }}>{language === "ar" ? "لا يوجد متدربين محذوفين." : "No deleted trainees."}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* DASHBOARD TAB */}
          {currentView === "dashboard" && (
            <div className="space-y-12">
              <div className="w-full overflow-hidden">
                <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
                  <h2 className="text-2xl font-bold border-l-4 border-[#FFC000] pl-3 rtl:pr-3 rtl:pl-0 rtl:border-r-4 rtl:border-l-0" style={{ color: isDark ? '#60a5fa' : '#002D62' }}>
                    {language === "ar" ? "السجلات الشاملة" : "Global Records"}
                  </h2>
                  <div className="flex gap-2">
                    {/* -- NEW MANUAL ADD BUTTON -- */}
                    <button 
                      onClick={() => setShowManualAddModal(true)} 
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFC000] text-[#002D62] rounded-xl text-sm font-bold transition-all shadow-xs cursor-pointer hover:bg-yellow-500"
                    >
                      <PlusCircle size={16} />
                      <span>{language === "ar" ? "إضافة حضور يدوي" : "Add Record"}</span>
                    </button>
                  </div>
                </div>

                {isSingleTraineeFiltered && singleTraineeProfile ? (
                  /* Trainee Executive Profile Banner (When filtering by single employee) */
                  <div 
                    className="mb-6 p-5 sm:p-6 rounded-2xl border shadow-sm print:hidden transition-all animate-fade-in" 
                    style={{ backgroundColor: cardColor, borderColor: borderColor }}
                  >
                    <div className="flex flex-col md:flex-row items-center md:items-stretch justify-between gap-6">
                      
                      {/* Trainee Profile Information */}
                      <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left rtl:sm:text-right">
                        {/* Avatar */}
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shadow-md border-2 border-[#FFC000] shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          {singleTraineeProfile.imageUrl ? (
                            <img 
                              src={singleTraineeProfile.imageUrl} 
                              alt={singleTraineeProfile.name} 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#002D62] text-[#FFC000] font-black text-2xl">
                              {singleTraineeProfile.name?.substring(0, 2).toUpperCase() || 'TR'}
                            </div>
                          )}
                        </div>

                        {/* Text details */}
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                            <h3 className="text-xl sm:text-2xl font-black" style={{ color: isDark ? '#FFFFFF' : '#002D62' }}>
                              {singleTraineeProfile.name}
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-blue-100 dark:bg-blue-900/40 text-[#002D62] dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                              #{singleTraineeProfile.hrCode}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
                            <span 
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border shadow-2xs"
                              style={{ backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor }}
                            >
                              <Tag size={13} className="text-[#FFC000]" />
                              <span>{singleTraineeProfile.department}</span>
                            </span>
                            <span 
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border shadow-2xs"
                              style={{ backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor }}
                            >
                              <HardHat size={13} className="text-amber-500" />
                              <span>{singleTraineeProfile.jobRole}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Trainee Executive KPI Cards (4 Cards) */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 w-full md:w-auto self-center">
                        {/* 1. Total Courses */}
                        <div 
                          className="p-3 sm:p-4 rounded-xl border text-center flex flex-col items-center justify-center min-w-[85px] sm:min-w-[110px] shadow-2xs" 
                          style={{ backgroundColor: isDark ? '#13233D' : '#F8FAFC', borderColor }}
                        >
                          <BookOpen size={18} className="text-[#002D62] dark:text-[#60a5fa] mb-1" />
                          <span className="text-[10px] sm:text-[11px] font-bold mb-1" style={{ color: textMuted }}>
                            {language === 'ar' ? 'إجمالي الدورات' : 'Total Courses'}
                          </span>
                          <span className="text-lg sm:text-2xl font-black" style={{ color: textColor }}>
                            {singleTraineeProfile.totalCourses}
                          </span>
                        </div>

                        {/* 2. Total Sessions */}
                        <div 
                          className="p-3 sm:p-4 rounded-xl border text-center flex flex-col items-center justify-center min-w-[85px] sm:min-w-[110px] shadow-2xs" 
                          style={{ backgroundColor: isDark ? '#13233D' : '#F8FAFC', borderColor }}
                        >
                          <Clock size={18} className="text-blue-600 dark:text-blue-400 mb-1" />
                          <span className="text-[10px] sm:text-[11px] font-bold mb-1" style={{ color: textMuted }}>
                            {language === 'ar' ? 'إجمالي الجلسات' : 'Total Sessions'}
                          </span>
                          <span className="text-lg sm:text-2xl font-black text-blue-600 dark:text-blue-400">
                            {singleTraineeProfile.totalSessions}
                          </span>
                        </div>

                        {/* 3. Attended Days */}
                        <div 
                          className="p-3 sm:p-4 rounded-xl border text-center flex flex-col items-center justify-center min-w-[85px] sm:min-w-[110px] shadow-2xs" 
                          style={{ backgroundColor: isDark ? '#13233D' : '#F8FAFC', borderColor }}
                        >
                          <Calendar size={18} className="text-[#FFC000] mb-1" />
                          <span className="text-[10px] sm:text-[11px] font-bold mb-1" style={{ color: textMuted }}>
                            {language === 'ar' ? 'أيام التدريب' : 'Training Days'}
                          </span>
                          <span className="text-lg sm:text-2xl font-black text-[#FFC000]">
                            {singleTraineeProfile.attendedDays}
                          </span>
                        </div>

                        {/* 4. Average Score */}
                        <div 
                          className="p-3 sm:p-4 rounded-xl border text-center flex flex-col items-center justify-center min-w-[85px] sm:min-w-[110px] shadow-2xs" 
                          style={{ backgroundColor: isDark ? '#13233D' : '#F8FAFC', borderColor }}
                        >
                          <CheckCircle size={18} className="text-emerald-500 mb-1" />
                          <span className="text-[10px] sm:text-[11px] font-bold mb-1" style={{ color: textMuted }}>
                            {language === 'ar' ? 'متوسط الدرجات' : 'Avg Score'}
                          </span>
                          <span className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            {singleTraineeProfile.avgScore !== null ? `${singleTraineeProfile.avgScore}%` : 'N/A'}
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>
                ) : (
                  /* Global KPI Summary Cards */
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6 print:hidden">
                    <div className="p-4 rounded-lg border shadow-sm flex flex-col items-center justify-center text-center transition-colors duration-300" style={{ backgroundColor: cardColor, borderColor: borderColor }}>
                      <BookOpen className="mb-2" size={24} style={{ color: isDark ? '#60a5fa' : '#002D62' }} />
                      <span className="text-xs font-semibold mb-1" style={{ color: textMuted }}>{language === "ar" ? "إجمالي الدورات" : "Total Courses"}</span>
                      <span className="text-xl font-bold" style={{ color: textColor }}>{kpiStats.totalCourses || (recordsLoaded ? 0 : courses.length)}</span>
                    </div>
                    <div className="p-4 rounded-lg border shadow-sm flex flex-col items-center justify-center text-center transition-colors duration-300" style={{ backgroundColor: cardColor, borderColor: borderColor }}>
                      <Calendar className="text-[#FFC000] mb-2" size={24} />
                      <span className="text-xs font-semibold mb-1" style={{ color: textMuted }}>{language === "ar" ? "إجمالي الجلسات" : "Total Sessions"}</span>
                      <span className="text-xl font-bold" style={{ color: textColor }}>{kpiStats.totalSessions || (recordsLoaded ? 0 : upcomingSessions.length)}</span>
                    </div>
                    <div className="p-4 rounded-lg border shadow-sm flex flex-col items-center justify-center text-center transition-colors duration-300" style={{ backgroundColor: cardColor, borderColor: borderColor }}>
                      <Users className="text-green-600 dark:text-green-400 mb-2" size={24} />
                      <span className="text-xs font-semibold mb-1" style={{ color: textMuted }}>{language === "ar" ? "إجمالي المشاركين" : "Total Participants"}</span>
                      <span className="text-xl font-bold" style={{ color: textColor }}>{kpiStats.totalParticipants}</span>
                    </div>
                    <div className="p-4 rounded-lg border shadow-sm flex flex-col items-center justify-center text-center transition-colors duration-300" style={{ backgroundColor: cardColor, borderColor: borderColor }}>
                      <HardHat className="text-blue-500 mb-2" size={24} />
                      <span className="text-xs font-semibold mb-1" style={{ color: textMuted }}>{language === "ar" ? "المهندسين" : "Total Engineers"}</span>
                      <span className="text-xl font-bold" style={{ color: textColor }}>{kpiStats.totalEngineers}</span>
                    </div>
                    <div className="p-4 rounded-lg border shadow-sm flex flex-col items-center justify-center text-center transition-colors duration-300" style={{ backgroundColor: cardColor, borderColor: borderColor }}>
                      <Wrench className="text-purple-500 mb-2" size={24} />
                      <span className="text-xs font-semibold mb-1" style={{ color: textMuted }}>{language === "ar" ? "الفنيين" : "Total Technicians"}</span>
                      <span className="text-xl font-bold" style={{ color: textColor }}>{kpiStats.totalTechnicians}</span>
                    </div>
                    <div className="p-4 rounded-lg border shadow-sm flex flex-col items-center justify-center text-center transition-colors duration-300" style={{ backgroundColor: cardColor, borderColor: borderColor }}>
                      <Settings className="text-gray-500 dark:text-gray-400 mb-2" size={24} />
                      <span className="text-xs font-semibold mb-1" style={{ color: textMuted }}>{language === "ar" ? "المشغلين" : "Total Operators"}</span>
                      <span className="text-xl font-bold" style={{ color: textColor }}>{kpiStats.totalOperators}</span>
                    </div>
                  </div>
                )}

                {/* On-Demand Server Query Action Bar */}
                <div className="mb-6 p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 shadow-2xs print:hidden" style={{ backgroundColor: cardColor, borderColor: borderColor }}>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => handleExecuteRecordsSearch(false)}
                      disabled={isFetchingRecords}
                      className="px-5 py-2.5 bg-[#002D62] hover:bg-[#003d85] text-white font-bold rounded-xl shadow-md transition-all text-xs sm:text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 hover:scale-105 active:scale-95"
                    >
                      {isFetchingRecords ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Search size={16} className="text-[#FFC000]" />
                      )}
                      <span>{language === 'ar' ? 'بحث وجلب بيانات التقرير' : 'Search & Fetch Records'}</span>
                    </button>
                    <button
                      onClick={() => handleExecuteRecordsSearch(true)}
                      disabled={isFetchingRecords}
                      className="px-4 py-2.5 bg-white dark:bg-slate-800 text-[#002D62] dark:text-[#FFC000] hover:bg-blue-50 dark:hover:bg-slate-700 font-extrabold rounded-xl border-2 border-[#002D62]/40 dark:border-[#FFC000]/60 transition-all text-xs sm:text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
                      title={language === 'ar' ? 'جلب كافة السجلات لتقرير شامل' : 'Fetch all records for full report'}
                    >
                      <Database size={15} className="text-[#002D62] dark:text-[#FFC000]" />
                      <span>{language === 'ar' ? 'جلب كافة السجلات (تقرير شامل)' : 'Fetch All Records'}</span>
                    </button>
                  </div>
                  {hasActiveFilters && (
                    <button
                      onClick={handleClearAllFilters}
                      className="px-3 py-1.5 text-xs text-red-600 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 rounded-lg flex items-center gap-1 font-semibold transition-colors"
                    >
                      <RotateCcw size={13} />
                      {language === 'ar' ? 'إعادة ضبط الفلتر' : 'Reset Filters'}
                    </button>
                  )}
                </div>

                {selectedCourseFilter && selectedCourseDetails ? (
                  <div className="mb-6 print:hidden">
                    <div 
                      className="border rounded-2xl p-5 mb-5 flex flex-wrap gap-4 items-center justify-between shadow-xs transition-colors" 
                      style={{ backgroundColor: isDark ? '#111E38' : '#F8FAFC', borderColor: borderColor }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-[#002D62] dark:text-[#FFC000] flex items-center justify-center font-bold">
                          <BookOpen size={20} />
                        </div>
                        <h3 className="text-lg sm:text-xl font-black" style={{ color: isDark ? '#60a5fa' : '#002D62' }}>
                          <DataField>{selectedCourseDetails.title}</DataField>
                        </h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-200 text-xs font-bold px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800">
                          {language === "ar" ? "عُقدت" : "Conducted"} {courseSessions.length} {language === "ar" ? "مرات" : "times"}
                        </span>
                        <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                          {language === "ar" ? "إجمالي الحضور" : "Total Attendees"}: {filteredRecords.length}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {courseSessions.map((date) => {
                        const attendeesOnDate = filteredRecords.filter((r) => (r.attendanceDate || r.date || r.raw?.['Date'] || r.raw?.['Attendance Date'] || 'N/A') === date);
                        const isExpanded = expandedDates[date];
                        return (
                          <div 
                            key={date} 
                            className="border rounded-2xl overflow-hidden shadow-2xs transition-all" 
                            style={{ backgroundColor: cardColor, borderColor: borderColor }}
                          >
                            <button 
                              onClick={() => toggleDateExpansion(date)} 
                              className="w-full px-4 sm:px-5 py-3.5 flex justify-between items-center transition-colors cursor-pointer hover:bg-blue-50/50 dark:hover:bg-slate-800/60" 
                              style={{ backgroundColor: isDark ? '#15243F' : '#FFFFFF' }}
                            >
                              <span className="font-extrabold text-sm sm:text-base" style={{ color: textColor }}>
                                {formatDateToStandard(date)}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                  {attendeesOnDate.length} {language === "ar" ? "حاضرين" : "attendees"}
                                </span>
                              </div>
                            </button>
                            {isExpanded && (
                              <div className="p-4 overflow-x-auto border-t" style={{ backgroundColor: cardColor, borderColor: borderColor }}>
                                <table className="w-full text-left border-collapse text-sm">
                                  <thead>
                                    <tr className="border-b" style={{ borderColor: borderColor, color: textMuted }}>
                                      <th className="pb-2 font-bold">{language === "ar" ? "الكود" : "HR Code"}</th>
                                      <th className="pb-2 font-bold">{language === "ar" ? "الاسم" : "Name"}</th>
                                      <th className="pb-2 font-bold">{language === "ar" ? "القسم" : "Department"}</th>
                                      <th className="pb-2 font-bold">{language === "ar" ? "الدرجة" : "Score"}</th>
                                      <th className="pb-2 font-bold">{language === "ar" ? "إجراءات" : "Actions"}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {attendeesOnDate.map((r) => {
                                      const u = users.find((u) => u.id === r.userId || u.hrCode === r.userId || u.hrCode === `HR${r.userId}`);
                                      const recHrCode = u?.hrCode || r.hrCode || r.userId || r.raw?.['HR Code'] || r.raw?.['ID'] || '';
                                      return (
                                        <tr key={r.id} className="border-b last:border-0 transition-colors hover:opacity-80" style={{ borderColor: borderColor, color: textColor }}>
                                          <td className="py-2.5 font-bold font-mono text-xs">{recHrCode}</td>
                                          <td className="py-2.5 font-medium"><DataField>{u?.name || r.traineeName || r.name}</DataField></td>
                                          <td className="py-2.5 font-medium"><DataField>{u?.department || r.department}</DataField></td>
                                          <td className="py-2.5 font-black text-[#FFC000]">{r.score}</td>
                                          <td className="py-2.5 flex items-center gap-1.5">
                                            <button 
                                              type="button"
                                              onClick={() => setEditingRecord(r)} 
                                              className="p-1 rounded-md text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors"
                                              title={language === 'ar' ? 'تعديل' : 'Edit'}
                                            >
                                              <Edit2 size={13} />
                                            </button>
                                            <button 
                                              type="button"
                                              onClick={() => handleDeleteRecord(r.id)} 
                                              className="p-1 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                              title={language === 'ar' ? 'حذف' : 'Delete'}
                                            >
                                              <Trash2 size={13} />
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto border rounded-xl shadow-sm print:hidden" style={{ backgroundColor: cardColor, borderColor: borderColor }}>
                    <table className="min-w-[850px] w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b !text-white" style={{ backgroundColor: tableHeaderBg, borderColor: borderColor }}>
                          <th className="p-3 !text-white" style={{ color: '#FFFFFF' }}>
                            <div className="font-extrabold mb-2 text-sm !text-white tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "الكود الوظيفي" : "HR Code"}</div>
                            <div className="relative">
                              <input type="text" value={searchHrCode} onKeyDown={(e) => { if (e.key === 'Enter') handleExecuteRecordsSearch(false); }} onChange={(e) => setSearchHrCode(e.target.value)} className="w-full border rounded-md px-2 py-1 text-xs focus:ring-[#FFC000] pr-6 shadow-2xs font-medium" style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }} placeholder={language === "ar" ? "تصفية..." : "Filter..."} />
                              {searchHrCode && <button onClick={() => setSearchHrCode("")} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={12} /></button>}
                            </div>
                          </th>
                          <th className="p-3 !text-white" style={{ color: '#FFFFFF' }}>
                            <div className="font-extrabold mb-2 text-sm !text-white tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "الاسم" : "Name"}</div>
                            <div className="relative">
                              <input type="text" value={searchTrainee} onKeyDown={(e) => { if (e.key === 'Enter') handleExecuteRecordsSearch(false); }} onChange={(e) => setSearchTrainee(e.target.value)} className="w-full border rounded-md px-2 py-1 text-xs focus:ring-[#FFC000] pr-6 shadow-2xs font-medium" style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }} placeholder={language === "ar" ? "تصفية..." : "Filter..."} />
                              {searchTrainee && <button onClick={() => setSearchTrainee("")} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={12} /></button>}
                            </div>
                          </th>
                          <th className="p-3 !text-white" style={{ color: '#FFFFFF' }}>
                            <div className="font-extrabold mb-2 text-sm !text-white tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "القسم" : "Department"}</div>
                            <div className="relative">
                              <select 
                                value={searchDepartment} 
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSearchDepartment(val);
                                  fetchTrainingRecords({ department: val });
                                }} 
                                className="w-full border rounded-md px-2 py-1 text-xs focus:ring-[#FFC000] appearance-none pr-6 shadow-2xs font-medium" 
                                style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }}
                              >
                                <option value="">{language === "ar" ? "الكل" : "All"}</option>
                                {dynamicDepartments.map((d) => <option key={d} value={d}>{d}</option>)}
                              </select>
                              {searchDepartment && <button onClick={() => setSearchDepartment("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={12} /></button>}
                            </div>
                          </th>
                          <th className="p-3 !text-white" style={{ color: '#FFFFFF' }}>
                            <div className="font-extrabold mb-2 text-sm !text-white tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "الدورة التدريبية" : "Course Name"}</div>
                            <div className="relative">
                              <select 
                                value={selectedCourseFilter} 
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSelectedCourseFilter(val);
                                  fetchTrainingRecords({ courseName: val });
                                }} 
                                className="w-full border rounded-md px-2 py-1 text-xs focus:ring-[#FFC000] appearance-none pr-6 shadow-2xs font-medium" 
                                style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }}
                              >
                                <option value="">{language === "ar" ? "الكل" : "All"}</option>
                                {dynamicCourses.map((c) => <option key={c.id} value={c.title || c.id}>{c.title}</option>)}
                              </select>
                              {selectedCourseFilter && <button onClick={() => setSelectedCourseFilter("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={12} /></button>}
                            </div>
                          </th>
                          <th className="p-3 align-top !text-white" style={{ color: '#FFFFFF' }}><div className="font-extrabold mb-2 text-sm !text-white tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "المدة" : "Duration"}</div></th>
                          <th className="p-3 align-top !text-white" style={{ color: '#FFFFFF' }}><div className="font-extrabold mb-2 text-sm !text-white tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "أيام الحضور" : "Attended Days"}</div></th>
                          <th className="p-3 align-top !text-white" style={{ color: '#FFFFFF' }}><div className="font-extrabold mb-2 text-sm !text-white tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "الدرجة" : "Score"}</div></th>
                          <th className="p-3 align-top min-w-[140px] !text-white" style={{ color: '#FFFFFF' }}>
                            <div className="font-extrabold mb-2 text-sm !text-white tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "التاريخ" : "Date"}</div>
                            <div className="flex flex-col gap-2">
                              <div className="relative">
                                <input type="date" value={fromDateFilter} onChange={(e) => setFromDateFilter(e.target.value)} className="w-full border rounded-md px-2 py-1 text-xs focus:ring-[#FFC000] pr-6 shadow-2xs font-medium" style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }} title={language === "ar" ? "من تاريخ" : "From Date"} />
                                {fromDateFilter && <button onClick={() => setFromDateFilter("")} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={12} /></button>}
                              </div>
                              <div className="relative">
                                <input type="date" value={toDateFilter} onChange={(e) => setToDateFilter(e.target.value)} className="w-full border rounded-md px-2 py-1 text-xs focus:ring-[#FFC000] pr-6 shadow-2xs font-medium" style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }} title={language === "ar" ? "إلى تاريخ" : "To Date"} />
                                {toDateFilter && <button onClick={() => setToDateFilter("")} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={12} /></button>}
                              </div>
                            </div>
                          </th>
                          <th className="p-3 align-top !text-white" style={{ color: '#FFFFFF' }}><div className="font-extrabold mb-2 text-sm !text-white tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "إجراءات" : "Actions"}</div></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRecords.map((r) => {
                          const user = users.find((u) => u.id === r.userId || u.hrCode === r.hrCode || u.hrCode === r.userId || u.hrCode === `HR${r.userId}` || u.name?.trim().toLowerCase() === (r.traineeName || r.userId || "").trim().toLowerCase());
                          const course = dynamicCourses.find((c) => c.id === r.courseId);
                          const traineeImage = user?.profileImageUrl || r.raw?.["Profile Image"] || r.raw?.["Photo"];
                          const traineeDisplayName = r.traineeName || user?.name || r.userId;
                          const traineeHrCode = user?.hrCode || r.hrCode || r.userId;
                          return (
                            <tr key={r.id} className="border-b last:border-0 hover:opacity-80 transition-colors" style={{ borderColor: borderColor }}>
                              <td className="p-3 font-medium" style={{ color: textColor }}><DataField>{traineeHrCode}</DataField></td>
                              <td className="p-3 font-medium"><TraineeAvatarWithName name={traineeDisplayName} imageUrl={traineeImage} hrCode={traineeHrCode} /></td>
                              <td className="p-3" style={{ color: textMuted }}><DataField>{r.department || user?.department}</DataField></td>
                              <td className="p-3"><DataField>{course?.title || r.courseName || "Unknown"}</DataField></td>
                              <td className="p-3" style={{ color: textMuted }}><DataField>{course?.duration || r.raw?.["Course Duration"] || r.totalDays || "N/A"}</DataField></td>
                              <td className="p-3" style={{ color: textMuted }}><DataField>{r.raw?.["Attended Days"] || r.daysAttended}</DataField></td>
                              <td className="p-3 font-bold" style={{ color: textColor }}><DataField>{formatScore(r.raw?.["Score"] || r.score)}</DataField></td>
                              <td className="p-3" style={{ color: textMuted }}><DataField>{formatDateToStandard(r.attendanceDate)}</DataField></td>
                              <td className="p-3 text-center">
                                <button onClick={async (e) => { e.stopPropagation(); if (window.confirm(language === "ar" ? "هل أنت متأكد من حذف هذا السجل نهائياً؟" : "Delete record?")) { try { await deleteDoc(doc(db, "cleanedData", r.id)); setRecords(records.filter(rec => rec.id !== r.id)); } catch (err) { alert("Error deleting"); } } }} className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"><Trash2 size={16} /></button>
                                <button onClick={(e) => { e.stopPropagation(); setEditingRecord(r); }} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1.5 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"><Edit2 size={16} /></button>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredRecords.length === 0 && (
                          <tr><td colSpan={9} className="p-8 text-center" style={{ color: textMuted }}>{language === "ar" ? "لا توجد بيانات" : "No Data"}</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ANALYTICS TAB */}
          {currentView === "analytics" && (
            <div>
              <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
                <div>
                  <h2 className="text-xl font-bold border-l-4 rtl:border-r-4 rtl:border-l-0 border-[#FFC000] pl-3 rtl:pr-3 rtl:pl-0" style={{ color: textColor }}>
                    {language === "ar" ? "لوحة الإحصائيات والتحليلات" : "Analytics & Statistics Dashboard"}
                  </h2>
                </div>
                <button
                  onClick={async () => {
                    await fetchTrainingRecords();
                  }}
                  disabled={isFetchingRecords}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#002D62] hover:bg-blue-900 shadow-sm transition-all cursor-pointer hover:scale-105"
                >
                  <RefreshCw size={14} className={isFetchingRecords ? 'animate-spin text-[#FFC000]' : ''} />
                  <span>{isFetchingRecords ? (language === 'ar' ? 'جاري التحديث...' : 'Fetching...') : (language === 'ar' ? 'تحديث كامل السجلات الحية' : 'Fetch All Live Records')}</span>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="border rounded-lg p-6 shadow-sm flex flex-col items-center justify-center transition-colors" style={{ backgroundColor: cardColor, borderColor: borderColor }}>
                  <span className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: textMuted }}>{language === "ar" ? "المتدربين الفريدين" : "Unique Trainees"}</span>
                  <span className="text-3xl font-bold text-[#FFC000]">{totalUniqueTrainees}</span>
                </div>
                <div className="border rounded-lg p-6 shadow-sm flex flex-col items-center justify-center transition-colors" style={{ backgroundColor: cardColor, borderColor: borderColor }}>
                  <span className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: textMuted }}>{language === "ar" ? "إجمالي السجلات" : "Total Records"}</span>
                  <span className="text-3xl font-bold" style={{ color: isDark ? '#93C5FD' : '#002D62' }}>{records.length > 50 ? records.length : (globalKPIs.totalParticipants || 999)}</span>
                </div>
                <div className="border rounded-lg p-6 shadow-sm flex flex-col items-center justify-center transition-colors" style={{ backgroundColor: cardColor, borderColor: borderColor }}>
                  <span className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: textMuted }}>{language === "ar" ? "الدورات المختلفة" : "Distinct Courses"}</span>
                  <span className="text-3xl font-bold text-green-600 dark:text-green-400">{totalDistinctCourses}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Courses by Attendance */}
                <div className="border rounded-2xl shadow-sm p-6 h-96 flex flex-col transition-colors" style={{ backgroundColor: cardColor, borderColor: borderColor }}>
                  <div className="z-10 pb-3 border-b flex-none flex items-center justify-between" style={{ borderColor: borderColor }}>
                    <h3 className="font-bold text-base" style={{ color: isDark ? '#93C5FD' : '#002D62' }}>
                      {language === "ar" ? "الدورات حسب الحضور" : "Courses by Attendance"}
                    </h3>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {courseStats.length} {language === 'ar' ? 'دورات' : 'courses'}
                    </span>
                  </div>
                  <div className="overflow-y-auto flex-1 pt-3 pr-1 space-y-4">
                    {courseStats.map((stat, idx) => {
                      const maxAttendees = Math.max(...courseStats.map((s) => s.attendees)) || 1;
                      const percent = Math.max(4, Math.round((stat.attendees / maxAttendees) * 100));
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs sm:text-sm font-medium">
                            <span className="truncate mr-4 text-gray-800 dark:text-gray-200" title={stat.courseName}><DataField>{stat.courseName}</DataField></span>
                            <span className="font-black shrink-0 text-[#002D62] dark:text-[#93C5FD]">{stat.attendees}</span>
                          </div>
                          <div className="w-full rounded-full h-2.5 bg-gray-100 dark:bg-slate-800/80 border border-gray-200/50 dark:border-slate-700/60 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500 bg-[#002D62] dark:bg-[#3B82F6]" style={{ width: `${percent}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Trainees by Department */}
                <div className="border rounded-2xl shadow-sm p-6 h-96 flex flex-col transition-colors" style={{ backgroundColor: cardColor, borderColor: borderColor }}>
                  <div className="z-10 pb-3 border-b flex-none flex items-center justify-between" style={{ borderColor: borderColor }}>
                    <h3 className="font-bold text-base text-[#D97706] dark:text-[#FFC000]">
                      {language === "ar" ? "المتدربين حسب القسم" : "Trainees by Department"}
                    </h3>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {departmentStats.length} {language === 'ar' ? 'أقسام' : 'departments'}
                    </span>
                  </div>
                  <div className="overflow-y-auto flex-1 pt-3 pr-1 space-y-4">
                    {departmentStats.map((stat, idx) => {
                      const maxTrainees = Math.max(...departmentStats.map((s) => s.trainees)) || 1;
                      const percent = Math.max(4, Math.round((stat.trainees / maxTrainees) * 100));
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs sm:text-sm font-medium">
                            <span className="truncate mr-4 text-gray-800 dark:text-gray-200" title={stat.department}><DataField>{stat.department}</DataField></span>
                            <span className="font-black shrink-0 text-amber-600 dark:text-[#FFC000]">{stat.trainees}</span>
                          </div>
                          <div className="w-full rounded-full h-2.5 bg-gray-100 dark:bg-slate-800/80 border border-gray-200/50 dark:border-slate-700/60 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500 bg-[#FFC000]" style={{ width: `${percent}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ADMIN TOOLS TAB */}
          {["tools", "tools_manage", "tools_create", "tools_reports", "tools_logs", "tools_usage", "system_version"].includes(currentView) && (
            <div className="space-y-12">
              {currentView === "system_version" && (
                <div className="border rounded-2xl p-6 shadow-sm transition-all" style={{ backgroundColor: cardColor, borderColor: borderColor }}>
                  <div className="flex items-center justify-between flex-wrap gap-3 mb-6 pb-4 border-b" style={{ borderColor: borderColor }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#FFC000] text-[#001D42] flex items-center justify-center font-black text-lg shadow-sm">
                        v
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-[#002D62] dark:text-[#93C5FD]">
                          {language === "ar" ? "إدارة وتعديل رقم إصدار المنظومة" : "System Version Management"}
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {language === "ar" ? "تعديل رقم الإصدار المعتمد للمنظومة وحفظه في Firebase وتعميمه على جميع المستخدمين" : "Update and broadcast official release version across the system"}
                        </p>
                      </div>
                    </div>
                    <span className="bg-blue-100 dark:bg-blue-900/60 text-[#002D62] dark:text-blue-200 font-mono font-bold text-sm px-4 py-1 rounded-full border border-blue-200 dark:border-blue-700">
                      {language === 'ar' ? 'الإصدار النشط:' : 'Active Version:'} v{systemVersion}
                    </span>
                  </div>

                  {versionSuccessToast && (
                    <div className="bg-green-50 dark:bg-green-900/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm font-bold p-3.5 rounded-xl mb-4 flex items-center gap-2 animate-fadeIn">
                      <CheckCircle size={18} />
                      <span>{language === 'ar' ? `تم حفظ وتعميم الإصدار الجديد (v${systemVersion}) بنجاح على مستوى النظام!` : `System version updated to v${systemVersion} successfully!`}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveSystemVersion} className="max-w-md space-y-4">
                    <div>
                      <label className="block text-sm font-bold mb-1.5" style={{ color: textColor }}>
                        {language === "ar" ? "رقم الإصدار الجديد (New Version Number)" : "New Version Number"}
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-3 rtl:left-auto rtl:right-3 flex items-center text-gray-400 font-mono font-bold text-base">
                          v
                        </span>
                        <input 
                          type="text" 
                          required 
                          value={versionInput} 
                          onChange={(e) => setVersionInput(e.target.value)} 
                          placeholder="1.0.0" 
                          className="w-full border rounded-xl pl-8 rtl:pl-3 rtl:pr-8 pr-3 py-3 text-base font-mono font-bold focus:ring-2 focus:ring-[#002D62]" 
                          style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }} 
                        />
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isSavingVersion || versionInput.trim() === systemVersion}
                      className="w-full bg-[#002D62] hover:bg-blue-900 disabled:opacity-50 text-white font-bold text-sm py-3 px-6 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isSavingVersion ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                      <span>{language === "ar" ? "حفظ وتعميم رقم الإصدار" : "Save & Broadcast Version"}</span>
                    </button>
                  </form>
                </div>
              )}

              {["tools", "tools_manage"].includes(currentView) && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="border rounded-lg p-6 shadow-sm flex flex-col items-center justify-center transition-colors" style={{ backgroundColor: cardColor, borderColor: borderColor }}>
                      <span className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: textMuted }}>{language === "ar" ? "إجمالي الجلسات المتاحة" : "Total Sessions"}</span>
                      <span className="text-3xl font-bold text-blue-500">{upcomingSessions.filter(s => !s.isDeleted).length}</span>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-6 border-l-4 border-[#FFC000] pl-3 rtl:pr-3 rtl:pl-0 rtl:border-r-4 rtl:border-l-0" style={{ color: isDark ? '#60a5fa' : '#002D62' }}>{language === "ar" ? "إعلانات الجلسات" : "Session Announcements"}</h2>
                    {reminderToast && (
                      <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[9999] w-[90%] max-w-sm bg-emerald-50 dark:bg-emerald-900/80 border-l-4 border-emerald-500 p-4 rounded shadow-sm text-emerald-800 dark:text-emerald-200 flex items-center justify-between transition-all animate-fadeIn">
                        <div className="flex items-center gap-2"><Bell className="h-5 w-5 text-emerald-600 dark:text-emerald-400 animate-bounce" /><span className="font-semibold text-sm md:text-base">{reminderToast}</span></div>
                        <button onClick={() => setReminderToast(null)} className="text-emerald-600 dark:text-emerald-400 hover:opacity-75 font-bold text-sm"><X size={16} /></button>
                      </div>
                    )}
                  </div>
                </>
              )}
              
              <div className={currentView === "tools_manage" ? "grid grid-cols-1 gap-8" : "grid grid-cols-1 lg:grid-cols-2 gap-8"}>
                {["tools", "tools_create"].includes(currentView) && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4" style={{ color: textColor }}>{editingSessionId ? (language === "ar" ? "تعديل الجلسة" : "Edit Session") : (language === "ar" ? "إنشاء جلسة جديدة" : "Create New Session")}</h2>
                    <form onSubmit={handleCreateSession} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium mb-1" style={{ color: textMuted }}>{language === "ar" ? "اسم الدورة" : "Course Name"}</label>
                          <select 
                            required 
                            value={selectedCourseId} 
                            onChange={(e) => {
                              const selected = e.target.value;
                              setSelectedCourseId(selected);
                              if (!editingSessionId) {
                                setSessionIteration(getNextCourseIteration(selected));
                                if (!sessionNumber || sessionNumber === "") {
                                  setSessionNumber(getNextGlobalSessionNumber());
                                }
                              }
                            }} 
                            className="w-full border rounded px-3 py-2 focus:ring-[#002D62]" 
                            style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }}
                          >
                            <option value="">{language === "ar" ? "اختر الدورة" : "Select Course"}</option>
                            {dynamicCourses.map((c) => <option key={c.id} value={c.title}>{c.title}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: textMuted }}>{language === "ar" ? "تاريخ البدء" : "Start Date"}</label>
                          <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border rounded px-3 py-2 focus:ring-[#002D62]" style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: textMuted }}>{language === "ar" ? "تاريخ الانتهاء" : "End Date"}</label>
                          <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border rounded px-3 py-2 focus:ring-[#002D62]" style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: textMuted }}>
                            {language === "ar" ? "متسلسل الدورة (لإعلان الإيميل)" : "Course Iteration (for Email)"}
                          </label>
                          <input 
                            type="number" 
                            min="1"
                            required 
                            value={sessionIteration} 
                            onChange={(e) => setSessionIteration(e.target.value)} 
                            placeholder="e.g. 1, 2, 3"
                            className="w-full border rounded px-3 py-2 focus:ring-[#002D62]" 
                            style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }} 
                          />
                          <span className="text-[10px] block mt-0.5 text-blue-500 font-bold">
                            {sessionIteration ? `➜ ${getSessionOrdinalText(sessionIteration)}` : ''}
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: textMuted }}>
                            {language === "ar" ? "رقم السيشن في السجل العام" : "Global Session Number"}
                          </label>
                          <input 
                            type="number" 
                            required 
                            value={sessionNumber} 
                            onChange={(e) => setSessionNumber(e.target.value)} 
                            placeholder="e.g. 100"
                            className="w-full border rounded px-3 py-2 focus:ring-[#002D62]" 
                            style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }} 
                          />
                          <span className="text-[10px] block mt-0.5 text-gray-500">
                            {language === "ar" ? "الرقم التسلسلي في سجل التدريب العام (مثلاً 100)" : "Global sequence in records (e.g. 100)"}
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: textMuted }}>{language === "ar" ? "وقت البدء" : "Start Time"}</label>
                          <input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full border rounded px-3 py-2 focus:ring-[#002D62]" style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }} />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium mb-1" style={{ color: textMuted }}>{language === "ar" ? "المكان" : "Location"}</label>
                          <input type="text" required value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Training Room" className="w-full border rounded px-3 py-2 focus:ring-[#002D62]" style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }} />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium mb-1" style={{ color: textMuted }}>{language === "ar" ? "المشاركين المستهدفين" : "Target Participants"}</label>
                          <select required value={targetParticipants} onChange={(e) => setTargetParticipants(e.target.value)} className="w-full border rounded px-3 py-2 focus:ring-[#002D62]" style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }}>
                            <option value="">{language === "ar" ? "اختر الفئة المستهدفة" : "Select Target"}</option>
                            <option value="engineers">{language === "ar" ? "المهندسين" : "Engineers"}</option>
                            <option value="technicians">{language === "ar" ? "الفنيين" : "Technicians"}</option>
                            <option value="mixed">{language === "ar" ? "مختلط (الجميع)" : "Mixed"}</option>
                          </select>
                        </div>

                        {/* Registration Deadline & Registration Pause Controls */}
                        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/50 dark:bg-amber-950/20">
                          <div>
                            <label className="block text-xs font-bold text-amber-900 dark:text-amber-300 mb-1">
                              ⏰ {language === 'ar' ? 'آخر موعد للتسجيل (يوم وساعة)' : 'Registration Deadline (Date & Time)'}
                            </label>
                            <input 
                              type="datetime-local" 
                              value={registrationDeadline} 
                              onChange={(e) => setRegistrationDeadline(e.target.value)} 
                              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#002D62] outline-none font-bold" 
                              style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }} 
                            />
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 block">
                              {language === 'ar' ? 'سيتم إيقاف التسجيل تلقائياً بعد حلول هذا الموعد وإظهاره في التنبيهات' : 'Registration locks automatically after this date & time'}
                            </span>
                          </div>

                          <div className="flex flex-col justify-between">
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                              🔒 {language === 'ar' ? 'حالة إيقاف التسجيل اليدوي' : 'Manual Registration Lock'}
                            </label>
                            <button
                              type="button"
                              onClick={() => setIsRegistrationClosed(!isRegistrationClosed)}
                              className={`w-full py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer border shadow-xs ${
                                isRegistrationClosed
                                  ? 'bg-red-600 text-white border-red-700 hover:bg-red-700'
                                  : 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                              }`}
                            >
                              <span>{isRegistrationClosed ? '🔒 التسجيل مغلق حالياً' : '🔓 التسجيل مفتوح ومتاح للمتدربين'}</span>
                            </button>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 block">
                              {language === 'ar' ? 'يمكنك إيقاف أو فتح التسجيل في أي وقت دون إلغاء الدورة' : 'Toggle registration without cancelling the course'}
                            </span>
                          </div>
                        </div>

                        {/* TO Email Recipients Section */}
                        <div 
                          className="md:col-span-2 p-4 rounded-xl border space-y-2 transition-colors"
                          style={{
                            backgroundColor: isDark ? '#162B4D' : '#F0F6FF',
                            borderColor: isDark ? 'rgba(148, 190, 255, 0.35)' : '#BFDBFE',
                          }}
                        >
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <label className="text-sm font-bold flex items-center gap-1.5" style={{ color: isDark ? '#93C5FD' : '#002D62' }}>
                              <Mail size={16} className="text-[#FFC000]" />
                              <span>{language === "ar" ? "قائمة الإرسال الأساسية (To)" : "Primary Recipients (To)"}</span>
                            </label>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-medium" style={{ color: isDark ? '#C8DBF6' : '#64748B' }}>
                                {language === 'ar' ? 'المجموعات والمهندسين المستهدفين' : 'Target groups & engineers'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setToEmails("");
                                  localStorage.setItem('oed_saved_to_emails_v2', "");
                                }}
                                className="text-[10px] font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded border border-red-200 dark:border-red-800 flex items-center gap-0.5"
                              >
                                <Trash2 size={11} />
                                <span>{language === 'ar' ? 'مسح الإيميلات' : 'Clear'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setToEmails(DEFAULT_TO_EMAILS);
                                  localStorage.setItem('oed_saved_to_emails_v2', DEFAULT_TO_EMAILS);
                                }}
                                className="text-[10px] font-bold text-blue-600 dark:text-blue-300 hover:underline cursor-pointer bg-white/60 dark:bg-white/10 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-700 flex items-center gap-0.5"
                              >
                                <RefreshCw size={11} />
                                <span>{language === 'ar' ? 'استعادة الافتراضي' : 'Reset to Default'}</span>
                              </button>
                            </div>
                          </div>
                          <textarea
                            rows={2}
                            value={toEmails}
                            onChange={(e) => {
                              setToEmails(e.target.value);
                              localStorage.setItem('oed_saved_to_emails_v2', e.target.value);
                            }}
                            placeholder="EQ-Maintenance Engineers-OC <EQ-MaintenanceEngineers-OC@orascom.com>; ..."
                            className="w-full border rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#002D62] outline-none font-mono"
                            style={{ 
                              backgroundColor: inputBg, 
                              borderColor: borderColor, 
                              color: textColor 
                            }}
                            dir="ltr"
                          />
                        </div>

                        {/* CC Email Recipients Section */}
                        <div 
                          className="md:col-span-2 p-4 rounded-xl border space-y-2 transition-colors"
                          style={{
                            backgroundColor: isDark ? '#162B4D' : '#F0F6FF',
                            borderColor: isDark ? 'rgba(148, 190, 255, 0.35)' : '#BFDBFE',
                          }}
                        >
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <label className="text-sm font-bold flex items-center gap-1.5" style={{ color: isDark ? '#93C5FD' : '#002D62' }}>
                              <Mail size={16} className="text-[#FFC000]" />
                              <span>{language === "ar" ? "قائمة النسخة الإضافية والتنسيق (CC)" : "Coordination & CC Notification Emails"}</span>
                            </label>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-medium" style={{ color: isDark ? '#C8DBF6' : '#64748B' }}>
                                {language === 'ar' ? 'الشؤون الإدارية ومدراء الأقسام' : 'Admin affairs & managers'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setCcEmails("");
                                  localStorage.setItem('oed_saved_cc_emails_v2', "");
                                }}
                                className="text-[10px] font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded border border-red-200 dark:border-red-800 flex items-center gap-0.5"
                              >
                                <Trash2 size={11} />
                                <span>{language === 'ar' ? 'مسح الإيميلات' : 'Clear'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCcEmails(DEFAULT_CC_EMAILS);
                                  localStorage.setItem('oed_saved_cc_emails_v2', DEFAULT_CC_EMAILS);
                                }}
                                className="text-[10px] font-bold text-blue-600 dark:text-blue-300 hover:underline cursor-pointer bg-white/60 dark:bg-white/10 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-700 flex items-center gap-0.5"
                              >
                                <RefreshCw size={11} />
                                <span>{language === 'ar' ? 'استعادة الافتراضي' : 'Reset to Default'}</span>
                              </button>
                            </div>
                          </div>
                          <textarea
                            rows={3}
                            value={ccEmails}
                            onChange={(e) => {
                              setCcEmails(e.target.value);
                              localStorage.setItem('oed_saved_cc_emails_v2', e.target.value);
                            }}
                            placeholder="Akram.Amir@orascom.com; Yasser.Elsaied@orascom.com; ..."
                            className="w-full border rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#002D62] outline-none font-mono"
                            style={{ 
                              backgroundColor: inputBg, 
                              borderColor: borderColor, 
                              color: textColor 
                            }}
                            dir="ltr"
                          />
                          <p className="text-[11px] font-medium" style={{ color: isDark ? '#93C5FD' : '#475569' }}>
                            {language === 'ar' 
                              ? '💾 يتم حفظ هذه القوائم تلقائياً للدورات القادمة، وستظهر شاشة مراجعة للتأكيد قبل فتح Outlook.' 
                              : '💾 Saved automatically for future sessions. A review dialog will appear before opening Outlook.'}
                          </p>
                        </div>

                        {/* Email Body Content Preview & Editor */}
                        <div 
                          className="md:col-span-2 p-4 rounded-xl border space-y-2 transition-colors"
                          style={{
                            backgroundColor: isDark ? '#192C4B' : '#FFFDF5',
                            borderColor: isDark ? 'rgba(255, 192, 0, 0.35)' : '#FDE68A',
                          }}
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <label className="text-sm font-bold flex items-center gap-1.5" style={{ color: isDark ? '#FDE68A' : '#92400E' }}>
                              <FileText size={16} className="text-[#FFC000]" />
                              <span>{language === "ar" ? "معاينة وتعديل نص ومحتوى الإيميل (Email Body)" : "Email Body Content Preview & Editor"}</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setIsEmailBodyManual(false);
                                const courseObj = courses.find((c) => c.id === selectedCourseId || c.title === selectedCourseId);
                                const cTitle = courseObj ? courseObj.title : (selectedCourseId || "");
                                setCustomEmailBody(generateEmailBodyTemplate(cTitle, sessionIteration, sessionNumber, startDate, endDate, startTime, location));
                              }}
                              className="text-[10px] font-bold text-amber-800 dark:text-amber-300 hover:underline cursor-pointer bg-white/80 dark:bg-white/10 px-2.5 py-1 rounded border border-amber-300 dark:border-amber-700 flex items-center gap-1"
                            >
                              <RefreshCw size={11} />
                              <span>{language === 'ar' ? '🔄 إعادة إنشاء القالب الأصلي' : '🔄 Reset to Template'}</span>
                            </button>
                          </div>
                          <textarea
                            rows={10}
                            value={customEmailBody}
                            onChange={(e) => {
                              setIsEmailBodyManual(true);
                              setCustomEmailBody(e.target.value);
                            }}
                            placeholder="Dear Gents, ..."
                            className="w-full border rounded-lg px-3 py-2.5 text-xs focus:ring-2 focus:ring-[#FFC000] outline-none font-mono leading-relaxed"
                            style={{ 
                              backgroundColor: inputBg, 
                              borderColor: borderColor, 
                              color: textColor 
                            }}
                            dir="ltr"
                          />
                          <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                            {language === 'ar' 
                              ? '✨ يحتوي القالب تلقائياً على رابط التطبيق للتسجيل ورسالة الدعم الفني. يمكنك التعديل والإضافة بحرية وسيفتح في Outlook كما كتبته تماماً!' 
                              : '✨ Automatically includes app link for registration and support note. You can freely edit this content and it will open in Outlook.'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-6">
                        <button type="submit" className="flex-1 bg-[#FFC000] text-[#001D42] font-black py-3 px-6 rounded-xl hover:bg-yellow-500 transition-colors shadow-md cursor-pointer">
                          {editingSessionId ? (language === "ar" ? "تحديث الجلسة" : "Update Session") : (language === "ar" ? "نشر التنبيه" : "Publish & Push")}
                        </button>
                        {editingSessionId && (
                          <button type="button" onClick={handleCancelEdit} className="font-bold py-3 px-4 rounded-xl border transition-colors bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 cursor-pointer">
                            {language === "ar" ? "إلغاء التعديل" : "Cancel Edit"}
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                )}
                
                {["tools", "tools_manage"].includes(currentView) && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between flex-wrap gap-4 border-b pb-4" style={{ borderColor: borderColor }}>
                      <h2 className="text-xl font-bold border-l-4 rtl:border-r-4 rtl:border-l-0 border-[#FFC000] pl-3 rtl:pr-3 rtl:pl-0" style={{ color: textColor }}>
                        {language === "ar" ? "إدارة ومتابعة الدورات التدريبية" : "Manage Training Sessions"}
                      </h2>
                      
                      {/* 3 Status Sub-Tabs */}
                      <div className="flex items-center gap-2.5 p-2 rounded-2xl bg-gray-100 dark:bg-[#0B172B] border border-gray-300 dark:border-slate-700 flex-wrap shadow-inner">
                        <button
                          type="button"
                          onClick={() => setSessionStatusTab('active')}
                          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                            sessionStatusTab === 'active'
                              ? 'bg-[#002D62] text-white shadow-md ring-2 ring-blue-400'
                              : 'bg-white dark:bg-slate-800 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800/60 hover:bg-blue-50 dark:hover:bg-slate-700/80'
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>{language === 'ar' ? '🟢 الدورات المفتوحة والجارية' : '🟢 Open & Active'}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-black ${sessionStatusTab === 'active' ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-900/60 text-blue-900 dark:text-blue-200'}`}>
                            {activeSessionsList.length}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSessionStatusTab('completed')}
                          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                            sessionStatusTab === 'completed'
                              ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400'
                              : 'bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-50 dark:hover:bg-slate-700/80'
                          }`}
                        >
                          <CheckCircle size={15} className={sessionStatusTab === 'completed' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'} />
                          <span>{language === 'ar' ? '🔵 الدورات المنتهية (المقيّمة)' : '🔵 Completed Sessions'}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-black ${sessionStatusTab === 'completed' ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200'}`}>
                            {completedSessionsList.length}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSessionStatusTab('cancelled')}
                          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                            sessionStatusTab === 'cancelled'
                              ? 'bg-red-600 text-white shadow-md ring-2 ring-red-400'
                              : 'bg-white dark:bg-slate-800 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800/60 hover:bg-red-50 dark:hover:bg-slate-700/80'
                          }`}
                        >
                          <Ban size={15} className={sessionStatusTab === 'cancelled' ? 'text-white' : 'text-red-600 dark:text-red-400'} />
                          <span>{language === 'ar' ? '🔴 الدورات الملغية' : '🔴 Cancelled Sessions'}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-black ${sessionStatusTab === 'cancelled' ? 'bg-white/20 text-white' : 'bg-red-100 dark:bg-red-900/60 text-red-900 dark:text-red-200'}`}>
                            {cancelledSessionsList.length}
                          </span>
                        </button>
                      </div>
                    </div>

                    {currentDisplayedSessions.length === 0 ? (
                      <div className="text-center py-12 px-4 border border-dashed rounded-2xl transition-colors" style={{ backgroundColor: isDark ? '#111E38' : '#F8FAFC', borderColor: borderColor }}>
                        <Calendar className="mx-auto h-12 w-12 mb-3" style={{ color: textMuted }} />
                        <p className="font-bold text-sm" style={{ color: textMuted }}>
                          {sessionStatusTab === 'completed'
                            ? (language === 'ar' ? 'لا توجد دورات منتهية حالياً' : 'No Completed Sessions Yet')
                            : sessionStatusTab === 'cancelled'
                            ? (language === 'ar' ? 'لا توجد دورات ملغية' : 'No Cancelled Sessions')
                            : (language === 'ar' ? 'لا توجد دورات مفتوحة حالياً' : 'No Open Sessions Currently')}
                        </p>
                      </div>
                    ) : (
                      <ul className="space-y-4">
                        {currentDisplayedSessions.map((session, index) => (
                          <li key={session.id || index}>
                            <SessionCard 
                              session={session} 
                              isAdminView={true} 
                              onEdit={handleStartEdit} 
                              onSendReminder={handleSendReminder} 
                              onAnnounceRequest={setAnnouncingSession} 
                              onManageAnnouncementsRequest={setShowAnnouncementManager} 
                              onFinalizeRequest={setFinalizingSession} 
                              onPrintRegisterRequest={(session) => setPreviewRegisterSession(session)} 
                              onShowQR={setQrSession} 
                              onManualAttendanceRequest={setManualAttendanceSession}
                              onAttendanceReminderRequest={setAttendanceReminderSession}
                              onToggleFeedback={handleToggleFeedback} 
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* Reports & Resource Sharing Section */}
              {["tools", "tools_reports"].includes(currentView) && (
                <>
                  
              {/* Reports, Backup & Resource Management Hub */}
              {["tools", "tools_reports"].includes(currentView) && (
                <div className="space-y-8">
                  {/* Page Header */}
                  <div className="border-b pb-4" style={{ borderColor: borderColor }}>
                    <h2 className="text-2xl font-bold border-l-4 rtl:border-r-4 rtl:border-l-0 border-[#FFC000] pl-3 rtl:pr-3 rtl:pl-0" style={{ color: isDark ? '#60a5fa' : '#002D62' }}>
                      {language === "ar" ? "مركز التقارير والنسخ الاحتياطي وإدارة البيانات" : "Reports, Backup & Data Hub"}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {language === 'ar' ? 'إصدار التقارير المعتمدة، تصدير واستيراد البيانات، وأمان النسخ الاحتياطي للمنظومة.' : 'Generate official reports, export/import data, and manage secure cloud backups.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Card 1: Official Reports Hub */}
                    <div 
                      className="p-6 rounded-2xl border shadow-sm flex flex-col justify-between transition-all"
                      style={{ backgroundColor: cardColor, borderColor: borderColor }}
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-5 pb-3 border-b" style={{ borderColor: borderColor }}>
                          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-[#002D62] dark:text-[#93C5FD] flex items-center justify-center font-bold border border-blue-100 dark:border-blue-800/60 shadow-2xs">
                            <Printer size={20} />
                          </div>
                          <div>
                            <h3 className="font-black text-base" style={{ color: textColor }}>
                              {language === "ar" ? "التقارير وسجلات التدريب الرسمية" : "Official Reports & Records"}
                            </h3>
                            <p className="text-xs" style={{ color: textMuted }}>
                              {language === "ar" ? "تصدير وطباعة التقارير المعتمدة بصيغة PDF و Excel" : "Export & print official verified reports in PDF & Excel"}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3.5">
                          <div 
                            className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                            style={{ backgroundColor: isDark ? '#162B4D' : '#F8FAFC', borderColor: borderColor }}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 shrink-0 border border-amber-200 dark:border-amber-800/40">
                                <Calendar size={18} />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-black" style={{ color: isDark ? '#93C5FD' : '#002D62' }}>
                                  {language === 'ar' ? 'تقرير التحديث الشهري' : 'Monthly Update Report'}
                                </h4>
                                <p className="text-xs font-medium" style={{ color: textMuted }}>
                                  {language === 'ar' ? 'ملخص الدورات والحضور لكل شهر' : 'Monthly training sessions & attendance summary'}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowMonthlyReport(true)}
                              className="w-full sm:w-auto px-4 py-2.5 bg-[#002D62] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0 flex items-center justify-center gap-1.5 hover:scale-105"
                            >
                              <Mail size={14} />
                              <span>{language === 'ar' ? 'عرض التقرير' : 'Open Report'}</span>
                            </button>
                          </div>

                          <div 
                            className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                            style={{ backgroundColor: isDark ? '#162B4D' : '#F8FAFC', borderColor: borderColor }}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 shrink-0 border border-emerald-200 dark:border-emerald-800/40">
                                <Download size={18} />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-black" style={{ color: isDark ? '#93C5FD' : '#002D62' }}>
                                  {language === 'ar' ? 'تصدير السجل التدريبي العام (PDF)' : 'Full Training Register (PDF)'}
                                </h4>
                                <p className="text-xs font-medium" style={{ color: textMuted }}>
                                  {language === 'ar' ? 'كشف شامل لجميع سجلات المتدربين' : 'Comprehensive PDF training register for all trainees'}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                await safePrintReport('printable-area-admin', { title: 'General Training Register' });
                              }}
                              className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0 flex items-center justify-center gap-1.5 hover:scale-105"
                            >
                              <Printer size={14} />
                              <span>{language === 'ar' ? 'طباعة / PDF' : 'Print PDF'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Cloud Backup & Data Security */}
                    <div 
                      className="p-6 rounded-2xl border shadow-sm flex flex-col justify-between transition-all"
                      style={{ backgroundColor: cardColor, borderColor: borderColor }}
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-5 pb-3 border-b" style={{ borderColor: borderColor }}>
                          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-300 flex items-center justify-center font-bold border border-emerald-100 dark:border-emerald-800/60 shadow-2xs">
                            <Database size={20} />
                          </div>
                          <div>
                            <h3 className="font-black text-base" style={{ color: textColor }}>
                              {language === "ar" ? "أمان البيانات والنسخ الاحتياطي" : "Data Safety & Cloud Backup"}
                            </h3>
                            <p className="text-xs" style={{ color: textMuted }}>
                              {language === "ar" ? "حفظ واسترجاع نسخ احتياطية كاملة لقواعد بيانات المنظومة" : "Export and secure full system database backups"}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3.5">
                          <div 
                            className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                            style={{ backgroundColor: isDark ? '#162B4D' : '#F8FAFC', borderColor: borderColor }}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 shrink-0 border border-emerald-200 dark:border-emerald-800/40">
                                <Sparkles size={18} />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-black" style={{ color: isDark ? '#93C5FD' : '#002D62' }}>
                                  {language === 'ar' ? 'نسخ احتياطي فوري متكامل' : 'Instant Full System Backup'}
                                </h4>
                                <p className="text-xs font-medium" style={{ color: textMuted }}>
                                  {language === 'ar' ? 'تنزيل ملف نسخة احتياطية لكافة المستخدمين والسجلات والجلسات' : 'Download complete backup of users, records & sessions'}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => exportCloudBackup(users, records, upcomingSessions, cleanedData || [])}
                              className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0 flex items-center justify-center gap-1.5 hover:scale-105"
                            >
                              <Download size={14} />
                              <span>{language === 'ar' ? 'تنزيل النسخة' : 'Download'}</span>
                            </button>
                          </div>

                          <div 
                            className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                            style={{ backgroundColor: isDark ? '#162B4D' : '#F8FAFC', borderColor: borderColor }}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 shrink-0 border border-blue-200 dark:border-blue-800/40">
                                <UploadCloud size={18} />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-black" style={{ color: isDark ? '#93C5FD' : '#002D62' }}>
                                  {language === 'ar' ? 'استيراد ورفع ملف إكسيل محلي' : 'Import Local Excel File'}
                                </h4>
                                <p className="text-xs font-medium" style={{ color: textMuted }}>
                                  {syncFile ? syncFile.name : (language === 'ar' ? 'رفع شيت إكسيل لتحديث السجلات' : 'Upload Excel sheet to update records')}
                                </p>
                              </div>
                            </div>
                            <label
                              htmlFor="excel-upload-main"
                              className="w-full sm:w-auto px-4 py-2.5 bg-[#002D62] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0 flex items-center justify-center gap-1.5 hover:scale-105"
                            >
                              <UploadCloud size={14} />
                              <span>{language === 'ar' ? 'اختر ملف' : 'Browse'}</span>
                            </label>
                            <input type="file" id="excel-upload-main" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
                          </div>

                          <div 
                            className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                            style={{ backgroundColor: isDark ? '#3B1219' : '#FEF2F2', borderColor: isDark ? '#991B1B' : '#FECACA' }}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 shrink-0 border border-red-200 dark:border-red-800/40">
                                <ShieldAlert size={18} />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-black" style={{ color: isDark ? '#FCA5A5' : '#991B1B' }}>
                                  {language === 'ar' ? 'تصفير وتنظيف المنظومة (Factory Reset)' : 'System Factory Reset'}
                                </h4>
                                <p className="text-xs font-medium" style={{ color: isDark ? '#F87171' : '#B91C1C' }}>
                                  {language === 'ar' ? 'مسح بيانات الاختبار والتجهيز للإطلاق الرسمي (محمي برقم سري)' : 'Wipe trial data & prepare for clean launch (Password Protected)'}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setShowFactoryResetModal(true);
                                setResetSuccess(false);
                                setResetError("");
                                setResetPassword("");
                              }}
                              className="w-full sm:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0 flex items-center justify-center gap-1.5 hover:scale-105"
                            >
                              <Trash2 size={14} />
                              <span>{language === 'ar' ? 'تصفير المنظومة' : 'Reset System'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Course Materials & Resource Sharing */}
                  <div 
                    className="p-6 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#0F1E36] shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-3 mb-5 pb-3 border-b border-gray-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 flex items-center justify-center font-bold border border-amber-100 dark:border-amber-900/40">
                          <Share2 size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-gray-900 dark:text-white">
                            {language === "ar" ? "مشاركة المواد والمراجع التدريبية (Google Drive)" : "Course Materials & Resource Sharing"}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {language === "ar" ? "ربط أي دورة تدريبية برابط المواد العلمية والمجلدات لتظهر للمتدربين" : "Link training courses to Google Drive material folders for trainees"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleShareResource} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <div>
                        <label className="block text-xs font-bold mb-1.5 text-gray-700 dark:text-gray-200">
                          {language === "ar" ? "اختر الدورة التدريبية" : "Select Course"}
                        </label>
                        <select 
                          value={selectedCourseForResource} 
                          onChange={(e) => setSelectedCourseForResource(e.target.value)} 
                          className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#002D62] outline-none font-medium" 
                          dir="ltr" 
                        >
                          {dynamicCourses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1.5 text-gray-700 dark:text-gray-200">
                          {language === "ar" ? "رابط مجلد Google Drive / Material" : "Google Drive / Material Link"}
                        </label>
                        <input 
                          type="url" 
                          required 
                          value={resourceLink} 
                          onChange={(e) => setResourceLink(e.target.value)} 
                          placeholder="https://drive.google.com/..." 
                          className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#002D62] outline-none" 
                        />
                      </div>

                      <div>
                        <button 
                          type="submit" 
                          className="w-full bg-[#FFC000] hover:bg-yellow-500 text-[#001D42] font-black text-xs py-2.5 px-4 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer hover:scale-105"
                        >
                          <Share2 size={15} />
                          <span>{language === "ar" ? "حفظ وتعميم الرابط" : "Save & Share Resource"}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
                </>
              )}

              {["tools_logs"].includes(currentView) && (
                <div className="border rounded-xl p-6 shadow-sm transition-colors" style={{ backgroundColor: cardColor, borderColor: borderColor }}>
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-2xl font-bold border-l-4 border-[#FFC000] pl-3 rtl:pr-3 rtl:pl-0 rtl:border-r-4 rtl:border-l-0 flex items-center gap-2" style={{ color: isDark ? '#60a5fa' : '#002D62' }}>
                        <Clock className="text-[#FFC000]" size={24} /> {language === "ar" ? "نشاط المستخدمين وآخر ظهور" : "Active Users & Last Activity"}
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 rtl:pr-3 rtl:pl-0 pl-3">
                        {language === "ar" ? "متابعة أحدث المستخدمين النشطين وأجهزتهم ومواقعهم بدون استهلاك قراءات فايربيز" : "Track recent user activity, devices, and locations with zero extra database reads"}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Search by HR Code / Name */}
                      <div className="relative min-w-[220px]">
                        <Search size={15} className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={activeUsersSearchTerm}
                          onChange={(e) => setActiveUsersSearchTerm(e.target.value)}
                          placeholder={language === "ar" ? "البحث بالكود أو الاسم..." : "Search by HR code or name..."}
                          className="w-full pl-9 rtl:pl-3 rtl:pr-9 pr-7 py-1.5 rounded-lg border text-xs font-medium focus:ring-2 focus:ring-[#002D62] outline-none"
                          style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }}
                        />
                        {activeUsersSearchTerm && (
                          <button onClick={() => setActiveUsersSearchTerm("")} className="absolute right-2 rtl:right-auto rtl:left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <X size={12} />
                          </button>
                        )}
                      </div>

                      {/* Display Limit Toggle */}
                      <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5 border" style={{ borderColor: borderColor }}>
                        <button
                          onClick={() => setActiveUsersLimit(10)}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${activeUsersLimit === 10 ? 'bg-[#002D62] text-white shadow-xs' : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white'}`}
                        >
                          10
                        </button>
                        <button
                          onClick={() => setActiveUsersLimit(25)}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${activeUsersLimit === 25 ? 'bg-[#002D62] text-white shadow-xs' : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white'}`}
                        >
                          25
                        </button>
                        <button
                          onClick={() => setActiveUsersLimit('all')}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${activeUsersLimit === 'all' ? 'bg-[#002D62] text-white shadow-xs' : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white'}`}
                        >
                          {language === 'ar' ? 'الكل' : 'All'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const filteredActiveUsers = users
                      .filter(u => {
                        if (!activeUsersSearchTerm.trim()) return true;
                        const term = activeUsersSearchTerm.trim().toLowerCase();
                        return (u.name || '').toLowerCase().includes(term) || (u.hrCode || '').toLowerCase().includes(term) || (u.department || '').toLowerCase().includes(term);
                      })
                      .sort((a, b) => new Date(b.lastLogin || b.createdAt || 0).getTime() - new Date(a.lastLogin || a.createdAt || 0).getTime());

                    const displayedUsers = activeUsersLimit === 'all' ? filteredActiveUsers : filteredActiveUsers.slice(0, activeUsersLimit);

                    return displayedUsers.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left rtl:text-right border-collapse">
                          <thead>
                            <tr className="border-b font-bold" style={{ backgroundColor: tableHeaderBg, borderColor: borderColor, color: '#FFFFFF' }}>
                              <th className="p-3 text-white font-bold tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "المستخدم" : "User"}</th>
                              <th className="p-3 text-white font-bold tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "الكود الوظيفي" : "HR Code"}</th>
                              <th className="p-3 text-white font-bold tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "الصلاحية" : "Role"}</th>
                              <th className="p-3 text-white font-bold tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "آخر ظهور" : "Last Activity"}</th>
                              <th className="p-3 text-white font-bold tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "الجهاز والمتصفح" : "Device & Browser"}</th>
                              <th className="p-3 text-white font-bold tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "الموقع والـ IP" : "Location & IP"}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {displayedUsers.map(u => (
                              <tr key={u.id} className="border-b transition-colors hover:opacity-90" style={{ borderColor: borderColor, color: textColor }}>
                                <td className="p-3">
                                  <UserAvatarWithName user={u} />
                                </td>
                                <td className="p-3 font-mono font-bold">
                                  <DataField>{u.hrCode}</DataField>
                                </td>
                                <td className="p-3 whitespace-nowrap">
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-flex items-center gap-1.5 ${
                                    u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-300 dark:border-purple-700' :
                                    u.role === 'manager' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700' :
                                    u.role === 'supervisor' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700' :
                                    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                                  }`}>
                                    <span>{u.role === 'admin' ? '🛡️ Admin' : u.role === 'manager' ? '👔 Manager' : u.role === 'supervisor' ? '👷 Supervisor' : '🎓 Trainee'}</span>
                                  </span>
                                </td>
                                <td className="p-3">
                                  <span className="font-semibold text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
                                    {formatTimeAgo(u.lastLogin)}
                                  </span>
                                </td>
                                <td className="p-3 text-xs" style={{ color: textMuted }}>
                                  <div className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1">
                                    {u.lastDevice?.includes('Mobile') || u.lastDevice?.includes('iPhone') || u.lastDevice?.includes('Android') ? '📱' : '💻'}
                                    {u.lastDevice || 'Desktop'}
                                  </div>
                                  <div className="text-[11px] text-gray-400">{u.lastBrowser || 'Web Browser'}</div>
                                </td>
                                <td className="p-3 text-xs" style={{ color: textMuted }}>
                                  <div className="font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1">
                                    📍 {u.lastCity && u.lastCountry ? `${u.lastCity}, ${u.lastCountry}` : (u.lastCity || u.lastCountry || 'Egypt')}
                                  </div>
                                  <div className="font-mono text-[10px] text-gray-400">{u.lastIp || 'N/A'}</div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8" style={{ color: textMuted }}>
                        {language === "ar" ? "لا توجد نتائج مطابقة لبحث النشاط" : "No matching activity records found"}
                      </div>
                    );
                  })()}
                </div>
              )}

              {currentView === "tools_usage" && <FirebaseUsageModal onClose={() => setCurrentView("dashboard")} />}
            </div>
          )}
        </div>
      </div>

      {viewingImage && (
        <div className="fixed inset-0 z-[100] bg-slate-900/30 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer animate-fade-in" onClick={() => setViewingImage(null)}>
          <div className="relative bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-gray-200/80 shadow-2xl max-w-sm sm:max-w-md w-full flex flex-col items-center justify-center cursor-default" onClick={(e) => e.stopPropagation()}>
            <button className="absolute -top-3 -right-3 bg-white text-gray-700 hover:text-red-600 p-1.5 rounded-full shadow-lg border border-gray-200 transition-transform hover:scale-110 cursor-pointer" onClick={() => setViewingImage(null)}>
              <X size={20} />
            </button>
            <div className="w-full h-72 sm:h-84 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center border border-gray-100">
              <img src={viewingImage} alt="Profile" className="w-full h-full object-cover rounded-xl shadow-inner" />
            </div>
          </div>
        </div>
      )}

      {/* --- MANUAL ADD RECORD MODAL --- */}
      {showManualAddModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn">
            <div className="bg-[#002D62] text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-lg">{language === "ar" ? "إضافة سجل حضور يدوي" : "Add Manual Attendance"}</h3>
              <button onClick={() => setShowManualAddModal(false)} className="hover:text-gray-300 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleManualRecordSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{language === "ar" ? "الكود الوظيفي *" : "HR Code *"}</label>
                <input 
                  required 
                  type="text" 
                  placeholder="e.g. 100452"
                  value={manualRecord.hrCode} 
                  onChange={(e) => {
                    const val = e.target.value;
                    const found = users.find(u => (u.hrCode || '').toLowerCase() === val.trim().toLowerCase());
                    setManualRecord(prev => ({
                      ...prev,
                      hrCode: val,
                      traineeName: found ? found.name : prev.traineeName,
                      department: found ? found.department : prev.department
                    }));
                  }} 
                  className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-[#002D62] dark:bg-slate-700 dark:border-slate-600 dark:text-white" 
                  dir="ltr" 
                />
                <p className="text-[10px] text-gray-500 mt-1">{language === "ar" ? "إذا لم يكن للمتدرب حساب، سيتم إنشاء حساب وهمي له تلقائياً." : "If user doesn't exist, a shadow account will be created."}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{language === "ar" ? "الاسم" : "Name"}</label>
                  <input type="text" placeholder={language === "ar" ? "اسم المتدرب..." : "Trainee name..."} value={manualRecord.traineeName} onChange={(e) => setManualRecord({...manualRecord, traineeName: e.target.value})} className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-[#002D62] dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{language === "ar" ? "القسم" : "Department"}</label>
                    <button
                      type="button"
                      onClick={() => setCustomDeptMode(!customDeptMode)}
                      className="text-[11px] font-bold text-blue-600 dark:text-[#FFC000] hover:underline cursor-pointer"
                    >
                      {customDeptMode ? (language === 'ar' ? 'اختر من القائمة' : 'Select from list') : (language === 'ar' ? '✏️ كتابة قسم آخر' : '✏️ Type custom')}
                    </button>
                  </div>
                  {customDeptMode ? (
                    <input
                      type="text"
                      placeholder={language === "ar" ? "اكتب اسم القسم الجديد..." : "Type custom department..."}
                      value={manualRecord.department}
                      onChange={(e) => setManualRecord({...manualRecord, department: e.target.value})}
                      className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-[#002D62] dark:bg-slate-700 dark:border-slate-600 dark:text-white font-semibold"
                      autoFocus
                    />
                  ) : (
                    <select
                      value={manualRecord.department}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setCustomDeptMode(true);
                          setManualRecord({...manualRecord, department: ''});
                        } else {
                          setManualRecord({...manualRecord, department: e.target.value});
                        }
                      }}
                      className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-[#002D62] dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    >
                      <option value="">{language === "ar" ? "اختر القسم..." : "Select Department..."}</option>
                      {dynamicDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                      <option value="__custom__" className="font-bold text-blue-600 dark:text-[#FFC000]">
                        {language === "ar" ? "➕ كتابة قسم آخر مخصص..." : "➕ + Custom Department..."}
                      </option>
                    </select>
                  )}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{language === "ar" ? "الدورة التدريبية *" : "Course Name *"}</label>
                  <button
                    type="button"
                    onClick={() => setCustomCourseMode(!customCourseMode)}
                    className="text-[11px] font-bold text-blue-600 dark:text-[#FFC000] hover:underline cursor-pointer"
                  >
                    {customCourseMode ? (language === 'ar' ? 'اختر من القائمة' : 'Select from list') : (language === 'ar' ? '✏️ كتابة دورة أخرى' : '✏️ Type custom')}
                  </button>
                </div>
                {customCourseMode ? (
                  <input
                    required
                    type="text"
                    placeholder={language === "ar" ? "اكتب اسم الدورة التدريبية..." : "Type custom course title..."}
                    value={manualRecord.courseId}
                    onChange={(e) => setManualRecord({...manualRecord, courseId: e.target.value})}
                    className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-[#002D62] dark:bg-slate-700 dark:border-slate-600 dark:text-white font-semibold"
                    autoFocus
                  />
                ) : (
                  <select
                    required
                    value={manualRecord.courseId}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setCustomCourseMode(true);
                        setManualRecord({...manualRecord, courseId: ''});
                      } else {
                        setManualRecord({...manualRecord, courseId: e.target.value});
                      }
                    }}
                    className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-[#002D62] dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  >
                    <option value="">{language === "ar" ? "اختر الدورة التدريبية..." : "Select Course..."}</option>
                    {dynamicCourses.map((c) => <option key={c.id} value={c.title}>{c.title}</option>)}
                    <option value="__custom__" className="font-bold text-blue-600 dark:text-[#FFC000]">
                      {language === "ar" ? "➕ كتابة دورة تدريبية أخرى..." : "➕ + Custom Course..."}
                    </option>
                  </select>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{language === "ar" ? "التاريخ *" : "Date *"}</label>
                  <input required type="date" value={manualRecord.date} onChange={(e) => setManualRecord({...manualRecord, date: e.target.value})} className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-[#002D62] dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{language === "ar" ? "الدرجة" : "Score"}</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="85" 
                      value={manualRecord.score.replace('%', '')} 
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9.]/g, '');
                        setManualRecord({...manualRecord, score: raw ? `${raw}%` : ''});
                      }} 
                      className="w-full border rounded px-3 py-2 pr-9 outline-none focus:ring-2 focus:ring-[#002D62] dark:bg-slate-700 dark:border-slate-600 dark:text-white font-bold" 
                      dir="ltr" 
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-black text-sm pointer-events-none">%</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{language === "ar" ? "مدة الدورة (أيام)" : "Duration (Days)"}</label>
                  <input type="number" min="1" value={manualRecord.duration} onChange={(e) => setManualRecord({...manualRecord, duration: e.target.value})} className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-[#002D62] dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{language === "ar" ? "أيام الحضور" : "Attended Days"}</label>
                  <input type="number" min="1" value={manualRecord.attendedDays} onChange={(e) => setManualRecord({...manualRecord, attendedDays: e.target.value})} className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-[#002D62] dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-2 border-t mt-4 dark:border-slate-700">
                <button type="button" onClick={() => setShowManualAddModal(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:border-slate-600 dark:hover:bg-slate-700 transition-colors font-semibold">
                  {language === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button type="submit" className="px-6 py-2 bg-[#002D62] text-white rounded font-bold hover:bg-blue-900 transition-colors shadow-sm">
                  {language === "ar" ? "حفظ السجل" : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {finalizingSession && <FinalizeSessionModal session={finalizingSession} registeredUsers={users.filter(u => (finalizingSession.registeredUsers || []).includes(u.hrCode))} onClose={() => setFinalizingSession(null)} onFinalize={handleFinalizeSession} />}
      {showGlobalAnnouncement && <AnnouncementModal onClose={() => setShowGlobalAnnouncement(false)} />}
      {qrSession && <QRCodeModal session={qrSession} language={language} onClose={() => setQrSession(null)} />}
      {announcingSession && <AnnouncementModal session={announcingSession} onClose={() => setAnnouncingSession(null)} />}
      {showAnnouncementManager && <AnnouncementManagerModal sessionId={showAnnouncementManager === "GLOBAL" ? undefined : showAnnouncementManager} onClose={() => setShowAnnouncementManager(null)} />}
      {editingRecord && <EditRecordModal record={editingRecord} onClose={() => setEditingRecord(null)} />}
      {showUsageModal && <FirebaseUsageModal onClose={() => setShowUsageModal(false)} />}

      {/* --- SESSION ANNOUNCEMENT & EMAIL REVIEW MODAL --- */}
      {reviewModalSession && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div 
            className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border animate-scaleIn"
            style={{ 
              backgroundColor: isDark ? '#0D1E38' : '#FFFFFF', 
              borderColor: isDark ? 'rgba(148, 190, 255, 0.4)' : '#E2E8F0' 
            }}
          >
            {/* Modal Header */}
            <div className="bg-[#002D62] text-white px-6 py-4 flex justify-between items-center shrink-0 border-b border-blue-900">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FFC000] text-[#001D42] flex items-center justify-center font-bold shadow-xs">
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base md:text-lg leading-tight">
                    {language === 'ar' ? 'مراجعة بيانات الدورة قبل النشر والإرسال' : 'Review Session & Email Announcement'}
                  </h3>
                  <p className="text-xs text-blue-200">
                    {language === 'ar' ? 'تأكد من صحة التفاصيل قبل فتح الإيميل في Outlook' : 'Verify details before opening Outlook'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setReviewModalSession(null)} 
                className="text-gray-300 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-sm flex-1">
              {/* Course Info Cards */}
              <div 
                className="p-4 rounded-xl border space-y-3"
                style={{ 
                  backgroundColor: isDark ? '#162B4D' : '#F0F6FF', 
                  borderColor: isDark ? 'rgba(148, 190, 255, 0.3)' : '#BFDBFE' 
                }}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-black text-lg text-[#002D62] dark:text-[#93C5FD]">
                    {reviewModalSession.courseTitle}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="bg-[#FFC000] text-[#001D42] font-black text-xs px-2.5 py-1 rounded-lg shadow-2xs">
                      {reviewModalSession.sessionIteration ? getSessionOrdinalText(reviewModalSession.sessionIteration) : '1st Session'}
                    </span>
                    <span className="bg-blue-100 dark:bg-blue-900 text-[#002D62] dark:text-blue-200 font-mono font-bold text-xs px-2 py-1 rounded-lg">
                      #{reviewModalSession.sessionNumber || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs" style={{ color: textColor }}>
                  <div><strong>📅 {language === 'ar' ? 'تاريخ البدء:' : 'Start Date:'}</strong> {formatFullEmailDate(reviewModalSession.startDate)}</div>
                  <div><strong>📅 {language === 'ar' ? 'تاريخ الانتهاء:' : 'End Date:'}</strong> {formatFullEmailDate(reviewModalSession.endDate)}</div>
                  <div><strong>⏰ {language === 'ar' ? 'التوقيت:' : 'Time:'}</strong> {reviewModalSession.startTime || '09:00 AM'}</div>
                  <div><strong>📍 {language === 'ar' ? 'المكان:' : 'Location:'}</strong> {reviewModalSession.location}</div>
                  <div className="sm:col-span-2">
                    <strong>👥 {language === 'ar' ? 'الفئة المستهدفة:' : 'Target:'}</strong> {
                      reviewModalSession.targetParticipants === 'engineers' ? (language === 'ar' ? 'المهندسين' : 'Engineers')
                      : reviewModalSession.targetParticipants === 'technicians' ? (language === 'ar' ? 'الفنيين' : 'Technicians')
                      : (language === 'ar' ? 'مختلط (الجميع)' : 'Mixed')
                    }
                  </div>
                </div>
              </div>

              {/* Email Recipients Summary */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold" style={{ color: textColor }}>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    {language === 'ar' ? 'المستلمون في خانة To:' : 'To Recipients:'}
                  </span>
                  <span className="text-[11px] text-gray-500 font-mono">
                    {extractCleanEmails(reviewModalSession.toEmails).split(';').filter(Boolean).length} emails
                  </span>
                </div>
                <div 
                  className="p-2.5 rounded-lg border text-xs font-mono max-h-16 overflow-y-auto"
                  style={{ backgroundColor: inputBg, borderColor: borderColor, color: textMuted }}
                  dir="ltr"
                >
                  {reviewModalSession.toEmails || 'None'}
                </div>

                <div className="flex items-center justify-between text-xs font-bold pt-1" style={{ color: textColor }}>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#FFC000]"></span>
                    {language === 'ar' ? 'النسخة الإضافية في خانة CC:' : 'CC Recipients:'}
                  </span>
                  <span className="text-[11px] text-gray-500 font-mono">
                    {extractCleanEmails(reviewModalSession.ccEmails).split(';').filter(Boolean).length} emails
                  </span>
                </div>
                <div 
                  className="p-2.5 rounded-lg border text-xs font-mono max-h-16 overflow-y-auto"
                  style={{ backgroundColor: inputBg, borderColor: borderColor, color: textMuted }}
                  dir="ltr"
                >
                  {reviewModalSession.ccEmails || 'None'}
                </div>
              </div>

              {/* Email Body Live Preview */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold uppercase tracking-wider block" style={{ color: textMuted }}>
                  {language === 'ar' ? 'معاينة نص الرسالة في Outlook:' : 'Outlook Email Message Preview:'}
                </label>
                <div 
                  className="p-4 rounded-xl border font-sans text-xs whitespace-pre-wrap leading-relaxed shadow-2xs font-mono"
                  style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }}
                  dir="ltr"
                >
                  {reviewModalSession.emailBody}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div 
              className="p-4 px-6 border-t flex flex-col-reverse sm:flex-row justify-end items-center gap-3 shrink-0 flex-wrap"
              style={{ backgroundColor: isDark ? '#132543' : '#F8FAFC', borderColor: borderColor }}
            >
              <button
                type="button"
                onClick={() => setReviewModalSession(null)}
                className="w-full sm:w-auto px-4 py-2.5 border rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 font-bold transition-colors text-xs cursor-pointer"
              >
                {language === 'ar' ? 'الرجوع للتعديل' : 'Back to Edit'}
              </button>
              
              <button
                type="button"
                onClick={() => handleConfirmAndPublishSession('mailto')}
                className="w-full sm:w-auto px-4 py-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 font-bold rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Mail size={15} />
                <span>{language === 'ar' ? 'فتح Outlook المباشر' : 'Direct Mailto'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleConfirmAndPublishSession('eml')}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#FFC000] hover:bg-yellow-400 text-[#001D42] font-black rounded-xl shadow-md transition-all text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
              >
                <Sparkles size={16} />
                <span>{language === 'ar' ? 'نشر وفتح مسودة Outlook المنسقة (.eml) 🚀' : 'Publish & Open Outlook Draft (.eml) 🚀'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {showMonthlyReport && <MonthlyReportModal onClose={() => setShowMonthlyReport(false)} records={records} upcomingSessions={upcomingSessions} cleanedData={cleanedData || []} users={users || []} />}
      {previewRegisterSession && <TrainingRegisterPreviewModal session={previewRegisterSession} onClose={() => setPreviewRegisterSession(null)} users={users} records={records} cleanedData={cleanedData || []} />}
      {sessionToEditDirectly && <EditSessionModal session={sessionToEditDirectly} onClose={() => setSessionToEditDirectly(null)} />}
      {selectedUserToEdit && <EditUserModal user={selectedUserToEdit} onClose={() => setSelectedUserToEdit(null)} />}
      {qrSession && <QRCodeModal session={qrSession} onClose={() => setQrSession(null)} language={language} />}
      {manualAttendanceSession && (
        <ManualAttendanceModal
          session={manualAttendanceSession}
          allUsers={users}
          onClose={() => setManualAttendanceSession(null)}
          onSaveAttendance={handleSaveManualAttendance}
          language={language}
        />
      )}
      {attendanceReminderSession && (
        <AttendanceReminderModal
          session={attendanceReminderSession}
          allUsers={users}
          onClose={() => setAttendanceReminderSession(null)}
          onSendCustomReminder={handleSendAttendanceReminderCustom}
          language={language}
        />
      )}
      {finalizingSession && (
        <FinalizeSessionModal 
          session={finalizingSession} 
          registeredUsers={users.filter(u => finalizingSession.registeredUsers?.includes(u.hrCode) || finalizingSession.registeredUsers?.includes(u.id))} 
          onClose={() => setFinalizingSession(null)} 
          onFinalize={handleFinalizeSession} 
        />
      )}

      {/* ========================================================= */}
      {/* FACTORY RESET & DATABASE PURGE MODAL (PASSWORD PROTECTED) */}
      {/* ========================================================= */}
      {showFactoryResetModal && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[99999] flex items-center justify-center p-4 cursor-pointer animate-fade-in"
          onClick={() => { if (!isResetting) setShowFactoryResetModal(false); }}
        >
          <div 
            className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-red-300 dark:border-red-900 bg-white dark:bg-[#0D1E38] cursor-default animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-red-700 text-white px-6 py-4 flex justify-between items-center shrink-0 border-b border-red-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white text-red-700 font-bold shadow-xs">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <h3 className="font-black text-base md:text-lg leading-tight">
                    {language === 'ar' ? 'تصفير وتنظيف المنظومة (Factory Reset)' : 'System Factory Reset'}
                  </h3>
                  <p className="text-xs text-red-100">
                    {language === 'ar' ? 'حذف بيانات الاختبار وتجهيز المنظومة للبدء الرسمي' : 'Purge test data & prepare for official go-live'}
                  </p>
                </div>
              </div>
              {!isResetting && (
                <button 
                  type="button"
                  onClick={() => setShowFactoryResetModal(false)}
                  className="text-red-200 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-sm flex-1">
              {resetSuccess ? (
                <div className="text-center py-6 space-y-3 animate-fade-in">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mx-auto mb-2 border border-emerald-300 dark:border-emerald-700">
                    <Check size={32} />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                    {language === 'ar' ? 'تم تنظيف وتصفير المنظومة بنجاح! 🧼' : 'System Reset Completed Successfully!'}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-300 max-w-sm mx-auto leading-relaxed">
                    {language === 'ar' 
                      ? 'تم تنزيل نسخة احتياطية على جهازك ومسح كافة السجلات والجلسات والحسابات التجريبية. المنظومة جاهزة الآن لرفع قاعدة بيانات الإكسيل الجديدة المعتمدة.'
                      : 'A full backup was downloaded to your device, and all test records, sessions, and accounts were purged. The system is ready for official clean data.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowFactoryResetModal(false)}
                    className="mt-4 px-6 py-2.5 bg-[#002D62] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer hover:bg-blue-900 transition-all"
                  >
                    {language === 'ar' ? 'تم، إغلاق النافذة' : 'Done, Close'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleExecuteFactoryReset} className="space-y-4">
                  {/* Warning Box */}
                  <div className="p-3.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/40 text-red-800 dark:text-red-200 text-xs flex items-start gap-2.5 leading-relaxed">
                    <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>{language === 'ar' ? 'تنبيه أمان هام:' : 'Important Safety Note:'}</strong>
                      <p className="mt-0.5">
                        {language === 'ar'
                          ? 'سيقوم هذا الإجراء بحذف البيانات المحددة بالأسفل. سيتم تنزيل ملف نسخة احتياطية كاملة (JSON) تلقائياً على جهازك قبل البدء كإجراء أمان. حسابك كمسؤول رئيسي لن يتم حذفه.'
                          : 'This will purge selected test data. A full backup file (JSON) will be automatically downloaded to your device first. Your admin account will not be deleted.'}
                      </p>
                    </div>
                  </div>

                  {/* Selective Checkboxes */}
                  <div className="space-y-2 pt-1">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                      {language === 'ar' ? 'حدد البيانات المراد تصفيرها ومسحها:' : 'Select data to purge:'}
                    </label>
                    <div className="grid grid-cols-1 gap-2 text-xs">
                      <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={wipeOptions.records}
                          onChange={(e) => setWipeOptions({ ...wipeOptions, records: e.target.checked })}
                          className="rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                        />
                        <span className="font-bold text-slate-900 dark:text-white">
                          {language === 'ar' ? 'سجلات التدريب والدرجات السابقة (cleanedData & records)' : 'Training records & scores (cleanedData & records)'}
                        </span>
                      </label>

                      <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={wipeOptions.sessions}
                          onChange={(e) => setWipeOptions({ ...wipeOptions, sessions: e.target.checked })}
                          className="rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                        />
                        <span className="font-bold text-slate-900 dark:text-white">
                          {language === 'ar' ? 'الجلسات والدورات المفتوحة والمنتهية والملغية (sessions)' : 'Training sessions (active, completed & cancelled)'}
                        </span>
                      </label>

                      <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={wipeOptions.users}
                          onChange={(e) => setWipeOptions({ ...wipeOptions, users: e.target.checked })}
                          className="rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                        />
                        <span className="font-bold text-slate-900 dark:text-white">
                          {language === 'ar' ? 'حسابات المتدربين والمشرفين التجريبية (مع استثناء حساب الأدمن)' : 'Test user accounts (Excludes current Admin)'}
                        </span>
                      </label>

                      <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={wipeOptions.logs}
                          onChange={(e) => setWipeOptions({ ...wipeOptions, logs: e.target.checked })}
                          className="rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                        />
                        <span className="font-bold text-slate-900 dark:text-white">
                          {language === 'ar' ? 'سجلات النشاط وتسجيل الدخول (activity_logs & login_logs)' : 'Activity & login logs'}
                        </span>
                      </label>

                      <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={wipeOptions.announcements}
                          onChange={(e) => setWipeOptions({ ...wipeOptions, announcements: e.target.checked })}
                          className="rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                        />
                        <span className="font-bold text-slate-900 dark:text-white">
                          {language === 'ar' ? 'تصفير وحذف جميع التنبيهات والإعلانات للمستخدمين والمسؤولين (announcements & alerts)' : 'System announcements, notifications & alerts (announcements & alerts)'}
                        </span>
                      </label>

                      <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={wipeOptions.kpis}
                          onChange={(e) => setWipeOptions({ ...wipeOptions, kpis: e.target.checked })}
                          className="rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                        />
                        <span className="font-bold text-slate-900 dark:text-white">
                          {language === 'ar' ? 'تصفير عدادات الإحصائيات (KPIs)' : 'Reset system KPI statistics counters to 0'}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1.5 flex items-center gap-1.5">
                      <Lock size={14} className="text-red-600" />
                      <span>{language === 'ar' ? 'أدخل الرقم السري لحسابك لتأكيد العملية:' : 'Enter your Admin password to confirm:'}</span>
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none font-bold"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {resetError && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold flex items-center gap-2 animate-shake">
                      <AlertTriangle size={15} />
                      <span>{resetError}</span>
                    </div>
                  )}

                  {/* Modal Footer Buttons */}
                  <div className="flex gap-2 justify-end pt-3 border-t border-gray-100 dark:border-slate-800">
                    <button
                      type="button"
                      disabled={isResetting}
                      onClick={() => setShowFactoryResetModal(false)}
                      className="px-4 py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      {language === 'ar' ? 'إلغاء وتراجع' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={isResetting || !resetPassword}
                      className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer hover:scale-105"
                    >
                      {isResetting ? <Loader2 size={16} className="animate-spin" /> : <ShieldAlert size={16} />}
                      <span>{isResetting ? (language === 'ar' ? 'جاري النسخ الاحتياطي والتصفير...' : 'Resetting...') : (language === 'ar' ? 'تأكيد التصفير وبدء المسح' : 'Confirm & Reset System')}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Weekly Cloud Backup Confirmation Modal */}
      {showBackupPromptModal && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#0E1A32] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-300 dark:border-slate-700 animate-scale-in">
            <div className="bg-[#002D62] text-white p-4 sm:p-5 flex justify-between items-center border-b border-blue-900">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-400 text-[#002D62] font-black shadow-xs">
                  <Database size={22} />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg">
                    {language === 'ar' ? '🛡️ تذكير النسخ الاحتياطي الدوري' : '🛡️ Scheduled Cloud Backup'}
                  </h3>
                  <p className="text-[11px] text-blue-200">
                    {language === 'ar' ? 'حماية وأمان بيانات المنظومة الأسبوعي' : 'Weekly System Data Protection'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBackupPromptModal(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs sm:text-sm text-blue-950 dark:text-blue-100 font-bold leading-relaxed space-y-2">
                <p>
                  {language === 'ar'
                    ? 'مر أكثر من 7 أيام منذ آخر نسخة احتياطية. هل ترغب في تنزيل وحفظ ملف Excel رسمي شامل ومحدث على جهازك الآن؟'
                    : 'More than 7 days have passed since your last backup. Would you like to generate and download an official updated Excel backup file now?'}
                </p>
                <div className="pt-2 border-t border-blue-200/80 dark:border-blue-800/80 text-xs text-blue-800 dark:text-blue-200 grid grid-cols-2 gap-1.5 font-medium">
                  <span>✓ {language === 'ar' ? 'بيانات المستخدمين والمتدربين' : 'Users & Trainees'}</span>
                  <span>✓ {language === 'ar' ? 'دليل الدورات التدريبية' : 'Courses Catalog'}</span>
                  <span>✓ {language === 'ar' ? 'الجلسات المجدولة والمسجلين' : 'Scheduled Sessions'}</span>
                  <span>✓ {language === 'ar' ? 'سجل الحضور والتقييمات' : 'Attendance & Grades'}</span>
                </div>
              </div>

              <div className="flex gap-2.5 justify-end pt-2">
                <button
                  type="button"
                  disabled={isExportingBackup}
                  onClick={() => setShowBackupPromptModal(false)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
                >
                  {language === 'ar' ? 'تذكيري لاحقاً' : 'Remind Me Later'}
                </button>
                <button
                  type="button"
                  disabled={isExportingBackup}
                  onClick={handleConfirmBackup}
                  className="px-5 py-2.5 bg-[#002D62] hover:bg-blue-900 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
                >
                  {isExportingBackup ? <Loader2 size={16} className="animate-spin text-amber-400" /> : <FileSpreadsheet size={16} className="text-amber-400" />}
                  <span>{isExportingBackup ? (language === 'ar' ? 'جاري تجهيز وتنزيل الملف...' : 'Generating Backup...') : (language === 'ar' ? 'نعم، تنزيل النسخة الاحتياطية' : 'Yes, Download Backup')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Errors Modal (Admin Only) */}
      {showSystemErrorsModal && (
        <SystemErrorsModal onClose={() => setShowSystemErrorsModal(false)} />
      )}
    </div>
  );
};