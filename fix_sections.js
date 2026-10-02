const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/**/*.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Fix messy py- classes in section tags
  content = content.replace(/<section[^>]+className="([^"]+)"/g, (match, className) => {
    // Replace any combination of py- sizes with a standard one
    let newClassName = className.replace(/\b(py-[0-9]+|sm:py-[0-9]+|md:py-[0-9]+|lg:py-[0-9]+)\s*/g, '');
    newClassName = `py-10 md:py-16 ${newClassName}`.trim();
    return match.replace(className, newClassName);
  });
  
  // Also reduce heading text sizes on mobile (base text-[size])
  content = content.replace(/text-3xl\s+(sm:text-[45]xl|md:text-[45]xl)/g, 'text-2xl $1');
  content = content.replace(/text-2xl\s+(sm:text-[34]xl|md:text-[34]xl)/g, 'text-xl $1');

  fs.writeFileSync(file, content, 'utf8');
});
