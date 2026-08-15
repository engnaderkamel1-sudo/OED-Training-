$content = Get-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\AdminDashboard.tsx" -Raw

$pattern = '(?s)              \)\}\s*</div>\s*</div>\s*</div>\s*\{/\* Training Needs Analysis Section \*/\}\s*<div className="border-t border-gray-200 pt-8 mt-8">'
$replace = '              )}
            </div>
          </div>
        )}
            
        {/* Training Needs Analysis Section */}
        {["tools", "tools_reports"].includes(currentView) && (
          <>
            <div className="border-t border-gray-200 pt-8 mt-8">'

$content = $content -replace $pattern, $replace

$content | Set-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\AdminDashboard.tsx" -Encoding UTF8
