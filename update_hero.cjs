const fs = require('fs');

let content = fs.readFileSync('src/components/FeaturedCreationsPage.tsx', 'utf8');

const oldHeaderRegex = /\{\/\* Full-Width Header in Luxury Black & Gold Aesthetic \*\}[\s\S]*?<\/motion\.div>/;

const newHeader = `{/* Full-Width Header in Luxury Black & Gold Aesthetic */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative pt-6 pb-12 sm:pt-20 sm:pb-20 px-4 sm:px-12 border-b border-gold/30 bg-black-pure overflow-hidden w-full mb-8 sm:mb-12"
      >
        {/* Ambient Gold Radial Backgrounds */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold/20 via-black-pure/90 to-transparent blur-3xl pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none"></div>

        <div className="relative z-10 max-w-5xl mx-auto">
          {/* Top Navigation Ribbon Bar */}
          <div className="flex items-center justify-between mb-6 sm:mb-12">
            <button
              onClick={() => onNavigateHome()}
              className="inline-flex items-center gap-2 text-gold hover:text-white bg-gold/10 hover:bg-gold/20 border border-gold/40 px-3.5 sm:px-4 py-2 transition-all group cursor-pointer text-xs font-bold uppercase tracking-wider rounded-none"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span>Back to Home</span>
            </button>

            <span className="inline-flex items-center gap-1.5 text-[9px] sm:text-[10px] text-gold uppercase tracking-widest font-mono border border-gold/30 px-2.5 sm:px-3 py-1 bg-black-pure/90 shadow-[0_0_10px_rgba(212,175,55,0.15)]">
              <Sparkles size={12} className="text-gold animate-pulse" />
              <span>Exquisite Showcase</span>
            </span>
          </div>

          {/* Hero Content with High Typographic Contrast */}
          <div className="text-left sm:text-center">
            {/* Eyebrow Label */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 text-gold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[10px] sm:text-xs font-bold mb-3 sm:mb-5 bg-gold/10 px-3 sm:px-4 py-1.5 border border-gold/30"
            >
              <Sparkles size={14} className="text-gold" />
              <span>Architectural Gallery</span>
            </motion.div>

            {/* Headline with Mobile-First Dynamic Line Layout */}
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-heading font-bold text-3xl sm:text-5xl md:text-6xl lg:text-7xl text-white mb-4 sm:mb-6 leading-[1.15] sm:leading-tight tracking-tight"
            >
              Featured Interior{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold via-yellow-200 to-amber-500 italic block xs:inline mt-1 sm:mt-0 drop-shadow-[0_2px_15px_rgba(212,175,55,0.3)]">
                Creations
              </span>
            </motion.h1>

            {/* Description with Gold Accent Rule on Mobile */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative max-w-2xl mx-auto mb-6 sm:mb-8 text-left sm:text-center pl-3.5 sm:pl-0 border-l-2 border-gold/70 sm:border-l-0"
            >
              <p className="text-gray-300 font-light leading-relaxed text-xs sm:text-base">
                Explore our comprehensive gallery of architectural ceiling installations, custom woodwork, luxury interior finishes, and full residential & commercial renovations.
              </p>
            </motion.div>

            {/* Quick Feature Metric Cards */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 max-w-3xl mx-auto pt-4 sm:pt-6 border-t border-gold/20"
            >
              <div className="bg-black-rich/90 border border-gold/30 p-2.5 sm:p-3.5 text-center hover:border-gold transition-colors">
                <span className="block text-gold font-heading text-base sm:text-xl font-bold">Gypsum</span>
                <span className="text-[8px] sm:text-[10px] text-gray-300 uppercase tracking-wider font-mono">Ceiling Lighting</span>
              </div>
              <div className="bg-black-rich/90 border border-gold/30 p-2.5 sm:p-3.5 text-center hover:border-gold transition-colors">
                <span className="block text-gold font-heading text-base sm:text-xl font-bold">Woodwork</span>
                <span className="text-[8px] sm:text-[10px] text-gray-300 uppercase tracking-wider font-mono">Bespoke Joinery</span>
              </div>
              <div className="bg-black-rich/90 border border-gold/30 p-2.5 sm:p-3.5 text-center hover:border-gold transition-colors">
                <span className="block text-gold font-heading text-base sm:text-xl font-bold">Finishes</span>
                <span className="text-[8px] sm:text-[10px] text-gray-300 uppercase tracking-wider font-mono">Luxury Paint & Paper</span>
              </div>
              <div className="bg-black-rich/90 border border-gold/30 p-2.5 sm:p-3.5 text-center hover:border-gold transition-colors">
                <span className="block text-gold font-heading text-base sm:text-xl font-bold">Turnkey</span>
                <span className="text-[8px] sm:text-[10px] text-gray-300 uppercase tracking-wider font-mono">Renovations</span>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>`;

if (oldHeaderRegex.test(content)) {
  content = content.replace(oldHeaderRegex, newHeader);
  fs.writeFileSync('src/components/FeaturedCreationsPage.tsx', content);
  console.log('Successfully replaced hero section in FeaturedCreationsPage.tsx');
} else {
  console.error('Regex mismatch for hero section!');
}
