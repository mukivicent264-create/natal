import React, { useState, useEffect } from 'react';
import { useSectionContent, BrandingContent, defaultBrandingContent } from '../siteContent';

interface NatalLogoProps {
  className?: string;
  variant?: 'default' | 'small' | 'large' | 'footer';
  showTagline?: boolean;
  forceType?: 'both' | 'image' | 'text';
}

export default function NatalLogo({ 
  className = "h-12",
  variant = "default",
  showTagline = true,
  forceType
}: NatalLogoProps) {
  const { content } = useSectionContent<BrandingContent>('branding', defaultBrandingContent);
  const [imageError, setImageError] = useState(false);

  // Reset image error state whenever logoUrl changes
  useEffect(() => {
    setImageError(false);
  }, [content?.logoUrl]);

  // Optionally sync browser tab favicon if a custom logo is active
  useEffect(() => {
    if (content?.logoUrl && typeof document !== 'undefined') {
      try {
        let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'shortcut icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = content.logoUrl;
      } catch {}
    }
  }, [content?.logoUrl]);

  const isSmall = variant === "small";
  const isLarge = variant === "large";
  const isFooter = variant === "footer";

  const effectiveType = forceType || content.logoType || 'both';
  const hasCustomLogo = Boolean(content.logoUrl && !imageError);

  // Pure typography block
  const renderTypography = (isBesideLogo = false) => (
    <div className={`flex flex-col justify-center text-left ${isBesideLogo ? 'leading-tight' : ''}`}>
      <p className={`font-heading font-bold tracking-[0.12em] sm:tracking-[0.15em] text-white leading-none uppercase ${
        isSmall 
          ? "text-[10px] sm:text-xs md:text-sm" 
          : isFooter
          ? "text-base sm:text-lg lg:text-2xl"
          : isBesideLogo
          ? "text-xs sm:text-sm md:text-base lg:text-lg"
          : "text-sm sm:text-base lg:text-2xl xl:text-3xl"
      }`}>
        {content.companyName || "Natal Interior"}
      </p>
      {showTagline && (
        <p className={`tracking-[0.14em] sm:tracking-[0.16em] text-gold uppercase font-medium ${
          isSmall 
            ? "text-[6.5px] sm:text-[7.5px] md:text-[8.5px] mt-0.5" 
            : isFooter
            ? "text-[8px] sm:text-[9px] lg:text-xs mt-1"
            : isBesideLogo
            ? "text-[7px] sm:text-[7.5px] lg:text-[9px] mt-0.5"
            : "text-[7px] sm:text-[8px] lg:text-sm mt-1"
        }`}>
          {content.tagline || "Design Construction"}
        </p>
      )}
    </div>
  );

  // 1. If user chose "Logo Image Only" and a logo exists
  if (hasCustomLogo && effectiveType === 'image') {
    const customMaxH = content.logoHeight ? Math.min(Math.max(content.logoHeight, 26), 90) : undefined;
    return (
      <div className={`flex items-center justify-start ${className}`}>
        <img 
          src={content.logoUrl} 
          alt={content.logoAltText || content.companyName || "Natal Atelier Logo"}
          onError={() => setImageError(true)}
          className={`w-auto object-contain transition-all duration-300 drop-shadow-md select-none ${
            isSmall 
              ? "max-h-7 sm:max-h-8" 
              : isLarge 
              ? "max-h-14 sm:max-h-16" 
              : isFooter
              ? "max-h-12 sm:max-h-14"
              : "max-h-9 sm:max-h-11 md:max-h-12 lg:max-h-14"
          }`}
          style={customMaxH && !isSmall ? { maxHeight: `${customMaxH}px` } : undefined}
        />
      </div>
    );
  }

  // 2. If user chose "Both" (Logo Image + Typography) and logo exists
  if (hasCustomLogo && effectiveType === 'both') {
    const customMaxH = content.logoHeight ? Math.min(Math.max(content.logoHeight, 24), 72) : undefined;
    return (
      <div className={`flex items-center gap-2 sm:gap-2.5 md:gap-3 justify-start group text-left ${className}`}>
        <div className="shrink-0 flex items-center justify-center">
          <img 
            src={content.logoUrl} 
            alt={content.logoAltText || content.companyName || "Natal Atelier Logo"}
            onError={() => setImageError(true)}
            className={`w-auto object-contain transition-all duration-300 drop-shadow-md select-none ${
              isSmall 
                ? "max-h-6 sm:max-h-7" 
                : isLarge 
                ? "max-h-12 sm:max-h-14" 
                : isFooter
                ? "max-h-10 sm:max-h-12"
                : "max-h-8 sm:max-h-9 md:max-h-10 lg:max-h-12"
            }`}
            style={customMaxH && !isSmall ? { maxHeight: `${customMaxH}px` } : undefined}
          />
        </div>
        {renderTypography(true)}
      </div>
    );
  }

  // 3. Fallback / Classic Atelier Typography
  return (
    <div className={`flex flex-col justify-center text-left ${className}`}>
      {renderTypography(false)}
    </div>
  );
}
