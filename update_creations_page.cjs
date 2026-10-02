const fs = require('fs');

let content = fs.readFileSync('src/components/FeaturedCreationsPage.tsx', 'utf8');

const targetSection = `                <div className="p-3 sm:p-5 flex-grow flex flex-col justify-between">
                  <div>
                    <span className="text-[8px] sm:text-[10px] text-gold uppercase tracking-widest block font-mono mb-1 sm:mb-2 truncate">
                      {item.category}
                    </span>
                    <h3 className="font-heading text-xs sm:text-lg text-white font-bold mb-1.5 sm:mb-3 group-hover:text-gold transition-colors flex items-start justify-between gap-1 sm:gap-2">
                      <span className="line-clamp-2 leading-tight">{item.title}</span>
                      <ArrowUpRight size={16} className="text-gold opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                    </h3>
                    <p className="text-gray-300 text-[10px] sm:text-xs font-light leading-snug sm:leading-relaxed mb-2 sm:mb-4 line-clamp-2 sm:line-clamp-3">
                      {item.desc}
                    </p>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-2 sm:mb-5 pt-2 sm:pt-3 border-t border-white/10">
                    {item.tags.map((tag, tIdx) => (
                      <span key={tIdx} className="text-[8px] sm:text-[9px] px-1.5 sm:px-2 py-0.5 border border-gold/20 text-gray-300 uppercase tracking-wider font-mono bg-white/5 truncate max-w-full">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-3 pt-1 sm:pt-2">
                    <button
                      onClick={() => setSelectedCreation(item)}
                      className="flex-1 border border-gold/40 text-gold hover:bg-gold hover:text-black-pure py-1.5 sm:py-2.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all duration-300 text-center cursor-pointer rounded-none"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => onNavigateHome('quote')}
                      className="flex-1 bg-gold hover:bg-gold-light text-black-pure py-1.5 sm:py-2.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all duration-300 text-center cursor-pointer rounded-none shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                    >
                      Request Quote
                    </button>
                  </div>
                </div>`;

const replacementSection = `                <div className="p-3 sm:p-4 flex-grow flex flex-col justify-between">
                  <div>
                    <span className="text-[8px] sm:text-[10px] text-gold uppercase tracking-widest block font-mono mb-1 truncate">
                      {item.category}
                    </span>
                    <h3 className="font-heading text-xs sm:text-base text-white font-bold group-hover:text-gold transition-colors flex items-start justify-between gap-1">
                      <span className="line-clamp-2 leading-tight">{item.title}</span>
                      <ArrowUpRight size={14} className="text-gold opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5 hidden sm:block" />
                    </h3>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2 pt-2 border-t border-white/10 mt-2 sm:mt-3">
                    <button
                      onClick={() => setSelectedCreation(item)}
                      className="flex-1 border border-gold/40 text-gold hover:bg-gold hover:text-black-pure py-1.5 sm:py-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all duration-300 text-center cursor-pointer rounded-none"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => onNavigateHome('quote')}
                      className="flex-1 bg-gold hover:bg-gold-light text-black-pure py-1.5 sm:py-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all duration-300 text-center cursor-pointer rounded-none shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                    >
                      Quote
                    </button>
                  </div>
                </div>`;

if (content.includes(targetSection)) {
  content = content.replace(targetSection, replacementSection);
  fs.writeFileSync('src/components/FeaturedCreationsPage.tsx', content);
  console.log('Successfully replaced card body in FeaturedCreationsPage.tsx');
} else {
  console.error('Target section mismatch');
}
