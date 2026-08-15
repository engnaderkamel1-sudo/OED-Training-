$content = Get-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\AdminDashboard.tsx" -Raw

$pattern1 = '(?s)\}\s*<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">\s*<div>\s*<h2 className="text-xl font-semibold mb-4 text-gray-800">\s*\{editingSessionId \? t\("editSession"\) : t\("createNewSession"\)\}'
$replace1 = '}
            </>)}
            <div className={currentView === "tools_manage" ? "grid grid-cols-1 gap-8" : "grid grid-cols-1 lg:grid-cols-2 gap-8"}>
              {["tools", "tools_create"].includes(currentView) && (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-800">
                  {editingSessionId ? t("editSession") : t("createNewSession")}'
$content = $content -replace $pattern1, $replace1

$pattern2 = '(?s)\}\s*</div>\s*</form>\s*</div>\s*<div>\s*<h2 className="text-xl font-semibold mb-4 text-gray-800">\s*\{t\("manageUpcoming"\)\}'
$replace2 = '}
                  </div>
                </form>
              </div>
              )}
              {["tools", "tools_manage"].includes(currentView) && (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-800">
                  {t("manageUpcoming")}'
$content = $content -replace $pattern2, $replace2

$pattern3 = '(?s)</ul>\s*\}\)\s*</div>\s*</div>\s*</div>\s*</div>\s*\{\/\* Training Needs Analysis Section \*\/\}\s*<div className="border-t border-gray-200 pt-8 mt-8">'
$replace3 = '</ul>
                )}
              </div>
              )}
            </div>
          </div>
        </div>
            
        {/* Training Needs Analysis Section */}
        {["tools", "tools_reports"].includes(currentView) && (
          <>
            <div className="border-t border-gray-200 pt-8 mt-8">'
$content = $content -replace $pattern3, $replace3

$pattern4 = '(?s)</BarChart>\s*</ResponsiveContainer>\s*</div>\s*<div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-gray-200 pt-8 mt-8">\s*\{\/\* Resource Sharing Section \*\/\}'
$replace4 = '</BarChart>
              </ResponsiveContainer>
            </div>
          </>)}

          {["tools", "tools_reports"].includes(currentView) && (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-gray-200 pt-8 mt-8">
              {/* Resource Sharing Section */}'
$content = $content -replace $pattern4, $replace4

$pattern5 = '(?s)</div>\s*</div>\s*</div>\s*</div>\s*\)\}\s*</div>\s*$'
$replace5 = '</div>
              </div>
            </div>
          </div>
          </>)}
        )}
      </div>'
$content = $content -replace $pattern5, $replace5

$content | Set-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\AdminDashboard.tsx" -Encoding UTF8
