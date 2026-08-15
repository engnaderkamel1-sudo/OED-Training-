$content = Get-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\Sidebar.tsx" -Raw

$pattern1 = '(?s)import \{([^\}]+)\} from ''lucide-react'';'
$replace1 = 'import {$1, History } from ''lucide-react'';'
$content = $content -replace $pattern1, $replace1

$pattern2 = '(?s)          \{ id: ''tools_reports'', label: language === ''ar'' \? ''???????? ?????????'' : ''Reports & Sync'', icon: Settings \},'
$replace2 = '          { id: ''tools_reports'', label: language === ''ar'' ? ''???????? ?????????'' : ''Reports & Sync'', icon: Settings },
          { id: ''tools_logs'', label: language === ''ar'' ? ''??? ??????'' : ''Login History'', icon: History },'
$content = $content -replace $pattern2, $replace2

$content | Set-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\Sidebar.tsx" -Encoding UTF8
