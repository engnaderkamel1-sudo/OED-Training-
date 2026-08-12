const fs = require('fs');
let lines = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8').split('\n');

let returnLine = lines.findIndex(l => l.includes('return ('));
console.log('Return starts at line:', returnLine);

let jsx = lines.slice(returnLine).join('\n');
console.log('JSX length:', jsx.length);
