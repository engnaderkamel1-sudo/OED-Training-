$content = Get-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\types.ts" -Raw
$pattern = '(?s)status\?: "Active" \| "Cancelled";\s*reminderLog\?: ReminderLogItem\[\];\s*\}'
$replace = 'status?: "Active" | "Cancelled";
  reminderLog?: ReminderLogItem[];
  feedbackLink?: string;
  feedbackEnabled?: boolean;
}'
$content = $content -replace $pattern, $replace
$content | Set-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\types.ts" -Encoding UTF8
