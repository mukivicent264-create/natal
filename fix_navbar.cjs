const fs = require('fs');
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

code = code.replace("  onNavigateToService?: (slug: string) => void;\n", "");
code = code.replace("export default function Navbar({ onNavigateHome, onNavigateToService, onNavigateToAuth }: NavbarProps) {", "export default function Navbar({ onNavigateHome, onNavigateToAuth }: NavbarProps) {");

code = code.replace(/  const handleSublinkClick = \([\s\S]*?\};\n\n/, "");
fs.writeFileSync('src/components/Navbar.tsx', code);
