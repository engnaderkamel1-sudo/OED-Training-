const fs = require('fs');
let lines = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8').split('\n');

while (lines[lines.length - 1].trim() === '') lines.pop(); // remove trailing blank lines

// Assuming end is:
//         )}
//       </div>
//     </div>
//   );
// };
let closeIndex1 = -1;
let closeIndex2 = -1;
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes('</div>')) {
    if (closeIndex1 === -1) closeIndex1 = i;
    else if (closeIndex2 === -1) { closeIndex2 = i; break; }
  }
}

console.log('Removing lines:', lines[closeIndex1], lines[closeIndex2]);
lines.splice(closeIndex1, 1);
lines.splice(closeIndex2, 1);

fs.writeFileSync('src/components/AdminDashboard.tsx', lines.join('\n'));

