const fs = require('fs');
const content = fs.readFileSync('src/data.ts', 'utf8');

const newServicesData = `export const servicesData: Service[] = [
  {
    id: 'interior-finishing',
    title: 'Interior Finishing',
    description: 'Exquisite ceiling and wall detailing transforming bare structural shells into high-end architectural masterpieces.',
    icon: 'Paintbrush',
    features: ['Gypsum Ceilings', 'PVC Ceilings', 'Aluminum Ceilings', 'Painting', 'Wallpapers', 'Sound Proofing'],
  },
  {
    id: 'woodwork',
    title: 'Woodwork',
    description: 'Bespoke cabinetry, custom wardrobes, and artisan furniture engineered with absolute precision.',
    icon: 'Hammer',
    features: ['Kitchen Cabinets', 'Wardrobes (Woddrops)', 'TV Unit Design', 'Furniture'],
  },
  {
    id: 'construction',
    title: 'Construction & Exterior',
    description: 'Heavy masonry, premium tiling, and compound designs engineered to withstand the test of time.',
    icon: 'HardHat',
    features: ['Tiles', 'Stone Work', 'Compound Designing', 'Office Partitioning'],
  },
  {
    id: 'electrical',
    title: 'Electrical',
    description: 'Comprehensive electrical installations and smart architectural lighting.',
    icon: 'Zap',
    features: ['Electricity Installation', 'Lighting Solutions'],
  }
];`;

const startIndex = content.indexOf('export const servicesData: Service[] = [');
const endIndex = content.indexOf('export const projectsData: Project[] = [');

const newContent = content.substring(0, startIndex) + newServicesData + '\n\n' + content.substring(endIndex);

fs.writeFileSync('src/data.ts', newContent);
console.log('Successfully updated servicesData');
