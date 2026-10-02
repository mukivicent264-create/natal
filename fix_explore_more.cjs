const fs = require('fs');
let code = fs.readFileSync('src/components/Services.tsx', 'utf8');

code = code.replace(/        \{\/\* Explore more services button below cards \*\/\}[\s\S]*?<\/div>\n/g, "");

fs.writeFileSync('src/components/Services.tsx', code);
