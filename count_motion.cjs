const fs = require('fs');
const content = fs.readFileSync('src/components/QuotePage.tsx', 'utf8');

const motionOpens = content.match(/<motion\.div(\s|>)/g)?.length || 0;
const motionCloses = content.match(/<\/motion\.div>/g)?.length || 0;

console.log(`motion opens: ${motionOpens}, motion closes: ${motionCloses}`);
