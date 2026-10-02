import { LucideIcon } from 'lucide-react';

export interface Service {
  id: string;
  slug?: string;
  originalId?: string;
  title: string;
  description: string;
  icon: string;
  features: string[];
  featuresText?: string;
  image?: string;
  order?: number;
  isDefault?: boolean;
}

export interface Project {
  id: string;
  title: string;
  category: string;
  description: string;
  image: string;
  beforeImage?: string;
  servicesUsed: string[];
  videoUrl?: string;
  videoThumbnail?: string;
  fileAttachment?: {
    name: string;
    url?: string;
    data?: string;
    size?: number;
    type?: string;
  };
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  rating: number;
  image: string;
}

export interface ProcessStep {
  id: number;
  title: string;
  description: string;
}
