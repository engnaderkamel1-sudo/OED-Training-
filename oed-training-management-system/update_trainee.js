const fs = require('fs');
let code = fs.readFileSync('src/components/TraineeDashboard.tsx', 'utf8');

const importStatement = "import { SessionCard } from './SessionCard';\n";
if (!code.includes("SessionCard")) {
  code = code.replace("import { DataField } from './DataField';", "import { DataField } from './DataField';\n" + importStatement);
}

// Find the map section
const mapStart = code.indexOf("{upcomingSessions.map(session => {");
const mapEnd = code.indexOf("</button>", code.indexOf("handleRegisterSession(session)", mapStart)) + "</button>".length;

const replacement = `{upcomingSessions.map(session => (
              <SessionCard 
                key={session.id} 
                session={session} 
                isAdminView={false} 
                registeredCourseIds={registeredCourseIds}
                onRegister={handleRegisterSession}
              />
            ))}`;

if (mapStart !== -1 && mapEnd !== -1) {
  // We need to carefully find the end of the map function.
  // Actually regex replacement is safer.
  const regex = /\{upcomingSessions\.map\(session => \{[\s\S]*?\}\)\}/g;
  code = code.replace(regex, replacement);
  fs.writeFileSync('src/components/TraineeDashboard.tsx', code);
}
