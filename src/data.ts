import { ProcessStep, Project, Service, Testimonial } from './types';

export const companyDetails = {
  name: "NATAL INTERIOR DESIGN CONSTRUCTION",
  slogan: "WE DESIGN. WE BUILD. YOU ENJOY.",
  tagline: "DESIGNING SPACES. BUILDING EXCELLENCE.",
  description: "Premium interior design and construction solutions tailored to transform your space into something exceptional.",
  phoneNumbers: ["0755 519 830", "0745 694 499"],
  whatsappNumbers: ["0745 694 499"],
  email: "usherhenry99@gmail.com",
  location: "Mawanda Road Mulago3",
};

export const whyChooseUsData = [
  {
    icon: "Sparkles",
    title: "Modern & Creative Designs",
    description: "Tailored architectural concepts that combine elegance, luxury aesthetics, and spatial functionality."
  },
  {
    icon: "ShieldCheck",
    title: "High Quality Materials",
    description: "We source only premium moisture-resistant gypsum, solid wood, and high-grade aluminum finishes."
  },
  {
    icon: "Users",
    title: "Skilled & Experienced Team",
    description: "Master craftsmen, interior architects, and site engineers with over two decades of combined expertise."
  },
  {
    icon: "Clock",
    title: "Timely Project Delivery",
    description: "Punctual project milestone execution ensuring zero client downtime and immaculate handover."
  },
  {
    icon: "ThumbsUp",
    title: "Customer Satisfaction",
    description: "Unconditional commitment to exceeding client expectations across residential and commercial sectors."
  }
];

export const cardHighlights = [
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
];

export const servicesData: Service[] = [
  {
    id: 'interior-finishing',
    slug: 'interior-finishing',
    title: 'Interior Finishing',
    description: 'Exquisite ceiling and wall detailing transforming bare structural shells into high-end architectural masterpieces.',
    icon: 'Paintbrush',
    features: ['Gypsum Ceilings', 'PVC Ceilings', 'Aluminum Ceilings', 'Painting', 'Wallpapers', 'Sound Proofing'],
  },
  {
    id: 'woodwork',
    slug: 'custom-woodwork',
    title: 'Woodwork',
    description: 'Bespoke cabinetry, custom wardrobes, and artisan furniture engineered with absolute precision.',
    icon: 'Hammer',
    features: ['Kitchen Cabinets', 'Wardrobes (Woddrops)', 'TV Unit Design', 'Furniture'],
  },
  {
    id: 'construction',
    slug: 'construction-exterior',
    title: 'Construction & Exterior',
    description: 'Heavy masonry, premium tiling, and compound designs engineered to withstand the test of time.',
    icon: 'HardHat',
    features: ['Tiles', 'Stone Work', 'Compound Designing', 'Office Partitioning'],
  },
  {
    id: 'electrical',
    slug: 'electrical-services',
    title: 'Electrical',
    description: 'Comprehensive electrical installations and smart architectural lighting.',
    icon: 'Zap',
    features: ['Electricity Installation', 'Lighting Solutions'],
  },
  {
    id: 'plumbing-hvac',
    slug: 'plumbing-hvac',
    title: 'Plumbing & HVAC',
    description: 'Advanced plumbing solutions and climate control systems designed for luxury comfort.',
    icon: 'Droplet',
    features: ['Piping', 'Water Heating', 'Air Conditioning', 'Ventilation'],
  },
  {
    id: 'landscaping',
    slug: 'landscaping',
    title: 'Landscaping',
    description: 'Premium outdoor spaces, elegant gardens, and sophisticated exterior lighting.',
    icon: 'TreePine',
    features: ['Garden Design', 'Outdoor Lighting', 'Paving', 'Pool Construction'],
  }
];

