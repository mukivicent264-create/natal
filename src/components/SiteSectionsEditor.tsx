import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, CheckCircle, RotateCcw, Upload, Image as ImageIcon, 
  Layers, Compass, ShieldCheck, Clock, MapPin, 
  Eye, Save, ExternalLink, Video, Film, Play, Pause, Volume2, VolumeX,
  Check, RefreshCw, SlidersHorizontal, Award, Type, Trash2
} from 'lucide-react';
import {
  BrandingContent, defaultBrandingContent,
  HeroContent, defaultHeroContent,
  AboutContent, defaultAboutContent,
  WhyUsContent, defaultWhyUsContent,
  ProcessContent, defaultProcessContent,
  StatsContent, defaultStatsContent,
  ContactContent, defaultContactContent,
  useSectionContent
} from '../siteContent';
import { compressImageFile, processLogoImageFile, storeSafeMediaAssetInCloud, captureVideoThumbnail } from '../utils';

type SectionKey = 'branding' | 'hero' | 'about' | 'why_us' | 'process' | 'stats' | 'contact';

interface SectionMeta {
  id: SectionKey;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const SECTIONS: SectionMeta[] = [
  { id: 'branding', label: 'Brand & Logo', icon: Award },
  { id: 'hero', label: 'Hero Section', icon: Sparkles },
  { id: 'about', label: 'About Atelier', icon: Compass },
  { id: 'why_us', label: 'Why Choose Us', icon: ShieldCheck },
  { id: 'process', label: 'The Process', icon: Layers },
  { id: 'stats', label: 'Key Milestones', icon: Clock },
  { id: 'contact', label: 'Studio & Contact', icon: MapPin },
];

export const SiteSectionsEditor: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SectionKey>('hero');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setSuccessNotice(msg);
    setTimeout(() => setSuccessNotice(null), 4500);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-white/10 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-gold tracking-widest uppercase">
            <span>Website Management</span>
            <span>·</span>
            <span>Content Architecture</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-white uppercase tracking-wider mt-1">
            Website Sections Editor
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-neutral-900 border border-white/15 hover:border-gold/50 text-neutral-300 hover:text-white transition-all text-xs font-mono uppercase tracking-wider flex items-center gap-2 rounded shadow-sm"
          >
            <Eye size={14} className="text-gold" />
            <span>View Live Site</span>
            <ExternalLink size={12} className="opacity-60" />
          </a>
        </div>
      </div>

      {/* Success Notification */}
      {successNotice && (
        <div className="px-4 py-3 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs rounded flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle size={15} className="text-emerald-400 shrink-0" />
            <span className="font-medium">{successNotice}</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400/80 uppercase tracking-wider">Saved</span>
        </div>
      )}

      {/* Section Selector Tabs */}
      <div className="bg-neutral-900/90 border border-white/10 p-1.5 rounded-lg flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {SECTIONS.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium tracking-wide whitespace-nowrap transition-all rounded cursor-pointer select-none ${
                isActive
                  ? 'bg-gold text-neutral-950 font-semibold shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-neutral-950' : 'text-gold'} />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Workspace Card */}
      <div className="bg-neutral-950/90 border border-gold/20 p-6 sm:p-8 rounded-lg shadow-xl">
        {activeSection === 'branding' && <BrandingSectionEditor onNotify={showNotification} />}
        {activeSection === 'hero' && <HeroSectionEditor onNotify={showNotification} />}
        {activeSection === 'about' && <AboutSectionEditor onNotify={showNotification} />}
        {activeSection === 'why_us' && <WhyUsSectionEditor onNotify={showNotification} />}
        {activeSection === 'process' && <ProcessSectionEditor onNotify={showNotification} />}
        {activeSection === 'stats' && <StatsSectionEditor onNotify={showNotification} />}
        {activeSection === 'contact' && <ContactSectionEditor onNotify={showNotification} />}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Reusable Clean Image File Uploader
// ---------------------------------------------------------------------------
interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  maxWidth?: number;
  maxHeight?: number;
}

