$content = Get-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\AdminDashboard.tsx" -Raw

$pattern = '(?s)                </div>\s*</div>\s*</div>\s*</div>\s*</div>\s*\)\}'
$replace = '                </div>
              </div>
            </div>
          </div>
        </>
      )}'
$content = $content -replace $pattern, $replace

$content | Set-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\AdminDashboard.tsx" -Encoding UTF8
