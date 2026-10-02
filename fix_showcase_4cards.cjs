const fs = require('fs');

const showcaseCode = `import { motion } from 'motion/react';
import { cardHighlights } from '../data';
import { Sparkles, ArrowUpRight } from 'lucide-react';

export default function Showcase() {
  return (
    <section id="showcase" className="py-20 sm:py-24 bg-black-pure border-y border-gold/20 relative">
      <div className="max-w-[1920px] mx-auto px-6 lg:px-16">
        <div className="text-center mb-12 sm:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 text-gold text-xs uppercase tracking-[0.3em] font-semibold mb-3"
          >
            <Sparkles size={14} />
            <span>Core Interior Specialties</span>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-heading text-4xl md:text-5xl text-white"
          >
            Featured Interior Creations
          </motion.h2>
        </div>

        {/* 4 cards on phone (< sm), grid display */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
          {cardHighlights.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.05 }}
              className={"group relative bg-black-rich border border-gold/30 hover:border-gold transition-all duration-500 overflow-hidden shadow-xl flex flex-col rounded-none " + (index >= 4 ? 'hidden sm:flex' : 'flex')}
            >
              {/* Angled top gold accent */}
              <div className="h-1 bg-gradient-to-r from-gold via-gold-light to-gold-dark shrink-0"></div>
              <div className="relative aspect-[4/3] overflow-hidden shrink-0">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 filter brightness-90 group-hover:brightness-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black-pure via-black-pure/20 to-transparent"></div>
              </div>

              <div className="p-3 sm:p-4 flex-grow flex flex-col justify-between">
                <div>
                  <span className="text-[8px] sm:text-[9px] text-gold uppercase tracking-widest block font-mono mb-1 truncate">
                    {item.category}
                  </span>
                  <h3 className="font-heading text-sm sm:text-base text-white font-bold mb-2 group-hover:text-gold transition-colors flex items-start justify-between gap-1">
                    <span className="line-clamp-2 leading-tight">{item.title}</span>
                    <ArrowUpRight size={14} className="text-gold opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                  </h3>
                  <p className="text-gray-400 text-[10px] sm:text-xs font-light leading-snug line-clamp-3">
                    {item.desc}
                  </p>
                </div>
              </div>

              {/* Bottom card gold banner matching the card style */}
              <div className="bg-black-pure/90 border-t border-gold/20 px-3 py-2 text-center shrink-0">
                <a href="#all-services" className="text-[9px] font-bold uppercase tracking-widest text-gold hover:text-white transition-colors block truncate">
                  Details →
                </a>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Explore more services button below cards */}
        <div className="mt-12 text-center">
          <a
            href="#all-services"
            className="inline-flex items-center justify-center gap-3 bg-gold hover:bg-gold-light text-black-pure px-8 py-4 font-bold uppercase tracking-widest text-xs transition-all duration-300 shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] rounded-none cursor-pointer group"
          >
            <span>Explore More Services</span>
            <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>
      </div>
    </section>
  );
}
`;

fs.writeFileSync('src/components/Showcase.tsx', showcaseCode);
console.log('Fixed Showcase.tsx to display 4 product cards on phone');
