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
    
    // account for <></> tags
    let openFragment = (line.match(/<>/g) || []).length;
    let closeFragment = (line.match(/<\/>/g) || []).length;
    
    depth += openMatches.length;
    depth += openFragment;
    depth -= selfClosing;
    depth -= closeMatches;
    depth -= closeFragment;
    
    if (depth === 0 && line.includes('</div>')) {
      console.log(`Depth hit 0 at line ${i+1}: ${line.trim()}`);
    }
    if (depth < 0) {
      console.log(`Negative depth at line ${i+1}: ${line.trim()}`);
    }
  }
}
