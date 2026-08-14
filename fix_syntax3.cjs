const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

// The problematic block is around lines 635-645:
/*
                </table>
        )}
      </div>
    </div>
            )}
          </div>
        </div>
              </div>
            </div>
*/

// Let's replace the whole tail of the tab container.
content = content.replace(
  `                </table>
        )}
      </div>
    </div>
            )}
          </div>
        </div>
              </div>
            </div>
            {/* Dynamic KPI Summary Bar (Web View) */}`,
  `                </table>
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
    </div>

    {/* Dynamic KPI Summary Bar (Web View) */}`
);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
