import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Search, 
  Sparkles, 
  CheckCircle2, 
  ArrowUpRight, 
  Paintbrush, 
  Hammer, 
  HardHat, 
  Zap, 
  Droplet, 
  TreePine, 
  Layers, 
  X, 
  Phone, 
  MessageSquare,
  ShieldCheck
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { servicesData, cardHighlights, companyDetails } from '../data';
import { Service } from '../types';

interface ServicesPageProps {
  onNavigateHome: (sectionId?: string) => void;
}

const iconMap: Record<string, any> = {
  Paintbrush,
  Hammer,
  HardHat,
  Zap,
  Droplet,
  TreePine,
  Sparkles,
  Layers
};

const defaultIcons = [Paintbrush, Hammer, HardHat, Zap, Droplet, TreePine, Sparkles, Layers];

// Comprehensive catalog of all specialized services Natal offers
const detailedSpecialties = [
  {
    id: 'spec-gypsum',
    title: 'Gypsum Ceilings & Bulkheads',
    category: 'Interior Finishing',
    icon: 'Layers',
    image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=1200',
    description: 'Multi-tiered acoustic gypsum ceilings featuring hidden LED cove glow channels, modern floating islands, and geometric architectural details.',
    capabilities: ['Multi-tier drop ceilings', 'Concealed LED strip channels', 'Curved & geometric bulkheads', 'Acoustic moisture-resistant boards', 'Perimeter shadowline trims'],
    badge: 'Popular'
  },
  {
    id: 'spec-pvc',
    title: 'PVC & Decorative Ceilings',
    category: 'Interior Finishing',
    icon: 'Sparkles',
    image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=1200',
    description: 'Waterproof, termite-resistant PVC panels and luxury composite ceiling solutions ideal for high-humidity areas, verandas, and commercial corridors.',
    capabilities: ['100% Waterproof panels', 'Gloss & matte woodgrain textures', 'Anti-fungal & termite-proof', 'Fast seamless installation', 'Minimal maintenance'],
    badge: 'Durable'
  },
  {
    id: 'spec-aluminum',
    title: 'Aluminum Architectural Ceilings',
    category: 'Interior Finishing',
    icon: 'Layers',
    image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&q=80&w=1200',
    description: 'Contemporary metal baffle, clip-in, and linear aluminum ceiling systems designed for luxury residences, hotel lobbies, and executive corporate offices.',
    capabilities: ['Linear baffle systems', 'Perforated acoustic aluminum tiles', 'Powder-coated luxury finishes', 'Integrated linear lighting tracks', 'Commercial grade fire rating'],
    badge: 'Corporate'
  },
  {
    id: 'spec-painting',
    title: 'High-End Decorative Painting',
    category: 'Interior Finishing',
    icon: 'Paintbrush',
    image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&q=80&w=1200',
    description: 'Master-level skim coating, Venetian plastering, stenciling, textured stucco, and ultra-smooth matte or satin painting for interior and exterior walls.',
    capabilities: ['Skim-coating & surface levelling', 'Venetian plaster & marble effects', 'Textured & metallic stucco', 'Weather-proof exterior paints', 'Low-VOC non-toxic pigments'],
    badge: 'Finishing'
  },
  {
    id: 'spec-wallpapers',
    title: 'Luxury Wallpapers & Wallcoverings',
    category: 'Interior Finishing',
    icon: 'Sparkles',
    image: 'https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&fit=crop&q=80&w=1200',
    description: 'Flawless supply and installation of textured 3D wall murals, imported embossed European wallpapers, silk vinyls, and acoustic fabric wall treatments.',
    capabilities: ['Heavyweight vinyl wallcoverings', 'Custom 3D wall murals', 'Acoustic textile backings', 'Moisture & scrub resistant', 'Invisible seam joining'],
    badge: 'Luxury'
  },
  {
    id: 'spec-soundproofing',
    title: 'Acoustic Treatments & Soundproofing',
    category: 'Interior Finishing',
    icon: 'ShieldCheck',
    image: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&q=80&w=1200',
    description: 'Specialized acoustic insulation, sound-dampening wall panels, rockwool drywall barriers, and studio-grade noise isolation for boardrooms, studios, and bedrooms.',
    capabilities: ['High-density acoustic rockwool', 'Perforated sound absorber panels', 'Decoupled drywall partitions', 'Acoustic door seal kits', 'Sound transmission testing'],
    badge: 'Acoustic'
  },
  {
    id: 'spec-kitchens',
    title: 'Custom Modular Kitchens',
    category: 'Woodwork',
    icon: 'Hammer',
    image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=1200',
    description: 'Bespoke European-style modular kitchens with soft-close Blum/Hettich hardware, quartz island countertops, pantry pullouts, and integrated LED accent strips.',
    capabilities: ['Marine-ply moisture resistance', 'Anti-fingerprint matte acrylics', 'Quartz & granite countertops', 'Hidden pantry pull-outs', 'Integrated appliance cabinetry'],
    badge: 'Signature'
  },
  {
    id: 'spec-wardrobes',
    title: 'Bespoke Wardrobes & Walk-In Closets',
    category: 'Woodwork',
    icon: 'Hammer',
    image: 'https://images.unsplash.com/photo-1558997519-83ea9252edf8?auto=format&fit=crop&q=80&w=1200',
    description: 'Custom floor-to-ceiling walk-in wardrobes, sliding glass-door closets with motion-sensor lighting, velvet jewelry drawers, and tailored shoe displays.',
    capabilities: ['Floor-to-ceiling sliding systems', 'Smoked tempered glass doors', 'Automatic sensor LED hangers', 'Velvet organizer inserts', 'Solid hardwood carcases'],
    badge: 'Bespoke'
  },
  {
    id: 'spec-tv-units',
    title: 'Architectural TV Walls & Media Consoles',
    category: 'Woodwork',
    icon: 'Layers',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1200',
    description: 'Feature TV wall backdrops combining fluted timber panels, backlit marble/porcelain slabs, concealed wire raceways, and cantilevered floating media consoles.',
    capabilities: ['Fluted acoustic wood slat panels', 'Backlit porcelain slab cladding', 'Concealed wiring management', 'Cantilevered floating consoles', 'Smart ambient lighting control'],
    badge: 'Featured'
  },
  {
    id: 'spec-furniture',
    title: 'Artisan Custom Furniture',
    category: 'Woodwork',
    icon: 'Hammer',
    image: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&q=80&w=1200',
    description: 'Handcrafted solid wood dining suites, executive boardroom tables, custom upholstered headboards, and bespoke architectural woodwork engineered to order.',
    capabilities: ['Hardwood joinery (Mvule/Mahogany/Teak)', 'Commercial durable upholstery', 'Custom steel & brass accents', 'Bespoke reception desks', 'Ergonomic executive suites'],
    badge: 'Crafted'
  },
  {
    id: 'spec-tiling',
    title: 'Precision Tiling & Stonework',
    category: 'Construction & Exterior',
    icon: 'HardHat',
    image: 'https://images.unsplash.com/photo-1523413363574-c30aa1c2a516?auto=format&fit=crop&q=80&w=1200',
    description: 'Laser-guided floor and wall tiling for ultra-large format porcelain slabs (120x240cm), marble cladding, mosaic swimming pools, and anti-slip exterior tiles.',
    capabilities: ['Large-format slab installation', 'Mitred 45-degree seamless corners', 'Waterproof bathroom tanking', 'Decorative stone masonry', 'Epoxy grout application'],
    badge: 'Precision'
  },
  {
    id: 'spec-compound',
    title: 'Compound Designing & Paving',
    category: 'Construction & Exterior',
    icon: 'TreePine',
    image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=1200',
    description: 'Complete outdoor transformations including heavy-duty cobblestone and cabro paving, retaining walls, decorative perimeter gates, and modern garden borders.',
    capabilities: ['Heavy-duty interlocking pavers', 'Natural stone driveways', 'Perimeter boundary walls', 'Stormwater drainage channels', 'Architectural gate entries'],
    badge: 'Exterior'
  },
  {
    id: 'spec-partitioning',
    title: 'Office Partitions & Glass Glazing',
    category: 'Construction & Exterior',
    icon: 'HardHat',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200',
    description: 'Frameless glass partitioning, aluminum structural frameworks, frosted privacy films, and modular office divider systems designed for productive workspaces.',
    capabilities: ['10mm/12mm tempered safety glass', 'Acoustic double-glazed systems', 'Branded frosted privacy graphics', 'Integrated pivot glass doors', 'Fast demountable frames'],
    badge: 'Commercial'
  },
  {
    id: 'spec-electrical',
    title: 'Electrical Wiring & Power Infrastructure',
    category: 'Electrical',
    icon: 'Zap',
    image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&q=80&w=1200',
    description: 'Certified electrical installations including three-phase power distribution, consumer unit rewiring, surge protection, generator changeovers, and inverter systems.',
    capabilities: ['Complete conduit & wiring setup', 'Three-phase DB board wiring', 'Surge & lightning protection', 'Backup inverter & solar tie-ins', 'Comprehensive circuit safety audit'],
    badge: 'Certified'
  },
  {
    id: 'spec-lighting',
    title: 'Architectural & Smart Lighting Solutions',
    category: 'Electrical',
    icon: 'Zap',
    image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&q=80&w=1200',
    description: 'Dramatic lighting architecture with magnetic track lights, dimmable COB spotlights, facade floodlights, underwater pool illumination, and smart automation.',
    capabilities: ['Recessed magnetic track rails', 'High-CRI COB spotlighting', 'Warm dimming & CCT tuning', 'Outdoor facade wall grazers', 'App & voice smart automation'],
    badge: 'Modern'
  },
  {
    id: 'spec-plumbing',
    title: 'Plumbing & Climate HVAC Solutions',
    category: 'Plumbing & HVAC',
    icon: 'Droplet',
    image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=1200',
    description: 'Modern PPR piping, concealed cisterns, rainfall shower fixtures, solar water heating systems, and multi-split energy-efficient air conditioning installations.',
    capabilities: ['Hot & cold PPR pipe networks', 'Concealed wall-hung toilets', 'Solar thermal water heaters', 'Inverter split & VRF HVAC', 'Pressure boosting water pumps'],
    badge: 'Utility'
  },
  {
    id: 'spec-landscaping',
    title: 'Landscape Architecture & Gardens',
    category: 'Landscaping',
    icon: 'TreePine',
    image: 'https://images.unsplash.com/photo-1558997519-83ea9252edf8?auto=format&fit=crop&q=80&w=1200',
    description: 'Transforming open outdoor plots into manicured lush gardens with automated sprinklers, decorative waterfalls, exotic botanical arrangements, and pathway lighting.',
    capabilities: ['Botanical plant sourcing', 'Automated drip & sprinkler lines', 'Decorative rockeries & fountains', 'Night landscape lighting', 'Regular garden maintenance'],
    badge: 'Green'
  }
];

