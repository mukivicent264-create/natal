const fs = require('fs');
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

code = code.replace(/dropdown: \[[\s\S]*?\]/,
`dropdown: [
      { name: 'Interior Finishing', slug: 'interior-finishing' },
      { name: 'Woodwork', slug: 'custom-woodwork' },
      { name: 'Construction & Exterior', slug: 'construction-exterior' },
      { name: 'Electrical Services', slug: 'electrical-services' }
    ]`);

fs.writeFileSync('src/components/Navbar.tsx', code);
console.log('Fixed Navbar dropdown');
