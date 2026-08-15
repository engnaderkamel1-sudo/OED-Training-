$content = Get-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\TraineeDashboard.tsx" -Raw

$pattern1 = '(?s)import \{ SessionCard \} from ''./SessionCard'';'
$replace1 = 'import { SessionCard } from ''./SessionCard'';
import { QRScannerModal } from ''./QRScannerModal'';'
$content = $content -replace $pattern1, $replace1

$pattern2 = '(?s)const \{ upcomingSessions, records, user, language \} = useAppContext\(\);'
$replace2 = 'const { upcomingSessions, records, user, language, addAttendanceRecord } = useAppContext();
  const [scanningSessionId, setScanningSessionId] = useState<string | null>(null);'
$content = $content -replace $pattern2, $replace2

$pattern3 = '(?s)onUnregister=\{doTraineeUnregister\}'
$replace3 = 'onUnregister={doTraineeUnregister}
                  onScanQR={() => setScanningSessionId(session.id)}'
$content = $content -replace $pattern3, $replace3

$pattern4 = '(?s)export const TraineeDashboard: React\.FC = \(\) => \{'
$replace4 = 'export const TraineeDashboard: React.FC = () => {'
$content = $content -replace $pattern4, $replace4

$pattern5 = '(?s)return \('
$replace5 = 'const handleScanSuccess = async (scannedSessionId: string) => {
    if (scannedSessionId !== scanningSessionId) {
      alert(language === "ar" ? "????? ??????? ?? ????? ??? ??????!" : "Scanned code does not match this session!");
      return;
    }
    if (user) {
      await addAttendanceRecord(scannedSessionId, user.hrCode);
      alert(language === "ar" ? "?? ????? ????? ?????!" : "Attendance recorded successfully!");
    }
    setScanningSessionId(null);
  };

  return ('
$content = $content -replace $pattern5, $replace5

$pattern6 = '(?s)</Layout>'
$replace6 = '  {scanningSessionId && (
        <QRScannerModal
          language={language}
          onClose={() => setScanningSessionId(null)}
          onScanSuccess={handleScanSuccess}
        />
      )}
    </Layout>'
$content = $content -replace $pattern6, $replace6

$content | Set-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\TraineeDashboard.tsx" -Encoding UTF8