const categoryList = [
  "All",
  "Interior Finishing",
  "Woodwork",
  "Construction & Exterior",
  "Electrical",
  "Plumbing & HVAC",
  "Landscaping"
];

export default function ServicesPage({ onNavigateHome }: ServicesPageProps) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadedServices, setUploadedServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<any | null>(null);

  // Sync with Firestore services collection
  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const q = query(collection(db, 'services'), orderBy('createdAt', 'desc'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const fbServices: Service[] = snapshot.docs.map(docSnap => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            slug: d.slug || docSnap.id,
            originalId: d.originalId || d.slug || docSnap.id,
            title: d.title || 'Bespoke Service',
            description: d.description || '',
            icon: d.icon || 'Sparkles',
            features: d.features || (d.featuresText ? d.featuresText.split(',').map((s: string) => s.trim()) : ['Bespoke Interior Craft', 'Turnkey Execution'])
          };
        });

        // Also incorporate locally cached services
        const localServices = JSON.parse(localStorage.getItem('natal_local_services') || '[]');
        const combined = [...fbServices];
        localServices.forEach((ls: any) => {
          if (!combined.some(c => c.id === ls.id || (c.title && ls.title && c.title.trim().toLowerCase() === ls.title.trim().toLowerCase()))) {
            combined.unshift({
              id: ls.id,
              slug: ls.slug || ls.id,
              originalId: ls.originalId || ls.slug || ls.id,
              title: ls.title || 'Bespoke Service',
              description: ls.description || '',
              icon: ls.icon || 'Sparkles',
              features: ls.features || (ls.featuresText ? ls.featuresText.split(',').map((s: string) => s.trim()) : ['Bespoke Interior Craft', 'Turnkey Execution'])
            });
          }
        });

        const seenSvc = new Set<string>();
        const uniqueCombined = combined.filter(s => {
          const k = s.id || s.title;
          if (!k || seenSvc.has(k)) return false;
          seenSvc.add(k);
          return true;
        });

        setUploadedServices(uniqueCombined);
      }, (err) => {
        console.warn("ServicesPage firestore listener fallback:", err);
        const localServices = JSON.parse(localStorage.getItem('natal_local_services') || '[]');
        setUploadedServices(localServices);
      });
    } catch (e) {
      console.warn("Error setting up services listener:", e);
      const localServices = JSON.parse(localStorage.getItem('natal_local_services') || '[]');
      setUploadedServices(localServices);
    }
    return () => unsubscribe();
  }, []);

  // Merge uploaded services into specialty list
  const customUploadedItems = uploadedServices.map((u, i) => ({
    id: u.id || `uploaded-${i}`,
    title: u.title,
    category: (u as any).category || 'Interior Finishing',
    icon: u.icon || 'Sparkles',
    image: (u as any).image || 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=1200',
    description: u.description || 'Specialized bespoke service tailored with high-precision engineering and luxury finishes.',
    capabilities: u.features || ['Premium Material Sourcing', 'Precision Finishing', 'Turnkey Handover'],
    badge: 'New'
  }));

  const seenIds = new Set<string>();
  const allServicesCombined = [...customUploadedItems, ...detailedSpecialties].filter(item => {
    const key = (item.title || '').trim().toLowerCase();
    if (seenIds.has(key)) return false;
    seenIds.add(key);
    return true;
  });

  const filteredServices = allServicesCombined.filter(service => {
    const matchesCategory = activeCategory === "All" ? true : service.category.toLowerCase() === activeCategory.toLowerCase();
    const queryLower = searchQuery.toLowerCase().trim();
    if (!queryLower) return matchesCategory;

    const titleMatch = (service.title || '').toLowerCase().includes(queryLower);
    const descMatch = (service.description || '').toLowerCase().includes(queryLower);
    const catMatch = (service.category || '').toLowerCase().includes(queryLower);
    const capMatch = (service.capabilities || []).some(c => c.toLowerCase().includes(queryLower));

    return matchesCategory && (titleMatch || descMatch || catMatch || capMatch);
  });

  const getIcon = (iconName: string, index: number) => {
    if (iconMap[iconName]) return iconMap[iconName];
    return defaultIcons[index % defaultIcons.length];
  };

  return (
    <div className="min-h-screen bg-black-rich text-white pb-24">
      {/* Full-Width Luxury Header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative pt-3 pb-5 sm:pt-5 sm:pb-6 px-4 sm:px-8 border-b border-gold/30 bg-black-pure overflow-hidden w-full mb-5 sm:mb-6"
      >
        {/* Ambient Gold Radial Backgrounds */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold/20 via-black-pure/90 to-transparent blur-3xl pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none"></div>

        <div className="relative z-10 max-w-5xl mx-auto">
          {/* Top Navigation with Arrow Only */}
          <div className="flex items-center justify-between mb-2.5 sm:mb-3">
            <button
              onClick={() => onNavigateHome('services')}
              className="text-gold hover:text-yellow-200 transition-colors group cursor-pointer p-1"
              aria-label="Go back to home"
              title="Go back to services"
            >
              <ArrowLeft size={24} className="group-hover:-translate-x-1.5 transition-transform" />
            </button>
            <div className="flex items-center gap-3">
              <a
                href="#quote"
                className="bg-gold hover:bg-gold-light text-black-pure px-3 py-1 sm:px-3.5 sm:py-1.5 text-[9px] sm:text-xs font-bold uppercase tracking-wider transition-colors shadow-md cursor-pointer"
              >
                Request Quotation
              </a>
            </div>
          </div>

          {/* Hero Content */}
          <div className="text-left sm:text-center">
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-heading font-bold text-xl sm:text-2xl md:text-3xl text-white mb-2 sm:mb-2.5 leading-tight tracking-tight"
            >
              All Services &amp;{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold via-yellow-200 to-amber-500 italic block xs:inline mt-0.5 sm:mt-0 drop-shadow-[0_2px_15px_rgba(212,175,55,0.3)]">
                Capabilities
              </span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative max-w-2xl mx-auto mb-4 sm:mb-5 text-left sm:text-center pl-3.5 sm:pl-0 border-l-2 border-gold/70 sm:border-l-0"
            >
              <p className="text-gray-300 font-light leading-snug sm:leading-relaxed text-xs sm:text-sm">
                Discover the complete suite of architectural, interior finishing, bespoke woodwork, and construction solutions engineered by Natal Interior Design &amp; Construction across Uganda.
              </p>
            </motion.div>

            {/* Quick Metrics Bar */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 max-w-3xl mx-auto pt-3 sm:pt-4 border-t border-gold/20"
            >
              <div className="bg-black-rich/90 border border-gold/30 p-2 sm:p-2.5 text-center hover:border-gold transition-colors">
                <span className="block text-gold font-heading text-sm sm:text-base font-bold">Finishing</span>
                <span className="text-[7.5px] sm:text-[9px] text-gray-300 uppercase tracking-wider font-mono">Gypsum &amp; Paint</span>
              </div>
              <div className="bg-black-rich/90 border border-gold/30 p-2 sm:p-2.5 text-center hover:border-gold transition-colors">
                <span className="block text-gold font-heading text-sm sm:text-base font-bold">Woodwork</span>
                <span className="text-[7.5px] sm:text-[9px] text-gray-300 uppercase tracking-wider font-mono">Kitchens &amp; Closets</span>
              </div>
              <div className="bg-black-rich/90 border border-gold/30 p-2 sm:p-2.5 text-center hover:border-gold transition-colors">
                <span className="block text-gold font-heading text-sm sm:text-base font-bold">Structural</span>
                <span className="text-[7.5px] sm:text-[9px] text-gray-300 uppercase tracking-wider font-mono">Tiling &amp; Partitioning</span>
              </div>
              <div className="bg-black-rich/90 border border-gold/30 p-2 sm:p-2.5 text-center hover:border-gold transition-colors">
                <span className="block text-gold font-heading text-sm sm:text-base font-bold">Engineering</span>
                <span className="text-[7.5px] sm:text-[9px] text-gray-300 uppercase tracking-wider font-mono">Electrical &amp; Lighting</span>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="w-full max-w-[1800px] mx-auto px-2.5 sm:px-6 md:px-8 lg:px-12">
        {/* Category Tabs & Search Bar */}
        <div className="flex flex-col items-center justify-center gap-6 mb-10">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full">
            {categoryList.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-3.5 sm:px-5 py-2 text-[10px] sm:text-xs uppercase tracking-widest font-bold transition-all duration-300 cursor-pointer rounded-none ${
                  activeCategory === category 
                    ? 'bg-gold text-black-pure shadow-[0_4px_20px_rgba(212,175,55,0.4)]' 
                    : 'bg-black-pure text-gray-300 hover:bg-white/10 hover:text-white border border-gold/20'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full max-w-xl sm:max-w-2xl">
            <input
              type="text"
              placeholder="Search services, woodwork, ceilings, wiring, finishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black-pure border border-gold/40 text-white text-xs sm:text-sm px-11 py-3.5 focus:outline-none focus:border-gold transition-colors placeholder:text-gray-500 rounded-none shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
            />
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gold/70" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Services Grid (2 Columns on mobile, 3 on tablet, 6 on laptop/desktop with generous in-between space) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-3.5 sm:gap-x-5 lg:gap-x-6 xl:gap-x-8 gap-y-6 sm:gap-y-8 lg:gap-y-10">
          <AnimatePresence>
            {filteredServices.map((service, idx) => {
              const IconComponent = getIcon(service.icon, idx);
              return (
                <motion.div
                  key={service.id || idx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.02 }}
                  className="group relative bg-black-pure border border-gold/30 hover:border-gold hover:shadow-[0_0_25px_rgba(212,175,55,0.25)] transition-all duration-400 flex flex-col justify-between overflow-hidden shadow-2xl rounded-none"
                >
                  {/* Top Gold Gradient Stripe */}
                  <div className="h-1 bg-gradient-to-r from-gold via-yellow-200 to-amber-600 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"></div>

                  <div className="p-3 sm:p-4 lg:p-4 xl:p-4.5 flex flex-col flex-grow">
                    {/* Header: Icon & Category Badge */}
                    <div className="flex items-center justify-between mb-2.5 sm:mb-3">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-gold/40 bg-gold/10 flex items-center justify-center group-hover:bg-gold transition-all duration-300 shrink-0">
                        <IconComponent size={14} className="text-gold group-hover:text-black-pure transition-colors" />
                      </div>
                      <span className="text-[6.5px] sm:text-[7px] font-mono uppercase tracking-wider font-bold px-1.5 sm:px-2 py-0.5 border border-gold/30 bg-black-rich text-gold truncate max-w-[90px] sm:max-w-none text-right">
                        {service.badge || service.category}
                      </span>
                    </div>

                    {/* Service Title */}
                    <h3 className="font-heading text-[11.5px] sm:text-xs md:text-sm font-bold text-white mb-1 sm:mb-1.5 leading-snug group-hover:text-gold transition-colors line-clamp-2 uppercase tracking-wide">
                      {service.title}
                    </h3>

                    {/* Short Description */}
                    <p className="text-gray-300 text-[9px] sm:text-[10px] md:text-[11px] font-light leading-relaxed line-clamp-2 sm:line-clamp-3 mb-2.5 sm:mb-3">
                      {service.description}
                    </p>

                    {/* Capabilities Bullet Points */}
                    <div className="border-t border-gold/15 pt-2 mb-2.5 sm:mb-3 mt-auto">
                      <p className="text-[7.5px] sm:text-[8px] uppercase tracking-widest text-gold font-bold mb-1.5">Key Capabilities</p>
                      <ul className="space-y-1">
                        {service.capabilities.slice(0, 3).map((cap, cIdx) => (
                          <li key={cIdx} className="flex items-start text-[8px] sm:text-[8.5px] md:text-[9.5px] text-gray-200">
                            <CheckCircle2 size={9.5} className="text-gold mr-1.5 flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-1">{cap}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Card Bottom CTA Actions */}
                  <div className="p-2 sm:p-3 border-t border-white/10 bg-black-rich/60 flex flex-col gap-1 sm:gap-1.5 shrink-0">
                    <button
                      onClick={() => setSelectedService(service)}
                      className="w-full text-center py-1 text-[7.5px] sm:text-[8px] md:text-[9px] uppercase tracking-wider text-gray-300 hover:text-gold transition-colors font-medium cursor-pointer truncate"
                    >
                      View Full Details
                    </button>
                    <a
                      href={`#quote`}
                      className="w-full text-center bg-gold hover:bg-gold-light text-black-pure py-1 sm:py-1.5 px-1.5 sm:px-2 text-[7.5px] sm:text-[8px] md:text-[9px] font-bold uppercase tracking-widest transition-colors shadow-sm block truncate"
                    >
                      Request Quote
                    </a>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filteredServices.length === 0 && (
          <div className="text-center py-16 border border-gold/20 bg-black-pure mt-8 max-w-xl mx-auto p-8">
            <Sparkles size={32} className="text-gold mx-auto mb-3" />
            <h3 className="text-base font-bold text-white uppercase tracking-wider mb-2">No Matching Services Found</h3>
            <p className="text-xs text-gray-400 mb-6">Try refining your search keyword or selecting a different category above.</p>
            <button
              onClick={() => { setActiveCategory('All'); setSearchQuery(''); }}
              className="bg-gold text-black-pure px-5 py-2 text-xs font-bold uppercase tracking-widest"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Bottom Turnkey Solution CTA Banner */}
        <div className="mt-14 sm:mt-18 border border-gold/40 bg-gradient-to-r from-black-pure via-black-rich to-black-pure p-6 sm:p-10 relative overflow-hidden text-center max-w-5xl mx-auto shadow-2xl">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gold/10 rounded-full blur-3xl pointer-events-none"></div>
          <h2 className="font-heading text-lg sm:text-2xl md:text-3xl text-white font-bold mb-3 uppercase tracking-wide">
            Need a Custom Architectural or Interior Package?
          </h2>
          <p className="text-gray-300 text-xs sm:text-sm max-w-2xl mx-auto mb-6 leading-relaxed font-light">
            Whether you require single-room gypsum acoustic ceilings or a complete commercial office fitout, our master artisans and engineers are ready to bring your vision to reality.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <a
              href="#quote"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gold hover:bg-gold-light text-black-pure px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)]"
            >
              <span>Book Site Inspection</span>
              <ArrowUpRight size={14} />
            </a>
            <a
              href={`tel:${companyDetails.phoneNumbers[0].replace(/\s+/g, '')}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gold/50 hover:border-gold text-white hover:text-gold px-6 py-3 text-xs font-bold uppercase tracking-widest transition-colors bg-black-pure"
            >
              <Phone size={14} className="text-gold" />
              <span>Call {companyDetails.phoneNumbers[0]}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Service Detail Modal */}
      <AnimatePresence>
        {selectedService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black-pure/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-black-pure border border-gold p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <button
                onClick={() => setSelectedService(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white p-1"
                aria-label="Close modal"
              >
                <X size={22} />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-gold text-[10px] uppercase font-mono tracking-widest font-bold">
                  {selectedService.category}
                </span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-400 text-[10px] uppercase font-mono">
                  {selectedService.badge || 'Architectural Grade'}
                </span>
              </div>

              <h2 className="font-heading text-xl sm:text-2xl text-white font-bold mb-3 uppercase tracking-wide">
                {selectedService.title}
              </h2>

              <p className="text-gray-300 text-xs sm:text-sm font-light leading-relaxed mb-6">
                {selectedService.description}
              </p>

              <div className="border-t border-gold/20 pt-4 mb-6">
                <h4 className="text-gold text-xs uppercase tracking-widest font-bold mb-3">
                  Scope of Execution &amp; Capabilities
                </h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-200">
                  {selectedService.capabilities.map((cap: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 bg-black-rich/60 p-2 border border-gold/15">
                      <CheckCircle2 size={13} className="text-gold shrink-0 mt-0.5" />
                      <span>{cap}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={() => setSelectedService(null)}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs text-gray-400 hover:text-white font-semibold uppercase tracking-wider"
                >
                  Close
                </button>
                <a
                  href="#quote"
                  onClick={() => setSelectedService(null)}
                  className="w-full sm:w-auto bg-gold hover:bg-gold-light text-black-pure px-6 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors text-center"
                >
                  Request Quote for this Service
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
