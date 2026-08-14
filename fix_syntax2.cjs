const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');
let lines = content.split('\n');

for (let i = 635; i < 645; i++) {
  if (lines[i] && lines[i].includes('        </div>')) {
    lines[i] = '        )}';
    lines[i+1] = '      </div>';
    lines[i+2] = '    </div>';
    break;
  }
}

fs.writeFileSync('src/components/AdminDashboard.tsx', lines.join('\n'));
