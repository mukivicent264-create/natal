const fs = require('fs');
let content = fs.readFileSync('src/components/Projects.tsx', 'utf8');
content = content.replace("import { projectsData, Project } from '../data';", "import { projectsData } from '../data';\nimport { Project } from '../types';");
fs.writeFileSync('src/components/Projects.tsx', content);
console.log('Fixed import');
