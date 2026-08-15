$content = Get-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\index.html" -Raw
$pattern = '(?s)</head>'
$replace = '  <script src="https://unpkg.com/html5-qrcode"></script>
  </head>'
$content = $content -replace $pattern, $replace
$content | Set-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\index.html" -Encoding UTF8
