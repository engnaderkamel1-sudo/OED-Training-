$content = Get-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\AdminDashboard.tsx" -Raw

$pattern1 = '(?s)  downloadReportPDF,'
$replace1 = '  downloadReportPDF,
  downloadTrainingRegisterPDF,'
$content = $content -replace $pattern1, $replace1

$pattern2 = '(?s)onFinalizeRequest=\{setFinalizingSession\}'
$replace2 = 'onFinalizeRequest={setFinalizingSession}
                            onPrintRegisterRequest={async (session) => await downloadTrainingRegisterPDF(session, users, records)}'
$content = $content -replace $pattern2, $replace2

$content | Set-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\AdminDashboard.tsx" -Encoding UTF8
