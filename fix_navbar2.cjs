const fs = require('fs');
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

code = code.replace(
  "{ name: 'Creations', href: '#creations', sectionId: 'creations' },\n  { name: 'Showcase', href: '#showcase', sectionId: 'showcase' },",
  "{ name: 'Creations', href: '#showcase', sectionId: 'showcase' },"
);

code = code.replace(
  "    if (href === '#creations' || sectionId === 'creations') {\n      window.location.hash = '#creations';\n    } else if (onNavigateHome) {\n      onNavigateHome(sectionId || 'home');\n    }",
  "    if (onNavigateHome) {\n      onNavigateHome(sectionId || 'home');\n    }"
);

fs.writeFileSync('src/components/Navbar.tsx', code);
