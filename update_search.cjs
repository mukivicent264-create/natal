const fs = require('fs');
let content = fs.readFileSync('/app/applet/src/components/FeaturedCreationsPage.tsx', 'utf8');

const target = `{/* Search Box (Row 2) */}
          <div className="relative w-full max-w-[400px]">
            <input
              type="text"
              placeholder="Search creations or materials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black-pure border border-gold/30 text-white text-xs px-10 py-3.5 focus:outline-none focus:border-gold transition-colors placeholder:text-gray-500 rounded-none shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
            />
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gold/70" />
          </div>`;

const replacement = `{/* Search Box (Row 2) */}
          <div className="relative w-full max-w-xl sm:max-w-2xl mt-3 sm:mt-5">
            <input
              type="text"
              placeholder="Search creations or materials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black-pure border border-gold/40 text-white text-sm px-12 py-4 focus:outline-none focus:border-gold transition-colors placeholder:text-gray-500 rounded-none shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
            />
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gold/70" />
          </div>`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('/app/applet/src/components/FeaturedCreationsPage.tsx', content);
  console.log("Success");
} else {
  console.log("Target not found!");
}
