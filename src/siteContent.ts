import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { companyDetails, whyChooseUsData, processSteps } from './data';
import { sanitizeForFirestore } from './utils';

// ---------------------------------------------------------------------------
// Section Content Types & Default Values
// ---------------------------------------------------------------------------

export interface BrandingContent {
  logoType: 'both' | 'image' | 'text';
  logoUrl?: string;
  logoAltText?: string;
  logoHeight?: number; // default height in px (32 to 80)
  companyName: string;
  tagline: string;
  faviconUrl?: string;
}

export const defaultBrandingContent: BrandingContent = {
  logoType: 'both',
  logoUrl: '',
  logoAltText: 'Natal Interior Design Construction',
  logoHeight: 44,
  companyName: 'Natal Interior',
  tagline: 'Design Construction',
  faviconUrl: ''
};

export interface HeroContent {
  headline1: string;
  headline2: string;
  headline3: string;
  description: string;
  mediaType?: 'video' | 'image';
  backgroundVideo?: string;
  backgroundImage: string;
  primaryCtaText: string;
  secondaryCtaText: string;
  cards: Array<{ img: string; label: string }>;
}

export const defaultHeroContent: HeroContent = {
  headline1: 'WE DESIGN.',
  headline2: 'WE BUILD.',
  headline3: 'YOU ENJOY.',
  description: 'Premium interior design and construction solutions tailored to transform your space into something exceptional.',
  mediaType: 'image',
  backgroundVideo: '',
  backgroundImage: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&q=80&w=2560',
  primaryCtaText: 'Request Quotation',
  secondaryCtaText: 'Explore Showcase',
  cards: [
    { img: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=800', label: 'Gypsum Ceilings' },
    { img: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&q=80&w=800', label: 'Luxury Living' },
    { img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800', label: 'Custom TV Units' },
    { img: 'https://images.unsplash.com/photo-1600607686527-6fb886090705?auto=format&fit=crop&q=80&w=800', label: 'Architectural Lighting' }
  ]
};

export interface AboutContent {
  subtitle: string;
  titleLine1: string;
  titleLine2: string;
  narrative: string;
  experienceYears: string;
  experienceLabel: string;
  image: string;
  pillars: Array<{ title: string; subtitle: string }>;
}

export const defaultAboutContent: AboutContent = {
  subtitle: 'About Natal',
  titleLine1: 'Architectural Elegance,',
  titleLine2: 'Delivered With Precision.',
  narrative: "With over two decades of craftsmanship, Natal Interior Design Construction is Uganda's trusted atelier for turnkey luxury interiors, specialized gypsum ceilings, and custom timber joinery.",
  experienceYears: '20+',
  experienceLabel: 'Years of Architectural Mastery',
  image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=1200',
  pillars: [
    { title: 'Gypsum Architecture', subtitle: 'Coffered ceilings & light coves' },
    { title: 'Custom Joinery', subtitle: 'Media walls & bespoke cabinetry' },
    { title: 'Architectural Lighting', subtitle: 'Integrated high-CRI LED systems' },
    { title: 'Turnkey Handover', subtitle: 'White-glove execution from start to finish' }
  ]
};

export interface WhyUsContent {
  subtitle: string;
  title: string;
  backgroundImage: string;
  items: Array<{ title: string; description: string; metric: number }>;
}

export const defaultWhyUsContent: WhyUsContent = {
  subtitle: 'Our Guarantee',
  title: 'WHY CHOOSE US?',
  backgroundImage: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=2000',
  items: whyChooseUsData.map((d, i) => ({
    title: d.title,
    description: d.description,
    metric: [98, 100, 95, 96, 99][i % 5]
  }))
};

export interface ProcessContent {
  subtitle: string;
  title: string;
  steps: Array<{
    title: string;
    desc: string;
    deliverables: string[];
  }>;
}

export const defaultProcessContent: ProcessContent = {
  subtitle: 'Structured Execution',
  title: 'The Natal Process',
  steps: processSteps.map((step, idx) => ({
    title: step.title,
    desc: step.description,
    deliverables: [
      ['Site Inspection', 'Scope Audit', 'Design Brief'],
      ['Architectural 3D Renders', 'Material Specs', 'Costing Estimate'],
      ['Grade-A Gypsum & Timber', 'Finish Approvals', 'Batch Testing'],
      ['Master Carpentry', 'Ceiling & Lighting', 'Daily Site Supervision'],
      ['QA Inspection', 'Deep Cleaning', 'Key Handover']
    ][idx % 5]
  }))
};

export interface StatItem {
  label: string;
  value: number;
  suffix: string;
}

export interface StatsContent {
  stats: StatItem[];
}

export const defaultStatsContent: StatsContent = {
  stats: [
    { label: 'Projects Completed', value: 350, suffix: '+' },
    { label: 'Years Experience', value: 25, suffix: '+' },
    { label: 'Happy Clients', value: 300, suffix: '+' },
    { label: 'Customer Satisfaction', value: 100, suffix: '%' }
  ]
};

export interface ContactContent {
  companyName: string;
  slogan: string;
  tagline: string;
  description: string;
  location: string;
  phoneNumbers: string[];
  whatsappNumbers: string[];
  email: string;
  tiktokUrl: string;
  facebookUrl: string;
  linkedinUrl: string;
  xUrl?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  subtitle?: string;
  title?: string;
  workingHours?: string;
}

export const defaultContactContent: ContactContent = {
  companyName: companyDetails.name,
  slogan: companyDetails.slogan,
  tagline: companyDetails.tagline,
  subtitle: 'Contact Us',
  title: "Let's Discuss Your Project",
  description: companyDetails.description,
  location: companyDetails.location,
  address: companyDetails.location,
  phone: companyDetails.phoneNumbers.join(' / '),
  whatsapp: companyDetails.whatsappNumbers.join(' / '),
  phoneNumbers: [...companyDetails.phoneNumbers],
  whatsappNumbers: [...companyDetails.whatsappNumbers],
  email: companyDetails.email,
  workingHours: 'Monday - Saturday: 8:00 AM - 6:00 PM EAT',
  tiktokUrl: 'https://www.tiktok.com/@natalinteriors',
  facebookUrl: 'https://www.facebook.com/natalinteriordesign',
  linkedinUrl: 'https://www.linkedin.com/company/natal-interior-design-construction'
};

// ---------------------------------------------------------------------------
// Helpers: Read & Write Local Storage Cache
// ---------------------------------------------------------------------------

const LOCAL_STORAGE_PREFIX = 'natal_content_';

export function getCachedContent<T>(sectionId: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${sectionId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (sectionId === 'contact' && parsed && typeof fallback === 'object') {
        const fb = fallback as any;
        if (parsed.email === 'info@nataldesignconstruction.com') {
          parsed.email = fb.email;
        }
        if (parsed.location === 'Kampala, Uganda' || parsed.address === 'Kampala, Uganda') {
          parsed.location = fb.location;
          parsed.address = fb.location;
        }
        if (Array.isArray(parsed.whatsappNumbers) && (parsed.whatsappNumbers.includes('0758 903 628') || !parsed.whatsappNumbers.some((n: string) => n.includes('0745')))) {
          parsed.whatsappNumbers = fb.whatsappNumbers;
          parsed.whatsapp = fb.whatsapp;
        }
      }
      return { ...fallback, ...parsed };
    }
  } catch {
    // fallback
  }
  return fallback;
}

export function setCachedContent<T>(sectionId: string, content: T): void {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${sectionId}`, JSON.stringify(content));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }

  // Always broadcast event so all components update immediately in real-time
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('natal_content_changed', { detail: { sectionId, content } }));
    }
  } catch (e) {
    console.warn('Event broadcast error:', e);
  }
}

// ---------------------------------------------------------------------------
// Core Firestore Save & Reset Utilities
// ---------------------------------------------------------------------------

export async function saveSectionContent<T>(sectionId: string, content: T): Promise<void> {
  // 1. Immediately cache locally and trigger broadcast for real-time reactivity
  setCachedContent(sectionId, content);

  // 2. Persist to Firestore with sanitized payload (strips undefined to avoid Firestore crashes)
  try {
    const payload = sanitizeForFirestore({
      ...content,
      updatedAt: serverTimestamp()
    });
    await setDoc(doc(db, 'site_content', sectionId), payload, { merge: true });
  } catch (err) {
    console.error(`Firestore site_content write error for [${sectionId}]:`, err);
    throw err;
  }
}

export async function resetSectionContent<T>(sectionId: string, defaultContent: T): Promise<void> {
  setCachedContent(sectionId, defaultContent);
  try {
    const payload = sanitizeForFirestore({
      ...defaultContent,
      updatedAt: serverTimestamp()
    });
    await setDoc(doc(db, 'site_content', sectionId), payload);
  } catch (err) {
    console.error(`Firestore reset error for [${sectionId}]:`, err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// React Hook: useSectionContent
// ---------------------------------------------------------------------------

export function useSectionContent<T>(sectionId: string, fallback: T): {
  content: T;
  updateContent: (newContent: Partial<T>) => Promise<void>;
  resetToDefault: () => Promise<void>;
  isSaving: boolean;
} {
  const [content, setContent] = useState<T>(() => getCachedContent(sectionId, fallback));
  const [isSaving, setIsSaving] = useState(false);

  // Listen to Firestore real-time updates and local broadcast events
  useEffect(() => {
    // 1. Local custom event listener for immediate same-page updates
    const handleLocalChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.sectionId === sectionId && customEvent.detail?.content) {
        setContent(customEvent.detail.content);
      }
    };
    window.addEventListener('natal_content_changed', handleLocalChange);

    // 2. Firestore snapshot listener
    let unsubscribe = () => {};
    try {
      unsubscribe = onSnapshot(doc(db, 'site_content', sectionId), (snapshot) => {
        if (snapshot.exists()) {
          const remoteData = snapshot.data() as T;
          setContent(prev => {
            const merged = { ...fallback, ...remoteData };
            try {
              localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${sectionId}`, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      }, (err) => {
        console.warn(`Firestore onSnapshot failed for ${sectionId}:`, err);
      });
    } catch (e) {
      console.warn(`Error setting up Firestore listener for ${sectionId}:`, e);
    }

    return () => {
      window.removeEventListener('natal_content_changed', handleLocalChange);
      unsubscribe();
    };
  }, [sectionId]);

  const updateContent = useCallback(async (updates: Partial<T>) => {
    setIsSaving(true);
    try {
      const next = { ...content, ...updates };
      setContent(next);
      await saveSectionContent(sectionId, next);
    } finally {
      setIsSaving(false);
    }
  }, [content, sectionId]);

  const resetToDefault = useCallback(async () => {
    setIsSaving(true);
    try {
      setContent(fallback);
      await resetSectionContent(sectionId, fallback);
    } finally {
      setIsSaving(false);
    }
  }, [fallback, sectionId]);

  return {
    content,
    updateContent,
    resetToDefault,
    isSaving
  };
}
