import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Phone, 
  MessageSquare, 
  SlidersHorizontal, 
  ShieldCheck, 
  Award, 
  ArrowUpRight, 
  Maximize2
} from 'lucide-react';
import { Project } from '../types';
import { projectsData, companyDetails } from '../data';
import { recordUserActivity } from '../utils';

interface ProjectSpecsPageProps {
  project: Project;
  onNavigateHome: (sectionId?: string) => void;
  onSelectOtherProject?: (project: Project) => void;
}

export default function ProjectSpecsPage({ 
  project: initialProject, 
  onNavigateHome,
  onSelectOtherProject 
}: ProjectSpecsPageProps) {
  const [currentProject, setCurrentProject] = useState<Project>(initialProject);
  const [viewMode, setViewMode] = useState<'after' | 'before' | 'slider'>('after');
  const [sliderPercent, setSliderPercent] = useState<number>(50);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Sync state if initialProject changes
  useEffect(() => {
    setCurrentProject(initialProject);
    setViewMode('after');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if ((window as any).__lenis) {
      (window as any).__lenis.resize();
      (window as any).__lenis.scrollTo(0, { immediate: true });
    }
  }, [initialProject]);

  const whatsappMessage = encodeURIComponent(
    `Hello Natal Interior Design & Construction! I am reviewing the architectural specifications for "${currentProject.title}" (${currentProject.category}) on your website. I would like to request an estimate and consultation for a similar project.`
  );
  const whatsappDigits = (companyDetails.whatsappNumbers[0] || '0745694499').replace(/[^0-9]/g, '').replace(/^0/, '');
  const whatsappUrl = `https://wa.me/256${whatsappDigits}?text=${whatsappMessage}`;

  const handleQuoteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      sessionStorage.setItem('natal_quote_selected_project', JSON.stringify({
        id: currentProject.id,
        title: currentProject.title,
        category: currentProject.category
      }));
    } catch (err) {}
    onNavigateHome('quote');
  };

  // Find related projects excluding current one - 6 items for responsive grid
  const relatedProjects = projectsData
    .filter(p => p.id !== currentProject.id)
    .slice(0, 6);

  // Derive architectural specifications based on category and services
  const primaryCategory = currentProject.category || 'Interior Finishing';
  const services = currentProject.servicesUsed && currentProject.servicesUsed.length > 0 
    ? currentProject.servicesUsed 
    : [primaryCategory, 'Gypsum Ceiling Architecture', 'Custom Joinery', 'LED Lighting Design', 'Surface Coatings'];

  return (
    <div className="min-h-screen bg-black-rich text-white pb-24 selection:bg-gold selection:text-black-pure font-body">
      {/* Top Architectural Header */}
      <section className="relative pt-4 sm:pt-6 pb-6 sm:pb-8 px-4 sm:px-6 lg:px-12 border-b border-gold/25 bg-gradient-to-b from-black-pure via-black-rich to-black-rich">
        <div className="max-w-[1720px] mx-auto">
          {/* Top Nav Bar: Back home arrow on left (no box container), Share & Print on right */}
          <div className="flex items-center justify-between gap-4 pb-4 sm:pb-5 border-b border-white/10">
            {/* Left: Clean bare arrow with no container box */}
            <button
              type="button"
              onClick={() => onNavigateHome('projects')}
              className="text-gold hover:text-white transition-colors cursor-pointer p-1 group shrink-0 flex items-center justify-center"
              title="Back to Featured Projects"
              aria-label="Back to Featured Projects"
            >
              <ArrowLeft size={24} className="group-hover:-translate-x-1.5 transition-transform" />
            </button>

            {/* Right: Request A Quote button */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <a
                href="#quote"
                onClick={handleQuoteClick}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-gold-dark via-gold to-yellow-300 hover:brightness-110 active:scale-95 text-black-pure text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(212,175,55,0.35)] cursor-pointer"
              >
                <span>Request A Quote</span>
                <ArrowUpRight size={14} className="shrink-0" />
              </a>
            </div>
          </div>

          {/* Heading and Paragraph restored in header */}
          <div className="max-w-5xl mt-5 sm:mt-7">
            <h1 className="font-heading text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white uppercase tracking-wide leading-tight mb-3 sm:mb-4">
              {currentProject.title}
            </h1>
            {currentProject.description && (
              <p className="text-gray-300 text-sm sm:text-base md:text-lg font-light leading-relaxed border-l-2 border-gold/60 pl-3 sm:pl-4">
                {currentProject.description}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Visual Showcase Section with Before/After Slider */}
      <section className="py-6 sm:py-8 px-4 sm:px-6 lg:px-12 max-w-[1720px] mx-auto w-full">
        <div className="bg-black-pure border border-gold/40 p-3 sm:p-5 shadow-[0_15px_50px_rgba(0,0,0,0.85)]">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-gold/20">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
              <span className="text-[11px] sm:text-xs font-mono uppercase tracking-widest text-gold font-bold">
                Project Visual Inspection &amp; Finish Quality
              </span>
            </div>

            <div className="flex items-center gap-2">
              {currentProject.beforeImage && (
                <div className="inline-flex p-0.5 bg-black-rich border border-gold/30 rounded-none">
                  <button
                    type="button"
                    onClick={() => setViewMode('after')}
                    className={`px-3 py-1 text-[10px] sm:text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
                      viewMode === 'after'
                        ? 'bg-gold text-black-pure font-bold shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    After Result
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('before')}
                    className={`px-3 py-1 text-[10px] sm:text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
                      viewMode === 'before'
                        ? 'bg-gold text-black-pure font-bold shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Before State
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('slider')}
                    className={`px-3 py-1 text-[10px] sm:text-xs font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                      viewMode === 'slider'
                        ? 'bg-gold text-black-pure font-bold shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <SlidersHorizontal size={11} />
                    <span>Split View</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                className="p-1.5 sm:px-3 sm:py-1 bg-white/5 hover:bg-gold/15 border border-gold/40 text-gold text-[10px] sm:text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Expand Fullscreen Lightbox"
              >
                <Maximize2 size={13} />
                <span className="hidden sm:inline">Fullscreen</span>
              </button>
            </div>
          </div>

          {/* Interactive Stage */}
          <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden border border-gold/20 bg-black-rich shadow-inner">
            {viewMode === 'slider' && currentProject.beforeImage ? (
              <div className="relative w-full h-full select-none cursor-ew-resize">
                {/* After Image (Base) */}
                <img
                  src={currentProject.image}
                  alt={`${currentProject.title} After`}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <span className="absolute top-3 right-3 bg-black-pure/90 text-white text-[10px] sm:text-xs uppercase font-mono font-bold tracking-widest px-3 py-1 border border-gold/60 z-10 shadow-lg">
                  Completed Transformation (After)
                </span>

                {/* Before Image (Clipped Overlay) */}
                <div
                  className="absolute inset-0 overflow-hidden z-10"
                  style={{ width: `${sliderPercent}%` }}
                >
                  <img
                    src={currentProject.beforeImage}
                    alt={`${currentProject.title} Before`}
                    className="absolute inset-0 w-full h-full object-cover max-w-none"
                    style={{ width: '100vw' }}
                  />
                  <span className="absolute top-3 left-3 bg-black-pure/90 text-gold text-[10px] sm:text-xs uppercase font-mono font-bold tracking-widest px-3 py-1 border border-gold/60 shadow-lg">
                    Original Condition (Before)
                  </span>
                </div>

                {/* Slider Divider Bar & Controller */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-gold z-20 shadow-[0_0_15px_rgba(212,175,55,0.9)]"
                  style={{ left: `${sliderPercent}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-black-pure border-2 border-gold flex items-center justify-center text-gold shadow-2xl">
                    <SlidersHorizontal size={14} />
                  </div>
                </div>

                {/* Drag range input */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderPercent}
                  onChange={(e) => setSliderPercent(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
                  aria-label="Before and after split slider"
                />
              </div>
            ) : (
              <div className="relative w-full h-full">
                <img
                  src={viewMode === 'before' && currentProject.beforeImage ? currentProject.beforeImage : currentProject.image}
                  alt={currentProject.title}
                  className="w-full h-full object-cover transition-opacity duration-300"
                />
                <span className="absolute top-3 right-3 bg-black-pure/90 text-gold text-[10px] sm:text-xs uppercase font-mono font-bold tracking-widest px-3.5 py-1.5 border border-gold/60 shadow-lg">
                  {viewMode === 'before' ? 'Original Before Condition' : 'Completed Execution (After)'}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Specifications & Inquiries */}
      <section className="py-6 sm:py-8 px-4 sm:px-6 lg:px-12 max-w-[1720px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Main Specs Column */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-black-pure border border-gold/30 p-5 sm:p-7 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-white/10">
                <div>
                  <span className="text-gold text-xs font-mono uppercase tracking-widest block mb-1">
                    {currentProject.category}
                  </span>
                  <h2 className="font-heading text-xl sm:text-2xl font-bold uppercase text-white">
                    {currentProject.title}
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1">
                  <ShieldCheck size={14} />
                  QA Handover Certified
                </span>
              </div>

              {currentProject.description && (
                <p className="text-gray-300 text-sm leading-relaxed font-light mb-5">
                  {currentProject.description}
                </p>
              )}

              {/* Scope & Trades Chips */}
              {services.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-xs uppercase font-mono tracking-widest text-gold font-bold mb-2.5">
                    Scope of Work & Services Included:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {services.map((svc, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-gold/30 text-white text-xs font-mono"
                      >
                        <CheckCircle2 size={13} className="text-gold" />
                        <span>{svc}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Technical Specifications Summary */}
              <div className="border-t border-white/10 pt-5">
                <h3 className="text-xs uppercase font-mono tracking-widest text-gold font-bold mb-3">
                  Technical Specifications Summary:
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white/5 border border-white/10">
                    <span className="text-gold font-semibold block mb-1">Ceiling & Drywall:</span>
                    <span className="text-gray-300 font-light">12.5mm moisture-resistant gypsum boards with galvanized C-channels & continuous shadow-gaps.</span>
                  </div>
                  <div className="p-3 bg-white/5 border border-white/10">
                    <span className="text-gold font-semibold block mb-1">Custom Joinery:</span>
                    <span className="text-gray-300 font-light">High-density moisture-resistant core with soft-close Blum/Häfele hardware & satin polyurethane finish.</span>
                  </div>
                  <div className="p-3 bg-white/5 border border-white/10">
                    <span className="text-gold font-semibold block mb-1">Lighting Design:</span>
                    <span className="text-gray-300 font-light">3000K warm white architectural illumination, anti-glare recessed spots & indirect LED coves.</span>
                  </div>
                  <div className="p-3 bg-white/5 border border-white/10">
                    <span className="text-gold font-semibold block mb-1">Surface Finishes:</span>
                    <span className="text-gray-300 font-light">Multi-coat washable silk emulsion paint with mold inhibitors and durable scrub resistance.</span>
                  </div>
                </div>
              </div>

              {/* Warranty Guarantee */}
              <div className="mt-5 p-3.5 bg-gold/10 border border-gold/30 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Award size={16} className="text-gold shrink-0" />
                  <span className="text-white font-medium">Warranty Coverage:</span>
                  <span className="text-gray-300 font-light">2-Year Workmanship &amp; Structural Guarantee included on all installations.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar / Quick Inquiry Card */}
          <div className="space-y-4">
            <div className="bg-black-pure border border-gold/40 p-5 sm:p-6 shadow-xl">
              <h3 className="font-heading text-lg font-bold uppercase tracking-wider text-white mb-2">
                Inquire About This Scope
              </h3>
              <p className="text-gray-300 text-xs leading-relaxed mb-5 font-light">
                Request a comprehensive, itemized estimate or consult directly with our architectural team for your upcoming project.
              </p>

              <div className="space-y-2.5">
                <a
                  href="#quote"
                  onClick={(e) => {
                    recordUserActivity({
                      type: 'specs_inquiry',
                      title: `Requested Estimate for: ${currentProject.title}`,
                      description: `Clicked to request quote from project specifications page for "${currentProject.title}".`,
                      metadata: { projectId: currentProject.id, projectTitle: currentProject.title, category: currentProject.category }
                    });
                    handleQuoteClick(e);
                  }}
                  className="w-full bg-gradient-to-r from-gold-dark via-gold to-yellow-300 hover:brightness-110 active:scale-95 text-black-pure py-3 px-4 font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <span>Request Project Estimate</span>
                  <ArrowUpRight size={15} />
                </a>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    recordUserActivity({
                      type: 'whatsapp',
                      title: `WhatsApp Inquiry: ${currentProject.title}`,
                      description: `Opened WhatsApp consultation regarding "${currentProject.title}".`,
                      metadata: { projectId: currentProject.id, projectTitle: currentProject.title, category: currentProject.category }
                    });
                  }}
                  className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 py-2.5 px-4 font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageSquare size={15} />
                  <span>Chat on WhatsApp</span>
                </a>

                <a
                  href={`tel:${companyDetails.phoneNumbers[0].replace(/\s/g, '')}`}
                  onClick={() => {
                    recordUserActivity({
                      type: 'call',
                      title: `Phone Consultation: ${currentProject.title}`,
                      description: `Called direct office line regarding "${currentProject.title}".`,
                      metadata: { projectId: currentProject.id, projectTitle: currentProject.title }
                    });
                  }}
                  className="w-full bg-white/5 hover:bg-white/10 text-white border border-gold/30 py-2.5 px-4 font-mono uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Phone size={14} className="text-gold" />
                  <span>Call Direct: {companyDetails.phoneNumbers[0]}</span>
                </a>
              </div>

              <div className="mt-4 pt-4 border-t border-white/10 text-[11px] text-gray-400 font-mono space-y-1">
                <div className="flex items-center justify-between">
                  <span>Turnaround:</span>
                  <span className="text-gold">Quotes within 24h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Coverage:</span>
                  <span className="text-white">Kampala &amp; Nationwide</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Projects Showcase (6-Column Laptop, 3 Tablet, 2 Mobile) */}
      {relatedProjects.length > 0 && (
        <section className="py-10 px-4 sm:px-6 lg:px-12 max-w-[1720px] mx-auto w-full border-t border-gold/20 mt-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
            <div>
              <span className="text-gold uppercase tracking-[0.25em] text-xs font-mono font-bold block mb-1">
                More Creations
              </span>
              <h3 className="font-heading text-2xl sm:text-3xl font-bold uppercase tracking-wider text-white">
                Inspect Other Project Specifications
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateHome('projects')}
              className="inline-flex items-center gap-1.5 text-gold text-xs uppercase font-mono tracking-wider hover:text-yellow-200 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <span>View All Portfolio Projects</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {relatedProjects.map((relProj) => (
              <div
                key={relProj.id}
                onClick={() => {
                  if (onSelectOtherProject) {
                    onSelectOtherProject(relProj);
                  } else {
                    setCurrentProject(relProj);
                    window.location.hash = `#project-specs?id=${encodeURIComponent(relProj.id)}`;
                  }
                }}
                className="group bg-black-pure border border-gold/30 hover:border-gold transition-all duration-300 cursor-pointer overflow-hidden flex flex-col shadow-lg hover:shadow-[0_8px_25px_rgba(212,175,55,0.25)] rounded-none"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-black-rich">
                  <img
                    src={relProj.image}
                    alt={relProj.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black-pure via-transparent to-transparent opacity-80 pointer-events-none" />
                  <span className="absolute top-1.5 left-1.5 bg-black-pure/90 border border-gold/40 text-gold text-[8px] sm:text-[9px] font-mono uppercase px-1.5 py-0.5 truncate max-w-[90%]">
                    {relProj.category}
                  </span>
                </div>
                <div className="p-2.5 sm:p-3 flex-grow flex flex-col justify-between">
                  <div>
                    <h4 className="font-heading text-xs sm:text-sm font-bold text-white group-hover:text-gold transition-colors line-clamp-1 leading-snug">
                      {relProj.title}
                    </h4>
                    <p className="text-gray-400 text-[10px] sm:text-[11px] line-clamp-2 font-light mt-1">
                      {relProj.description}
                    </p>
                  </div>
                  <div className="pt-2 mt-2 border-t border-white/10 flex items-center justify-between text-gold text-[10px] font-mono uppercase tracking-wider group-hover:text-yellow-300">
                    <span>Inspect Specs</span>
                    <ArrowUpRight size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Fullscreen Lightbox Modal */}
      <AnimatePresence>
        {isLightboxOpen && (
          <div
            onClick={() => setIsLightboxOpen(false)}
            className="fixed inset-0 z-50 bg-black-pure/95 backdrop-blur-md p-4 sm:p-8 flex flex-col items-center justify-center cursor-zoom-out"
          >
            <div className="max-w-[1600px] w-full flex items-center justify-between text-white pb-3 mb-2 border-b border-gold/30">
              <span className="text-xs sm:text-sm font-heading font-bold uppercase tracking-wider text-gold">
                {currentProject.title} — Technical Resolution
              </span>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="text-xs font-mono uppercase tracking-wider text-gray-300 hover:text-white border border-gold/40 px-3 py-1 bg-white/5 cursor-pointer"
              >
                Close ✕
              </button>
            </div>
            <div className="relative max-w-[1600px] max-h-[85vh] w-full h-full flex items-center justify-center">
              <img
                src={viewMode === 'before' && currentProject.beforeImage ? currentProject.beforeImage : currentProject.image}
                alt={currentProject.title}
                className="max-h-full max-w-full object-contain border border-gold/40 shadow-2xl"
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
