$content = Get-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\AdminDashboard.tsx" -Raw

$target1 = "}
            <div className=`"grid grid-cols-1 lg:grid-cols-2 gap-8`">
              <div>
                <h2 className=`"text-xl font-semibold mb-4 text-gray-800`">
                  {editingSessionId ? t(`"editSession`") : t(`"createNewSession`")}"

$replace1 = "}
            </>)}
            <div className={currentView === `"tools_manage`" ? `"grid grid-cols-1 gap-8`" : `"grid grid-cols-1 lg:grid-cols-2 gap-8`"}>
              {[`"tools`", `"tools_create`"].includes(currentView) && (
              <div>
                <h2 className=`"text-xl font-semibold mb-4 text-gray-800`">
                  {editingSessionId ? t(`"editSession`") : t(`"createNewSession`")}"

$content = $content.Replace($target1.Replace("`r`n", "`n"), $replace1.Replace("`r`n", "`n"))
$content = $content.Replace($target1, $replace1)


$target2 = "}
                  </div>
                </form>
              </div>
              <div>
                <h2 className=`"text-xl font-semibold mb-4 text-gray-800`">
                  {t(`"manageUpcoming`")}"

$replace2 = "}
                  </div>
                </form>
              </div>
              )}
              {[`"tools`", `"tools_manage`"].includes(currentView) && (
              <div>
                <h2 className=`"text-xl font-semibold mb-4 text-gray-800`">
                  {t(`"manageUpcoming`")}"

$content = $content.Replace($target2.Replace("`r`n", "`n"), $replace2.Replace("`r`n", "`n"))
$content = $content.Replace($target2, $replace2)


$target3 = "                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
            
        {/* Training Needs Analysis Section */}
            <div className=`"border-t border-gray-200 pt-8 mt-8`">"

$replace3 = "                  </ul>
                )}
              </div>
              )}
            </div>
          </div>
        )}
            
        {/* Training Needs Analysis Section */}
        {[`"tools`", `"tools_reports`"].includes(currentView) && (
          <>
            <div className=`"border-t border-gray-200 pt-8 mt-8`">"

$content = $content.Replace($target3.Replace("`r`n", "`n"), $replace3.Replace("`r`n", "`n"))
$content = $content.Replace($target3, $replace3)


$target4 = "                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className=`"grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-gray-200 pt-8 mt-8`">
              {/* Resource Sharing Section */}"

$replace4 = "                </BarChart>
              </ResponsiveContainer>
            </div>
          </>)}

          {[`"tools`", `"tools_reports`"].includes(currentView) && (
            <>
            <div className=`"grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-gray-200 pt-8 mt-8`">
              {/* Resource Sharing Section */}"

$content = $content.Replace($target4.Replace("`r`n", "`n"), $replace4.Replace("`r`n", "`n"))
$content = $content.Replace($target4, $replace4)


$target5 = "</div>
              </div>
            </div>
          </div>
        )}
      </div>"

$replace5 = "</div>
              </div>
            </div>
          </div>
          </>)}
        )}
      </div>"

$content = $content.Replace($target5.Replace("`r`n", "`n"), $replace5.Replace("`r`n", "`n"))
$content = $content.Replace($target5, $replace5)


$content | Set-Content -Path "C:\Users\nader.reda\Downloads\oed-training-management-system\src\components\AdminDashboard.tsx" -Encoding UTF8
