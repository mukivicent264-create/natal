const fs = require('fs');

const code = `import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Search, Sparkles, Filter, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { cardHighlights, projectsData } from '../data';

interface FeaturedCreationsPageProps {
  onNavigateHome: (sectionId?: string) => void;
}

// Combined creations list derived from cardHighlights and projectsData for comprehensive showcase
const allCreationsList = [
  ...cardHighlights.map((item, idx) => ({
    id: \`creation-c\${idx + 1}\`,
    title: item.title,
    category: item.category,
    image: item.image,
    desc: item.desc,
    type: 'Interior Specialty',
    tags: [item.category, 'Custom Finish', 'Precision Execution']
  })),
  ...projectsData.map((project) => ({
    id: \`project-\${project.id}\`,
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
  const [selectedCreation, setSelectedCreation] = useState<typeof allCreationsList[0] | null>(null);

  const filteredCreations = allCreationsList.filter(item => {
    const matchesCategory = activeCategory === "All" ? true : (item.category === activeCategory || item.tags.includes(activeCategory));
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-black-rich text-white pb-24">
      {/* Full-Width Header in Luxury Black & Gold Aesthetic */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative text-center pt-24 pb-20 md:pt-32 md:pb-24 px-6 sm:px-12 border-b border-gold/30 bg-black-pure overflow-hidden w-full mb-12"
      >
        {/* Back to Home Button */}
        <button
          onClick={() => onNavigateHome()}
          className="absolute top-6 left-6 md:top-10 md:left-10 z-30 flex items-center gap-2 text-gold hover:text-white transition-colors group cursor-pointer"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="uppercase tracking-widest text-xs font-bold">Back to Home</span>
        </button>

        {/* Ambient Gold Radial Backgrounds */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold/15 via-black-pure/80 to-transparent blur-3xl pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none"></div>

        <div className="relative z-10 max-w-4xl mx-auto mt-4 md:mt-0">
          <div className="inline-flex items-center gap-2 text-gold uppercase tracking-[0.3em] text-xs font-bold mb-4 bg-gold/10 px-4 py-1.5 border border-gold/30">
            <Sparkles size={14} />
            <span>Exquisite Craftsmanship Gallery</span>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-bold text-white mb-6">
            Featured Interior <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold via-yellow-300 to-amber-500 italic">Creations</span>
          </h1>
          <p className="text-gray-300 max-w-2xl mx-auto font-light leading-relaxed text-sm md:text-base">
            Explore our comprehensive gallery of architectural ceiling installations, custom woodwork, luxury interior finishes, and full residential & commercial renovations.
          </p>
        </div>
      </motion.div>

      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        {/* Filter & Search Bar */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-12">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 sm:gap-3 flex-1">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={\`px-4 sm:px-5 py-2.5 text-[10px] sm:text-xs uppercase tracking-widest font-bold transition-all duration-300 cursor-pointer rounded-none \${
                  activeCategory === category 
                    ? 'bg-gold text-black-pure shadow-[0_4px_20px_rgba(212,175,55,0.4)]' 
                    : 'bg-black-pure text-gray-300 hover:bg-white/10 hover:text-white border border-gold/20'
                }\`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-[380px]">
            <input
              type="text"
              placeholder="Search creations or materials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black-pure border border-gold/30 text-white text-xs px-10 py-3.5 focus:outline-none focus:border-gold transition-colors placeholder:text-gray-500 rounded-none"
            />
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gold/70" />
          </div>
        </div>

        {/* Creations Grid */}
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
          <AnimatePresence mode="popLayout">
            {filteredCreations.map((item) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                key={item.id}
                className="group relative bg-black-pure border border-gold/30 hover:border-gold transition-all duration-500 flex flex-col justify-between overflow-hidden shadow-2xl rounded-none"
              >
                {/* Gold Top Border */}
                <div className="h-1 bg-gradient-to-r from-gold via-yellow-200 to-amber-600 shrink-0"></div>

                <div className="relative aspect-[16/11] overflow-hidden shrink-0">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 filter brightness-90 group-hover:brightness-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black-pure via-black-pure/30 to-transparent"></div>
                  
                  <span className="absolute top-3 right-3 bg-black-pure/90 border border-gold/40 text-gold text-[9px] uppercase tracking-widest font-mono font-bold px-2.5 py-1">
                    {item.type}
                  </span>
                </div>

                <div className="p-5 flex-grow flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-gold uppercase tracking-widest block font-mono mb-2">
                      {item.category}
                    </span>
                    <h3 className="font-heading text-lg text-white font-bold mb-3 group-hover:text-gold transition-colors flex items-start justify-between gap-2">
                      <span>{item.title}</span>
                      <ArrowUpRight size={16} className="text-gold opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                    </h3>
                    <p className="text-gray-300 text-xs font-light leading-relaxed mb-4 line-clamp-3">
                      {item.desc}
                    </p>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-5 pt-3 border-t border-white/10">
                    {item.tags.map((tag, tIdx) => (
                      <span key={tIdx} className="text-[9px] px-2 py-0.5 border border-gold/20 text-gray-300 uppercase tracking-wider font-mono bg-white/5">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => setSelectedCreation(item)}
                      className="flex-1 border border-gold/40 text-gold hover:bg-gold hover:text-black-pure py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 text-center cursor-pointer rounded-none"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => onNavigateHome('quote')}
                      className="flex-1 bg-gold hover:bg-gold-light text-black-pure py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 text-center cursor-pointer rounded-none shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                    >
                      Request Quote
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {filteredCreations.length === 0 && (
          <div className="text-center py-24 text-gray-400 border border-gold/20 bg-black-pure">
            <Filter size={32} className="mx-auto text-gold/50 mb-4" />
            <p className="text-lg font-heading text-white mb-2">No creations found</p>
            <p className="text-xs text-gray-400">Try adjusting your category selection or search keyword.</p>
          </div>
        )}
      </div>

      {/* Creation Details Lightbox Modal */}
      <AnimatePresence>
        {selectedCreation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black-pure/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-black-pure border border-gold max-w-2xl w-full p-6 sm:p-8 relative shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <button
                onClick={() => setSelectedCreation(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gold text-sm uppercase font-mono tracking-widest border border-white/20 px-3 py-1 cursor-pointer"
              >
                Close ✕
              </button>

              <div className="aspect-video w-full overflow-hidden border border-gold/30 mb-6">
                <img src={selectedCreation.image} alt={selectedCreation.title} className="w-full h-full object-cover" />
              </div>

              <span className="text-gold text-xs font-mono uppercase tracking-widest block mb-2">{selectedCreation.category}</span>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-4">{selectedCreation.title}</h2>
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
`;

fs.writeFileSync('src/components/FeaturedCreationsPage.tsx', code);
console.log('Successfully written src/components/FeaturedCreationsPage.tsx');
