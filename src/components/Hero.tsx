import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronDown, Film } from 'lucide-react';
import { useSectionContent, HeroContent, defaultHeroContent } from '../siteContent';

export default function Hero() {
  const { content } = useSectionContent<HeroContent>('hero', defaultHeroContent);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const isVideoMode = content.mediaType === 'video' && !!content.backgroundVideo;
  const videoSource = content.backgroundVideo || '';
  const posterSource = content.backgroundImage || defaultHeroContent.backgroundImage;

  const navigateToCreations = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if ((window as any).__lenis) {
      (window as any).__lenis.resize();
      (window as any).__lenis.scrollTo(0, { immediate: true });
    }
    if (window.location.hash === '#products' || window.location.hash === '#creations') {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
      window.location.hash = '#products';
    }
  };

  return (
    <section id="home" className="relative min-h-[80vh] sm:min-h-[85vh] lg:min-h-[86vh] w-full overflow-hidden flex flex-col justify-between pt-20 sm:pt-22 md:pt-24 lg:pt-26 pb-4 sm:pb-6">
      {/* Background Container - Stunning Luxury Interior & Optional Cinematic Video */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Base Luxury Golden Interior Image - Always rendered, guaranteed visible */}
        <motion.div
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 25, ease: 'easeInOut', repeat: Infinity }}
          className="absolute inset-0 w-full h-full"
        >
          <img
            src={posterSource}
            alt="Natal Luxury Golden Interior Design"
            className="w-full h-full object-cover object-center filter brightness-[0.98]"
          />
        </motion.div>

        {/* Optional Video Overlay (fades in only if video actually loads and plays) */}
        {isVideoMode && videoSource && !videoError && (
          <video
            ref={videoRef}
            key={videoSource}
            src={videoSource}
            autoPlay
            loop
            muted
            playsInline
            onLoadedData={() => setVideoLoaded(true)}
            onPlaying={() => setVideoLoaded(true)}
            onError={() => {
              setVideoError(true);
              setVideoLoaded(false);
            }}
            className={`absolute inset-0 w-full h-full object-cover object-center filter brightness-95 transition-opacity duration-1000 ${
              videoLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <source src={videoSource} type="video/mp4" />
          </video>
        )}

        {/* Golden ambient lighting & soft directional scrims for crisp text readability without obscuring visuals */}
        <div className="absolute inset-0 bg-gradient-to-r from-black-pure/75 via-black-pure/40 via-40% to-black-pure/15 z-10 pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black-pure/70 via-transparent via-50% to-black-pure/80 z-10 pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_45%,rgba(212,175,55,0.12)_0%,transparent_65%)] z-10 pointer-events-none"></div>
      </div>

      {/* Main Content (Left-Aligned for Clear Background Video Playback) */}
      <div className="relative z-20 w-full max-w-[94rem] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 my-auto pt-2 sm:pt-4 pb-4 sm:pb-6">
        <div className="max-w-2xl lg:max-w-3xl xl:max-w-4xl flex flex-col items-start text-left">
          {/* Main Brand Slogan */}
          <motion.div
            initial={{ opacity: 0, x: -25 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="mb-2.5 sm:mb-4"
          >
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.65rem] xl:text-[3.15rem] font-heading font-extrabold tracking-tight text-white leading-[1.14] sm:leading-[1.1] drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
              {content.headline1} <br />
              {content.headline2} <br />
              <span className="text-gradient-gold italic font-normal">{content.headline3}</span>
            </h1>
          </motion.div>

          {/* Subtitle / Description */}
          <motion.p
            initial={{ opacity: 0, x: -25 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.35 }}
            className="text-gray-200 text-xs sm:text-sm md:text-[14.5px] max-w-xl mb-4 sm:mb-5 font-light leading-relaxed text-left drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"
          >
            {content.description}
          </motion.p>

          {/* Action Buttons (Left-Aligned) */}
          <motion.div
            initial={{ opacity: 0, x: -25 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-start gap-2.5 sm:gap-3.5 w-full sm:w-auto"
          >
            <a
              href="#quote"
              className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 bg-gold hover:bg-gold-light active:bg-gold-dark text-black-pure transition-all duration-300 uppercase tracking-wider text-[11px] sm:text-xs font-bold text-center shadow-[0_0_15px_rgba(212,175,55,0.25)] hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] whitespace-nowrap active:scale-95 rounded-sm"
            >
              {content.primaryCtaText || 'Request Quotation'}
            </a>
            <a
              href="#products"
              onClick={navigateToCreations}
              className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 border border-white/30 bg-black-pure/60 hover:bg-black-pure/90 backdrop-blur-md text-white hover:border-gold hover:text-gold transition-all duration-300 uppercase tracking-wider text-[11px] sm:text-xs font-medium text-center whitespace-nowrap active:scale-95 shadow-md cursor-pointer rounded-sm"
            >
              {content.secondaryCtaText || 'Explore Showcase'}
            </a>
          </motion.div>
        </div>
      </div>

      {/* Curated Inspiration Gallery with Generous In-Between Spacing */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="relative z-20 w-full max-w-[94rem] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 mt-auto pb-4 sm:pb-6"
      >
        <div className="w-full">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-7 lg:gap-8 w-full">
            {(content.cards && content.cards.length > 0 ? content.cards : defaultHeroContent.cards).map((item, idx) => {
              const fallback = defaultHeroContent.cards[idx] || defaultHeroContent.cards[0];
              const imgSrc = (item.img && item.img.trim()) ? item.img : fallback.img;
              const labelText = (item.label && item.label.trim()) ? item.label : fallback.label;
              return (
                <a 
                  key={idx} 
                  href="#products"
                  onClick={navigateToCreations}
                  className="relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden border border-gold/40 hover:border-gold bg-black-pure/60 backdrop-blur-md group cursor-pointer shadow-[0_0_15px_rgba(212,175,55,0.15)] hover:shadow-[0_0_28px_rgba(212,175,55,0.45)] transition-all duration-300"
                >
                  <img 
                    src={imgSrc} 
                    alt={labelText} 
                    className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black-pure via-black-pure/30 to-transparent opacity-85 group-hover:opacity-50 transition-opacity duration-300"></div>
                  
                  <div className="absolute bottom-2.5 left-3 right-3 sm:bottom-3 sm:left-4 sm:right-4 flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs text-white/95 group-hover:text-gold uppercase tracking-wider font-mono font-medium transition-colors">
                      {labelText}
                    </span>
                  </div>
                  
                  {/* Glowing bottom accent line */}
                  <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[0_0_12px_rgba(212,175,55,0.8)]"></div>
                </a>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-2 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 hidden sm:flex"
      >
        <span className="text-[10px] uppercase tracking-[0.3em] text-gray-400 font-medium">Scroll to explore</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
        >
          <ChevronDown className="text-gold" size={20} />
        </motion.div>
      </motion.div>
    </section>
  );
}
