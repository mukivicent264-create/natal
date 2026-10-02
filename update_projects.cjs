const fs = require('fs');

let content = fs.readFileSync('src/components/Projects.tsx', 'utf8');

content = content.replace(
  '<div className="p-6 sm:p-8 flex-grow flex flex-col justify-between">',
  '<div className="p-3 sm:p-6 lg:p-8 flex-grow flex flex-col justify-between">'
);

content = content.replace(
  '<h3 className="font-heading text-2xl sm:text-3xl text-white font-bold mb-3 group-hover:text-gold transition-colors flex items-start justify-between gap-3">',
  '<h3 className="font-heading text-xs sm:text-2xl text-white font-bold mb-1 sm:mb-3 group-hover:text-gold transition-colors flex items-start justify-between gap-1 sm:gap-3">'
);

content = content.replace(
  '<p className="text-gray-300 text-sm font-light leading-relaxed mb-6">',
  '<p className="text-gray-300 text-[10px] sm:text-sm font-light leading-snug sm:leading-relaxed mb-2 sm:mb-6 hidden sm:block">'
);

content = content.replace(
  '<div className="flex flex-wrap gap-2 mb-6 pt-4 border-t border-white/10">',
  '<div className="hidden sm:flex flex-wrap gap-2 mb-6 pt-4 border-t border-white/10">'
);

content = content.replace(
  '<div className="flex items-center gap-3">',
  '<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-white/10">'
);

content = content.replace(
  'className="flex-1 border border-gold/50 text-gold hover:bg-gold/10 hover:border-gold py-3 text-xs font-bold uppercase tracking-widest transition-all text-center cursor-pointer rounded-none"',
  'className="flex-1 border border-gold/50 text-gold hover:bg-gold/10 hover:border-gold py-1.5 sm:py-3 text-[9px] sm:text-xs font-bold uppercase tracking-widest transition-all text-center cursor-pointer rounded-none"'
);

content = content.replace(
  'className="flex-1 bg-gold hover:bg-gold-light text-black-pure py-3 text-xs font-bold uppercase tracking-widest transition-all text-center cursor-pointer rounded-none shadow-[0_0_15px_rgba(212,175,55,0.25)] font-extrabold"',
  'className="flex-1 bg-gold hover:bg-gold-light text-black-pure py-1.5 sm:py-3 text-[9px] sm:text-xs font-bold uppercase tracking-widest transition-all text-center cursor-pointer rounded-none shadow-[0_0_15px_rgba(212,175,55,0.25)] font-extrabold"'
);

fs.writeFileSync('src/components/Projects.tsx', content);
console.log('Projects.tsx updated successfully');
