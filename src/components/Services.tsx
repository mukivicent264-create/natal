import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { servicesData } from '../data';
import { Service } from '../types';
import { 
  Home, Hammer, Building2, Zap, CheckCircle2, Paintbrush, TreePine, 
  ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Droplet, HardHat, Sparkles,
  Layers, Briefcase, ShieldCheck 
} from 'lucide-react';
import { collection, query, onSnapshot, orderBy, doc } from 'firebase/firestore';
import { db } from '../firebase';

const iconMap: Record<string, any> = {
  Paintbrush,
  Hammer,
  Home,
  Zap,
  TreePine,
  Building2,
  Droplet,
  HardHat,
  Sparkles,
  Layers,
  Briefcase,
  ShieldCheck
};

const defaultIcons = [Paintbrush, Hammer, Home, Zap, TreePine, Building2, Sparkles, HardHat];

interface ServicesProps {
  onNavigateToService?: (slug: string) => void;
}

export default function Services({ onNavigateToService }: ServicesProps) {
  const [uploadedServices, setUploadedServices] = useState<Service[]>([]);
  const [hiddenServiceIds, setHiddenServiceIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('natal_hidden_services') || '[]');
    } catch {
      return [];
    }
  });
  const [sectionSubtitle, setSectionSubtitle] = useState<string>(() => {
    return localStorage.getItem('natal_services_subtitle') || 'Capabilities';
  });
  const [sectionTitle, setSectionTitle] = useState<string>(() => {
    return localStorage.getItem('natal_services_title') || 'OUR SERVICES';
  });
  const [sectionDescription, setSectionDescription] = useState<string>(() => {
    return localStorage.getItem('natal_services_desc') || '';
  });

  // Sync uploaded services and site settings from Firestore and local storage
  useEffect(() => {
    let unsubscribeServices = () => {};
    let unsubscribeSettings = () => {};

    try {
      const q = query(collection(db, 'services'), orderBy('createdAt', 'desc'));
      unsubscribeServices = onSnapshot(q, (snapshot) => {
        const fbServices: Service[] = snapshot.docs.map(docSnap => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            slug: d.slug || docSnap.id,
            originalId: d.originalId || d.slug || docSnap.id,
            title: d.title || 'Bespoke Service',
            description: d.description || '',
            icon: d.icon || 'Sparkles',
            features: d.features || (d.featuresText ? d.featuresText.split(',').map((s: string) => s.trim()) : ['Bespoke Interior Craft', 'Turnkey Execution'])
          };
        });

        // Also incorporate locally cached services
        const localServices = JSON.parse(localStorage.getItem('natal_local_services') || '[]');
        const combined = [...fbServices];
        localServices.forEach((ls: any) => {
          if (!combined.some(c => c.id === ls.id || (c.title && ls.title && c.title.trim().toLowerCase() === ls.title.trim().toLowerCase()))) {
            combined.unshift({
              id: ls.id,
              slug: ls.slug || ls.id,
              originalId: ls.originalId || ls.slug || ls.id,
              title: ls.title || 'Bespoke Service',
              description: ls.description || '',
              icon: ls.icon || 'Sparkles',
              features: ls.features || (ls.featuresText ? ls.featuresText.split(',').map((s: string) => s.trim()) : ['Bespoke Interior Craft', 'Turnkey Execution'])
            });
          }
        });

        const seenSvc = new Set<string>();
        const uniqueCombined = combined.filter(s => {
          const k = s.id || s.title;
          if (!k || seenSvc.has(k)) return false;
          seenSvc.add(k);
          return true;
        });

        setUploadedServices(uniqueCombined);
      }, (err) => {
        console.warn("Services firestore listener fallback:", err);
        const localServices = JSON.parse(localStorage.getItem('natal_local_services') || '[]');
        const seenSvc = new Set<string>();
        const uniqueLocal = localServices.filter((ls: any) => {
          const k = ls.id || ls.title;
          if (!k || seenSvc.has(k)) return false;
          seenSvc.add(k);
          return true;
        });
        setUploadedServices(uniqueLocal);
      });
    } catch (e) {
      console.warn("Error setting up services listener:", e);
      const localServices = JSON.parse(localStorage.getItem('natal_local_services') || '[]');
      const seenSvc = new Set<string>();
      const uniqueLocal = localServices.filter((ls: any) => {
        const k = ls.id || ls.title;
        if (!k || seenSvc.has(k)) return false;
        seenSvc.add(k);
        return true;
      });
      setUploadedServices(uniqueLocal);
    }

    // Listen to section settings (title, subtitle, description, hidden items)
    try {
      unsubscribeSettings = onSnapshot(doc(db, 'site_settings', 'services_section'), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.sectionSubtitle) {
            setSectionSubtitle(data.sectionSubtitle);
            localStorage.setItem('natal_services_subtitle', data.sectionSubtitle);
          }
          if (data.sectionTitle) {
            setSectionTitle(data.sectionTitle);
            localStorage.setItem('natal_services_title', data.sectionTitle);
          }
          if (data.sectionDescription !== undefined) {
            setSectionDescription(data.sectionDescription);
            localStorage.setItem('natal_services_desc', data.sectionDescription);
          }
          if (Array.isArray(data.hiddenServiceIds)) {
            setHiddenServiceIds(data.hiddenServiceIds);
            localStorage.setItem('natal_hidden_services', JSON.stringify(data.hiddenServiceIds));
          }
        }
      }, (err) => {
        console.warn("Services section settings listener fallback:", err);
      });
    } catch (e) {
      console.warn("Error setting up services settings listener:", e);
    }

    return () => {
      unsubscribeServices();
      unsubscribeSettings();
    };
  }, []);

  // Compute merged allServices: uploaded/edited services take priority over default base services
  const hiddenIdsSet = new Set(hiddenServiceIds.map(h => (h || '').toLowerCase().trim()));

  const filteredUploaded = uploadedServices.filter(s => {
    const k = (s.id || '').toLowerCase().trim();
    const t = (s.title || '').toLowerCase().trim();
    return !hiddenIdsSet.has(k) && !hiddenIdsSet.has(t);
  });

  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  const mergedList: Service[] = [];

  // 1. First add all uploaded/updated services (prioritized at the top)
  for (const s of filteredUploaded) {
    mergedList.push(s);
    if (s.id) seenIds.add(s.id.toLowerCase());
    if (s.slug) seenIds.add(s.slug.toLowerCase());
    if (s.originalId) seenIds.add(s.originalId.toLowerCase());
    if (s.title) seenTitles.add(s.title.trim().toLowerCase());
  }

  // 2. Add default base services if not overridden or hidden
  for (const sd of servicesData) {
    const idKey = sd.id.toLowerCase();
    const slugKey = (sd.slug || '').toLowerCase();
    const titleKey = sd.title.trim().toLowerCase();

    if (hiddenIdsSet.has(idKey) || hiddenIdsSet.has(slugKey) || hiddenIdsSet.has(titleKey)) {
      continue;
    }

    if (!seenIds.has(idKey) && !seenIds.has(slugKey) && !seenTitles.has(titleKey)) {
      mergedList.push(sd);
      seenIds.add(idKey);
      seenTitles.add(titleKey);
    }
  }

  const allServices = mergedList;

  const getIconComponent = (iconName: string, index: number) => {
    if (iconMap[iconName]) return iconMap[iconName];
    return defaultIcons[index % defaultIcons.length];
  };

  return (
    <section id="services" className="py-4 sm:py-6 md:py-8 bg-black-rich relative overflow-hidden">
      {/* Subtle gold grid background motif */}
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

      <div className="w-full max-w-[98vw] xl:max-w-[95vw] 2xl:max-w-[1780px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 relative z-10">
        
        <div className="text-center mb-4 sm:mb-6 lg:mb-7">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-gold tracking-[0.25em] uppercase text-xs sm:text-sm font-semibold mb-1"
          >
            {sectionSubtitle || 'Capabilities'}
          </motion.h2>
          <motion.h3 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-heading text-lg sm:text-xl md:text-2xl lg:text-3xl text-white font-bold uppercase tracking-wider"
          >
            {sectionTitle || 'OUR SERVICES'}
          </motion.h3>
          <div className="w-20 sm:w-24 h-[1.5px] bg-gradient-to-r from-transparent via-gold to-transparent mx-auto mt-2"></div>
          {sectionDescription && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
              className="text-gray-400 text-[11px] sm:text-xs md:text-sm max-w-2xl mx-auto mt-1.5 leading-relaxed"
            >
              {sectionDescription}
            </motion.p>
          )}
        </div>

        {/* Responsive Services Grid: 2 columns on mobile, 3 on tablet, 6 on laptop with generous in-between space and no sliding */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-3.5 sm:gap-x-5 lg:gap-x-6 xl:gap-x-8 gap-y-3.5 sm:gap-y-4 lg:gap-y-5">
          {allServices.slice(0, 12).map((service, index) => {
            const Icon = getIconComponent(service.icon, index);
            const isUploaded = uploadedServices.some(u => u.id === service.id);
            
            return (
              <motion.div
                key={service.id ? `${service.id}-${index}` : `svc-${index}`}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
                className="group bg-black-pure border border-gold/30 hover:border-gold p-2.5 sm:p-3 lg:p-3.5 transition-all duration-400 relative flex flex-col h-full shadow-2xl rounded-none"
              >
                {/* Gold Top Accent Line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold/50 via-gold to-gold/50 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="flex-grow flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-gold/40 bg-gold/5 flex items-center justify-center group-hover:bg-gold transition-all duration-500 shrink-0">
                      <Icon className="text-gold group-hover:text-black-pure transition-colors duration-500" size={14} />
                    </div>
                    {isUploaded && (
                      <span className="bg-gradient-to-r from-amber-500 to-yellow-300 text-black-pure text-[6px] md:text-[7px] uppercase tracking-widest font-mono font-extrabold px-1.5 py-0.5 shadow-md ml-2 text-right">
                        {index === 0 ? 'Latest' : 'Bespoke'}
                      </span>
                    )}
                  </div>
                  
                  <h4 className="font-heading text-xs md:text-sm lg:text-[13px] leading-tight text-white font-bold mb-1 uppercase tracking-wide group-hover:text-gold transition-colors line-clamp-2">{service.title}</h4>
                  <p className="text-gray-400 font-light mb-1.5 text-[9px] md:text-[10px] leading-tight line-clamp-2">
                    {service.description}
                  </p>
                  
                  <div className="border-t border-gold/20 pt-1.5 mb-1.5 mt-auto">
                    <ul className="space-y-0.5">
                      {service.features.slice(0, 2).map((feature, i) => (
                        <li key={i} className="flex items-start text-[8px] md:text-[9px] text-gray-200 uppercase tracking-wider font-medium">
                          <CheckCircle2 size={9} className="text-gold mr-1.5 flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-1 leading-tight">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div className="pt-1.5 border-t border-white/10 w-full shrink-0">
                  <a 
                    href="#quote"
                    className="bg-gold hover:bg-gold-light active:bg-gold-dark text-black-pure py-1.5 px-3 text-[8px] md:text-[9px] font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(212,175,55,0.15)] active:scale-95 text-center rounded-none block w-full cursor-pointer"
                  >
                    Get Quote
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Explore more services button below cards */}
        <div className="mt-5 sm:mt-7 text-center">
          <a
            href="#all-services"
            className="h-11 sm:h-12 inline-flex items-center justify-center gap-2 bg-gold hover:bg-gold-light active:bg-gold-dark text-black-pure px-6 sm:px-8 font-bold uppercase tracking-wider sm:tracking-[0.15em] text-xs sm:text-sm transition-all duration-300 shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] active:scale-95 rounded-sm cursor-pointer group whitespace-nowrap"
          >
            <span>View More Services</span>
            <ArrowUpRight size={15} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
          </a>
        </div>

      </div>
    </section>
  );
}
