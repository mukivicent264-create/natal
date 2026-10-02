const fs = require('fs');

let code = fs.readFileSync('src/components/AllServicesPage.tsx', 'utf8');

const targetHeader = `<motion.div
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
        </motion.div>`;

const newHeader = `<motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative text-center mb-16 py-20 px-6 sm:px-12 border border-white/10 bg-black-pure overflow-hidden"
        >
          {/* Colorful Background Elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-purple-900/40 to-rose-900/40 z-0"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent blur-2xl"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent blur-2xl"></div>
          
          <div className="relative z-10">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500 uppercase tracking-[0.3em] text-sm font-bold mb-4 block">
              Our Expertise
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-heading font-bold text-white mb-6">
              Complete Range of <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold via-yellow-400 to-orange-500 italic">Services</span>
            </h1>
            <p className="text-gray-300 max-w-2xl mx-auto font-light leading-relaxed text-base md:text-lg">
              From structural renovations to exquisite interior finishing, we provide a comprehensive suite of luxury construction and design services.
            </p>
          </div>
        </motion.div>`;

const targetSearch = `<div className="relative w-full sm:w-64 lg:w-72">`;
const newSearch = `<div className="relative w-full sm:w-80 lg:w-[450px]">`;

code = code.replace(targetHeader, newHeader);
code = code.replace(targetSearch, newSearch);

fs.writeFileSync('src/components/AllServicesPage.tsx', code);
console.log('Successfully updated header and search width');
