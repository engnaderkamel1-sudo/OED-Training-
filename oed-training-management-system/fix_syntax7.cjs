const fs = require('fs');
const content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

// A simple way to check tag balance:
let divOpenCount = (content.match(/<div(\s|>)/g) || []).length;
let divCloseCount = (content.match(/<\/div>/g) || []).length;
console.log(`Open div: ${divOpenCount}, Close div: ${divCloseCount}`);
