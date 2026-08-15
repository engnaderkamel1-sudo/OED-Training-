$content = Get-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\SessionCard.tsx" -Raw

$pattern1 = '(?s)    onFinalizeRequest\?: \(session: UpcomingSession\) => void;'
$replace1 = '    onFinalizeRequest?: (session: UpcomingSession) => void;
    onPrintRegisterRequest?: (session: UpcomingSession) => void;'
$content = $content -replace $pattern1, $replace1

$pattern2 = '(?s)    onFinalizeRequest,\s*registeredCourseIds'
$replace2 = '    onFinalizeRequest,
    onPrintRegisterRequest,
    registeredCourseIds'
$content = $content -replace $pattern2, $replace2

$pattern3 = '(?s)<button \s*type="button"\s*onClick=\{\(e\) => \{ e\.preventDefault\(\); e\.stopPropagation\(\); if \(onFinalizeRequest\) onFinalizeRequest\(session\); \}\}\s*className="cursor-pointer bg-\[\#002D62\] hover:bg-blue-900 text-white text-xs px-3 py-2 rounded transition-colors flex items-center gap-1 font-bold shadow-sm"\s*>\s*<CheckCircle size=\{14\} />\s*<span>\{language === ''ar'' \? ''????? ???? ???????'' : ''Finalize & Grade''\}</span>\s*</button>'
$replace3 = '<button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onPrintRegisterRequest) onPrintRegisterRequest(session); }}
                  className="cursor-pointer bg-[#FFC000] hover:bg-yellow-500 text-[#002D62] text-xs px-3 py-2 rounded transition-colors flex items-center gap-1 font-bold shadow-sm"
                  title={language === "ar" ? "????? ??? ??????" : "Print Register"}
                >
                  <FileText size={14} />
                  <span>{language === "ar" ? "????? ?????" : "Print Register"}</span>
                </button>
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onFinalizeRequest) onFinalizeRequest(session); }}
                  className="cursor-pointer bg-[#002D62] hover:bg-blue-900 text-white text-xs px-3 py-2 rounded transition-colors flex items-center gap-1 font-bold shadow-sm"
                >
                  <CheckCircle size={14} />
                  <span>{language === "ar" ? "????? ???? ???????" : "Finalize & Grade"}</span>
                </button>'
$content = $content -replace $pattern3, $replace3

# We need to make sure FileText is imported from lucide-react
$pattern4 = '(?s)  CheckCircle,'
$replace4 = '  CheckCircle,
  FileText,'
$content = $content -replace $pattern4, $replace4

$content | Set-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\SessionCard.tsx" -Encoding UTF8
