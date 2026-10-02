const fs = require('fs');

const newCode = `import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Search } from 'lucide-react';
import { cardHighlights } from '../data';
import React, { useState } from 'react';

interface AllServicesPageProps {
  onNavigateHome: (sectionId?: string) => void;
}

const categories = ["All", "Interior Finishing", "Woodwork", "Construction & Exterior", "Electrical"];

export default function AllServicesPage({ onNavigateHome }: AllServicesPageProps) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState("Default");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredServices = cardHighlights.filter(item => {
    const matchesCategory = activeCategory === "All" ? true : item.category === activeCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  }).sort((a, b) => {
    if (sortBy === "A-Z") return a.title.localeCompare(b.title);
    if (sortBy === "Z-A") return b.title.localeCompare(a.title);
    return 0; // Default
  });

  return (
    <div className="min-h-screen bg-black-rich text-white pt-[160px] md:pt-[220px] pb-20">
      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <button
          onClick={() => onNavigateHome()}
          className="flex items-center gap-2 text-gold hover:text-white transition-colors mb-12 group cursor-pointer"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="uppercase tracking-widest text-xs font-bold">Back to Home</span>
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <span className="text-gold uppercase tracking-[0.3em] text-sm font-bold mb-4 block">
            Our Expertise
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading text-white mb-6">
            Complete Range of <span className="text-gold italic">Services</span>
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
            From structural renovations to exquisite interior finishing, we provide a comprehensive suite of luxury construction and design services.
          </p>
        </motion.div>

        {/* Filter, Search and Sort Bar */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-12">
          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4 flex-1">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={\`px-4 sm:px-6 py-2 sm:py-2.5 rounded-none text-[10px] sm:text-xs uppercase tracking-widest font-bold transition-all duration-300 cursor-pointer \${
                  activeCategory === category 
                    ? 'bg-gold text-black-pure shadow-[0_5px_15px_rgba(212,175,55,0.4)]' 
                    : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/10'
                }\`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
            {/* Search Bar */}
            <div className="relative w-full sm:w-64 lg:w-72">
              <input
                type="text"
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black-pure border border-white/20 text-white text-xs px-10 py-3 rounded-none focus:outline-none focus:border-gold transition-colors placeholder:text-gray-500"
              />
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold whitespace-nowrap">Sort By:</span>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-black-pure border border-white/20 text-white text-xs px-4 py-3 rounded-none focus:outline-none focus:border-gold cursor-pointer"
              >
                <option value="Default">Default</option>
                <option value="A-Z">Alphabetical (A-Z)</option>
                <option value="Z-A">Alphabetical (Z-A)</option>
              </select>
            </div>
          </div>
        </div>

        <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
          <AnimatePresence mode="popLayout">
            {filteredServices.map((item, index) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                key={item.title}
                className="group relative bg-black-pure border border-gold/20 hover:border-gold/60 transition-all duration-500 overflow-hidden flex flex-col rounded-none"
              >
                <div className="relative aspect-[4/3] overflow-hidden shrink-0">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black-pure via-black-pure/40 to-transparent"></div>
                </div>
                <div className="p-4 sm:p-5 flex-grow flex flex-col justify-between">
                  <div>
                    <span className="text-[8px] sm:text-[9px] text-gold uppercase tracking-widest block font-mono mb-1.5 truncate">
                      {item.category}
                    </span>
                    <h3 className="font-heading text-sm sm:text-base text-white font-bold mb-2 group-hover:text-gold transition-colors line-clamp-2 leading-tight">
                      {item.title}
                    </h3>
                    <p className="text-gray-400 text-[10px] sm:text-xs font-light leading-snug mb-4 line-clamp-3">
                      {item.desc}
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => onNavigateHome('quote')}
                    className="inline-block border border-gold/50 text-gold hover:bg-gold hover:text-black-pure px-3 py-2 sm:py-2.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all duration-300 text-center cursor-pointer w-full mt-auto rounded-none"
                  >
                    Request Quote
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {filteredServices.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            No services found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/components/AllServicesPage.tsx', newCode);
console.log('Updated AllServicesPage.tsx with search and rounded-none styling');
