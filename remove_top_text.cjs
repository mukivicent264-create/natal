const fs = require('fs');

let content = fs.readFileSync('src/components/FeaturedCreationsPage.tsx', 'utf8');

// Remove top badge span
const targetSpan = `                  <span className="absolute top-3 right-3 bg-black-pure/90 border border-gold/40 text-gold text-[9px] uppercase tracking-widest font-mono font-bold px-2.5 py-1">
                    {item.type}
                  </span>`;

if (content.includes(targetSpan)) {
  content = content.replace(targetSpan, '');
  fs.writeFileSync('src/components/FeaturedCreationsPage.tsx', content);
  console.log('Successfully removed top text badge from FeaturedCreationsPage.tsx');
} else {
  console.log('Target span not found directly, checking regex...');
  content = content.replace(/<span className="absolute top-3 right-3[\s\S]*?<\/span>/, '');
  fs.writeFileSync('src/components/FeaturedCreationsPage.tsx', content);
  console.log('Regex replacement done');
}
