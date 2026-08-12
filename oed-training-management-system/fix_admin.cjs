const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

code = code.replace("onEdit={handleEditSession}", "onEdit={handleStartEdit}");
fs.writeFileSync('src/components/AdminDashboard.tsx', code);
