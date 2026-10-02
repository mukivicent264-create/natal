const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Add import for FeaturedCreationsPage
if (!content.includes('FeaturedCreationsPage')) {
  content = content.replace(
    "import AllServicesPage from './components/AllServicesPage';",
    "import AllServicesPage from './components/AllServicesPage';\nimport FeaturedCreationsPage from './components/FeaturedCreationsPage';"
  );
}

// Add state for isCreationsPage
if (!content.includes('isCreationsPage')) {
  content = content.replace(
    "const [isQuotePage, setIsQuotePage] = useState(false);",
    "const [isQuotePage, setIsQuotePage] = useState(false);\n  const [isCreationsPage, setIsCreationsPage] = useState(false);"
  );
}

// Update hash listener logic
content = content.replace(
  `      if (hash === 'all-services') {
        setIsAllServicesPage(true);
        setIsAuthPage(false);
        setIsQuotePage(false);
        setCurrentServiceSlug(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }`,
  `      if (hash === 'creations' || hash === 'featured-creations') {
        setIsCreationsPage(true);
        setIsAllServicesPage(false);
        setIsAuthPage(false);
        setIsQuotePage(false);
        setCurrentServiceSlug(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (hash === 'all-services') {
        setIsAllServicesPage(true);
        setIsCreationsPage(false);
        setIsAuthPage(false);
        setIsQuotePage(false);
        setCurrentServiceSlug(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }`
);

// Reset isCreationsPage in handleHashChange reset & handleNavigateHome
content = content.replace(
  `setIsAuthPage(false);
      setIsAllServicesPage(false);
      setIsQuotePage(false);`,
  `setIsAuthPage(false);
      setIsAllServicesPage(false);
      setIsQuotePage(false);
      setIsCreationsPage(false);`
);

content = content.replace(
  `const handleNavigateHome = (sectionId?: string) => {
    setCurrentServiceSlug(null);
    setIsAuthPage(false);
    setIsAllServicesPage(false);
    setIsQuotePage(false);`,
  `const handleNavigateHome = (sectionId?: string) => {
    setCurrentServiceSlug(null);
    setIsAuthPage(false);
    setIsAllServicesPage(false);
    setIsQuotePage(false);
    setIsCreationsPage(false);`
);

content = content.replace(
  `const handleNavigateToService = (slug: string) => {
    if (detailedServices[slug]) {
      setIsAuthPage(false);
      setIsAllServicesPage(false);
      setIsQuotePage(false);`,
  `const handleNavigateToService = (slug: string) => {
    if (detailedServices[slug]) {
      setIsAuthPage(false);
      setIsAllServicesPage(false);
      setIsQuotePage(false);
      setIsCreationsPage(false);`
);

// Update Navbar conditional rendering in App JSX
content = content.replace(
  `{!activeService && !isAuthPage && !isAllServicesPage && !isQuotePage && (`,
  `{!activeService && !isAuthPage && !isAllServicesPage && !isQuotePage && !isCreationsPage && (`
);

// Render FeaturedCreationsPage in main
content = content.replace(
  `{isAuthPage ? (
          <AuthPage onNavigateHome={(sectionId) => handleNavigateHome(sectionId)} />
        ) : isAllServicesPage ? (
          <AllServicesPage onNavigateHome={(sectionId) => handleNavigateHome(sectionId)} />
        )`,
  `{isAuthPage ? (
          <AuthPage onNavigateHome={(sectionId) => handleNavigateHome(sectionId)} />
        ) : isCreationsPage ? (
          <FeaturedCreationsPage onNavigateHome={(sectionId) => handleNavigateHome(sectionId)} />
        ) : isAllServicesPage ? (
          <AllServicesPage onNavigateHome={(sectionId) => handleNavigateHome(sectionId)} />
        )`
);

fs.writeFileSync('src/App.tsx', content);
console.log('Successfully updated App.tsx routing for FeaturedCreationsPage');
