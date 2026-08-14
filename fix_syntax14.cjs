const fs = require('fs');
let lines = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8').split('\n');

let kpiLine = lines.findIndex(l => l.includes('{/* Dynamic KPI Summary Bar (Web View) */}'));
if (kpiLine !== -1 && lines[kpiLine - 1].trim() === '</div>') {
  console.log("Found extra div at", kpiLine - 1);
  lines.splice(kpiLine - 1, 1);
}

// ensure end matches
lines = lines.filter(l => l.trim() !== ''); // remove blanks
while(lines[lines.length -1].trim() !== '};') {
  lines.pop();
}

// The end should be:
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// let's just make the end correct explicitly:
let lastIdx = lines.length - 1;
if (lines[lastIdx] === '};' && lines[lastIdx - 1] === '  );') {
  lines.splice(lastIdx - 1, 0, '      </div>');
  lines.splice(lastIdx - 1, 0, '    </div>');
}

fs.writeFileSync('src/components/AdminDashboard.tsx', lines.join('\n'));
