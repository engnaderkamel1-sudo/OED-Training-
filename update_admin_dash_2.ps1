$content = Get-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\AdminDashboard.tsx" -Raw

$pattern1 = '(?s)import \{ QRCodeModal \} from "./QRCodeModal";'
$replace1 = ''
$content = $content -replace $pattern1, $replace1

$pattern2 = '(?s)import \{ AnnouncementManagerModal \} from "./AnnouncementManagerModal";'
$replace2 = 'import { AnnouncementManagerModal } from "./AnnouncementManagerModal";
import { QRCodeModal } from "./QRCodeModal";'
$content = $content -replace $pattern2, $replace2

$pattern3 = '(?s)const \[announcingSession, setAnnouncingSession\] = useState<UpcomingSession \| null>\(null\);'
$replace3 = 'const [announcingSession, setAnnouncingSession] = useState<UpcomingSession | null>(null);
  const [qrSession, setQrSession] = useState<UpcomingSession | null>(null);'
$content = $content -replace $pattern3, $replace3

$pattern4 = '(?s)const handleSendReminder = \(sessionId: string, type: ''Standard'' \| ''Final''\) => \{'
$replace4 = 'const handleToggleFeedback = (session: UpcomingSession) => {
    updateUpcomingSession(session.id, {
      feedbackEnabled: !session.feedbackEnabled
    });
    if (!session.feedbackEnabled) {
      // It is being enabled, send announcement
      addAnnouncement({
        title: language === "ar" ? "????? ?????? ???? ????" : "Course Evaluation Available",
        content: language === "ar" 
          ? `???? ????? ??????: ${session.courseTitle}. ?????? ???? ?? ???? ?????? ?????? ??.` 
          : `Please evaluate the session: ${session.courseTitle}. The link is available in your dashboard.`,
        priority: "high",
        targetAudience: "all",
        targetSessionId: session.id,
        link: session.feedbackLink
      });
      alert(language === "ar" ? "?? ????? ??????? ?????? ????? ?????????" : "Feedback enabled and announcement sent to trainees.");
    }
  };

  const handleSendReminder = (sessionId: string, type: ''Standard'' | ''Final'') => {'
$content = $content -replace $pattern4, $replace4

$pattern5 = '(?s)onPrintRegisterRequest=\{\w+\s*\([^)]*\)\s*=>[^}]*\}\s*'
$replace5 = '$0
                            onShowQR={setQrSession}
                            onToggleFeedback={handleToggleFeedback}
                            '
$content = $content -replace $pattern5, $replace5

$pattern6 = '(?s)\{announcingSession && \('
$replace6 = '{qrSession && (
        <QRCodeModal
          session={qrSession}
          language={language}
          onClose={() => setQrSession(null)}
        />
      )}
      
      {announcingSession && ('
$content = $content -replace $pattern6, $replace6

$content | Set-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\AdminDashboard.tsx" -Encoding UTF8
