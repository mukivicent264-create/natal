const fs = require('fs');
let code = fs.readFileSync('src/components/Showcase.tsx', 'utf8');

code = code.replace(/href="#all-services"/g, 'href="#creations"');

fs.writeFileSync('src/components/Showcase.tsx', code);
