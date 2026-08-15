$content = Get-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\Login.tsx" -Raw

$pattern1 = '(?s)const \{ t, language, setUser, users, setUsers, uniqueDepartments \} =\s*useAppContext\(\);'
$replace1 = 'const { t, language, setUser, users, setUsers, uniqueDepartments, addLoginLog, generateUUID } = useAppContext();'
$content = $content -replace $pattern1, $replace1

# There are two places `setUser` is called, admin and standard user
$pattern2 = '(?s)      setUser\(adminUser\);\s*localStorage\.setItem\("savedUserId", adminUser\.id\);'
$replace2 = '      setUser(adminUser);
      localStorage.setItem("savedUserId", adminUser.id);
      addLoginLog({
        id: generateUUID(),
        userId: adminUser.id,
        name: adminUser.name,
        hrCode: adminUser.hrCode,
        role: adminUser.role,
        timestamp: new Date().toISOString()
      });'
$content = $content -replace $pattern2, $replace2

$pattern3 = '(?s)      \} else \{\s*setUser\(foundUser\);\s*localStorage\.setItem\("savedUserId", foundUser\.id\);'
$replace3 = '      } else {
        setUser(foundUser);
        localStorage.setItem("savedUserId", foundUser.id);
        addLoginLog({
          id: generateUUID(),
          userId: foundUser.id,
          name: foundUser.name,
          hrCode: foundUser.hrCode,
          role: foundUser.role,
          timestamp: new Date().toISOString()
        });'
$content = $content -replace $pattern3, $replace3

$content | Set-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\Login.tsx" -Encoding UTF8
