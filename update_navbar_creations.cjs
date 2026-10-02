const fs = require('fs');

let content = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

content = content.replace(
  `{ name: 'Showcase', href: '#showcase', sectionId: 'showcase' },`,
  `{ name: 'Creations', href: '#creations', sectionId: 'creations' },\n  { name: 'Showcase', href: '#showcase', sectionId: 'showcase' },`
);

// Also handle sectionId in handleLinkClick if it's 'creations'
content = content.replace(
  `const handleLinkClick = (href: string, sectionId?: string) => {
    if (onNavigateHome) {
      onNavigateHome(sectionId || 'home');
    }
    setActiveDropdown(null);
    setMobileMenuOpen(false);
  };`,
  `const handleLinkClick = (href: string, sectionId?: string) => {
    if (href === '#creations' || sectionId === 'creations') {
      window.location.hash = '#creations';
    } else if (onNavigateHome) {
      onNavigateHome(sectionId || 'home');
    }
    setActiveDropdown(null);
    setMobileMenuOpen(false);
  };`
);

fs.writeFileSync('src/components/Navbar.tsx', content);
console.log('Added Creations link to Navbar.tsx');
