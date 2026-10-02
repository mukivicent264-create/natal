const fs = require('fs');
let code = fs.readFileSync('src/components/Services.tsx', 'utf8');

code = code.replace(/const serviceSlugMap: Record<string, string> = {[\s\S]*?};/,
`const serviceSlugMap: Record<string, string> = {
  'interior-finishing': 'interior-finishing',
  'woodwork': 'custom-woodwork',
  'construction': 'construction-exterior',
  'electrical': 'electrical-services',
};`);

fs.writeFileSync('src/components/Services.tsx', code);
console.log('Fixed Services.tsx');
