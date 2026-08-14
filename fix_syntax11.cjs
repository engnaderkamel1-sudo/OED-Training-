const fs = require('fs');
let lines = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8').split('\n');

let depth = 0;
let inJsx = false;
for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  if (line.includes('return (')) {
    inJsx = true;
  }
  if (inJsx) {
    let openMatches = (line.match(/<[A-Za-z0-9]+/g) || []).filter(m => !m.startsWith('</'));
    let selfClosing = (line.match(/\/>/g) || []).length;
    let closeMatches = (line.match(/<\/[A-Za-z0-9]+/g) || []).length;
    
    depth += openMatches.length;
    depth -= selfClosing;
    depth -= closeMatches;
    
    if (depth <= 0 && i < lines.length - 10) {
      console.log(`Depth hit ${depth} at line ${i+1}: ${line.trim()}`);
    }
  }
}
