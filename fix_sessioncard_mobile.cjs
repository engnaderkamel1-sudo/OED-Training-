const fs = require('fs');
let code = fs.readFileSync('src/components/SessionCard.tsx', 'utf8');

// We will replace the handlers with try-catch wrapped versions for mobile debugging
code = code.replace(
  /const handleAdminCancel = \(e: React\.MouseEvent \| React\.PointerEvent\) => \{[\s\S]*?\};/,
  `const handleAdminCancel = (e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    try {
      if (!session || !session.id) throw new Error("CRITICAL: Session ID is missing in component closure.");
      
      if(window.confirm(t('confirmCancelSession') || "Cancel this session?")) {
        cancelSession(session.id);
      }
    } catch (error: any) {
      alert("MOBILE DEBUG ERROR (Admin Cancel):\\n" + (error.message || error));
    }
  };`
);

code = code.replace(
  /const handleAdminReactivate = \(e: React\.MouseEvent \| React\.PointerEvent\) => \{[\s\S]*?\};/,
  `const handleAdminReactivate = (e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    try {
      if (!session || !session.id) throw new Error("CRITICAL: Session ID is missing in component closure.");
      reactivateSession(session.id);
    } catch (error: any) {
      alert("MOBILE DEBUG ERROR (Admin Reactivate):\\n" + (error.message || error));
    }
  };`
);

code = code.replace(
  /const handleTraineeUnregister = \(e: React\.MouseEvent \| React\.PointerEvent\) => \{[\s\S]*?\};/,
  `const handleTraineeUnregister = (e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    try {
      if (!session || !session.id) throw new Error("CRITICAL: Session ID is missing.");
      if (!userCode) throw new Error("CRITICAL: Trainee User Code is missing.");
      
      if(window.confirm(t('confirmUnregister') || "Cancel your registration?")) {
        unregisterTrainee(session.id, userCode);
      }
    } catch (error: any) {
      alert("MOBILE DEBUG ERROR (Trainee Cancel):\\n" + (error.message || error));
    }
  };`
);

code = code.replace(
  /const handleTraineeRegister = \(e: React\.MouseEvent \| React\.PointerEvent\) => \{[\s\S]*?\};/,
  `const handleTraineeRegister = (e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (!session || !session.id) throw new Error("CRITICAL: Session ID is missing.");
      if (!userCode) throw new Error("CRITICAL: Trainee User Code is missing.");
      
      if(onRegister) {
        onRegister(session);
      } else {
        registerTrainee(session.id, userCode);
      }
    } catch (error: any) {
      alert("MOBILE DEBUG ERROR (Trainee Register):\\n" + (error.message || error));
    }
  };`
);

fs.writeFileSync('src/components/SessionCard.tsx', code);
console.log("Injected mobile try-catch debugging into SessionCard");
