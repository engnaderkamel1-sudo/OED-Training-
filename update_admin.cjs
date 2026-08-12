const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const importStatement = "import { SessionCard } from './SessionCard';\n";
if (!code.includes("SessionCard")) {
  code = code.replace("import { DataField } from './DataField';", "import { DataField } from './DataField';\n" + importStatement);
}

const replacement = `{upcomingSessions.map((session, index) => (
                      <li key={session.id || index}>
                        <SessionCard 
                          session={session} 
                          isAdminView={true} 
                          onEdit={handleEditSession}
                          onSendReminder={handleSendReminder}
                        />
                      </li>
                    ))}`;

const regex = /\{upcomingSessions\.map\(\(session, index\) => \{[\s\S]*?\}\)\}/g;
code = code.replace(regex, replacement);
fs.writeFileSync('src/components/AdminDashboard.tsx', code);
console.log("Done updating Admin");
