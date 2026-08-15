$content = Get-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\context.tsx" -Raw

# 1. Add to context type definition (if any, wait context type isn't defined explicitly, it's just return value)

# 2. Add the function implementation
$pattern1 = '(?s)  const deleteAnnouncement = async \(id: string\) => \{\s*await deleteDoc\(doc\(db, "announcements", id\)\);\s*\}\;'
$replace1 = '  const deleteAnnouncement = async (id: string) => {
    await deleteDoc(doc(db, "announcements", id));
  };

  const addAttendanceRecord = async (sessionId: string, hrCode: string) => {
    const session = upcomingSessions.find(s => s.id === sessionId);
    if (!session) return;
    const trainee = localUsers.find(u => u.hrCode === hrCode);
    if (!trainee) return;
    
    // Create CleanedRecord
    const recordId = generateUUID();
    const newRecord: CleanedRecord = {
      id: recordId,
      courseName: session.courseTitle,
      department: trainee.department,
      role: trainee.jobRole || trainee.role || "trainee",
      date: session.startDate,
      hrCode: trainee.hrCode,
      name: trainee.name,
      score: "N/A", // Default for attendance
      attendedDays: 1, // Marked as attended
      duration: "1 day", // Rough estimate, printUtils handles exact duration
      raw: {
        "Attended Days": 1,
        "Score": "N/A"
      }
    };
    
    await setDoc(doc(db, "cleanedData", recordId), newRecord);
  };'
$content = $content -replace $pattern1, $replace1

# 3. Add to provider value
$pattern2 = '(?s)announcements, addAnnouncement, deleteAnnouncement,'
$replace2 = 'announcements, addAnnouncement, deleteAnnouncement,
      addAttendanceRecord,'
$content = $content -replace $pattern2, $replace2

$content | Set-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\context.tsx" -Encoding UTF8
