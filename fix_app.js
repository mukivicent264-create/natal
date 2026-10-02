import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The block starts with `if (hash.startsWith('service-')) {` and ends before `};`
code = code.replace(/if \(hash\.startsWith\('service-'\)\) \{[\s\S]*?return;\n\s+\}/g, "");
code = code.replace(/if \(detailedServices\[hash\]\) \{[\s\S]*?return;\n\s+\}/g, "");
code = code.replace(/const activeService = currentServiceSlug \? detailedServices\[currentServiceSlug\] : null;/g, "");
code = code.replace(/const currentServiceSlug = null;/g, "");
code = code.replace(/currentServiceSlug \?/g, "false ?");

fs.writeFileSync('src/App.tsx', code);
