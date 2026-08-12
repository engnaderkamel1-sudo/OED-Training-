const fs = require('fs');
let lines = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8').split('\n');

// Find the last `        )}` which is likely closing the `sync` tab.
let lastSyncEnd = -1;
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes('        )}')) {
    lastSyncEnd = i;
    break;
  }
}

if (lastSyncEnd !== -1) {
  let newEnd = [
    '      </div>',
    '    </div>',
    '  );',
    '};'
  ];
  lines = lines.slice(0, lastSyncEnd + 1).concat(newEnd);
  fs.writeFileSync('src/components/AdminDashboard.tsx', lines.join('\n'));
}
