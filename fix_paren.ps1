$content = Get-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\AdminDashboard.tsx" -Raw

$pattern = '(?s)                  </ul>\s*\)\}\s*</div>\s*</div>\s*</div>\s*</div>\s*\{/\* Training Needs Analysis Section \*/\}'
$replace = '                  </ul>
                )}
              </div>
              )}
            </div>
          </div>
        </div>
            
        {/* Training Needs Analysis Section */}'
$content = $content -replace $pattern, $replace

$content | Set-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\AdminDashboard.tsx" -Encoding UTF8
