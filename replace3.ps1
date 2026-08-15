$content = Get-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\AdminDashboard.tsx" -Raw

# 1. Add getNextSessionNumber helper right before handleCreateSession
$pattern1 = '(?s)  const handleCreateSession = async \(e: React\.FormEvent\) => \{'
$replace1 = '  const getNextSessionNumber = () => {
    let max = 0;
    upcomingSessions.forEach(s => {
      const num = parseInt(s.sessionNumber || "0", 10);
      if (!isNaN(num) && num > max) max = num;
    });
    return (max + 1).toString();
  };

  const handleCreateSession = async (e: React.FormEvent) => {'
$content = $content -replace $pattern1, $replace1

# 2. Update setSessionNumber("") to setSessionNumber(getNextSessionNumber()) in clear form areas
$pattern2 = '(?s)// Clear form fields\s*setSelectedCourseId\(""\);\s*setStartDate\(""\);\s*setEndDate\(""\);\s*setSessionNumber\(""\);'
$replace2 = '// Clear form fields
      setSelectedCourseId("");
      setStartDate("");
      setEndDate("");
      setSessionNumber(getNextSessionNumber());'
$content = $content -replace $pattern2, $replace2

$pattern3 = '(?s)const handleCancelEdit = \(\) => \{\s*setEditingSessionId\(null\);\s*setSelectedCourseId\(""\);\s*setStartDate\(""\);\s*setEndDate\(""\);\s*setSessionNumber\(""\);'
$replace3 = 'const handleCancelEdit = () => {
      setEditingSessionId(null);
      setSelectedCourseId("");
      setStartDate("");
      setEndDate("");
      setSessionNumber(getNextSessionNumber());'
$content = $content -replace $pattern3, $replace3

# 3. Change select input to number input
$pattern4 = '(?s)<select\s*required\s*value=\{sessionNumber\}\s*onChange=\{\(e\) => setSessionNumber\(e\.target\.value\)\}\s*className="w-full border rounded px-3 py-2 focus:ring-\[\#002D62\] bg-white"\s*>\s*<option value="">\{t\("selectSession"\)\}</option>\s*<option value="sessionOne">\{t\("sessionOne"\)\}</option>\s*<option value="sessionTwo">\{t\("sessionTwo"\)\}</option>\s*<option value="sessionThree">\{t\("sessionThree"\)\}</option>\s*</select>'
$replace4 = '<input
                          type="number"
                          required
                          value={sessionNumber}
                          onChange={(e) => setSessionNumber(e.target.value)}
                          className="w-full border rounded px-3 py-2 focus:ring-[#002D62]"
                        />'
$content = $content -replace $pattern4, $replace4

$content | Set-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\AdminDashboard.tsx" -Encoding UTF8
