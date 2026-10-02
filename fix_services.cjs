const fs = require('fs');
let code = fs.readFileSync('src/components/Services.tsx', 'utf8');

code = code.replace("interface ServicesProps {\n  onNavigateToService?: (slug: string) => void;\n}\n\nexport default function Services({ onNavigateToService }: ServicesProps) {", "export default function Services() {");

// We need to remove the Explore buttons on both mobile and desktop views.
// Wait, maybe the user wants the explore button completely gone.
// The user said: "remove all the services permanently" which refers to the detailed service pages.
// So the "Explore" button would lead nowhere. We should remove the "Explore" button.
// I'll do this via edit_file to be precise.