const ImageUploadField: React.FC<ImageUploadFieldProps> = ({ 
  label, 
  value, 
  onChange,
  maxWidth = 1920,
  maxHeight = 1080 
}) => {
  const [isUrlMode, setIsUrlMode] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const compressedBase64 = await compressImageFile(file, maxWidth, maxHeight, 0.82);
      onChange(compressedBase64);
    } catch (err) {
      console.error('Image compression error:', err);
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (typeof ev.target?.result === 'string') {
          onChange(ev.target.result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-200">
          {label}
        </label>
        <button
          type="button"
          onClick={() => setIsUrlMode(!isUrlMode)}
          className="text-xs font-mono text-gold hover:underline cursor-pointer"
        >
          {isUrlMode ? 'Switch to Upload' : 'Paste Direct URL'}
        </button>
      </div>

      <div className="grid sm:grid-cols-12 gap-4 items-center">
        {/* Preview Container */}
        <div className="sm:col-span-4 aspect-video bg-neutral-900 border border-white/15 rounded relative overflow-hidden flex items-center justify-center group">
          {isCompressing ? (
            <div className="text-center p-3 text-gold flex flex-col items-center justify-center">
              <span className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin mb-2" />
              <span className="text-xs font-mono">Processing...</span>
            </div>
          ) : value ? (
            <>
              <img src={value} alt="Preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 text-center">
                <span className="text-xs text-white font-mono">Live Display Image</span>
              </div>
            </>
          ) : (
            <div className="text-center p-4 text-neutral-500">
              <ImageIcon size={22} className="mx-auto mb-1.5 opacity-40 text-neutral-400" />
              <span className="text-xs font-mono block">No image selected</span>
            </div>
          )}
        </div>

        {/* Action input area */}
        <div className="sm:col-span-8 space-y-3">
          {isUrlMode ? (
            <input
              type="url"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://..."
              className="w-full bg-neutral-900 border border-white/15 focus:border-gold px-3.5 py-2.5 text-xs text-white placeholder:text-neutral-500 rounded focus:outline-none font-mono"
            />
          ) : (
            <div
              onClick={() => inputRef.current?.click()}
              className="w-full border border-dashed border-white/20 hover:border-gold/60 bg-neutral-900/50 hover:bg-gold/5 p-4 rounded flex items-center justify-center gap-3 cursor-pointer transition-colors"
            >
              <Upload size={18} className="text-gold shrink-0" />
              <div className="text-left">
                <span className="text-xs text-neutral-200 font-medium block">
                  {isCompressing ? 'Compressing and uploading...' : 'Click to choose image file'}
                </span>
                <span className="text-[11px] text-neutral-400 font-mono block mt-0.5">
                  Optimized automatically for high-resolution screens
                </span>
              </div>
              <input 
                ref={inputRef}
                type="file" 
                accept="image/*" 
                disabled={isCompressing} 
                onChange={handleFile} 
                className="hidden" 
              />
            </div>
          )}

          {value && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                <CheckCircle size={13} />
                <span>Optimized & Active</span>
              </span>
              <button
                type="button"
                onClick={() => onChange('')}
                className="text-xs text-red-400 hover:text-red-300 font-mono cursor-pointer"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const HERO_VIDEO_PRESETS = [
  {
    id: 'preset-1',
    name: 'Open-Concept Penthouse',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-modern-apartment-with-an-open-concept-design-41005-large.mp4',
    poster: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&q=80&w=2560'
  },
  {
    id: 'preset-2',
    name: 'Luxury Residence & Ambient Glow',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-interior-of-a-luxurious-modern-house-42661-large.mp4',
    poster: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=2560'
  },
  {
    id: 'preset-3',
    name: 'Warm Architectural Living',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-living-room-with-modern-interior-design-41003-large.mp4',
    poster: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=2560'
  },
  {
    id: 'preset-4',
    name: 'Contemporary Kitchen Atelier',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-modern-kitchen-interior-with-island-and-stools-41004-large.mp4',
    poster: 'https://images.unsplash.com/photo-1600607686527-6fb886090705?auto=format&fit=crop&q=80&w=2560'
  }
];

// ---------------------------------------------------------------------------
// 0. BRAND IDENTITY & LOGO EDITOR
// ---------------------------------------------------------------------------
const BrandingSectionEditor: React.FC<{ onNotify: (msg: string) => void }> = ({ onNotify }) => {
  const { content, updateContent, resetToDefault, isSaving } = useSectionContent<BrandingContent>('branding', defaultBrandingContent);
  const [formData, setFormData] = useState<BrandingContent>(content);
  const [isUploading, setIsUploading] = useState(false);
  const [customLogoUrl, setCustomLogoUrl] = useState('');
  const [previewBg, setPreviewBg] = useState<'dark' | 'gold' | 'white'>('dark');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormData(content);
  }, [content]);

  const handleSave = async () => {
    try {
      await updateContent(formData);
      onNotify('Brand & Logo settings published live across all devices.');
    } catch (err: any) {
      alert('Failed to save brand settings: ' + err.message);
    }
  };

  const handleReset = async () => {
    if (confirm('Reset brand settings and logo back to defaults?')) {
      await resetToDefault();
      setFormData(defaultBrandingContent);
      onNotify('Brand identity restored to default.');
    }
  };

  const handleFileProcess = async (file: File) => {
    try {
      setIsUploading(true);
      const processedDataUrl = await processLogoImageFile(file, 800);

      try {
        await storeSafeMediaAssetInCloud({
          file,
          name: file.name.replace(/\.[^/.]+$/, "") + " (Official Website Logo)",
          category: 'Branding & Identity',
          uploadedBy: 'Administrator'
        });
      } catch (vaultErr) {
        console.warn('Vault archive notice:', vaultErr);
      }

      const nextData: BrandingContent = {
        ...formData,
        logoUrl: processedDataUrl,
        logoType: formData.logoType === 'text' ? 'both' : formData.logoType
      };

      setFormData(nextData);
      await updateContent(nextData);
      onNotify('Official logo uploaded and synced across desktop and mobile.');
    } catch (err: any) {
      alert('Failed to process logo file: ' + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveLogo = async () => {
    const nextData: BrandingContent = {
      ...formData,
      logoUrl: '',
      logoType: 'text'
    };
    setFormData(nextData);
    await updateContent(nextData);
    onNotify('Logo removed. Typographic mark restored.');
  };

  const handleApplyUrl = async () => {
    if (!customLogoUrl.trim()) return;
    const nextData: BrandingContent = {
      ...formData,
      logoUrl: customLogoUrl.trim(),
      logoType: formData.logoType === 'text' ? 'both' : formData.logoType
    };
    setFormData(nextData);
    await updateContent(nextData);
    setCustomLogoUrl('');
    onNotify('Logo URL applied.');
  };

  const currentHeight = formData.logoHeight || 44;

  return (
    <div className="space-y-6 text-left">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-4">
        <div>
          <h3 className="text-base font-heading font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Award size={16} className="text-gold" />
            Brand Identity & Logo Configuration
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            disabled={isSaving}
            className="px-3.5 py-2 bg-neutral-900 border border-white/15 hover:border-gold/40 text-neutral-300 hover:text-white text-xs font-mono uppercase tracking-wider rounded transition-colors cursor-pointer"
          >
            <RotateCcw size={13} className="inline mr-1.5" />
            Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 bg-gold hover:bg-gold-light active:bg-gold-dark text-neutral-950 font-bold text-xs uppercase tracking-wider rounded flex items-center gap-2 cursor-pointer shadow-sm transition-all"
          >
            {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Live Header Simulator */}
      <div className="bg-neutral-900/60 border border-white/10 p-5 rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-neutral-300 uppercase tracking-wider flex items-center gap-2">
            <Eye size={14} className="text-gold" />
            Live Header Preview
          </span>

          {/* Contrast Toggles */}
          <div className="flex items-center gap-1 bg-neutral-950 border border-white/10 p-1 rounded text-xs font-mono">
            {(['dark', 'gold', 'white'] as const).map((bg) => (
              <button
                key={bg}
                type="button"
                onClick={() => setPreviewBg(bg)}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer capitalize ${
                  previewBg === bg ? 'bg-gold text-neutral-950 font-semibold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {bg}
              </button>
            ))}
          </div>
        </div>

        {/* Mock Simulated Navbar */}
        <div 
          className={`border transition-all duration-300 p-4 rounded-md flex items-center justify-between ${
            previewBg === 'dark' 
              ? 'bg-neutral-950 border-gold/30 shadow-md' 
              : previewBg === 'gold'
              ? 'bg-gradient-to-r from-amber-950/80 via-neutral-950 to-amber-950/80 border-gold/50'
              : 'bg-white text-neutral-950 border-neutral-300 shadow-sm'
          }`}
        >
          {/* Logo Display */}
          <div className="shrink-0">
            {formData.logoUrl && formData.logoType === 'image' ? (
              <img 
                src={formData.logoUrl} 
                alt={formData.logoAltText || formData.companyName} 
                className="w-auto object-contain transition-all select-none"
                style={{ maxHeight: `${Math.min(Math.max(currentHeight, 26), 80)}px` }}
              />
            ) : formData.logoUrl && formData.logoType === 'both' ? (
              <div className="flex items-center gap-3">
                <img 
                  src={formData.logoUrl} 
                  alt={formData.logoAltText || formData.companyName} 
                  className="w-auto object-contain transition-all select-none shrink-0"
                  style={{ maxHeight: `${Math.min(Math.max(currentHeight, 24), 64)}px` }}
                />
                <div className="flex flex-col justify-center leading-tight">
                  <p className={`font-heading font-bold tracking-[0.14em] uppercase ${previewBg === 'white' ? 'text-neutral-950' : 'text-white'} text-sm sm:text-base`}>
                    {formData.companyName || "Natal Interior"}
                  </p>
                  <p className="tracking-[0.16em] text-gold uppercase font-medium text-[9px] mt-0.5">
                    {formData.tagline || "Design Construction"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col justify-center leading-none">
                <p className={`font-heading font-bold tracking-[0.15em] uppercase ${previewBg === 'white' ? 'text-neutral-950' : 'text-white'} text-sm sm:text-base`}>
                  {formData.companyName || "Natal Interior"}
                </p>
                <p className="tracking-[0.15em] text-gold uppercase font-medium text-[9px] mt-1">
                  {formData.tagline || "Design Construction"}
                </p>
              </div>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-5 text-xs font-mono tracking-widest text-neutral-400 select-none ml-6">
            <span className="text-gold font-semibold">HOME</span>
            <span>SERVICES</span>
            <span>ABOUT</span>
            <span>PORTFOLIO</span>
            <span>CONTACT</span>
          </div>

          <div className="hidden sm:block shrink-0 ml-4">
            <div className="px-3 py-1.5 border border-gold/50 text-gold text-xs font-mono uppercase tracking-widest rounded bg-gold/10">
              Request Quote
            </div>
          </div>
        </div>
      </div>

      {/* Display Format & Sizing + Logo Upload Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Format & Sizing */}
        <div className="lg:col-span-7 bg-neutral-900/60 border border-white/10 p-5 rounded-lg space-y-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-neutral-200 flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-gold" />
            Display Format
          </label>

          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'both', label: 'Dual Emblem', desc: 'Logo & Typography' },
              { id: 'image', label: 'Graphic Only', desc: 'Symbol Mark' },
              { id: 'text', label: 'Typography', desc: 'Lettering Only' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFormData({ ...formData, logoType: opt.id as any })}
                className={`p-3 text-left border rounded transition-all cursor-pointer ${
                  formData.logoType === opt.id
                    ? 'border-gold bg-gold/15 text-white'
                    : 'border-white/10 bg-neutral-950 text-neutral-400 hover:border-gold/30 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold uppercase tracking-wider ${formData.logoType === opt.id ? 'text-gold' : 'text-neutral-200'}`}>
                    {opt.label}
                  </span>
                  {formData.logoType === opt.id && <CheckCircle size={13} className="text-gold shrink-0" />}
                </div>
                <span className="text-[11px] text-neutral-400 block">{opt.desc}</span>
              </button>
            ))}
          </div>

          {/* Sizing Controls */}
          <div className="pt-3 border-t border-white/10 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-neutral-300">Logo Height:</span>
              <span className="font-bold text-gold">{currentHeight}px</span>
            </div>

            <div className="flex items-center gap-2">
              {[34, 44, 54, 66].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setFormData({ ...formData, logoHeight: val })}
                  className={`flex-1 py-1.5 text-xs font-mono rounded transition-all cursor-pointer ${
                    currentHeight === val
                      ? 'bg-gold text-neutral-950 font-bold'
                      : 'bg-neutral-950 border border-white/15 text-neutral-400 hover:text-white'
                  }`}
                >
                  {val}px
                </button>
              ))}
            </div>

            <input
              type="range"
              min="24"
              max="80"
              step="2"
              value={currentHeight}
              onChange={(e) => setFormData({ ...formData, logoHeight: parseInt(e.target.value, 10) })}
              className="w-full accent-[#D4AF37] cursor-pointer h-1.5 bg-neutral-950 rounded border border-white/15 mt-2"
            />
          </div>
        </div>

        {/* Logo Upload Zone */}
        <div className="lg:col-span-5 bg-neutral-900/60 border border-white/10 p-5 rounded-lg space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-200 flex items-center gap-2">
              <Upload size={14} className="text-gold" />
              Logo Asset
            </label>
            {formData.logoUrl && (
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="text-xs font-mono text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 size={12} />
                <span>Remove</span>
              </button>
            )}
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`border border-dashed rounded p-4 text-center transition-all flex flex-col items-center justify-center min-h-[140px] ${
              dragActive 
                ? 'border-gold bg-gold/10' 
                : formData.logoUrl
                ? 'border-gold/40 bg-neutral-950'
                : 'border-white/20 bg-neutral-950 hover:border-gold/40'
            }`}
          >
            {isUploading ? (
              <div className="py-4 flex flex-col items-center gap-2">
                <RefreshCw size={22} className="text-gold animate-spin" />
                <span className="text-xs font-mono text-white">Optimizing Logo...</span>
              </div>
            ) : formData.logoUrl ? (
              <div className="flex items-center gap-3 w-full">
                <div className="w-20 h-16 border border-gold/30 rounded flex items-center justify-center p-1.5 bg-neutral-900 shrink-0">
                  <img src={formData.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <span className="text-xs font-mono text-emerald-400 font-semibold block truncate">
                    Active Logo
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 px-3 py-1 bg-gold/20 hover:bg-gold hover:text-neutral-950 border border-gold/50 text-gold text-xs font-mono font-medium rounded transition-all cursor-pointer"
                  >
                    Replace Image
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-2">
                <Upload size={22} className="text-gold opacity-80" />
                <span className="text-xs text-white font-medium">Drop logo here or browse</span>
                <span className="text-[11px] text-neutral-400 font-mono">PNG (Transparent) · SVG · WebP</span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-1 px-4 py-1.5 bg-gold hover:bg-gold-light text-neutral-950 font-bold text-xs uppercase font-mono rounded cursor-pointer transition-colors"
                >
                  Upload File
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/svg+xml,image/webp,image/jpeg"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileProcess(e.target.files[0]);
                }
              }}
            />
          </div>

          {/* Quick URL input */}
          <div className="flex gap-2 pt-1">
            <input
              type="url"
              value={customLogoUrl}
              onChange={(e) => setCustomLogoUrl(e.target.value)}
              placeholder="Or paste image URL..."
              className="flex-1 bg-neutral-950 border border-white/15 focus:border-gold px-3 py-2 text-xs text-white font-mono focus:outline-none rounded"
            />
            <button
              type="button"
              onClick={handleApplyUrl}
              disabled={!customLogoUrl.trim()}
              className="px-3.5 py-2 bg-gold/20 hover:bg-gold hover:text-neutral-950 border border-gold/50 text-gold text-xs font-mono font-semibold rounded disabled:opacity-40 cursor-pointer transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Atelier Brand Typography */}
      <div className="bg-neutral-900/60 border border-white/10 p-5 rounded-lg space-y-4">
        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-200 flex items-center gap-2">
          <Type size={14} className="text-gold" />
          Atelier Typography
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-mono text-neutral-400 block mb-1.5">Company Name</label>
            <input
              type="text"
              value={formData.companyName || ''}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="Natal Interior"
              className="w-full bg-neutral-950 border border-white/15 focus:border-gold px-3.5 py-2.5 text-xs text-white focus:outline-none rounded"
            />
          </div>

          <div>
            <label className="text-xs font-mono text-neutral-400 block mb-1.5">Tagline</label>
            <input
              type="text"
              value={formData.tagline || ''}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              placeholder="Design Construction"
              className="w-full bg-neutral-950 border border-white/15 focus:border-gold px-3.5 py-2.5 text-xs text-white focus:outline-none rounded"
            />
          </div>

          <div>
            <label className="text-xs font-mono text-neutral-400 block mb-1.5">Logo Alt Text</label>
            <input
              type="text"
              value={formData.logoAltText || ''}
              onChange={(e) => setFormData({ ...formData, logoAltText: e.target.value })}
              placeholder="Natal Interior official logo"
              className="w-full bg-neutral-950 border border-white/15 focus:border-gold px-3.5 py-2.5 text-xs text-white focus:outline-none rounded"
            />
          </div>
        </div>
      </div>

      {/* Save Action Bar */}
      <div className="pt-4 border-t border-white/10 flex items-center justify-between">
        <span className="text-xs font-mono text-neutral-400">
          Changes sync live across all desktop and mobile views
        </span>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            disabled={isSaving}
            className="px-4 py-2 bg-neutral-900 border border-white/15 text-neutral-300 hover:text-white text-xs font-mono uppercase tracking-wider rounded cursor-pointer transition-colors"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 bg-gold hover:bg-gold-light active:bg-gold-dark text-neutral-950 font-bold text-xs uppercase tracking-wider rounded flex items-center gap-2 cursor-pointer shadow-sm transition-all"
          >
            {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 1. HERO SECTION EDITOR
// ---------------------------------------------------------------------------
const HeroSectionEditor: React.FC<{ onNotify: (msg: string) => void }> = ({ onNotify }) => {
  const { content, updateContent, resetToDefault, isSaving } = useSectionContent<HeroContent>('hero', defaultHeroContent);
  const [formData, setFormData] = useState<HeroContent>(content);
  const [cardCompressingIdx, setCardCompressingIdx] = useState<number | null>(null);
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [customVideoUrl, setCustomVideoUrl] = useState('');
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(true);
  const [isPreviewMuted, setIsPreviewMuted] = useState(true);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormData(content);
  }, [content]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await updateContent(formData);
    onNotify('Hero section content published live.');
  };

  const handleReset = async () => {
    if (confirm('Reset Hero Section to defaults?')) {
      await resetToDefault();
      setFormData(defaultHeroContent);
      onNotify('Hero Section reset to original default.');
    }
  };

  const handleBackgroundChange = async (url: string) => {
    const next = { ...formData, backgroundImage: url };
    setFormData(next);
    try {
      await updateContent(next);
      onNotify('Hero background image updated.');
    } catch (err: any) {
      console.warn('Auto-save error:', err);
    }
  };

  const handleMediaTypeToggle = async (mode: 'video' | 'image') => {
    const next: HeroContent = {
      ...formData,
      mediaType: mode,
      backgroundVideo: mode === 'video' ? (formData.backgroundVideo || defaultHeroContent.backgroundVideo) : formData.backgroundVideo
    };
    setFormData(next);
    try {
      await updateContent(next);
      onNotify(`Hero switched to ${mode === 'video' ? 'Video Loop' : 'Static Image'} mode.`);
    } catch (err: any) {
      console.warn('Media mode toggle error:', err);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsVideoUploading(true);
    try {
      let thumb = '';
      try {
        thumb = await captureVideoThumbnail(file);
      } catch (e) {
        console.warn('Could not extract thumbnail:', e);
      }

      const savedMedia = await storeSafeMediaAssetInCloud({
        file,
        name: file.name,
        category: 'Hero Background Video',
        uploadedBy: 'Administrator'
      });

      const videoUrl = savedMedia?.url || '';
      if (!videoUrl) throw new Error('Video encoding failed.');

      const next: HeroContent = {
        ...formData,
        backgroundVideo: videoUrl,
        mediaType: 'video',
        backgroundImage: thumb || formData.backgroundImage
      };

      setFormData(next);
      await updateContent(next);
      onNotify(`Hero video "${file.name}" uploaded and active.`);
    } catch (err: any) {
      console.error('Hero video upload error:', err);
      alert('Error uploading video: ' + (err?.message || String(err)));
    } finally {
      setIsVideoUploading(false);
      if (videoFileInputRef.current) videoFileInputRef.current.value = '';
    }
  };

  const handleSelectPreset = async (presetUrl: string, presetPoster: string, presetName: string) => {
    const next: HeroContent = {
      ...formData,
      backgroundVideo: presetUrl,
      mediaType: 'video',
      backgroundImage: presetPoster || formData.backgroundImage
    };
    setFormData(next);
    try {
      await updateContent(next);
      onNotify(`Hero video set to "${presetName}".`);
    } catch (err: any) {
      alert('Error applying video preset: ' + err.message);
    }
  };

  const handleApplyCustomVideoUrl = async () => {
    if (!customVideoUrl.trim()) return;
    const url = customVideoUrl.trim();
    const next: HeroContent = {
      ...formData,
      backgroundVideo: url,
      mediaType: 'video'
    };
    setFormData(next);
    try {
      await updateContent(next);
      onNotify('Custom video URL applied.');
      setCustomVideoUrl('');
    } catch (err: any) {
      alert('Error applying video URL: ' + err.message);
    }
  };

  const togglePreviewPlay = () => {
    if (previewVideoRef.current) {
      if (isPreviewPlaying) {
        previewVideoRef.current.pause();
        setIsPreviewPlaying(false);
      } else {
        previewVideoRef.current.play().catch(() => {});
        setIsPreviewPlaying(true);
      }
    }
  };

  const togglePreviewMute = () => {
    if (previewVideoRef.current) {
      const nextMuted = !isPreviewMuted;
      previewVideoRef.current.muted = nextMuted;
      setIsPreviewMuted(nextMuted);
    }
  };

  const updateCard = (index: number, key: 'img' | 'label', val: string) => {
    const nextCards = [...formData.cards];
    nextCards[index] = { ...nextCards[index], [key]: val };
    const next = { ...formData, cards: nextCards };
    setFormData(next);
    return next;
  };

  const handleCardFileUpload = async (idx: number, file: File) => {
    setCardCompressingIdx(idx);
    try {
      const compressed = await compressImageFile(file, 960, 640, 0.82);
      const nextCards = [...formData.cards];
      nextCards[idx] = { ...nextCards[idx], img: compressed };
      const next = { ...formData, cards: nextCards };
      setFormData(next);
      await updateContent(next);
      onNotify(`Hero card #${idx + 1} updated.`);
    } catch (err) {
      console.error('Card image compression error:', err);
      alert('Could not process this image file.');
    } finally {
      setCardCompressingIdx(null);
    }
  };

  const handleCardClear = async (idx: number) => {
    const nextCards = [...formData.cards];
    nextCards[idx] = { ...nextCards[idx], img: '' };
    const next = { ...formData, cards: nextCards };
    setFormData(next);
    try {
      await updateContent(next);
      onNotify(`Hero card #${idx + 1} image removed.`);
    } catch {}
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-4">
        <div>
          <h3 className="text-base font-heading font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles size={16} className="text-gold" />
            Hero Section Configuration
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 bg-neutral-900 border border-white/15 hover:border-gold/40 text-neutral-300 hover:text-white text-xs font-mono uppercase tracking-wider rounded transition-colors cursor-pointer"
          >
            <RotateCcw size={13} className="inline mr-1.5" />
            Reset
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 bg-gold hover:bg-gold-light active:bg-gold-dark text-neutral-950 font-bold text-xs uppercase tracking-wider rounded flex items-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50"
          >
            <Save size={13} />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Main 3-line Headline */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-neutral-300 font-semibold mb-1.5">
            Headline Line 1
          </label>
          <input
            type="text"
            value={formData.headline1}
            onChange={(e) => setFormData({ ...formData, headline1: e.target.value })}
            placeholder="WE DESIGN."
            className="w-full bg-neutral-900 border border-white/15 focus:border-gold px-3.5 py-2.5 text-xs text-white rounded focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-neutral-300 font-semibold mb-1.5">
            Headline Line 2
          </label>
          <input
            type="text"
            value={formData.headline2}
            onChange={(e) => setFormData({ ...formData, headline2: e.target.value })}
            placeholder="WE BUILD."
            className="w-full bg-neutral-900 border border-white/15 focus:border-gold px-3.5 py-2.5 text-xs text-white rounded focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-gold font-semibold mb-1.5">
            Headline Line 3 (Accent)
          </label>
          <input
            type="text"
            value={formData.headline3}
            onChange={(e) => setFormData({ ...formData, headline3: e.target.value })}
            placeholder="YOU ENJOY."
            className="w-full bg-neutral-900 border border-gold/40 focus:border-gold px-3.5 py-2.5 text-xs text-gold rounded focus:outline-none font-semibold"
            required
          />
        </div>
      </div>

      {/* Description Paragraph */}
      <div>
        <label className="block text-xs uppercase tracking-wider text-neutral-300 font-semibold mb-1.5">
          Hero Description
        </label>
        <textarea
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Summary of architectural solutions..."
          className="w-full bg-neutral-900 border border-white/15 focus:border-gold p-3.5 text-xs text-white rounded focus:outline-none resize-none leading-relaxed"
          required
        />
      </div>

      {/* Background Media Manager (Video vs Image) */}
      <div className="bg-neutral-900/60 border border-white/10 p-5 rounded-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/10 gap-3">
          <span className="text-xs font-semibold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
            <Film size={14} className="text-gold" />
            Background Visual Media
          </span>

          {/* Segmented Mode Control */}
          <div className="flex items-center p-1 bg-neutral-950 border border-white/15 rounded">
            <button
              type="button"
              onClick={() => handleMediaTypeToggle('video')}
              className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded transition-all flex items-center gap-1.5 cursor-pointer ${
                formData.mediaType !== 'image'
                  ? 'bg-gold text-neutral-950 font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Video size={13} />
              <span>Cinematic Video</span>
            </button>
            <button
              type="button"
              onClick={() => handleMediaTypeToggle('image')}
              className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded transition-all flex items-center gap-1.5 cursor-pointer ${
                formData.mediaType === 'image'
                  ? 'bg-gold text-neutral-950 font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <ImageIcon size={13} />
              <span>Static Photo</span>
            </button>
          </div>
        </div>

        {formData.mediaType !== 'image' ? (
          <div className="space-y-4">
            {/* Live Video Preview Box */}
            <div className="bg-neutral-950 border border-white/15 p-4 rounded-md space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <Play size={12} className="fill-gold text-gold" />
                  Active Video Stream
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={togglePreviewPlay}
                    className="p-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded border border-white/10 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                  >
                    {isPreviewPlaying ? <Pause size={12} /> : <Play size={12} className="fill-current" />}
                    <span>{isPreviewPlaying ? 'Pause' : 'Play'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={togglePreviewMute}
                    className="p-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded border border-white/10 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                  >
                    {isPreviewMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                    <span>{isPreviewMuted ? 'Muted' : 'Unmuted'}</span>
                  </button>
                </div>
              </div>

              <div className="aspect-video w-full max-h-[280px] bg-neutral-900 border border-white/10 rounded overflow-hidden flex items-center justify-center">
                {formData.backgroundVideo ? (
                  <video
                    key={formData.backgroundVideo}
                    ref={previewVideoRef}
                    src={formData.backgroundVideo}
                    autoPlay
                    loop
                    muted={isPreviewMuted}
                    playsInline
                    poster={formData.backgroundImage}
                    className="w-full h-full object-cover"
                  >
                    <source src={formData.backgroundVideo} type="video/mp4" />
                    <source src={formData.backgroundVideo} type="video/webm" />
                  </video>
                ) : (
                  <div className="text-center p-6 text-neutral-500">
                    <Video size={32} className="mx-auto mb-2 opacity-40 text-gold" />
                    <span className="text-xs font-mono text-neutral-400">No background video assigned</span>
                  </div>
                )}
              </div>
            </div>

            {/* Video Presets */}
            <div className="space-y-2.5">
              <label className="text-xs font-mono uppercase tracking-wider text-neutral-300 block font-semibold">
                Curated Video Presets
              </label>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {HERO_VIDEO_PRESETS.map((preset) => {
                  const isCurrent = formData.backgroundVideo === preset.url;
                  return (
                    <div
                      key={preset.id}
                      className={`border p-2.5 rounded flex flex-col justify-between transition-all ${
                        isCurrent
                          ? 'bg-gold/15 border-gold shadow-sm'
                          : 'bg-neutral-950 border-white/10 hover:border-gold/40'
                      }`}
                    >
                      <div className="aspect-video w-full mb-2 overflow-hidden rounded bg-neutral-900 relative">
                        <img
                          src={preset.poster}
                          alt={preset.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Play size={16} className="text-white fill-white opacity-80" />
                        </div>
                      </div>

                      <h5 className="text-xs font-medium text-neutral-200 truncate mb-2">{preset.name}</h5>

                      <button
                        type="button"
                        onClick={() => handleSelectPreset(preset.url, preset.poster, preset.name)}
                        disabled={isCurrent}
                        className={`w-full py-1.5 text-xs font-mono uppercase tracking-wider rounded transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40 cursor-default'
                            : 'bg-neutral-900 hover:bg-gold text-neutral-300 hover:text-neutral-950 border border-white/15'
                        }`}
                      >
                        {isCurrent ? 'Active' : 'Select'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Direct Upload & URL */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div
                onClick={() => videoFileInputRef.current?.click()}
                className="border border-dashed border-white/20 hover:border-gold/50 bg-neutral-950 p-4 rounded flex items-center gap-3 cursor-pointer transition-colors"
              >
                <Upload size={18} className="text-gold shrink-0" />
                <div>
                  <span className="text-xs text-neutral-200 font-medium block">
                    {isVideoUploading ? 'Uploading...' : 'Upload Video File'}
                  </span>
                  <span className="text-[11px] text-neutral-400 font-mono">MP4, WebM, MOV</span>
                </div>
                <input
                  ref={videoFileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/*"
                  disabled={isVideoUploading}
                  onChange={handleVideoUpload}
                  className="hidden"
                />
              </div>

              <div className="flex gap-2">
                <input
                  type="url"
                  value={customVideoUrl}
                  onChange={(e) => setCustomVideoUrl(e.target.value)}
                  placeholder="Or paste video URL (MP4)..."
                  className="flex-1 bg-neutral-950 border border-white/15 focus:border-gold px-3 py-2 text-xs text-white rounded focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={handleApplyCustomVideoUrl}
                  disabled={!customVideoUrl.trim()}
                  className="px-4 py-2 bg-gold/20 hover:bg-gold hover:text-neutral-950 border border-gold/50 text-gold text-xs font-mono font-semibold rounded disabled:opacity-40 cursor-pointer transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Poster fallback image */}
            <div className="pt-2 border-t border-white/10">
              <ImageUploadField
                label="Fallback Poster Image (Shown while video loads)"
                value={formData.backgroundImage}
                onChange={handleBackgroundChange}
              />
            </div>
          </div>
        ) : (
          <ImageUploadField
            label="Hero Background Photograph"
            value={formData.backgroundImage}
            onChange={handleBackgroundChange}
          />
        )}
      </div>

      {/* Button Labels */}
      <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
        <div>
          <label className="block text-xs uppercase tracking-wider text-neutral-300 font-semibold mb-1.5">
            Primary Button Label
          </label>
          <input
            type="text"
            value={formData.primaryCtaText}
            onChange={(e) => setFormData({ ...formData, primaryCtaText: e.target.value })}
            placeholder="Request Quotation"
            className="w-full bg-neutral-900 border border-white/15 focus:border-gold px-3.5 py-2.5 text-xs text-white rounded focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-neutral-300 font-semibold mb-1.5">
            Secondary Button Label
          </label>
          <input
            type="text"
            value={formData.secondaryCtaText}
            onChange={(e) => setFormData({ ...formData, secondaryCtaText: e.target.value })}
            placeholder="Explore Showcase"
            className="w-full bg-neutral-900 border border-white/15 focus:border-gold px-3.5 py-2.5 text-xs text-white rounded focus:outline-none"
          />
        </div>
      </div>

      {/* 4 Quick Inspiration Cards at the Bottom */}
      <div className="pt-4 border-t border-white/10 space-y-4">
        <label className="block text-xs uppercase tracking-wider text-neutral-200 font-semibold flex items-center gap-2">
          <ImageIcon size={14} className="text-gold" />
          <span>Hero Bottom Showcase Cards (4 Columns)</span>
        </label>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {formData.cards.map((card, idx) => (
            <div key={idx} className="bg-neutral-900/60 border border-white/10 hover:border-gold/40 transition-colors p-4 rounded-md space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-gold">Card 0{idx + 1}</span>
                {card.img && (
                  <button
                    type="button"
                    onClick={() => handleCardClear(idx)}
                    className="text-xs text-red-400 hover:text-red-300 font-mono cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              <input
                type="text"
                value={card.label}
                onChange={(e) => updateCard(idx, 'label', e.target.value)}
                placeholder="Card Label"
                className="w-full bg-neutral-950 border border-white/15 focus:border-gold px-3 py-2 text-xs text-white rounded focus:outline-none"
                required
              />

              {/* Image Preview Box */}
              <div className="relative aspect-[16/10] bg-neutral-950 border border-white/10 rounded overflow-hidden flex items-center justify-center">
                {cardCompressingIdx === idx ? (
                  <div className="text-center p-3 text-gold flex flex-col items-center justify-center">
                    <span className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin mb-1.5" />
                    <span className="text-xs font-mono">Saving...</span>
                  </div>
                ) : card.img ? (
                  <img 
                    src={card.img} 
                    alt={card.label || `Card ${idx + 1}`} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <span className="text-xs font-mono text-neutral-500">No Image</span>
                )}
              </div>

              {/* Upload button & url input */}
              <div className="space-y-2 pt-1">
                <label className="w-full bg-neutral-950 hover:bg-gold/10 border border-white/15 hover:border-gold/40 text-neutral-300 hover:text-gold py-2 px-3 rounded flex items-center justify-center gap-2 text-xs font-mono cursor-pointer transition-colors">
                  <Upload size={13} className="text-gold" />
                  <span>{cardCompressingIdx === idx ? 'Processing...' : 'Upload Image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={cardCompressingIdx === idx}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      handleCardFileUpload(idx, file);
                    }}
                    className="hidden"
                  />
                </label>

                <input
                  type="url"
                  value={card.img}
                  onChange={(e) => updateCard(idx, 'img', e.target.value)}
                  placeholder="Or paste URL..."
                  className="w-full bg-neutral-950 border border-white/10 focus:border-gold px-2.5 py-1.5 text-xs text-neutral-300 rounded focus:outline-none font-mono"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-white/10 flex items-center justify-between">
        <span className="text-xs font-mono text-neutral-400">
          Photos auto-save immediately · Text updates save on click
        </span>
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-2.5 bg-gold hover:bg-gold-light active:bg-gold-dark text-neutral-950 font-bold text-xs uppercase tracking-wider rounded flex items-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50"
        >
          <Save size={14} />
          <span>{isSaving ? 'Saving...' : 'Save All Changes'}</span>
        </button>
      </div>
    </form>
  );
};

// ---------------------------------------------------------------------------
// 2. ABOUT SECTION EDITOR
// ---------------------------------------------------------------------------
const AboutSectionEditor: React.FC<{ onNotify: (msg: string) => void }> = ({ onNotify }) => {
  const { content, updateContent, resetToDefault, isSaving } = useSectionContent<AboutContent>('about', defaultAboutContent);
  const [formData, setFormData] = useState<AboutContent>(content);

  useEffect(() => {
    setFormData(content);
  }, [content]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateContent(formData);
    onNotify('About section updated successfully.');
  };

  const handleReset = async () => {
    if (confirm('Reset About Section to default?')) {
      await resetToDefault();
      setFormData(defaultAboutContent);
      onNotify('About Section reset to default.');
    }
  };

  const updatePillar = (idx: number, key: 'title' | 'subtitle', val: string) => {
    const next = [...formData.pillars];
    next[idx] = { ...next[idx], [key]: val };
    setFormData({ ...formData, pillars: next });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-4">
        <div>
          <h3 className="text-base font-heading font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Compass size={16} className="text-gold" />
            About Atelier Section
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 bg-neutral-900 border border-white/15 hover:border-gold/40 text-neutral-300 hover:text-white text-xs font-mono uppercase tracking-wider rounded transition-colors cursor-pointer"
          >
            <RotateCcw size={13} className="inline mr-1.5" />
            Reset
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 bg-gold hover:bg-gold-light active:bg-gold-dark text-neutral-950 font-bold text-xs uppercase tracking-wider rounded flex items-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50"
          >
            <Save size={13} />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-gold font-semibold mb-1.5">
            Eyebrow Tagline
          </label>
          <input
            type="text"
            value={formData.subtitle}
            onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
            placeholder="About Natal"
            className="w-full bg-neutral-900 border border-gold/40 focus:border-gold px-3.5 py-2.5 text-xs text-white rounded focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-neutral-300 font-semibold mb-1.5">
            Heading Line 1
          </label>
          <input
            type="text"
            value={formData.titleLine1}
            onChange={(e) => setFormData({ ...formData, titleLine1: e.target.value })}
            placeholder="Architectural Elegance,"
            className="w-full bg-neutral-900 border border-white/15 focus:border-gold px-3.5 py-2.5 text-xs text-white rounded focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-gold font-semibold mb-1.5">
            Heading Line 2 (Accent)
          </label>
          <input
            type="text"
            value={formData.titleLine2}
            onChange={(e) => setFormData({ ...formData, titleLine2: e.target.value })}
            placeholder="Delivered With Precision."
            className="w-full bg-neutral-900 border border-gold/40 focus:border-gold px-3.5 py-2.5 text-xs text-gold rounded focus:outline-none font-semibold"
            required
          />
        </div>
      </div>

      {/* Narrative Story */}
      <div>
        <label className="block text-xs uppercase tracking-wider text-neutral-300 font-semibold mb-1.5">
          Narrative Story
        </label>
        <textarea
          rows={3}
          value={formData.narrative}
          onChange={(e) => setFormData({ ...formData, narrative: e.target.value })}
          placeholder="Atelier history and dedication to craft..."
          className="w-full bg-neutral-900 border border-white/15 focus:border-gold p-3.5 text-xs text-white rounded focus:outline-none resize-none leading-relaxed"
          required
        />
      </div>

      {/* Experience Metrics */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-neutral-300 font-semibold mb-1.5">
            Years of Experience
          </label>
          <input
            type="text"
            value={formData.experienceYears}
            onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
            placeholder="20+"
            className="w-full bg-neutral-900 border border-white/15 focus:border-gold px-3.5 py-2.5 text-xs text-white rounded focus:outline-none font-mono"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-neutral-300 font-semibold mb-1.5">
            Experience Label Text
          </label>
          <input
            type="text"
            value={formData.experienceLabel}
            onChange={(e) => setFormData({ ...formData, experienceLabel: e.target.value })}
            placeholder="Years of Architectural Mastery"
            className="w-full bg-neutral-900 border border-white/15 focus:border-gold px-3.5 py-2.5 text-xs text-white rounded focus:outline-none"
          />
        </div>
      </div>

      {/* Atelier Image */}
      <div className="pt-2 border-t border-white/10">
        <ImageUploadField
          label="About Atelier Image"
          value={formData.image}
          onChange={(val) => setFormData({ ...formData, image: val })}
        />
      </div>

      {/* 4 Pillars */}
      <div className="pt-2 border-t border-white/10 space-y-3">
        <label className="block text-xs uppercase tracking-wider text-neutral-200 font-semibold">
          4 Focus Pillars
        </label>
        <div className="grid sm:grid-cols-2 gap-4">
          {formData.pillars.map((pillar, idx) => (
            <div key={idx} className="bg-neutral-900/60 border border-white/10 p-4 rounded-md space-y-2.5">
              <span className="text-xs font-mono text-gold uppercase block">Pillar 0{idx + 1}</span>
              <input
                type="text"
                value={pillar.title}
                onChange={(e) => updatePillar(idx, 'title', e.target.value)}
                placeholder="Pillar Title"
                className="w-full bg-neutral-950 border border-white/15 focus:border-gold px-3 py-2 text-xs text-white rounded focus:outline-none"
              />
              <input
                type="text"
                value={pillar.subtitle}
                onChange={(e) => updatePillar(idx, 'subtitle', e.target.value)}
                placeholder="Pillar Subtitle / Description"
                className="w-full bg-neutral-950 border border-white/10 focus:border-gold px-3 py-1.5 text-xs text-neutral-400 rounded focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-2.5 bg-gold hover:bg-gold-light active:bg-gold-dark text-neutral-950 font-bold text-xs uppercase tracking-wider rounded flex items-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50"
        >
          <Save size={14} />
          <span>{isSaving ? 'Saving...' : 'Save About Section'}</span>
        </button>
      </div>
    </form>
  );
};

// ---------------------------------------------------------------------------
// 3. WHY CHOOSE US SECTION EDITOR
// ---------------------------------------------------------------------------
const WhyUsSectionEditor: React.FC<{ onNotify: (msg: string) => void }> = ({ onNotify }) => {
  const { content, updateContent, resetToDefault, isSaving } = useSectionContent<WhyUsContent>('why_us', defaultWhyUsContent);
  const [formData, setFormData] = useState<WhyUsContent>(content);

  useEffect(() => {
    setFormData(content);
  }, [content]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateContent(formData);
    onNotify('Why Choose Us section updated successfully.');
  };

  const handleReset = async () => {
    if (confirm('Reset Why Choose Us to default?')) {
      await resetToDefault();
      setFormData(defaultWhyUsContent);
      onNotify('Why Choose Us reset to default.');
    }
  };

  const updateItem = (idx: number, key: 'title' | 'description' | 'metric', val: any) => {
    const next = [...formData.items];
    next[idx] = { ...next[idx], [key]: key === 'metric' ? Number(val) : val };
    setFormData({ ...formData, items: next });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-4">
        <div>
          <h3 className="text-base font-heading font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck size={16} className="text-gold" />
            Why Choose Us Section
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 bg-neutral-900 border border-white/15 hover:border-gold/40 text-neutral-300 hover:text-white text-xs font-mono uppercase tracking-wider rounded transition-colors cursor-pointer"
          >
            <RotateCcw size={13} className="inline mr-1.5" />
            Reset
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 bg-gold hover:bg-gold-light active:bg-gold-dark text-neutral-950 font-bold text-xs uppercase tracking-wider rounded flex items-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50"
          >
            <Save size={13} />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-gold font-semibold mb-1.5">
            Section Subtitle
          </label>
          <input
            type="text"
            value={formData.subtitle}
            onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
            placeholder="Our Guarantee"
            className="w-full bg-neutral-900 border border-gold/40 focus:border-gold px-3.5 py-2.5 text-xs text-white rounded focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-neutral-300 font-semibold mb-1.5">
            Section Title
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="WHY CHOOSE US?"
            className="w-full bg-neutral-900 border border-white/15 focus:border-gold px-3.5 py-2.5 text-xs text-white rounded focus:outline-none"
            required
          />
        </div>
      </div>

      <div className="pt-2 border-t border-white/10">
        <ImageUploadField
          label="Background Texture / Photograph"
          value={formData.backgroundImage}
          onChange={(val) => setFormData({ ...formData, backgroundImage: val })}
        />
      </div>

      {/* 5 Value Cards */}
      <div className="space-y-3 pt-2 border-t border-white/10">
        <label className="block text-xs uppercase tracking-wider text-neutral-200 font-semibold">
          Value Propositions & Metrics
        </label>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {formData.items.map((item, idx) => (
            <div key={idx} className="bg-neutral-900/60 border border-white/10 p-4 rounded-md space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-gold uppercase">Item 0{idx + 1}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono text-neutral-400">Score %:</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={item.metric}
                    onChange={(e) => updateItem(idx, 'metric', e.target.value)}
                    className="w-14 bg-neutral-950 border border-gold/40 text-gold text-xs px-2 py-1 text-center font-mono font-bold rounded"
                  />
                </div>
              </div>
              <input
                type="text"
                value={item.title}
                onChange={(e) => updateItem(idx, 'title', e.target.value)}
                placeholder="Title"
                className="w-full bg-neutral-950 border border-white/15 focus:border-gold px-3 py-2 text-xs text-white rounded focus:outline-none font-medium"
                required
              />
              <textarea
                rows={3}
                value={item.description}
                onChange={(e) => updateItem(idx, 'description', e.target.value)}
                placeholder="Description..."
                className="w-full bg-neutral-950 border border-white/10 focus:border-gold p-2.5 text-xs text-neutral-300 rounded focus:outline-none resize-none leading-relaxed"
                required
              />
            </div>
          ))}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-2.5 bg-gold hover:bg-gold-light active:bg-gold-dark text-neutral-950 font-bold text-xs uppercase tracking-wider rounded flex items-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50"
        >
          <Save size={14} />
          <span>{isSaving ? 'Saving...' : 'Save Section'}</span>
        </button>
      </div>
    </form>
  );
};

// ---------------------------------------------------------------------------
// 4. PROCESS SECTION EDITOR
// ---------------------------------------------------------------------------
const ProcessSectionEditor: React.FC<{ onNotify: (msg: string) => void }> = ({ onNotify }) => {
  const { content, updateContent, resetToDefault, isSaving } = useSectionContent<ProcessContent>('process', defaultProcessContent);
  const [formData, setFormData] = useState<ProcessContent>(content);

  useEffect(() => {
    setFormData(content);
  }, [content]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateContent(formData);
    onNotify('The Natal Process steps updated successfully.');
  };

  const handleReset = async () => {
    if (confirm('Reset Process steps to default?')) {
      await resetToDefault();
      setFormData(defaultProcessContent);
      onNotify('Process steps reset to default.');
    }
  };

  const updateStep = (idx: number, key: 'title' | 'desc', val: string) => {
    const next = [...formData.steps];
    next[idx] = { ...next[idx], [key]: val };
    setFormData({ ...formData, steps: next });
  };

  const updateDeliverable = (stepIdx: number, delIdx: number, val: string) => {
    const next = [...formData.steps];
    const dels = [...(next[stepIdx].deliverables || [])];
    dels[delIdx] = val;
    next[stepIdx] = { ...next[stepIdx], deliverables: dels };
    setFormData({ ...formData, steps: next });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-4">
        <div>
          <h3 className="text-base font-heading font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Layers size={16} className="text-gold" />
            The Natal Process Steps
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 bg-neutral-900 border border-white/15 hover:border-gold/40 text-neutral-300 hover:text-white text-xs font-mono uppercase tracking-wider rounded transition-colors cursor-pointer"
          >
            <RotateCcw size={13} className="inline mr-1.5" />
            Reset
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 bg-gold hover:bg-gold-light active:bg-gold-dark text-neutral-950 font-bold text-xs uppercase tracking-wider rounded flex items-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50"
          >
            <Save size={13} />
            <span>{isSaving ? 'Saving...' : 'Save Steps'}</span>
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-gold font-semibold mb-1.5">
            Section Eyebrow
          </label>
          <input
            type="text"
            value={formData.subtitle}
            onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
            placeholder="Structured Execution"
            className="w-full bg-neutral-900 border border-gold/40 focus:border-gold px-3.5 py-2.5 text-xs text-white rounded focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-neutral-300 font-semibold mb-1.5">
            Section Title
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="The Natal Process"
            className="w-full bg-neutral-900 border border-white/15 focus:border-gold px-3.5 py-2.5 text-xs text-white rounded focus:outline-none"
            required
          />
        </div>
      </div>

      {/* 5 Process Stages */}
      <div className="space-y-4 pt-2 border-t border-white/10">
        <label className="block text-xs uppercase tracking-wider text-neutral-200 font-semibold">
          5 Process Stages
        </label>
        {formData.steps.map((step, idx) => (
          <div key={idx} className="bg-neutral-900/60 border border-white/10 p-5 rounded-md space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-xs font-mono text-gold font-bold uppercase">
                Step 0{idx + 1}
              </span>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase text-neutral-400 font-mono mb-1.5">
                  Stage Title
                </label>
                <input
                  type="text"
                  value={step.title}
                  onChange={(e) => updateStep(idx, 'title', e.target.value)}
                  placeholder="Stage Title"
                  className="w-full bg-neutral-950 border border-white/15 focus:border-gold px-3 py-2 text-xs text-white rounded focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs uppercase text-neutral-400 font-mono mb-1.5">
                  Stage Description
                </label>
                <textarea
                  rows={2}
                  value={step.desc}
                  onChange={(e) => updateStep(idx, 'desc', e.target.value)}
                  placeholder="Explanation..."
                  className="w-full bg-neutral-950 border border-white/15 focus:border-gold p-2 text-xs text-neutral-300 rounded focus:outline-none resize-none leading-relaxed"
                  required
                />
              </div>
            </div>

            {/* Deliverables tags */}
            <div>
              <span className="text-xs font-mono uppercase text-neutral-400 block mb-2">
                Deliverables (3 Items)
              </span>
              <div className="grid sm:grid-cols-3 gap-2.5">
                {[0, 1, 2].map((delIdx) => (
                  <input
                    key={delIdx}
                    type="text"
                    value={step.deliverables?.[delIdx] || ''}
                    onChange={(e) => updateDeliverable(idx, delIdx, e.target.value)}
                    placeholder={`Deliverable 0${delIdx + 1}`}
                    className="w-full bg-neutral-950 border border-white/10 focus:border-gold px-3 py-2 text-xs text-neutral-300 rounded focus:outline-none"
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-2.5 bg-gold hover:bg-gold-light active:bg-gold-dark text-neutral-950 font-bold text-xs uppercase tracking-wider rounded flex items-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50"
        >
          <Save size={14} />
          <span>{isSaving ? 'Saving...' : 'Save Process Steps'}</span>
        </button>
      </div>
    </form>
  );
};

// ---------------------------------------------------------------------------
// 5. STATS SECTION EDITOR
// ---------------------------------------------------------------------------
const StatsSectionEditor: React.FC<{ onNotify: (msg: string) => void }> = ({ onNotify }) => {
  const { content, updateContent, resetToDefault, isSaving } = useSectionContent<StatsContent>('stats', defaultStatsContent);
  const [formData, setFormData] = useState<StatsContent>(content);

  useEffect(() => {
    setFormData(content);
  }, [content]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateContent(formData);
    onNotify('Milestones updated successfully.');
  };

  const handleReset = async () => {
    if (confirm('Reset Stats to default?')) {
      await resetToDefault();
      setFormData(defaultStatsContent);
      onNotify('Stats reset to default.');
    }
  };

  const updateStat = (idx: number, key: 'label' | 'value' | 'suffix', val: any) => {
    const next = [...formData.stats];
    next[idx] = { ...next[idx], [key]: key === 'value' ? Number(val) : val };
    setFormData({ ...formData, stats: next });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-4">
        <div>
          <h3 className="text-base font-heading font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Clock size={16} className="text-gold" />
            Key Milestones & Counters
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 bg-neutral-900 border border-white/15 hover:border-gold/40 text-neutral-300 hover:text-white text-xs font-mono uppercase tracking-wider rounded transition-colors cursor-pointer"
          >
            <RotateCcw size={13} className="inline mr-1.5" />
            Reset
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 bg-gold hover:bg-gold-light active:bg-gold-dark text-neutral-950 font-bold text-xs uppercase tracking-wider rounded flex items-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50"
          >
            <Save size={13} />
            <span>{isSaving ? 'Saving...' : 'Save Milestones'}</span>
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {formData.stats.map((stat, idx) => (
          <div key={idx} className="bg-neutral-900/60 border border-white/10 p-4 rounded-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-gold uppercase">Counter 0{idx + 1}</span>
            </div>
            <div>
              <label className="block text-xs uppercase text-neutral-400 font-mono mb-1.5">
                Metric Label
              </label>
              <input
                type="text"
                value={stat.label}
                onChange={(e) => updateStat(idx, 'label', e.target.value)}
                placeholder="Projects Completed"
                className="w-full bg-neutral-950 border border-white/15 focus:border-gold px-3 py-2 text-xs text-white rounded focus:outline-none"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs uppercase text-neutral-400 font-mono mb-1.5">
                  Target Value
                </label>
                <input
                  type="number"
                  value={stat.value}
                  onChange={(e) => updateStat(idx, 'value', e.target.value)}
                  placeholder="350"
                  className="w-full bg-neutral-950 border border-gold/40 text-gold font-mono font-bold px-3 py-2 text-xs rounded focus:outline-none tabular-nums"
                  required
                />
              </div>
              <div>
                <label className="block text-xs uppercase text-neutral-400 font-mono mb-1.5">
                  Suffix
                </label>
                <input
                  type="text"
                  value={stat.suffix}
                  onChange={(e) => updateStat(idx, 'suffix', e.target.value)}
                  placeholder="+"
                  className="w-full bg-neutral-950 border border-white/15 focus:border-gold px-3 py-2 text-xs text-white rounded focus:outline-none font-mono"
                  required
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-2.5 bg-gold hover:bg-gold-light active:bg-gold-dark text-neutral-950 font-bold text-xs uppercase tracking-wider rounded flex items-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50"
        >
          <Save size={14} />
          <span>{isSaving ? 'Saving...' : 'Save Milestones'}</span>
        </button>
      </div>
    </form>
  );
};

// ---------------------------------------------------------------------------
// 6. CONTACT & STUDIO INFO EDITOR
// ---------------------------------------------------------------------------
const ContactSectionEditor: React.FC<{ onNotify: (msg: string) => void }> = ({ onNotify }) => {
  const { content, updateContent, resetToDefault, isSaving } = useSectionContent<ContactContent>('contact', defaultContactContent);
  const [formData, setFormData] = useState<ContactContent>(content);

  useEffect(() => {
    setFormData(content);
  }, [content]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateContent(formData);
    onNotify('Studio details & contact channels updated successfully.');
  };

  const handleReset = async () => {
    if (confirm('Reset Contact Details to default?')) {
      await resetToDefault();
      setFormData(defaultContactContent);
      onNotify('Contact Details reset to default.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-4">
        <div>
          <h3 className="text-base font-heading font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <MapPin size={16} className="text-gold" />
            Studio Information & Contact Channels
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 bg-neutral-900 border border-white/15 hover:border-gold/40 text-neutral-300 hover:text-white text-xs font-mono uppercase tracking-wider rounded transition-colors cursor-pointer"
          >
            <RotateCcw size={13} className="inline mr-1.5" />
            Reset
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 bg-gold hover:bg-gold-light active:bg-gold-dark text-neutral-950 font-bold text-xs uppercase tracking-wider rounded flex items-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50"
          >
            <Save size={13} />
            <span>{isSaving ? 'Saving...' : 'Save Contact Info'}</span>
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-neutral-300 font-semibold mb-1.5">
            Atelier Legal Name
          </label>
          <input
            type="text"
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            placeholder="NATAL INTERIOR DESIGN CONSTRUCTION"
            className="w-full bg-neutral-900 border border-white/15 focus:border-gold px-3.5 py-2.5 text-xs text-white rounded focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-neutral-300 font-semibold mb-1.5">
            Physical Location
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="Mawanda Road Mulago3"
            className="w-full bg-neutral-900 border border-white/15 focus:border-gold px-3.5 py-2.5 text-xs text-white rounded focus:outline-none"
            required
          />
        </div>
      </div>

      {/* Official Email */}
      <div>
        <label className="block text-xs uppercase tracking-wider text-neutral-300 font-semibold mb-1.5">
          Official Email Address
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="usherhenry99@gmail.com"
          className="w-full bg-neutral-900 border border-white/15 focus:border-gold px-3.5 py-2.5 text-xs text-white rounded focus:outline-none font-mono"
          required
        />
      </div>

      {/* Phone Numbers & WhatsApp */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2.5">
          <label className="block text-xs uppercase tracking-wider text-neutral-300 font-semibold">
            Phone Numbers (Calls)
          </label>
          <input
            type="text"
            value={formData.phoneNumbers[0] || ''}
            onChange={(e) => {
              const next = [...formData.phoneNumbers];
              next[0] = e.target.value;
              setFormData({ ...formData, phoneNumbers: next });
            }}
            placeholder="Primary Phone: 0755 519 830"
            className="w-full bg-neutral-900 border border-white/15 focus:border-gold px-3.5 py-2.5 text-xs text-white rounded focus:outline-none font-mono"
          />
          <input
            type="text"
            value={formData.phoneNumbers[1] || ''}
            onChange={(e) => {
              const next = [...formData.phoneNumbers];
              next[1] = e.target.value;
              setFormData({ ...formData, phoneNumbers: next });
            }}
            placeholder="Secondary Phone: 0745 694 499"
            className="w-full bg-neutral-900 border border-white/15 focus:border-gold px-3.5 py-2.5 text-xs text-white rounded focus:outline-none font-mono"
          />
        </div>

        <div className="space-y-2.5">
          <label className="block text-xs uppercase tracking-wider text-gold font-semibold">
            WhatsApp Numbers
          </label>
          <input
            type="text"
            value={formData.whatsappNumbers[0] || ''}
            onChange={(e) => {
              const next = [...formData.whatsappNumbers];
              next[0] = e.target.value;
              setFormData({ ...formData, whatsappNumbers: next });
            }}
            placeholder="Primary WhatsApp: 0745 694 499"
            className="w-full bg-neutral-900 border border-gold/40 focus:border-gold px-3.5 py-2.5 text-xs text-white rounded focus:outline-none font-mono"
          />
          <input
            type="text"
            value={formData.whatsappNumbers[1] || ''}
            onChange={(e) => {
              const next = [...formData.whatsappNumbers];
              next[1] = e.target.value;
              setFormData({ ...formData, whatsappNumbers: next });
            }}
            placeholder="Secondary WhatsApp (Optional)"
            className="w-full bg-neutral-900 border border-gold/40 focus:border-gold px-3.5 py-2.5 text-xs text-white rounded focus:outline-none font-mono"
          />
        </div>
      </div>

      {/* Social Media Links */}
      <div className="space-y-3 pt-2 border-t border-white/10">
        <label className="block text-xs uppercase tracking-wider text-neutral-200 font-semibold">
          Social Media Platforms
        </label>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <span className="text-xs font-mono text-neutral-400 block mb-1.5">TikTok URL</span>
            <input
              type="url"
              value={formData.tiktokUrl}
              onChange={(e) => setFormData({ ...formData, tiktokUrl: e.target.value })}
              placeholder="https://www.tiktok.com/@..."
              className="w-full bg-neutral-900 border border-white/15 focus:border-gold px-3.5 py-2.5 text-xs text-white rounded focus:outline-none font-mono"
            />
          </div>
          <div>
            <span className="text-xs font-mono text-neutral-400 block mb-1.5">Facebook URL</span>
            <input
              type="url"
              value={formData.facebookUrl}
              onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })}
              placeholder="https://www.facebook.com/..."
              className="w-full bg-neutral-900 border border-white/15 focus:border-gold px-3.5 py-2.5 text-xs text-white rounded focus:outline-none font-mono"
            />
          </div>
          <div>
            <span className="text-xs font-mono text-neutral-400 block mb-1.5">LinkedIn URL</span>
            <input
              type="url"
              value={formData.linkedinUrl}
              onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
              placeholder="https://www.linkedin.com/..."
              className="w-full bg-neutral-900 border border-white/15 focus:border-gold px-3.5 py-2.5 text-xs text-white rounded focus:outline-none font-mono"
            />
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-2.5 bg-gold hover:bg-gold-light active:bg-gold-dark text-neutral-950 font-bold text-xs uppercase tracking-wider rounded flex items-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50"
        >
          <Save size={14} />
          <span>{isSaving ? 'Saving...' : 'Save Contact Info'}</span>
        </button>
      </div>
    </form>
  );
};

export default SiteSectionsEditor;
