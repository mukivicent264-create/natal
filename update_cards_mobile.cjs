const fs = require('fs');

// Update Showcase.tsx
const showcaseCode = `import { motion } from 'motion/react';
import { cardHighlights } from '../data';
import { Sparkles, ArrowUpRight } from 'lucide-react';

export default function Showcase() {
  return (
    <section id="showcase" className="py-24 bg-black-pure border-y border-gold/20 relative">
      <div className="max-w-[1920px] mx-auto px-6 lg:px-16">
        <div className="text-center mb-16">
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

        {/* Cards Grid: 4 cards on phone (<sm), 3 on sm, 6 on lg */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
          {cardHighlights.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={\`group relative bg-black-rich border border-gold/30 hover:border-gold transition-all duration-500 overflow-hidden shadow-xl flex flex-col \${
                index >= 4 ? 'hidden sm:flex' : 'flex'
              }\`}
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
console.log('Updated Showcase.tsx');

// Update Services.tsx
const servicesCode = `import { motion } from 'motion/react';
import { servicesData } from '../data';
import { Home, Hammer, Building2, Zap, CheckCircle2, Paintbrush, TreePine, ArrowRight } from 'lucide-react';

const icons = [Paintbrush, Hammer, Home, Zap, TreePine, Building2];

interface ServicesProps {
  onNavigateToService?: (slug: string) => void;
}

const serviceSlugMap: Record<string, string> = {
  'interior-finishing': 'interior-finishing',
  'woodwork': 'custom-woodwork',
  'construction': 'construction-exterior',
  'electrical': 'electrical-services',
};

export default function Services({ onNavigateToService }: ServicesProps) {
  return (
    <section id="services" className="py-28 bg-black-rich relative overflow-hidden">
      {/* Subtle gold grid background motif */}
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

      <div className="max-w-[1920px] mx-auto px-6 lg:px-16 relative z-10">
        
        <div className="text-center mb-16">
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

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
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
console.log('Updated Services.tsx');
