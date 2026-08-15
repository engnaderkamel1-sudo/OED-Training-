$content = Get-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\AdminDashboard.tsx" -Raw

$pattern1 = '(?s)const \[targetParticipants, setTargetParticipants\] = useState\(""\);'
$replace1 = 'const [targetParticipants, setTargetParticipants] = useState("");
    const [feedbackLink, setFeedbackLink] = useState("");'
$content = $content -replace $pattern1, $replace1

$pattern2 = '(?s)setTargetParticipants\(""\);'
$replace2 = 'setTargetParticipants("");
      setFeedbackLink("");'
$content = $content -replace $pattern2, $replace2

$pattern3 = '(?s)setTargetParticipants\(session\.targetParticipants \|\| ""\);'
$replace3 = 'setTargetParticipants(session.targetParticipants || "");
      setFeedbackLink(session.feedbackLink || "");'
$content = $content -replace $pattern3, $replace3

$pattern4 = '(?s)targetParticipants,'
$replace4 = 'targetParticipants,
        feedbackLink: feedbackLink.trim() || undefined,
        feedbackEnabled: false,'
$content = $content -replace $pattern4, $replace4

$pattern5 = '(?s)<div>\s*<label className="block text-xs font-bold text-gray-700 mb-1">\s*\{t\("targetParticipants"\)\}\s*</label>\s*<input\s*type="text"\s*required\s*value=\{targetParticipants\}\s*onChange=\{\(e\) => setTargetParticipants\(e\.target\.value\)\}\s*className="w-full border rounded px-3 py-2 focus:ring-\[\#002D62\]"\s*/>\s*</div>'
$replace5 = '<div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            {t("targetParticipants")}
                          </label>
                          <input
                            type="text"
                            required
                            value={targetParticipants}
                            onChange={(e) => setTargetParticipants(e.target.value)}
                            className="w-full border rounded px-3 py-2 focus:ring-[#002D62]"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            {language === "ar" ? "???? ????? ??????? (???????)" : "Feedback Form Link (Optional)"}
                          </label>
                          <input
                            type="url"
                            value={feedbackLink}
                            onChange={(e) => setFeedbackLink(e.target.value)}
                            placeholder="https://forms.office.com/..."
                            className="w-full border rounded px-3 py-2 focus:ring-[#002D62]"
                          />
                          <p className="text-[10px] text-gray-500 mt-1">
                            {language === "ar" ? "????? ????? ??? ?????? ?????? ?? ????? ????? ???????" : "You can enable this link later from Manage Sessions"}
                          </p>
                        </div>'
$content = $content -replace $pattern5, $replace5

$content | Set-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\AdminDashboard.tsx" -Encoding UTF8
