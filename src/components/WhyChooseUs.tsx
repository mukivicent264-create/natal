import { motion } from 'motion/react';
import { Sparkles, ShieldCheck, Users, Clock, ThumbsUp } from 'lucide-react';
import { useSectionContent, WhyUsContent, defaultWhyUsContent } from '../siteContent';

const iconsMap = [Sparkles, ShieldCheck, Users, Clock, ThumbsUp];

export default function WhyChooseUs() {
  const { content } = useSectionContent<WhyUsContent>('why_us', defaultWhyUsContent);

  return (
    <section id="why-us" className="py-4 sm:py-6 md:py-8 relative overflow-hidden border-t border-gold/20">
      {/* Premium Background Image with Overlays */}
      <div className="absolute inset-0 z-0">
        <img 
          src={content.backgroundImage || defaultWhyUsContent.backgroundImage} 
          alt="Luxury Interior Architecture" 
          className="w-full h-full object-cover object-center grayscale opacity-30"
          draggable={false}
        />
        {/* Stronger Dark Overlay for rich contrast & text legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black-pure via-black-pure/80 to-black-pure z-10" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
        <div className="text-center mb-5 sm:mb-7">
          <motion.h2 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-gold tracking-[0.25em] uppercase text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2"
          >
            {content.subtitle}
          </motion.h2>
          <motion.h3 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-heading text-2xl sm:text-3xl md:text-4xl text-white font-bold uppercase tracking-wider"
          >
            {content.title}
          </motion.h3>
          <div className="w-20 h-[2px] bg-gold mx-auto mt-2.5 shadow-[0_0_10px_rgba(212,175,55,0.5)]"></div>
        </div>

        {/* 5 Columns / Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
          {(content.items || defaultWhyUsContent.items).map((item, index) => {
            const Icon = iconsMap[index % iconsMap.length];
            const percent = item.metric ?? 95;
            
            return (
              <motion.div
                key={item.title + index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-black-rich/60 backdrop-blur-md border border-gold/20 hover:border-gold/60 active:border-gold p-3.5 sm:p-4 lg:p-5 transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] active:bg-black-rich flex flex-col justify-between shadow-2xl relative group overflow-hidden active-press cursor-pointer"
              >
                {/* Background glow on hover */}
                <div className="absolute inset-0 bg-gradient-to-b from-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2.5 sm:mb-3 lg:mb-4">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-none border border-gold/40 flex items-center justify-center text-gold bg-gold/10 shadow-[0_0_15px_rgba(212,175,55,0.15)] group-hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all duration-300 group-hover:bg-gold group-hover:text-black-pure">
                      <Icon size={16} className="lg:w-[18px] lg:h-[18px]" />
                    </div>
                    <span className="font-heading text-lg sm:text-xl font-black text-white/90 group-hover:text-gold transition-colors duration-300">
                      {percent}<span className="text-sm sm:text-base text-gold/60">%</span>
                    </span>
                  </div>
                  
                  <h4 className="font-heading text-xs sm:text-sm font-bold text-white uppercase tracking-widest mb-1 sm:mb-1.5 leading-tight group-hover:text-gold transition-colors duration-300">
                    {item.title}
                  </h4>
                  <p className="text-gray-300 text-[10px] sm:text-[11px] lg:text-xs font-light leading-relaxed mb-2.5 sm:mb-3 lg:mb-4 line-clamp-3">
                    {item.description}
                  </p>
                </div>

                {/* Progress Bar Indicator */}
                <div className="w-full relative z-10 mt-auto">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[9px] uppercase tracking-[0.2em] text-gold font-bold">Metric</span>
                    <span className="text-[10px] text-gray-400 font-mono tracking-widest">{percent}/100</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-none overflow-hidden border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      whileInView={{ width: `${percent}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.5, delay: 0.4 + (index * 0.1), ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-gold via-yellow-400 to-amber-500 shadow-[0_0_10px_rgba(212,175,55,0.8)] relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-white/20 w-full" />
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
