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
  createdAt?: string;
  managerEmails?: string[];
  profileImageUrl?: string;
  hasUnreadNotifications?: boolean;
  fcmToken?: string;
}

export interface Course {
  id: string;
  title: string;
  date: string;
  duration: string; // e.g., "2 hours", "1 day"
  isUpcoming: boolean;
  registeredUsers?: string[];
  sharedResourceLink?: string;
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
  startTime: string;
  location: string;
  targetParticipants: string;
  registeredUsers?: string[];
  unregisteredUsers?: string[];
  createdAt?: string;
  managerEmails?: string[];
  isDeleted?: boolean;
  status?: "Active" | "Cancelled";
  reminderLog?: ReminderLogItem[];
  feedbackLink?: string;
  feedbackEnabled?: boolean;
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
}

