const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

code = code.replace("const { t, language, users,", "const { t, language, user, users,");
fs.writeFileSync('src/components/AdminDashboard.tsx', code);
console.log("Fixed user extraction in AdminDashboard");
