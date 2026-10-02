const fs = require('fs');
const content = fs.readFileSync('src/components/QuotePage.tsx', 'utf8');

const lines = content.split('\n');
let depth = 0;
let results = [];

lines.forEach((line, i) => {
    let openMatches = line.match(/<div(\s|>)/g);
    let closeMatches = line.match(/<\/div>/g);
    
    let opens = openMatches ? openMatches.length : 0;
    let closes = closeMatches ? closeMatches.length : 0;
    
    if (opens !== closes) {
        depth += (opens - closes);
        results.push(`Line ${i + 1}: opens ${opens}, closes ${closes}, depth now ${depth}. Content: ${line.trim()}`);
    }
});

console.log("Final depth:", depth);
console.log(results.join('\n'));
