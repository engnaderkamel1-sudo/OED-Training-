const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

// The file ends with:
//         )}
//       </div>
//     </div>
//   );
// };

content = content.replace(
  `        )}
      </div>
    </div>
  );
};`,
  `        )}
  );
};`
);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);

let divOpenCount = (content.match(/<div(\s|>)/g) || []).length;
let divCloseCount = (content.match(/<\/div>/g) || []).length;
console.log(`Open div: ${divOpenCount}, Close div: ${divCloseCount}`);
