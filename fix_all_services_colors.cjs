const fs = require('fs');

let content = fs.readFileSync('src/components/AllServicesPage.tsx', 'utf8');

// Replace colorful background with luxury black and gold ambient glows
content = content.replace(
  `<div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-purple-900/40 to-rose-900/40 z-0"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent blur-2xl"></div>
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent blur-2xl"></div>`,
  `<div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold/15 via-black-pure/80 to-transparent blur-3xl pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none"></div>`
);

// Border update to gold/30
content = content.replace('border-b border-white/10', 'border-b border-gold/30');

fs.writeFileSync('src/components/AllServicesPage.tsx', content);
console.log('Updated AllServicesPage.tsx header background colors to luxury Black & Gold');
