const fs = require('fs');
let lines = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8').split('\n');

// Find the line that has `      </div>` right before `            {/* Dynamic KPI Summary Bar (Web View) */}`
let kpiLine = lines.findIndex(l => l.includes(' {/* Dynamic KPI Summary Bar (Web View) */}'));
if (kpiLine !== -1 && lines[kpiLine - 1].includes('</div>')) {
  console.log("Found extra div at", kpiLine - 1);
  lines.splice(kpiLine - 1, 1);
}

// Ensure the end is correct
let endIdx = lines.length - 1;
while(lines[endIdx].trim() === '') endIdx--;
// Ensure last line is `};`
if (lines[endIdx].includes('};')) {
  // previous should be `  );`
  // previous should be `    </div>` // to close min-h-[400px]
  // previous should be `      </div>` // to close root div? wait.
  // The root div is `<div className="flex-1 bg-gray-50 ...">`
  // Then `<div className="max-w-7xl mx-auto">`
  // Let's count properly.
}
fs.writeFileSync('src/components/AdminDashboard.tsx', lines.join('\n'));
