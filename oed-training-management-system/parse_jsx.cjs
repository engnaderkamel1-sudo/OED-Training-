const fs = require('fs');
const parser = require('@babel/parser');
const content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

try {
  parser.parse(content, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });
  console.log("Success");
} catch (e) {
  console.log("Error at line", e.loc?.line, ":", e.message);
}
