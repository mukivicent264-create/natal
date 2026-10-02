import { motion, AnimatePresence } from 'motion/react';
import { Phone, MessageSquare, MapPin, Mail, Send, CheckCircle, ArrowLeft, ChevronDown, Check, Upload, Paperclip, FileText, X, Video, Image as ImageIcon } from 'lucide-react';
import { companyDetails } from '../data';
import React, { useState, useRef, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { syncUserRecord, recordUserActivity, compressImageFile, readFileAsDataUrl, storeSafeMediaAssetInCloud, captureVideoThumbnail } from '../utils';

interface QuotePageProps {
  onNavigateHome: (sectionId?: string) => void;
}

const serviceOptions = [
  { value: "Gypsum Ceilings & Interior Finishing", label: "Gypsum & PVC Ceilings" },
  { value: "Kitchen Cabinets & Woodwork", label: "Kitchen Cabinets & Wardrobes" },
  { value: "TV Unit Design", label: "TV Unit Design" },
  { value: "Construction & Tiling", label: "Tiling, Stone Work & Construction" },
  { value: "Electrical Services", label: "Electrical & Lighting" }
];

export default function QuotePage({ onNavigateHome }: QuotePageProps) {
  const [submitted, setSubmitted] = useState(false);
  const [selectedService, setSelectedService] = useState(serviceOptions[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [details, setDetails] = useState('');
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    type: string;
    size: number;
    sizeFormatted: string;
    thumbnail?: string;
    mediaId?: string;
    data: string;
  } | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleFileAttachmentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    try {
      const sizeKb = (file.size / 1024).toFixed(1) + ' KB';
      const sizeMb = file.size > 1024 * 1024 ? (file.size / (1024 * 1024)).toFixed(2) + ' MB' : sizeKb;

      if (file.type.startsWith('image/')) {
        // High quality compressed image
        const dataUrl = await compressImageFile(file, 1600, 1200, 0.82);
        // Also save to cloud media vault for safe multi-tier persistence
        const cloudMedia = await storeSafeMediaAssetInCloud({
          file,
          name: file.name,
          category: 'Client Project Photo',
          uploadedBy: fullName || 'Quotation Client'
        });
        setAttachedFile({
          name: file.name,
          type: 'image',
          size: file.size,
          sizeFormatted: sizeMb,
          thumbnail: dataUrl,
          mediaId: cloudMedia?.id,
          data: dataUrl
        });
      } else if (file.type.startsWith('video/')) {
        // Safe video capture: generate poster thumbnail and store via chunked cloud media
        const thumb = await captureVideoThumbnail(file);
        const cloudMedia = await storeSafeMediaAssetInCloud({
          file,
          name: file.name,
          category: 'Client Project Video',
          uploadedBy: fullName || 'Quotation Client'
        });
        setAttachedFile({
          name: file.name,
          type: 'video',
          size: file.size,
          sizeFormatted: sizeMb,
          thumbnail: thumb,
          mediaId: cloudMedia?.id,
          data: cloudMedia?.url || ''
        });
      } else {
        // Blueprint, floor plan, PDF or CAD document
        const cloudMedia = await storeSafeMediaAssetInCloud({
          file,
          name: file.name,
          category: 'Client Architectural Blueprint',
          uploadedBy: fullName || 'Quotation Client'
        });
        setAttachedFile({
          name: file.name,
          type: 'blueprint',
          size: file.size,
          sizeFormatted: sizeMb,
          thumbnail: '',
          mediaId: cloudMedia?.id,
          data: cloudMedia?.url || ''
        });
      }
    } catch (err) {
      console.warn("File attachment processing error:", err);
    } finally {
      setIsProcessingFile(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const leadData = {
      name: fullName,
      phone,
      email,
      service: selectedService.value,
      details,
      fileAttachment: attachedFile || undefined,
      createdAt: new Date().toISOString()
    };

    try {
      // Save to Firestore
      try {
        await addDoc(collection(db, 'leads'), {
          ...leadData,
          createdAt: serverTimestamp()
        });
      } catch (fbErr) {
        console.warn("Firestore leads sync error:", fbErr);
      }

      // Save to local leads cache
      const currentLocal = JSON.parse(localStorage.getItem('natal_local_leads') || '[]');
      localStorage.setItem('natal_local_leads', JSON.stringify([{ id: 'lead_' + Date.now(), ...leadData }, ...currentLocal]));

      // Save directly to the Admin Dashboard Users directory with quotation activity
      await syncUserRecord({
        name: fullName,
        email: email,
        phone: phone,
        source: 'Quotation Form',
        service: selectedService.value,
        details: details,
        role: 'Client Lead',
        status: 'Pending Consultation',
        initialActivity: {
          type: 'quotation',
          title: `Quotation Requested: ${selectedService.value}`,
          description: `Submitted project quotation request for ${selectedService.value}.${details ? ` Details: "${details}"` : ''}${attachedFile ? ` [Attached Plan/File: ${attachedFile.name}]` : ''}`,
          metadata: {
            service: selectedService.value,
            phone: phone,
            details: details,
            fileName: attachedFile?.name
          }
        }
      });

      setSubmitted(true);
      setFullName('');
      setPhone('');
      setEmail('');
      setDetails('');
      setAttachedFile(null);
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      console.error(err);
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-black-rich text-white pb-24">
      {/* Full-Width Header in Luxury Black & Gold Aesthetic */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative pt-4 pb-6 sm:pt-6 sm:pb-8 px-4 sm:px-8 border-b border-gold/30 bg-black-pure overflow-hidden w-full mb-6 sm:mb-8"
      >
        {/* Ambient Gold Radial Backgrounds */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold/20 via-black-pure/90 to-transparent blur-3xl pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none"></div>

        <div className="relative z-10 max-w-5xl mx-auto">
          {/* Top Navigation with Arrow Only */}
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <button
              onClick={() => onNavigateHome()}
              className="text-gold hover:text-yellow-200 transition-colors group cursor-pointer p-1"
              aria-label="Go back to home"
              title="Go back"
            >
              <ArrowLeft size={24} className="group-hover:-translate-x-1.5 transition-transform" />
            </button>
          </div>

          {/* Hero Content */}
          <div className="text-left sm:text-center">
            {/* Eyebrow Label */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-1.5 text-gold uppercase tracking-[0.2em] sm:tracking-[0.25em] text-[9px] sm:text-[11px] font-bold mb-2 sm:mb-3 bg-gold/10 px-2.5 sm:px-3 py-1 border border-gold/30"
            >
              <span className="inline-block w-1.5 h-1.5 bg-gold rounded-full mr-1.5"></span>
              <span>Direct Connect</span>
            </motion.div>

            {/* Headline with Mobile-First Dynamic Line Layout */}
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-heading font-bold text-xl sm:text-2xl md:text-3xl text-white mb-2 leading-tight tracking-tight"
            >
              Request A Free{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold via-yellow-200 to-amber-500 italic block xs:inline mt-0.5 sm:mt-0 drop-shadow-[0_2px_15px_rgba(212,175,55,0.3)]">
                Quotation
              </span>
            </motion.h1>

            {/* Description with Gold Accent Rule on Mobile */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative max-w-2xl mx-auto text-left sm:text-center pl-3 sm:pl-0 border-l-2 border-gold/70 sm:border-l-0"
            >
              <p className="text-gray-300 font-light leading-relaxed text-xs sm:text-sm">
                Ready to bring your vision to life? Provide us with a few details about your project, and our team will get back to you with a comprehensive, no-obligation estimate.
              </p>
            </motion.div>

            {/* 4 Importance Metric Cards */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 max-w-4xl mx-auto pt-4 sm:pt-5 mt-4 sm:mt-5 border-t border-gold/20"
            >
              <div className="bg-black-rich/90 border border-gold/30 p-2 sm:p-2.5 text-center hover:border-gold transition-colors flex flex-col items-center justify-center gap-0.5">
                <span className="block text-gold font-heading text-sm sm:text-base font-bold leading-tight">Precise Cost</span>
                <span className="text-[8px] sm:text-[9px] text-gray-300 uppercase tracking-wider font-mono">No Hidden Fees</span>
              </div>
              <div className="bg-black-rich/90 border border-gold/30 p-2 sm:p-2.5 text-center hover:border-gold transition-colors flex flex-col items-center justify-center gap-0.5">
                <span className="block text-gold font-heading text-sm sm:text-base font-bold leading-tight">Tailored Plan</span>
                <span className="text-[8px] sm:text-[9px] text-gray-300 uppercase tracking-wider font-mono">Custom Solutions</span>
              </div>
              <div className="bg-black-rich/90 border border-gold/30 p-2 sm:p-2.5 text-center hover:border-gold transition-colors flex flex-col items-center justify-center gap-0.5">
                <span className="block text-gold font-heading text-sm sm:text-base font-bold leading-tight">Clear Timeline</span>
                <span className="text-[8px] sm:text-[9px] text-gray-300 uppercase tracking-wider font-mono">Project Schedule</span>
              </div>
              <div className="bg-black-rich/90 border border-gold/30 p-2 sm:p-2.5 text-center hover:border-gold transition-colors flex flex-col items-center justify-center gap-0.5">
                <span className="block text-gold font-heading text-sm sm:text-base font-bold leading-tight">Free Advice</span>
                <span className="text-[8px] sm:text-[9px] text-gray-300 uppercase tracking-wider font-mono">Zero Commitment</span>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
      
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Contact Strip Banner Inspired directly by the bottom banner of the business card */}
        <div className="bg-black-pure border border-gold/40 rounded-none p-6 md:p-8 mb-16 shadow-2xl">
          <div className="grid md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-gold/20">
            
            {/* CALL US */}
            <div className="flex items-center gap-4 pt-4 md:pt-0">
              <div className="w-14 h-14 rounded-full bg-gold/10 border border-gold flex items-center justify-center text-gold flex-shrink-0">
                <Phone size={24} />
              </div>
              <div>
                <span className="text-[10px] text-gold uppercase tracking-[0.2em] font-bold block mb-1">CALL US DIRECTLY</span>
                {companyDetails.phoneNumbers.map(num => (
                  <a 
                    key={num} 
                    href={`tel:${num.replace(/\s/g, '')}`}
                    onClick={() => {
                      recordUserActivity({
                        type: 'call',
                        title: 'Phone Consultation Dialed',
                        description: `User clicked to call ${num} directly from Quote Page.`,
                        metadata: { phoneNumber: num, page: 'Quote Page' }
                      });
                    }}
                    className="block text-white font-mono font-bold text-sm md:text-base hover:text-gold transition-colors"
                  >
                    {num}
                  </a>
                ))}
              </div>
            </div>

            {/* WHATSAPP */}
            <div className="flex items-center gap-4 pt-4 md:pt-0 md:pl-8">
              <div className="w-14 h-14 rounded-full bg-gold/10 border border-gold flex items-center justify-center text-gold flex-shrink-0">
                <MessageSquare size={24} />
              </div>
              <div>
                <span className="text-[10px] text-gold uppercase tracking-[0.2em] font-bold block mb-1">WHATSAPP INQUIRIES</span>
                {companyDetails.whatsappNumbers.map(num => (
                  <a 
                    key={num} 
                    href={`https://wa.me/256${num.replace(/[^0-9]/g, '').replace(/^0/, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => {
                      recordUserActivity({
                        type: 'whatsapp',
                        title: 'WhatsApp Inquiry Initiated',
                        description: `User opened direct WhatsApp chat with ${num} from Quote Page.`,
                        metadata: { whatsappNumber: num, page: 'Quote Page' }
                      });
                    }}
                    className="block text-white font-mono font-bold text-sm md:text-base hover:text-gold transition-colors"
                  >
                    {num}
                  </a>
                ))}
              </div>
            </div>

            {/* LOCATION */}
            <div className="flex items-center gap-4 pt-4 md:pt-0 md:pl-8">
              <div className="w-14 h-14 rounded-full bg-gold/10 border border-gold flex items-center justify-center text-gold flex-shrink-0">
                <MapPin size={24} />
              </div>
              <div>
                <span className="text-[10px] text-gold uppercase tracking-[0.2em] font-bold block mb-1">OFFICE LOCATION</span>
                <p className="text-white font-medium text-sm">
                  {companyDetails.location}
                </p>
                <p className="text-gray-400 text-xs mt-0.5">Commercial & Residential Site Services</p>
              </div>
        </div>
      </div>
        </div>

        {/* Quotation Form Grid */}
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          
          <div className="lg:col-span-5 bg-black-rich border border-gold/30 p-8">
            <h4 className="font-heading text-2xl text-white font-bold mb-4">Why Request A Quote Today?</h4>
            <p className="text-gray-300 text-sm leading-relaxed mb-6 font-light">
              We provide transparent pricing, on-site measurement consultations, and 3D architectural interior design previews before construction begins.
            </p>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 text-xs text-gray-200 uppercase tracking-wider font-medium">
                <CheckCircle size={16} className="text-gold" />
                <span>Free On-Site Inspection & Measurements</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-200 uppercase tracking-wider font-medium">
                <CheckCircle size={16} className="text-gold" />
                <span>Custom Material & Budget Estimates</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-200 uppercase tracking-wider font-medium">
                <CheckCircle size={16} className="text-gold" />
                <span>Guaranteed Project Delivery Schedule</span>
              </div>
            </div>

            <div className="p-4 bg-black-pure border-l-2 border-gold">
              <span className="text-[10px] uppercase text-gold tracking-widest font-mono block">OUR SLOGAN</span>
              <p className="font-heading text-lg font-bold text-white mt-1">"{companyDetails.slogan}"</p>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white/5 backdrop-blur-xl border border-gold/50 p-8 md:p-12 rounded-none shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            
              <form onSubmit={handleSubmit} className="space-y-7">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-300 mb-2.5 font-semibold">Full Name *</label>
                    <input 
                      required 
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe" 
                      className="w-full bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-gold/50 focus:border-gold rounded-none px-5 py-4 text-white text-sm focus:outline-none transition-all shadow-inner placeholder:text-gray-400" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-300 mb-2.5 font-semibold">Phone Number *</label>
                    <input 
                      required 
                      type="tel" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0700 000 000" 
                      className="w-full bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-gold/50 focus:border-gold rounded-none px-5 py-4 text-white text-sm focus:outline-none transition-all shadow-inner placeholder:text-gray-400" 
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-300 mb-2.5 font-semibold">Email Address</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="client@example.com" 
                      className="w-full bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-gold/50 focus:border-gold rounded-none px-5 py-4 text-white text-sm focus:outline-none transition-all shadow-inner placeholder:text-gray-400" 
                    />
                  </div>
                  <div ref={dropdownRef}>
                    <label className="block text-xs uppercase tracking-widest text-gray-300 mb-2.5 font-semibold">Select Service *</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-gold/50 focus:border-gold rounded-none px-5 py-4 text-white text-sm focus:outline-none transition-all shadow-inner cursor-pointer flex items-center justify-between text-left"
                      >
                        <span>{selectedService.label}</span>
                        <ChevronDown size={18} className={`text-gold transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {isDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                            className="absolute left-0 right-0 top-full mt-1.5 bg-black border border-gold/50 shadow-[0_10px_30px_rgba(0,0,0,0.9)] z-40 overflow-hidden"
                          >
                            <div className="py-1">
                              {serviceOptions.map((option) => (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => {
                                    setSelectedService(option);
                                    setIsDropdownOpen(false);
                                  }}
                                  className={`w-full px-5 py-3.5 text-left text-sm cursor-pointer transition-colors flex items-center justify-between ${
                                    selectedService.value === option.value
                                      ? 'bg-gold/20 text-gold font-semibold'
                                      : 'text-white hover:bg-white/10 hover:text-gold'
                                  }`}
                                >
                                  <span>{option.label}</span>
                                  {selectedService.value === option.value && (
                                    <Check size={16} className="text-gold" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <input type="hidden" name="service" value={selectedService.value} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-300 mb-2.5 font-semibold">Project Scope & Details</label>
                  <textarea 
                    rows={4} 
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Describe your room dimensions, project location, or specific requirements..." 
                    className="w-full bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-gold/50 focus:border-gold rounded-none px-5 py-4 text-white text-sm focus:outline-none transition-all shadow-inner resize-none placeholder:text-gray-400"
                  />
                </div>

                {/* Upload Architectural Plans, Site Photos or Walkthrough Video */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs uppercase tracking-widest text-gray-300 font-semibold flex items-center gap-2">
                      <Paperclip size={14} className="text-gold" />
                      Attach Plans, Photos or Walkthrough Video
                    </label>
                    <span className="text-[10px] font-mono text-gold/70 uppercase">Optional • Safe Cloud Storage</span>
                  </div>

                  {!attachedFile ? (
                    <label className="relative flex flex-col items-center justify-center p-5 border border-dashed border-gold/40 hover:border-gold bg-black-pure/40 hover:bg-gold/5 transition-all cursor-pointer group">
                      <input 
                        type="file" 
                        accept="image/*,video/mp4,video/webm,video/quicktime,.pdf,.dwg,.dxf"
                        onChange={handleFileAttachmentChange}
                        disabled={isProcessingFile}
                        className="sr-only" 
                      />
                      {isProcessingFile ? (
                        <div className="flex items-center gap-3 py-2">
                          <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-xs font-mono text-gold animate-pulse">Safely encrypting and uploading to Cloud Storage...</span>
                        </div>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold mb-2 group-hover:scale-110 transition-transform">
                            <Upload size={18} />
                          </div>
                          <p className="text-xs text-white font-medium text-center">
                            Click to upload <span className="text-gold">Floor Plan, Photo or Video Walkthrough</span>
                          </p>
                          <p className="text-[10px] font-mono text-gray-400 mt-1 text-center">
                            Supports JPG, PNG, MP4, MOV, WebM, PDF, CAD (Saved securely in cloud)
                          </p>
                        </>
                      )}
                    </label>
                  ) : (
                    <div className="flex items-center justify-between p-3.5 bg-black-pure border border-gold/50 shadow-md">
                      <div className="flex items-center gap-3 overflow-hidden">
                        {attachedFile.type === 'image' && attachedFile.thumbnail ? (
                          <img src={attachedFile.thumbnail} alt={attachedFile.name} className="w-12 h-12 object-cover border border-gold/40 shrink-0" />
                        ) : attachedFile.type === 'video' ? (
                          <div className="w-12 h-12 relative bg-black border border-gold/40 shrink-0 overflow-hidden flex items-center justify-center">
                            {attachedFile.thumbnail ? (
                              <img src={attachedFile.thumbnail} alt={attachedFile.name} className="w-full h-full object-cover opacity-70" />
                            ) : null}
                            <Video size={16} className="text-gold relative z-10" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 bg-gold/10 border border-gold/40 flex items-center justify-center text-gold shrink-0">
                            <FileText size={20} />
                          </div>
                        )}
                        <div className="overflow-hidden min-w-0">
                          <p className="text-xs text-white font-semibold truncate">{attachedFile.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono text-gold uppercase px-1.5 py-0.2 bg-gold/10 border border-gold/30">
                              {attachedFile.type === 'video' ? 'Video Walkthrough' : attachedFile.type === 'image' ? 'Site Photo' : 'Architectural Plan'}
                            </span>
                            <span className="text-[10px] font-mono text-gray-400">{attachedFile.sizeFormatted}</span>
                            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                              <CheckCircle size={10} /> Cloud Secured
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachedFile(null)}
                        className="text-gray-400 hover:text-red-400 p-1.5 transition-colors cursor-pointer shrink-0"
                        title="Remove attached file"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button type="submit" className="w-full py-2.5 sm:py-3 px-4 sm:px-6 bg-gold hover:bg-gold-light text-black-pure uppercase tracking-wider font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_6px_20px_rgba(212,175,55,0.25)] rounded-sm hover:scale-[1.01] active:scale-95">
                    <Send size={15} className="flex-shrink-0" />
                    <span className="whitespace-nowrap">Submit Quote</span>
                  </button>
                </div>
              </form>
          </div>

        </div>

      </div>
      <AnimatePresence>
        {submitted && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black-pure/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-black-rich border border-gold/30 p-8 md:p-12 rounded-none shadow-[0_20px_50px_rgba(0,0,0,0.8)] max-w-lg w-full text-center relative"
            >
              <div className="w-24 h-24 rounded-full bg-gold/20 border-2 border-gold flex items-center justify-center text-gold mx-auto mb-6 shadow-[0_0_40px_rgba(212,175,55,0.4)]">
                <CheckCircle size={48} />
              </div>
              <h4 className="font-heading text-2xl md:text-4xl text-white font-bold mb-4">Request Received!</h4>
              <p className="text-gray-300 text-sm md:text-base leading-relaxed mb-8">
                Thank you for reaching out. Our project engineer will review your details and contact you via call or WhatsApp within the next 2 hours.
              </p>
              <button 
                onClick={() => setSubmitted(false)}
                className="w-full py-3.5 sm:py-4 px-4 sm:px-6 bg-gold hover:bg-gold-light text-black-pure uppercase tracking-wider sm:tracking-widest font-bold text-xs sm:text-sm transition-all rounded-none shadow-[0_10px_30px_rgba(212,175,55,0.25)] hover:scale-[1.01] active:scale-95 cursor-pointer"
              >
                Close Message
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
