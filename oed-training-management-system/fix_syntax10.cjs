const fs = require('fs');
let lines = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8').split('\n');

// It currently ends with:
//   );
// };

lines.splice(lines.length - 2, 0, '    </div>');
fs.writeFileSync('src/components/AdminDashboard.tsx', lines.join('\n'));
