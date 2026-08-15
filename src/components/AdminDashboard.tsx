import React, { useState, useMemo, useEffect } from "react";
import { useAppContext } from "../context";
import { mockCourses, mockRequests } from "../data";
import { ReminderLogItem, UpcomingSession } from "../types";
import {
  Bell,
  Share2,
  Users,
  Database,
  UploadCloud,
  RefreshCw,
  CheckCircle,
  BookOpen,
  Calendar,
  HardHat,
  Wrench,
  Settings,
  Printer,
  X,
  Download,
  Mail,
  Globe,
  Megaphone,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatScore, formatDateToStandard } from "../utils/formatters";
import {
  safePrintReport,
  downloadReportPDF,
  ReportOptions,
} from "../utils/printUtils";
import { DataField } from "./DataField";
import { SessionCard } from "./SessionCard";
import { FinalizeSessionModal } from "./FinalizeSessionModal";
import { AnnouncementModal } from "./AnnouncementModal";
import { AnnouncementManagerModal } from "./AnnouncementManagerModal";
import { MonthlyReportModal } from "./MonthlyReportModal";
import { AnalyticsDashboardTab } from "./AnalyticsDashboardTab";
import { importFromOneDrive } from "../utils/dataSync";
import { exportCloudBackup } from "../utils/exportUtils";
declare const XLSX: any;
export const AdminDashboard: React.FC = () => {
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const UserAvatarWithName = ({ user }: { user: User }) => (
    <div className="flex items-center gap-3">
      {user.profileImageUrl ? (
        <img 
          src={user.profileImageUrl} 
          alt="" 
          className="w-14 h-14 rounded-full object-cover border border-gray-200 shrink-0 cursor-pointer hover:opacity-80 transition-opacity" 
          onClick={() => setViewingImage(user.profileImageUrl!)}
        />
      ) : (
        <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-lg shrink-0">
          {user.name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex flex-col">
        <span className="font-medium text-gray-800"><DataField>{user.name}</DataField></span>
        {user.email && <span className="text-sm text-gray-500">{user.email}</span>}
      </div>
    </div>
  );

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<User>>({});
  const {
    t,
    language,
    user,
    users,
    setUsers,
    records,
    setRecords,
    upcomingSessions,
    addUpcomingSession,
    updateUpcomingSession,
    cancelSession,
    reactivateSession,
    cleanedData,
    currentView,
  } = useAppContext();
  const [userManagementTab, setUserManagementTab] = useState<"pending" | "processed" | "deleted">("pending");
  // State for forms

  const sendPushNotification = async (title: string, body: string, targetTokens: string[]) => {
    if (!targetTokens || targetTokens.length === 0) return;
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, targetTokens })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to send push notification');
      }
      
      if (data.response && data.response.failureCount > 0) {
        alert(`Warning: Failed to send to ${data.response.failureCount} devices. The users might have deleted the app or blocked notifications.`);
      }
    } catch (err) {
      console.error("Failed to send push notification", err);
    }
  };
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [finalizingSession, setFinalizingSession] = useState<UpcomingSession | null>(null);
  const [showMonthlyReport, setShowMonthlyReport] = useState(false);
  const [reminderToast, setReminderToast] = useState<string | null>(null);
  const [activeReminderDropdown, setActiveReminderDropdown] = useState<
    string | null
  >(null);
  const [expandedHistory, setExpandedHistory] = useState<
    Record<string, boolean>
  >({});
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sessionNumber, setSessionNumber] = useState("");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("");
  const [targetParticipants, setTargetParticipants] = useState("");
  const [resourceLink, setResourceLink] = useState("");
  const [selectedCourseForResource, setSelectedCourseForResource] = useState(
    mockCourses[0]?.id || "",
  );
  // Records Filtering State
  const [searchHrCode, setSearchHrCode] = useState("");
  const [searchTrainee, setSearchTrainee] = useState("");
  const [searchDepartment, setSearchDepartment] = useState("");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState("");
  const [fromDateFilter, setFromDateFilter] = useState("");
  const [toDateFilter, setToDateFilter] = useState("");
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>(
    {},
  );
  
  const handleFinalizeSession = (newRecords: TrainingRecord[]) => {
    setRecords([...records, ...newRecords]);
    if (finalizingSession) {
      setUpcomingSessions(upcomingSessions.map(s => 
        s.id === finalizingSession.id ? { ...s, status: 'Completed' } as UpcomingSession : s
      ));
    }
    setFinalizingSession(null);
    alert(language === 'ar' ? '?? ??? ??????? ??????? ?????' : 'Attendance and scores saved successfully!');
  };

  const toggleDateExpansion = (date: string) => {
    setExpandedDates((prev) => ({ ...prev, [date]: !prev[date] }));
  };
  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLink, setSyncLink] = useState("");
  const [syncFile, setSyncFile] = useState<File | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showGlobalAnnouncement, setShowGlobalAnnouncement] = useState(false);
  const [showAnnouncementManager, setShowAnnouncementManager] = useState<string | null>(null);
  const [announcingSession, setAnnouncingSession] = useState<UpcomingSession | null>(null);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const pendingUsers = users.filter((u) => u.status === "pending");
  const allTrainees = users.filter((u) => u.role === "trainee");

  // --- Auto Backup Logic ---
  useEffect(() => {
    const checkAndRunAutoBackup = () => {
      const lastBackup = localStorage.getItem('last_auto_backup');
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      
      if (!lastBackup || Date.now() - parseInt(lastBackup, 10) > SEVEN_DAYS_MS) {
        setTimeout(() => {
          console.log("Running scheduled weekly backup...");
          const success = exportCloudBackup(users, records, upcomingSessions, cleanedData || []);
          if (success) {
            localStorage.setItem('last_auto_backup', Date.now().toString());
          }
        }, 5000); // 5 second delay to ensure data is loaded
      }
    };
    
    if (users.length > 0) {
      checkAndRunAutoBackup();
    }
  }, [users.length]);

  // Dynamic Courses from Records
  const dynamicCourses = useMemo(() => {
    const map = new Map<string, string>();
    records.forEach((r) => {
      if (r.courseId) {
        map.set(
          r.courseId,
          r.courseName ||
            mockCourses.find((c) => c.id === r.courseId)?.title ||
            r.courseId,
        );
      }
    });
    // Add mock courses if they are not in records yet, just to have some initial options
    mockCourses.forEach((c) => {
      if (!map.has(c.id)) {
        map.set(c.id, c.title);
      }
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [records]);
  // Dynamic Departments
  const dynamicDepartments = useMemo(() => {
    return Array.from(
      new Set(
        users
          .filter((u) => u.role === "trainee")
          .map((u) => u.department)
          .filter(Boolean),
      ),
    );
  }, [users]);
  // Analytics Data
  const courseStats = useMemo(() => {
    return dynamicCourses
      .map((course) => {
        const courseRecords = records.filter((r) => r.courseId === course.id);
        const uniqueDates = Array.from(
          new Set(courseRecords.map((r) => r.attendanceDate)),
        );
        return {
          courseName: course.title,
          attendees: courseRecords.length,
          sessions: uniqueDates.length,
        };
      })
      .sort((a, b) => b.attendees - a.attendees);
  }, [dynamicCourses, records]);
  const departmentStats = useMemo(() => {
    const stats: Record<string, Set<string>> = {};
    records.forEach((r) => {
      const u = users.find((u) => u.id === r.userId || u.hrCode === r.userId || u.hrCode === "HR${r.userId}");
      if (u && u.department) {
        if (!stats[u.department]) stats[u.department] = new Set();
        stats[u.department].add(r.userId);
      }
    });
    return Object.entries(stats)
      .map(([name, set]) => ({
        department: name,
        trainees: set.size,
      }))
      .sort((a, b) => b.trainees - a.trainees);
  }, [records, users]);
  const totalUniqueTrainees = useMemo(() => {
    return new Set(records.map((r) => r.userId)).size;
  }, [records]);
  const totalDistinctCourses = useMemo(() => {
    return new Set(records.map((r) => r.courseId)).size;
  }, [records]);
  // Prepare TNA data
  const tnaCounts: Record<string, number> = {};
  mockRequests.forEach((req) => {
    tnaCounts[req.requestedTopic] = (tnaCounts[req.requestedTopic] || 0) + 1;
  });
  const tnaData = Object.entries(tnaCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  const handleApprove = (id: string) => {
    setUsers(
      users.map((u) => (u.id === id ? { ...u, status: "approved", hasUnreadNotifications: true } : u)),
    );
    const approvedUser = users.find(u => u.id === id);
    if (approvedUser && approvedUser.fcmToken) {
      sendPushNotification(
        language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã¢â€žÂ¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¹ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â­ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â³ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€ Ã¢â‚¬â„¢" : "Account Approved",
        language === "ar" ? "ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â­ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¹ ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€ Ã¢â‚¬â„¢ ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â  ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂµÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â© OED ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨" : "Welcome to OED Training",
        [approvedUser.fcmToken]
      );
    }
    alert(
      language === "ar"
        ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾! (ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â³ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â´ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¹ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â± ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â³ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â®ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦)"
        : "Approved! (Notification sent to user)",
    );
  };
  const handleReject = (id: string) => {
    setUsers(
      users.map((u) => (u.id === id ? { ...u, status: "rejected", hasUnreadNotifications: true } : u)),
    );
  };
  
  const handleDeleteUser = (id: string) => {
    if (confirm(language === "ar" ? "ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â£ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Âª ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â£ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â  ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â­ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â°ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã‹Å“Ãƒâ€¦Ã‚Â¸" : "Are you sure you want to delete this trainee?")) {
      setUsers(
        users.map((u) => (u.id === id ? { ...u, status: "deleted" } : u)),
      );
    }
  };

  const handleRestoreUser = (id: string) => {
    setUsers(
      users.map((u) => (u.id === id ? { ...u, status: "approved", hasUnreadNotifications: true } : u)),
    );
  };
  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    const foundCourse = dynamicCourses.find((c) => c.id === selectedCourseId);
    const courseTitle = foundCourse?.title || selectedCourseId;
    if (editingSessionId) {
      const existing = upcomingSessions.find((s) => s.id === editingSessionId);
      if (existing) {
        updateUpcomingSession({
          ...existing,
          courseId: selectedCourseId,
          courseTitle: courseTitle,
          startDate,
          endDate,
          sessionNumber,
          startTime,
          location,
          targetParticipants,
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
        startTime,
        location,
        targetParticipants,
        registeredUsers: [],
        createdAt: new Date().toISOString(),
      };
      addUpcomingSession(newSession);
      
      const validTokens = users.filter(u => u.fcmToken).map(u => u.fcmToken as string);
      if (validTokens.length > 0) {
        sendPushNotification(
          language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â© ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â© ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â©!" : "New Training Course!",
          language === "ar" ? `ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¶ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â© ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â© ${courseTitle}. ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â± ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â³ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾!` : `Course ${courseTitle} is now available. Register now!`,
          validTokens
        );
      }
      
      alert(t("sessionPublished"));
    }
    // Clear form fields
    setSelectedCourseId("");
    setStartDate("");
    setEndDate("");
    setSessionNumber("");
    setLocation("");
    setStartTime("");
    setTargetParticipants("");
  };
  const handleStartEdit = (session: UpcomingSession) => {
    setEditingSessionId(session.id);
    setSelectedCourseId(session.courseId || session.courseTitle);
    setStartDate(session.startDate || "");
    setEndDate(session.endDate || "");
    setSessionNumber(session.sessionNumber || "");
    setLocation(session.location || "");
    setStartTime(session.startTime || "");
    setTargetParticipants(session.targetParticipants || "");
    window.scrollTo({ top: 300, behavior: "smooth" });
  };
  const handleCancelEdit = () => {
    setEditingSessionId(null);
    setSelectedCourseId("");
    setStartDate("");
    setEndDate("");
    setSessionNumber("");
    setLocation("");
    setStartTime("");
    setTargetParticipants("");
  };
  const handleCancelSession = (sessionId: string) => {
    alert("Cancel triggered for ID: " + sessionId);
    console.log("Cancel triggered for ID:", sessionId);
    if (window.confirm("Mark this session as Canceled?")) {
      cancelSession(sessionId);
      if (editingSessionId === sessionId) {
        handleCancelEdit();
      }
    }
  };
  const handleReactivateSession = (sessionId: string) => {
    console.log("Reactivate triggered for ID:", sessionId);
    reactivateSession(sessionId);
  };
  const handleSendReminder = (
    sessionId: string,
    reminderType: "Standard" | "Final" = "Standard",
  ) => {
    console.log(
      "Sending reminder for session:",
      sessionId,
      "Type:",
      reminderType,
    );
    const session = upcomingSessions.find((s) => s.id === sessionId);
    if (!session) return;
    const now = new Date();
    const dateStr = formatDateToStandard(now.toISOString().split("T")[0]);
    const hours = String(now.getHours()).padStart(2, "0");
    const mins = String(now.getMinutes()).padStart(2, "0");
    const timestamp = `${dateStr} ${hours}:${mins}`;
    const newLogItem: ReminderLogItem = {
      id: `rem_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: reminderType,
      timestamp,
    };
    const updatedSession: UpcomingSession = {
      ...session,
      reminderLog: [...(session.reminderLog || []), newLogItem],
    };
    const isFinal = reminderType === "Final";
    const typeLabel = isFinal
      ? language === "ar"
        ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â± ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â "
        : "FINAL REMINDER"
      : language === "ar"
        ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â± ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¹ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â "
        : "Standard reminder";
        
    const validTokens = users.filter(u => u.fcmToken).map(u => u.fcmToken as string);
    if (validTokens.length > 0) {
      sendPushNotification(
        isFinal ? (language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡ ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â  ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â³ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾" : "Final Registration Alert") : (language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â± ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â³ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â  ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â©" : "Course Registration Alert"),
        language === "ar" ? `ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â³ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â± ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â®ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂµÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Âµ ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â© ${session.courseTitle}` : `Reminder for course ${session.courseTitle}`,
        validTokens
      );
    }
    
    const toastMsg =
      language === "ar"
        ? `${isFinal ? "ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã‚Â¡Ãƒâ€šÃ‚Â¨" : "ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã‚Â"} ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â³ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â´ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¹ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â± ${typeLabel} ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â­ ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¹ ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â  ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â³ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â  ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â  [${session.courseTitle}]!`
        : `${isFinal ? "ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã‚Â¡Ãƒâ€šÃ‚Â¨" : "ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã‚Â"} ${typeLabel} alert sent successfully to all registered trainees for [${session.courseTitle}]!`;
    setReminderToast(toastMsg);
    updateUpcomingSession(updatedSession);
    setActiveReminderDropdown(null);
    setTimeout(() => {
      setReminderToast(null);
    }, 4500);
  };
  const toggleHistoryExpand = (sessionId: string) => {
    setExpandedHistory((prev) => ({ ...prev, [sessionId]: !prev[sessionId] }));
  };
  const handleShareResource = (e: React.FormEvent) => {
    e.preventDefault();
    alert(
      `Shared ${resourceLink} with attendees of course ${selectedCourseForResource}`,
    );
    setResourceLink("");
  };
  const resetFilters = () => {
    setSearchHrCode("");
    setSearchTrainee("");
    setSearchDepartment("");
    setSelectedCourseFilter("");
    setFromDateFilter("");
    setToDateFilter("");
  };
  const getAdminReportOptions = (): ReportOptions => {
    const reportTitle = isSingleTraineeFiltered
      ? language === "ar"
        ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â± ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨ ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â "
        : "Individual Trainee Training Report"
      : language === "ar"
        ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â± ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨ ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â "
        : "Technical Training Report";
    return {
      title: reportTitle,
      language: (language === "ar" ? "ar" : "en") as "ar" | "en",
      records: filteredRecords,
      singleTrainee: singleTrainee
        ? {
            name: singleTrainee.name,
            hrCode: singleTrainee.hrCode,
            department: singleTrainee.department,
          }
        : null,
      fileName: isSingleTraineeFiltered
        ? `Training_Report_${singleTrainee?.hrCode || "Individual"}.pdf`
        : "OED_Technical_Training_Report.pdf",
    };
  };
  const handlePrint = () => {
    safePrintReport(getAdminReportOptions());
  };
  const handleDownloadPDF = async () => {
    await downloadReportPDF(getAdminReportOptions());
  };
  const handleSyncData = async () => {
    if (!syncLink.trim()) return;
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncSuccess(false);
    // Simulate progress
    const progressInterval = setInterval(() => {
      setSyncProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 200);
    try {
      const data: any = await importFromOneDrive(syncLink);
      setSyncProgress(100);
      setTimeout(() => {
        setIsSyncing(false);
        setSyncLink("");
        setSyncProgress(0);
        setSyncSuccess(true);
        // Merge the new data
        setUsers([...users, ...data.users]);
        setRecords([...records, ...data.coursesAttended]);
        // Hide success message after 5 seconds
        setTimeout(() => setSyncSuccess(false), 5000);
      }, 500);
    } catch (error) {
      setIsSyncing(false);
      alert("Error synchronizing data");
    } finally {
      clearInterval(progressInterval);
    }
  };
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSyncFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const ab = evt.target?.result;
        const wb = XLSX.read(ab, { type: "array", cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[];
        const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");
        const maxCols = range.e.c + 1;
        const newUsers: any[] = [];
        const newRecords: any[] = [];
        // Extract course names from row index 6 (7th row)
        const courseRow = rows[6] || [];
        const coursesMap: Record<number, string> = {};
        let currentCourse = "";
        for (let c = 6; c < maxCols; c++) {
          if (
            courseRow[c] &&
            typeof courseRow[c] === "string" &&
            courseRow[c].trim() !== ""
          ) {
            currentCourse = courseRow[c].toString().trim();
          }
          if (currentCourse) {
            coursesMap[c] = currentCourse;
          }
        }
        // Loop trainees from row index 13
        for (let r = 13; r < rows.length; r++) {
          const row = rows[r];
          if (!row) continue;
          const id = row[2]?.toString().trim();
          const jobRole = row[3]?.toString().trim();
          const dept = row[4]?.toString().trim();
          const name = row[5]?.toString().trim();
          if (!id || !name) continue; // Skip invalid rows
          if (
            !newUsers.find((u) => u.id === id) &&
            !users.find((u) => u.id === id)
          ) {
            newUsers.push({
              id,
              name,
              department: dept || "General",
              jobRole: jobRole || "",
              phone: "01000000000", // Mock
              role: "trainee",
              status: "approved",
              hrCode: `HR${id}`,
            });
          }
          for (let c = 6; c < maxCols; c += 4) {
            const dateVal = row[c];
            if (dateVal) {
              const scoreVal = row[c + 3] || 0;
              // format Date
              let formattedDate = new Date().toISOString().split("T")[0];
              if (dateVal instanceof Date) {
                formattedDate = dateVal.toISOString().split("T")[0];
              } else if (typeof dateVal === "string") {
                formattedDate = dateVal; // fallback
              } else if (typeof dateVal === "number") {
                formattedDate = new Date(
                  Math.round((dateVal - 25569) * 86400 * 1000),
                )
                  .toISOString()
                  .split("T")[0];
              }
              // format Score
              let formattedScore = "0%";
              if (typeof scoreVal === "number") {
                formattedScore = `${Math.round(scoreVal * 100)}%`;
              } else if (
                typeof scoreVal === "string" &&
                !scoreVal.includes("%")
              ) {
                const parsed = parseFloat(scoreVal);
                if (!isNaN(parsed)) {
                  formattedScore = `${Math.round(parsed * 100)}%`;
                } else {
                  formattedScore = scoreVal;
                }
              } else {
                formattedScore = scoreVal.toString();
              }
              const courseName = coursesMap[c] || "Unknown Course";
              // try to match course by name for courseId, fallback to a unique string
              const courseId =
                mockCourses.find((mc) =>
                  mc.title.toLowerCase().includes(courseName.toLowerCase()),
                )?.id || `course_${c}`;
              const isDuplicate = 
                records.some(rec => rec.userId === id && rec.courseName === courseName && rec.attendanceDate === formattedDate) ||
                newRecords.some(rec => rec.userId === id && rec.courseName === courseName && rec.attendanceDate === formattedDate);

              if (!isDuplicate) {
                newRecords.push({
                  id: `record_${Date.now()}_${r}_${c}`,
                  userId: id,
                  hrCode: `HR${id}`,
                  traineeName: name,
                  department: dept || "General",
                  courseId: courseId,
                  courseName: courseName,
                  attendanceDate: formattedDate,
                  score: formattedScore,
                });
              }
            }
          }
        }
        // Add them to state (ensure unique users are added)
        setUsers((prev) => {
          const uniqueNewUsers = newUsers.filter(
            (nu) => !prev.some((u) => u.id === nu.id),
          );
          return [...prev, ...uniqueNewUsers];
        });
        setRecords((prev) => [...prev, ...newRecords]);
        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 5000);
      } catch (err) {
        console.error("Error parsing Excel file:", err);
        alert("Failed to parse Excel file. Ensure the file format is correct.");
      }
    };
    reader.readAsArrayBuffer(file);
  };
  const filteredRecords = records.filter((r) => {
    const user = users.find((u) => u.id === r.userId || u.hrCode === r.userId || u.hrCode === "HR${r.userId}");
    if (
      searchHrCode &&
      !user?.hrCode?.toLowerCase().includes(searchHrCode.toLowerCase())
    )
      return false;
    if (
      searchTrainee &&
      !user?.name?.toLowerCase().includes(searchTrainee.toLowerCase())
    )
      return false;
    if (searchDepartment && user?.department !== searchDepartment) return false;
    if (selectedCourseFilter && r.courseId !== selectedCourseFilter)
      return false;
    if (fromDateFilter || toDateFilter) {
      const recordDateStr =
        r.attendanceDate ||
        r.date ||
        r.raw?.["Date"] ||
        r.raw?.["Attendance Date"];
      if (!recordDateStr) return false;
      const recordDate = new Date(recordDateStr).getTime();
      if (isNaN(recordDate)) return false;
      if (fromDateFilter) {
        const fromDate = new Date(fromDateFilter).getTime();
        if (recordDate < fromDate) return false;
      }
      if (toDateFilter) {
        const toDate = new Date(toDateFilter);
        toDate.setHours(23, 59, 59, 999);
        if (recordDate > toDate.getTime()) return false;
      }
    }
    return true;
  });
  const kpiStats = useMemo(() => {
    const coursesSet = new Set<string>();
    const sessionsSet = new Set<string>();
    let engineersCount = 0;
    let techniciansCount = 0;
    let operatorsCount = 0;
    filteredRecords.forEach((r) => {
      const u = users.find((u) => u.id === r.userId || u.hrCode === r.userId || u.hrCode === "HR${r.userId}");
      const cName = r.courseName || r.courseId;
      coursesSet.add(cName);
      sessionsSet.add(`${cName}-${r.attendanceDate}`);
      if (u) {
        const roleStr = (u.jobRole || "").toLowerCase();
        if (roleStr.includes("eng")) engineersCount++;
        if (roleStr.includes("tech")) techniciansCount++;
        if (roleStr.includes("op")) operatorsCount++;
      }
    });
    return {
      totalCourses: coursesSet.size,
      totalSessions: sessionsSet.size,
      totalParticipants: filteredRecords.length,
      totalEngineers: engineersCount,
      totalTechnicians: techniciansCount,
      totalOperators: operatorsCount,
    };
  }, [filteredRecords, users]);
  const uniqueTraineeHrCodes = useMemo(
    () =>
      Array.from(
        new Set(
          filteredRecords
            .map((r) => {
              const u = users.find((u) => u.id === r.userId || u.hrCode === r.userId || u.hrCode === "HR${r.userId}");
              return u?.hrCode;
            })
            .filter(Boolean),
        ),
      ),
    [filteredRecords, users],
  );
  const isSingleTraineeFiltered = uniqueTraineeHrCodes.length === 1;
  const singleTrainee = isSingleTraineeFiltered
    ? users.find((u) => u.hrCode === uniqueTraineeHrCodes[0])
    : null;
  const selectedCourseDetails = selectedCourseFilter
    ? dynamicCourses.find((c) => c.id === selectedCourseFilter)
    : null;
  const courseSessions: string[] = selectedCourseDetails
    ? Array.from(new Set(filteredRecords.map((r) => r.attendanceDate)))
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 print:p-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-2 border-[#FFC000] pb-4 mb-6 gap-4 print:hidden">
        <h1 className="text-2xl md:text-3xl font-bold text-[#002D62]">
          {t("adminView")}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {user?.role === 'admin' || user?.role === 'supervisor' ? (
            <>
              <button onClick={handlePrint} className="flex items-center gap-1 bg-[#002D62] text-white px-3 py-1.5 rounded hover:bg-blue-900 transition-colors shadow-sm text-sm">
                <Printer size={16} />
                {language === "ar" ? "طباعة" : "Print"}
              </button>
            </>
          ) : null}
        </div>
      </div>
      {/* Content Area */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 min-h-[400px]">
        {/* User Management Tab */}
        {currentView === "userManagement" && (
          <div className="space-y-12">
            <div className="flex flex-col md:flex-row gap-6">
            {/* Sidebar */}
            <div className="md:w-64 shrink-0 flex flex-col space-y-2 border-b md:border-b-0 md:border-r rtl:border-r-0 rtl:border-l border-gray-100 pb-4 md:pb-0 md:pr-4 rtl:md:pl-4">
              <button
                onClick={() => setUserManagementTab('pending')}
                className={`text-left rtl:text-right px-4 py-3 rounded-lg font-medium transition-colors ${userManagementTab === 'pending' ? 'bg-[#002D62] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {t("pendingUsers")}
              </button>
              <button
                onClick={() => setUserManagementTab('processed')}
                className={`text-left rtl:text-right px-4 py-3 rounded-lg font-medium transition-colors ${userManagementTab === 'processed' ? 'bg-[#002D62] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â·ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Âª ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â©" : "Processed Requests"}
              </button>
              <button
                onClick={() => setUserManagementTab('deleted')}
                className={`text-left rtl:text-right px-4 py-3 rounded-lg font-medium transition-colors ${userManagementTab === 'deleted' ? 'bg-[#002D62] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â  ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â­ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â " : "Deleted Trainees"}
              </button>
            </div>
            
            {/* Content Area */}
            <div className="flex-1 overflow-x-auto">
              {userManagementTab === 'pending' && (
                <div>
                  <h2 className="text-xl font-semibold mb-4 text-gray-800">
              {t("pendingUsers")}
            </h2>
            {pendingUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 border-b">
                      <th className="p-3">
                        {language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â " : "HR Code"}
                      </th>
                      <th className="p-3">{t("name")}</th>
                      <th className="p-3">{t("department")}</th>
                      <th className="p-3">
                        {language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂµÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â­ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â© ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂµÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾" : "Access Role"}
                      </th>
                      <th className="p-3">
                        {language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â® ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â·ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨" : "Request Date"}
                      </th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.map((u) => (
                      <tr key={u.id} className="border-b">
                        {editingUserId === u.id ? (
                          <>
                            <td className="p-3">
                              <input
                                type="text"
                                value={editFormData.hrCode || ""}
                                onChange={(e) =>
                                  setEditFormData({
                                    ...editFormData,
                                    hrCode: e.target.value,
                                  })
                                }
                                className="border rounded px-2 py-1 w-24"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={editFormData.name || ""}
                                onChange={(e) =>
                                  setEditFormData({
                                    ...editFormData,
                                    name: e.target.value,
                                  })
                                }
                                className="border rounded px-2 py-1 w-32"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={editFormData.department || ""}
                                onChange={(e) =>
                                  setEditFormData({
                                    ...editFormData,
                                    department: e.target.value,
                                  })
                                }
                                className="border rounded px-2 py-1 w-32"
                              />
                            </td>
                            <td className="p-3">
                              <select
                                value={editFormData.role || "trainee"}
                                onChange={(e) =>
                                  setEditFormData({
                                    ...editFormData,
                                    role: e.target.value as Role,
                                  })
                                }
                                className="border rounded px-2 py-1"
                              >
                                <option value="trainee">Trainee</option>
                                <option value="manager">Manager</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                            <td className="p-3">
                              <DataField>
                                {u.createdAt
                                  ? new Date(u.createdAt).toLocaleDateString()
                                  : "N/A"}
                              </DataField>
                            </td>
                            <td className="p-3 flex gap-2">
                              <button
                                onClick={() => {
                                  setUsers(
                                    users.map((user) =>
                                      user.id === u.id
                                        ? { ...user, ...editFormData }
                                        : user,
                                    ),
                                  );
                                  setEditingUserId(null);
                                }}
                                className="text-blue-600 bg-blue-50 px-3 py-1 rounded"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingUserId(null)}
                                className="text-gray-600 bg-gray-50 px-3 py-1 rounded"
                              >
                                Cancel
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-3">
                              <DataField>{u.hrCode}</DataField>
                            </td>
                            <td className="p-3">
                              <UserAvatarWithName user={u} />
                            </td>
                            <td className="p-3">
                              <DataField>{u.department}</DataField>
                            </td>
                            <td className="p-3">
                              <DataField>{u.role}</DataField>
                            </td>
                            <td className="p-3">
                              <DataField>
                                {u.createdAt
                                  ? new Date(u.createdAt).toLocaleDateString()
                                  : "N/A"}
                              </DataField>
                            </td>
                            <td className="p-3 flex gap-2">
                              <button
                                onClick={() => handleApprove(u.id)}
                                className="flex items-center text-green-600 bg-green-50 px-3 py-1 rounded hover:bg-green-100"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setEditingUserId(u.id);
                                  setEditFormData(u);
                                }}
                                className="flex items-center text-blue-600 bg-blue-50 px-3 py-1 rounded hover:bg-blue-100"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleReject(u.id)}
                                className="flex items-center text-red-600 bg-red-50 px-3 py-1 rounded hover:bg-red-100"
                              >
                                Reject
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No pending users.</p>
            )}
            </div>
            )}
            
            {/* Processed Requests Section */}
            {userManagementTab === 'processed' && (
            <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              {language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â·ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Âª ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â©" : "Processed Requests"}
            </h2>
            {users.filter(
              (u) =>
                (u.status === "approved" || u.status === "rejected") &&
                u.createdAt,
            ).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 border-b">
                      <th className="p-3">
                        {language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â " : "HR Code"}
                      </th>
                      <th className="p-3">{t("name")}</th>
                      <th className="p-3">{t("department")}</th>
                      <th className="p-3">
                        {language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂµÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â­ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â© ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂµÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾" : "Access Role"}
                      </th>
                      <th className="p-3">
                        {language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â­ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â©" : "Status"}
                      </th>
                      <th className="p-3">
                        {language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â® ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â·ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨" : "Request Date"}
                      </th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .filter(
                        (u) =>
                          (u.status === "approved" ||
                            u.status === "rejected") &&
                          u.createdAt,
                      )
                      .map((u) => (
                        <tr key={u.id} className="border-b">
                          {editingUserId === u.id ? (
                            <>
                              <td className="p-3">
                                <input type="text" value={editFormData.hrCode || ""} onChange={(e) => setEditFormData({ ...editFormData, hrCode: e.target.value })} className="border rounded px-2 py-1 w-24" />
                              </td>
                              <td className="p-3">
                                <input type="text" value={editFormData.name || ""} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} className="border rounded px-2 py-1 w-32" />
                              </td>
                              <td className="p-3">
                                <input type="text" value={editFormData.department || ""} onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })} className="border rounded px-2 py-1 w-32" />
                              </td>
                              <td className="p-3">
                                <select value={editFormData.role || "trainee"} onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as any })} className="border rounded px-2 py-1">
                                  <option value="trainee">Trainee</option>
                                  <option value="manager">Manager</option>
                                  <option value="supervisor">Site Supervisor</option>
                                  <option value="admin">Admin</option>
                                </select>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-1 rounded text-sm font-semibold ${u.status === "approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                  {u.status === "approved" ? (language === "ar" ? "ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¹ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡" : "Approved") : (language === "ar" ? "ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¶" : "Rejected")}
                                </span>
                              </td>
                              <td className="p-3">
                                <DataField>
                                  {new Date(u.createdAt!).toLocaleString()}
                                </DataField>
                              </td>
                              <td className="p-3 flex gap-2">
                                <button onClick={() => { setUsers(users.map((user) => user.id === u.id ? { ...user, ...editFormData } : user)); setEditingUserId(null); }} className="text-blue-600 bg-blue-50 px-3 py-1 rounded">
                                  {language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â­ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¸" : "Save"}
                                </button>
                                <button onClick={() => setEditingUserId(null)} className="text-gray-600 bg-gray-50 px-3 py-1 rounded">
                                  {language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂºÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¡" : "Cancel"}
                                </button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="p-3">
                                <DataField>{u.hrCode}</DataField>
                              </td>
                              <td className="p-3">
                                <UserAvatarWithName user={u} />
                              </td>
                              <td className="p-3">
                                <DataField>{u.department}</DataField>
                              </td>
                              <td className="p-3">
                                <DataField>{u.role}</DataField>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-1 rounded text-sm font-semibold ${u.status === "approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                  {u.status === "approved" ? (language === "ar" ? "ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¹ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡" : "Approved") : (language === "ar" ? "ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¶" : "Rejected")}
                                </span>
                              </td>
                              <td className="p-3">
                                <DataField>
                                  {new Date(u.createdAt!).toLocaleString()}
                                </DataField>
                              </td>
                              <td className="p-3 flex gap-2">
                                {u.status === "approved" && (
                                  <>
                                    <button onClick={() => { setEditingUserId(u.id); setEditFormData(u); }} className="text-blue-600 bg-blue-50 px-3 py-1 rounded hover:bg-blue-100">
                                      {language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¹ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾" : "Edit"}
                                    </button>
                                    <button onClick={() => handleDeleteUser(u.id)} className="text-red-600 bg-red-50 px-3 py-1 rounded hover:bg-red-100">
                                      {language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â­ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€šÃ‚Â" : "Delete"}
                                    </button>
                                  </>
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No processed requests.</p>
            )}
            </div>
            )}
            {/* Deleted Trainees Section */}
            {userManagementTab === 'deleted' && (
            <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              {language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â  ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â­ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â " : "Deleted Trainees"}
            </h2>
            {users.filter(u => u.status === "deleted").length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 border-b">
                      <th className="p-3">{language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â " : "HR Code"}</th>
                      <th className="p-3">{t("name")}</th>
                      <th className="p-3">{t("department")}</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.filter(u => u.status === "deleted").map(u => (
                      <tr key={u.id} className="border-b bg-red-50 opacity-80">
                        <td className="p-3">{u.hrCode}</td>
                        <td className="p-3">
                          <UserAvatarWithName user={u} />
                        </td>
                        <td className="p-3">{u.department}</td>
                        <td className="p-3">
                          <button onClick={() => handleRestoreUser(u.id)} className="flex items-center text-green-600 bg-green-100 px-3 py-1 rounded hover:bg-green-200">
                            {language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â³ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¹" : "Restore"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">{language === "ar" ? "ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â  ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â­ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ." : "No deleted trainees."}</p>
            )}
            </div>
            )}
            </div>
          </div>
          </div>
        )}

        {/* Dashboard Tab */}
        {currentView === "dashboard" && (
          <div className="space-y-12">
            
          {/* Embedded Records Section */}
          <div className="w-full overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-[#002D62] border-l-4 border-[#FFC000] pl-3 rtl:pr-3 rtl:pl-0 rtl:border-r-4 rtl:border-l-0">
                  {t("globalRecords")}
                </h2>

              </div>
            {/* Dynamic KPI Summary Bar (Web View) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6 print:hidden">
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
                <BookOpen className="text-[#002D62] mb-2" size={24} />
                <span className="text-xs text-gray-500 font-semibold mb-1">
                  {language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â  ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â³ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Âª" : "Total Courses"}
                </span>
                <span className="text-xl font-bold text-[#002D62]">
                  {kpiStats.totalCourses}
                </span>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
                <Calendar className="text-[#FFC000] mb-2" size={24} />
                <span className="text-xs text-gray-500 font-semibold mb-1">
                  {language === "ar"
                    ? "إجمالي الجلسات"
                    : "Total Sessions"}
                </span>
                <span className="text-xl font-bold text-[#002D62]">
                  {kpiStats.totalSessions}
                </span>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
                <Users className="text-green-600 mb-2" size={24} />
                <span className="text-xs text-gray-500 font-semibold mb-1">
                  {language === "ar"
                    ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â  ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â "
                    : "Total Participants"}
                </span>
                <span className="text-xl font-bold text-[#002D62]">
                  {kpiStats.totalParticipants}
                </span>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
                <HardHat className="text-blue-500 mb-2" size={24} />
                <span className="text-xs text-gray-500 font-semibold mb-1">
                  {language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â  ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â³ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â " : "Total Engineers"}
                </span>
                <span className="text-xl font-bold text-[#002D62]">
                  {kpiStats.totalEngineers}
                </span>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
                <Wrench className="text-purple-500 mb-2" size={24} />
                <span className="text-xs text-gray-500 font-semibold mb-1">
                  {language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â  ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â " : "Total Technicians"}
                </span>
                <span className="text-xl font-bold text-[#002D62]">
                  {kpiStats.totalTechnicians}
                </span>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
                <Settings className="text-gray-500 mb-2" size={24} />
                <span className="text-xs text-gray-500 font-semibold mb-1">
                  {language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â  ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â´ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â " : "Total Operators"}
                </span>
                <span className="text-xl font-bold text-[#002D62]">
                  {kpiStats.totalOperators}
                </span>
              </div>
            </div>
            {selectedCourseFilter && selectedCourseDetails ? (
              <div className="mb-6 print:hidden">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 flex flex-wrap gap-4 items-center">
                  <h3 className="text-lg font-bold text-[#002D62]">
                    <DataField>{selectedCourseDetails.title}</DataField>
                  </h3>
                  <div className="flex gap-2">
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded">
                      {t("conductedTimes")} {courseSessions.length} {t("times")}
                    </span>
                    <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-1 rounded">
                      {t("totalAttendees")}: {filteredRecords.length}
                    </span>
                  </div>
                </div>
                <div className="space-y-4">
                  {courseSessions.map((date) => {
                    const attendeesOnDate = filteredRecords.filter(
                      (r) => r.attendanceDate === date,
                    );
                    const isExpanded = expandedDates[date];
                    return (
                      <div
                        key={date}
                        className="border border-gray-200 rounded-lg overflow-hidden"
                      >
                        <button
                          onClick={() => toggleDateExpansion(date)}
                          className="w-full bg-gray-100 px-4 py-3 flex justify-between items-center hover:bg-gray-200 transition-colors"
                        >
                          <span className="font-bold text-gray-700">
                            {formatDateToStandard(date)}
                          </span>
                          <span className="text-sm text-gray-500">
                            {attendeesOnDate.length} {t("attendees")}
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="p-4 bg-white overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                              <thead>
                                <tr className="border-b text-gray-600">
                                  <th className="pb-2 font-medium">
                                    {t("name")}
                                  </th>
                                  <th className="pb-2 font-medium">
                                    {t("department")}
                                  </th>
                                  <th className="pb-2 font-medium">
                                    {t("score")}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {attendeesOnDate.map((r) => {
                                  const u = users.find((u) => u.id === r.userId || u.hrCode === r.userId || u.hrCode === "HR${r.userId}");
                                  return (
                                    <tr
                                      key={r.id}
                                      className="border-b last:border-0 hover:bg-gray-50"
                                    >
                                      <td className="py-2">
                                        <DataField>{u?.name}</DataField>
                                      </td>
                                      <td className="py-2 text-gray-600">
                                        <DataField>{u?.department}</DataField>
                                      </td>
                                      <td className="py-2 font-bold text-[#002D62]">
                                        {r.score}
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
              <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg shadow-sm print:hidden">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="p-3">
                        <div className="font-semibold text-gray-700 mb-2">
                          {language === "ar" ? "الكود الوظيفي" : "HR Code"}
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            value={searchHrCode}
                            onChange={(e) => setSearchHrCode(e.target.value)}
                            className="w-full border rounded px-2 py-1 text-xs focus:ring-[#002D62] pr-6"
                            placeholder="Filter..."
                          />
                          {searchHrCode && (
                            <button
                              onClick={() => setSearchHrCode("")}
                              className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </th>
                      <th className="p-3">
                        <div className="font-semibold text-gray-700 mb-2">
                          {t("name")}
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            value={searchTrainee}
                            onChange={(e) => setSearchTrainee(e.target.value)}
                            className="w-full border rounded px-2 py-1 text-xs focus:ring-[#002D62] pr-6"
                            placeholder="Filter..."
                          />
                          {searchTrainee && (
                            <button
                              onClick={() => setSearchTrainee("")}
                              className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </th>
                      <th className="p-3">
                        <div className="font-semibold text-gray-700 mb-2">
                          {t("department")}
                        </div>
                        <div className="relative">
                          <select
                            value={searchDepartment}
                            onChange={(e) =>
                              setSearchDepartment(e.target.value)
                            }
                            className="w-full border rounded px-2 py-1 text-xs focus:ring-[#002D62] appearance-none pr-6"
                          >
                            <option value="">All</option>
                            {dynamicDepartments.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                          {searchDepartment && (
                            <button
                              onClick={() => setSearchDepartment("")}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </th>
                      <th className="p-3">
                        <div className="font-semibold text-gray-700 mb-2">
                          {t("courseName")}
                        </div>
                        <div className="relative">
                          <select
                            value={selectedCourseFilter}
                            onChange={(e) =>
                              setSelectedCourseFilter(e.target.value)
                            }
                            className="w-full border rounded px-2 py-1 text-xs focus:ring-[#002D62] appearance-none pr-6"
                          >
                            <option value="">All</option>
                            {dynamicCourses.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.title}
                              </option>
                            ))}
                          </select>
                          {selectedCourseFilter && (
                            <button
                              onClick={() => setSelectedCourseFilter("")}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </th>
                      <th className="p-3 align-top">
                        <div className="font-semibold text-gray-700 mb-2">
                          {language === "ar" ? "ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â© ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â©" : "Duration"}
                        </div>
                      </th>
                      <th className="p-3 align-top">
                        <div className="font-semibold text-gray-700 mb-2">
                          {language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â£ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â­ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¶ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±" : "Attended Days"}
                        </div>
                      </th>
                      <th className="p-3 align-top">
                        <div className="font-semibold text-gray-700 mb-2">
                          {t("score")}
                        </div>
                      </th>
                      <th className="p-3 align-top min-w-[140px]">
                        <div className="font-semibold text-gray-700 mb-2">
                          {t("date")}
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="relative">
                            <input
                              type="date"
                              value={fromDateFilter}
                              onChange={(e) =>
                                setFromDateFilter(e.target.value)
                              }
                              className="w-full border rounded px-2 py-1 text-xs focus:ring-[#002D62] pr-6"
                              title={
                                language === "ar" ? "ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â  ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â®" : "From Date"
                              }
                            />
                            {fromDateFilter && (
                              <button
                                onClick={() => setFromDateFilter("")}
                                className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 bg-white"
                              >
                                <X size={12} />
                              </button>
                            )}
                            {fromDateFilter && (
                              <div className="text-[10px] text-[#002D62] font-semibold mt-0.5">
                                {formatDateToStandard(fromDateFilter)}
                              </div>
                            )}
                          </div>
                          <div className="relative">
                            <input
                              type="date"
                              value={toDateFilter}
                              onChange={(e) => setToDateFilter(e.target.value)}
                              className="w-full border rounded px-2 py-1 text-xs focus:ring-[#002D62] pr-6"
                              title={
                                language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â° ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â®" : "To Date"
                              }
                            />
                            {toDateFilter && (
                              <button
                                onClick={() => setToDateFilter("")}
                                className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 bg-white"
                              >
                                <X size={12} />
                              </button>
                            )}
                            {toDateFilter && (
                              <div className="text-[10px] text-[#002D62] font-semibold mt-0.5">
                                {formatDateToStandard(toDateFilter)}
                              </div>
                            )}
                          </div>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((r) => {
                      console.log("Rendering record (Admin Web):", r);
                      const user = users.find((u) => u.id === r.userId || u.hrCode === r.userId || u.hrCode === "HR${r.userId}");
                      const course = dynamicCourses.find(
                        (c) => c.id === r.courseId,
                      );
                      const displayCourseTitle =
                        course?.title || r.courseName || "Unknown";
                      // Try to find the cleaned data record for duration if not on course obj
                      const rawDuration =
                        r.raw?.["Course Duration"] || r.totalDays;
                      const cleanedDuration = rawDuration
                        ? `${rawDuration}`
                        : "";
                      return (
                        <tr
                          key={r.id}
                          className={`border-b last:border-0 hover:bg-gray-50 transition-colors ${user?.status === "deleted" ? "bg-red-50 text-red-700" : ""}`}
                        >
                          <td className="p-3 font-medium text-gray-800">
                            <DataField>{user?.hrCode || r.hrCode}</DataField>
                          </td>
                          <td className="p-3 font-medium text-[#002D62]">
                            <DataField>{r.traineeName || user?.name || r.userId}</DataField>
                          </td>
                          <td className="p-3 text-gray-600">
                            <DataField>{r.department || user?.department}</DataField>
                          </td>
                          <td className="p-3">
                            <DataField>{displayCourseTitle}</DataField>
                          </td>
                          <td className="p-3 text-gray-600">
                            <DataField>
                              {course?.duration || cleanedDuration || "N/A"}
                            </DataField>
                          </td>
                          <td className="p-3 text-gray-600">
                            <DataField>
                              {r.raw?.["Attended Days"] || r.daysAttended}
                            </DataField>
                          </td>
                          <td className="p-3 font-bold text-gray-800">
                            <DataField>
                              {formatScore(r.raw?.["Score"] || r.score)}
                            </DataField>
                          </td>
                          <td className="p-3 text-gray-500">
                            <DataField>
                              {formatDateToStandard(r.attendanceDate)}
                            </DataField>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredRecords.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="p-8 text-center text-gray-500"
                        >
                          {t("noData")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
              )}
            </div>
            {/* End of Dashboard view */}
          </div>
        )}
        {/* Analytics Tab */}
        {currentView === "analytics" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800 border-l-4 border-[#FFC000] pl-3 rtl:pr-3 rtl:pl-0 rtl:border-r-4 rtl:border-l-0">
                {t("analytics")}
              </h2>

            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col items-center justify-center">
                <span className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">
                  {language === "ar" ? "ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã…Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â³ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª" : "Total Records"}
                </span>
                <span className="text-3xl font-bold text-[#002D62]">
                  {records.length}
                </span>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col items-center justify-center">
                <span className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">
                  {language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â  ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â " : "Unique Trainees"}
                </span>
                <span className="text-3xl font-bold text-[#FFC000]">
                  {totalUniqueTrainees}
                </span>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col items-center justify-center">
                <span className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">
                  {language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Âª ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â²ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â©" : "Distinct Courses"}
                </span>
                <span className="text-3xl font-bold text-green-600">
                  {totalDistinctCourses}
                </span>
              </div>

            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* All Courses by Attendance */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5 h-96 flex flex-col">
                <div className="bg-white z-10 pb-3 border-b border-gray-200 flex-none">
                  <h3 className="font-bold text-[#002D62] text-base">
                    {language === "ar"
                      ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Âª ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â­ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â³ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨ ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â­ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¶ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±"
                      : "Courses by Attendance"}
                  </h3>
                </div>
                <div className="overflow-y-auto flex-1 pt-3 pr-1 space-y-4">
                  {courseStats.map((stat, idx) => {
                    const maxAttendees =
                      Math.max(...courseStats.map((s) => s.attendees)) || 1;
                    const percent = Math.round(
                      (stat.attendees / maxAttendees) * 100,
                    );
                    return (
                      <div key={idx}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700 truncate mr-4">
                            <DataField>{stat.courseName}</DataField>
                          </span>
                          <span className="text-gray-900 font-bold">
                            {stat.attendees}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5">
                          <div
                            className="bg-[#002D62] h-2.5 rounded-full"
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Trainees by Department */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5 h-96 flex flex-col">
                <div className="bg-white z-10 pb-3 border-b border-gray-200 flex-none">
                  <h3 className="font-bold text-[#D97706] text-base">
                    {language === "ar"
                      ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â  ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â­ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â³ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨ ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â³ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦"
                      : "Trainees by Department"}
                  </h3>
                </div>
                <div className="overflow-y-auto flex-1 pt-3 pr-1 space-y-4">
                  {departmentStats.map((stat, idx) => {
                    const maxTrainees =
                      Math.max(...departmentStats.map((s) => s.trainees)) || 1;
                    const percent = Math.round(
                      (stat.trainees / maxTrainees) * 100,
                    );
                    return (
                      <div key={idx}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700 truncate mr-4">
                            <DataField>{stat.department}</DataField>
                          </span>
                          <span className="text-gray-900 font-bold">
                            {stat.trainees}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5">
                          <div
                            className="bg-[#FFC000] h-2.5 rounded-full"
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="mt-12 border-t border-gray-200 pt-8">
                <h3 className="font-bold text-[#002D62] text-xl mb-6">
                  {language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â³ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â©" : "Advanced Charts"}
                </h3>
                <AnalyticsDashboardTab />
              </div>
            </div>
          </div>
        )}
        {/* Admin Tools Tab */}
        {currentView === "tools" && (
          <div className="space-y-12">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col items-center justify-center">
                <span className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">
                  {language === "ar" ? "إجمالي الجلسات" : "Total Sessions"}
                </span>
                <span className="text-3xl font-bold text-blue-500">
                  {upcomingSessions.filter(s => !s.isDeleted).length}
                </span>
              </div>
            </div>

            {/* Session Announcements Section */}
            <div>
              <h2 className="text-2xl font-bold mb-6 text-[#002D62] border-l-4 border-[#FFC000] pl-3 rtl:pr-3 rtl:pl-0 rtl:border-r-4 rtl:border-l-0">
                {t('sessionAnnouncements')}
              </h2>
              <div className="space-y-6">
            {reminderToast && (
              <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[9999] w-[90%] max-w-sm bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded shadow-sm text-emerald-800 flex items-center justify-between transition-all animate-fadeIn">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-emerald-600 animate-bounce" />
                  <span className="font-semibold text-sm md:text-base">
                    {reminderToast}
                  </span>
                </div>
                <button
                  onClick={() => setReminderToast(null)}
                  className="text-emerald-600 hover:text-emerald-900 font-bold text-sm"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-800">
                  {editingSessionId ? t("editSession") : t("createNewSession")}
                </h2>
                <form onSubmit={handleCreateSession} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t("courseName")}
                      </label>
                      <select
                        required
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="w-full border rounded px-3 py-2 focus:ring-[#002D62] bg-white"
                      >
                        <option value="">{t("selectCourse")}</option>
                        {dynamicCourses.map((c) => (
                          <option key={c.id} value={c.title}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t("startDate")}
                      </label>
                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full border rounded px-3 py-2 focus:ring-[#002D62]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t("endDate")}
                      </label>
                      <input
                        type="date"
                        required
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full border rounded px-3 py-2 focus:ring-[#002D62]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t("sessionNumber")}
                      </label>
                      <select
                        required
                        value={sessionNumber}
                        onChange={(e) => setSessionNumber(e.target.value)}
                        className="w-full border rounded px-3 py-2 focus:ring-[#002D62] bg-white"
                      >
                        <option value="">{t("selectSession")}</option>
                        <option value="sessionOne">{t("sessionOne")}</option>
                        <option value="sessionTwo">{t("sessionTwo")}</option>
                          <option value="sessionThree">{t("sessionThree")}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t("startTime")}
                      </label>
                      <input
                        type="time"
                        required
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full border rounded px-3 py-2 focus:ring-[#002D62]"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t("location")}
                      </label>
                      <input
                        type="text"
                        required
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. Training Room - Central Workshop"
                        className="w-full border rounded px-3 py-2 focus:ring-[#002D62]"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t("targetParticipants")}
                      </label>
                      <select
                        required
                        value={targetParticipants}
                        onChange={(e) => setTargetParticipants(e.target.value)}
                        className="w-full border rounded px-3 py-2 focus:ring-[#002D62] bg-white"
                      >
                        <option value="">{t("selectTarget")}</option>
                        <option value="engineers">{t("engineers")}</option>
                        <option value="technicians">{t("technicians")}</option>
                        <option value="mixed">{t("mixed")}</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-6">
                    <button
                      type="submit"
                      className="flex-1 bg-[#FFC000] text-[#002D62] font-bold py-3 px-6 rounded hover:bg-yellow-500 transition-colors"
                    >
                      {editingSessionId ? t("updateSession") : t("publishPush")}
                    </button>
                    {editingSessionId && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded hover:bg-gray-300 transition-colors"
                      >
                        {t("cancelEdit")}
                      </button>
                    )}
                  </div>
                </form>
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-800">
                  {t("manageUpcoming")}
                </h2>
                {upcomingSessions.length === 0 ? (
                  <div className="text-center py-12 px-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                    <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-gray-600 font-medium">
                      {t("noUpcomingSessions")}
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-4">
                    {upcomingSessions.map((session, index) => (
                      <li key={session.id || index}>
                        <SessionCard
                          session={session}
                          isAdminView={true}
                          onEdit={handleStartEdit}
                          onSendReminder={handleSendReminder}
                          onAnnounceRequest={setAnnouncingSession}
                          onManageAnnouncementsRequest={setShowAnnouncementManager}
                          onFinalizeRequest={setFinalizingSession}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
            
        {/* Training Needs Analysis Section */}
            <div className="border-t border-gray-200 pt-8 mt-8">
              <h2 className="text-2xl font-bold mb-6 text-[#002D62] border-l-4 border-[#FFC000] pl-3 rtl:pr-3 rtl:pl-0 rtl:border-r-4 rtl:border-l-0">
                {t("tna")}
              </h2>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={tnaData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip cursor={{ fill: "#f3f4f6" }} />
                  <Bar
                    dataKey="count"
                    fill="#FFC000"
                    radius={[4, 4, 0, 0]}
                    name={t("requests")}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-gray-200 pt-8 mt-8">
              {/* Resource Sharing Section */}
              <div className="max-w-md">
                <h2 className="text-2xl font-bold mb-6 text-[#002D62] border-l-4 border-[#FFC000] pl-3 rtl:pr-3 rtl:pl-0 rtl:border-r-4 rtl:border-l-0">
                  {t("resourceSharing")}
                </h2>
                <form onSubmit={handleShareResource} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("courseName")}
                    </label>
                    <select
                      value={selectedCourseForResource}
                      onChange={(e) => setSelectedCourseForResource(e.target.value)}
                      className="w-full border rounded px-3 py-2 focus:ring-[#002D62] font-sans"
                      dir="ltr"
                    >
                      {dynamicCourses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("googleDriveLink")}
                    </label>
                    <input
                      type="url"
                      required
                      value={resourceLink}
                      onChange={(e) => setResourceLink(e.target.value)}
                      placeholder="https://drive.google.com/..."
                      className="w-full border rounded px-3 py-2 focus:ring-[#002D62]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-[#002D62] text-white font-bold py-2 px-6 rounded hover:bg-blue-900 flex items-center"
                  >
                    <Share2 size={18} className="mr-2 rtl:ml-2 rtl:mr-0" />{" "}
                    {t("share")}
                  </button>
                </form>
              </div>

              {/* Sync Data & Backup Section */}
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-[#002D62] border-l-4 border-[#FFC000] pl-3 rtl:pr-3 rtl:pl-0 rtl:border-r-4 rtl:border-l-0">
                    {language === "ar"
                      ? "Ã˜Â¥Ã˜Â¯Ã˜Â§Ã˜Â±Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã™Ë†Ã˜Â§Ã™â€žÃ™â€ Ã˜Â³Ã˜Â® Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â­Ã˜ÂªÃ™Å Ã˜Â§Ã˜Â·Ã™Å "
                      : "Data Management & Backup"}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {user?.role === 'admin' && (
                      <>
                        <button 
                          onClick={() => setShowGlobalAnnouncement(true)}
                          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm text-sm"
                        >
                          <Globe size={18} />
                          {language === 'ar' ? 'تنبيه عام لجميع المستخدمين' : 'Global Broadcast'}
                        </button>
                        <button 
                          onClick={() => setShowAnnouncementManager("GLOBAL")}
                          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm text-sm"
                        >
                          <Megaphone size={18} />
                          {language === 'ar' ? 'إدارة التنبيهات' : 'Manage Announcements'}
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => setShowMonthlyReport(true)}
                      className="flex items-center gap-2 bg-[#002D62] hover:bg-blue-900 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm text-sm"
                    >
                      <Mail size={18} />
                      {language === 'ar' ? 'تقرير التحديث الشهري' : 'Monthly Update Report'}
                    </button>
                    <button 
                      onClick={() => exportCloudBackup(users, records, upcomingSessions, cleanedData || [])}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm text-sm"
                    >
                      <Download size={18} />
                      {language === 'ar' ? 'نسخة احتياطية' : 'Backup Data'}
                    </button>
                  </div>
                </div>
                <p className="text-gray-600 mb-6">
                  {language === "ar"
                    ? "ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â± ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â· OneDrive ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€šÃ‚Â Excel ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â®ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Âµ ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€ Ã¢â‚¬â„¢ ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â²ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â© ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â³ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Âª ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨."
                    : "Provide a OneDrive link to your Excel file to synchronize training records."}
                  <br />
                  Expected columns:{" "}
                  <span className="bg-gray-100 px-1 py-0.5 rounded text-sm">
                    ID, Participant Name, Department, Total Courses, Date 1, Duration 1, Score 1
                  </span>
                </p>
                {syncSuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6 flex items-center">
                    <CheckCircle
                      size={20}
                      className="mr-2 rtl:ml-2 rtl:mr-0 flex-shrink-0"
                    />
                    <span className="font-medium">
                      Data successfully synced from OneDrive!
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â· ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€šÃ‚Â OneDrive" : "OneDrive Shared Link"}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none rtl:left-auto rtl:right-0 rtl:pl-0 rtl:pr-3">
                      <Database size={18} className="text-gray-400" />
                    </div>
                    <input
                      type="url"
                      placeholder={
                        language === "ar"
                          ? "Ø£Ù„ØµÙ‚ Ø±Ø§Ø¨Ø· OneDrive Excel Ù‡Ù†Ø§..."
                          : "Paste your OneDrive Excel link here..."
                      }
                      value={syncLink}
                      onChange={(e) => setSyncLink(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg pl-10 rtl:pl-3 rtl:pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-[#002D62] text-gray-700"
                      dir="ltr"
                    />
                  </div>
                </div>
                {isSyncing && (
                  <div className="mb-6">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>
                        {language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â  ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨ ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â²ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â©..." : "Fetching & Syncing..."}
                      </span>
                      <span>{syncProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-[#002D62] h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${syncProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleSyncData}
                  disabled={!syncLink.trim() || isSyncing}
                  className={`w-full font-bold py-3 px-6 rounded-lg transition-colors flex justify-center items-center ${
                    !syncLink.trim() || isSyncing
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-[#FFC000] text-[#002D62] hover:bg-yellow-500 shadow"
                  }`}
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw size={18} className="animate-spin mr-2 rtl:ml-2 rtl:mr-0" />
                      {language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â  ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¹ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â©..." : "Processing..."}
                    </>
                  ) : (
                    <>
                      <RefreshCw size={18} className="mr-2 rtl:ml-2 rtl:mr-0" />
                      {language === "ar" ? "Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â²ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  OneDrive" : "Sync from OneDrive"}
                    </>
                  )}
                </button>
                <div className="flex items-center my-6">
                  <div className="flex-grow border-t border-gray-300"></div>
                  <span className="mx-4 text-gray-500 text-sm font-medium">
                    {language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â£ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â " : "OR"}
                  </span>
                  <div className="flex-grow border-t border-gray-300"></div>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center bg-gray-50">
                  <UploadCloud size={48} className="text-gray-400 mb-4" />
                  <input
                    type="file"
                    id="excel-upload"
                    accept=".xlsx, .xls"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <label
                    htmlFor="excel-upload"
                    className="cursor-pointer bg-white border border-gray-300 px-4 py-2 rounded shadow-sm hover:bg-gray-50 flex items-center mb-2 font-medium text-gray-700"
                  >
                    <UploadCloud size={18} className="mr-2 rtl:ml-2 rtl:mr-0" />
                    {language === "ar" ? "ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â®ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂªÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â± ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€šÃ‚Â Excel ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â­ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â " : "Select Local Excel File"}
                  </label>
                  {syncFile && (
                    <p className="text-sm text-green-600 font-medium">
                      Selected: {syncFile.name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
      {/* Image Viewer Modal */}
      {viewingImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black bg-opacity-80 flex items-center justify-center p-4"
          onClick={() => setViewingImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <button 
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
              onClick={() => setViewingImage(null)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img src={viewingImage} alt="Profile Full" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
          </div>
        </div>
      )}
      {finalizingSession && (
        <FinalizeSessionModal
          session={finalizingSession}
          registeredUsers={users.filter(u => (finalizingSession.registeredUsers || []).includes(u.hrCode))}
          onClose={() => setFinalizingSession(null)}
          onFinalize={handleFinalizeSession}
        />
      )}
      {showGlobalAnnouncement && (
        <AnnouncementModal
          onClose={() => setShowGlobalAnnouncement(false)}
        />
      )}
      {announcingSession && (
        <AnnouncementModal
          session={announcingSession}
          onClose={() => setAnnouncingSession(null)}
        />
      )}
      {showAnnouncementManager && (
        <AnnouncementManagerModal
          sessionId={showAnnouncementManager === "GLOBAL" ? undefined : showAnnouncementManager}
          onClose={() => setShowAnnouncementManager(null)}
        />
      )}
      {showMonthlyReport && (
        <MonthlyReportModal 
          onClose={() => setShowMonthlyReport(false)}
          records={records}
          upcomingSessions={upcomingSessions}
        />
      )}
    </div>
  );
};





