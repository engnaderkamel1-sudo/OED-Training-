$content = Get-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\context.tsx" -Raw

$pattern1 = '(?s)import \{ Language, User, Role, TrainingRecord, CleanedRecord, UpcomingSession, SystemAnnouncement \} from ''\./types'';'
$replace1 = 'import { Language, User, Role, TrainingRecord, CleanedRecord, UpcomingSession, SystemAnnouncement, LoginLog } from ''./types'';'
$content = $content -replace $pattern1, $replace1

$pattern2 = '(?s)  deleteAnnouncement: \(id: string\) => void;'
$replace2 = '  deleteAnnouncement: (id: string) => void;
  loginLogs: LoginLog[];
  addLoginLog: (log: LoginLog) => void;'
$content = $content -replace $pattern2, $replace2

$pattern3 = '(?s)  const \[announcements, setAnnouncementsState\] = useState<SystemAnnouncement\[\]>\(\[\]\);'
$replace3 = '  const [announcements, setAnnouncementsState] = useState<SystemAnnouncement[]>([]);
  const [loginLogs, setLoginLogsState] = useState<LoginLog[]>([]);'
$content = $content -replace $pattern3, $replace3

$pattern4 = '(?s)    const unsubAnnouncements = onSnapshot\(collection\(db, "announcements"\), \(snapshot\) => \{.*?setAnnouncementsState\(announcements\);\s*\}, \(error\) => console\.error\("Firebase Announcements Error:", error\)\);'
$replace4 = '$0

    const unsubLoginLogs = onSnapshot(collection(db, "loginLogs"), (snapshot) => {
      const logs: LoginLog[] = [];
      snapshot.forEach((d) => logs.push(d.data() as LoginLog));
      setLoginLogsState(logs);
    }, (error) => console.error("Firebase Login Logs Error:", error));'
$content = $content -replace $pattern4, $replace4

$pattern5 = '(?s)    return \(\) => \{\s*unsubUsers\(\);\s*unsubSessions\(\);\s*unsubAnnouncements\(\);\s*\}\s*\}, \[\]\);'
$replace5 = '    return () => {
      unsubUsers();
      unsubSessions();
      unsubAnnouncements();
      unsubLoginLogs();
    }
  }, []);'
$content = $content -replace $pattern5, $replace5

$pattern6 = '(?s)  const deleteAnnouncement = async \(id: string\) => \{.*?\}'
$replace6 = '$0

  const addLoginLog = async (log: LoginLog) => {
    try {
      await setDoc(doc(db, "loginLogs", log.id), log);
    } catch (error) {
      console.error("Error adding login log:", error);
    }
  };'
$content = $content -replace $pattern6, $replace6

$pattern7 = '(?s)        deleteAnnouncement,'
$replace7 = '        deleteAnnouncement,
        loginLogs,
        addLoginLog,'
$content = $content -replace $pattern7, $replace7

$content | Set-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\context.tsx" -Encoding UTF8
