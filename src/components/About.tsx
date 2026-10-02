import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Compass, Layers, ShieldCheck, Sparkles } from 'lucide-react';
import { useSectionContent, AboutContent, defaultAboutContent } from '../siteContent';
import { companyDetails } from '../data';

const pillarIcons = [Layers, Compass, Sparkles, ShieldCheck];

export default function About() {
  const { content } = useSectionContent<AboutContent>('about', defaultAboutContent);

  const navigateToCreations = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if ((window as any).__lenis) {
      (window as any).__lenis.resize();
      (window as any).__lenis.scrollTo(0, { immediate: true });
    }
    if (window.location.hash === '#products' || window.location.hash === '#creations') {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
      window.location.hash = '#products';
    }
  };

  return (
    <section id="about" className="py-6 sm:py-8 md:py-12 bg-black-pure relative overflow-hidden border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-10 items-center">
          
          {/* Left: Concise Narrative */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-6 xl:col-span-5 flex flex-col items-start w-full"
          >
            <span className="text-gold tracking-[0.2em] uppercase text-[11px] sm:text-xs font-semibold mb-2 block font-mono">
              {content.subtitle}
            </span>

            <h2 className="font-heading text-xl sm:text-2xl md:text-3xl lg:text-[2.25rem] text-white font-extrabold mb-3 leading-snug">
              {content.titleLine1} <br />
              <span className="text-gradient-gold">{content.titleLine2}</span>
            </h2>

            <p className="text-gray-300 text-xs sm:text-sm leading-relaxed mb-5 font-light max-w-xl">
              {content.narrative}
            </p>
            
            {/* Compact Pillars */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full max-w-xl mb-5 sm:mb-6">
              {(content.pillars || defaultAboutContent.pillars).map((item, i) => {
                const Icon = pillarIcons[i % pillarIcons.length];
                return (
                  <div 
                    key={i} 
                    className="p-2.5 sm:p-3 bg-black-rich border border-white/10 hover:border-gold/40 transition-colors group flex items-center gap-2.5"
                  >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gold/10 border border-gold/30 flex items-center justify-center text-gold group-hover:bg-gold group-hover:text-black-pure transition-colors shrink-0">
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-white text-xs font-semibold truncate group-hover:text-gold-light transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-gray-400 text-[10.5px] truncate hidden sm:block">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
              <a
                href="#quote"
                className="inline-flex items-center justify-center gap-2 bg-gold hover:bg-gold-light text-black-pure font-bold px-5 sm:px-6 py-2.5 sm:py-3 text-[11px] sm:text-xs uppercase tracking-wider transition-all duration-300 shadow-[0_0_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_25px_rgba(212,175,55,0.35)] whitespace-nowrap active:scale-95 rounded-sm"
              >
                <span>Request Quotation</span>
                <ArrowRight size={13} className="stroke-[2.2]" />
              </a>
              <a
                href="#products"
                onClick={navigateToCreations}
                className="inline-flex items-center justify-center px-5 sm:px-6 py-2.5 sm:py-3 border border-white/20 hover:border-gold/60 bg-black-rich/50 text-gray-200 hover:text-gold text-[11px] sm:text-xs uppercase tracking-wider transition-all whitespace-nowrap active:scale-95 text-center cursor-pointer rounded-sm"
              >
                Explore Showcase
              </a>
            </div>
          </motion.div>

          {/* Right: Architectural Layered Visual Showcase with Floating Overlay Image */}
          <motion.div
            initial={{ opacity: 0, x: 25 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:col-span-6 xl:col-span-7 relative mt-8 lg:mt-0 w-full"
          >
            {/* Ambient Background Gold Glow - contained within overflow-hidden */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-8 -right-8 w-64 h-64 bg-gold/10 rounded-full blur-3xl"></div>
            </div>

            {/* Primary Large Image Frame - Expanded width with cinematic aspect ratio */}
            <div className="relative aspect-[4/3] sm:aspect-[16/11] lg:aspect-[16/10] w-full p-2 sm:p-2.5 bg-black-rich border border-gold/40 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
              <div className="relative w-full h-full overflow-hidden border border-white/10 group">
                <img
                  src={content.image || defaultAboutContent.image}
                  alt="Natal Luxury Architectural Interior Execution"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black-pure/90 via-black-pure/15 to-transparent"></div>
                
                {/* Subtle Top Accent Tag */}
                <div className="absolute top-3 left-3 px-2.5 py-1 bg-black-pure/85 border border-gold/40 backdrop-blur-md text-[10px] font-mono text-gold uppercase tracking-widest">
                  Turnkey Portfolio
                </div>

                {/* Location & Atelier Stamp - Positioned cleanly on bottom-right to balance composition */}
                <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 flex items-center gap-1.5 text-[10px] sm:text-xs font-mono bg-black-pure/85 px-2.5 py-1 border border-white/15 backdrop-blur-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse"></span>
                  <span className="text-white font-medium">{companyDetails.location}</span>
                </div>
              </div>

              {/* OVERLAY IMAGE: Placed on the bottom-left as requested */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 lg:bottom-4 lg:left-4 w-36 sm:w-44 md:w-52 lg:w-56 z-20 p-1 sm:p-1.5 bg-black-pure/95 border-2 border-gold shadow-[0_15px_35px_rgba(0,0,0,0.95)]"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden border border-white/10 group">
                  <img
                    src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=800"
                    alt="Bespoke Gypsum Ceiling & Architectural Lighting"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black-pure/90 via-transparent to-transparent"></div>
                  
                  {/* Floating Overlay Caption */}
                  <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-mono text-white font-medium">
                      <Layers size={11} className="text-gold shrink-0" />
                      <span>Gypsum Detail</span>
                    </div>
                    <span className="text-[8px] sm:text-[9px] font-mono text-gold uppercase tracking-wider">Bespoke</span>
                  </div>
                </div>
              </motion.div>

              {/* Floating Experience & Quality Badge */}
              <div className="absolute -top-3.5 right-3 sm:-top-4 sm:right-4 bg-black-pure/95 border border-gold/70 backdrop-blur-md px-3 sm:px-3.5 py-1.5 sm:py-2 shadow-2xl flex items-center gap-2 z-20">
                <div className="w-6 h-6 bg-gold/15 border border-gold/40 flex items-center justify-center text-gold">
                  <Sparkles size={13} />
                </div>
                <div>
                  <p className="text-white text-[11px] sm:text-xs font-bold font-mono tracking-wider">{content.experienceYears || '20+'} YEARS</p>
                  <p className="text-gray-400 text-[8px] sm:text-[9px] uppercase tracking-widest">{content.experienceLabel || 'Uganda Atelier'}</p>
                </div>
              </div>
            </div>

            {/* Verified Metrics (Unobstructed Horizontal Grid with Clear Contrast) */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mt-4 sm:mt-5 text-center">
              <div className="p-3 border border-white/10 bg-black-rich/90 hover:border-gold/40 transition-colors">
                <p className="text-xl sm:text-2xl font-heading font-extrabold text-gold">20+</p>
                <p className="text-[10px] uppercase tracking-wider text-gray-300 font-mono mt-0.5">Years Experience</p>
              </div>
              <div className="p-3 border border-white/10 bg-black-rich/90 hover:border-gold/40 transition-colors">
                <p className="text-xl sm:text-2xl font-heading font-extrabold text-gold">500+</p>
                <p className="text-[10px] uppercase tracking-wider text-gray-300 font-mono mt-0.5">Executed Projects</p>
              </div>
              <div className="p-3 border border-white/10 bg-black-rich/90 hover:border-gold/40 transition-colors">
                <p className="text-xl sm:text-2xl font-heading font-extrabold text-gold">100%</p>
                <p className="text-[10px] uppercase tracking-wider text-gray-300 font-mono mt-0.5">Turnkey Handover</p>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}

