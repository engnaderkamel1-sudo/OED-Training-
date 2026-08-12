const fs = require('fs');
let code = fs.readFileSync('src/components/SessionCard.tsx', 'utf8');

// Add state hook
code = code.replace(
  'const { \n    cancelSession,',
  'const [debugMsg, setDebugMsg] = React.useState<string>("");\n  const { \n    cancelSession,'
);

// Replace alerts
code = code.replace(
  /alert\("MOBILE DEBUG ERROR \(Admin Cancel\):\\n" \+ \(error\.message \|\| error\)\);/,
  'setDebugMsg("Admin Cancel Error: " + (error.message || error));'
);
code = code.replace(
  /alert\("MOBILE DEBUG ERROR \(Admin Reactivate\):\\n" \+ \(error\.message \|\| error\)\);/,
  'setDebugMsg("Admin Reactivate Error: " + (error.message || error));'
);
code = code.replace(
  /alert\("MOBILE DEBUG ERROR \(Trainee Cancel\):\\n" \+ \(error\.message \|\| error\)\);/,
  'setDebugMsg("Trainee Cancel Error: " + (error.message || error));'
);
code = code.replace(
  /alert\("MOBILE DEBUG ERROR \(Trainee Register\):\\n" \+ \(error\.message \|\| error\)\);/,
  'setDebugMsg("Trainee Register Error: " + (error.message || error));'
);

// Add the debug box
code = code.replace(
  /    <\/div>\n  \);\n\};/g,
  `    </div>
      {debugMsg && (
        <div id="debugBox" style={{position:'fixed', bottom:'5px', left:'5px', background:'black', color:'lime', fontSize:'12px', padding:'5px', zIndex:99999, borderRadius:'5px'}}>
          {debugMsg}
          <button onClick={() => setDebugMsg("")} style={{marginLeft:'10px', color:'white', background:'transparent', border:'none', cursor:'pointer'}}>X</button>
        </div>
      )}
    </>
  );
};`
);

// Wrap the main return in <> if it's not already
code = code.replace(
  /  return \(\n    <div className=\{cardClasses\}>/,
  `  return (\n    <>\n    <div className={cardClasses}>`
);


fs.writeFileSync('src/components/SessionCard.tsx', code);
console.log("Injected debugBox");
