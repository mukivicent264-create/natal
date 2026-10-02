const fs = require('fs');

let content = fs.readFileSync('src/components/Showcase.tsx', 'utf8');

content = content.replace(
  `href="#all-services"\n            className="inline-flex items-center justify-center gap-3 bg-gold hover:bg-gold-light text-black-pure px-8 py-4 font-bold uppercase tracking-widest text-xs transition-all duration-300 shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] rounded-none cursor-pointer group"\n          >\n            <span>Explore More Services</span>`,
  `href="#creations"\n            className="inline-flex items-center justify-center gap-3 bg-gold hover:bg-gold-light text-black-pure px-8 py-4 font-bold uppercase tracking-widest text-xs transition-all duration-300 shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] rounded-none cursor-pointer group"\n          >\n            <span>Explore All Interior Creations</span>`
);

fs.writeFileSync('src/components/Showcase.tsx', content);
console.log('Updated Showcase.tsx button link to #creations');
