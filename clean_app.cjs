const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/      if \(hash === 'all-services'\) \{[\s\S]*?return;\n\s+\}/g, "");

fs.writeFileSync('src/App.tsx', code);
