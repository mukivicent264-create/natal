import React, { useState } from 'react';
import NatalLogo from './NatalLogo';
import { companyDetails } from '../data';
import { Phone, MessageSquare, MapPin, Mail, Facebook, Linkedin, ChevronRight, ArrowRight } from 'lucide-react';
import { useSectionContent, defaultContactContent, ContactContent } from '../siteContent';
import { recordUserActivity } from '../utils';

export default function Footer() {
  const { content } = useSectionContent<ContactContent>('contact', defaultContactContent);
  const [reactingSocialId, setReactingSocialId] = useState<string | null>(null);

  const phoneNumbers = content.phoneNumbers && content.phoneNumbers.length > 0 ? content.phoneNumbers : defaultContactContent.phoneNumbers;
  const whatsappNumbers = content.whatsappNumbers && content.whatsappNumbers.length > 0 ? content.whatsappNumbers : defaultContactContent.whatsappNumbers;
  const location = content.location || defaultContactContent.location;
  const email = content.email || defaultContactContent.email;
  const companyName = content.companyName || defaultContactContent.companyName;
  const slogan = content.slogan || defaultContactContent.slogan;
  const tagline = content.tagline || defaultContactContent.tagline;

  const primaryWhatsapp = whatsappNumbers[0] || '0745694499';
  const cleanWhatsappDigits = primaryWhatsapp.replace(/\s/g, '').replace(/^0/, '');

  const socialPlatforms = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      url: `https://wa.me/256${cleanWhatsappDigits}`,
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      )
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      url: content.tiktokUrl || 'https://www.tiktok.com/@natalinteriors',
      icon: (
        <svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 1.36-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
        </svg>
      )
    },
    {
      id: 'facebook',
      name: 'Facebook',
      url: content.facebookUrl || 'https://www.facebook.com/natalinteriordesign',
      icon: <Facebook size={22} className="stroke-[2.4]" />
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      url: content.linkedinUrl || 'https://www.linkedin.com/company/natal-interior-design-construction',
      icon: <Linkedin size={22} className="stroke-[2.4]" />
    }
  ];

  const handleSocialClick = (e: React.MouseEvent<HTMLAnchorElement>, social: typeof socialPlatforms[0]) => {
    e.preventDefault();
    if (reactingSocialId) return;

    setReactingSocialId(social.id);

    // Provide visual gold reaction for 320ms before navigating
    setTimeout(() => {
      window.open(social.url, '_blank', 'noopener,noreferrer');
      setTimeout(() => {
        setReactingSocialId(null);
      }, 250);
    }, 320);
  };

  return (
    <footer className="bg-gradient-to-b from-[#111111] via-[#080808] to-black-pure pt-8 sm:pt-12 pb-6 sm:pb-8 border-t-2 border-gold shadow-[0_-15px_40px_rgba(212,175,55,0.15)] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Gold Slogan Ribbon */}
        <div className="bg-gradient-to-r from-gold/25 via-gold/45 to-gold/25 border-2 border-gold py-3.5 sm:py-4 px-4 sm:px-6 text-center mb-7 sm:mb-9 rounded-md shadow-[0_0_30px_rgba(212,175,55,0.25)]">
          <p className="font-heading text-sm sm:text-base md:text-lg font-extrabold tracking-[0.25em] text-white uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            {companyDetails.slogan}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7 sm:gap-8 lg:gap-10 mb-8 sm:mb-10">
          
          {/* Column 1: Brand, Description, Contacts, Socials */}
          <div className="flex flex-col justify-between">
            <div>
              <NatalLogo className="h-11 mb-5" />
              <p className="text-white text-xs sm:text-sm leading-relaxed mb-6 font-medium">
                {companyDetails.description}
              </p>
              
              {/* Contact Information Cards */}
              <div className="space-y-3.5 mb-6">
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
                  className="flex items-center gap-3.5 p-3.5 rounded-lg bg-black-rich border-2 border-gold/70 hover:border-gold hover:bg-gold/15 hover:shadow-[0_0_22px_rgba(212,175,55,0.4)] active:scale-[0.98] transition-all group shadow-lg"
                >
                  <div className="w-11 h-11 rounded-full bg-gold/25 border-2 border-gold flex items-center justify-center text-gold group-hover:bg-gold group-hover:text-black-pure group-hover:scale-110 shadow-[0_0_15px_rgba(212,175,55,0.45)] transition-all shrink-0">
                    <Phone size={19} className="stroke-[2.6]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] uppercase font-mono font-extrabold tracking-widest text-gold block mb-0.5">Phone Consultation</span>
                    <span className="text-white font-mono text-sm sm:text-base font-extrabold tracking-wide group-hover:text-gold transition-colors block truncate">
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
                  className="flex items-center gap-3.5 p-3.5 rounded-lg bg-black-rich border-2 border-gold/70 hover:border-gold hover:bg-gold/15 hover:shadow-[0_0_22px_rgba(212,175,55,0.4)] active:scale-[0.98] transition-all group shadow-lg"
                >
                  <div className="w-11 h-11 rounded-full bg-gold/25 border-2 border-gold flex items-center justify-center text-gold group-hover:bg-gold group-hover:text-black-pure group-hover:scale-110 shadow-[0_0_15px_rgba(212,175,55,0.45)] transition-all shrink-0">
                    <MessageSquare size={19} className="stroke-[2.6]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] uppercase font-mono font-extrabold tracking-widest text-gold block mb-0.5">Direct WhatsApp</span>
                    <span className="text-white font-mono text-sm sm:text-base font-extrabold tracking-wide group-hover:text-gold transition-colors block truncate">
                      {whatsappNumbers.join(" / ")}
                    </span>
                  </div>
                </a>
              </div>
            </div>

            {/* Social Media Links with high-contrast prominent badges */}
            <div>
              <span className="text-xs uppercase tracking-widest text-gold font-extrabold mb-3.5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gold inline-block animate-pulse shadow-[0_0_8px_rgba(212,175,55,0.9)]"></span>
                Connect With Us
              </span>
              <div className="flex items-center gap-3.5 flex-wrap">
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
                      className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-200 cursor-pointer shadow-[0_0_18px_rgba(212,175,55,0.35)] ${
                        isReacting 
                          ? 'bg-gold text-black-pure border-gold shadow-[0_0_30px_rgba(212,175,55,1)] scale-115 ring-2 ring-gold'
                          : 'bg-black-rich border-gold text-gold hover:text-black-pure hover:bg-gold hover:scale-110 active:scale-95'
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
            <h6 className="uppercase tracking-wider text-sm sm:text-base mb-5 font-heading font-extrabold text-gold flex items-center gap-2 border-b-2 border-gold/50 pb-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-gold inline-block shadow-[0_0_10px_rgba(212,175,55,0.9)]"></span>
              Quick Navigation
            </h6>
            <ul className="space-y-2.5">
              {[
                { name: 'Home', href: '#home' },
                { name: 'About Us', href: '#about' },
                { name: 'Services', href: '#services' },
                { name: 'All Services Directory', href: '#all-services' },
                { name: 'Featured Showcase', href: '#showcase' },
                { name: 'Project Portfolio', href: '#projects' },
                { name: 'Why Choose Us', href: '#why-us' },
                { name: 'Process', href: '#process' },
                { name: 'Request Quote', href: '#quote' },
              ].map((link) => (
                <li key={link.name}>
                  <a 
                    href={link.href} 
                    className="text-white hover:text-gold text-xs sm:text-sm font-semibold transition-all uppercase tracking-wider flex items-center gap-2.5 group py-1.5"
                  >
                    <ChevronRight size={16} className="text-gold group-hover:text-gold group-hover:translate-x-1.5 transition-all shrink-0 stroke-[2.5]" />
                    <span className="group-hover:translate-x-1 transition-transform">{link.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Service Pages */}
          <div>
            <h6 className="uppercase tracking-wider text-sm sm:text-base mb-5 font-heading font-extrabold text-gold flex items-center gap-2 border-b-2 border-gold/50 pb-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-gold inline-block shadow-[0_0_10px_rgba(212,175,55,0.9)]"></span>
              Our Service Pages
            </h6>
            <ul className="space-y-2.5 text-xs sm:text-sm">
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
                    className="text-white hover:text-gold transition-all flex items-center gap-2.5 group py-1.5 font-semibold"
                  >
                    <span className="w-2 h-2 rounded-full bg-gold group-hover:scale-125 transition-all shrink-0 shadow-[0_0_8px_rgba(212,175,55,0.8)]"></span>
                    <span className="group-hover:translate-x-1 transition-transform">{serviceItem.name}</span>
                  </a>
                </li>
              ))}
              <li className="pt-3">
                <a 
                  href="#all-services" 
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-gold-dark via-gold to-yellow-300 text-black-pure hover:brightness-110 active:scale-95 text-xs sm:text-sm font-bold font-mono uppercase tracking-wider py-2.5 px-4 rounded border border-gold shadow-[0_0_18px_rgba(212,175,55,0.4)] transition-all"
                >
                  <span>View All Services Directory</span>
                  <ArrowRight size={15} className="shrink-0 stroke-[2.5]" />
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Direct Inquiry & Location */}
          <div>
            <h6 className="uppercase tracking-wider text-sm sm:text-base mb-5 font-heading font-extrabold text-gold flex items-center gap-2 border-b-2 border-gold/50 pb-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-gold inline-block shadow-[0_0_10px_rgba(212,175,55,0.9)]"></span>
              Direct Inquiry
            </h6>
            <p className="text-white text-xs sm:text-sm mb-4 leading-relaxed font-medium">
              Connect directly with our lead architect or site project director:
            </p>
            
            <a
              href={`https://wa.me/256${companyDetails.whatsappNumbers[0].replace(/[^0-9]/g, '').replace(/^0/, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-gold-dark via-gold to-yellow-300 text-black-pure hover:brightness-110 text-xs sm:text-sm uppercase font-mono tracking-wider shadow-[0_0_25px_rgba(212,175,55,0.4)] transition-all w-full justify-center mb-5 rounded shadow-lg group font-extrabold active:scale-[0.98] border border-gold"
            >
              <MessageSquare size={19} className="text-black-pure group-hover:scale-110 transition-transform shrink-0 stroke-[2.6]" />
              <span className="truncate">WhatsApp: {companyDetails.whatsappNumbers[0]}</span>
            </a>

            <div className="space-y-3.5 pt-1">
              {/* Location Card */}
              <div className="flex items-center gap-3.5 p-3.5 rounded-lg bg-black-rich border-2 border-gold/70 hover:border-gold transition-all shadow-md">
                <div className="w-11 h-11 rounded-full bg-gold/25 border-2 border-gold flex items-center justify-center text-gold shrink-0 shadow-[0_0_14px_rgba(212,175,55,0.4)]">
                  <MapPin size={18} className="stroke-[2.6]" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] uppercase font-mono font-extrabold tracking-widest text-gold block mb-0.5">Physical Atelier</span>
                  <span className="text-white text-xs sm:text-sm font-bold block leading-snug">{companyDetails.location}</span>
                </div>
              </div>
              
              {/* Email Card */}
              <div className="flex items-center gap-3.5 p-3.5 rounded-lg bg-black-rich border-2 border-gold/70 hover:border-gold transition-all shadow-md">
                <div className="w-11 h-11 rounded-full bg-gold/25 border-2 border-gold flex items-center justify-center text-gold shrink-0 shadow-[0_0_14px_rgba(212,175,55,0.4)]">
                  <Mail size={18} className="stroke-[2.6]" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] uppercase font-mono font-extrabold tracking-widest text-gold block mb-0.5">Official Inquiries</span>
                  <a href={`mailto:${companyDetails.email}`} className="text-white hover:text-gold font-mono text-xs sm:text-sm font-extrabold transition-colors block truncate">
                    {companyDetails.email}
                  </a>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Copyright & Tagline */}
        <div className="border-t-2 border-gold/40 pt-5 sm:pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs sm:text-sm">
          <p className="text-white font-medium">
            &copy; {new Date().getFullYear()} <span className="text-gold font-bold">{companyDetails.name}</span>. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-gold font-mono text-xs sm:text-sm tracking-wider font-semibold">
            <span className="text-white font-bold">{companyDetails.tagline}</span>
            <span className="text-gold/60">•</span>
            <a 
              href="#auth" 
              className="text-gold hover:text-black-pure bg-gold/20 hover:bg-gold border-2 border-gold px-3.5 py-1.5 rounded transition-all flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest font-extrabold shadow-[0_0_15px_rgba(212,175,55,0.3)]"
              title="Site Owner Admin Portal"
            >
              <span>👑</span>
              <span>Admin Sign In</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
