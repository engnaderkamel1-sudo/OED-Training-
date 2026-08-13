import { User, TrainingRecord, UpcomingSession, CleanedRecord } from '../types';

declare const XLSX: any;

export const exportCloudBackup = (
  users: User[],
  records: TrainingRecord[],
  upcomingSessions: UpcomingSession[],
  cleanedData: CleanedRecord[]
) => {
  if (typeof XLSX === 'undefined') {
    alert('Excel library is loading, please try again in a few seconds.');
    return;
  }

  try {
    const wb = XLSX.utils.book_new();

    // 1. Users Sheet
    const usersData = users.map(u => ({
      'ID': u.id,
      'HR Code': u.hrCode,
      'Name': u.name,
      'Phone': u.phone || '',
      'Department': u.department || '',
      'Job Role': u.jobRole || '',
      'Role': u.role,
      'Status': u.status,
      'Created At': u.createdAt || ''
    }));
    const wsUsers = XLSX.utils.json_to_sheet(usersData);
    XLSX.utils.book_append_sheet(wb, wsUsers, "Users");

    // 2. Sessions Sheet
    const sessionsData = upcomingSessions.map(s => ({
      'ID': s.id,
      'Course Name': s.courseName,
      'Instructor': s.instructor,
      'Date': s.date,
      'Duration': s.duration,
      'Max Attendees': s.maxAttendees,
      'Location': s.location,
      'Status': s.status,
      'Registered Count': s.registeredUsers?.length || 0,
      'Registered HR Codes': (s.registeredUsers || []).join(', '),
      'Created At': s.createdAt || ''
    }));
    const wsSessions = XLSX.utils.json_to_sheet(sessionsData);
    XLSX.utils.book_append_sheet(wb, wsSessions, "Sessions");

    // 3. Analytics (Cleaned Data) Sheet
    if (cleanedData && cleanedData.length > 0) {
      const analyticsData = cleanedData.map(r => ({
        'HR Code': r.hrCode || '',
        'Name': r.name || '',
        'Department': r.department || '',
        'Course Name': r.courseName || '',
        'Date': r.date || '',
        'Score': r.score || '',
        'Attended Days': r.attendedDays || '',
        'Duration': r.duration || '',
        'Role': r.role || ''
      }));
      const wsAnalytics = XLSX.utils.json_to_sheet(analyticsData);
      XLSX.utils.book_append_sheet(wb, wsAnalytics, "Analytics Data");
    }

    const fileName = `OED_Training_Cloud_Backup_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    return true;
  } catch (error) {
    console.error("Error exporting backup:", error);
    alert('Failed to create backup file.');
    return false;
  }
};
