const fs = require('fs');
const path = 'C:/Users/nader.reda/Downloads/oed-training-management-system/src/components/AdminDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// The tools tab starts with: {currentView === "tools" && (
const startIndex = content.indexOf('{currentView === "tools" && (');
if (startIndex === -1) { console.error("Could not find tools tab"); process.exit(1); }

// Find the end of the tools tab. We know the next tab is NOT there, it's the end of the Content Area.
// It ends with <GlobalBroadcastModal ... /> or something?
// Actually we can just find the end of the eturn statement's main div.

// Let's just output the whole section from startIndex to the end to inspect it.
fs.writeFileSync('C:/Users/nader.reda/Downloads/oed-training-management-system/tools_section.txt', content.substring(startIndex));
