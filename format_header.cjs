const fs = require('fs');

let content = fs.readFileSync('src/components/FeaturedCreationsPage.tsx', 'utf8');

const targetSection = `{/* Filter & Search Bar */}
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
        </div>`;

const replacementSection = `{/* Filter & Search Bar */}
        <div className="flex flex-col items-center justify-center gap-6 mb-12">
          {/* Category Tabs (Row 1) */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 w-full">
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

          {/* Search Box (Row 2) */}
          <div className="relative w-full max-w-[400px]">
            <input
              type="text"
              placeholder="Search creations or materials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black-pure border border-gold/30 text-white text-xs px-10 py-3.5 focus:outline-none focus:border-gold transition-colors placeholder:text-gray-500 rounded-none shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
            />
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gold/70" />
          </div>
        </div>`;

if (content.includes(targetSection)) {
  content = content.replace(targetSection, replacementSection);
  fs.writeFileSync('src/components/FeaturedCreationsPage.tsx', content);
  console.log('Successfully updated filter and search layout in FeaturedCreationsPage.tsx');
} else {
  console.error('Target section mismatch. Outputting current snippet to verify:');
  const lines = content.split('\n');
  const index = lines.findIndex(l => l.includes('{/* Filter & Search Bar */}'));
  console.log(lines.slice(index, index + 30).join('\n'));
}
