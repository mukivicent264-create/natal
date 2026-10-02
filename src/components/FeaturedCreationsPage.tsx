import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Search, Sparkles, Filter, CheckCircle2, ArrowUpRight, SlidersHorizontal } from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { cardHighlights, projectsData } from '../data';

interface FeaturedCreationsPageProps {
  onNavigateHome: (sectionId?: string) => void;
}

// Combined creations list derived from cardHighlights and projectsData for comprehensive showcase
const allCreationsList = [
  ...cardHighlights.map((item, idx) => ({
    id: `creation-c${idx + 1}`,
    title: item.title,
    category: item.category,
    image: item.image,
    desc: item.desc,
    type: 'Interior Specialty',
    tags: [item.category, 'Custom Finish', 'Precision Execution']
  })),
  ...projectsData.map((project) => ({
    id: `project-${project.id}`,
    title: project.title,
    category: project.category,
    image: project.image,
    desc: project.description,
    type: 'Full Project Case',
    tags: project.servicesUsed
  }))
];

const categories = [
  "All",
  "Interior Finishing",
  "Woodwork",
  "Construction & Exterior",
  "Electrical",
  "Residential",
  "Commercial Offices",
  "Hospitality"
];

export default function FeaturedCreationsPage({ onNavigateHome }: FeaturedCreationsPageProps) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [firebaseProjects, setFirebaseProjects] = useState<any[]>([]);
  const [selectedCreation, setSelectedCreation] = useState<typeof allCreationsList[0] | null>(null);

  // Guarantee page displays strictly from the top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if ((window as any).__lenis) {
      (window as any).__lenis.resize();
      (window as any).__lenis.scrollTo(0, { immediate: true });
    }
    const t1 = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      if ((window as any).__lenis) {
        (window as any).__lenis.scrollTo(0, { immediate: true });
      }
    }, 25);
    const t2 = setTimeout(() => {
      window.scrollTo(0, 0);
      if ((window as any).__lenis) {
        (window as any).__lenis.scrollTo(0, { immediate: true });
      }
    }, 100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const fbProjects = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title,
            category: data.category,
            image: data.image,
            desc: data.desc,
            type: 'Uploaded Creation',
            tags: data.tags || [data.category]
          };
        });

        // Also incorporate locally cached uploads
        const localProjects = JSON.parse(localStorage.getItem('natal_local_projects') || '[]');
        const merged = [...fbProjects];
        localProjects.forEach((lp: any) => {
          if (!merged.some(m => m.id === lp.id || (m.title && lp.title && m.title.trim().toLowerCase() === lp.title.trim().toLowerCase()))) {
            merged.unshift({
              id: lp.id,
              title: lp.title,
              category: lp.category,
              image: lp.image,
              desc: lp.desc,
              type: 'Uploaded Creation',
              tags: lp.tags || [lp.category]
            });
          }
        });

        const seenIds = new Set<string>();
        const uniqueMerged = merged.filter(p => {
          const k = p.id || p.title;
          if (!k || seenIds.has(k)) return false;
          seenIds.add(k);
          return true;
        });

        setFirebaseProjects(uniqueMerged);
      }, (err) => {
        console.warn("Firestore listener error, loading from local cache:", err);
        const localProjects = JSON.parse(localStorage.getItem('natal_local_projects') || '[]');
        const seenIds = new Set<string>();
        const uniqueLocal = localProjects.filter((lp: any) => {
          const k = lp.id || lp.title;
          if (!k || seenIds.has(k)) return false;
          seenIds.add(k);
          return true;
        });
        setFirebaseProjects(uniqueLocal);
      });
    } catch (e) {
      console.warn("Error setting up Firestore listener:", e);
      const localProjects = JSON.parse(localStorage.getItem('natal_local_projects') || '[]');
      const seenIds = new Set<string>();
      const uniqueLocal = localProjects.filter((lp: any) => {
        const k = lp.id || lp.title;
        if (!k || seenIds.has(k)) return false;
        seenIds.add(k);
        return true;
      });
      setFirebaseProjects(uniqueLocal);
    }
    return () => unsubscribe();
  }, []);

  const seenCreations = new Set<string>();
  const combinedCreationsList = [...firebaseProjects, ...allCreationsList].filter((item, idx) => {
    const k = item.id || `c-${idx}`;
    if (seenCreations.has(k)) return false;
    seenCreations.add(k);
    return true;
  });

  const categoriesList = [
    "All",
    "Residential",
    "Commercial Offices",
    "Hospitality",
    ...Array.from(new Set(firebaseProjects.map((p: any) => String(p.category || '')))).filter((c: string) => !["All", "Residential", "Commercial Offices", "Hospitality"].includes(c))
  ];

  const filteredCreations = combinedCreationsList.filter(item => {
    const matchesCategory = activeCategory === "All" ? true : (item.category === activeCategory || item.tags.includes(activeCategory));
    
    const searchLower = searchQuery.toLowerCase();
    const titleMatch = (item.title || '').toLowerCase().includes(searchLower);
    const descMatch = (item.desc || '').toLowerCase().includes(searchLower);
    const categoryMatch = (item.category || '').toLowerCase().includes(searchLower);
    
    const matchesSearch = titleMatch || descMatch || categoryMatch;
    
    return matchesCategory && matchesSearch;
  });

  return (
    <div id="creations" data-section="products" className="min-h-screen bg-black-rich text-white pb-24">
      {/* Full-Width Header in Luxury Black & Gold Aesthetic */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative pt-2.5 pb-3.5 sm:pt-4 sm:pb-5 px-4 sm:px-8 border-b border-gold/30 bg-black-pure overflow-hidden w-full mb-4 sm:mb-5"
      >
        {/* Ambient Gold Radial Backgrounds */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold/20 via-black-pure/90 to-transparent blur-3xl pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none"></div>

        <div className="relative z-10 max-w-5xl mx-auto">
          {/* Top Navigation with Arrow Only */}
          <div className="flex items-center justify-between mb-2 sm:mb-2.5">
            <button
              onClick={() => onNavigateHome()}
              className="text-gold hover:text-yellow-200 transition-colors group cursor-pointer p-1"
              aria-label="Go back to home"
              title="Go back"
            >
              <ArrowLeft size={24} className="group-hover:-translate-x-1.5 transition-transform" />
            </button>
          </div>

          {/* Hero Content */}
          <div className="text-left sm:text-center">

            {/* Headline with Mobile-First Dynamic Line Layout */}
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-heading font-bold text-lg sm:text-2xl md:text-3xl text-white mb-1.5 leading-tight tracking-tight"
            >
              Featured Interior{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold via-yellow-200 to-amber-500 italic block xs:inline mt-0.5 sm:mt-0 drop-shadow-[0_2px_15px_rgba(212,175,55,0.3)]">
                Creations & Products
              </span>
            </motion.h1>

            {/* Description with Gold Accent Rule on Mobile */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative max-w-2xl mx-auto mb-2.5 sm:mb-3 text-left sm:text-center pl-3 sm:pl-0 border-l-2 border-gold/70 sm:border-l-0"
            >
              <p className="text-gray-300 font-light leading-snug sm:leading-relaxed text-xs sm:text-sm">
                Explore our comprehensive gallery of architectural ceiling installations, custom woodwork, luxury interior finishes, and full residential & commercial renovations.
              </p>
            </motion.div>

            {/* Quick Feature Metric Cards */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2.5 max-w-2xl mx-auto pt-2.5 sm:pt-3 border-t border-gold/20"
            >
              <div className="bg-black-rich/90 border border-gold/30 py-1.5 px-2.5 sm:py-2 sm:px-3 text-center hover:border-gold transition-colors">
                <span className="block text-gold font-heading text-sm sm:text-base font-bold">Gypsum</span>
                <span className="text-[7.5px] sm:text-[9px] text-gray-300 uppercase tracking-wider font-mono">Ceiling Lighting</span>
              </div>
              <div className="bg-black-rich/90 border border-gold/30 py-1.5 px-2.5 sm:py-2 sm:px-3 text-center hover:border-gold transition-colors">
                <span className="block text-gold font-heading text-sm sm:text-base font-bold">Woodwork</span>
                <span className="text-[7.5px] sm:text-[9px] text-gray-300 uppercase tracking-wider font-mono">Bespoke Joinery</span>
              </div>
              <div className="bg-black-rich/90 border border-gold/30 py-1.5 px-2.5 sm:py-2 sm:px-3 text-center hover:border-gold transition-colors">
                <span className="block text-gold font-heading text-sm sm:text-base font-bold">Finishes</span>
                <span className="text-[7.5px] sm:text-[9px] text-gray-300 uppercase tracking-wider font-mono">Luxury Paint & Paper</span>
              </div>
              <div className="bg-black-rich/90 border border-gold/30 py-1.5 px-2.5 sm:py-2 sm:px-3 text-center hover:border-gold transition-colors">
                <span className="block text-gold font-heading text-sm sm:text-base font-bold">Turnkey</span>
                <span className="text-[7.5px] sm:text-[9px] text-gray-300 uppercase tracking-wider font-mono">Renovations</span>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        {/* Filter & Search Bar */}
        <div className="flex flex-col items-center justify-center gap-4 mb-8 sm:mb-10">
          {/* Category Tabs (Row 1) */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 w-full">
            {categoriesList.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-4 sm:px-5 py-2.5 text-[10px] sm:text-xs uppercase tracking-widest font-bold transition-all duration-300 cursor-pointer rounded-none ${
                  activeCategory === category 
                    ? 'bg-gold text-black-pure shadow-[0_4px_20px_rgba(212,175,55,0.4)]' 
                    : 'bg-black-pure text-gray-300 hover:bg-white/10 hover:text-white border border-gold/20'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Search Box (Row 2) */}
          <div className="relative w-full max-w-xl sm:max-w-2xl mt-3 sm:mt-5">
            <input
              type="text"
              placeholder="Search creations or materials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black-pure border border-gold/40 text-white text-sm px-12 py-4 focus:outline-none focus:border-gold transition-colors placeholder:text-gray-500 rounded-none shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
            />
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gold/70" />
          </div>
        </div>

        {/* Creations Grid (2 columns on mobile, 3 on tablet, 6 on laptop with generous spacing) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-3.5 sm:gap-x-5 lg:gap-x-6 xl:gap-x-8 gap-y-6 sm:gap-y-8 lg:gap-y-10">
          <AnimatePresence>
            {filteredCreations.map((item, itemIdx) => (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                key={item.id ? `${item.id}-${itemIdx}` : `creation-${itemIdx}`}
                className="group relative bg-black-pure border border-gold/30 hover:border-gold hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:-translate-y-1 transition-all duration-500 flex flex-col justify-between overflow-hidden shadow-2xl rounded-none"
              >
                {/* Gold Top Border */}
                <div className="h-1 bg-gradient-to-r from-gold via-yellow-200 to-amber-600 shrink-0"></div>

                <div 
                  onClick={() => setSelectedCreation(item)}
                  className="relative aspect-[16/9] lg:aspect-[16/11] overflow-hidden shrink-0 cursor-pointer"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 filter brightness-90 group-hover:brightness-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black-pure via-black-pure/30 to-transparent"></div>
                  
                  <div className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5 flex flex-wrap items-center gap-1 z-10">
                    <span className="bg-black-pure/90 border border-gold/40 text-gold text-[7px] sm:text-[8px] lg:text-[9px] uppercase tracking-wider sm:tracking-[0.15em] font-mono font-bold px-1.5 sm:px-2 py-0.5 sm:py-0.5">
                      {item.type}
                    </span>
                    {item.type === 'Uploaded Creation' && (
                      <span className="bg-gradient-to-r from-amber-500 to-yellow-300 text-black-pure text-[7px] sm:text-[8px] uppercase tracking-wider font-mono font-extrabold px-1 sm:px-1.5 py-0.5 shadow-md">
                        {itemIdx === 0 ? 'Latest' : 'New'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-2 sm:p-3 lg:p-5 flex-grow flex flex-col justify-between">
                  <div>
                    <span className="text-[7px] sm:text-[8px] lg:text-[10px] text-gold uppercase tracking-wider block font-mono mb-0.5 sm:mb-1 truncate">
                      {item.category}
                    </span>
                    <h3 
                      onClick={() => setSelectedCreation(item)}
                      className="font-heading text-xs sm:text-sm md:text-base lg:text-lg text-white font-bold group-hover:text-gold transition-colors flex items-start justify-between gap-1 cursor-pointer min-h-0"
                    >
                      <span className="line-clamp-1 sm:line-clamp-2 leading-tight">{item.title}</span>
                      <ArrowUpRight size={13} className="text-gold opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5 hidden sm:block" />
                    </h3>
                    <p className="text-gray-300 text-[8px] sm:text-[10px] lg:text-xs font-light leading-tight sm:leading-relaxed mt-1 line-clamp-1 sm:line-clamp-2 lg:line-clamp-3">
                      {item.desc}
                    </p>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 pt-1.5 sm:pt-2 lg:pt-3 border-t border-white/10 mt-1.5 sm:mt-2 lg:mt-4">
                    {item.tags.slice(0, 2).map((tag, tIdx) => (
                      <span key={tIdx} className="text-[6px] sm:text-[7px] lg:text-[9px] px-1 sm:px-1.5 py-0.5 border border-gold/20 text-gray-300 uppercase tracking-wider font-mono bg-white/5 truncate max-w-full">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2 pt-1.5 sm:pt-2 lg:pt-3 border-t border-white/10 mt-2">
                    <a
                      href={`#project-specs?id=${encodeURIComponent(item.id)}`}
                      onClick={(e) => {
                        e.preventDefault();
                        const projectObj = {
                          id: item.id,
                          title: item.title,
                          category: item.category,
                          description: item.desc,
                          image: item.image,
                          beforeImage: item.beforeImage || '',
                          servicesUsed: item.tags
                        };
                        try {
                          sessionStorage.setItem('natal_active_specs_project', JSON.stringify(projectObj));
                        } catch (err) {}
                        window.location.hash = `#project-specs?id=${encodeURIComponent(item.id)}`;
                      }}
                      className="w-full bg-black-pure hover:bg-black-rich active:bg-black border border-gold/70 hover:border-gold text-gold active:scale-95 min-h-[34px] sm:min-h-[36px] py-1.5 sm:py-2 px-1 text-[11px] sm:text-xs font-medium uppercase tracking-wider transition-all text-center cursor-pointer rounded-none flex items-center justify-center gap-1 shadow-sm whitespace-nowrap group/btn"
                      title={`View ${item.title} Specifications`}
                    >
                      <SlidersHorizontal size={11} className="shrink-0 text-gold group-hover/btn:rotate-45 transition-transform" />
                      <span>Specs</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => onNavigateHome('quote')}
                      className="w-full bg-gold hover:bg-gold-light active:bg-gold-dark text-black-pure active:scale-95 min-h-[34px] sm:min-h-[36px] py-1.5 sm:py-2 px-1 text-[11px] sm:text-xs font-semibold uppercase tracking-wider transition-all text-center cursor-pointer rounded-none shadow-[0_0_12px_rgba(212,175,55,0.3)] flex items-center justify-center gap-1 whitespace-nowrap"
                      title="Get a Quote"
                    >
                      <span>Quote</span>
                      <ArrowUpRight size={12} className="shrink-0 text-black-pure" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredCreations.length === 0 && (
          <div className="text-center py-16 md:py-24 text-gray-400 border border-gold/20 bg-black-pure">
            <Filter size={32} className="mx-auto text-gold/50 mb-4" />
            <p className="text-lg font-heading text-white mb-2">No creations found</p>
            <p className="text-xs text-gray-400">Try adjusting your category selection or search keyword.</p>
          </div>
        )}
      </div>

      {/* Creation Details Lightbox Modal */}
      <AnimatePresence>
        {selectedCreation && (
          <div 
            onClick={() => setSelectedCreation(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black-pure/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-black-pure border border-gold max-w-2xl w-full p-5 sm:p-7 md:p-8 relative shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              {/* Modal Header Bar providing clear space at the top */}
              <div className="flex items-center justify-between pb-3.5 mb-4 sm:mb-5 border-b border-gold/20">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gold animate-pulse"></span>
                  <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-gold font-bold">
                    Creation Specifications
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCreation(null)}
                  className="text-gray-300 hover:text-white hover:border-gold text-xs uppercase font-mono tracking-wider border border-gold/30 px-3 py-1.5 bg-white/5 hover:bg-gold/10 transition-colors cursor-pointer"
                >
                  Close ✕
                </button>
              </div>

              {/* Main Image with spacious framing */}
              <div className="aspect-video w-full overflow-hidden border border-gold/30 mb-5 sm:mb-6 shadow-lg">
                <img src={selectedCreation.image} alt={selectedCreation.title} className="w-full h-full object-cover" />
              </div>

              <span className="text-gold text-xs font-mono uppercase tracking-widest block mb-2">{selectedCreation.category}</span>
              <h2 className="text-2xl sm:text-4xl font-heading font-bold text-white mb-4">{selectedCreation.title}</h2>
              <p className="text-gray-300 text-sm font-light leading-relaxed mb-6">{selectedCreation.desc}</p>

              <div className="border-t border-gold/30 pt-4 mb-6">
                <h4 className="text-xs uppercase tracking-widest text-gold font-bold mb-3">Highlights & Features</h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-200">
                  {selectedCreation.tags.map((tag, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-gold" />
                      <span>{tag}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setSelectedCreation(null);
                    onNavigateHome('quote');
                  }}
                  className="w-full bg-gold hover:bg-gold-light text-black-pure py-3.5 font-bold uppercase tracking-widest text-xs transition-colors cursor-pointer rounded-none"
                >
                  Request Quote For Similar Project
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
