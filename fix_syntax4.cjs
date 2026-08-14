const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');
let lines = content.split('\n');

// Find the line that has '                </table>'
let startIdx = lines.findIndex((l, i) => i > 600 && l === '                </table>');

if (startIdx !== -1) {
  // We want to replace everything from startIdx down to the line before {/* Dynamic KPI Summary Bar (Web View) */}
  let endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('{/* Dynamic KPI Summary Bar (Web View) */}'));
  
  if (endIdx !== -1) {
    let newBlock = \`                </table>
              </div>
            ) : (
              <p className="text-gray-500">No pending users.</p>
            )}
          </div>
        )}

        {/* Trainees Tab */}
        {activeTab === 'trainees' && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">{t('traineeManagement')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 border-b">
                    <th className="p-3">{t('hrCode')}</th>
                    <th className="p-3">{t('name')}</th>
                    <th className="p-3">{t('department')}</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {traineeUsers.map(u => (
                    <tr key={u.id} className="border-b">
                      <td className="p-3"><DataField>{u.hrCode}</DataField></td>
                      <td className="p-3"><DataField>{u.name}</DataField></td>
                      <td className="p-3"><DataField>{u.department}</DataField></td>
                      <td className="p-3">
                        <button 
                          onClick={() => handleReject(u.id)}
                          className="flex items-center text-red-600 bg-red-50 px-3 py-1 rounded hover:bg-red-100"
                        >
                          {t('remove')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>\`;
    
    lines.splice(startIdx, endIdx - startIdx, newBlock);
    fs.writeFileSync('src/components/AdminDashboard.tsx', lines.join('\n'));
    console.log('Fixed syntax!');
  }
}
