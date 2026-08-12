const fs = require('fs');
let code = fs.readFileSync('src/components/TraineeDashboard.tsx', 'utf8');

const importStatement = "import { SessionCard } from './SessionCard';\n";
if (!code.includes("SessionCard")) {
  code = code.replace("import { DataField } from './DataField';", "import { DataField } from './DataField';\n" + importStatement);
}

const replacement = `{upcomingSessions.map(session => (
              <SessionCard 
                key={session.id} 
                session={session} 
                isAdminView={false} 
                registeredCourseIds={registeredCourseIds}
                onRegister={handleRegisterSession}
              />
            ))}`;

const regex = /\{upcomingSessions\.map\(session => \{[\s\S]*?\}\)\}/g;
code = code.replace(regex, replacement);
fs.writeFileSync('src/components/TraineeDashboard.tsx', code);
console.log("Done updating Trainee");
