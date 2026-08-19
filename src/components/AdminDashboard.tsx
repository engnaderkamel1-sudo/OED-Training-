import { FirebaseUsageModal } from './FirebaseUsageModal';
import { EditRecordModal } from './EditRecordModal';
import { EditUserModal } from './EditUserModal';
import React, { useState, useMemo, useEffect } from "react";
import { useAppContext } from "../context";
import { doc, setDoc, deleteDoc, updateDoc, deleteField, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { Clock, Bell, Share2, Users, Database, UploadCloud, RefreshCw, CheckCircle, BookOpen, Calendar, HardHat, Wrench, Settings, Printer, X, Download, Mail, Globe, Megaphone, Radio, Volume2, Sparkles, Trash2, Edit2, RotateCcw, MapPin, Tag, BellOff, PlusCircle, Save, Search } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
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
import { AnalyticsDashboardTab } from "./AnalyticsDashboardTab";
import { importFromOneDrive } from "../utils/dataSync";
import { exportCloudBackup } from "../utils/exportUtils";

declare const XLSX: any;

export const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
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
      navigator.vibrate([100, 50, 100]);
    }
  } catch (e) {
    console.log('Audio playback prevented or unsupported', e);
  }
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

  const DEFAULT_TO_EMAILS = `EQ-Maintenance Engineers-OC <EQ-MaintenanceEngineers-OC@orascom.com>; EQ-Maintenance Engineers-OFC <EQ-Maintenance-Engineers-OFC@orascom.com>; EQ-Maintenance Engineers-ORC <EQ-Maintenance-Engineers-ORC@orascom.com>`;

  const DEFAULT_CC_EMAILS = `Akram Amir <Akram.Amir@orascom.com>; Yasser Elsaied <Yasser.Elsaied@orascom.com>; Alaa Mohamed Dawoud Mansour <Alaa.Mohamed@orascom.com>; Amr Abdelkhalek <Amr.Abdelkhalek@orascom.com>; Athanassious Armya <Athanassious.Armya@orascom.com>; Ehab Wasfy <Ehab.Wasfy@orascom.com>; Emad Magdy Naguib Fahmy <Emad.Magdy@orascom.com>; Ibrahim Ahmed Eltayeb <Ibrahim.Eltayeb@orascom.com>; Mahmoud Morsi <Mahmoud.Morsi@orascom.com>; Mina Fekry <Mina.Fekry@orascom.com>; Mohamed Abd Elhai Abd Elaal <Mohamed.Elhai@orascom.com>; Mohamed Essam <Mohamed.Essam@orascom.com>; Mohamed Samir <Mohamed.Samir@orascom.com>; Mostafa Abdelatif <Mostafa.Abdelatif@orascom.com>; Peter Attia <Peter.Attia@orascom.com>; Rimon Ayad Daoud <Rimon.Ayad@orascom.com>; Milad Fouad <Milad.Fouad@orascom.com>; Samir Moen <Samir.Moen@orascom.com>; Samy Aziz Saleh <Samy.Aziz@orascom.com>; Amr Zoair <Amr.Zoair@orascom.com>; Ragy Ibrahim Adib <Ragy.Ibrahim@orascom.com>; Sherif Elmasry <Sherif.Elmasry@orascom.com>; Amr Hammed <Amr.Hammed@orascom.com>; Mohammed Mustafa <Mohamed.Mustafa@orascom.com>; Mohamed Abdalla Ali Hafiz <Mohamed.Hafiz@orascom.com>; Bishoy Shenoda <Bishoy.Shenoda@orascom.com>; Albert John <Albert.John@orascom.com>; Mina Magdy Ghattas Saad <Mina.Saad@orascom.com>; Mostafa Kamal <Mostafa.Kamal@orascom.com>; Sherif Elmasry <Sherif.Elmasry@orascom.com>; Mena Reda <mena.reda@orascom.com>`;

  const [toEmails, setToEmails] = useState<string>(() => {
    return localStorage.getItem('oed_saved_to_emails_v2') || DEFAULT_TO_EMAILS;
  });

  const [ccEmails, setCcEmails] = useState<string>(() => {
    return localStorage.getItem('oed_saved_cc_emails_v2') || DEFAULT_CC_EMAILS;
  });

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
    isEditing: boolean;
  } | null>(null);

  const [resourceLink, setResourceLink] = useState("");
  const [selectedCourseForResource, setSelectedCourseForResource] = useState(mockCourses[0]?.id || "");
  const [showUsageModal, setShowUsageModal] = useState(false);
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

  const handleExecuteRecordsSearch = async (fetchAll = false) => {
    if (fetchAll) {
      await fetchTrainingRecords();
    } else {
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
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncSuccess, setSyncSuccess] = useState(false);
  
  const pendingUsers = users.filter((u) => u.status === "pending");
  const allTrainees = users.filter((u) => u.role === "trainee");
  
  // -- GET USERS WITH PENDING DATA UPDATES --
  const usersWithPendingUpdates = users.filter(u => u.pendingUpdates && (u.pendingUpdates.email || u.pendingUpdates.hrCode));

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

  useEffect(() => {
    const checkAndRunAutoBackup = () => {
      const lastBackup = localStorage.getItem('last_auto_backup');
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      if (!lastBackup || Date.now() - parseInt(lastBackup, 10) > SEVEN_DAYS_MS) {
        setTimeout(() => {
          const success = exportCloudBackup(users, records, upcomingSessions, cleanedData || []);
          if (success) localStorage.setItem('last_auto_backup', Date.now().toString());
        }, 5000);
      }
    };
    if (users.length > 0) checkAndRunAutoBackup();
  }, [users.length]);

  const dynamicCourses = useMemo(() => {
    const map = new Map<string, string>();
    records.forEach((r) => { if (r.courseId) map.set(r.courseId, r.courseName || mockCourses.find((c) => c.id === r.courseId)?.title || r.courseId); });
    mockCourses.forEach((c) => { if (!map.has(c.id)) map.set(c.id, c.title); });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [records]);

  const dynamicDepartments = useMemo(() => {
    return Array.from(new Set(users.filter((u) => u.role === "trainee").map((u) => u.department).filter(Boolean)));
  }, [users]);

  const courseStats = useMemo(() => {
    return dynamicCourses.map((course) => {
      const courseRecords = records.filter((r) => r.courseId === course.id);
      const uniqueDates = Array.from(new Set(courseRecords.map((r) => r.attendanceDate)));
      return { courseName: course.title, attendees: courseRecords.length, sessions: uniqueDates.length };
    }).sort((a, b) => b.attendees - a.attendees);
  }, [dynamicCourses, records]);

  const departmentStats = useMemo(() => {
    const stats: Record<string, Set<string>> = {};
    records.forEach((r) => {
      const u = users.find((u) => u.id === r.userId || u.hrCode === r.userId || u.hrCode === `HR${r.userId}`);
      if (u && u.department) {
        if (!stats[u.department]) stats[u.department] = new Set();
        stats[u.department].add(r.userId);
      }
    });
    return Object.entries(stats).map(([name, set]) => ({ department: name, trainees: set.size })).sort((a, b) => b.trainees - a.trainees);
  }, [records, users]);

  const totalUniqueTrainees = useMemo(() => new Set(records.map((r) => r.userId)).size, [records]);
  const totalDistinctCourses = useMemo(() => new Set(records.map((r) => r.courseId)).size, [records]);

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
      
      if (user.pendingUpdates.hrCode) updatePayload.hrCode = user.pendingUpdates.hrCode;
      if (user.pendingUpdates.email) updatePayload.email = user.pendingUpdates.email;
      
      // Save to History (no undefined fields)
      const newHistoryRecord: any = {
        status: 'approved',
        processedAt: new Date().toISOString(),
        requestedAt: user.pendingUpdates.requestedAt || new Date().toISOString()
      };
      if (user.pendingUpdates.hrCode) newHistoryRecord.hrCode = user.pendingUpdates.hrCode;
      if (user.pendingUpdates.email) newHistoryRecord.email = user.pendingUpdates.email;
      
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
      
      // Save to History (no undefined fields)
      const newHistoryRecord: any = {
        status: 'rejected',
        processedAt: new Date().toISOString(),
        requestedAt: user.pendingUpdates.requestedAt || new Date().toISOString()
      };
      if (user.pendingUpdates.hrCode) newHistoryRecord.hrCode = user.pendingUpdates.hrCode;
      if (user.pendingUpdates.email) newHistoryRecord.email = user.pendingUpdates.email;

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
    if (!manualRecord.hrCode || !manualRecord.courseId || !manualRecord.date) {
      alert("Missing required fields"); return;
    }
    
    try {
      let targetUserId = manualRecord.hrCode;
      
      // Check if user exists (Real or Shadow)
      const existingUser = users.find(u => u.hrCode.toLowerCase() === manualRecord.hrCode.toLowerCase());
      
      if (!existingUser) {
        // Create Shadow Account
        const newShadowId = `derived_${Date.now()}`;
        const newShadowUser: User = {
          id: newShadowId,
          hrCode: manualRecord.hrCode,
          name: manualRecord.traineeName || `Trainee ${manualRecord.hrCode}`,
          department: manualRecord.department || "General",
          role: "trainee",
          status: "approved",
          phone: "00000000000",
          isShadowAccount: true, // Flag it as shadow
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, "users", newShadowId), newShadowUser);
        setUsers([...users, newShadowUser]);
        targetUserId = newShadowId; // Use the derived ID for the record
      } else {
        targetUserId = existingUser.id; // Use existing ID
      }

      const courseName = dynamicCourses.find(c => c.id === manualRecord.courseId)?.title || manualRecord.courseId;

      const newRecord: TrainingRecord = {
        id: `rec_manual_${Date.now()}`,
        userId: targetUserId,
        hrCode: manualRecord.hrCode,
        courseId: manualRecord.courseId,
        courseName: courseName,
        score: manualRecord.score || "N/A",
        attendanceDate: manualRecord.date,
        totalDays: manualRecord.duration,
        daysAttended: manualRecord.attendedDays,
        raw: {
          "Attended Days": manualRecord.attendedDays,
          "Score": manualRecord.score
        }
      } as any; // Cast as any because traineeName/department might be required in your specific logic

      // Add to cleanedData directly for simplicity, or just setRecords
      await setDoc(doc(db, "cleanedData", newRecord.id), newRecord);
      setRecords([...records, newRecord]);

      // Automatically update global KPIs summary in Firestore
      try {
        const u = users.find(u => u.hrCode === manualRecord.hrCode || u.id === targetUserId);
        const roleStr = `${u?.jobRole || ''} ${u?.department || ''} ${manualRecord.department || ''}`.toLowerCase();
        let eng = 0, tech = 0, op = 0;
        if (roleStr.includes('eng') || roleStr.includes('مهندس')) eng = 1;
        else if (roleStr.includes('tech') || roleStr.includes('فني')) tech = 1;
        else if (roleStr.includes('op') || roleStr.includes('مشغل')) op = 1;

        await updateDoc(doc(db, "systemSettings", "globalKPIs"), {
          totalParticipants: increment(1),
          totalEngineers: increment(eng),
          totalTechnicians: increment(tech),
          totalOperators: increment(op)
        });
      } catch (kpiErr) {}
      
      alert(language === 'ar' ? 'تم إضافة السجل وتحديث الإجماليات بنجاح!' : 'Record added and totals updated successfully!');
      setShowManualAddModal(false);
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
      isEditing: !!editingSessionId,
    });
  };

  const handleConfirmAndPublishSession = () => {
    if (!reviewModalSession) return;
    const { courseTitle, sessionNumber, sessionIteration: iter, startDate, endDate, startTime, location, targetParticipants, toEmails: toStr, ccEmails: ccStr, isEditing } = reviewModalSession;

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

      // --- AUTOMATIC EMAIL TRIGGER VIA OUTLOOK WITH CLEAN TO / CC LISTS ---
      try {
        const cleanTo = extractCleanEmails(toStr);
        const cleanCc = extractCleanEmails(ccStr);

        const sessionOrdinal = iter ? getSessionOrdinalText(iter) : (sessionNumber ? getSessionOrdinalText(sessionNumber) : '1st Session');
        const subject = sessionOrdinal 
          ? `Course Announcement ( ${courseTitle} - ${sessionOrdinal} )`
          : `Course Announcement ( ${courseTitle} )`;

        // Preserves trailing blank lines for Outlook's automatic signature
        const emailBody = `Dear Gents,

It is my pleasure to announce the beginning of the following course:

•	Course Name : ${courseTitle}${sessionOrdinal ? `\n•	Session : ${sessionOrdinal}` : ''}
•	Start Date: ${formatFullEmailDate(startDate)}  
•	End Date: ${formatFullEmailDate(endDate)}${startTime ? `\n•	Time: ${startTime}` : ''}${location ? `\n•	Location: ${location}` : ''}



`;

        const mailtoLink = `mailto:${encodeURIComponent(cleanTo)}?cc=${encodeURIComponent(cleanCc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
        
        window.location.href = mailtoLink;
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
    setEditingSessionId(session.id); 
    setSelectedCourseId(session.courseId || session.courseTitle); 
    setStartDate(session.startDate || ""); 
    setEndDate(session.endDate || ""); 
    setSessionNumber(session.sessionNumber || ""); 
    setSessionIteration(session.sessionIteration || "1");
    setLocation(session.location || DEFAULT_LOCATION); 
    setStartTime(session.startTime || DEFAULT_START_TIME); 
    setTargetParticipants(session.targetParticipants || ""); 
    setFeedbackLink(session.feedbackLink || ""); 
    if (session.additionalNotificationEmails && session.additionalNotificationEmails.length > 0) {
      setCcEmails(session.additionalNotificationEmails.join('; '));
    }
    window.scrollTo({ top: 300, behavior: "smooth" });
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

  const handleSendReminder = (sessionId: string, reminderType: "Standard" | "Final" = "Standard") => {
    const session = upcomingSessions.find((s) => s.id === sessionId);
    if (!session) return;
    const now = new Date();
    const timestamp = `${formatDateToStandard(now.toISOString().split("T")[0])} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const newLogItem: ReminderLogItem = { id: `rem_${Date.now()}`, type: reminderType, timestamp };
    const updatedSession: UpcomingSession = { ...session, reminderLog: [...(session.reminderLog || []), newLogItem] };
    const validTokens = users.filter(u => u.fcmToken).map(u => u.fcmToken as string);
    if (validTokens.length > 0) {
      sendPushNotification(language === "ar" ? "تنبيه دورة" : "Course Alert", `Reminder for ${session.courseTitle}`, validTokens);
    }
    setReminderToast(`Alert sent for [${session.courseTitle}]!`);
    updateUpcomingSession(updatedSession);
    setActiveReminderDropdown(null);
    setTimeout(() => setReminderToast(null), 4500);
  };

  const handleShareResource = (e: React.FormEvent) => {
    e.preventDefault(); alert(`Shared ${resourceLink} with attendees.`); setResourceLink("");
  };

  const handleClearAllFilters = () => { setSearchHrCode(""); setSearchTrainee(""); setSearchDepartment(""); setSelectedCourseFilter(""); setFromDateFilter(""); setToDateFilter(""); };

  const getAdminReportOptions = (): ReportOptions => {
    return {
      title: isSingleTraineeFiltered ? (language === "ar" ? "تقرير متدرب" : "Trainee Report") : (language === "ar" ? "تقرير شامل" : "Full Report"),
      language: (language === "ar" ? "ar" : "en") as "ar" | "en", records: filteredRecords,
      singleTrainee: singleTrainee ? { name: singleTrainee.name, hrCode: singleTrainee.hrCode, department: singleTrainee.department, profileImageUrl: singleTrainee.profileImageUrl } : null,
      fileName: isSingleTraineeFiltered ? `Report_${singleTrainee?.hrCode}.pdf` : "OED_Report.pdf",
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

  const filteredRecords = records.filter((r) => {
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
      if (r.courseId !== selectedCourseFilter && r.courseName !== selectedCourseFilter) return false;
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

  const kpiStats = useMemo(() => {
    if (filteredRecords.length === 0 && !hasActiveFilters && !recordsLoaded) {
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
      if (u) {
        const roleStr = (u.jobRole || "").toLowerCase();
        if (roleStr.includes("eng") || roleStr.includes("مهندس")) eng++;
        if (roleStr.includes("tech") || roleStr.includes("فني")) tech++;
        if (roleStr.includes("op") || roleStr.includes("مشغل")) op++;
      }
    });
    return { 
      totalCourses: coursesSet.size || (globalKPIs.totalCourses || courses.length), 
      totalSessions: sessionsSet.size || (globalKPIs.totalSessions || upcomingSessions.length), 
      totalParticipants: filteredRecords.length || globalKPIs.totalParticipants, 
      totalEngineers: eng || globalKPIs.totalEngineers, 
      totalTechnicians: tech || globalKPIs.totalTechnicians, 
      totalOperators: op || globalKPIs.totalOperators 
    };
  }, [filteredRecords, users, globalKPIs, hasActiveFilters, recordsLoaded, courses.length, upcomingSessions.length]);

  const uniqueTraineeHrCodes = useMemo(() => Array.from(new Set(filteredRecords.map((r) => users.find((u) => u.id === r.userId || u.hrCode === r.userId || u.hrCode === `HR${r.userId}`)?.hrCode).filter(Boolean))), [filteredRecords, users]);
  const isSingleTraineeFiltered = uniqueTraineeHrCodes.length === 1;
  const singleTrainee = isSingleTraineeFiltered ? users.find((u) => u.hrCode === uniqueTraineeHrCodes[0]) : null;
  const selectedCourseDetails = selectedCourseFilter ? dynamicCourses.find((c) => c.id === selectedCourseFilter) : null;
  const courseSessions: string[] = selectedCourseDetails ? Array.from(new Set(filteredRecords.map((r) => r.attendanceDate))) : [];

  return (
    <div className="min-h-screen pb-12 transition-colors duration-300" style={{ backgroundColor: bgColor }}>
      <div className="max-w-7xl mx-auto px-4 py-8 print:p-0">
        
        {/* زرار الطباعة */}
        <div className="flex w-full justify-end border-b-2 border-[#FFC000] pb-4 mb-6 print:hidden">
          {user?.role === 'admin' || user?.role === 'supervisor' ? (
            <button 
              onClick={handlePrint} 
              className="flex items-center gap-1 text-white px-4 py-2 rounded-md transition-colors shadow-sm text-sm font-bold hover:opacity-90"
              style={{ backgroundColor: isDark ? '#2563eb' : '#002D62' }}
            >
              <Printer size={18} />
              {language === "ar" ? "طباعة التقرير" : "Print"}
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
                  <button onClick={() => setUserManagementTab('pending')} className={`text-left rtl:text-right px-4 py-3 rounded-lg font-medium transition-colors flex justify-between items-center ${userManagementTab === 'pending' ? 'bg-[#002D62] text-white dark:bg-blue-600' : 'hover:bg-gray-100 dark:hover:bg-slate-800'}`} style={{ color: userManagementTab === 'pending' ? '#fff' : textMuted }}>
                    <span>{language === "ar" ? "طلبات معلقة" : "Pending Users"}</span>
                    {pendingUsers.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingUsers.length}</span>}
                  </button>
                  <button onClick={() => setUserManagementTab('updates')} className={`text-left rtl:text-right px-4 py-3 rounded-lg font-medium transition-colors flex justify-between items-center ${userManagementTab === 'updates' ? 'bg-[#002D62] text-white dark:bg-blue-600' : 'hover:bg-gray-100 dark:hover:bg-slate-800'}`} style={{ color: userManagementTab === 'updates' ? '#fff' : textMuted }}>
                    <span>{language === "ar" ? "تعديل البيانات" : "Data Updates"}</span>
                    {usersWithPendingUpdates.length > 0 && <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{usersWithPendingUpdates.length}</span>}
                  </button>
                  
                  {/* التابة الجديدة: سجل التعديلات المكتملة */}
                  <button onClick={() => setUserManagementTab('processed_updates')} className={`text-left rtl:text-right px-4 py-3 rounded-lg font-medium transition-colors flex justify-between items-center ${userManagementTab === 'processed_updates' ? 'bg-[#002D62] text-white dark:bg-blue-600' : 'hover:bg-gray-100 dark:hover:bg-slate-800'}`} style={{ color: userManagementTab === 'processed_updates' ? '#fff' : textMuted }}>
                    <span>{language === "ar" ? "سجل التعديلات" : "Processed Updates"}</span>
                  </button>

                  <button onClick={() => setUserManagementTab('processed')} className={`text-left rtl:text-right px-4 py-3 rounded-lg font-medium transition-colors ${userManagementTab === 'processed' ? 'bg-[#002D62] text-white dark:bg-blue-600' : 'hover:bg-gray-100 dark:hover:bg-slate-800'}`} style={{ color: userManagementTab === 'processed' ? '#fff' : textMuted }}>
                    {language === "ar" ? "طلبات مراجعة" : "Processed Requests"}
                  </button>
                  <button onClick={() => setUserManagementTab('deleted')} className={`text-left rtl:text-right px-4 py-3 rounded-lg font-medium transition-colors ${userManagementTab === 'deleted' ? 'bg-[#002D62] text-white dark:bg-blue-600' : 'hover:bg-gray-100 dark:hover:bg-slate-800'}`} style={{ color: userManagementTab === 'deleted' ? '#fff' : textMuted }}>
                    {language === "ar" ? "متدربين محذوفين" : "Deleted Trainees"}
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
                      <h2 className="text-xl font-semibold mb-4" style={{ color: textColor }}>{language === "ar" ? "طلبات معلقة" : "Pending Users"}</h2>
                      {pendingUsers.filter(u => {
                        if (!userSearchTerm.trim()) return true;
                        const term = userSearchTerm.trim().toLowerCase();
                        return (u.name || '').toLowerCase().includes(term) || (u.hrCode || '').toLowerCase().includes(term) || (u.email || '').toLowerCase().includes(term) || (u.department || '').toLowerCase().includes(term);
                      }).length > 0 ? (
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
                            {pendingUsers.filter(u => {
                              if (!userSearchTerm.trim()) return true;
                              const term = userSearchTerm.trim().toLowerCase();
                              return (u.name || '').toLowerCase().includes(term) || (u.hrCode || '').toLowerCase().includes(term) || (u.email || '').toLowerCase().includes(term) || (u.department || '').toLowerCase().includes(term);
                            }).map((u) => (
                              <tr key={u.id} className="border-b transition-colors" style={{ borderColor: borderColor, color: textColor }}>
                                {editingUserId === u.id ? (
                                  <>
                                    <td className="p-3"><input type="text" value={editFormData.hrCode || ""} onChange={(e) => setEditFormData({ ...editFormData, hrCode: e.target.value })} className="border rounded px-2 py-1 w-24" style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }} /></td>
                                    <td className="p-3"><input type="text" value={editFormData.name || ""} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} className="border rounded px-2 py-1 w-32" style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }} /></td>
                                    <td className="p-3"><input type="text" value={editFormData.department || ""} onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })} className="border rounded px-2 py-1 w-32" style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }} /></td>
                                    <td className="p-3"><select value={editFormData.role || "trainee"} onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as Role })} className="border rounded px-2 py-1 font-bold" style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }}><option value="trainee">Trainee</option><option value="supervisor">Supervisor</option><option value="manager">Manager</option><option value="admin">Admin</option></select></td>
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
                                    <td className="p-3"><DataField>{u.role}</DataField></td>
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
                                      {u.pendingUpdates?.hrCode && (
                                        <div>
                                          <span className="text-xs text-gray-500 block">{language === "ar" ? "الكود الوظيفي:" : "HR Code:"}</span>
                                          <input 
                                            type="text" 
                                            value={updateEditFormData.hrCode || ""} 
                                            onChange={(e) => setUpdateEditFormData({ ...updateEditFormData, hrCode: e.target.value })} 
                                            className="border rounded px-2 py-1 w-full mt-1 text-sm focus:ring-[#002D62] outline-none" 
                                            style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }} 
                                          />
                                        </div>
                                      )}
                                      {u.pendingUpdates?.email && (
                                        <div>
                                          <span className="text-xs text-gray-500 block">{language === "ar" ? "الإيميل:" : "Email:"}</span>
                                          <input 
                                            type="email" 
                                            value={updateEditFormData.email || ""} 
                                            onChange={(e) => setUpdateEditFormData({ ...updateEditFormData, email: e.target.value })} 
                                            className="border rounded px-2 py-1 w-full mt-1 text-sm focus:ring-[#002D62] outline-none" 
                                            style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }} 
                                            dir="ltr"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div>
                                      {u.pendingUpdates?.hrCode && (
                                        <div className="mb-1">
                                          <span className="text-xs text-gray-500 block">{language === "ar" ? "الكود الوظيفي:" : "HR Code:"}</span>
                                          <span className="line-through text-red-500 mr-2 rtl:ml-2 rtl:mr-0">{u.hrCode}</span>
                                          <span className="font-bold text-green-600">➔ {u.pendingUpdates.hrCode}</span>
                                        </div>
                                      )}
                                      {u.pendingUpdates?.email && (
                                        <div>
                                          <span className="text-xs text-gray-500 block">{language === "ar" ? "الإيميل:" : "Email:"}</span>
                                          <span className="line-through text-red-500 mr-2 rtl:ml-2 rtl:mr-0">{u.email || 'N/A'}</span>
                                          <span className="font-bold text-green-600">➔ {u.pendingUpdates.email}</span>
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
                                      <button onClick={() => { setEditingUpdateUserId(u.id); setUpdateEditFormData({ hrCode: u.pendingUpdates?.hrCode, email: u.pendingUpdates?.email }); }} className="flex items-center text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded hover:opacity-80 font-bold">
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
                                  {item.history.hrCode && (
                                    <div className="mb-1 text-sm">
                                      <span className="text-xs text-gray-500 mr-1 rtl:ml-1">{language === "ar" ? "الكود:" : "HR Code:"}</span>
                                      <span className="font-bold">{item.history.hrCode}</span>
                                    </div>
                                  )}
                                  {item.history.email && (
                                    <div className="text-sm">
                                      <span className="text-xs text-gray-500 mr-1 rtl:ml-1">{language === "ar" ? "الإيميل:" : "Email:"}</span>
                                      <span className="font-bold">{item.history.email}</span>
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
                                <td className="p-3">
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                    u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-300 dark:border-purple-700' :
                                    u.role === 'manager' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700' :
                                    u.role === 'supervisor' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700' :
                                    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                                  }`}>
                                    {u.role === 'admin' ? '🛡️ Admin' : u.role === 'manager' ? '👔 Manager' : u.role === 'supervisor' ? '👷 Supervisor' : '🎓 Trainee'}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${u.status === "approved" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                                    {u.status === "approved" ? (language === "ar" ? "مقبول" : "Approved") : (language === "ar" ? "مرفوض" : "Rejected")}
                                  </span>
                                </td>
                                <td className="p-3 flex gap-2">
                                  <button 
                                    onClick={() => setSelectedUserToEdit(u)} 
                                    className="flex items-center gap-1.5 text-blue-600 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all border border-blue-200 dark:border-blue-800 shadow-2xs"
                                  >
                                    <Edit2 size={13} /> {language === "ar" ? "تعديل الصلاحيات" : "Edit"}
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

                    {hasActiveFilters && (
                      <button onClick={handleClearAllFilters} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer animate-fade-in">
                        <RotateCcw size={14} className="text-red-600 dark:text-red-400" />
                        <span>{language === "ar" ? "إلغاء الفلترة" : "Clear Filters"}</span>
                      </button>
                    )}
                  </div>
                </div>

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
                    <div className="border rounded-lg p-4 mb-4 flex flex-wrap gap-4 items-center" style={{ backgroundColor: tableHeaderBg, borderColor: borderColor }}>
                      <h3 className="text-lg font-bold" style={{ color: isDark ? '#60a5fa' : '#002D62' }}>
                        <DataField>{selectedCourseDetails.title}</DataField>
                      </h3>
                      <div className="flex gap-2">
                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-semibold px-2.5 py-1 rounded">
                          {language === "ar" ? "عُقدت" : "Conducted"} {courseSessions.length} {language === "ar" ? "مرات" : "times"}
                        </span>
                        <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-semibold px-2.5 py-1 rounded">
                          {language === "ar" ? "إجمالي الحضور" : "Total Attendees"}: {filteredRecords.length}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {courseSessions.map((date) => {
                        const attendeesOnDate = filteredRecords.filter((r) => r.attendanceDate === date);
                        const isExpanded = expandedDates[date];
                        return (
                          <div key={date} className="border rounded-lg overflow-hidden" style={{ borderColor: borderColor }}>
                            <button onClick={() => toggleDateExpansion(date)} className="w-full px-4 py-3 flex justify-between items-center transition-colors" style={{ backgroundColor: tableHeaderBg }}>
                              <span className="font-bold" style={{ color: textColor }}>{formatDateToStandard(date)}</span>
                              <span className="text-sm" style={{ color: textMuted }}>{attendeesOnDate.length} {language === "ar" ? "حاضرين" : "attendees"}</span>
                            </button>
                            {isExpanded && (
                              <div className="p-4 overflow-x-auto" style={{ backgroundColor: cardColor }}>
                                <table className="w-full text-left border-collapse text-sm">
                                  <thead>
                                    <tr className="border-b" style={{ borderColor: borderColor, color: textMuted }}>
                                      <th className="pb-2 font-medium">{language === "ar" ? "الاسم" : "Name"}</th>
                                      <th className="pb-2 font-medium">{language === "ar" ? "القسم" : "Department"}</th>
                                      <th className="pb-2 font-medium">{language === "ar" ? "الدرجة" : "Score"}</th>
                                      <th className="p-3 align-top"><div className="font-semibold mb-2">{language === "ar" ? "إجراءات" : "Actions"}</div></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {attendeesOnDate.map((r) => {
                                      const u = users.find((u) => u.id === r.userId || u.hrCode === r.userId || u.hrCode === `HR${r.userId}`);
                                      return (
                                        <tr key={r.id} className="border-b last:border-0 transition-colors hover:opacity-80" style={{ borderColor: borderColor, color: textColor }}>
                                          <td className="py-2"><DataField>{u?.name || r.traineeName}</DataField></td>
                                          <td className="py-2"><DataField>{u?.department || r.department}</DataField></td>
                                          <td className="py-2 font-bold text-[#FFC000]">{r.score}</td>
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
                  <div className="overflow-x-auto border rounded-lg shadow-sm print:hidden" style={{ backgroundColor: cardColor, borderColor: borderColor }}>
                    <table className="w-full text-left border-collapse text-sm">
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
                              <select value={searchDepartment} onChange={(e) => setSearchDepartment(e.target.value)} className="w-full border rounded-md px-2 py-1 text-xs focus:ring-[#FFC000] appearance-none pr-6 shadow-2xs font-medium" style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }}>
                                <option value="">{language === "ar" ? "الكل" : "All"}</option>
                                {dynamicDepartments.map((d) => <option key={d} value={d}>{d}</option>)}
                              </select>
                              {searchDepartment && <button onClick={() => setSearchDepartment("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={12} /></button>}
                            </div>
                          </th>
                          <th className="p-3 !text-white" style={{ color: '#FFFFFF' }}>
                            <div className="font-extrabold mb-2 text-sm !text-white tracking-wide" style={{ color: '#FFFFFF' }}>{language === "ar" ? "الدورة التدريبية" : "Course Name"}</div>
                            <div className="relative">
                              <select value={selectedCourseFilter} onChange={(e) => setSelectedCourseFilter(e.target.value)} className="w-full border rounded-md px-2 py-1 text-xs focus:ring-[#FFC000] appearance-none pr-6 shadow-2xs font-medium" style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }}>
                                <option value="">{language === "ar" ? "الكل" : "All"}</option>
                                {dynamicCourses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
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
                <h2 className="text-xl font-semibold border-l-4 border-[#FFC000] pl-3 rtl:pr-3 rtl:pl-0 rtl:border-r-4 rtl:border-l-0" style={{ color: textColor }}>
                  {language === "ar" ? "الإحصائيات" : "Analytics"}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="border rounded-lg p-6 shadow-sm flex flex-col items-center justify-center transition-colors" style={{ backgroundColor: cardColor, borderColor: borderColor }}>
                  <span className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: textMuted }}>{language === "ar" ? "المتدربين الفريدين" : "Unique Trainees"}</span>
                  <span className="text-3xl font-bold text-[#FFC000]">{totalUniqueTrainees}</span>
                </div>
                <div className="border rounded-lg p-6 shadow-sm flex flex-col items-center justify-center transition-colors" style={{ backgroundColor: cardColor, borderColor: borderColor }}>
                  <span className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: textMuted }}>{language === "ar" ? "إجمالي السجلات" : "Total Records"}</span>
                  <span className="text-3xl font-bold" style={{ color: isDark ? '#60a5fa' : '#002D62' }}>{records.length}</span>
                </div>
                <div className="border rounded-lg p-6 shadow-sm flex flex-col items-center justify-center transition-colors" style={{ backgroundColor: cardColor, borderColor: borderColor }}>
                  <span className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: textMuted }}>{language === "ar" ? "الدورات المختلفة" : "Distinct Courses"}</span>
                  <span className="text-3xl font-bold text-green-600 dark:text-green-400">{totalDistinctCourses}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="border rounded-lg shadow-sm p-5 h-96 flex flex-col transition-colors" style={{ backgroundColor: cardColor, borderColor: borderColor }}>
                  <div className="z-10 pb-3 border-b flex-none" style={{ borderColor: borderColor }}>
                    <h3 className="font-bold text-base" style={{ color: isDark ? '#60a5fa' : '#002D62' }}>{language === "ar" ? "الدورات حسب الحضور" : "Courses by Attendance"}</h3>
                  </div>
                  <div className="overflow-y-auto flex-1 pt-3 pr-1 space-y-4">
                    {courseStats.map((stat, idx) => {
                      const maxAttendees = Math.max(...courseStats.map((s) => s.attendees)) || 1;
                      const percent = Math.round((stat.attendees / maxAttendees) * 100);
                      return (
                        <div key={idx}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium truncate mr-4" style={{ color: textColor }}><DataField>{stat.courseName}</DataField></span>
                            <span className="font-bold" style={{ color: textColor }}>{stat.attendees}</span>
                          </div>
                          <div className="w-full rounded-full h-2.5" style={{ backgroundColor: tableHeaderBg }}>
                            <div className="h-2.5 rounded-full" style={{ width: `${percent}%`, backgroundColor: isDark ? '#3b82f6' : '#002D62' }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="border rounded-lg shadow-sm p-5 h-96 flex flex-col transition-colors" style={{ backgroundColor: cardColor, borderColor: borderColor }}>
                  <div className="z-10 pb-3 border-b flex-none" style={{ borderColor: borderColor }}>
                    <h3 className="font-bold text-[#D97706] text-base">{language === "ar" ? "المتدربين حسب القسم" : "Trainees by Department"}</h3>
                  </div>
                  <div className="overflow-y-auto flex-1 pt-3 pr-1 space-y-4">
                    {departmentStats.map((stat, idx) => {
                      const maxTrainees = Math.max(...departmentStats.map((s) => s.trainees)) || 1;
                      const percent = Math.round((stat.trainees / maxTrainees) * 100);
                      return (
                        <div key={idx}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium truncate mr-4" style={{ color: textColor }}><DataField>{stat.department}</DataField></span>
                            <span className="font-bold" style={{ color: textColor }}>{stat.trainees}</span>
                          </div>
                          <div className="w-full rounded-full h-2.5" style={{ backgroundColor: tableHeaderBg }}>
                            <div className="h-2.5 rounded-full" style={{ width: `${percent}%`, backgroundColor: '#FFC000' }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-12 border-t pt-8" style={{ borderColor: borderColor }}>
                  <h3 className="font-bold text-xl mb-6" style={{ color: isDark ? '#60a5fa' : '#002D62' }}>{language === "ar" ? "مخططات متقدمة" : "Advanced Charts"}</h3>
                  <AnalyticsDashboardTab />
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
                                  setToEmails(DEFAULT_TO_EMAILS);
                                  localStorage.setItem('oed_saved_to_emails_v2', DEFAULT_TO_EMAILS);
                                }}
                                className="text-[10px] font-bold text-blue-600 dark:text-blue-300 hover:underline cursor-pointer bg-white/60 dark:bg-white/10 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-700"
                              >
                                {language === 'ar' ? '🔄 استعادة الافتراضي' : '🔄 Reset to Default'}
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
                                  setCcEmails(DEFAULT_CC_EMAILS);
                                  localStorage.setItem('oed_saved_cc_emails_v2', DEFAULT_CC_EMAILS);
                                }}
                                className="text-[10px] font-bold text-blue-600 dark:text-blue-300 hover:underline cursor-pointer bg-white/60 dark:bg-white/10 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-700"
                              >
                                {language === 'ar' ? '🔄 استعادة الافتراضي' : '🔄 Reset to Default'}
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
                      </div>
                      <div className="flex gap-2 mt-6">
                        <button type="submit" className="flex-1 bg-[#FFC000] text-[#001D42] font-black py-3 px-6 rounded-xl hover:bg-yellow-500 transition-colors shadow-md cursor-pointer">
                          {editingSessionId ? (language === "ar" ? "تحديث الجلسة" : "Update Session") : (language === "ar" ? "نشر التنبيه" : "Publish & Push")}
                        </button>
                        {editingSessionId && (
                          <button type="button" onClick={handleCancelEdit} className="font-bold py-3 px-4 rounded transition-colors" style={{ backgroundColor: tableHeaderBg, color: textColor }}>
                            {language === "ar" ? "إلغاء التعديل" : "Cancel Edit"}
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                )}
                
                {["tools", "tools_manage"].includes(currentView) && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4" style={{ color: textColor }}>{language === "ar" ? "إدارة الجلسات القادمة" : "Manage Upcoming Sessions"}</h2>
                    {upcomingSessions.length === 0 ? (
                      <div className="text-center py-12 px-4 border border-dashed rounded-lg transition-colors" style={{ backgroundColor: tableHeaderBg, borderColor: borderColor }}>
                        <Calendar className="mx-auto h-12 w-12 mb-3" style={{ color: textMuted }} />
                        <p className="font-medium" style={{ color: textMuted }}>{language === "ar" ? "لا توجد جلسات قادمة" : "No Upcoming Sessions"}</p>
                      </div>
                    ) : (
                      <ul className="space-y-4">
                        {upcomingSessions.map((session, index) => (
                          <li key={session.id || index}>
                            <SessionCard session={session} isAdminView={true} onEdit={handleStartEdit} onSendReminder={handleSendReminder} onAnnounceRequest={setAnnouncingSession} onManageAnnouncementsRequest={setShowAnnouncementManager} onFinalizeRequest={setFinalizingSession} onPrintRegisterRequest={async (session) => await downloadTrainingRegisterPDF(session, users, records)} onShowQR={setQrSession} onToggleFeedback={handleToggleFeedback} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* TNA Section */}
              {["tools", "tools_reports"].includes(currentView) && (
                <>
                  <div className="border-t pt-8 mt-8" style={{ borderColor: borderColor }}>
                    <h2 className="text-2xl font-bold mb-6 border-l-4 border-[#FFC000] pl-3 rtl:pr-3 rtl:pl-0 rtl:border-r-4 rtl:border-l-0" style={{ color: isDark ? '#60a5fa' : '#002D62' }}>{language === "ar" ? "تحليل الاحتياجات التدريبية" : "Training Needs Analysis"}</h2>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={tnaData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={borderColor} />
                          <XAxis dataKey="name" stroke={textMuted} />
                          <YAxis stroke={textMuted} />
                          <Tooltip cursor={{ fill: tableHeaderBg }} contentStyle={{ backgroundColor: cardColor, borderColor: borderColor, color: textColor }} />
                          <Bar dataKey="count" fill="#FFC000" radius={[4, 4, 0, 0]} name={language === "ar" ? "الطلبات" : "Requests"} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t pt-8 mt-8" style={{ borderColor: borderColor }}>
                    <div className="max-w-md">
                      <h2 className="text-2xl font-bold mb-6 border-l-4 border-[#FFC000] pl-3 rtl:pr-3 rtl:pl-0 rtl:border-r-4 rtl:border-l-0" style={{ color: isDark ? '#60a5fa' : '#002D62' }}>{language === "ar" ? "مشاركة الموارد" : "Resource Sharing"}</h2>
                      <form onSubmit={handleShareResource} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: textMuted }}>{language === "ar" ? "اسم الدورة" : "Course Name"}</label>
                          <select value={selectedCourseForResource} onChange={(e) => setSelectedCourseForResource(e.target.value)} className="w-full border rounded px-3 py-2 font-sans focus:ring-[#002D62]" dir="ltr" style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }}>
                            {dynamicCourses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: textMuted }}>{language === "ar" ? "رابط جوجل درايف" : "Google Drive Link"}</label>
                          <input type="url" required value={resourceLink} onChange={(e) => setResourceLink(e.target.value)} placeholder="https://drive.google.com/..." className="w-full border rounded px-3 py-2 focus:ring-[#002D62]" style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }} />
                        </div>
                        <button type="submit" className="text-white font-bold py-2 px-6 rounded transition-colors flex items-center" style={{ backgroundColor: isDark ? '#2563eb' : '#002D62' }}>
                          <Share2 size={18} className="mr-2 rtl:ml-2 rtl:mr-0" /> {language === "ar" ? "مشاركة" : "Share"}
                        </button>
                      </form>
                    </div>

                    <div>
                      {/* SYSTEM VERSION CONTROL (ADMIN ONLY) */}
                      {user?.role === 'admin' && (
                        <div 
                          className="p-5 rounded-2xl border shadow-sm mb-8 transition-all"
                          style={{ 
                            backgroundColor: cardColor, 
                            borderColor: isDark ? 'rgba(255, 192, 0, 0.35)' : '#FDE68A' 
                          }}
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-[#FFC000] text-[#001D42] flex items-center justify-center font-black shadow-xs">
                                v
                              </div>
                              <div>
                                <h3 className="font-bold text-base text-[#002D62] dark:text-[#93C5FD]">
                                  {language === "ar" ? "التحكم في رقم إصدار المنظومة (System Version Control)" : "System Version Control"}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {language === "ar" ? "خاص بالمسؤول فقط: تعديل وتعميم رقم الإصدار الجديد لجميع المستخدمين" : "Admin Only: Update and broadcast system release version to all users"}
                                </p>
                              </div>
                            </div>
                            <span className="bg-blue-100 dark:bg-blue-900/60 text-[#002D62] dark:text-blue-200 font-mono font-bold text-xs px-3 py-1 rounded-full border border-blue-200 dark:border-blue-700">
                              {language === 'ar' ? 'الإصدار الحالي:' : 'Current:'} v{systemVersion}
                            </span>
                          </div>

                          {versionSuccessToast && (
                            <div className="bg-green-50 dark:bg-green-900/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-xs font-bold p-2.5 rounded-xl mb-3 flex items-center gap-2 animate-fadeIn">
                              <CheckCircle size={16} />
                              <span>{language === 'ar' ? `تم حفظ وتعميم الإصدار الجديد (v${systemVersion}) بنجاح على مستوى النظام!` : `System version updated to v${systemVersion} successfully!`}</span>
                            </div>
                          )}

                          <form onSubmit={handleSaveSystemVersion} className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                            <div className="relative flex-1 min-w-[200px]">
                              <span className="absolute inset-y-0 left-3 rtl:left-auto rtl:right-3 flex items-center text-gray-400 font-mono font-bold text-sm">
                                v
                              </span>
                              <input 
                                type="text" 
                                required 
                                value={versionInput} 
                                onChange={(e) => setVersionInput(e.target.value)} 
                                placeholder="1.0.0" 
                                className="w-full border rounded-xl pl-8 rtl:pl-3 rtl:pr-8 pr-3 py-2 text-sm font-mono font-bold focus:ring-2 focus:ring-[#002D62]" 
                                style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }} 
                              />
                            </div>
                            <button 
                              type="submit" 
                              disabled={isSavingVersion || versionInput.trim() === systemVersion}
                              className="bg-[#002D62] hover:bg-blue-900 disabled:opacity-50 text-white font-bold text-xs sm:text-sm px-5 py-2 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2 shrink-0"
                            >
                              {isSavingVersion ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                              <span>{language === "ar" ? "حفظ وتعميم الإصدار" : "Broadcast Version"}</span>
                            </button>
                          </form>
                        </div>
                      )}

                      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
                        <h2 className="text-2xl font-bold border-l-4 border-[#FFC000] pl-3 rtl:pr-3 rtl:pl-0 rtl:border-r-4 rtl:border-l-0" style={{ color: isDark ? '#FFFFFF' : '#002D62' }}>{language === "ar" ? "إدارة البيانات والنسخ الاحتياطي" : "Data Management & Backup"}</h2>
                        <div className="flex flex-wrap gap-2">
                          {user?.role === 'admin' && (
                            <>
                              <button onClick={() => setShowGlobalAnnouncement(true)} className="flex items-center gap-2 bg-white dark:bg-[#132543] border border-red-500/40 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 px-3.5 py-2 rounded-xl font-bold transition-colors shadow-sm text-xs md:text-sm cursor-pointer"><Globe size={16} className="text-red-600 dark:text-red-400" />{language === 'ar' ? 'إعلان عام' : 'Global Broadcast'}</button>
                              <button onClick={() => setShowAnnouncementManager("GLOBAL")} className="flex items-center gap-2 bg-white dark:bg-[#132543] border border-blue-400/40 text-[#002D62] dark:text-[#85C0FF] hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3.5 py-2 rounded-xl font-bold transition-colors shadow-sm text-xs md:text-sm cursor-pointer"><Megaphone size={16} className="text-blue-600 dark:text-blue-400" />{language === 'ar' ? 'إدارة الإعلانات' : 'Manage Announcements'}</button>
                            </>
                          )}
                          <button onClick={() => setShowMonthlyReport(true)} className="flex items-center gap-2 bg-[#002D62] hover:bg-blue-900 text-white border border-blue-400/20 px-3.5 py-2 rounded-xl font-bold transition-colors shadow-sm text-xs md:text-sm cursor-pointer"><Mail size={16} />{language === 'ar' ? 'تقرير التحديث الشهري' : 'Monthly Update Report'}</button>
                          <button onClick={() => exportCloudBackup(users, records, upcomingSessions, cleanedData || [])} className="flex items-center gap-2 bg-white dark:bg-[#132543] border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 px-3.5 py-2 rounded-xl font-bold transition-colors shadow-sm text-xs md:text-sm cursor-pointer"><Download size={16} className="text-emerald-600 dark:text-emerald-400" />{language === 'ar' ? 'نسخ احتياطي للبيانات' : 'Backup Data'}</button>
                        </div>
                      </div>
                      <p className="mb-6" style={{ color: textMuted }}>
                        {language === "ar" ? "ضع رابط ملف الإكسيل من OneDrive لمزامنة السجلات." : "Provide a OneDrive link to your Excel file to synchronize training records."}
                        <br /><span className="px-1 py-0.5 rounded text-sm mt-1 inline-block" style={{ backgroundColor: tableHeaderBg, color: textColor }}>ID, Participant Name, Department, Total Courses, Date 1, Duration 1, Score 1</span>
                      </p>
                      {syncSuccess && (
                        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded mb-6 flex items-center">
                          <CheckCircle size={20} className="mr-2 rtl:ml-2 rtl:mr-0 flex-shrink-0" /><span className="font-medium">{language === "ar" ? "تمت المزامنة بنجاح!" : "Data successfully synced from OneDrive!"}</span>
                        </div>
                      )}
                      <div className="mb-6">
                        <label className="block text-sm font-medium mb-2" style={{ color: textColor }}>{language === "ar" ? "رابط ملف OneDrive" : "OneDrive Shared Link"}</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none rtl:left-auto rtl:right-0 rtl:pl-0 rtl:pr-3"><Database size={18} style={{ color: textMuted }} /></div>
                          <input type="url" placeholder={language === "ar" ? "ضع الرابط هنا..." : "Paste your OneDrive Excel link here..."} value={syncLink} onChange={(e) => setSyncLink(e.target.value)} className="w-full border rounded-lg pl-10 rtl:pl-3 rtl:pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-[#002D62]" dir="ltr" style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }} />
                        </div>
                      </div>
                      {isSyncing && (
                        <div className="mb-6">
                          <div className="flex justify-between text-sm mb-1" style={{ color: textMuted }}><span>{language === "ar" ? "جاري جلب ومزامنة البيانات..." : "Fetching & Syncing..."}</span><span>{syncProgress}%</span></div>
                          <div className="w-full rounded-full h-2.5" style={{ backgroundColor: tableHeaderBg }}><div className="h-2.5 rounded-full transition-all duration-300" style={{ width: `${syncProgress}%`, backgroundColor: isDark ? '#3b82f6' : '#002D62' }}></div></div>
                        </div>
                      )}
                      <button onClick={handleSyncData} disabled={!syncLink.trim() || isSyncing} className={`w-full font-black py-3 px-6 rounded-lg transition-colors flex justify-center items-center ${!syncLink.trim() || isSyncing ? "opacity-50 cursor-not-allowed" : "bg-[#FFC000] text-[#001D42] hover:bg-yellow-500 shadow cursor-pointer"}`}>
                        <RefreshCw size={18} className={`mr-2 rtl:ml-2 rtl:mr-0 ${isSyncing ? "animate-spin" : ""}`} />
                        {isSyncing ? (language === "ar" ? "جاري المزامنة..." : "Syncing...") : (language === "ar" ? "مزامنة من OneDrive" : "Sync from OneDrive")}
                      </button>
                      <div className="flex items-center my-6">
                        <div className="flex-grow border-t" style={{ borderColor: borderColor }}></div>
                        <span className="mx-4 text-sm font-medium" style={{ color: textMuted }}>{language === "ar" ? "أو" : "OR"}</span>
                        <div className="flex-grow border-t" style={{ borderColor: borderColor }}></div>
                      </div>
                      <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center transition-colors" style={{ backgroundColor: tableHeaderBg, borderColor: borderColor }}>
                        <UploadCloud size={48} className="mb-4" style={{ color: textMuted }} />
                        <input type="file" id="excel-upload" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
                        <label htmlFor="excel-upload" className="cursor-pointer border px-4 py-2 rounded shadow-sm flex items-center mb-2 font-medium transition-colors" style={{ backgroundColor: cardColor, borderColor: borderColor, color: textColor }}>
                          <UploadCloud size={18} className="mr-2 rtl:ml-2 rtl:mr-0" />
                          {language === "ar" ? "اختر ملف إكسيل محلي" : "Select Local Excel File"}
                        </label>
                        {syncFile && <p className="text-sm text-green-600 dark:text-green-400 font-medium">Selected: {syncFile.name}</p>}
                      </div>
                    </div>
                  </div>
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
                                <td className="p-3">
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                    u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-300 dark:border-purple-700' :
                                    u.role === 'manager' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700' :
                                    u.role === 'supervisor' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700' :
                                    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                                  }`}>
                                    {u.role === 'admin' ? '🛡️ Admin' : u.role === 'manager' ? '👔 Manager' : u.role === 'supervisor' ? '👷 Supervisor' : '🎓 Trainee'}
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
                <input required type="text" value={manualRecord.hrCode} onChange={(e) => setManualRecord({...manualRecord, hrCode: e.target.value})} className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-[#002D62] dark:bg-slate-700 dark:border-slate-600 dark:text-white" dir="ltr" />
                <p className="text-[10px] text-gray-500 mt-1">{language === "ar" ? "إذا لم يكن للمتدرب حساب، سيتم إنشاء حساب وهمي له." : "If user doesn't exist, a shadow account will be created."}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{language === "ar" ? "الاسم" : "Name"}</label>
                  <input type="text" value={manualRecord.traineeName} onChange={(e) => setManualRecord({...manualRecord, traineeName: e.target.value})} className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-[#002D62] dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{language === "ar" ? "القسم" : "Department"}</label>
                  <select value={manualRecord.department} onChange={(e) => setManualRecord({...manualRecord, department: e.target.value})} className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-[#002D62] dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                    <option value="">{language === "ar" ? "اختر..." : "Select..."}</option>
                    {dynamicDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{language === "ar" ? "الدورة التدريبية *" : "Course Name *"}</label>
                <select required value={manualRecord.courseId} onChange={(e) => setManualRecord({...manualRecord, courseId: e.target.value})} className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-[#002D62] dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                  <option value="">{language === "ar" ? "اختر..." : "Select..."}</option>
                  {dynamicCourses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{language === "ar" ? "التاريخ *" : "Date *"}</label>
                  <input required type="date" value={manualRecord.date} onChange={(e) => setManualRecord({...manualRecord, date: e.target.value})} className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-[#002D62] dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{language === "ar" ? "الدرجة" : "Score"}</label>
                  <input type="text" placeholder="e.g. 85%" value={manualRecord.score} onChange={(e) => setManualRecord({...manualRecord, score: e.target.value})} className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-[#002D62] dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
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
                  className="p-4 rounded-xl border font-sans text-xs whitespace-pre-wrap leading-relaxed shadow-2xs"
                  style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }}
                  dir="ltr"
                >
{`Dear Gents,

It is my pleasure to announce the beginning of the following course:

•	Course Name : ${reviewModalSession.courseTitle}${reviewModalSession.sessionIteration ? `\n•	Session : ${getSessionOrdinalText(reviewModalSession.sessionIteration)}` : (reviewModalSession.sessionNumber ? `\n•	Session : ${getSessionOrdinalText(reviewModalSession.sessionNumber)}` : '')}
•	Start Date: ${formatFullEmailDate(reviewModalSession.startDate)}  
•	End Date: ${formatFullEmailDate(reviewModalSession.endDate)}${reviewModalSession.startTime ? `\n•	Time: ${reviewModalSession.startTime}` : ''}${reviewModalSession.location ? `\n•	Location: ${reviewModalSession.location}` : ''}`}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div 
              className="p-4 px-6 border-t flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0"
              style={{ backgroundColor: isDark ? '#132543' : '#F8FAFC', borderColor: borderColor }}
            >
              <button
                type="button"
                onClick={() => setReviewModalSession(null)}
                className="px-5 py-2.5 border rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 font-bold transition-colors text-sm cursor-pointer"
              >
                {language === 'ar' ? 'الرجوع للتعديل' : 'Back to Edit'}
              </button>
              <button
                type="button"
                onClick={handleConfirmAndPublishSession}
                className="px-6 py-2.5 bg-[#FFC000] hover:bg-yellow-400 text-[#001D42] font-black rounded-xl shadow-md transition-all text-sm flex items-center justify-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
              >
                <Mail size={16} />
                <span>{language === 'ar' ? 'تأكيد النشر وفتح الإيميل في Outlook' : 'Confirm & Open Outlook'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {showMonthlyReport && <MonthlyReportModal onClose={() => setShowMonthlyReport(false)} records={records} upcomingSessions={upcomingSessions} />}
      {selectedUserToEdit && <EditUserModal user={selectedUserToEdit} onClose={() => setSelectedUserToEdit(null)} />}
    </div>
  );
};