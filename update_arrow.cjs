const fs = require('fs');

let content = fs.readFileSync('src/components/FeaturedCreationsPage.tsx', 'utf8');

const oldButton = `<button
              onClick={() => onNavigateHome()}
              className="inline-flex items-center justify-center text-gold hover:text-white bg-gold/10 hover:bg-gold/20 border border-gold/40 p-2.5 sm:p-3 transition-all group cursor-pointer rounded-none shadow-[0_0_15px_rgba(212,175,55,0.15)]"
              aria-label="Go back to home"
              title="Go back"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            </button>`;

const newButton = `<button
              onClick={() => onNavigateHome()}
              className="text-gold hover:text-yellow-200 transition-colors group cursor-pointer p-1"
              aria-label="Go back to home"
              title="Go back"
            >
              <ArrowLeft size={26} className="group-hover:-translate-x-1.5 transition-transform" />
            </button>`;

if (content.includes(oldButton)) {
  content = content.replace(oldButton, newButton);
  fs.writeFileSync('src/components/FeaturedCreationsPage.tsx', content);
  console.log('Successfully updated arrow button to be standalone!');
} else {
  console.error('Old button string not found');
}
