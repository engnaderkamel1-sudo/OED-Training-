```typescript
export type Role = "trainee" | "manager" | "admin" | "supervisor" | null;
export type Language = "ar" | "en";

export interface User {
  id: string;
  username?: string;
  hrCode: string;
  name: string;
  department: string;
  role: Role;
  jobRole?: string;
  phone: string;
  email?: string;
  status: "pending" | "approved" | "rejected" | "deleted";
  createdAt?: string;
  managerEmails?: string[];
  password?: string;
  profileImageUrl?: string;
  hasUnreadNotifications?: boolean;
  fcmToken?: string;
  // --- الخصائص الجديدة ---
  isGuest?: boolean; // حساب مؤقت
  guestExpiryDate?: string; // تاريخ انتهاء الحساب المؤقت
  isShadowAccount?: boolean; // حساب وهمي لتسجيل الحضور اليدوي
  pendingUpdates?: { 
    email?: string; 
    hrCode?: string; 
    requestedAt?: string; 
  }; // طلبات تعديل البيانات قيد المراجعة
  updateHistory?: { // <--- تم نقلها هنا داخل الـ User
    hrCode?: string;
    email?: string;
    status: 'approved' | 'rejected';
    processedAt: string;
    requestedAt?: string;
  }[];
  // --- نشاط المستخدم وآخر ظهور ---
  lastLogin?: string;
  lastDevice?: string;
  lastBrowser?: string;
  lastCity?: string;
  lastCountry?: string;
  lastIp?: string;
}

export interface Course {
  id: string;
  title: string;
  date?: string;
  duration?: string; // e.g., "2 hours", "1 day", "3 Days"
  durationDays?: string | number;
  isUpcoming?: boolean;
  registeredUsers?: string[];
  sharedResourceLink?: string;
  materialLink?: string;
  topicsCovered?: string[] | string;
  description?: string;
  category?: string;
}

export interface TrainingRecord {
  id: string;
  userId: string;
  courseId: string;
  courseName?: string;
  score: number | string;
  attendanceDate: string;
  daysAttended?: number | string;
  totalDays?: number | string;
  hrCode?: string;
  raw?: any;
}

export interface CourseRequest {
  id: string;
  userId: string;
  requestedTopic: string;
  dateRequested: string;
}

export interface ReminderLogItem {
  id: string;
  type: "Standard" | "Final";
  timestamp: string;
}

export interface UpcomingSession {
  id: string;
  courseId?: string;
  courseTitle: string;
  startDate: string;
  endDate: string;
  sessionNumber: string;
  sessionIteration?: string;
  startTime: string;
  location: string;
  targetParticipants: string;
  registeredUsers?: string[];
  unregisteredUsers?: string[];
  createdAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  cancelledBy?: string;
  managerEmails?: string[];
  isDeleted?: boolean;
  status?: "Active" | "Completed" | "Cancelled";
  isRegistrationClosed?: boolean; // إيقاف استقبال طلبات التسجيل
  registrationDeadline?: string; // آخر موعد للتسجيل (تاريخ وساعة)
  reminderLog?: ReminderLogItem[];
  feedbackLink?: string;
  feedbackEnabled?: boolean;
  feedbackSentAt?: string; // تاريخ ووقت إرسال طلب التقييم من الأدمن
  additionalNotificationEmails?: string[];
}

export interface CleanedRecord {
  id: string;
  courseName: string;
  department: string;
  role: string;
  date: string;
  hrCode: string;
  name: string;
  score?: string | number;
  duration?: string;
  attendedDays?: string | number;
  raw?: any;
}

export interface SystemAnnouncement {
  id: string;
  sessionId?: string; // Optional: If provided, it's for a specific course. If null, it's a global broadcast.
  title?: string;
  courseName?: string;
  message: string;
  date: string;
  author: string;
  isGlobal: boolean; // True for system-wide announcements
  targetAudience?: string; // 'engineers' | 'technicians' | 'mixed' | 'all'
}

export interface LoginLog {
  id: string;
  userId: string;
  name: string;
  hrCode: string;
  role: Role;
  timestamp: string;
  device?: string;
  browser?: string;
  ip?: string;
  city?: string;
  country?: string;
}

export type SuggestionCategory = 'ui' | 'course' | 'bug' | 'general';
export type SuggestionStatus = 'pending' | 'reviewing' | 'done' | 'rejected';

export interface Suggestion {
  id: string;
  userId: string;
  userName: string;
  hrCode: string;
  department: string;
  title: string;
  description: string;
  category: SuggestionCategory;
  status: SuggestionStatus;
  createdAt: string;
  adminNote?: string;
  adminMessage?: string;
  adminMessageAt?: string;
  updatedAt?: string;
}

// --- منظومة مقترحات تعديل المحتوى التدريبي (Handouts) ---
export type HandoutRevisionStatus = 'pending' | 'reviewing' | 'applied' | 'rejected';
export type HandoutIssueType = 'typo' | 'technical_update' | 'missing_info' | 'diagram_enhancement' | 'other';

export interface HandoutRevision {
  id: string;
  userId: string;
  userName: string;
  hrCode: string;
  department: string;
  courseId?: string;
  courseTitle: string;
  pageNumber?: string;
  topicOrSection?: string;
  issueType: HandoutIssueType;
  description: string;
  proposedCorrection: string;
  status: HandoutRevisionStatus;
  createdAt: string;
  adminFeedback?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}