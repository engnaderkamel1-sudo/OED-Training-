import { User, TrainingRecord, UpcomingSession, CleanedRecord, Course } from '../types';

declare const XLSX: any;

export const exportCloudBackup = (
  users: User[],
  records: TrainingRecord[],
  upcomingSessions: UpcomingSession[],
  cleanedData: CleanedRecord[],
  courses: Course[] = []
) => {
  if (typeof XLSX === 'undefined') {
    alert('Excel library is loading, please try again in a few seconds.');
    return false;
  }

  try {
    const wb = XLSX.utils.book_new();

    // 1. Users Sheet
    const usersData = (users || []).map(u => ({
      'ID': u.id,
      'HR Code': u.hrCode || '',
      'Name': u.name || '',
      'Phone': u.phone || '',
      'Department': u.department || '',
      'Job Role': u.jobRole || '',
      'Role': u.role || 'trainee',
      'Status': u.status || 'approved',
      'Email': u.email || '',
      'Created At': u.createdAt || ''
    }));
    const wsUsers = XLSX.utils.json_to_sheet(usersData);
    XLSX.utils.book_append_sheet(wb, wsUsers, "Users & Trainees");

    // 2. Courses Catalog Sheet
    const coursesList = courses && courses.length > 0 ? courses : [];
    const coursesData = coursesList.map(c => ({
      'Course ID': c.id,
      'Course Title': c.title,
      'Duration (Days)': c.durationDays || c.duration || 1,
      'Topics Covered': (c.topicsCovered || []).join(', '),
      'Material Link': c.materialLink || ''
    }));
    if (coursesData.length > 0) {
      const wsCourses = XLSX.utils.json_to_sheet(coursesData);
      XLSX.utils.book_append_sheet(wb, wsCourses, "Courses Catalog");
    }

    // 3. Training Sessions Sheet
    const sessionsData = (upcomingSessions || []).map(s => ({
      'Session ID': s.id,
      'Course Name': s.courseTitle || s.courseId || '',
      'Session Number': s.sessionNumber || '',
      'Status': s.status || 'Active',
      'Start Date': s.startDate || '',
      'End Date': s.endDate || '',
      'Start Time': s.startTime || '',
      'Target Participants': s.targetParticipants || '',
      'Location': s.location || '',
      'Registered Attendees Count': s.registeredUsers?.length || 0,
      'Registered HR Codes': (s.registeredUsers || []).join(', ')
    }));
    const wsSessions = XLSX.utils.json_to_sheet(sessionsData);
    XLSX.utils.book_append_sheet(wb, wsSessions, "Training Sessions");

    // 4. Training Records & Attendance History Sheet (Merge cleanedData + records + cached records)
    let finalRecordsList: any[] = [];
    if (cleanedData && cleanedData.length > 0) {
      finalRecordsList = cleanedData;
    } else if (records && records.length > 0) {
      finalRecordsList = records.map(r => ({
        hrCode: r.hrCode || r.userId || '',
        name: (r as any).name || (r as any).traineeName || '',
        department: (r as any).department || '',
        courseName: r.courseName || r.courseId || '',
        date: r.attendanceDate || '',
        score: r.score || 'N/A',
        attendedDays: r.daysAttended || 1,
        duration: r.totalDays || '1 day',
        role: (r as any).role || ''
      }));
    } else {
      // Try local storage cache fallback
      try {
        const cached = localStorage.getItem('oed_cached_training_records');
        if (cached) {
          finalRecordsList = JSON.parse(cached);
        }
      } catch (e) {}
    }

    if (finalRecordsList && finalRecordsList.length > 0) {
      const recordsData = finalRecordsList.map((r: any) => ({
        'HR Code': r.hrCode || r.userId || '',
        'Trainee Name': r.name || r.traineeName || '',
        'Department': r.department || '',
        'Course Name': r.courseName || r.courseId || '',
        'Attendance Date': r.date || r.attendanceDate || '',
        'Score / Grade': r.score || (r.raw && r.raw['Score']) || 'N/A',
        'Attended Days': r.attendedDays || r.daysAttended || (r.raw && r.raw['Attended Days']) || 1,
        'Duration': r.duration || r.totalDays || (r.raw && r.raw['Course Duration']) || '1 day',
        'Job Role': r.role || ''
      }));
      const wsRecords = XLSX.utils.json_to_sheet(recordsData);
      XLSX.utils.book_append_sheet(wb, wsRecords, "Attendance & History");
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
