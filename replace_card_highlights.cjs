const fs = require('fs');
const content = fs.readFileSync('src/data.ts', 'utf8');

const newCardHighlights = `export const cardHighlights = [
  {
    title: "Gypsum Ceilings",
    category: "Interior Finishing",
    image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=1200",
    desc: "Multi-tiered Gypsum ceilings with indirect luxury glow lighting."
  },
  {
    title: "PVC Ceilings",
    category: "Interior Finishing",
    image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=1200",
    desc: "Durable and elegant PVC ceiling installations for various spaces."
  },
  {
    title: "Aluminum Ceilings",
    category: "Interior Finishing",
    image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&q=80&w=1200",
    desc: "Modern architectural aluminum ceilings for commercial and residential use."
  },
  {
    title: "Painting",
    category: "Interior Finishing",
    image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&q=80&w=1200",
    desc: "Expert interior and exterior painting with premium finishes."
  },
  {
    title: "Wallpapers",
    category: "Interior Finishing",
    image: "https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&fit=crop&q=80&w=1200",
    desc: "High-quality textured and patterned wallpapers installed with precision."
  },
  {
    title: "Sound Proofing",
    category: "Interior Finishing",
    image: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&q=80&w=1200",
    desc: "Professional acoustic treatments and sound insulation for optimal privacy."
  },
  {
    title: "Kitchen Cabinets",
    category: "Woodwork",
    image: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=1200",
    desc: "Custom modern modular kitchens with premium fittings and finishes."
  },
  {
    title: "Wardrobes (Woddrops)",
    category: "Woodwork",
    image: "https://images.unsplash.com/photo-1558997519-83ea9252edf8?auto=format&fit=crop&q=80&w=1200",
    desc: "Bespoke walk-in wardrobes and custom storage solutions."
  },
  {
    title: "TV Unit Design",
    category: "Woodwork",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1200",
    desc: "Floating TV walls featuring modern wood panels and cove lighting."
  },
  {
    title: "Furniture",
    category: "Woodwork",
    image: "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&q=80&w=1200",
    desc: "Artisan-crafted custom furniture tailored to your exact specifications."
  },
  {
    title: "Tiles",
    category: "Construction & Exterior",
    image: "https://images.unsplash.com/photo-1523413363574-c30aa1c2a516?auto=format&fit=crop&q=80&w=1200",
    desc: "Premium floor and wall tiling for bathrooms, kitchens, and living spaces."
  },
  {
    title: "Stone Work",
    category: "Construction & Exterior",
    image: "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&q=80&w=1200",
    desc: "Luxury stone cladding and decorative masonry for feature walls."
  },
  {
    title: "Compound Designing",
    category: "Construction & Exterior",
    image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=1200",
    desc: "Transforming outdoor spaces with premium landscaping and paving."
  },
  {
    title: "Office Partitioning",
    category: "Construction & Exterior",
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200",
    desc: "Modern glass and wood office partitions for functional corporate workspaces."
  },
  {
    title: "Electricity Installation",
    category: "Electrical",
    image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&q=80&w=1200",
    desc: "Comprehensive electrical wiring and safe installations for all buildings."
  },
  {
    title: "Lighting Solutions",
    category: "Electrical",
    image: "https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&q=80&w=1200",
    desc: "Smart architectural lighting, ambient LED setups, and custom fixtures."
  }
];`;

const startIndex = content.indexOf('export const cardHighlights = [');
const endIndex = content.indexOf('export const servicesData: Service[] = [');

const newContent = content.substring(0, startIndex) + newCardHighlights + '\n\n' + content.substring(endIndex);

fs.writeFileSync('src/data.ts', newContent);
console.log('Successfully updated cardHighlights');
