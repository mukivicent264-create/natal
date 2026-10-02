const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "        {isAuthPage ? (\n          <AuthPage onNavigateHome={(sectionId) => handleNavigateHome(sectionId)} />\n        ) : isCreationsPage ? (",
  "        {isAuthPage ? (\n          <AuthPage onNavigateHome={(sectionId) => handleNavigateHome(sectionId)} />\n        ) : isQuotePage ? (\n          <QuotePage onNavigateHome={(sectionId) => handleNavigateHome(sectionId)} />\n        ) : isCreationsPage ? ("
);

fs.writeFileSync('src/App.tsx', code);
