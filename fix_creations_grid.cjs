const fs = require('fs');

let content = fs.readFileSync('src/components/FeaturedCreationsPage.tsx', 'utf8');

// Update grid container class to grid-cols-2 on mobile!
content = content.replace(
  '<motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">',
  '<motion.div layout className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 lg:gap-8">'
);

// Optimize padding and text sizing for 2-column mobile layout
content = content.replace(
  'className="p-5 flex-grow flex flex-col justify-between"',
  'className="p-3 sm:p-5 flex-grow flex flex-col justify-between"'
);

content = content.replace(
  'className="text-[10px] text-gold uppercase tracking-widest block font-mono mb-2"',
  'className="text-[8px] sm:text-[10px] text-gold uppercase tracking-widest block font-mono mb-1 sm:mb-2 truncate"'
);

content = content.replace(
  '<h3 className="font-heading text-lg text-white font-bold mb-3 group-hover:text-gold transition-colors flex items-start justify-between gap-2">',
  '<h3 className="font-heading text-xs sm:text-lg text-white font-bold mb-1.5 sm:mb-3 group-hover:text-gold transition-colors flex items-start justify-between gap-1 sm:gap-2">'
);

content = content.replace(
  '<span>{item.title}</span>',
  '<span className="line-clamp-2 leading-tight">{item.title}</span>'
);

content = content.replace(
  '<p className="text-gray-300 text-xs font-light leading-relaxed mb-4 line-clamp-3">',
  '<p className="text-gray-300 text-[10px] sm:text-xs font-light leading-snug sm:leading-relaxed mb-2 sm:mb-4 line-clamp-2 sm:line-clamp-3">'
);

content = content.replace(
  'className="flex flex-wrap gap-1.5 mb-5 pt-3 border-t border-white/10"',
  'className="flex flex-wrap gap-1 mb-2 sm:mb-5 pt-2 sm:pt-3 border-t border-white/10"'
);

content = content.replace(
  'className="text-[9px] px-2 py-0.5 border border-gold/20 text-gray-300 uppercase tracking-wider font-mono bg-white/5"',
  'className="text-[8px] sm:text-[9px] px-1.5 sm:px-2 py-0.5 border border-gold/20 text-gray-300 uppercase tracking-wider font-mono bg-white/5 truncate max-w-full"'
);

content = content.replace(
  '<div className="flex items-center gap-3 pt-2">',
  '<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-3 pt-1 sm:pt-2">'
);

content = content.replace(
  'className="flex-1 border border-gold/40 text-gold hover:bg-gold hover:text-black-pure py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 text-center cursor-pointer rounded-none"',
  'className="flex-1 border border-gold/40 text-gold hover:bg-gold hover:text-black-pure py-1.5 sm:py-2.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all duration-300 text-center cursor-pointer rounded-none"'
);

content = content.replace(
  'className="flex-1 bg-gold hover:bg-gold-light text-black-pure py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 text-center cursor-pointer rounded-none shadow-[0_0_15px_rgba(212,175,55,0.2)]"',
  'className="flex-1 bg-gold hover:bg-gold-light text-black-pure py-1.5 sm:py-2.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all duration-300 text-center cursor-pointer rounded-none shadow-[0_0_15px_rgba(212,175,55,0.2)]"'
);

fs.writeFileSync('src/components/FeaturedCreationsPage.tsx', content);
console.log('Successfully updated FeaturedCreationsPage.tsx to 2 columns on phone screens');
