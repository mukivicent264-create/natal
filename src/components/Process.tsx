import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquareQuote, 
  Compass, 
  Layers, 
  Hammer, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { useSectionContent, ProcessContent, defaultProcessContent } from '../siteContent';

const stepIcons = [
  MessageSquareQuote,
  Compass,
  Layers,
  Hammer,
  CheckCircle2
];

export default function Process() {
  const { content } = useSectionContent<ProcessContent>('process', defaultProcessContent);
  const steps = content.steps || defaultProcessContent.steps;

  const [activeStep, setActiveStep] = useState<number>(0);
  const [activeMobileIndex, setActiveMobileIndex] = useState(0);

  // Auto-slide interval on mobile and tablet devices
  useEffect(() => {
    if (steps.length === 0) return;
    const timer = setInterval(() => {
      setActiveMobileIndex((prev) => (prev + 1) % steps.length);
      setActiveStep((prev) => (prev + 1) % steps.length); // Sync desktop ribbon too
    }, 4000);
    return () => clearInterval(timer);
  }, [steps.length]);

  return (
    <section id="process" className="py-4 sm:py-6 md:py-8 bg-black-pure border-y border-gold/20 relative overflow-hidden">
      {/* Background Subtle Grid & Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.05)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

      <div className="w-full max-w-[98vw] xl:max-w-[95vw] 2xl:max-w-[1780px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 relative z-10">
        
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-5 sm:mb-7">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 border border-gold/30 bg-gold/5 mb-2 text-gold tracking-[0.25em] uppercase text-xs sm:text-sm font-semibold"
          >
            <Sparkles size={13} className="text-gold" />
            <span>{content.subtitle}</span>
          </motion.div>
          
          <motion.h3 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-heading text-xl sm:text-2xl md:text-3xl text-white font-bold uppercase tracking-wider mb-2"
          >
            {content.title}
          </motion.h3>

          <div className="w-20 h-[2px] bg-gold mx-auto mt-2 shadow-[0_0_10px_rgba(212,175,55,0.5)]" />
        </div>

        {/* Desktop Step Selector / Progress Ribbon */}
        <div className="hidden lg:block mb-5 sm:mb-7">
          <div className="relative flex items-center justify-between">
            {/* Horizontal Line connecting steps */}
            <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white/10 -translate-y-1/2 z-0" />
            <motion.div 
              className="absolute top-1/2 left-0 h-[2px] bg-gold -translate-y-1/2 z-0 transition-all duration-500 shadow-[0_0_12px_rgba(212,175,55,0.8)]"
              style={{ width: `${(activeStep / Math.max(steps.length - 1, 1)) * 100}%` }}
            />

            {steps.map((step, idx) => {
              const Icon = stepIcons[idx % stepIcons.length];
              const isActive = idx === activeStep;
              const isPassed = idx < activeStep;

              return (
                <button
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className="relative z-10 group flex flex-col items-center focus:outline-none cursor-pointer"
                >
                  <div 
                    className={`w-14 h-14 border transition-all duration-300 flex items-center justify-center ${
                      isActive 
                        ? 'bg-gold text-black-pure border-gold shadow-[0_0_25px_rgba(212,175,55,0.6)] scale-110' 
                        : isPassed 
                        ? 'bg-black-rich text-gold border-gold/70' 
                        : 'bg-black-rich text-gray-400 border-white/20 group-hover:border-gold/50 group-hover:text-gold'
                    }`}
                  >
                    <Icon size={22} />
                  </div>
                  <span className={`mt-3 text-[11px] font-bold uppercase tracking-widest transition-colors ${
                    isActive ? 'text-gold' : 'text-gray-400 group-hover:text-white'
                  }`}>
                    0{idx + 1}. {step.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Desktop 5-Column Process Grid (lg and above) */}
        <div className="hidden lg:grid lg:grid-cols-5 gap-6 relative">
          {steps.map((step, index) => {
            const Icon = stepIcons[index % stepIcons.length];
            const deliverables = step.deliverables || [];
            const isSelected = activeStep === index;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                onClick={() => setActiveStep(index)}
                className={`bg-black-rich/80 backdrop-blur-md border p-3.5 sm:p-4 lg:p-5 flex flex-col justify-between transition-all duration-300 cursor-pointer relative group overflow-hidden ${
                  isSelected 
                    ? 'border-gold shadow-[0_0_25px_rgba(212,175,55,0.2)] bg-black-rich ring-1 ring-gold/40' 
                    : 'border-white/10 hover:border-gold/40 hover:-translate-y-1'
                }`}
              >
                {/* Active Glow Accent */}
                {isSelected && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-gold shadow-[0_0_10px_rgba(212,175,55,0.8)]" />
                )}

                <div>
                  {/* Top Bar inside Card */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold/80 font-bold">
                      PHASE 0{index + 1}
                    </span>
                    <div className={`p-2 border transition-all duration-300 ${
                      isSelected 
                        ? 'bg-gold text-black-pure border-gold shadow-[0_0_12px_rgba(212,175,55,0.4)]' 
                        : 'bg-black-pure text-gold border-gold/30 group-hover:border-gold'
                    }`}>
                      <Icon size={16} />
                    </div>
                  </div>

                  <h4 className="font-heading text-base sm:text-lg font-bold text-white uppercase tracking-wider mb-1.5 group-hover:text-gold transition-colors">
                    {step.title}
                  </h4>

                  <p className="text-gray-300 text-xs font-light leading-relaxed mb-3">
                    {step.desc}
                  </p>
                </div>

                {/* Key Deliverables Chips */}
                <div className="pt-2.5 border-t border-white/10 mt-auto">
                  <span className="text-[9px] uppercase tracking-widest text-gold/60 font-semibold block mb-1.5">
                    Key Deliverables:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {deliverables.map((item, dIdx) => (
                      <span 
                        key={dIdx} 
                        className="text-[10px] px-2 py-0.5 bg-white/5 border border-white/10 text-gray-300 font-light rounded-none flex items-center gap-1"
                      >
                        <ChevronRight size={10} className="text-gold shrink-0" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Mobile & Tablet Auto-Sliding View (below lg) */}
        <div className="lg:hidden relative overflow-hidden">
          {steps.length > 0 && (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeMobileIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-md mx-auto"
              >
                {(() => {
                  const step = steps[activeMobileIndex];
                  if (!step) return null;
                  const Icon = stepIcons[activeMobileIndex % stepIcons.length];
                  const deliverables = step.deliverables || [];

                  return (
                    <div
                      className="bg-black-rich backdrop-blur-md p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 relative overflow-hidden border-gold shadow-[0_0_25px_rgba(212,175,55,0.2)] ring-1 ring-gold/40 h-full min-h-[340px]"
                    >
                      <div className="absolute top-0 left-0 w-full h-1 bg-gold shadow-[0_0_10px_rgba(212,175,55,0.8)]" />
                      
                      <div>
                        <div className="flex items-center justify-between mb-6">
                          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold/80 font-bold">
                            PHASE 0{activeMobileIndex + 1}
                          </span>
                          <div className="p-2.5 border transition-all duration-300 bg-gold text-black-pure border-gold shadow-[0_0_12px_rgba(212,175,55,0.4)]">
                            <Icon size={18} />
                          </div>
                        </div>

                        <h4 className="font-heading text-lg sm:text-xl font-bold text-white uppercase tracking-wider mb-3">
                          {step.title}
                        </h4>

                        <p className="text-gray-300 text-xs sm:text-sm font-light leading-relaxed mb-6">
                          {step.desc}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-white/10 mt-auto">
                        <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-gold/60 font-semibold block mb-2">
                          Key Deliverables:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {deliverables.map((item, dIdx) => (
                            <span 
                              key={dIdx} 
                              className="text-[10px] sm:text-xs px-2 py-0.5 bg-white/5 border border-white/10 text-gray-300 font-light rounded-none flex items-center gap-1"
                            >
                              <ChevronRight size={10} className="text-gold shrink-0" />
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            </AnimatePresence>
          )}

          {/* Mobile Rectangle Slider Indicator */}
          <div className="flex items-center justify-center gap-2 mt-4 sm:mt-5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveMobileIndex(i)}
                className={`h-2.5 transition-all duration-300 cursor-pointer active:scale-95 ${
                  i === activeMobileIndex ? 'w-8 bg-gold' : 'w-2.5 bg-white/20 hover:bg-white/40'
                }`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Bottom CTA Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-6 sm:mt-8 bg-gradient-to-r from-black-rich via-black-pure to-black-rich border border-gold/30 p-5 sm:p-7 lg:p-8 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 relative overflow-hidden"
        >
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-gold/5 rounded-full blur-3xl pointer-events-none" />

          <div className="text-center md:text-left">
            <h4 className="font-heading text-lg md:text-xl text-white uppercase tracking-wider mb-1.5">
              Ready to begin Phase 01?
            </h4>
            <p className="text-gray-400 text-xs md:text-sm font-light">
              Book a site inspection call with our master designers to kickstart your interior transformation.
            </p>
          </div>

          <a
            href="#quote"
            className="h-11 sm:h-12 inline-flex items-center justify-center gap-2.5 bg-gold hover:bg-gold-light active:bg-gold-dark text-black-pure px-6 sm:px-8 text-xs sm:text-sm font-bold uppercase tracking-wider sm:tracking-[0.15em] transition-all duration-300 shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] active:scale-95 shrink-0 cursor-pointer group whitespace-nowrap rounded-sm"
          >
            <span>Book Consultation</span>
            <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
          </a>
        </motion.div>

      </div>
    </section>
  );
}
