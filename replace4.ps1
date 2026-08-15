$content = Get-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\AdminDashboard.tsx" -Raw

$pattern1 = '(?s)  const getNextSessionNumber = \(\) => \{'
$replace1 = '  useEffect(() => {
    if (["tools_create"].includes(currentView) && !editingSessionId && !sessionNumber) {
      setSessionNumber(getNextSessionNumber());
    }
  }, [currentView, editingSessionId, sessionNumber]);

  const getNextSessionNumber = () => {'
$content = $content -replace $pattern1, $replace1

$content | Set-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\AdminDashboard.tsx" -Encoding UTF8
