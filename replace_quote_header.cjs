const fs = require('fs');

let content = fs.readFileSync('src/components/QuotePage.tsx', 'utf8');

const startMarker = '<div className="min-h-screen bg-black-rich text-white pt-[160px] md:pt-[220px] pb-20">';
const endMarker = '          </p>\n        </motion.div>';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const newHeader = `<div className="min-h-screen bg-black-rich text-white pb-24">
      {/* Full-Width Header in Luxury Black & Gold Aesthetic */}
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
          {/* Top Navigation with Arrow Only */}
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <button
              onClick={() => onNavigateHome()}
              className="text-gold hover:text-yellow-200 transition-colors group cursor-pointer p-1"
              aria-label="Go back to home"
              title="Go back"
            >
              <ArrowLeft size={26} className="group-hover:-translate-x-1.5 transition-transform" />
            </button>
          </div>

          {/* Hero Content */}
          <div className="text-left sm:text-center">
            {/* Eyebrow Label */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 text-gold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[10px] sm:text-xs font-bold mb-3 sm:mb-5 bg-gold/10 px-3 sm:px-4 py-1.5 border border-gold/30"
            >
              <span className="inline-block w-1.5 h-1.5 bg-gold rounded-full mr-2"></span>
              <span>Direct Connect</span>
            </motion.div>

            {/* Headline with Mobile-First Dynamic Line Layout */}
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-heading font-bold text-3xl sm:text-5xl md:text-6xl lg:text-7xl text-white mb-4 sm:mb-6 leading-[1.15] sm:leading-tight tracking-tight"
            >
              Request A Free{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold via-yellow-200 to-amber-500 italic block xs:inline mt-1 sm:mt-0 drop-shadow-[0_2px_15px_rgba(212,175,55,0.3)]">
                Quotation
              </span>
            </motion.h1>

            {/* Description with Gold Accent Rule on Mobile */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative max-w-2xl mx-auto text-left sm:text-center pl-3.5 sm:pl-0 border-l-2 border-gold/70 sm:border-l-0"
            >
              <p className="text-gray-300 font-light leading-relaxed text-xs sm:text-base">
                Ready to bring your vision to life? Provide us with a few details about your project, and our team will get back to you with a comprehensive, no-obligation estimate.
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>
      
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12">`;

  const updatedContent = content.slice(0, startIndex) + newHeader + content.slice(endIndex + endMarker.length);
  fs.writeFileSync('src/components/QuotePage.tsx', updatedContent);
  console.log('Successfully updated Quotation page header!');
} else {
  console.error('Markers not found!');
  console.log('StartIndex:', startIndex, 'EndIndex:', endIndex);
}
