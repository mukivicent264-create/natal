const fs = require('fs');
let code = fs.readFileSync('src/components/AllServicesPage.tsx', 'utf8');

const replacement = `
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState("Default");

  const filteredServices = cardHighlights.filter(item => 
    activeCategory === "All" ? true : item.category === activeCategory
  ).sort((a, b) => {
    if (sortBy === "A-Z") return a.title.localeCompare(b.title);
    if (sortBy === "Z-A") return b.title.localeCompare(a.title);
    return 0; // Default
  });
`;

code = code.replace(/const \[activeCategory, setActiveCategory\] = useState\("All"\);\s*const filteredServices = cardHighlights.filter[\s\S]*?\);\s*/, replacement);

const filterTabsReplacement = `{/* Filter and Sort Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={\`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-[10px] sm:text-xs uppercase tracking-widest font-bold transition-all duration-300 cursor-pointer \${
                  activeCategory === category 
                    ? 'bg-gold text-black-pure shadow-[0_5px_15px_rgba(212,175,55,0.4)]' 
                    : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/10'
                }\`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Sort By:</span>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-black-pure border border-white/20 text-white text-xs px-4 py-2 rounded-lg focus:outline-none focus:border-gold cursor-pointer"
            >
              <option value="Default">Default</option>
              <option value="A-Z">Alphabetical (A-Z)</option>
              <option value="Z-A">Alphabetical (Z-A)</option>
            </select>
          </div>
        </div>`;

code = code.replace(/{\/\* Filter Tabs \*\/}[\s\S]*?<\/div>/, filterTabsReplacement);

fs.writeFileSync('src/components/AllServicesPage.tsx', code);
console.log('Added sort functionality');
