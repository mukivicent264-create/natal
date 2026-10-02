const fs = require('fs');
const content = fs.readFileSync('src/components/QuotePage.tsx', 'utf8');

const divOpens = content.match(/<div(\s|>)/g)?.length || 0;
const divCloses = content.match(/<\/div>/g)?.length || 0;

console.log(`div opens: ${divOpens}, div closes: ${divCloses}`);
