import React, { useState } from 'react';
import NatalLogo from './NatalLogo';
import { companyDetails } from '../data';
import { Phone, MessageSquare, MapPin, Mail, ChevronRight, ArrowRight } from 'lucide-react';
import { useSectionContent, defaultContactContent, ContactContent } from '../siteContent';
import { recordUserActivity } from '../utils';

export default function Footer() {
  const { content } = useSectionContent<ContactContent>('contact', defaultContactContent);
  const [reactingSocialId, setReactingSocialId] = useState<string | null>(null);

  const phoneNumbers = content.phoneNumbers && content.phoneNumbers.length > 0 ? content.phoneNumbers : defaultContactContent.phoneNumbers;
  const whatsappNumbers = content.whatsappNumbers && content.whatsappNumbers.length > 0 ? content.whatsappNumbers : defaultContactContent.whatsappNumbers;

  const primaryWhatsapp = whatsappNumbers[0] || '0745694499';
  const cleanWhatsappDigits = primaryWhatsapp.replace(/\s/g, '').replace(/^0/, '');

  const socialPlatforms = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      url: `https://wa.me/256${cleanWhatsappDigits}`,
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" aria-hidden="true">
          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm0 18.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.17 8.17 0 01-1.25-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 012.41 5.83c0 4.54-3.7 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.98-.15.17-.29.19-.54.07-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.15-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.84-.86 2.06 0 1.21.88 2.39 1.01 2.56.12.17 1.74 2.66 4.22 3.73.59.25 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.07-.1-.23-.17-.48-.29z"/>
        </svg>
      )
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      url: content.tiktokUrl || 'https://www.tiktok.com/@natalinteriors',
      icon: (
        <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 fill-white" aria-hidden="true">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64c.298-.002.595.042.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 003 15.68 6.34 6.34 0 009.34 22a6.34 6.34 0 006.33-6.33V9.07c1.78 1.27 3.93 1.95 6.13 1.95V7.57a7.89 7.89 0 01-2.21-.88z"/>
        </svg>
      )
    },
    {
      id: 'facebook',
      name: 'Facebook',
      url: content.facebookUrl || 'https://www.facebook.com/natalinteriordesign',
      icon: (
        <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 fill-white" aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      )
    }
  ];

  const handleSocialClick = (e: React.MouseEvent<HTMLAnchorElement>, social: typeof socialPlatforms[0]) => {
    e.preventDefault();
    if (reactingSocialId) return;

    setReactingSocialId(social.id);

    setTimeout(() => {
      window.open(social.url, '_blank', 'noopener,noreferrer');
      setTimeout(() => {
        setReactingSocialId(null);
      }, 250);
    }, 280);
  };

  return (
    <footer className="bg-gradient-to-b from-[#111111] via-[#080808] to-black-pure pt-8 sm:pt-10 pb-6 sm:pb-8 border-t-2 border-gold shadow-[0_-15px_40px_rgba(212,175,55,0.15)] relative">
      <div className="w-full max-w-[98vw] xl:max-w-[95vw] 2xl:max-w-[1780px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
        
        {/* Top Gold Slogan Ribbon */}
        <div className="bg-gradient-to-r from-gold/15 via-gold/35 to-gold/15 border border-gold/70 py-2 sm:py-2.5 px-4 text-center mb-6 sm:mb-8 rounded-sm shadow-[0_0_15px_rgba(212,175,55,0.15)]">
          <p className="font-heading text-xs sm:text-sm font-bold tracking-[0.16em] text-white uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            {companyDetails.slogan}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-7 lg:gap-8 mb-7 sm:mb-9">
          
          {/* Column 1: Brand, Description, Contacts, Socials */}
          <div className="flex flex-col justify-between">
            <div>
              <NatalLogo className="h-7 sm:h-8 mb-3" variant="footer" />
              <p className="text-gray-300 text-xs sm:text-[13px] leading-relaxed mb-4 font-normal">
                {companyDetails.description}
              </p>
              
              {/* Contact Information Cards */}
              <div className="space-y-2.5 mb-5">
                <a 
                  href={`tel:${phoneNumbers[0].replace(/\s/g, '')}`} 
                  onClick={() => {
                    recordUserActivity({
                      type: 'call',
                      title: 'Phone Consultation Dialed',
                      description: `User clicked to call ${phoneNumbers[0]} from Footer.`,
                      metadata: { phoneNumber: phoneNumbers[0], channel: 'Footer' }
                    });
                  }}
                  className="flex items-center gap-3 p-2.5 rounded bg-black-rich border border-gold/50 hover:border-gold hover:bg-gold/10 active:scale-[0.98] transition-all group shadow-sm"
                >
                  <div className="w-8.5 h-8.5 rounded-full bg-gold/15 border border-gold flex items-center justify-center text-gold group-hover:bg-gold group-hover:text-black-pure transition-all shrink-0">
                    <Phone size={15} className="stroke-[2.4]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[9.5px] uppercase font-mono font-bold tracking-wider text-gold block mb-0.5">Phone Consultation</span>
                    <span className="text-white font-mono text-xs sm:text-[13px] font-semibold group-hover:text-gold transition-colors block truncate">
                      {phoneNumbers.join(" / ")}
                    </span>
                  </div>
                </a>

                <a 
                  href={`https://wa.me/256${cleanWhatsappDigits}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  onClick={() => {
                    recordUserActivity({
                      type: 'whatsapp',
                      title: 'WhatsApp Inquiry Initiated',
                      description: `User opened direct WhatsApp chat with ${primaryWhatsapp} from Footer.`,
                      metadata: { whatsappNumber: primaryWhatsapp, channel: 'Footer' }
                    });
                  }}
                  className="flex items-center gap-3 p-2.5 rounded bg-black-rich border border-gold/50 hover:border-gold hover:bg-gold/10 active:scale-[0.98] transition-all group shadow-sm"
                >
                  <div className="w-8.5 h-8.5 rounded-full bg-gold/15 border border-gold flex items-center justify-center text-gold group-hover:bg-gold group-hover:text-black-pure transition-all shrink-0">
                    <MessageSquare size={15} className="stroke-[2.4]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[9.5px] uppercase font-mono font-bold tracking-wider text-gold block mb-0.5">Direct WhatsApp</span>
                    <span className="text-white font-mono text-xs sm:text-[13px] font-semibold group-hover:text-gold transition-colors block truncate">
                      {whatsappNumbers.join(" / ")}
                    </span>
                  </div>
                </a>
              </div>
            </div>

            {/* Social Media Links: Real brand icons in white, surrounded by a gold outer stroke */}
            <div className="pt-1">
              <span className="text-[11px] sm:text-xs uppercase tracking-wider text-gold font-bold mb-2.5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gold inline-block animate-pulse shadow-[0_0_8px_rgba(212,175,55,0.9)]"></span>
                Connect With Us
              </span>
              <div className="flex items-center gap-2.5 flex-wrap">
                {socialPlatforms.map((platform) => {
                  const isReacting = reactingSocialId === platform.id;
                  return (
                    <a 
                      key={platform.id}
                      href={platform.url}
                      target="_blank" 
                      rel="noopener noreferrer" 
                      aria-label={platform.name}
                      onClick={(e) => handleSocialClick(e, platform)}
                      className={`w-9.5 h-9.5 sm:w-10 sm:h-10 rounded-full border-2 border-gold flex items-center justify-center transition-all duration-300 cursor-pointer shadow-[0_0_10px_rgba(212,175,55,0.25)] ${
                        isReacting 
                          ? 'bg-gold/30 border-yellow-300 shadow-[0_0_20px_rgba(212,175,55,0.8)] scale-110'
                          : 'bg-black-pure/90 hover:bg-gold/20 hover:border-yellow-300 hover:shadow-[0_0_16px_rgba(212,175,55,0.5)] hover:scale-105 active:scale-95'
                      }`}
                      title={`${platform.name} - Natal Interior Design`}
                    >
                      {platform.icon}
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Column 2: Quick Navigation */}
          <div>
            <h6 className="uppercase tracking-wider text-xs sm:text-[13px] mb-3.5 font-heading font-bold text-gold flex items-center gap-2 border-b border-gold/40 pb-2">
              <span className="w-2 h-2 rounded-full bg-gold inline-block shadow-[0_0_8px_rgba(212,175,55,0.8)]"></span>
              Quick Navigation
            </h6>
            <ul className="space-y-1.5">
              {[
                { name: 'Home', href: '#home' },
                { name: 'About Us', href: '#about' },
                { name: 'Services', href: '#services' },
                { name: 'All Services', href: '#all-services' },
                { name: 'Featured Showcase', href: '#showcase' },
                { name: 'Project Portfolio', href: '#projects' },
                { name: 'Why Choose Us', href: '#why-us' },
                { name: 'Process', href: '#process' },
                { name: 'Request Quote', href: '#quote' },
              ].map((link) => (
                <li key={link.name}>
                  <a 
                    href={link.href} 
                    className="text-gray-300 hover:text-gold text-xs sm:text-[13px] font-normal transition-colors flex items-center gap-2 group py-1"
                  >
                    <ChevronRight size={13} className="text-gold/70 group-hover:text-gold group-hover:translate-x-1 transition-transform shrink-0 stroke-[2.2]" />
                    <span>{link.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Service Pages */}
          <div>
            <h6 className="uppercase tracking-wider text-xs sm:text-[13px] mb-3.5 font-heading font-bold text-gold flex items-center gap-2 border-b border-gold/40 pb-2">
              <span className="w-2 h-2 rounded-full bg-gold inline-block shadow-[0_0_8px_rgba(212,175,55,0.8)]"></span>
              Our Service Pages
            </h6>
            <ul className="space-y-1.5 text-xs sm:text-[13px]">
              {[
                { name: 'Ceiling Solutions & Gypsum', href: '#service-ceiling-solutions' },
                { name: 'Kitchen Cabinets & Wardrobes', href: '#service-custom-woodwork' },
                { name: 'TV Wall Units & Woodwork', href: '#service-custom-woodwork' },
                { name: 'Interior Finishing & Painting', href: '#service-interior-finishing' },
                { name: 'Sound Proofing & Wallpapers', href: '#service-interior-finishing' },
                { name: 'Tiling & Stone Work', href: '#service-construction-exterior' },
                { name: 'Office Partitioning & Compound', href: '#service-construction-exterior' },
                { name: 'Electrical & Smart Lighting', href: '#service-electrical-services' },
              ].map((serviceItem) => (
                <li key={serviceItem.name}>
                  <a 
                    href={serviceItem.href} 
                    className="text-gray-300 hover:text-gold transition-colors flex items-center gap-2 group py-1 font-normal"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-gold/70 group-hover:bg-gold group-hover:scale-125 transition-all shrink-0"></span>
                    <span>{serviceItem.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Direct Inquiry & Location */}
          <div>
            <h6 className="uppercase tracking-wider text-xs sm:text-[13px] mb-3.5 font-heading font-bold text-gold flex items-center gap-2 border-b border-gold/40 pb-2">
              <span className="w-2 h-2 rounded-full bg-gold inline-block shadow-[0_0_8px_rgba(212,175,55,0.8)]"></span>
              Direct Inquiry
            </h6>
            <p className="text-gray-300 text-xs sm:text-[13px] mb-3 leading-relaxed font-normal">
              Connect directly with our lead architect or site project director:
            </p>
            
            <a
              href={`https://wa.me/256${companyDetails.whatsappNumbers[0].replace(/[^0-9]/g, '').replace(/^0/, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-gold-dark via-gold to-yellow-300 text-black-pure hover:brightness-110 text-xs uppercase font-mono tracking-wider shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all w-full justify-center mb-3.5 rounded-sm font-bold active:scale-[0.98] border border-gold"
            >
              <MessageSquare size={16} className="text-black-pure shrink-0 stroke-[2.4]" />
              <span className="truncate">WhatsApp: {companyDetails.whatsappNumbers[0]}</span>
            </a>

            <div className="space-y-2.5">
              {/* Location Card */}
              <div className="flex items-center gap-3 p-2.5 rounded bg-black-rich border border-gold/50 hover:border-gold transition-all shadow-sm">
                <div className="w-8.5 h-8.5 rounded-full bg-gold/15 border border-gold flex items-center justify-center text-gold shrink-0">
                  <MapPin size={15} className="stroke-[2.4]" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[9.5px] uppercase font-mono font-bold tracking-wider text-gold block mb-0.5">Physical Atelier</span>
                  <span className="text-white text-xs sm:text-[13px] font-medium block leading-snug truncate">{companyDetails.location}</span>
                </div>
              </div>
              
              {/* Email Card */}
              <div className="flex items-center gap-3 p-2.5 rounded bg-black-rich border border-gold/50 hover:border-gold transition-all shadow-sm">
                <div className="w-8.5 h-8.5 rounded-full bg-gold/15 border border-gold flex items-center justify-center text-gold shrink-0">
                  <Mail size={15} className="stroke-[2.4]" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[9.5px] uppercase font-mono font-bold tracking-wider text-gold block mb-0.5">Official Inquiries</span>
                  <a href={`mailto:${companyDetails.email}`} className="text-white hover:text-gold font-mono text-xs sm:text-[13px] font-medium transition-colors block truncate">
                    {companyDetails.email}
                  </a>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Copyright & Tagline */}
        <div className="border-t border-gold/30 pt-4 sm:pt-5 flex flex-col sm:flex-row justify-between items-center gap-2.5 text-[11px] sm:text-xs text-gray-400">
          <p className="font-normal text-center sm:text-left lowercase tracking-wide">
            &copy; {new Date().getFullYear()} <span className="text-gold/90 font-medium lowercase">{companyDetails.name.toLowerCase()}</span>. all rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

