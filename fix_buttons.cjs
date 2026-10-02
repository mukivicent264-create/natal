const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/**/*.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace px-8 with px-4 sm:px-8 in the main CTA buttons
  // And tracking-[0.2em] with tracking-wider sm:tracking-[0.2em]
  // And add whitespace-nowrap
  
  // A generic replacement for these large CTA buttons
  content = content.replace(/(className="[^"]*inline-flex items-center[^"]*px-)8([^"]*tracking-\[0\.2em\][^"]*)"/g, '$14 sm:px-8$2 whitespace-nowrap"');
  content = content.replace(/(className="[^"]*inline-flex items-center[^"]*tracking-\[0\.2em\][^"]*px-)8([^"]*)"/g, '$14 sm:px-8$2 whitespace-nowrap"');
  
  // For Showcase.tsx
  content = content.replace(/(className="[^"]*inline-flex items-center[^"]*px-6 sm:px-8[^"]*tracking-wider[^"]*)"/g, '$1 whitespace-nowrap"');

  // For ServiceDetailPage.tsx
  content = content.replace(/(className="[^"]*inline-flex items-center[^"]*px-8[^"]*tracking-widest[^"]*)"/g, '$1 whitespace-nowrap"');
  content = content.replace(/(className="[^"]*px-8[^"]*inline-flex items-center[^"]*)"/g, '$1 whitespace-nowrap"');
  
  // In Projects.tsx:
  // className="inline-flex items-center gap-3 bg-black-pure border border-gold hover:bg-gold hover:text-black-pure text-gold px-8 py-4 text-xs font-bold uppercase tracking-[0.2em] transition-all duration-300 shadow-[0_0_20px_rgba(212,175,55,0.2)] rounded-none cursor-pointer"
  content = content.replace(/px-8 py-4 text-xs font-bold uppercase tracking-\[0\.2em\]/g, 'px-4 sm:px-8 py-4 text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-[0.2em] whitespace-nowrap');

  // In Process.tsx:
  // px-8 py-4 text-xs font-extrabold uppercase tracking-[0.2em]
  content = content.replace(/px-8 py-4 text-xs font-extrabold uppercase tracking-\[0\.2em\]/g, 'px-4 sm:px-8 py-4 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider sm:tracking-[0.2em] whitespace-nowrap');

  // In About.tsx:
  // px-8 py-4 text-xs uppercase tracking-[0.2em]
  content = content.replace(/font-bold px-8 py-4 text-xs uppercase tracking-\[0\.2em\]/g, 'font-bold px-4 sm:px-8 py-4 text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-[0.2em] whitespace-nowrap');

  // In BeforeAfterSection.tsx:
  // px-8 py-4 font-bold uppercase tracking-[0.2em] text-xs
  content = content.replace(/px-8 py-4 font-bold uppercase tracking-\[0\.2em\] text-xs/g, 'px-4 sm:px-8 py-4 font-bold uppercase tracking-wider sm:tracking-[0.2em] text-[10px] sm:text-xs whitespace-nowrap');

  // In Services.tsx:
  // px-8 py-4 font-bold uppercase tracking-widest text-xs
  content = content.replace(/px-8 py-4 font-bold uppercase tracking-widest text-xs/g, 'px-4 sm:px-8 py-4 font-bold uppercase tracking-wider sm:tracking-[0.2em] text-[10px] sm:text-xs whitespace-nowrap');

  // In ServiceDetailPage.tsx:
  // px-8 py-3.5 bg-gold hover:bg-gold-light text-black-pure font-bold text-xs uppercase tracking-widest
  content = content.replace(/px-8 py-3\.5(.*)tracking-widest/g, 'px-4 sm:px-8 py-3.5$1tracking-wider sm:tracking-[0.2em] whitespace-nowrap');

  // In Showcase.tsx:
  // px-6 sm:px-8 py-3.5 sm:py-4 font-bold uppercase tracking-wider text-xs
  content = content.replace(/px-6 sm:px-8 py-3\.5 sm:py-4 font-bold uppercase tracking-wider text-xs/g, 'px-4 sm:px-8 py-3.5 sm:py-4 font-bold uppercase tracking-wider sm:tracking-[0.2em] text-[10px] sm:text-xs whitespace-nowrap');

  // Any other generic replace for "px-8 py-4 text-xs" in these bottom CTAs:
  // Just in case I missed any...
  
  fs.writeFileSync(file, content, 'utf8');
});
