const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Remove imports
code = code.replace("import AllServicesPage from './components/AllServicesPage';\n", "");
code = code.replace("import ServiceDetailPage from './components/ServiceDetailPage';\n", "");
code = code.replace("import { detailedServices } from './servicesData';\n", "");

// Remove state
code = code.replace("const [isAllServicesPage, setIsAllServicesPage] = useState(false);\n  ", "");
code = code.replace("const [currentServiceSlug, setCurrentServiceSlug] = useState<string | null>(null);\n  ", "");

// Remove hash routing effects for services
code = code.replace(/if \(hash\.startsWith\('#service-'\)\) \{[\s\S]*?\} else /g, "");

code = code.replace("setIsAllServicesPage(true);", "setIsAuthPage(false);");

code = code.replace(/setIsAllServicesPage\(false\);\n\s+/g, "");
code = code.replace(/setCurrentServiceSlug\(null\);\n\s+/g, "");

code = code.replace(/const handleNavigateToService = \([\s\S]*?\};\n\n/g, "");
code = code.replace(/const activeService = [\s\S]*?;\n\n/g, "");

code = code.replace(/!activeService && !isAuthPage && !isAllServicesPage && !isQuotePage && !isCreationsPage/g, "!isAuthPage && !isQuotePage && !isCreationsPage");

code = code.replace(/onNavigateToService=\{handleNavigateToService\}/g, "");

code = code.replace(/\) : isAllServicesPage \? \([\s\S]*?\) : activeService \? \([\s\S]*?\) : \(/g, ") : (");

fs.writeFileSync('src/App.tsx', code);
