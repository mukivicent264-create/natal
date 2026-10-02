const fs = require('fs');

const showcaseCode = `import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cardHighlights } from '../data';
import { Sparkles, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Showcase() {
  const [activeMobileIndex, setActiveMobileIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Limit featured mobile items to top 6 highlights for auto sliding
  const mobileItems = cardHighlights.slice(0, 6);

  // Auto-slide interval on mobile devices
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveMobileIndex((prev) => (prev + 1) % mobileItems.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [mobileItems.length]);

  const handleNext = () => {
    setActiveMobileIndex((prev) => (prev + 1) % mobileItems.length);
  };

  const handlePrev = () => {
    setActiveMobileIndex((prev) => (prev - 1 + mobileItems.length) % mobileItems.length);
  };

  // Touch Swipe handlers
  const minSwipeDistance = 40;
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
  };

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

        {/* Desktop Grid (Visible on sm and larger) */}
        <div className="hidden sm:grid grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
          {cardHighlights.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.05 }}
              className="group relative bg-black-rich border border-gold/30 hover:border-gold transition-all duration-500 overflow-hidden shadow-xl flex flex-col rounded-none"
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

        {/* Mobile Auto-Slide View (Visible on phone screens < sm) */}
        <div className="sm:hidden relative">
          <div 
            className="overflow-hidden relative min-h-[350px]"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <AnimatePresence mode="wait">
              {(() => {
                const item = mobileItems[activeMobileIndex];
                return (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="group relative bg-black-rich border border-gold/40 transition-all duration-500 overflow-hidden shadow-2xl flex flex-col rounded-none"
                  >
                    <div className="h-1 bg-gradient-to-r from-gold via-gold-light to-gold-dark shrink-0"></div>
                    <div className="relative aspect-[16/9] overflow-hidden shrink-0">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover filter brightness-95"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black-pure via-black-pure/30 to-transparent"></div>
                      <span className="absolute top-3 right-3 bg-black-pure/80 border border-gold/40 text-gold font-mono text-[10px] font-bold px-2.5 py-1">
                        0{activeMobileIndex + 1} / 0{mobileItems.length}
                      </span>
                    </div>

                    <div className="p-5 flex-grow flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] text-gold uppercase tracking-widest block font-mono mb-1.5">
                          {item.category}
                        </span>
                        <h3 className="font-heading text-lg text-white font-bold mb-2">
                          {item.title}
                        </h3>
                        <p className="text-gray-300 text-xs font-light leading-relaxed mb-4">
                          {item.desc}
                        </p>
                      </div>
                    </div>

                    <div className="bg-black-pure border-t border-gold/30 px-4 py-3 flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-gray-400">Featured Specialty</span>
                      <a href="#all-services" className="text-[10px] font-bold uppercase tracking-widest text-gold hover:text-white transition-colors flex items-center gap-1">
                        <span>Details</span>
                        <ArrowUpRight size={14} />
                      </a>
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </div>

          {/* Mobile Slide Controls */}
          <div className="flex items-center justify-between mt-5">
            <button
              onClick={handlePrev}
              className="p-2 border border-gold/40 text-gold hover:bg-gold hover:text-black-pure transition-colors rounded-none cursor-pointer"
              aria-label="Previous Creation"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex items-center gap-2">
              {mobileItems.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveMobileIndex(idx)}
                  className={\`h-1.5 transition-all duration-300 cursor-pointer \${
                    idx === activeMobileIndex ? 'w-6 bg-gold' : 'w-2 bg-white/20 hover:bg-white/40'
                  }\`}
                  aria-label={\`Go to slide \${idx + 1}\`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="p-2 border border-gold/40 text-gold hover:bg-gold hover:text-black-pure transition-colors rounded-none cursor-pointer"
              aria-label="Next Creation"
            >
              <ChevronRight size={18} />
            </button>
          </div>
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
console.log('Successfully updated Showcase.tsx with mobile auto-slider');
