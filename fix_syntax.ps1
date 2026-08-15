$content = Get-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\AdminDashboard.tsx" -Raw

# Fix Error 1: Missing </div> before </>)} at line 1925
$pattern1 = '(?s)              </ResponsiveContainer>\s*</div>\s*</>\)\}'
$replace1 = '              </ResponsiveContainer>
            </div>
          </div>
        </>)}'
$content = $content -replace $pattern1, $replace1

# Fix Error 2: Extra </div> instead of </> at line 2131
$pattern2 = '(?s)                </div>\s*</div>\s*</div>\s*</div>\s*</div>\s*\}\)'
$replace2 = '                </div>
              </div>
            </div>
          </div>
        </>
      )}'
$content = $content -replace $pattern2, $replace2

$content | Set-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\AdminDashboard.tsx" -Encoding UTF8
