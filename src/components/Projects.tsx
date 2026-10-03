import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { projectsData } from '../data';
import { Project } from '../types';
import { ArrowRight, Sparkles, CheckCircle2, SlidersHorizontal, ArrowUpRight } from 'lucide-react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

function ProjectCard({ project, isShowingBefore, onToggleBeforeAfter, onSpecsClick, isLatest }: any) {
  return (
    <div className="group relative flex flex-col bg-black-rich border border-gold/20 hover:border-gold hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:-translate-y-1 transition-all duration-500 overflow-hidden shadow-2xl h-full w-full flex-grow">
      {/* Gold Top Accent Line */}
      <div className="h-1 bg-gradient-to-r from-gold via-yellow-200 to-amber-600 shrink-0"></div>

      {/* Project Image Container - Tapping opens specs lightbox */}
      <div 
        onClick={onSpecsClick}
        className="relative aspect-[16/9] lg:aspect-[16/10] overflow-hidden shrink-0 bg-black-pure cursor-pointer"
        title="View Project Specifications"
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={isShowingBefore ? 'before' : 'after'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            src={isShowingBefore ? project.beforeImage : project.image}
            alt={project.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 filter brightness-90 group-hover:brightness-100"
          />
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-t from-black-pure via-black-pure/20 to-transparent"></div>

        {/* Category Badge & Optional New Tag */}
        <div className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5 flex flex-wrap items-center gap-1 z-10 pointer-events-none">
          <span className="bg-black-pure/90 border border-gold/40 text-gold text-[7px] sm:text-[8px] lg:text-[9px] uppercase tracking-wider sm:tracking-[0.15em] font-mono font-bold px-1.5 py-0.5 sm:px-2 sm:py-0.5">
            {project.category}
          </span>
          {isLatest && (
            <span className="bg-gradient-to-r from-amber-500 to-yellow-300 text-black-pure text-[7px] sm:text-[8px] uppercase tracking-wider font-mono font-extrabold px-1 sm:px-1.5 py-0.5 shadow-md animate-pulse">
              Latest
            </span>
          )}
        </div>

        {/* Before/After Toggle Pill if beforeImage available */}
        {project.beforeImage && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleBeforeAfter();
            }}
            className={`absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 z-10 flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-0.5 text-[7px] sm:text-[8px] lg:text-[9px] uppercase tracking-wider font-bold transition-all cursor-pointer border ${
              isShowingBefore
                ? 'bg-amber-500 text-black-pure border-amber-400 font-extrabold'
                : 'bg-black-pure/80 text-gold border-gold/40 hover:bg-gold hover:text-black-pure'
            }`}
          >
            <SlidersHorizontal size={9} className="sm:w-[10px] sm:h-[10px]" />
            <span>Before</span>
          </button>
        )}
      </div>

      {/* Content Section */}
      <div className="p-2 sm:p-2.5 lg:p-4 flex-grow flex flex-col justify-between">
        <div onClick={onSpecsClick} className="cursor-pointer">
          <h3 className="font-heading text-xs sm:text-xs md:text-sm lg:text-base text-white font-bold mb-1 group-hover:text-gold transition-colors flex items-start justify-between gap-1">
            <span className="leading-tight line-clamp-1 sm:line-clamp-2">{project.title}</span>
            <ArrowUpRight
              size={13}
              className="text-gold opacity-60 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"
            />
          </h3>

          <p className="text-gray-300 text-[9px] sm:text-[10px] lg:text-xs font-light leading-tight sm:leading-snug mb-1.5 sm:mb-2 lg:mb-3 line-clamp-1 sm:line-clamp-2">
            {project.description}
          </p>
        </div>

        <div>
          {/* Services Used Tags */}
          <div className="flex flex-wrap gap-1 mb-1.5 sm:mb-2 lg:mb-3 pt-1.5 sm:pt-2 border-t border-white/10">
            {project.servicesUsed.slice(0, 2).map((service: string, sIdx: number) => (
              <span
                key={sIdx}
                className="text-[7px] sm:text-[8px] lg:text-[9px] px-1.5 py-0.5 border border-gold/25 text-gray-300 uppercase tracking-wider font-mono bg-white/5 truncate max-w-full"
              >
                {service}
              </span>
            ))}
          </div>

          {/* Action Buttons - Distinct, prominent, easily tappable on mobile */}
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mt-auto pt-1.5 sm:pt-2 border-t border-white/10">
            <a
              href={`#project-specs?id=${encodeURIComponent(project.id)}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSpecsClick();
              }}
              className="w-full bg-black-pure hover:bg-black-rich active:bg-black border border-gold/70 hover:border-gold text-gold active:scale-95 min-h-[34px] sm:min-h-[36px] py-1.5 sm:py-2 px-1 text-[11px] sm:text-xs font-medium uppercase tracking-wider transition-all text-center cursor-pointer rounded-none flex items-center justify-center gap-1 shadow-sm whitespace-nowrap group/btn"
              title={`View ${project.title} Specifications`}
            >
              <SlidersHorizontal size={11} className="shrink-0 text-gold group-hover/btn:rotate-45 transition-transform" />
              <span>Specs</span>
            </a>
            <a
              href="#quote"
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-gold hover:bg-gold-light active:bg-gold-dark text-black-pure active:scale-95 min-h-[34px] sm:min-h-[36px] py-1.5 sm:py-2 px-1 text-[11px] sm:text-xs font-semibold uppercase tracking-wider transition-all text-center cursor-pointer rounded-none shadow-[0_0_12px_rgba(212,175,55,0.3)] flex items-center justify-center gap-1 whitespace-nowrap"
              title="Get a Quote"
            >
              <span>Quote</span>
              <ArrowUpRight size={12} className="shrink-0 text-black-pure" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ProjectsProps {
  onViewProjectSpecs?: (project: Project) => void;
}

export default function Projects({ onViewProjectSpecs }: ProjectsProps = {}) {
  const [uploadedProjects, setUploadedProjects] = useState<Project[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeBeforeAfterId, setActiveBeforeAfterId] = useState<string | null>(null);

  const handleOpenSpecs = (project: Project) => {
    if (onViewProjectSpecs) {
      onViewProjectSpecs(project);
    } else {
      try {
        sessionStorage.setItem('natal_active_specs_project', JSON.stringify(project));
      } catch (e) {}
      window.location.hash = `#project-specs?id=${encodeURIComponent(project.id)}`;
    }
  };

  // Sync projects dynamically from Firestore and local cache
  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const fbProjects: Project[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || 'Untitled Creation',
            category: data.category || 'Interior Design',
            description: data.desc || data.description || '',
            image: data.image || '',
            beforeImage: data.beforeImage || undefined,
            servicesUsed: data.tags || [data.category, 'Natal Creation']
          };
        });

        // Also incorporate locally cached uploads
        const localData = JSON.parse(localStorage.getItem('natal_local_projects') || '[]');
        const combined = [...fbProjects];
        localData.forEach((lp: any) => {
          if (!combined.some(cp => cp.id === lp.id || (cp.title && lp.title && cp.title.trim().toLowerCase() === lp.title.trim().toLowerCase()))) {
            combined.unshift({
              id: lp.id,
              title: lp.title,
              category: lp.category,
              description: lp.desc || lp.description || '',
              image: lp.image,
              beforeImage: lp.beforeImage || undefined,
              servicesUsed: lp.tags || [lp.category, 'Natal Creation']
            });
          }
        });

        const seenIds = new Set<string>();
        const uniqueCombined = combined.filter(p => {
          const k = p.id || p.title;
          if (!k || seenIds.has(k)) return false;
          seenIds.add(k);
          return true;
        });

        setUploadedProjects(uniqueCombined);
      }, (err) => {
        console.warn("Firestore projects load fallback:", err);
        const localData = JSON.parse(localStorage.getItem('natal_local_projects') || '[]');
        const seenIds = new Set<string>();
        const uniqueLocal = localData.filter((lp: any) => {
          const k = lp.id || lp.title;
          if (!k || seenIds.has(k)) return false;
          seenIds.add(k);
          return true;
        });
        setUploadedProjects(uniqueLocal.map((lp: any) => ({
          id: lp.id,
          title: lp.title,
          category: lp.category,
          description: lp.desc || lp.description || '',
          image: lp.image,
          beforeImage: lp.beforeImage || undefined,
          servicesUsed: lp.tags || [lp.category, 'Natal Creation']
        })));
      });
    } catch (e) {
      console.warn("Firestore error in Projects:", e);
      const localData = JSON.parse(localStorage.getItem('natal_local_projects') || '[]');
      const seenIds = new Set<string>();
      const uniqueLocal = localData.filter((lp: any) => {
        const k = lp.id || lp.title;
        if (!k || seenIds.has(k)) return false;
        seenIds.add(k);
        return true;
      });
      setUploadedProjects(uniqueLocal.map((lp: any) => ({
        id: lp.id,
        title: lp.title,
        category: lp.category,
        description: lp.desc || lp.description || '',
        image: lp.image,
        beforeImage: lp.beforeImage || undefined,
        servicesUsed: lp.tags || [lp.category, 'Natal Creation']
      })));
    }
    return () => unsubscribe();
  }, []);

  // Place uploaded/updated projects strictly at the top of the list without duplicate IDs
  const seenAll = new Set<string>();
  const allProjects = [...uploadedProjects, ...projectsData].filter((p, idx) => {
    const k = p.id || `proj-${idx}`;
    if (seenAll.has(k)) return false;
    seenAll.add(k);
    return true;
  });

  // Dynamic category pills for auto-scrolling marquee
  const baseCategories = [
    'All',
    'Residential',
    'Commercial Offices',
    'Hospitality',
    'Gypsum Ceilings',
    'Custom Furniture',
    'Kitchen Cabinets',
    'TV Unit Design',
    'Lighting Solutions',
    'Office Partitioning',
    'Sound Proofing',
    'Wallpapers',
    'Tiles',
    ...Array.from(new Set(uploadedProjects.map((p: any) => String(p.category || '')))).filter((c: string) => !['All', 'Residential', 'Commercial Offices', 'Hospitality'].includes(c))
  ];
  const categories = Array.from(new Set(baseCategories));

  const filteredProjects = allProjects.filter((project) =>
    selectedCategory === 'All' ? true : (project.category === selectedCategory || (project.servicesUsed && project.servicesUsed.includes(selectedCategory)))
  );

  return (
    <section id="projects" className="py-4 sm:py-6 md:py-8 bg-black-pure border-b border-gold/20 relative">
      <div className="w-full max-w-[98vw] xl:max-w-[95vw] 2xl:max-w-[1780px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-4 sm:mb-5 gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-gold text-xs sm:text-sm uppercase tracking-[0.25em] font-semibold mb-1.5 sm:mb-2">
              <Sparkles size={14} />
              <span>Our Portfolio</span>
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl text-white font-bold uppercase tracking-wider">
              Featured <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold via-yellow-300 to-amber-500 italic">Projects</span>
            </h2>
          </div>
        </div>

        {/* Auto-scrolling category list (right to left) with Full Gallery at the right side */}
        <div className="flex items-center justify-between gap-3 sm:gap-6 mb-5 sm:mb-7 border-y border-gold/25 py-2 sm:py-2.5 bg-black-rich/70 backdrop-blur-md relative overflow-hidden">
          {/* Auto-scroll marquee container moving from right to left */}
          <div className="flex-1 min-w-0 overflow-hidden relative">
            {/* Left fade gradient */}
            <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-black-rich to-transparent z-10 pointer-events-none" />
            {/* Right fade gradient */}
            <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-black-rich to-transparent z-10 pointer-events-none" />

            {/* Seamless scrolling track with slow, calm luxury pace */}
            <div 
              className="flex items-center gap-2 sm:gap-3 w-max animate-marquee hover:[animation-play-state:paused] active:[animation-play-state:paused]"
              style={{ animationDuration: '88s' }}
            >
              {[...categories, ...categories].map((cat, idx) => (
                <button
                  key={`${cat}-${idx}`}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 sm:px-4 py-1.5 text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest font-bold transition-all cursor-pointer rounded-none whitespace-nowrap shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-gold text-black-pure shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                      : 'bg-black-pure/90 text-gray-300 border border-gold/30 hover:border-gold hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Full Gallery firmly docked at the right side */}
          <div className="shrink-0 z-20 pl-2.5 sm:pl-5 border-l border-gold/30">
            <a
              href="#creations"
              className="inline-flex items-center gap-1.5 sm:gap-2 text-gold hover:text-white transition-colors text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest font-bold group whitespace-nowrap py-1.5 px-2.5 sm:px-4 bg-black-pure border border-gold/50 hover:border-gold shadow-[0_0_12px_rgba(212,175,55,0.15)]"
            >
              <span>Full Gallery</span>
              <ArrowRight className="group-hover:translate-x-1.5 transition-transform" size={14} />
            </a>
          </div>
        </div>

        {/* Responsive Projects Grid: 2 columns on mobile (4 full rows = 8 items), 3 on tablet (3 full rows = 9 items), 6 on laptop (2 full rows = 12 items) with generous in-between space */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-3.5 sm:gap-x-5 lg:gap-x-6 xl:gap-x-8 gap-y-3.5 sm:gap-y-4 lg:gap-y-5">
          {filteredProjects.slice(0, 12).map((project, index) => {
            const isShowingBefore = activeBeforeAfterId === project.id && project.beforeImage;
            return (
              <motion.div
                key={project.id ? `${project.id}-${index}` : `proj-${index}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className={`h-full flex flex-col ${index === 8 ? 'hidden sm:flex' : index >= 9 ? 'hidden lg:flex' : ''}`}
              >
                <ProjectCard 
                  project={project} 
                  isShowingBefore={isShowingBefore} 
                  onToggleBeforeAfter={() => setActiveBeforeAfterId(isShowingBefore ? null : project.id)}
                  onSpecsClick={() => handleOpenSpecs(project)}
                  isLatest={index === 0 && uploadedProjects.length > 0}
                />
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA to Full Portfolio Page */}
        <div className="mt-5 sm:mt-8 text-center">
          <a
            href="#creations"
            className="h-11 sm:h-12 inline-flex items-center justify-center gap-2.5 bg-black-pure border border-gold hover:bg-gold hover:text-black-pure text-gold px-6 sm:px-8 text-xs sm:text-sm font-bold uppercase tracking-wider sm:tracking-[0.15em] transition-all duration-300 shadow-[0_0_20px_rgba(212,175,55,0.2)] rounded-sm cursor-pointer whitespace-nowrap active:scale-95"
          >
            <span>Explore Full Portfolio Page</span>
            <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </section>
  );
}
