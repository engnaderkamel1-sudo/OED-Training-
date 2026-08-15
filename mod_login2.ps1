$content = Get-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\Login.tsx" -Raw

$pattern1 = '(?s)import \{ useAppContext \} from "\.\./context";'
$replace1 = 'import { useAppContext, generateUUID } from "../context";'
$content = $content -replace $pattern1, $replace1

$pattern2 = '(?s)const \{ t, language, setUser, users, setUsers, uniqueDepartments, addLoginLog, generateUUID \} = useAppContext\(\);'
$replace2 = 'const { t, language, setUser, users, setUsers, uniqueDepartments, addLoginLog } = useAppContext();'
$content = $content -replace $pattern2, $replace2

$content | Set-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\Login.tsx" -Encoding UTF8
