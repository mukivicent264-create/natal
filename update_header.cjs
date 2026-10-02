const fs = require('fs');

let content = fs.readFileSync('src/components/FeaturedCreationsPage.tsx', 'utf8');

// Replace top navigation ribbon bar and eyebrow
const oldRibbonAndEyebrow = `{/* Top Navigation Ribbon Bar */}
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
            </motion.div>`;

const newRibbonAndEyebrow = `{/* Top Navigation with Arrow Only */}
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <button
              onClick={() => onNavigateHome()}
              className="inline-flex items-center justify-center text-gold hover:text-white bg-gold/10 hover:bg-gold/20 border border-gold/40 p-2.5 sm:p-3 transition-all group cursor-pointer rounded-none shadow-[0_0_15px_rgba(212,175,55,0.15)]"
              aria-label="Go back to home"
              title="Go back"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Hero Content */}
          <div className="text-left sm:text-center">`;

if (content.includes(oldRibbonAndEyebrow)) {
  content = content.replace(oldRibbonAndEyebrow, newRibbonAndEyebrow);
  fs.writeFileSync('src/components/FeaturedCreationsPage.tsx', content);
  console.log('Successfully updated header in FeaturedCreationsPage.tsx');
} else {
  console.error('Could not find old ribbon and eyebrow content');
}
