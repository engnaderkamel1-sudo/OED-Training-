const fs = require('fs');
let lines = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8').split('\n');

let kpiLine = lines.findIndex(l => l.includes('{/* Dynamic KPI Summary Bar (Web View) */}'));

if (kpiLine !== -1) {
  lines.splice(kpiLine, 0, '        {/* Records Tab */}');
  lines.splice(kpiLine + 1, 0, '        {activeTab === "records" && (');
  lines.splice(kpiLine + 2, 0, '          <div>');
}

fs.writeFileSync('src/components/AdminDashboard.tsx', lines.join('\n'));