export const projectsData: Project[] = [
  {
    id: 'p1',
    title: 'The Platinum Residence',
    category: 'Residential',
    description: 'A complete luxury living room transformation featuring custom marble TV wall, fluted wood paneling, multi-tier gypsum ceiling with ambient cove lighting, and bespoke furniture.',
    image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=2000',
    beforeImage: 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?auto=format&fit=crop&q=80&w=2000',
    servicesUsed: ['Gypsum Ceilings', 'TV Unit Design', 'Electrical Services', 'Custom Furniture'],
  },
  {
    id: 'p2',
    title: 'Modern Matte Kitchen & Cabinets',
    category: 'Residential',
    description: 'Custom dark wood kitchen island with soft-close drawers, integrated under-cabinet lighting, and quartz stone countertops.',
    image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=2000',
    beforeImage: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=2000',
    servicesUsed: ['Kitchen Cabinets', 'Woodwork', 'Lighting Solutions'],
  },
  {
    id: 'p3',
    title: 'Aura Executive Headquarters',
    category: 'Commercial Offices',
    description: 'Corporate headquarters designed with sound-proof glass partitions, acoustic ceilings, and custom wood reception desk.',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2000',
    beforeImage: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=2000',
    servicesUsed: ['Office Partitioning', 'Sound Proofing', 'Aluminum Ceilings'],
  },
  {
    id: 'p4',
    title: 'Grand Horizon Hotel Suite',
    category: 'Hospitality',
    description: 'Five-star hotel suite featuring bespoke illuminated wardrobe design, PVC ceiling accents, and luxury wallpaper.',
    image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&q=80&w=2000',
    beforeImage: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=2000',
    servicesUsed: ['Wardrobes', 'Wallpapers', 'Gypsum Ceilings'],
  },
  {
    id: 'p5',
    title: 'Serena Royal Penthouse',
    category: 'Residential',
    description: 'Double-volume penthouse featuring multi-layer floating gypsum ceiling, hidden LED warm ambient strips, and Italian marble floors.',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=2000',
    beforeImage: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=2000',
    servicesUsed: ['Gypsum Ceilings', 'Lighting Solutions', 'Tiles'],
  },
  {
    id: 'p6',
    title: 'Victoria Lakefront Villa',
    category: 'Residential',
    description: 'Scenic master suite and open plan lounge with artisan fluted oak wall paneling, acoustic insulation, and custom walk-in dressing area.',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&q=80&w=2000',
    beforeImage: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=2000',
    servicesUsed: ['Wardrobes (Woddrops)', 'Woodwork', 'Painting'],
  },
  {
    id: 'p7',
    title: 'Apex Financial Tower Offices',
    category: 'Commercial Offices',
    description: 'Turnkey executive boardroom and open workspace featuring custom acoustic ceiling baffles, modular aluminum partitions, and recessed linear lighting.',
    image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&q=80&w=2000',
    beforeImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=2000',
    servicesUsed: ['Office Partitioning', 'Electricity Installation', 'Sound Proofing'],
  },
  {
    id: 'p8',
    title: 'Pearl Luxury Lounge & Bar',
    category: 'Hospitality',
    description: 'High-end hospitality venue with intricate geometric gypsum ceiling cutouts, backlit onyx stone feature bar, and sound-insulated wall panels.',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=2000',
    beforeImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=2000',
    servicesUsed: ['Stone Work', 'Lighting Solutions', 'Gypsum Ceilings'],
  },
  {
    id: 'p9',
    title: 'Hilltop Contemporary Residence',
    category: 'Residential',
    description: 'Architectural living room with floating marble TV entertainment unit, concealed wire channeling, and bespoke accent wood cabinetry.',
    image: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&q=80&w=2000',
    beforeImage: 'https://images.unsplash.com/photo-1588854337236-6889d631faa8?auto=format&fit=crop&q=80&w=2000',
    servicesUsed: ['TV Unit Design', 'Furniture', 'Painting'],
  },
  {
    id: 'p10',
    title: 'Synergy Tech Innovation Hub',
    category: 'Commercial Offices',
    description: 'Collaborative enterprise workspaces with open-grid industrial ceiling styling, sound-absorbing phone pods, and high-durability vinyl tile flooring.',
    image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=2000',
    beforeImage: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=2000',
    servicesUsed: ['Office Partitioning', 'Sound Proofing', 'Tiles'],
  },
  {
    id: 'p11',
    title: 'Royal Palm Boutique Hotel',
    category: 'Hospitality',
    description: 'Luxury boutique hotel suites featuring custom veneer bed frames, ambient indirect cove lighting, and textured gold leaf wallpapers.',
    image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=2000',
    beforeImage: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=2000',
    servicesUsed: ['Wallpapers', 'Custom Furniture', 'Lighting Solutions'],
  },
  {
    id: 'p12',
    title: 'Oasis Master Dressing Room & Suite',
    category: 'Residential',
    description: 'Bespoke floor-to-ceiling walk-in wardrobes with fluted glass doors, integrated jewelry trays, internal warm LED strips, and plush vanity area.',
    image: 'https://images.unsplash.com/photo-1558997519-83ea9252edf8?auto=format&fit=crop&q=80&w=2000',
    beforeImage: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&q=80&w=2000',
    servicesUsed: ['Wardrobes (Woddrops)', 'Woodwork', 'Lighting Solutions'],
  }
];

export const processSteps: ProcessStep[] = [
  { id: 1, title: 'Consultation', description: 'Detailed site inspection and discovery call to define your functional scope and aesthetic desires.' },
  { id: 2, title: 'Planning & Design', description: 'Architectural drafting, 3D interior renders, material selections, and clear budget estimation.' },
  { id: 3, title: 'Material Selection', description: 'Sourcing high-grade gypsum, PVC, aluminum, hardwood, tiles, and premium electrical fixtures.' },
  { id: 4, title: 'Precision Construction', description: 'On-site execution by master carpenters, ceiling specialists, painters, and certified electricians.' },
  { id: 5, title: 'Final Handover', description: 'Comprehensive quality assurance check, deep cleaning, and project sign-off.' },
];

export const testimonialsData: Testimonial[] = [
  {
    id: 't1',
    name: 'Robert Kasasa',
    role: 'Home Owner',
    content: 'Natal installed our gypsum ceilings, TV unit, and modern kitchen cabinets. The LED lighting work and wood finishes look like a 5-star hotel in Dubai!',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200'
  },
  {
    id: 't2',
    name: 'Sarah Nabulya',
    role: 'Commercial Developer',
    content: 'WE DESIGN. WE BUILD. YOU ENJOY is not just a slogan — they completed our office partitioning and sound proofing 3 days ahead of schedule!',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200'
  },
  {
    id: 't3',
    name: 'David Tumusiime',
    role: 'Apartment Owner',
    content: 'Their custom wardrobes and tiling work transformed our apartment values completely. Extremely professional team with flawless attention to detail.',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200'
  }
];
