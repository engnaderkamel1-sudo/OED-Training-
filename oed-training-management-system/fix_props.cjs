const fs = require('fs');

// Fix Admin Dashboard
let adminCode = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');
const adminReplacement = `<SessionCard 
                          session={session} 
                          userRole="Admin" 
                          currentUserHrCode={user?.hrCode || 'admin'}
                          onEdit={handleStartEdit}
                          onSendReminder={handleSendReminder}
                        />`;
adminCode = adminCode.replace(/<SessionCard[\s\S]*?\/>/g, adminReplacement);
fs.writeFileSync('src/components/AdminDashboard.tsx', adminCode);

// Fix Trainee Dashboard
let traineeCode = fs.readFileSync('src/components/TraineeDashboard.tsx', 'utf8');
const traineeReplacement = `<SessionCard 
                key={session.id} 
                session={session} 
                userRole="Trainee"
                currentUserHrCode={user?.hrCode || 'trainee'}
              />`;
traineeCode = traineeCode.replace(/<SessionCard[\s\S]*?\/>/g, traineeReplacement);
fs.writeFileSync('src/components/TraineeDashboard.tsx', traineeCode);

console.log("Done fixing props");
