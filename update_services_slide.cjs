const fs = require('fs');

const servicesCode = `import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { servicesData } from '../data';
import { Home, Hammer, Building2, Zap, CheckCircle2, Paintbrush, TreePine, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

const icons = [Paintbrush, Hammer, Home, Zap, TreePine, Building2];

interface ServicesProps {
  onNavigateToService?: (slug: string) => void;
}

export default function Services({ onNavigateToService }: ServicesProps) {
  const [activeMobileIndex, setActiveMobileIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Auto-slide interval on mobile devices
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveMobileIndex((prev) => (prev + 1) % servicesData.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleNext = () => {
    setActiveMobileIndex((prev) => (prev + 1) % servicesData.length);
  };

  const handlePrev = () => {
    setActiveMobileIndex((prev) => (prev - 1 + servicesData.length) % servicesData.length);
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
    <section id="services" className="py-20 sm:py-28 bg-black-rich relative overflow-hidden">
      {/* Subtle gold grid background motif */}
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

      <div className="max-w-[1920px] mx-auto px-6 lg:px-16 relative z-10">
        
        <div className="text-center mb-12 sm:mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-gold tracking-[0.25em] uppercase text-xs font-semibold mb-3"
          >
            Capabilities
          </motion.h2>
          <motion.h3 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-heading text-4xl md:text-5xl text-white"
          >
            OUR SERVICES
          </motion.h3>
          <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent mx-auto mt-4"></div>
        </div>

        {/* Desktop Grid Layout (Visible on md and larger) */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {servicesData.map((service, index) => {
            const Icon = icons[index % icons.length];
            
            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group bg-black-pure border border-gold/30 hover:border-gold p-8 transition-all duration-500 relative flex flex-col justify-between shadow-2xl"
              >
                {/* Gold Top Accent Line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold/50 via-gold to-gold/50 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                
                <div>
                  <div className="w-16 h-16 rounded-full border border-gold/40 bg-gold/5 flex items-center justify-center mb-6 group-hover:bg-gold transition-all duration-500">
                    <Icon className="text-gold group-hover:text-black-pure transition-colors duration-500" size={28} />
                  </div>
                  
                  <h4 className="font-heading text-2xl text-white font-bold mb-3 uppercase tracking-wide group-hover:text-gold transition-colors">{service.title}</h4>
                  <p className="text-gray-400 font-light mb-6 text-xs leading-relaxed">
                    {service.description}
                  </p>
                  
                  <div className="border-t border-gold/20 pt-4 mb-6">
                    <ul className="space-y-2.5">
                      {service.features.map((feature, i) => (
                        <li key={i} className="flex items-center text-xs text-gray-200 uppercase tracking-wider font-medium">
                          <CheckCircle2 size={14} className="text-gold mr-2.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between w-full">
                  <a 
                    href="#quote"
                    className="bg-gold hover:bg-gold-light text-black-pure px-3 sm:px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors flex-shrink-0 shadow-[0_0_15px_rgba(212,175,55,0.15)] inline-block rounded-none"
                  >
                    Get Quote
                  </a>
                  <a 
                    href="#all-services"
                    className="text-gold text-[9px] sm:text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors text-right cursor-pointer"
                  >
                    Explore Service →
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Mobile Auto-Sliding Mechanism (Visible on phone screens < md) */}
        <div className="md:hidden relative">
          <div 
            className="overflow-hidden min-h-[440px] flex items-center justify-center relative"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <AnimatePresence mode="wait">
              {(() => {
                const service = servicesData[activeMobileIndex];
                const Icon = icons[activeMobileIndex % icons.length];
                return (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, x: 60 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -60 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="w-full bg-black-pure border border-gold/40 p-6 relative flex flex-col justify-between shadow-2xl rounded-none"
                  >
                    {/* Gold Top Accent Line */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold/50 via-gold to-gold/50 opacity-100"></div>

                    <div>
                      <div className="flex items-center justify-between mb-5">
                        <div className="w-14 h-14 rounded-full border border-gold/40 bg-gold/10 flex items-center justify-center">
                          <Icon className="text-gold" size={26} />
                        </div>
                        <span className="text-gold font-mono text-xs font-bold px-3 py-1 bg-gold/10 border border-gold/30">
                          0{activeMobileIndex + 1} / 0{servicesData.length}
                        </span>
                      </div>

                      <h4 className="font-heading text-xl text-white font-bold mb-3 uppercase tracking-wide text-gold">
                        {service.title}
                      </h4>
                      <p className="text-gray-300 font-light mb-5 text-xs leading-relaxed">
                        {service.description}
                      </p>

                      <div className="border-t border-gold/20 pt-4 mb-5">
                        <ul className="space-y-2.5">
                          {service.features.map((feature, i) => (
                            <li key={i} className="flex items-center text-xs text-gray-200 uppercase tracking-wider font-medium">
                              <CheckCircle2 size={14} className="text-gold mr-2.5 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-2 pt-4 border-t border-white/10 flex items-center justify-between w-full">
                      <a
                        href="#quote"
                        className="bg-gold hover:bg-gold-light text-black-pure px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors flex-shrink-0 shadow-[0_0_15px_rgba(212,175,55,0.15)] inline-block rounded-none"
                      >
                        Get Quote
                      </a>
                      <a
                        href="#all-services"
                        className="text-gold text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors text-right cursor-pointer"
                      >
                        Explore Service →
                      </a>
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </div>

          {/* Mobile Navigation Controls & Indicators */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={handlePrev}
              className="p-2.5 border border-gold/40 text-gold hover:bg-gold hover:text-black-pure transition-colors rounded-none cursor-pointer"
              aria-label="Previous Service"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="flex items-center gap-2">
              {servicesData.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveMobileIndex(idx)}
                  className={\`h-2 transition-all duration-300 cursor-pointer \${
                    idx === activeMobileIndex ? 'w-8 bg-gold' : 'w-2 bg-white/20 hover:bg-white/40'
                  }\`}
                  aria-label={\`Go to slide \${idx + 1}\`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="p-2.5 border border-gold/40 text-gold hover:bg-gold hover:text-black-pure transition-colors rounded-none cursor-pointer"
              aria-label="Next Service"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Explore more services button below cards */}
        <div className="mt-12 text-center">
          <a
            href="#all-services"
            className="inline-flex items-center justify-center gap-3 border-2 border-gold text-gold hover:bg-gold hover:text-black-pure px-8 py-4 font-bold uppercase tracking-widest text-xs transition-all duration-300 rounded-none cursor-pointer group"
          >
            <span>Explore More Services</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>
    </section>
  );
}
`;

fs.writeFileSync('src/components/Services.tsx', servicesCode);
console.log('Successfully updated Services.tsx with mobile auto-slider');
