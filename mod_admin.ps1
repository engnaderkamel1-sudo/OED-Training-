$content = Get-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\AdminDashboard.tsx" -Raw

$pattern1 = '(?s)\{\["tools", "tools_manage", "tools_create", "tools_reports"\]\.includes\(currentView\) && \('
$replace1 = '{["tools", "tools_manage", "tools_create", "tools_reports", "tools_logs"].includes(currentView) && ('
$content = $content -replace $pattern1, $replace1

$pattern2 = '(?s)import \{ useAppContext \} from "\.\./context";'
$replace2 = 'import { useAppContext } from "../context";
import { Clock } from "lucide-react";'
$content = $content -replace $pattern2, $replace2

$pattern3 = '(?s)            </div>\s*</div>\s*\)\}'
$replace3 = '            </div>
          </div>
          {["tools_logs"].includes(currentView) && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h2 className="text-2xl font-bold mb-6 text-[#002D62] border-l-4 border-[#FFC000] pl-3 rtl:pr-3 rtl:pl-0 rtl:border-r-4 rtl:border-l-0 flex items-center gap-2">
                <Clock className="text-[#FFC000]" size={24} />
                {language === "ar" ? "??? ??????" : "Login History"}
              </h2>
              {loginLogs && loginLogs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left rtl:text-right text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3">{language === "ar" ? "?????" : "Name"}</th>
                        <th className="px-6 py-3">{language === "ar" ? "????? ???????" : "HR Code"}</th>
                        <th className="px-6 py-3">{language === "ar" ? "?????" : "Role"}</th>
                        <th className="px-6 py-3">{language === "ar" ? "??? ??????" : "Time"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...loginLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 50).map(log => (
                        <tr key={log.id} className="bg-white border-b hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-900">{log.name}</td>
                          <td className="px-6 py-4">{log.hrCode}</td>
                          <td className="px-6 py-4 capitalize">{log.role}</td>
                          <td className="px-6 py-4" dir="ltr">{new Date(log.timestamp).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {language === "ar" ? "?? ???? ????? ???? ???" : "No login records yet"}
                </div>
              )}
            </div>
          )}
        )}'
$content = $content -replace $pattern3, $replace3

$pattern4 = '(?s)const \{\s*t,\s*language,\s*currentView,\s*\} = useAppContext\(\);'
$replace4 = 'const {
      t,
      language,
      currentView,
      loginLogs,
    } = useAppContext();'
$content = $content -replace $pattern4, $replace4

$content | Set-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\AdminDashboard.tsx" -Encoding UTF8
