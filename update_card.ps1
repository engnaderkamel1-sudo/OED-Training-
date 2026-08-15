$content = Get-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\SessionCard.tsx" -Raw

$pattern1 = '(?s)onPrintRegisterRequest\?: \(session: UpcomingSession\) => void;'
$replace1 = 'onPrintRegisterRequest?: (session: UpcomingSession) => void;
  onShowQR?: (session: UpcomingSession) => void;
  onScanQR?: (session: UpcomingSession) => void;
  onToggleFeedback?: (session: UpcomingSession) => void;'
$content = $content -replace $pattern1, $replace1

$pattern2 = '(?s)onPrintRegisterRequest,'
$replace2 = 'onPrintRegisterRequest,
  onShowQR,
  onScanQR,
  onToggleFeedback,'
$content = $content -replace $pattern2, $replace2

# Add QR button for admin (before Print Register)
$pattern3 = '(?s)<button \s*type="button"\s*onClick=\{\(e\) => \{ e\.preventDefault\(\); e\.stopPropagation\(\); if \(onPrintRegisterRequest\) onPrintRegisterRequest\(session\); \}\}'
$replace3 = '<button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onShowQR) onShowQR(session); }}
                  className="cursor-pointer bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 text-xs px-3 py-2 rounded transition-colors flex items-center gap-1 font-bold shadow-sm"
                  title={language === "ar" ? "??? ??? ??????" : "Show QR Code"}
                >
                  <QrCode size={14} />
                  <span>QR Code</span>
                </button>
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onPrintRegisterRequest) onPrintRegisterRequest(session); }}'
$content = $content -replace $pattern3, $replace3

# Add Toggle Feedback button for admin (after Finalize)
$pattern4 = '(?s)<span>\{language === ''ar'' \? ''إنهاء وحضور'' : ''Finalize & Grade''\}</span>\s*</button>'
$replace4 = '<span>{language === ''ar'' ? ''إنهاء وحضور'' : ''Finalize & Grade''}</span>
                </button>
                {session.feedbackLink && (
                  <button 
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onToggleFeedback) onToggleFeedback(session); }}
                    className={`cursor-pointer text-xs px-3 py-2 rounded transition-colors flex items-center gap-1 font-bold shadow-sm ${
                      session.feedbackEnabled 
                        ? "bg-green-100 text-green-700 border border-green-300 hover:bg-green-200" 
                        : "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
                    }`}
                  >
                    <MessageSquare size={14} />
                    <span>{session.feedbackEnabled ? (language === "ar" ? "??????? ????" : "Feedback On") : (language === "ar" ? "????? ???????" : "Enable Feedback")}</span>
                  </button>
                )}'
$content = $content -replace $pattern4, $replace4

# Add Trainee Scan and Evaluate buttons (next to Cancel Registration or Register)
$pattern5 = '(?s)<span>\{t\(''cancelRegistration''\)\}</span>\s*</button>'
$replace5 = '<span>{t(''cancelRegistration'')}</span>
                  </button>
                  {session.status === "Active" && (
                    <button 
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onScanQR) onScanQR(session); }}
                      className="cursor-pointer bg-[#002D62] text-white hover:bg-blue-900 px-3.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
                    >
                      <ScanLine size={15} />
                      <span>{language === "ar" ? "????? ??????" : "Scan Attendance"}</span>
                    </button>
                  )}
                  {session.feedbackEnabled && session.feedbackLink && (
                    <a 
                      href={session.feedbackLink}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="cursor-pointer bg-green-600 text-white hover:bg-green-700 px-3.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
                    >
                      <MessageSquare size={15} />
                      <span>{language === "ar" ? "????? ??????" : "Evaluate Session"}</span>
                    </a>
                  )}'
$content = $content -replace $pattern5, $replace5

# Import icons
$pattern6 = '(?s)FileText,'
$replace6 = 'FileText, QrCode, ScanLine, MessageSquare,'
$content = $content -replace $pattern6, $replace6

$content | Set-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\SessionCard.tsx" -Encoding UTF8
