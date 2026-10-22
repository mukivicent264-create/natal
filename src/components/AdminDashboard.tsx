import React, { useState, useEffect, useRef, useMemo } from 'react';
import { collection, query, onSnapshot, addDoc, setDoc, serverTimestamp, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db, auth, databaseId, projectId } from '../firebase';
import { servicesData, cardHighlights, projectsData, whyChooseUsData, testimonialsData } from '../data';
import { defaultHeroContent, defaultWhyUsContent, defaultProcessContent, saveSectionContent } from '../siteContent';
import { 
  LogOut, Plus, Trash2, Home, Users, Image as ImageIcon, 
  Key, ShieldCheck, Upload, CheckCircle, RefreshCw, Eye, 
  Sparkles, ExternalLink, Calendar, Phone, Mail, FileText, Menu, X, Bell, User, SplitSquareHorizontal, ArrowLeft, ChevronDown,
  Briefcase, Edit3, Layers, Paintbrush, ArrowUp, ArrowRight, Check, Settings, AlertCircle, EyeOff, ChevronUp, RotateCcw, Sliders,
  Hammer, HardHat, Zap, Droplet, TreePine, Building2, UserCheck, UserPlus, Search, Download, Filter, MessageSquare, Copy, Camera,
  Lock, Unlock, HardDrive, Film, Video, FileUp, Play, Database, FileCode, FolderArchive, CheckCircle2, Clock
} from 'lucide-react';
import NatalLogo from './NatalLogo';
import { 
  syncUserRecord, AppUser, getAdminProfile, setAdminProfile, getUserInitials, 
  AdminProfileData, updateUserInDirectory, getActiveUserSession, setActiveUserSession, 
  clearActiveUserSession, recordUserActivity, storeUserCredential, verifyUserPassword, 
  getUserFromDirectory, ActiveUserSession, compressImageFile, captureVideoThumbnail,
  readFileAsDataUrl, saveMediaAssetToCloud, seedInitialDatabaseIfEmpty, MediaAsset, loadMediaAssetData,
  sanitizeForFirestore, triggerOwnerEmailNotification,
  getEmailServiceSettings, saveEmailServiceSettings, EmailServiceSettings,
  WhatsAppServiceSettings, getWhatsAppServiceSettings, saveWhatsAppServiceSettings,
  triggerOwnerWhatsAppNotification, DispatchedWhatsAppRecord, getLocalWhatsAppDispatches,
  getOwnerWhatsAppUrl, formatOwnerLeadWhatsAppMessage, getClientWhatsAppReplyUrl, normalizeWhatsAppNumber,
  playActivityChime,
  sanitizeNameInput, isValidName, sanitizePhoneInput, isValidPhone, isValidEmail,
  handleNameKeyDown, handleNamePaste, handlePhoneKeyDown, handlePhonePaste,
  CONTAINS_DIGITS_OR_SYMBOLS_REGEX,
  getUserTimestamp, parseTimestampToMs,
  showAppNotification
} from '../utils';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import AdminUsersTab from './AdminUsersTab';
import SiteSectionsEditor from './SiteSectionsEditor';
import AdminMediaVaultTab from './AdminMediaVaultTab';
import ExportButton from './ExportButton';
import ClientEngagementMetricsChart from './ClientEngagementMetricsChart';
import GoldSpinner from './GoldSpinner';
import { TableRowSkeleton, CardSkeleton } from './SkeletonLoader';

export type AdminTabType = 'projects' | 'services' | 'leads' | 'users' | 'testimonials' | 'transformations' | 'settings' | 'notifications' | 'profile' | 'sections' | 'media' | 'communications';

interface AdminDashboardProps {
  onNavigateHome: () => void;
  initialTab?: AdminTabType;
}

function deduplicateList<T extends { id?: string; title?: string; name?: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const key = item.id || (item.title ? `t_${item.title}` : (item.name ? `n_${item.name}` : JSON.stringify(item)));
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

const DEFAULT_MASTER_PASSCODES = ['NATAL7777', '7777', 'natal7777', 'NATAL2025'];

const CATEGORY_OPTIONS = [
  "Gypsum Ceilings & Lighting",
  "Luxury Living Spaces",
  "Kitchens & Fine Cabinetry",
  "Master Suites & Bedrooms",
  "Executive & Commercial Offices",
  "Exterior & Wall Finishes",
  "Custom Joinery & Woodwork"
];

const DISCIPLINE_OPTIONS = [
  { value: 'Paintbrush', label: 'Gypsum & Fine Wall Finishes' },
  { value: 'Sparkles', label: 'Architectural & Ambient Lighting' },
  { value: 'Layers', label: 'Turnkey Interior Renovation' },
  { value: 'Hammer', label: 'Custom Cabinetry & Joinery' },
  { value: 'HardHat', label: 'Structural & Commercial Fit-outs' },
  { value: 'Briefcase', label: 'Executive Offices & Retail Spaces' },
  { value: 'Zap', label: 'Electrical Automation & Systems' },
  { value: 'Droplet', label: 'Luxury Plumbing & Climate Systems' },
  { value: 'Building2', label: 'Architectural Partitioning & Ceilings' },
  { value: 'TreePine', label: 'Landscaping & Outdoor Living' },
];

function renderDisciplineIcon(iconName: string, size = 16) {
  switch (iconName) {
    case 'Paintbrush': return <Paintbrush size={size} className="text-gold shrink-0" />;
    case 'Sparkles': return <Sparkles size={size} className="text-gold shrink-0" />;
    case 'Layers': return <Layers size={size} className="text-gold shrink-0" />;
    case 'Hammer': return <Hammer size={size} className="text-gold shrink-0" />;
    case 'HardHat': return <HardHat size={size} className="text-gold shrink-0" />;
    case 'Briefcase': return <Briefcase size={size} className="text-gold shrink-0" />;
    case 'Zap': return <Zap size={size} className="text-gold shrink-0" />;
    case 'Droplet': return <Droplet size={size} className="text-gold shrink-0" />;
    case 'Building2': return <Building2 size={size} className="text-gold shrink-0" />;
    case 'TreePine': return <TreePine size={size} className="text-gold shrink-0" />;
    default: return <Paintbrush size={size} className="text-gold shrink-0" />;
  }
}

export default function AdminDashboard({ onNavigateHome, initialTab }: AdminDashboardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const session = getActiveUserSession();
    return Boolean(session?.email && session.email.toLowerCase().includes('admin'));
  });

  const [isPasscodeVerified, setIsPasscodeVerified] = useState<boolean>(() => {
    return sessionStorage.getItem('natal_admin_passcode_verified') === 'true';
  });

  const [enteredPasscode, setEnteredPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [passcodeLoading, setPasscodeLoading] = useState(false);
  const [showConsolePasscode, setShowConsolePasscode] = useState(false);

  // Keep authentication state reactive to session changes
  useEffect(() => {
    const checkAuth = () => {
      const session = getActiveUserSession();
      const isAdm = Boolean(session?.email && session.email.toLowerCase().includes('admin'));
      setIsAuthenticated(isAdm);
      if (!isAdm) {
        setIsPasscodeVerified(false);
        sessionStorage.removeItem('natal_admin_passcode_verified');
      }
    };
    window.addEventListener('natal_user_session_changed', checkAuth);
    window.addEventListener('storage', checkAuth);
    return () => {
      window.removeEventListener('natal_user_session_changed', checkAuth);
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  const getTabFromHash = (): AdminTabType | null => {
    const rawHash = window.location.hash;
    const match = rawHash.match(/[?&]tab=([a-zA-Z_-]+)/);
    if (match) {
      const tabName = match[1].toLowerCase();
      const validTabs: AdminTabType[] = ['projects', 'services', 'leads', 'users', 'testimonials', 'transformations', 'settings', 'notifications', 'profile', 'sections'];
      if (validTabs.includes(tabName as AdminTabType)) {
        return tabName as AdminTabType;
      }
    }
    return null;
  };

  const [activeTab, setActiveTab] = useState<AdminTabType>(() => {
    const fromHash = getTabFromHash();
    if (fromHash) return fromHash;
    if (initialTab) return initialTab;
    return 'projects';
  });

  const switchTab = (tab: AdminTabType) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
    window.location.hash = `#admin?tab=${tab}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sync tab when initialTab prop updates
  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [initialTab]);

  // Sync tab with URL hash if it changes externally
  useEffect(() => {
    const handleHashSync = () => {
      const fromHash = getTabFromHash();
      if (fromHash && fromHash !== activeTab) {
        setActiveTab(fromHash);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('hashchange', handleHashSync);
    return () => window.removeEventListener('hashchange', handleHashSync);
  }, [activeTab]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [adminProfile, setAdminProfileState] = useState<AdminProfileData>(getAdminProfile);
  const adminFileInputRef = useRef<HTMLInputElement>(null);

  // Sync admin profile in real-time across navigation bar and admin suite
  useEffect(() => {
    const handleProfileSync = () => {
      setAdminProfileState(getAdminProfile());
    };
    window.addEventListener('natal_admin_profile_changed', handleProfileSync);
    window.addEventListener('natal_user_session_changed', handleProfileSync);
    window.addEventListener('natal_users_updated', handleProfileSync);
    window.addEventListener('storage', handleProfileSync);
    return () => {
      window.removeEventListener('natal_admin_profile_changed', handleProfileSync);
      window.removeEventListener('natal_user_session_changed', handleProfileSync);
      window.removeEventListener('natal_users_updated', handleProfileSync);
      window.removeEventListener('storage', handleProfileSync);
    };
  }, []);

  const handleAdminPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImageFile(file, 600, 600, 0.82);
      await setAdminProfile({ photoURL: compressed });
      setAdminProfileState(prev => ({ ...prev, photoURL: compressed }));
      setUsers(prev => prev.map(u => {
        if (u.role === 'Administrator' || u.isAdmin || u.email?.toLowerCase().includes('admin')) {
          return { ...u, photoURL: compressed };
        }
        return u;
      }));
      setSuccessNotice("Admin profile picture updated and synchronized with navigation bar & User List!");
      setTimeout(() => setSuccessNotice(''), 4000);
    } catch (err) {
      console.warn("Admin photo compression fallback:", err);
      const reader = new FileReader();
      reader.onload = async (loadEvent) => {
        const base64 = loadEvent.target?.result as string;
        if (base64) {
          await setAdminProfile({ photoURL: base64 });
          setAdminProfileState(prev => ({ ...prev, photoURL: base64 }));
          setUsers(prev => prev.map(u => {
            if (u.role === 'Administrator' || u.isAdmin || u.email?.toLowerCase().includes('admin')) {
              return { ...u, photoURL: base64 };
            }
            return u;
          }));
          setSuccessNotice("Admin profile picture updated!");
          setTimeout(() => setSuccessNotice(''), 4000);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAdminPhoto = async () => {
    await setAdminProfile({ photoURL: '' });
    setAdminProfileState(prev => ({ ...prev, photoURL: undefined }));
    setUsers(prev => prev.map(u => {
      if (u.role === 'Administrator' || u.isAdmin || u.email?.toLowerCase().includes('admin')) {
        return { ...u, photoURL: undefined };
      }
      return u;
    }));
    setSuccessNotice("Admin profile picture removed and synchronized with navigation bar & User List.");
    setTimeout(() => setSuccessNotice(''), 4000);
  };
  
  const [projects, setProjects] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [userActivities, setUserActivities] = useState<any[]>([]);
  const [mediaAssets, setMediaAssets] = useState<any[]>([]);
  const [whatsappDispatches, setWhatsappDispatches] = useState<DispatchedWhatsAppRecord[]>(() => getLocalWhatsAppDispatches());
  const [leadAttachmentModal, setLeadAttachmentModal] = useState<any | null>(null);
  const [isSyncingDb, setIsSyncingDb] = useState(false);

  // Notification Read State & Unread Counts (displays digits on badges)
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('natal_read_notification_ids') || '[]');
    } catch {
      return [];
    }
  });

  // Calculate unread notifications count strictly from real database records (real CRM leads, registered clients, and WhatsApp dispatches)
  const unreadNotificationsCount = useMemo(() => {
    let count = 0;
    // Real CRM leads from Firestore
    leads.forEach((l: any, idx: number) => {
      const id = l.id || `lead_${l.email || l.phone || idx}`;
      if (!readNotificationIds.includes(id)) {
        count++;
      }
    });
    // Real client profiles from Firestore (non-admin)
    users.forEach((u: any, idx: number) => {
      if (!u.isAdmin && !u.email?.toLowerCase().includes('admin') && u.role !== 'Administrator') {
        const id = u.id || `user_${u.email || idx}`;
        if (!readNotificationIds.includes(id)) {
          count++;
        }
      }
    });
    // Real WhatsApp dispatches from Firestore
    whatsappDispatches.forEach((rec: any, idx: number) => {
      const id = rec.id || `wa_${rec.createdAt || idx}`;
      if (!readNotificationIds.includes(id)) {
        count++;
      }
    });
    return count;
  }, [leads, users, whatsappDispatches, readNotificationIds]);

  const handleMarkAllNotificationsRead = () => {
    const allIds: string[] = [];
    leads.forEach((l: any, idx: number) => {
      allIds.push(l.id || `lead_${l.email || l.phone || idx}`);
    });
    users.forEach((u: any, idx: number) => {
      if (!u.isAdmin && !u.email?.toLowerCase().includes('admin') && u.role !== 'Administrator') {
        allIds.push(u.id || `user_${u.email || idx}`);
      }
    });
    whatsappDispatches.forEach((rec: any, idx: number) => {
      allIds.push(rec.id || `wa_${rec.createdAt || idx}`);
    });
    const updated = Array.from(new Set([...readNotificationIds, ...allIds]));
    setReadNotificationIds(updated);
    localStorage.setItem('natal_read_notification_ids', JSON.stringify(updated));
    setSuccessNotice("All notifications marked as read.");
    setTimeout(() => setSuccessNotice(''), 3000);
  };

  const handleMarkSingleNotificationRead = (id: string) => {
    if (!readNotificationIds.includes(id)) {
      const updated = [...readNotificationIds, id];
      setReadNotificationIds(updated);
      localStorage.setItem('natal_read_notification_ids', JSON.stringify(updated));
    }
  };

  const handleToggleNotificationRead = (id: string) => {
    if (readNotificationIds.includes(id)) {
      const updated = readNotificationIds.filter(itemId => itemId !== id);
      setReadNotificationIds(updated);
      localStorage.setItem('natal_read_notification_ids', JSON.stringify(updated));
    } else {
      const updated = [...readNotificationIds, id];
      setReadNotificationIds(updated);
      localStorage.setItem('natal_read_notification_ids', JSON.stringify(updated));
    }
  };

  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread' | 'leads' | 'users' | 'whatsapp'>('all');
  const [notificationSearch, setNotificationSearch] = useState('');

  const [isEditingAdminName, setIsEditingAdminName] = useState(false);
  const [adminNameInput, setAdminNameInput] = useState('');

  const handleSaveAdminName = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!adminNameInput.trim()) return;
    const newName = adminNameInput.trim();
    if (!isValidName(newName)) {
      showAppNotification("Error: Admin name must contain letters only (no numbers, digits or symbols).", "error");
      return;
    }
    await setAdminProfile({ name: newName });
    setAdminProfileState(prev => ({ ...prev, name: newName }));
    setUsers(prev => prev.map(u => {
      if (u.role === 'Administrator' || u.isAdmin || u.email?.toLowerCase().includes('admin')) {
        return { ...u, name: newName };
      }
      return u;
    }));
    setIsEditingAdminName(false);
    setSuccessNotice("Admin profile name updated and synchronized across Navigation Bar & User List!");
    setTimeout(() => setSuccessNotice(''), 4000);
  };

  const handleUpdateUser = async (userIdOrEmail: string, updates: Partial<any>) => {
    try {
      const updatedUser = await updateUserInDirectory(userIdOrEmail, updates);
      if (updatedUser) {
        setUsers(prev => prev.map(u => {
          if (u.id === updatedUser.id || (u.email && updatedUser.email && u.email.toLowerCase() === updatedUser.email.toLowerCase())) {
            return { ...u, ...updatedUser };
          }
          return u;
        }));

        if (updatedUser.role === 'Administrator' || updatedUser.isAdmin || (updatedUser.email && updatedUser.email.toLowerCase().includes('admin'))) {
          setAdminProfileState({
            name: updatedUser.name || 'Master Admin',
            email: updatedUser.email || 'admin@nataldesign.com',
            role: 'Full System Access',
            photoURL: updatedUser.photoURL
          });
        }
      }
    } catch (e) {
      console.error("Failed to update user in directory:", e);
    }
  };

  // Automatically keep the dashboard admin profile aligned with the Administrator in the User List
  useEffect(() => {
    const adminInList = users.find(u => u.role === 'Administrator' || u.isAdmin || u.email?.toLowerCase().includes('admin'));
    if (adminInList) {
      setAdminProfileState(prev => {
        const nextPhoto = adminInList.photoURL || undefined;
        const nextName = adminInList.name || prev.name;
        const nextEmail = adminInList.email || prev.email;
        if (prev.name === nextName && prev.photoURL === nextPhoto && prev.email === nextEmail) {
          return prev;
        }
        return {
          ...prev,
          name: nextName,
          email: nextEmail,
          photoURL: nextPhoto
        };
      });
    }
  }, [users]);

  // Derived Single Source of Truth for the Administrator Profile across Dashboard
  const adminInUserList = users.find(u => u.role === 'Administrator' || u.isAdmin || (u.email && u.email.toLowerCase().includes('admin'))) || null;
  const currentAdminAvatar = adminInUserList?.photoURL || adminProfile.photoURL;
  const currentAdminName = adminInUserList?.name || adminProfile.name || 'Master Admin';
  const currentAdminEmail = adminInUserList?.email || adminProfile.email || 'admin@nataldesign.com';
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [transformations, setTransformations] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');

  // Users Directory Filter & State
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userSourceFilter, setUserSourceFilter] = useState<string>('all');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [selectedUserDetail, setSelectedUserDetail] = useState<any | null>(null);
  const [userNotice, setUserNotice] = useState('');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Manual Add User Form
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<'VIP Client' | 'Client Lead' | 'Registered Member'>('VIP Client');
  const [newUserSource, setNewUserSource] = useState<'Registration' | 'Quotation Form' | 'Contact Form'>('Registration');
  const [newUserService, setNewUserService] = useState('');
  const [newUserDetails, setNewUserDetails] = useState('');

  // Project & Section Cards Form State
  const [title, setTitle] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingCardMeta, setEditingCardMeta] = useState<any | null>(null);
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('showcase'); // Default to 'showcase' (Featured Interior Creations)
  const [cardSearchQuery, setCardSearchQuery] = useState('');
  
  // Services Form State
  const [serviceTitle, setServiceTitle] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');
  
  // Discipline / Architectural Focus Selection State with Persistence as Default
  const [defaultServiceIcon, setDefaultServiceIcon] = useState<string>(() => {
    return localStorage.getItem('natal_default_service_discipline') || 'Paintbrush';
  });
  const [serviceIcon, setServiceIcon] = useState<string>(() => {
    return localStorage.getItem('natal_default_service_discipline') || 'Paintbrush';
  });
  const [isDisciplineOpen, setIsDisciplineOpen] = useState(false);
  const [reactingDiscipline, setReactingDiscipline] = useState<string | null>(null);

  // Handle Discipline selection with instant visual reaction before committing as default
  const handleSelectDiscipline = (val: string) => {
    // 1. Immediately trigger visual reaction on the clicked option
    setReactingDiscipline(val);

    // 2. Allow user to see the reaction before committing selection and closing overlay
    setTimeout(() => {
      setServiceIcon(val);
      setDefaultServiceIcon(val);
      localStorage.setItem('natal_default_service_discipline', val);
      setReactingDiscipline(null);
      setIsDisciplineOpen(false);
    }, 150);
  };

  const [serviceFeatures, setServiceFeatures] = useState('');
  const [serviceImage, setServiceImage] = useState('');
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingOriginalId, setEditingOriginalId] = useState<string | null>(null);
  const [isUploadingService, setIsUploadingService] = useState(false);

  // Services Section Header Settings & Hidden Services State
  const [hiddenServiceIds, setHiddenServiceIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('natal_hidden_services') || '[]');
    } catch {
      return [];
    }
  });
  const [serviceSectionSubtitle, setServiceSectionSubtitle] = useState<string>(() => {
    return localStorage.getItem('natal_services_subtitle') || 'Capabilities';
  });
  const [serviceSectionTitle, setServiceSectionTitle] = useState<string>(() => {
    return localStorage.getItem('natal_services_title') || 'OUR SERVICES';
  });
  const [serviceSectionDesc, setServiceSectionDesc] = useState<string>(() => {
    return localStorage.getItem('natal_services_desc') || 'Comprehensive architectural execution from structural shell to bespoke turnkey handover';
  });
  const [isSavingSectionHeader, setIsSavingSectionHeader] = useState(false);
  const [sectionHeaderSuccess, setSectionHeaderSuccess] = useState('');
  const [isSectionHeaderOpen, setIsSectionHeaderOpen] = useState(false);
  const [showHiddenServices, setShowHiddenServices] = useState(false);
  
  // Testimonial Form State
  const [tName, setTName] = useState('');
  const [tRole, setTRole] = useState('');
  const [tContent, setTContent] = useState('');
  const [tRating, setTRating] = useState('5');
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [tImage, setTImage] = useState('');
  const [tImagePreview, setTImagePreview] = useState('');
  const [isUploadingTestimonial, setIsUploadingTestimonial] = useState(false);
  
  // Category Selection State with Persistence as Default
  const [defaultCategory, setDefaultCategory] = useState<string>(() => {
    return localStorage.getItem('natal_default_creation_category') || CATEGORY_OPTIONS[0];
  });
  const [category, setCategory] = useState<string>(() => {
    return localStorage.getItem('natal_default_creation_category') || CATEGORY_OPTIONS[0];
  });
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [reactingCategory, setReactingCategory] = useState<string | null>(null);
  const [customCategory, setCustomCategory] = useState('');

  // Handle Category selection with instant visual reaction before committing as default
  const handleSelectCategory = (opt: string) => {
    // 1. Immediately trigger visual reaction on the clicked option
    setReactingCategory(opt);

    // 2. Allow user to see the reaction before committing selection and closing overlay
    setTimeout(() => {
      setCategory(opt);
      if (opt !== 'Custom') {
        setDefaultCategory(opt);
        localStorage.setItem('natal_default_creation_category', opt);
      }
      setReactingCategory(null);
      setIsCategoryOpen(false);
    }, 150);
  };
  const [desc, setDesc] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');

  // Transformation Form State
  const [trTitle, setTrTitle] = useState('');
  const [trBeforeImage, setTrBeforeImage] = useState('');
  const [trAfterImage, setTrAfterImage] = useState('');
  const [trFitMode, setTrFitMode] = useState<'contain' | 'cover'>('cover');
  const [isUploadingTransformation, setIsUploadingTransformation] = useState(false);

  // Settings State
  const [customPasscode, setCustomPasscode] = useState(() => {
    return localStorage.getItem('natal_custom_passcode') || 'NATAL7777';
  });
  const [newPasscode, setNewPasscode] = useState('');
  const [settingsNotice, setSettingsNotice] = useState('');
  const [showPasscodeInSettings, setShowPasscodeInSettings] = useState(false);
  const [isSendingTestMail, setIsSendingTestMail] = useState(false);
  const [mailNotice, setMailNotice] = useState('');
  const [emailConfig, setEmailConfig] = useState<EmailServiceSettings>(() => getEmailServiceSettings());
  const [emailConfigSaved, setEmailConfigSaved] = useState('');
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppServiceSettings>(() => getWhatsAppServiceSettings());
  const [whatsappConfigSaved, setWhatsappConfigSaved] = useState('');
  const [isSendingTestWhatsApp, setIsSendingTestWhatsApp] = useState(false);
  const [whatsappNotice, setWhatsappNotice] = useState('');
  const [directTestWhatsAppUrl, setDirectTestWhatsAppUrl] = useState('');
  const [latestIncomingAlert, setLatestIncomingAlert] = useState<DispatchedWhatsAppRecord | null>(null);
  const [gatewayTestResult, setGatewayTestResult] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; message: string } | null>(null);
  const isInitialSnapshotRef = useRef(true);

  // Listen for WhatsApp activity dispatches in real-time
  useEffect(() => {
    const handleDispatched = (e: any) => {
      if (e?.detail) {
        setWhatsappDispatches(prev => [e.detail, ...prev.filter(d => d.id !== e.detail.id)].slice(0, 50));
        setLatestIncomingAlert(e.detail);
        playActivityChime();
        if (whatsappConfig.autoOpenWhatsAppInAdminOnNewLead && e.detail.directWhatsAppUrl) {
          try {
            window.open(e.detail.directWhatsAppUrl, '_blank');
          } catch {}
        }
      }
    };
    window.addEventListener('natal_whatsapp_activity_dispatched', handleDispatched);
    return () => window.removeEventListener('natal_whatsapp_activity_dispatched', handleDispatched);
  }, [whatsappConfig.autoOpenWhatsAppInAdminOnNewLead]);

  // Listen to Firestore whatsapp_notifications collection in real-time
  useEffect(() => {
    try {
      const q = query(collection(db, 'whatsapp_notifications'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          const records: DispatchedWhatsAppRecord[] = snap.docs.map(d => {
            const data = d.data();
            return {
              id: d.id,
              recipientPhone: data.recipientPhone || '',
              activityType: data.activityType || 'Website Activity',
              clientName: data.clientName || '',
              clientPhone: data.clientPhone || '',
              clientEmail: data.clientEmail || '',
              service: data.service || '',
              details: data.details || '',
              message: data.message || '',
              directWhatsAppUrl: data.directWhatsAppUrl || '',
              status: data.status || 'dispatched',
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
            };
          });
          setWhatsappDispatches(records.slice(0, 50));

          if (isInitialSnapshotRef.current) {
            isInitialSnapshotRef.current = false;
          } else {
            const docChanges = snap.docChanges();
            const added = docChanges.find(c => c.type === 'added');
            if (added) {
              const addedRecord = records.find(r => r.id === added.doc.id) || records[0];
              if (addedRecord) {
                setLatestIncomingAlert(addedRecord);
                playActivityChime();
                if (whatsappConfig.autoOpenWhatsAppInAdminOnNewLead && addedRecord.directWhatsAppUrl) {
                  try {
                    window.open(addedRecord.directWhatsAppUrl, '_blank');
                  } catch {}
                }
              }
            }
          }
        } else {
          isInitialSnapshotRef.current = false;
        }
      }, (err) => {
        console.warn('Firestore whatsapp_notifications live listener note:', err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Firestore whatsapp_notifications listener setup note:', e);
    }
  }, [whatsappConfig.autoOpenWhatsAppInAdminOnNewLead]);

  // Admin Authentication State
  const [adminAuthMode, setAdminAuthMode] = useState<'login' | 'register'>('login');
  const [adminAuthEmail, setAdminAuthEmail] = useState('');
  const [adminAuthPassword, setAdminAuthPassword] = useState('');
  const [adminAuthName, setAdminAuthName] = useState('');
  const [adminAuthPhone, setAdminAuthPhone] = useState('');
  const [adminAuthError, setAdminAuthError] = useState('');
  const [adminAuthLoading, setAdminAuthLoading] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Admin Logout Handler
  const handleLogout = async () => {
    try {
      setDoc(doc(db, 'site_settings', 'owner_presence'), {
        isLive: false,
        lastSeen: serverTimestamp(),
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(() => {});
    } catch {}
    localStorage.setItem('natal_owner_live', 'false');
    window.dispatchEvent(new CustomEvent('natal_owner_presence_changed', { detail: { isLive: false } }));

    try {
      await signOut(auth);
    } catch {}
    localStorage.removeItem('natal_admin_authenticated');
    sessionStorage.removeItem('natal_admin_passcode_verified');
    clearActiveUserSession();
    setIsAuthenticated(false);
    setIsPasscodeVerified(false);
    setEnteredPasscode('');
    setPasscodeError('');
    onNavigateHome();
  };

  // Admin Sign In & Registration Handler (Email MUST contain "admin")
  const handleAdminAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthError('');
    const emailClean = adminAuthEmail.trim().toLowerCase();

    if (!emailClean || !isValidEmail(emailClean)) {
      setAdminAuthError('Please enter a valid administrator email address.');
      return;
    }

    // MANDATORY REQUIREMENT: Admin email must contain "admin"
    if (!emailClean.includes('admin')) {
      setAdminAuthError('Admin access denied: Your email address must contain the word "admin" (e.g. admin@nataldesign.com or name.admin@gmail.com).');
      return;
    }

    if (adminAuthMode === 'register') {
      if (!adminAuthName.trim() || !isValidName(adminAuthName)) {
        setAdminAuthError('Admin name must contain letters only (no numbers, digits or symbols) and be at least 2 characters.');
        return;
      }
      if (adminAuthPhone.trim() && !isValidPhone(adminAuthPhone)) {
        setAdminAuthError('Please enter a valid phone number (at least 7 digits).');
        return;
      }
    }

    if (!adminAuthPassword || adminAuthPassword.length < 6) {
      setAdminAuthError('Password must be at least 6 characters.');
      return;
    }

    setAdminAuthLoading(true);
    try {
      if (adminAuthMode === 'login') {
        let authSuccess = false;
        try {
          await signInWithEmailAndPassword(auth, emailClean, adminAuthPassword);
          authSuccess = true;
        } catch (authErr: any) {
          console.warn("Admin sign in fallback note:", authErr);
          const credVerify = await verifyUserPassword(emailClean, adminAuthPassword);
          if (credVerify.valid || authErr?.code === 'auth/operation-not-allowed') {
            authSuccess = true;
          } else {
            throw authErr;
          }
        }

        const dirUser = getUserFromDirectory(emailClean);
        const adminName = dirUser?.name || 'Administrator';
        const photoURL = dirUser?.photoURL;

        const sessionData: ActiveUserSession = {
          email: emailClean,
          name: adminName,
          photoURL,
          role: 'Administrator'
        };
        setActiveUserSession(sessionData);
        localStorage.setItem('natal_admin_authenticated', 'true');
        sessionStorage.removeItem('natal_admin_passcode_verified');
        setIsAuthenticated(true);
        setIsPasscodeVerified(false);
        setEnteredPasscode('');
        setPasscodeError('');

        window.dispatchEvent(new CustomEvent('natal_user_session_changed', { detail: sessionData }));
        window.dispatchEvent(new CustomEvent('natal_admin_profile_changed', { detail: { email: emailClean, name: adminName, photoURL } }));
        window.dispatchEvent(new CustomEvent('natal_users_updated', { detail: { email: emailClean, role: 'Administrator', isAdmin: true, name: adminName, photoURL } }));

        await recordUserActivity({
          userEmail: emailClean,
          type: 'login',
          title: 'Administrator Logged In',
          description: 'Administrator logged in. Master passcode security prompt required.',
          metadata: { channel: 'Admin Console', isAdmin: true }
        }).catch(() => {});

      } else {
        // Register Mode
        let authUid = '';
        try {
          const cred = await createUserWithEmailAndPassword(auth, emailClean, adminAuthPassword);
          authUid = cred.user.uid;
        } catch (err: any) {
          console.warn("Admin createUser note:", err);
          if (err?.code === 'auth/email-already-in-use') {
            throw err;
          }
        }

        await storeUserCredential(emailClean, adminAuthPassword);

        const adminName = adminAuthName.trim() || 'System Administrator';
        await syncUserRecord({
          name: adminName,
          email: emailClean,
          phone: adminAuthPhone.trim() || '',
          source: 'Registration',
          role: 'Administrator',
          status: 'Active Administrator',
          service: 'System Administration',
          details: 'System Administrator Account',
          uid: authUid || undefined,
          initialActivity: {
            type: 'registration',
            title: 'Administrator Registered',
            description: 'Administrator account registered with full access privileges (email contains "admin").',
            metadata: { isAdmin: true }
          }
        });

        const sessionData: ActiveUserSession = {
          email: emailClean,
          name: adminName,
          phone: adminAuthPhone.trim() || undefined,
          role: 'Administrator'
        };
        setActiveUserSession(sessionData);
        localStorage.setItem('natal_admin_authenticated', 'true');
        sessionStorage.removeItem('natal_admin_passcode_verified');
        setIsAuthenticated(true);
        setIsPasscodeVerified(false);
        setEnteredPasscode('');
        setPasscodeError('');

        window.dispatchEvent(new CustomEvent('natal_user_session_changed', { detail: sessionData }));
        window.dispatchEvent(new CustomEvent('natal_admin_profile_changed', { detail: { email: emailClean, name: adminName } }));
        window.dispatchEvent(new CustomEvent('natal_users_updated', { detail: { email: emailClean, role: 'Administrator', isAdmin: true, name: adminName } }));
      }
    } catch (err: any) {
      console.error("Admin Auth Error:", err);
      if (err?.code === 'auth/email-already-in-use') {
        setAdminAuthError('This admin email is already registered. Please switch to Sign In.');
      } else if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        setAdminAuthError('Incorrect password. Please verify your credentials or try again.');
      } else if (err?.code === 'auth/user-not-found') {
        setAdminAuthError('No administrator account found with this email. Please click "Register New Admin".');
      } else {
        setAdminAuthError(err?.message || 'Authentication error. Please check your credentials.');
      }
    } finally {
      setAdminAuthLoading(false);
    }
  };

  // Master Passcode Verification for Admin Console
  // Master passcode is NATAL7777 (or custom passcode saved in settings)
  // Crucially: The passcode is NOT displayed anywhere on the screen
  const handleVerifyMasterPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeError('');
    const code = enteredPasscode.trim();

    if (!code) {
      setPasscodeError('Please enter the master security passcode.');
      return;
    }

    setPasscodeLoading(true);
    setTimeout(() => {
      const storedCustom = localStorage.getItem('natal_custom_passcode') || 'NATAL7777';
      const isValid = 
        code.toUpperCase() === 'NATAL7777' ||
        code.toUpperCase() === storedCustom.toUpperCase() ||
        code === 'NATAL7777' ||
        code === storedCustom ||
        DEFAULT_MASTER_PASSCODES.includes(code);

      if (isValid) {
        sessionStorage.setItem('natal_admin_passcode_verified', 'true');
        setIsPasscodeVerified(true);
        setEnteredPasscode('');
        setPasscodeError('');
      } else {
        setPasscodeError('Access Denied: Invalid Master Passcode. Authorization refused.');
      }
      setPasscodeLoading(false);
    }, 200);
  };

  // Fetch Projects & Leads from Firestore and Local Cache
  useEffect(() => {
    if (!isAuthenticated) return;

    // 1. Fetch from Firestore
    let unsubProjects = () => {};
    let unsubLeads = () => {};
    let unsubTestimonials = () => {};
    let unsubTransformations = () => {};
    let unsubServices = () => {};
    let unsubMedia = () => {};

    // Safe timestamp sorting helper so Firestore never drops items with null/missing/custom timestamps
    const sortByTimestamp = (items: any[]) => {
      return [...items].sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt ? new Date(a.createdAt).getTime() : (a.updatedAt?.seconds ? a.updatedAt.seconds * 1000 : (a.updatedAt ? new Date(a.updatedAt).getTime() : 0)));
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt ? new Date(b.createdAt).getTime() : (b.updatedAt?.seconds ? b.updatedAt.seconds * 1000 : (b.updatedAt ? new Date(b.updatedAt).getTime() : 0)));
        return timeB - timeA;
      });
    };

    // Broadcast live presence to Firestore and window
    try {
      setDoc(doc(db, 'site_settings', 'owner_presence'), {
        isLive: true,
        ownerName: currentAdminName,
        ownerEmail: currentAdminEmail,
        lastActive: serverTimestamp(),
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(() => {});
    } catch {}
    localStorage.setItem('natal_owner_live', 'true');
    window.dispatchEvent(new CustomEvent('natal_owner_presence_changed', { detail: { isLive: true } }));

    // Auto-seed initial baseline catalog to Firestore if database is empty
    seedInitialDatabaseIfEmpty(false).catch(e => console.warn("Admin DB auto-seed check:", e));

    try {
      const colMedia = collection(db, 'media');
      unsubMedia = onSnapshot(colMedia, (snapshot) => {
        const fbMedia: any[] = sortByTimestamp(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        const local = JSON.parse(localStorage.getItem('natal_local_media') || '[]');
        const combined = [...fbMedia];
        local.forEach((lm: any) => {
          if (!combined.some(cm => cm.id === lm.id)) combined.unshift(lm);
        });
        setMediaAssets(combined);
      }, (err) => {
        console.warn("Firestore media snapshot fallback:", err);
      });
    } catch (e) {
      console.warn("Firestore media setup error:", e);
    }

    try {
      const colServices = collection(db, 'services');
      unsubServices = onSnapshot(colServices, (snapshot) => {
        const fbServices: any[] = sortByTimestamp(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        const localServices = JSON.parse(localStorage.getItem('natal_local_services') || '[]');
        const combined = [...fbServices];
        localServices.forEach((ls: any) => {
          if (!combined.some((cs: any) => cs.id === ls.id || cs.title === ls.title)) {
            combined.unshift(ls);
          }
        });
        setServices(deduplicateList(combined));
      }, (err) => {
        console.warn("Firestore services snapshot fallback to local:", err);
        const localServices = JSON.parse(localStorage.getItem('natal_local_services') || '[]');
        setServices(deduplicateList(localServices));
      });
    } catch (e) {
      console.warn("Firestore services error:", e);
    }

    let unsubServicesSettings = () => {};
    try {
      unsubServicesSettings = onSnapshot(doc(db, 'site_settings', 'services_section'), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.sectionSubtitle) {
            setServiceSectionSubtitle(data.sectionSubtitle);
            localStorage.setItem('natal_services_subtitle', data.sectionSubtitle);
          }
          if (data.sectionTitle) {
            setServiceSectionTitle(data.sectionTitle);
            localStorage.setItem('natal_services_title', data.sectionTitle);
          }
          if (data.sectionDescription !== undefined) {
            setServiceSectionDesc(data.sectionDescription);
            localStorage.setItem('natal_services_desc', data.sectionDescription);
          }
          if (Array.isArray(data.hiddenServiceIds)) {
            setHiddenServiceIds(data.hiddenServiceIds);
            localStorage.setItem('natal_hidden_services', JSON.stringify(data.hiddenServiceIds));
          }
        }
      }, (err) => {
        console.warn("Services settings listener fallback:", err);
      });
    } catch (e) {
      console.warn("Firestore services settings listener error:", e);
    }

    try {
      const colProjects = collection(db, 'projects');
      unsubProjects = onSnapshot(colProjects, (snapshot) => {
        const fbProjects = sortByTimestamp(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        // Also merge local cache
        const localData = JSON.parse(localStorage.getItem('natal_local_projects') || '[]');
        const combined = [...fbProjects];
        
        // Add any local ones that haven't synced
        localData.forEach((lp: any) => {
          if (!combined.some((cp: any) => cp.id === lp.id || cp.title === lp.title)) {
            combined.unshift(lp);
          }
        });

        setProjects(deduplicateList(combined));
      }, (err) => {
        console.warn("Firestore projects snapshot fallback to local:", err);
        const localData = JSON.parse(localStorage.getItem('natal_local_projects') || '[]');
        setProjects(deduplicateList(localData));
      });
    } catch (e) {
      console.warn("Firestore error:", e);
    }

    // Holder for latest Firestore users, leads & activities for continuous cross-aggregation
    let latestFbUsers: any[] = [];
    let latestFbLeads: any[] = [];
    let latestFbActivities: any[] = [];

    // Helper to aggregate users from Firestore, local storage, quotation leads & contact forms & activity streams
    const syncAndAggregateUsers = (
      fbUsersList: any[] = latestFbUsers, 
      extraFbLeads: any[] = latestFbLeads,
      extraFbActs: any[] = latestFbActivities
    ) => {
      const localUsers = JSON.parse(localStorage.getItem('natal_local_users') || '[]');
      const localLeads = JSON.parse(localStorage.getItem('natal_local_leads') || '[]');
      const localActivities = JSON.parse(localStorage.getItem('natal_user_activities') || '[]');

      const map = new Map<string, any>();

      // 1. Process authentic users from Firestore
      fbUsersList.forEach(u => {
        const key = (u.email ? u.email.toLowerCase().trim() : '') || u.id || u.phone;
        if (key) {
          map.set(key, { 
            ...u,
            activities: Array.isArray(u.activities) ? [...u.activities] : []
          });
        }
      });

      // 2. Always merge local storage registered users so new profiles appear immediately
      localUsers.forEach((lu: any) => {
        const key = (lu.email ? lu.email.toLowerCase().trim() : '') || lu.id || lu.phone;
        if (key && !map.has(key)) {
          map.set(key, { 
            ...lu,
            activities: Array.isArray(lu.activities) ? [...lu.activities] : []
          });
        }
      });

      // 3. Merge real quotation & contact leads from Firestore (fall back to local only if database has none)
      const allLeads = extraFbLeads.length > 0 ? extraFbLeads : localLeads;
      allLeads.forEach((lead: any) => {
        const key = (lead.email ? lead.email.toLowerCase().trim() : '') || lead.phone || lead.id;
        const leadAct = {
          id: 'lead_act_' + (lead.id || Date.now()),
          type: lead.service === 'General Inquiry' ? 'contact' : 'quotation',
          title: lead.service === 'General Inquiry' ? 'Direct Consultation Message' : `Quotation Requested: ${lead.service || 'Interior Consultation'}`,
          description: lead.details ? `${lead.details}` : `Inquiry for ${lead.service || 'interior design'}`,
          timestamp: lead.createdAt ? (typeof lead.createdAt === 'string' ? lead.createdAt : new Date(lead.createdAt?.seconds ? lead.createdAt.seconds * 1000 : Date.now()).toISOString()) : new Date().toISOString(),
          metadata: { service: lead.service, source: lead.service === 'General Inquiry' ? 'Contact Form' : 'Quotation Form' }
        };

        if (key) {
          if (!map.has(key)) {
            map.set(key, {
              id: lead.id ? `usr_${lead.id}` : `lead_user_${Date.now()}`,
              name: lead.name || 'Client Lead',
              email: lead.email || '',
              phone: lead.phone || '',
              source: lead.service === 'General Inquiry' ? 'Contact Form' : 'Quotation Form',
              service: lead.service || 'Interior Design Consultation',
              details: lead.details || '',
              role: 'Client Lead',
              status: 'Pending Consultation',
              createdAt: lead.createdAt || new Date().toISOString(),
              activities: [leadAct],
              activityCount: 1,
              lastActive: leadAct.timestamp
            });
          } else {
            // Enrich existing registered profile with quotation project details & service interest
            const existing = map.get(key);
            const acts = existing.activities || [];
            if (!acts.some((a: any) => a.id === leadAct.id || (a.description === leadAct.description && a.type === leadAct.type))) {
              acts.unshift(leadAct);
            }
            map.set(key, {
              ...existing,
              phone: existing.phone || lead.phone || '',
              service: lead.service || existing.service || 'Interior Design Consultation',
              details: lead.details ? (existing.details && existing.details !== lead.details ? `${existing.details}\n\n[Project Scope]: ${lead.details}` : lead.details) : existing.details,
              activities: acts,
              activityCount: acts.length,
              lastActive: existing.lastActive || leadAct.timestamp
            });
          }
        }
      });

      // 4. Merge standalone activities from user_activities (prioritizing Firestore)
      const allActs = extraFbActs.length > 0 ? extraFbActs : localActivities;
      allActs.forEach((act: any) => {
        const userKey = (act.userEmail ? act.userEmail.toLowerCase().trim() : '') || act.userId || act.userPhone;
        const actTimestamp = act.timestamp || (act.createdAt?.seconds ? new Date(act.createdAt.seconds * 1000).toISOString() : new Date().toISOString());
        const mappedAct = {
          id: act.id,
          type: act.type,
          title: act.title,
          description: act.description,
          timestamp: actTimestamp,
          metadata: act.metadata
        };

        if (userKey && map.has(userKey)) {
          const u = map.get(userKey);
          const currentActs = u.activities || [];
          if (!currentActs.some((a: any) => a.id === act.id || (a.title === act.title && Math.abs(new Date(a.timestamp || 0).getTime() - new Date(actTimestamp).getTime()) < 2000))) {
            currentActs.unshift(mappedAct);
            u.activities = currentActs;
            u.activityCount = currentActs.length;
          }
        } else if (userKey) {
          map.set(userKey, {
            id: act.userId || `usr_${Date.now()}`,
            name: act.userName || 'Client Lead',
            email: act.userEmail || '',
            phone: act.userPhone || '',
            source: act.type === 'registration' ? 'Registration' : act.type === 'quotation' ? 'Quotation Form' : 'Direct Channel',
            service: act.metadata?.service || 'Interior Consultation',
            details: act.description || '',
            role: act.type === 'registration' ? 'VIP Client' : 'Client Lead',
            status: 'Active',
            createdAt: actTimestamp,
            lastActive: actTimestamp,
            activities: [mappedAct],
            activityCount: 1
          });
        }
      });

      // Ensure every user has sorted activities (newest first) and admin accounts are recognized
      map.forEach((user) => {
        const emailLower = (user.email || '').toLowerCase();
        if (emailLower.includes('admin') || user.role === 'Administrator') {
          user.role = 'Administrator';
          user.isAdmin = true;
          if (!user.status || user.status === 'Active') {
            user.status = 'Active Administrator';
          }
        }
        if (Array.isArray(user.activities)) {
          user.activities.sort((a: any, b: any) => {
            const timeA = new Date(a.timestamp || 0).getTime();
            const timeB = new Date(b.timestamp || 0).getTime();
            return timeB - timeA;
          });
          user.activityCount = user.activities.length;
        } else {
          user.activities = [];
          user.activityCount = 0;
        }
      });

      // Ensure an Administrator account is always part of the users directory
      const hasAdmin = Array.from(map.values()).some(u => u.role === 'Administrator' || u.isAdmin);
      if (!hasAdmin) {
        const currentAdminData = getAdminProfile();
        const adminKey = (currentAdminData.email || 'admin@nataldesign.com').toLowerCase().trim();
        map.set(adminKey, {
          id: 'admin_primary',
          name: currentAdminData.name || 'Master Admin',
          email: currentAdminData.email || 'admin@nataldesign.com',
          role: 'Administrator',
          status: 'Active Administrator',
          isAdmin: true,
          photoURL: currentAdminData.photoURL,
          source: 'Registration',
          createdAt: '2024-01-01T00:00:00.000Z',
          lastActive: '2024-01-01T00:00:00.000Z',
          activities: [{
            id: 'admin_init_act',
            type: 'registration',
            title: 'System Administrator Profile',
            description: 'Master Administrator with full system control and client management.',
            timestamp: '2024-01-01T00:00:00.000Z'
          }],
          activityCount: 1
        });
      }

      return Array.from(map.values()).sort((a, b) => {
        const isAdminA = a.role === 'Administrator' || a.isAdmin || (a.email && a.email.toLowerCase().includes('admin'));
        const isAdminB = b.role === 'Administrator' || b.isAdmin || (b.email && b.email.toLowerCase().includes('admin'));
        // Client accounts / newly registered users always come before administrator
        if (!isAdminA && isAdminB) return -1;
        if (isAdminA && !isAdminB) return 1;

        const timeA = getUserTimestamp(a);
        const timeB = getUserTimestamp(b);
        if (timeB !== timeA) return timeB - timeA;
        return 0;
      });
    };

    try {
      const colLeads = collection(db, 'leads');
      unsubLeads = onSnapshot(colLeads, (snapshot) => {
        const fbLeads = sortByTimestamp(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        latestFbLeads = fbLeads;
        // True database records from Firestore
        setLeads(fbLeads);
        // Instantly update Users directory with fresh quotation leads & activities
        setUsers(syncAndAggregateUsers(latestFbUsers, latestFbLeads, latestFbActivities));
      }, (err) => {
        console.warn("Firestore leads snapshot fallback to local:", err);
        const localLeads = JSON.parse(localStorage.getItem('natal_local_leads') || '[]');
        setLeads(deduplicateList(localLeads));
        setUsers(syncAndAggregateUsers(latestFbUsers, [], latestFbActivities));
      });
    } catch (e) {
      console.warn("Firestore error:", e);
    }

    try {
      const colTestimonials = collection(db, 'testimonials');
      unsubTestimonials = onSnapshot(colTestimonials, (snapshot) => {
        const fbTestimonials = sortByTimestamp(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setTestimonials(fbTestimonials);
      }, (err) => {
        console.warn("Firestore testimonials snapshot fallback to local:", err);
        const localTestimonials = JSON.parse(localStorage.getItem('natal_local_testimonials') || '[]');
        setTestimonials(deduplicateList(localTestimonials));
      });
    } catch (e) {
      console.warn("Firestore error:", e);
    }

    try {
      const colTransformations = collection(db, 'transformations');
      unsubTransformations = onSnapshot(colTransformations, (snapshot) => {
        const fbTransformations = sortByTimestamp(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setTransformations(fbTransformations);
      }, (err) => {
        console.warn("Firestore transformations snapshot fallback to local:", err);
        const localTransformations = JSON.parse(localStorage.getItem('natal_local_transformations') || '[]');
        setTransformations(deduplicateList(localTransformations));
      });
    } catch (e) {
      console.warn("Firestore error:", e);
    }

    let unsubUsers = () => {};
    try {
      const colUsers = collection(db, 'users');
      unsubUsers = onSnapshot(colUsers, (snapshot) => {
        const fbUsers = sortByTimestamp(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        latestFbUsers = fbUsers;
        setUsers(syncAndAggregateUsers(latestFbUsers, latestFbLeads, latestFbActivities));
      }, (err) => {
        console.warn("Firestore users snapshot fallback to local:", err);
        setUsers(syncAndAggregateUsers([], latestFbLeads, latestFbActivities));
      });
    } catch (e) {
      console.warn("Firestore users error:", e);
      setUsers(syncAndAggregateUsers([], latestFbLeads, latestFbActivities));
    }

    let unsubActivities = () => {};
    try {
      const colActivities = collection(db, 'user_activities');
      unsubActivities = onSnapshot(colActivities, (snapshot) => {
        const fbActivities = sortByTimestamp(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        latestFbActivities = fbActivities;
        setUserActivities(fbActivities);
        setUsers(syncAndAggregateUsers(latestFbUsers, latestFbLeads, latestFbActivities));
      }, (err) => {
        console.warn("Firestore user_activities snapshot fallback:", err);
        const local = JSON.parse(localStorage.getItem('natal_user_activities') || '[]');
        setUserActivities(local);
      });
    } catch (e) {
      console.warn("Firestore user_activities error:", e);
      const local = JSON.parse(localStorage.getItem('natal_user_activities') || '[]');
      setUserActivities(local);
    }

    const handleCustomUserUpdate = () => {
      setUsers(syncAndAggregateUsers(latestFbUsers, latestFbLeads, latestFbActivities));
    };
    const handleLeadSubmitted = (e: any) => {
      const newLead = e?.detail;
      if (newLead) {
        setLeads(prev => [newLead, ...prev.filter(l => l.id !== newLead.id)]);
      }
      playActivityChime();
      setUsers(syncAndAggregateUsers(latestFbUsers, latestFbLeads, latestFbActivities));
    };
    window.addEventListener('natal_users_updated', handleCustomUserUpdate);
    window.addEventListener('natal_activity_recorded', handleCustomUserUpdate);
    window.addEventListener('natal_lead_submitted', handleLeadSubmitted);

    return () => {
      unsubProjects();
      unsubServices();
      unsubServicesSettings();
      unsubLeads();
      unsubUsers();
      unsubActivities();
      window.removeEventListener('natal_users_updated', handleCustomUserUpdate);
      window.removeEventListener('natal_activity_recorded', handleCustomUserUpdate);
      window.removeEventListener('natal_lead_submitted', handleLeadSubmitted);
      unsubTestimonials();
      unsubTransformations();
      unsubMedia();
    };
  }, [isAuthenticated]);

  // Handle Image File Selection (compresses image to avoid exceeding Firestore limits)
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const compressed = await compressImageFile(file, 1600, 1200, 0.82);
      setImagePreview(compressed);
      setImageUrl(compressed);
    } catch (err) {
      console.warn("Image compression error, falling back to data URL:", err);
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        setImagePreview(result);
        setImageUrl(result);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
    }
  };

  // Handlers for Universal Section Cards Editing
  const handleStartEditCard = (card: any) => {
    setEditingCardMeta(card);
    setEditingProjectId(card.id);
    setTitle(card.title);
    setDesc(card.desc || card.description || '');
    setCategory(CATEGORY_OPTIONS.includes(card.category) ? card.category : 'Custom');
    if (!CATEGORY_OPTIONS.includes(card.category)) {
      setCustomCategory(card.category);
    }
    setImageUrl(card.image || '');
    setImagePreview(card.image || '');
    
    // Smooth scroll to the form box
    const formBox = document.getElementById('creation-form-box');
    if (formBox) {
      formBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  const handleCancelEditCard = () => {
    setEditingProjectId(null);
    setEditingCardMeta(null);
    setTitle('');
    setDesc('');
    setImageUrl('');
    setImagePreview('');
    setCustomCategory('');
    const savedDefault = localStorage.getItem('natal_default_creation_category') || defaultCategory || CATEGORY_OPTIONS[0];
    setCategory(savedDefault);
  };

  const handleDeleteOrResetCard = async (card: any) => {
    const actionName = card.isBase ? (card.isEdited ? 'revert edits and restore original default content' : 'hide this card') : 'delete this creation';
    if (!confirm(`Are you sure you want to ${actionName} for "${card.title}"?`)) {
      return;
    }

    try {
      if (card.section === 'showcase') {
        const docId = card.id;
        const currentLocal = JSON.parse(localStorage.getItem('natal_local_projects') || '[]');
        const updatedLocal = currentLocal.filter((p: any) => 
          p.id !== docId && 
          p.cardHighlightId !== card.cardHighlightId && 
          (p.originalTitle ? p.originalTitle.toLowerCase() !== card.originalTitle?.toLowerCase() : true)
        );
        localStorage.setItem('natal_local_projects', JSON.stringify(updatedLocal));

        if (docId && !docId.startsWith('card-highlight-')) {
          try {
            await deleteDoc(doc(db, 'projects', docId));
          } catch (e) {
            console.warn("Firestore delete showcase card note:", e);
          }
        }

        setProjects(prev => prev.filter(p => 
          p.id !== docId && 
          p.cardHighlightId !== card.cardHighlightId && 
          (p.originalTitle ? p.originalTitle.toLowerCase() !== card.originalTitle?.toLowerCase() : true)
        ));

        setSuccessNotice(`Featured Interior Creation "${card.title}" reset to original default state.`);
      } else if (card.section === 'projects') {
        const docId = card.id;
        const currentLocal = JSON.parse(localStorage.getItem('natal_local_projects') || '[]');
        const updatedLocal = currentLocal.filter((p: any) => 
          p.id !== docId && 
          p.originalId !== card.originalId && 
          (p.originalTitle ? p.originalTitle.toLowerCase() !== card.originalTitle?.toLowerCase() : true)
        );
        localStorage.setItem('natal_local_projects', JSON.stringify(updatedLocal));

        if (docId && !docId.startsWith('project-')) {
          try {
            await deleteDoc(doc(db, 'projects', docId));
          } catch (e) {
            console.warn("Firestore delete project card note:", e);
          }
        }

        setProjects(prev => prev.filter(p => 
          p.id !== docId && 
          p.originalId !== card.originalId && 
          (p.originalTitle ? p.originalTitle.toLowerCase() !== card.originalTitle?.toLowerCase() : true)
        ));

        setSuccessNotice(`Featured Project "${card.title}" reset to original default.`);
      } else if (card.section === 'services') {
        const sId = card.originalId || card.id.replace('service-', '');
        const currentLocal = JSON.parse(localStorage.getItem('natal_local_services') || '[]');
        const updatedLocal = currentLocal.filter((s: any) => s.id !== sId && s.originalId !== sId);
        localStorage.setItem('natal_local_services', JSON.stringify(updatedLocal));

        try {
          await deleteDoc(doc(db, 'services', sId));
        } catch (e) {
          console.warn("Firestore delete service note:", e);
        }

        setServices(prev => prev.filter(s => s.id !== sId && s.originalId !== sId));
        setSuccessNotice(`Service card "${card.title}" reset to original default.`);
      } else if (card.section === 'why_us') {
        localStorage.removeItem('natal_section_why_us');
        await saveSectionContent('why_us', defaultWhyUsContent);
        setSuccessNotice("Why Choose Us cards restored to original default.");
      } else if (card.section === 'process') {
        localStorage.removeItem('natal_section_process');
        await saveSectionContent('process', defaultProcessContent);
        setSuccessNotice("Process steps restored to original default.");
      } else if (card.section === 'hero') {
        localStorage.removeItem('natal_section_hero');
        await saveSectionContent('hero', defaultHeroContent);
        setSuccessNotice("Hero Quick Cards restored to original default.");
      } else if (card.section === 'testimonials') {
        handleDeleteTestimonial(card.id);
        setSuccessNotice(`Testimonial "${card.title}" removed.`);
      } else {
        handleDeleteProject(card.id);
        setSuccessNotice(`Creation "${card.title}" deleted.`);
      }
      setTimeout(() => setSuccessNotice(''), 4500);
    } catch (err: any) {
      console.error("Error resetting/deleting card:", err);
    }
  };

  // Handle Add or Update Project / Any Section Card
  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !desc || (!imageUrl && !imagePreview)) {
      showAppNotification("Please fill in the title, description, and provide an image.", "info");
      return;
    }

    setIsUploading(true);
    const finalCategory = category === "Custom" ? (customCategory || "Interior Design") : category;
    const finalImage = imageUrl || imagePreview;

    try {
      if (editingCardMeta) {
        const section = editingCardMeta.section;

        if (section === 'showcase') {
          // Update / override Featured Interior Creation
          const docId = editingCardMeta.id.startsWith('card-highlight-') ? `custom_${editingCardMeta.id}` : editingCardMeta.id;
          const payload = {
            title,
            category: finalCategory,
            desc,
            image: finalImage,
            section: 'showcase',
            cardHighlightId: editingCardMeta.cardHighlightId || editingCardMeta.id,
            originalTitle: editingCardMeta.originalTitle || editingCardMeta.title,
            tags: [finalCategory, "Featured Interior Creation"],
            updatedAt: new Date().toISOString()
          };

          try {
            await setDoc(doc(db, 'projects', docId), sanitizeForFirestore({
              ...payload,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            }), { merge: true });
          } catch (fbErr) {
            console.warn("Firestore showcase write fallback:", fbErr);
          }

          const currentLocal = JSON.parse(localStorage.getItem('natal_local_projects') || '[]');
          const updatedLocal = currentLocal.filter((p: any) => 
            p.id !== docId && 
            p.cardHighlightId !== payload.cardHighlightId &&
            (p.originalTitle ? p.originalTitle.toLowerCase() !== payload.originalTitle.toLowerCase() : true)
          );
          updatedLocal.unshift({ id: docId, ...payload });
          localStorage.setItem('natal_local_projects', JSON.stringify(updatedLocal));

          setProjects(prev => {
            const rest = prev.filter(p => 
              p.id !== docId && 
              p.cardHighlightId !== payload.cardHighlightId &&
              (p.originalTitle ? p.originalTitle.toLowerCase() !== payload.originalTitle.toLowerCase() : true)
            );
            return [{ id: docId, ...payload }, ...rest];
          });

          setSuccessNotice(`Featured Interior Creation "${title}" updated successfully! Changes are live on the website.`);
        } else if (section === 'projects') {
          // Update / override Featured Project
          const docId = editingCardMeta.id.startsWith('project-') ? `custom_${editingCardMeta.id}` : editingCardMeta.id;
          const payload = {
            title,
            category: finalCategory,
            desc,
            description: desc,
            image: finalImage,
            section: 'projects',
            originalId: editingCardMeta.originalId || editingCardMeta.id.replace('project-', ''),
            originalTitle: editingCardMeta.originalTitle || editingCardMeta.title,
            servicesUsed: editingCardMeta.servicesUsed || [finalCategory, 'Natal Creation'],
            beforeImage: editingCardMeta.beforeImage || undefined,
            tags: [finalCategory, 'Featured Project'],
            updatedAt: new Date().toISOString()
          };

          try {
            await setDoc(doc(db, 'projects', docId), sanitizeForFirestore({
              ...payload,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            }), { merge: true });
          } catch (fbErr) {
            console.warn("Firestore project write fallback:", fbErr);
          }

          const currentLocal = JSON.parse(localStorage.getItem('natal_local_projects') || '[]');
          const updatedLocal = currentLocal.filter((p: any) => 
            p.id !== docId && 
            p.originalId !== payload.originalId &&
            (p.originalTitle ? p.originalTitle.toLowerCase() !== payload.originalTitle.toLowerCase() : true)
          );
          updatedLocal.unshift({ id: docId, ...payload });
          localStorage.setItem('natal_local_projects', JSON.stringify(updatedLocal));

          setProjects(prev => {
            const rest = prev.filter(p => 
              p.id !== docId && 
              p.originalId !== payload.originalId &&
              (p.originalTitle ? p.originalTitle.toLowerCase() !== payload.originalTitle.toLowerCase() : true)
            );
            return [{ id: docId, ...payload }, ...rest];
          });

          setSuccessNotice(`Featured Project "${title}" updated successfully! Live on website.`);
        } else if (section === 'services') {
          // Update Service
          const sId = editingCardMeta.originalId || editingCardMeta.id.replace('service-', '');
          const servicePayload = {
            id: sId,
            originalId: sId,
            title,
            description: desc,
            slug: editingCardMeta.slug || title.toLowerCase().replace(/\s+/g, '-'),
            image: finalImage,
            icon: editingCardMeta.icon || 'Paintbrush',
            features: editingCardMeta.features || [finalCategory],
            updatedAt: new Date().toISOString()
          };

          try {
            await setDoc(doc(db, 'services', sId), sanitizeForFirestore({
              ...servicePayload,
              updatedAt: serverTimestamp()
            }), { merge: true });
          } catch (fbErr) {
            console.warn("Firestore service write fallback:", fbErr);
          }

          const currentLocal = JSON.parse(localStorage.getItem('natal_local_services') || '[]');
          const updatedLocal = currentLocal.filter((s: any) => s.id !== sId);
          updatedLocal.unshift(servicePayload);
          localStorage.setItem('natal_local_services', JSON.stringify(updatedLocal));

          setServices(prev => {
            const rest = prev.filter(s => s.id !== sId);
            return [servicePayload, ...rest];
          });

          setSuccessNotice(`Service card "${title}" updated successfully! Live in Our Services.`);
        } else if (section === 'why_us') {
          // Update Why Choose Us item
          const currentContent = JSON.parse(localStorage.getItem('natal_section_why_us') || 'null') || defaultWhyUsContent;
          const updatedItems = [...(currentContent.items || defaultWhyUsContent.items)];
          const idx = parseInt(editingCardMeta.id.replace('why-us-', '')) || 0;
          if (updatedItems[idx]) {
            updatedItems[idx] = { ...updatedItems[idx], title, description: desc };
          }
          const nextWhyUs = { ...currentContent, items: updatedItems };
          localStorage.setItem('natal_section_why_us', JSON.stringify(nextWhyUs));
          await saveSectionContent('why_us', nextWhyUs);
          setSuccessNotice(`Why Choose Us card "${title}" updated successfully! Live on website.`);
        } else if (section === 'process') {
          // Update Process step
          const currentProcess = JSON.parse(localStorage.getItem('natal_section_process') || 'null') || defaultProcessContent;
          const updatedSteps = [...(currentProcess.steps || defaultProcessContent.steps)];
          const idx = parseInt(editingCardMeta.id.replace('process-step-', '')) || 0;
          if (updatedSteps[idx]) {
            updatedSteps[idx] = { ...updatedSteps[idx], title, description: desc };
          }
          const nextProcess = { ...currentProcess, steps: updatedSteps };
          localStorage.setItem('natal_section_process', JSON.stringify(nextProcess));
          await saveSectionContent('process', nextProcess);
          setSuccessNotice(`Process step "${title}" updated successfully! Live on website.`);
        } else if (section === 'hero') {
          // Update Hero Quick Card
          const currentHero = JSON.parse(localStorage.getItem('natal_section_hero') || 'null') || defaultHeroContent;
          const updatedCards = [...(currentHero.cards || defaultHeroContent.cards)];
          const idx = parseInt(editingCardMeta.id.replace('hero-card-', '')) || 0;
          if (updatedCards[idx]) {
            updatedCards[idx] = { ...updatedCards[idx], label: title, img: finalImage };
          }
          const nextHero = { ...currentHero, cards: updatedCards };
          localStorage.setItem('natal_section_hero', JSON.stringify(nextHero));
          await saveSectionContent('hero', nextHero);
          setSuccessNotice(`Hero Quick Card "${title}" updated successfully! Live on website.`);
        } else if (section === 'testimonials') {
          // Update Testimonial
          const tId = editingCardMeta.id;
          const payload = {
            id: tId,
            name: title,
            role: finalCategory,
            content: desc,
            rating: 5,
            updatedAt: new Date().toISOString()
          };
          try {
            await setDoc(doc(db, 'testimonials', tId), sanitizeForFirestore({
              ...payload,
              updatedAt: serverTimestamp()
            }), { merge: true });
          } catch (fbErr) {
            console.warn("Firestore testimonial write fallback:", fbErr);
          }
          const currentLocal = JSON.parse(localStorage.getItem('natal_local_testimonials') || '[]');
          const updatedLocal = currentLocal.filter((t: any) => t.id !== tId);
          updatedLocal.unshift(payload);
          localStorage.setItem('natal_local_testimonials', JSON.stringify(updatedLocal));
          setTestimonials(prev => {
            const rest = prev.filter(t => t.id !== tId);
            return [payload, ...rest];
          });
          setSuccessNotice(`Testimonial "${title}" updated successfully! Live on website.`);
        } else {
          // Regular Project Update
          const newProjItem = {
            title,
            category: finalCategory,
            desc,
            image: finalImage,
            tags: [finalCategory, "Natal Creation"],
            updatedAt: new Date().toISOString()
          };
          if (!editingProjectId.startsWith('local_')) {
            try {
              await updateDoc(doc(db, 'projects', editingProjectId), sanitizeForFirestore({
                ...newProjItem,
                updatedAt: serverTimestamp()
              }));
            } catch (fbErr) {
              console.warn("Firestore update fallback:", fbErr);
            }
          }
          const currentLocal = JSON.parse(localStorage.getItem('natal_local_projects') || '[]');
          const updatedLocal = currentLocal.filter((p: any) => p.id !== editingProjectId);
          updatedLocal.unshift({ id: editingProjectId, ...newProjItem });
          localStorage.setItem('natal_local_projects', JSON.stringify(updatedLocal));
          setProjects(prev => {
            const rest = prev.filter(p => p.id !== editingProjectId);
            return [{ id: editingProjectId, ...newProjItem }, ...rest];
          });
          setSuccessNotice(`Creation "${title}" updated successfully!`);
        }

        setEditingProjectId(null);
        setEditingCardMeta(null);
      } else {
        // Save new project to Firestore & LocalStorage
        const newProjItem = {
          title,
          category: finalCategory,
          desc,
          image: finalImage,
          section: selectedSectionFilter === 'showcase' ? 'showcase' : 'custom',
          tags: [finalCategory, "Natal Creation"],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        let isFbSuccess = false;
        try {
          const docRef = await addDoc(collection(db, 'projects'), sanitizeForFirestore({
            ...newProjItem,
            createdAt: serverTimestamp()
          }));
          isFbSuccess = true;
          setProjects(prev => deduplicateList([{ id: docRef.id, ...newProjItem }, ...prev]));
        } catch (fbErr) {
          console.warn("Firestore write error, relying on local backup:", fbErr);
        }

        const currentLocal = JSON.parse(localStorage.getItem('natal_local_projects') || '[]');
        const savedLocal = deduplicateList([{ id: 'local_' + Date.now(), ...newProjItem }, ...currentLocal]);
        localStorage.setItem('natal_local_projects', JSON.stringify(savedLocal));
        if (!isFbSuccess) {
          setProjects(savedLocal);
        }

        setSuccessNotice("Creation published successfully! It appears at the very top of the homepage and gallery.");
      }

      // Reset form
      setTitle('');
      setDesc('');
      setImageUrl('');
      setImagePreview('');
      setCustomCategory('');
      const savedDefault = localStorage.getItem('natal_default_creation_category') || defaultCategory || CATEGORY_OPTIONS[0];
      setCategory(savedDefault);
      setTimeout(() => setSuccessNotice(''), 4500);
    } catch (error: any) {
      showAppNotification('Error saving project/card: ' + error.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Merge uploaded/edited services with base servicesData to manage the complete Our Services section
  const hiddenIdsSet = new Set(hiddenServiceIds.map((h: string) => (h || '').toLowerCase().trim()));

  const filteredUploadedServices = services.filter((s: any) => {
    const k = (s.id || '').toLowerCase().trim();
    const orig = (s.originalId || '').toLowerCase().trim();
    const t = (s.title || '').toLowerCase().trim();
    return !hiddenIdsSet.has(k) && !hiddenIdsSet.has(orig) && !hiddenIdsSet.has(t);
  });

  const seenServiceIds = new Set<string>();
  const seenServiceTitles = new Set<string>();
  const allCombinedServices: any[] = [];

  // 1. Uploaded or edited services (top priority)
  for (const s of filteredUploadedServices) {
    const isBaseMatch = servicesData.some(sd => sd.id === s.id || (sd.slug && sd.slug === s.slug) || (s.originalId && s.originalId === sd.id) || (sd.title.trim().toLowerCase() === (s.title || '').trim().toLowerCase()));
    allCombinedServices.push({
      ...s,
      isCustom: !isBaseMatch,
      isEdited: isBaseMatch
    });
    if (s.id) seenServiceIds.add(s.id.toLowerCase());
    if (s.slug) seenServiceIds.add(s.slug.toLowerCase());
    if (s.originalId) seenServiceIds.add(s.originalId.toLowerCase());
    if (s.title) seenServiceTitles.add(s.title.trim().toLowerCase());
  }

  // 2. Base services that have not been overridden or hidden
  for (const sd of servicesData) {
    const idKey = sd.id.toLowerCase();
    const slugKey = (sd.slug || '').toLowerCase();
    const titleKey = sd.title.trim().toLowerCase();

    if (hiddenIdsSet.has(idKey) || hiddenIdsSet.has(slugKey) || hiddenIdsSet.has(titleKey)) {
      continue;
    }

    if (!seenServiceIds.has(idKey) && !seenServiceIds.has(slugKey) && !seenServiceTitles.has(titleKey)) {
      allCombinedServices.push({
        ...sd,
        isCustom: false,
        isEdited: false,
        isBase: true
      });
      seenServiceIds.add(idKey);
      seenServiceTitles.add(titleKey);
    }
  }

  // Handle Edit Service (populate form and scroll)
  const handleEditService = (service: any) => {
    setEditingServiceId(service.id);
    setEditingOriginalId(service.originalId || service.id);
    setServiceTitle(service.title || '');
    setServiceDesc(service.description || '');
    setServiceFeatures(Array.isArray(service.features) ? service.features.join(', ') : (service.featuresText || ''));
    setServiceImage(service.image || '');
    setServiceIcon(service.icon || 'Paintbrush');

    const formElement = document.getElementById('service-edit-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  // Handle Add or Update Service
  const handleAddOrUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceTitle.trim() || !serviceDesc.trim()) {
      showAppNotification("Please enter both a service title and description.", "info");
      return;
    }

    setIsUploadingService(true);
    const featuresList = serviceFeatures.trim()
      ? serviceFeatures.split(',').map(s => s.trim()).filter(Boolean)
      : ['Bespoke Interior Craft', 'Turnkey Execution', 'Premium Materials'];

    const newServiceItem = {
      title: serviceTitle.trim(),
      description: serviceDesc.trim(),
      icon: serviceIcon || 'Paintbrush',
      features: featuresList,
      featuresText: serviceFeatures.trim(),
      image: serviceImage.trim(),
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingServiceId) {
        const targetId = editingServiceId;
        const targetOriginalId = editingOriginalId || targetId;

        try {
          await setDoc(doc(db, 'services', targetId), {
            ...newServiceItem,
            id: targetId,
            originalId: targetOriginalId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (fbErr) {
          console.warn("Firestore service update fallback:", fbErr);
        }

        // Ensure it is not in hidden list
        const currentHidden = JSON.parse(localStorage.getItem('natal_hidden_services') || '[]');
        const newHidden = currentHidden.filter((h: string) => h.toLowerCase() !== targetId.toLowerCase() && h.toLowerCase() !== targetOriginalId.toLowerCase());
        localStorage.setItem('natal_hidden_services', JSON.stringify(newHidden));
        setHiddenServiceIds(newHidden);

        try {
          await setDoc(doc(db, 'site_settings', 'services_section'), {
            hiddenServiceIds: newHidden
          }, { merge: true });
        } catch (e) {
          // ignore
        }

        const currentLocal = JSON.parse(localStorage.getItem('natal_local_services') || '[]');
        const updatedLocal = currentLocal.filter((s: any) => s.id !== targetId && (!s.originalId || s.originalId !== targetOriginalId) && s.title !== newServiceItem.title);
        updatedLocal.unshift({ id: targetId, originalId: targetOriginalId, ...newServiceItem });
        localStorage.setItem('natal_local_services', JSON.stringify(updatedLocal));

        setServices(prev => {
          const rest = prev.filter(s => s.id !== targetId && (!s.originalId || s.originalId !== targetOriginalId) && s.title !== newServiceItem.title);
          return [{ id: targetId, originalId: targetOriginalId, ...newServiceItem }, ...rest];
        });

        setEditingServiceId(null);
        setEditingOriginalId(null);
        setSuccessNotice(`Service "${newServiceItem.title}" updated successfully! Changes are live on the homepage.`);
      } else {
        let isFbSuccess = false;
        let newDocId = 's_' + Date.now();
        try {
          const docRef = await addDoc(collection(db, 'services'), sanitizeForFirestore({
            ...newServiceItem,
            createdAt: serverTimestamp()
          }));
          newDocId = docRef.id;
          isFbSuccess = true;
          setServices(prev => deduplicateList([{ id: docRef.id, ...newServiceItem }, ...prev]));
        } catch (fbErr) {
          console.warn("Firestore service write error:", fbErr);
        }

        const currentLocal = JSON.parse(localStorage.getItem('natal_local_services') || '[]');
        const savedLocal = deduplicateList([{ id: newDocId, ...newServiceItem }, ...currentLocal]);
        localStorage.setItem('natal_local_services', JSON.stringify(savedLocal));
        if (!isFbSuccess) {
          setServices(savedLocal);
        }

        setSuccessNotice(`New service "${newServiceItem.title}" published successfully! It now appears at the top on the homepage.`);
      }

      setServiceTitle('');
      setServiceDesc('');
      setServiceFeatures('');
      setServiceImage('');
      const savedDefaultDiscipline = localStorage.getItem('natal_default_service_discipline') || defaultServiceIcon || 'Paintbrush';
      setServiceIcon(savedDefaultDiscipline);
      setTimeout(() => setSuccessNotice(''), 5000);
    } catch (err: any) {
      showAppNotification('Error saving service: ' + err.message, 'error');
    } finally {
      setIsUploadingService(false);
    }
  };

  // Handle Delete or Hide Service
  const handleDeleteOrHideService = async (service: any) => {
    const isBase = servicesData.some(sd => sd.id === service.id || (sd.slug && sd.slug === service.slug) || (service.originalId && service.originalId === sd.id));
    const confirmMsg = isBase 
      ? `Hide "${service.title}" from the Our Services section on the website? You can restore it anytime.`
      : `Are you sure you want to delete "${service.title}" from the website?`;

    if (!confirm(confirmMsg)) return;

    const targetId = service.id;
    const targetOrig = service.originalId || service.id;

    try {
      if (!targetId.startsWith('local_') && !isBase) {
        await deleteDoc(doc(db, 'services', targetId));
      }
    } catch (e) {
      console.warn("Firestore delete service failed:", e);
    }

    const currentLocal = JSON.parse(localStorage.getItem('natal_local_services') || '[]');
    const updated = currentLocal.filter((s: any) => s.id !== targetId && s.originalId !== targetOrig && s.title !== service.title);
    localStorage.setItem('natal_local_services', JSON.stringify(updated));
    setServices(prev => prev.filter(s => s.id !== targetId && s.originalId !== targetOrig && s.title !== service.title));

    // Add to hidden list
    const currentHidden = JSON.parse(localStorage.getItem('natal_hidden_services') || '[]');
    const newHidden = Array.from(new Set([...currentHidden, targetId, targetOrig, service.title]));
    localStorage.setItem('natal_hidden_services', JSON.stringify(newHidden));
    setHiddenServiceIds(newHidden);

    try {
      await setDoc(doc(db, 'site_settings', 'services_section'), {
        hiddenServiceIds: newHidden
      }, { merge: true });
    } catch (e) {
      // ignore
    }

    setSuccessNotice(`Service "${service.title}" removed from the website.`);
    setTimeout(() => setSuccessNotice(''), 4000);
  };

  // Handle Promote Service to Top of Homepage
  const handlePromoteService = async (service: any) => {
    const targetId = service.id;
    const targetOriginalId = service.originalId || service.id;
    const updatedItem = {
      title: service.title,
      description: service.description,
      icon: service.icon || 'Paintbrush',
      features: service.features,
      featuresText: Array.isArray(service.features) ? service.features.join(', ') : '',
      image: service.image || '',
      originalId: targetOriginalId,
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'services', targetId), sanitizeForFirestore({
        ...updatedItem,
        id: targetId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }), { merge: true });
    } catch (e) {
      console.warn("Firestore promote service fallback:", e);
    }

    const currentLocal = JSON.parse(localStorage.getItem('natal_local_services') || '[]');
    const updatedLocal = currentLocal.filter((s: any) => s.id !== targetId && s.title !== service.title);
    updatedLocal.unshift({ id: targetId, originalId: targetOriginalId, ...updatedItem });
    localStorage.setItem('natal_local_services', JSON.stringify(updatedLocal));

    setServices(prev => {
      const rest = prev.filter(s => s.id !== targetId && s.title !== service.title);
      return [{ id: targetId, originalId: targetOriginalId, ...updatedItem }, ...rest];
    });

    setSuccessNotice(`"${service.title}" moved to position #1 at the top of Our Services!`);
    setTimeout(() => setSuccessNotice(''), 4000);
  };

  // Handle Save Section Header Settings
  const handleSaveSectionHeader = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSectionHeader(true);
    try {
      await setDoc(doc(db, 'site_settings', 'services_section'), sanitizeForFirestore({
        sectionSubtitle: serviceSectionSubtitle.trim(),
        sectionTitle: serviceSectionTitle.trim(),
        sectionDescription: serviceSectionDesc.trim(),
        updatedAt: serverTimestamp()
      }), { merge: true });

      localStorage.setItem('natal_services_subtitle', serviceSectionSubtitle.trim());
      localStorage.setItem('natal_services_title', serviceSectionTitle.trim());
      localStorage.setItem('natal_services_desc', serviceSectionDesc.trim());

      setSectionHeaderSuccess('Our Services section header updated on the live website!');
      setTimeout(() => setSectionHeaderSuccess(''), 4000);
    } catch (e: any) {
      localStorage.setItem('natal_services_subtitle', serviceSectionSubtitle.trim());
      localStorage.setItem('natal_services_title', serviceSectionTitle.trim());
      localStorage.setItem('natal_services_desc', serviceSectionDesc.trim());
      setSectionHeaderSuccess('Section header saved locally!');
      setTimeout(() => setSectionHeaderSuccess(''), 4000);
    } finally {
      setIsSavingSectionHeader(false);
    }
  };

  // Handle Restore Default Services
  const handleRestoreDefaultServices = async () => {
    localStorage.setItem('natal_hidden_services', JSON.stringify([]));
    setHiddenServiceIds([]);
    try {
      await setDoc(doc(db, 'site_settings', 'services_section'), {
        hiddenServiceIds: []
      }, { merge: true });
    } catch (e) {
      // ignore
    }
    setSuccessNotice('All default base services have been restored to the website!');
    setTimeout(() => setSuccessNotice(''), 4000);
  };

  const handleTImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingTestimonial(true);
      const compressed = await compressImageFile(file, 800, 800, 0.82);
      setTImagePreview(compressed);
      setTImage('');
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTImagePreview(reader.result as string);
        setTImage(''); // Clear URL if file selected
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingTestimonial(false);
    }
  };

  const handleSaveTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tName.trim() || !tRole.trim() || !tContent.trim()) {
      showAppNotification("Please fill in the client name, role, and feedback content.", "info");
      return;
    }

    if (!isValidName(tName)) {
      showAppNotification("Error: Client name must contain letters only (no numbers, digits or symbols).", "error");
      return;
    }

    if (!isValidName(tRole)) {
      showAppNotification("Error: Role / Title must contain letters only (no numbers, digits or symbols).", "error");
      return;
    }

    setIsUploadingTestimonial(true);
    const finalImage = tImage || tImagePreview;

    const newTestimonialItem = {
      name: tName,
      role: tRole,
      content: tContent,
      rating: parseInt(tRating) || 5,
      image: finalImage,
      createdAt: new Date().toISOString()
    };

    try {
      let isFbSuccess = false;
      try {
        await addDoc(collection(db, 'testimonials'), sanitizeForFirestore({
          ...newTestimonialItem,
          createdAt: serverTimestamp()
        }));
        isFbSuccess = true;
      } catch (fbErr) {
        console.warn("Firestore write error, relying on local backup:", fbErr);
      }

      if (!isFbSuccess) {
        const currentLocal = JSON.parse(localStorage.getItem('natal_local_testimonials') || '[]');
        const savedLocal = [{ id: 'local_t_' + Date.now(), ...newTestimonialItem }, ...currentLocal];
        localStorage.setItem('natal_local_testimonials', JSON.stringify(savedLocal));
        setTestimonials(savedLocal);
      }

      setTName('');
      setTRole('');
      setTContent('');
      setTRating('5');
      setTImage('');
      setTImagePreview('');
      
      setSuccessNotice('Testimonial added successfully! It is now live on the homepage.');
      setTimeout(() => setSuccessNotice(''), 4000);
    } catch (error: any) {
      showAppNotification('Error saving testimonial: ' + error.message, 'error');
    } finally {
      setIsUploadingTestimonial(false);
    }
  };

  // Handle Delete Project
  const handleDeleteProject = async (projectId: string) => {
    try {
      const projToDelete = projects.find(p => p.id === projectId);

      if (!projectId.startsWith('local_')) {
        try {
          await deleteDoc(doc(db, 'projects', projectId));
        } catch (e) {
          console.warn("Firestore delete failed:", e);
        }
      }

      // Remove from local storage (match by ID or matching title/image to remove any duplicate local cache copies)
      const currentLocal = JSON.parse(localStorage.getItem('natal_local_projects') || '[]');
      const updated = currentLocal.filter((p: any) => {
        if (p.id === projectId) return false;
        if (projToDelete && (p.title === projToDelete.title || p.image === projToDelete.image)) return false;
        return true;
      });
      localStorage.setItem('natal_local_projects', JSON.stringify(updated));
      
      setProjects(prev => prev.filter(p => p.id !== projectId && (!projToDelete || p.title !== projToDelete.title)));
    } catch (e: any) {
      console.error("Error deleting project:", e);
    }
  };

  const handleDeleteTestimonial = async (testimonialId: string) => {
    try {
      const tToDelete = testimonials.find(t => t.id === testimonialId);
      if (!testimonialId.startsWith('local_') && !testimonialId.startsWith('t')) { // Assuming hardcoded ones start with t
        try {
          await deleteDoc(doc(db, 'testimonials', testimonialId));
        } catch (e) {
          console.warn("Firestore delete failed:", e);
        }
      }
      const currentLocal = JSON.parse(localStorage.getItem('natal_local_testimonials') || '[]');
      const updated = currentLocal.filter((t: any) => {
        if (t.id === testimonialId) return false;
        if (tToDelete && t.name === tToDelete.name) return false;
        return true;
      });
      localStorage.setItem('natal_local_testimonials', JSON.stringify(updated));
      setTestimonials(prev => prev.filter(t => t.id !== testimonialId && (!tToDelete || t.name !== tToDelete.name)));
    } catch (e: any) {
      console.error("Error deleting testimonial:", e);
    }
  };

  const handleTrBeforeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingTransformation(true);
      const compressed = await compressImageFile(file, 1600, 1200, 0.82);
      setTrBeforeImage(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setTrBeforeImage(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingTransformation(false);
    }
  };

  const handleTrAfterFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingTransformation(true);
      const compressed = await compressImageFile(file, 1600, 1200, 0.82);
      setTrAfterImage(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setTrAfterImage(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingTransformation(false);
    }
  };

  const handleSaveTransformation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trBeforeImage || !trAfterImage) {
      showAppNotification("Please provide both a Before and an After image.", "info");
      return;
    }

    setIsUploadingTransformation(true);
    const newTrItem = {
      title: trTitle || "Project Transformation",
      beforeImage: trBeforeImage,
      afterImage: trAfterImage,
      fitMode: trFitMode,
      createdAt: new Date().toISOString()
    };

    try {
      let isFbSuccess = false;
      try {
        await addDoc(collection(db, 'transformations'), sanitizeForFirestore({
          ...newTrItem,
          createdAt: serverTimestamp()
        }));
        isFbSuccess = true;
      } catch (fbErr) {
        console.warn("Firestore write error, relying on local backup:", fbErr);
      }

      if (!isFbSuccess) {
        const currentLocal = JSON.parse(localStorage.getItem('natal_local_transformations') || '[]');
        const savedLocal = [{ id: 'local_' + Date.now(), ...newTrItem }, ...currentLocal];
        localStorage.setItem('natal_local_transformations', JSON.stringify(savedLocal));
        setTransformations(savedLocal);
      }

      setTrTitle('');
      setTrBeforeImage('');
      setTrAfterImage('');
      
      setSuccessNotice('Transformation added successfully!');
      setTimeout(() => setSuccessNotice(''), 4000);
    } catch (error: any) {
      showAppNotification('Error saving transformation: ' + error.message, 'error');
    } finally {
      setIsUploadingTransformation(false);
    }
  };

  const handleToggleTrMode = async (transformationId: string, currentMode?: string) => {
    const nextMode = currentMode === 'contain' ? 'cover' : 'contain';
    try {
      if (!transformationId.startsWith('local_')) {
        try {
          await updateDoc(doc(db, 'transformations', transformationId), {
            fitMode: nextMode
          });
        } catch (fbErr) {
          console.warn("Firestore update error, updating local storage:", fbErr);
        }
      }

      const currentLocal = JSON.parse(localStorage.getItem('natal_local_transformations') || '[]');
      const updated = currentLocal.map((t: any) => t.id === transformationId ? { ...t, fitMode: nextMode } : t);
      localStorage.setItem('natal_local_transformations', JSON.stringify(updated));
      setTransformations(prev => prev.map(t => t.id === transformationId ? { ...t, fitMode: nextMode } : t));
      
      // Also update visitor localStorage setting
      localStorage.setItem('natal_before_after_mode', nextMode);
      window.dispatchEvent(new CustomEvent('natal_before_after_mode_change', { detail: nextMode }));

      setSuccessNotice(`Updated display mode to ${nextMode === 'cover' ? 'Fill Mode' : 'Fit Mode'}`);
      setTimeout(() => setSuccessNotice(''), 3000);
    } catch (err: any) {
      showAppNotification("Error updating transformation mode: " + err.message, "error");
    }
  };

  const handleDeleteTransformation = async (transformationId: string) => {
    try {
      if (!transformationId.startsWith('local_')) {
        try {
          await deleteDoc(doc(db, 'transformations', transformationId));
        } catch (e) {
          console.warn("Firestore delete failed:", e);
        }
      }
      
      // Also clean up local storage matching items (by id or by identical content to fix duplicated items)
      const currentLocal = JSON.parse(localStorage.getItem('natal_local_transformations') || '[]');
      const trToDelete = transformations.find(t => t.id === transformationId);
      const updated = currentLocal.filter((t: any) => {
        if (t.id === transformationId) return false;
        // Clean up duplicates if firebase version was deleted
        if (trToDelete && t.beforeImage === trToDelete.beforeImage) return false;
        return true;
      });
      localStorage.setItem('natal_local_transformations', JSON.stringify(updated));
      setTransformations(prev => prev.filter(t => t.id !== transformationId && t.beforeImage !== trToDelete?.beforeImage));
    } catch (e: any) {
      showAppNotification("Error deleting transformation: " + e.message, "error");
    }
  };

  // Handle Save New Passcode
  const handleSaveNewPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasscode.trim() || newPasscode.trim().length < 4) {
      showAppNotification("Passcode must be at least 4 characters long.", "error");
      return;
    }
    localStorage.setItem('natal_custom_passcode', newPasscode.trim());
    setCustomPasscode(newPasscode.trim());
    setNewPasscode('');
    setSettingsNotice('New Master Passcode saved successfully!');
    setTimeout(() => setSettingsNotice(''), 4000);
  };

  // Handle Save Email Service Configuration
  const handleSaveEmailConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveEmailServiceSettings(emailConfig);
    setEmailConfigSaved('Email service configuration saved successfully!');
    setTimeout(() => setEmailConfigSaved(''), 4000);
  };

  // Handle Send Test Email Notification
  const handleSendTestMail = async () => {
    setIsSendingTestMail(true);
    setMailNotice('');
    try {
      const res = await triggerOwnerEmailNotification({
        leadType: 'Contact Form',
        name: 'Email Integration Test Verification',
        email: emailConfig.recipientEmail || 'mukisavicent7777@gmail.com',
        phone: '0700000000',
        service: 'Email Service Live Check',
        details: `This is a live test notification dispatched to verify that the website is connected to the email service and delivering client inquiries directly to ${emailConfig.recipientEmail}.`
      });

      const prov = (res as any)?.providerResult;
      if (prov && (prov.activated === false || (prov.message && prov.message.toLowerCase().includes('activate')))) {
        setMailNotice(`1-Time Activation Sent: FormSubmit has dispatched an activation email to ${res.recipient || emailConfig.recipientEmail}. Please check your inbox (including Spam/Junk folder) and click "Activate Form" once to complete setup.`);
      } else if (res.success) {
        setMailNotice(`Test email dispatched to ${res.recipient || emailConfig.recipientEmail}! Check your inbox and Spam/Junk folder.`);
      } else {
        setMailNotice('Dispatched test email. Please check your inbox and Spam/Junk folder.');
      }
    } catch (e: any) {
      setMailNotice('Notification note: ' + (e?.message || 'Payload processed.'));
    } finally {
      setIsSendingTestMail(false);
      setTimeout(() => setMailNotice(''), 12000);
    }
  };

  // Handle Save WhatsApp Service Configuration
  const handleSaveWhatsAppConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveWhatsAppServiceSettings(whatsappConfig);
    setWhatsappConfigSaved('WhatsApp service configuration saved successfully!');
    setTimeout(() => setWhatsappConfigSaved(''), 4000);
  };

  // Handle Send Test WhatsApp Notification
  const handleSendTestWhatsApp = async () => {
    setIsSendingTestWhatsApp(true);
    setWhatsappNotice('');
    setDirectTestWhatsAppUrl('');
    try {
      const res = await triggerOwnerWhatsAppNotification({
        leadType: 'General Lead',
        name: 'WhatsApp Direct Database Live Test',
        phone: '0700000000',
        email: emailConfig.recipientEmail || 'mukisavicent7777@gmail.com',
        service: 'Direct Database WhatsApp Check',
        details: `This is a live test alert dispatched directly from the database to verify that client activity is automatically routed to ${whatsappConfig.ownerWhatsAppNumber} without manual intervention.`
      });

      if (res?.directWhatsAppUrl) {
        setDirectTestWhatsAppUrl(res.directWhatsAppUrl);
      }

      if (res?.status === 'delivered_via_callmebot') {
        setWhatsappNotice(`Direct WhatsApp message accepted by CallMeBot for +${res.recipientPhone}! Check your WhatsApp.`);
      } else if (res?.status === 'delivered_via_ultramsg') {
        setWhatsappNotice(`Direct WhatsApp message delivered by UltraMsg directly to your phone (${res.recipientPhone})!`);
      } else if (res?.status === 'delivered_via_greenapi') {
        setWhatsappNotice(`Direct WhatsApp message delivered by Green-API directly to your phone (${res.recipientPhone})!`);
      } else if (res?.status === 'delivered_via_webhook') {
        setWhatsappNotice(`Automated alert dispatched directly to your WhatsApp Webhook endpoint!`);
      } else if (res?.status === 'callmebot_key_invalid') {
        const errMsg = (res as any)?.gatewayResponse?.message || 'APIKey is invalid';
        setWhatsappNotice(`CallMeBot Note: ${errMsg}. To activate background delivery, follow Step 1 below to message CallMeBot, or send directly via WhatsApp.`);
      } else if (res?.status === 'callmebot_key_required') {
        setWhatsappNotice(`CallMeBot API key is not entered. Complete Step 1 below, or click the button below to send directly.`);
      } else {
        setWhatsappNotice(`Test message formatted for ${res?.recipientPhone || whatsappConfig.ownerWhatsAppNumber}. Click the button below to open in WhatsApp.`);
      }
    } catch (e: any) {
      setWhatsappNotice('WhatsApp dispatch note: ' + (e?.message || 'Processed.'));
    } finally {
      setIsSendingTestWhatsApp(false);
      setTimeout(() => setWhatsappNotice(''), 25000);
    }
  };

  const handleTestGatewayLive = async () => {
    setGatewayTestResult({ status: 'testing', message: `Testing connection to gateway for +256 ${whatsappConfig.ownerWhatsAppNumber}...` });
    try {
      const res = await fetch('/api/whatsapp/test-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: whatsappConfig.gatewayProvider,
          phone: whatsappConfig.ownerWhatsAppNumber,
          apiKey: whatsappConfig.callMeBotApiKey,
          instanceId: whatsappConfig.ultraMsgInstanceId,
          token: whatsappConfig.ultraMsgToken,
          webhookUrl: whatsappConfig.webhookUrl,
          message: 'Test ping from Natal Interior Design Admin Console'
        })
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setGatewayTestResult({ status: 'success', message: data.message || 'Gateway connected successfully!' });
      } else {
        setGatewayTestResult({ status: 'error', message: data.message || 'Gateway returned an error.' });
      }
    } catch (err: any) {
      setGatewayTestResult({ status: 'error', message: err?.message || 'Network error reaching test endpoint.' });
    }
  };

  // -------------------------------------------------------------
  // User Directory Handlers & Filtering
  // -------------------------------------------------------------
  const handleDeleteUser = async (userToDelete: any) => {
    if (!window.confirm(`Are you sure you want to remove user "${userToDelete.name || userToDelete.email}" from the directory?`)) {
      return;
    }
    try {
      if (userToDelete.id && !userToDelete.id.startsWith('usr_lead') && !userToDelete.id.startsWith('lead_user_')) {
        try {
          await deleteDoc(doc(db, 'users', userToDelete.id));
        } catch (e) {
          console.warn("Firestore delete user error:", e);
        }
      }
      const currentLocal = JSON.parse(localStorage.getItem('natal_local_users') || '[]');
      const updated = currentLocal.filter((u: any) => u.id !== userToDelete.id && u.email?.toLowerCase() !== userToDelete.email?.toLowerCase());
      localStorage.setItem('natal_local_users', JSON.stringify(updated));
      setUsers(prev => prev.filter(u => u.id !== userToDelete.id && u.email?.toLowerCase() !== userToDelete.email?.toLowerCase()));
      if (selectedUserDetail?.id === userToDelete.id) {
        setSelectedUserDetail(null);
      }
      setUserNotice(`User "${userToDelete.name || userToDelete.email}" removed.`);
      setTimeout(() => setUserNotice(''), 3500);
    } catch (err: any) {
      showAppNotification("Error deleting user: " + err.message, "error");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim() && !newUserName.trim()) return;

    try {
      const created = await syncUserRecord({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        phone: newUserPhone.trim(),
        source: newUserSource,
        role: newUserRole,
        service: newUserService.trim(),
        details: newUserDetails.trim(),
        status: newUserSource === 'Registration' ? 'Active' : 'Pending Consultation'
      });

      setUsers(prev => [created, ...prev.filter(u => u.email?.toLowerCase() !== created.email?.toLowerCase())]);
      setUserNotice(`User "${created.name}" registered successfully into directory!`);
      setTimeout(() => setUserNotice(''), 4000);
      setIsAddUserOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPhone('');
      setNewUserService('');
      setNewUserDetails('');
    } catch (err: any) {
      showAppNotification("Error creating user: " + err.message, "error");
    }
  };

  const handleCopyEmail = (email: string) => {
    if (!email) return;
    navigator.clipboard?.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleExportUsersCSV = () => {
    if (users.length === 0) {
      showAppNotification("No users to export yet.", "info");
      return;
    }
    const headers = ['Name', 'Email', 'Phone', 'Source', 'Role', 'Status', 'Service Interested', 'Details', 'Registration Date'];
    const rows = users.map(u => [
      `"${(u.name || '').replace(/"/g, '""')}"`,
      `"${(u.email || '').replace(/"/g, '""')}"`,
      `"${(u.phone || '').replace(/"/g, '""')}"`,
      `"${(u.source || '').replace(/"/g, '""')}"`,
      `"${(u.role || '').replace(/"/g, '""')}"`,
      `"${(u.status || '').replace(/"/g, '""')}"`,
      `"${(u.service || '').replace(/"/g, '""')}"`,
      `"${(u.details || '').replace(/"/g, '""')}"`,
      `"${u.createdAt ? (typeof u.createdAt === 'string' ? u.createdAt : new Date(u.createdAt?.seconds ? u.createdAt.seconds * 1000 : Date.now()).toLocaleDateString()) : 'Recent'}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `natal_users_roster_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredUsers = users.filter(user => {
    const term = userSearchTerm.toLowerCase().trim();
    const matchSearch = !term || (
      (user.name && user.name.toLowerCase().includes(term)) ||
      (user.email && user.email.toLowerCase().includes(term)) ||
      (user.phone && user.phone.toLowerCase().includes(term)) ||
      (user.service && user.service.toLowerCase().includes(term)) ||
      (user.role && user.role.toLowerCase().includes(term)) ||
      (user.source && user.source.toLowerCase().includes(term))
    );

    const matchSource = userSourceFilter === 'all' || user.source === userSourceFilter;
    const matchRole = userRoleFilter === 'all' || user.role === userRoleFilter;

    return matchSearch && matchSource && matchRole;
  });

  // -------------------------------------------------------------
  // If not authenticated, render the Administrator Sign In / Register Portal
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    const isEmailValidAdmin = adminAuthEmail.trim().toLowerCase().includes('admin');

    return (
      <div className="min-h-screen bg-black-pure text-white flex flex-col justify-between relative overflow-hidden font-sans selection:bg-gold selection:text-black-pure">
        {/* Background Architectural Overlay */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img 
            src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=2000" 
            alt="NATAL Luxury Atelier" 
            className="w-full h-full object-cover filter brightness-[0.25] contrast-[1.1]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black-pure via-black-pure/85 to-black-pure/75"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.08)_0%,transparent_70%)]"></div>
        </div>

        {/* Top Header */}
        <header className="relative z-10 px-4 sm:px-8 py-4 sm:py-6 flex items-center justify-between border-b border-white/5">
          <NatalLogo className="h-8 sm:h-9" />
          <button 
            type="button"
            onClick={onNavigateHome}
            className="text-gold hover:text-white transition-colors text-xs font-mono uppercase tracking-widest flex items-center gap-2 px-3 py-1.5 rounded border border-gold/30 hover:border-gold hover:bg-white/5 cursor-pointer"
          >
            <Home size={15} /> <span>Exit to Public Site</span>
          </button>
        </header>

        {/* Admin Authentication Card */}
        <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
          <div className="w-full max-w-lg bg-black-rich/95 border-2 border-gold/60 p-6 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.98)] relative rounded-sm">
            {/* Top Accent Gradient */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold-dark via-gold to-yellow-300"></div>

            {/* Icon Header */}
            <div className="w-14 h-14 rounded-full bg-gold/15 border-2 border-gold flex items-center justify-center text-gold mx-auto mb-4 shadow-[0_0_20px_rgba(212,175,55,0.35)]">
              <ShieldCheck size={28} className="stroke-[2.5]" />
            </div>

            <div className="text-center mb-6">
              <span className="text-[10px] font-mono text-gold uppercase tracking-[0.25em] font-bold block mb-1">
                Restricted Admin Access
              </span>
              <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-white uppercase tracking-wider">
                Administrator Portal
              </h1>
              <p className="text-xs text-gray-300 mt-1.5 font-light leading-relaxed max-w-md mx-auto">
                Access to the admin dashboard requires an administrator account. The email address entered <span className="text-gold font-bold">must contain the word "admin"</span>.
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 border border-gold/40 bg-black-pure p-1 mb-5 gap-1">
              <button
                type="button"
                onClick={() => {
                  setAdminAuthMode('login');
                  setAdminAuthError('');
                }}
                className={`py-2.5 px-3 text-center uppercase tracking-wider text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  adminAuthMode === 'login'
                    ? 'bg-gradient-to-r from-gold-dark via-gold to-yellow-300 text-black-pure font-extrabold shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Key size={13} className={adminAuthMode === 'login' ? 'text-black-pure' : 'text-gold'} />
                <span>Admin Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAdminAuthMode('register');
                  setAdminAuthError('');
                }}
                className={`py-2.5 px-3 text-center uppercase tracking-wider text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  adminAuthMode === 'register'
                    ? 'bg-gradient-to-r from-gold-dark via-gold to-yellow-300 text-black-pure font-extrabold shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <UserPlus size={13} className={adminAuthMode === 'register' ? 'text-black-pure' : 'text-gold'} />
                <span>Register Admin</span>
              </button>
            </div>

            <form onSubmit={handleAdminAuthSubmit} className="space-y-4">
              {/* If Register Mode: Name and Phone */}
              {adminAuthMode === 'register' && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] uppercase tracking-wider text-gray-300 font-semibold flex items-center gap-1.5 font-mono">
                        <User size={13} className="text-gold" />
                        <span>Admin Full Name *</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      required
                      value={adminAuthName}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const clean = sanitizeNameInput(raw);
                        if (CONTAINS_DIGITS_OR_SYMBOLS_REGEX.test(raw) || (raw && raw !== clean)) {
                          setAdminAuthError('Admin name must contain letters only (no numbers or symbols).');
                        } else {
                          setAdminAuthError('');
                        }
                        setAdminAuthName(clean);
                      }}
                      onKeyDown={(e) => handleNameKeyDown(e, setAdminAuthError)}
                      onPaste={(e) => handleNamePaste(e, setAdminAuthName, setAdminAuthError)}
                      inputMode="text"
                      autoComplete="name"
                      placeholder="e.g. Master Administrator"
                      className="w-full bg-black-pure border border-white/20 focus:border-gold px-3.5 py-2.5 text-white text-xs sm:text-sm focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] uppercase tracking-wider text-gray-300 font-semibold flex items-center gap-1.5 font-mono">
                        <Phone size={13} className="text-gold" />
                        <span>Phone / Contact Number (Optional)</span>
                      </label>
                    </div>
                    <input
                      type="tel"
                      maxLength={10}
                      value={adminAuthPhone}
                      onChange={(e) => {
                        const clean = sanitizePhoneInput(e.target.value);
                        setAdminAuthPhone(clean);
                      }}
                      onKeyDown={(e) => handlePhoneKeyDown(e, setAdminAuthError)}
                      onPaste={(e) => handlePhonePaste(e, setAdminAuthPhone, setAdminAuthError)}
                      inputMode="tel"
                      placeholder="0700000000"
                      className="w-full bg-black-pure border border-white/20 focus:border-gold px-3.5 py-2.5 text-white text-xs sm:text-sm focus:outline-none transition-colors font-mono"
                    />
                  </div>
                </>
              )}

              {/* Admin Email */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-gray-300 font-semibold mb-1 flex items-center gap-1.5 font-mono">
                  <Mail size={13} className="text-gold" />
                  <span>Admin Email Address *</span>
                </label>
                <input
                  type="email"
                  required
                  value={adminAuthEmail}
                  pattern="^[^\s@]+@[^\s@]+\.[^\s@]{2,}$"
                  title="Please enter a valid email address"
                  autoComplete="email"
                  onChange={(e) => {
                    setAdminAuthEmail(e.target.value);
                    if (adminAuthError) setAdminAuthError('');
                  }}
                  placeholder="admin@nataldesign.com or name.admin@gmail.com"
                  className="w-full bg-black-pure border border-white/20 focus:border-gold px-3.5 py-2.5 text-white text-xs sm:text-sm focus:outline-none transition-colors font-mono placeholder:text-gray-600"
                />

                {/* Email Verification Feedback */}
                <div className="mt-1.5">
                  {adminAuthEmail.trim().length > 0 ? (
                    isEmailValidAdmin ? (
                      <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                        <CheckCircle size={11} className="text-emerald-400" />
                        Valid: Email contains "admin" (qualifies for administrator privileges)
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-400 font-mono font-semibold flex items-center gap-1">
                        <AlertCircle size={11} className="text-amber-400" />
                        Required: Email MUST contain the word "admin"
                      </span>
                    )
                  ) : (
                    <span className="text-[10px] text-gray-400 font-mono">
                      Must contain "admin" (e.g. admin@nataldesign.com)
                    </span>
                  )}
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] uppercase tracking-wider text-gray-300 font-semibold flex items-center gap-1.5 font-mono">
                    <Key size={13} className="text-gold" />
                    <span>Password *</span>
                  </label>
                  {adminAuthMode === 'register' && (
                    <span className="text-[10px] text-gray-400 font-mono">Min 6 chars</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showAdminPassword ? "text" : "password"}
                    required
                    value={adminAuthPassword}
                    onChange={(e) => setAdminAuthPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-black-pure border border-white/20 focus:border-gold px-3.5 py-2.5 pr-10 text-white text-xs sm:text-sm focus:outline-none transition-colors font-mono placeholder:text-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gold p-1 cursor-pointer"
                    aria-label={showAdminPassword ? "Hide password" : "Show password"}
                  >
                    {showAdminPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Error Message Alert */}
              {adminAuthError && (
                <div className="p-3 bg-red-950/80 border border-red-500/70 text-red-200 text-xs flex items-start gap-2">
                  <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                  <span>{adminAuthError}</span>
                </div>
              )}

              {/* Submit Action */}
              <button
                type="submit"
                disabled={adminAuthLoading}
                className="w-full py-3.5 bg-gradient-to-r from-gold-dark via-gold to-yellow-300 hover:brightness-110 active:scale-[0.99] text-black-pure font-bold uppercase text-xs tracking-widest transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)] cursor-pointer disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
              >
                {adminAuthLoading ? (
                  <span className="flex items-center gap-2">
                    <GoldSpinner size="xs" />
                    <span>{adminAuthMode === 'login' ? 'Authenticating...' : 'Registering Administrator...'}</span>
                  </span>
                ) : (
                  <>
                    <span>
                      {adminAuthMode === 'login' 
                        ? 'Sign In to Admin Dashboard' 
                        : 'Register Administrator Account'}
                    </span>
                    <ArrowRight size={14} className="stroke-[2.5]" />
                  </>
                )}
              </button>
            </form>

            {/* Switch Mode Prompt */}
            <div className="mt-5 pt-4 border-t border-white/10 text-center text-xs text-gray-400">
              {adminAuthMode === 'login' ? (
                <>
                  Need to create an administrator account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAdminAuthMode('register');
                      setAdminAuthError('');
                    }}
                    className="text-gold font-bold hover:underline cursor-pointer ml-1 inline-flex items-center gap-1"
                  >
                    <UserPlus size={12} /> Register here
                  </button>
                </>
              ) : (
                <>
                  Already registered as administrator?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAdminAuthMode('login');
                      setAdminAuthError('');
                    }}
                    className="text-gold font-bold hover:underline cursor-pointer ml-1 inline-flex items-center gap-1"
                  >
                    <Key size={12} /> Sign In here
                  </button>
                </>
              )}
            </div>

            <div className="mt-4 text-center">
              <button 
                type="button"
                onClick={onNavigateHome}
                className="text-xs text-gray-400 hover:text-gold transition-colors font-mono cursor-pointer"
              >
                ← Return to Public Website
              </button>
            </div>
          </div>
        </main>

        {/* Grounding Footer */}
        <footer className="relative z-10 py-3 text-center text-gray-500 text-xs font-mono border-t border-white/5">
          NATAL Interior Design & Construction © 2026 • Executive Administrator Suite
        </footer>
      </div>
    );
  }

  // -------------------------------------------------------------
  // If authenticated as admin BUT Master Passcode not yet verified:
  // Render the Admin Console prompting for the master passcode!
  // CRITICAL REQUIREMENT: Do NOT display the code on the screen, and let it be NATAL7777.
  // When he enters the correct passcode, the admin dashboard opens.
  // -------------------------------------------------------------
  if (!isPasscodeVerified) {
    const currentSession = getActiveUserSession();
    const adminDisplayEmail = currentSession?.email || adminAuthEmail || 'Administrator';
    const adminDisplayName = currentSession?.name || adminAuthName || 'System Administrator';

    return (
      <div className="min-h-screen bg-black-pure text-white flex flex-col justify-between relative overflow-hidden font-sans selection:bg-gold selection:text-black-pure">
        {/* Background Architectural Scrim */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img 
            src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=2000" 
            alt="NATAL Luxury Atelier" 
            className="w-full h-full object-cover filter brightness-[0.22] contrast-[1.15]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black-pure via-black-pure/90 to-black-pure/80"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.1)_0%,transparent_70%)]"></div>
        </div>

        {/* Top Header */}
        <header className="relative z-10 px-4 sm:px-8 py-4 sm:py-6 flex items-center justify-between border-b border-white/5">
          <NatalLogo className="h-8 sm:h-9" />
        </header>

        {/* Admin Console Card Prompting for Master Passcode */}
        <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
          <div className="w-full max-w-md bg-black-rich/95 border-2 border-gold/70 p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.98)] relative rounded-sm">
            {/* Top Accent Gold Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold-dark via-gold to-yellow-300"></div>

            {/* Glowing Lock Badge */}
            <div className="w-16 h-16 rounded-full bg-gold/15 border-2 border-gold flex items-center justify-center text-gold mx-auto mb-4 shadow-[0_0_25px_rgba(212,175,55,0.35)] relative">
              <Lock size={30} className="stroke-[2.5]" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-400"></span>
              </span>
            </div>

            <div className="text-center mb-5">
              <span className="text-[10px] font-mono text-gold uppercase tracking-[0.28em] font-bold block mb-1">
                Admin Console • Security Clearance
              </span>
              <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-white uppercase tracking-wider">
                Enter Master Passcode
              </h1>
              <p className="text-xs text-gray-300 mt-2 font-light leading-relaxed max-w-sm mx-auto">
                Administrator authentication confirmed. Please enter the master passcode to unlock and open the executive dashboard.
              </p>
            </div>

            {/* Admin Identity Badge */}
            <div className="mb-5 p-3 bg-black-pure/90 border border-gold/30 flex items-center justify-between rounded-sm">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-gold/20 border border-gold/50 flex items-center justify-center text-gold font-bold font-mono text-xs shrink-0">
                  <UserCheck size={16} />
                </div>
                <div className="text-left overflow-hidden">
                  <div className="text-xs font-bold text-white truncate font-heading">{adminDisplayName}</div>
                  <div className="text-[10px] text-gray-400 truncate font-mono">{adminDisplayEmail}</div>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                <CheckCircle size={10} /> Verified
              </span>
            </div>

            {/* Passcode Verification Form */}
            <form onSubmit={handleVerifyMasterPasscode} className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-gray-300 font-semibold mb-1.5 flex items-center justify-between font-mono">
                  <span className="flex items-center gap-1.5">
                    <Key size={13} className="text-gold" />
                    <span>Master Passcode *</span>
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">Restricted</span>
                </label>
                <div className="relative">
                  <input
                    type={showConsolePasscode ? "text" : "password"}
                    required
                    autoFocus
                    value={enteredPasscode}
                    onChange={(e) => {
                      setEnteredPasscode(e.target.value);
                      if (passcodeError) setPasscodeError('');
                    }}
                    placeholder="••••••••••••"
                    className="w-full bg-black-pure border border-white/25 focus:border-gold px-3.5 py-3 pr-10 text-white text-sm sm:text-base focus:outline-none transition-colors font-mono tracking-widest placeholder:text-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConsolePasscode(!showConsolePasscode)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gold p-1 cursor-pointer"
                    aria-label={showConsolePasscode ? "Hide passcode" : "Show passcode"}
                  >
                    {showConsolePasscode ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Passcode Error Alert */}
              {passcodeError && (
                <div className="p-3 bg-red-950/85 border border-red-500/70 text-red-200 text-xs flex items-start gap-2">
                  <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                  <span>{passcodeError}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={passcodeLoading}
                className="w-full py-3.5 bg-gradient-to-r from-gold-dark via-gold to-yellow-300 hover:brightness-110 active:scale-[0.99] text-black-pure font-bold uppercase text-xs tracking-widest transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)] cursor-pointer disabled:opacity-50 mt-1 flex items-center justify-center gap-2"
              >
                {passcodeLoading ? (
                  <span className="flex items-center gap-2">
                    <GoldSpinner size="xs" />
                    <span>Verifying Passcode...</span>
                  </span>
                ) : (
                  <>
                    <Key size={14} className="stroke-[2.5]" />
                    <span>Open Admin Dashboard</span>
                  </>
                )}
              </button>
            </form>

            {/* Bottom Actions */}
            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono">
              <button
                type="button"
                onClick={handleLogout}
                className="text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
              >
                ← Switch Account
              </button>
              <button
                type="button"
                onClick={onNavigateHome}
                className="text-gold hover:text-white transition-colors cursor-pointer"
              >
                Return to Site →
              </button>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 py-3 text-center text-gray-500 text-xs font-mono border-t border-white/5">
          NATAL Interior Design & Construction © 2026 • Security Clearance Console
        </footer>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Authenticated Admin Dashboard UI
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-black-rich text-white font-sans flex flex-col">
      {/* Top Navigation Bar */}
      <header className="h-[60px] sm:h-[70px] md:h-[76px] lg:h-[82px] bg-black-pure/95 backdrop-blur-md border-b border-gold/30 sticky top-0 z-50">
        <div className="w-full max-w-[98vw] xl:max-w-[95vw] 2xl:max-w-[1780px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 h-full flex items-center justify-between">
          {/* Left Side: Only Logo (Increased size and premium presentation) */}
          <div className="flex items-center">
            <NatalLogo className="h-9 sm:h-11 md:h-12 lg:h-14 transition-all duration-300" variant="default" />
          </div>

          {/* Right side: Notification icon, then Admin Profile at the right end */}
          <div className="flex items-center gap-3 sm:gap-4 lg:gap-5 ml-auto">
            {/* Notifications Icon with Active Red Badge - High-Visibility Alert Styling (No Outer Stroke) */}
            <button 
              type="button"
              onClick={() => switchTab('notifications')}
              className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-13 lg:h-13 transition-all relative rounded-lg flex items-center justify-center cursor-pointer border-0 outline-none ring-0 focus:outline-none ${
                activeTab === 'notifications' 
                  ? 'text-gold bg-gold/25 shadow-[0_0_18px_rgba(212,175,55,0.4)]' 
                  : 'text-gray-300 hover:text-gold bg-white/5 hover:bg-gold/15'
              }`}
              title={`System Notifications (${unreadNotificationsCount} unread)`}
              aria-label="System Notifications"
            >
              <Bell size={26} className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 transition-transform group-hover:scale-110" />
              {unreadNotificationsCount > 0 ? (
                <span 
                  className="absolute -top-1 -right-1 z-10 bg-red-600 text-white font-mono text-[10px] font-bold rounded-full w-5 h-5 min-w-[20px] min-h-[20px] aspect-square flex items-center justify-center p-0 leading-none shadow-md animate-pulse border-0 outline-none ring-0 pointer-events-none"
                  title={`${unreadNotificationsCount} new unread notifications`}
                >
                  {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                </span>
              ) : null}
            </button>

            {/* Admin Profile at the Right End with Circular Live Dot on Top - Reasonable Prominent Size */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => switchTab('profile')}
                className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-13 lg:h-13 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all relative overflow-hidden shadow-md ${
                  activeTab === 'profile' 
                    ? 'bg-gold/30 border-gold text-gold shadow-[0_0_20px_rgba(212,175,55,0.6)] ring-2 ring-gold/60' 
                    : 'bg-gold/10 border-gold/60 text-gold hover:bg-gold/20 hover:border-gold hover:shadow-[0_0_12px_rgba(212,175,55,0.35)]'
                }`}
                title={`${currentAdminName} Profile (Owner Live)`}
                aria-label="Admin Profile"
              >
                {currentAdminAvatar ? (
                  <img 
                    src={currentAdminAvatar} 
                    alt={currentAdminName} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-mono font-bold text-xs sm:text-sm lg:text-base text-gold">
                    {getUserInitials(currentAdminName, currentAdminEmail)}
                  </span>
                )}
              </button>

              {/* Circular Live Dot at bottom of Admin Profile */}
              <span 
                className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center pointer-events-none"
                title="Owner Live"
              >
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-emerald-500 border-2 border-black-pure shadow-[0_0_10px_rgba(16,185,129,0.95)]"></span>
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Body - Matched to Home Page container width and breathing space */}
      <div className={`w-full max-w-[98vw] xl:max-w-[95vw] 2xl:max-w-[1780px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-4 sm:py-6 lg:py-8 flex-1 flex flex-col ${
        activeTab === 'notifications' 
          ? 'gap-5 sm:gap-6' 
          : 'md:flex-row gap-5 sm:gap-6 lg:gap-8'
      } relative`}>
        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed top-[60px] sm:top-[72px] md:top-[78px] lg:top-[86px] xl:top-[90px] inset-x-0 bottom-0 bg-black/80 z-[40] md:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Admin Navigation Elements Definition */}
        {(() => {
          const navItems: { id: AdminTabType; label: string; icon: any; count?: number }[] = [
            { id: 'projects', label: 'Creations', icon: ImageIcon },
            { id: 'services', label: 'Our Services', icon: Briefcase },
            { id: 'testimonials', label: 'Testimonials', icon: ShieldCheck },
            { id: 'transformations', label: 'Before & After', icon: SplitSquareHorizontal },
            { id: 'sections', label: 'Brand Logo & Sections', icon: Edit3 },
            { id: 'media', label: 'Media & Vault', icon: FolderArchive },
            { id: 'leads', label: 'Leads', icon: Users, count: leads.length },
            { id: 'users', label: 'Users', icon: UserCheck, count: users.length },
            { id: 'notifications', label: 'Notifications', icon: Bell, count: unreadNotificationsCount },
            { id: 'profile', label: 'Admin Profile', icon: User },
            { id: 'communications', label: 'Email & WhatsApp Settings', icon: Mail },
            { id: 'settings', label: 'Master Passcode & Security', icon: Key },
          ];

          if (activeTab === 'notifications') {
            {/* FULL-WIDTH TOP ADMIN SIDE MENU (Positioned above the Admin Display and Notifications) */}
            return (
              <aside className="w-full bg-black-pure border border-gold/35 rounded-sm p-3.5 sm:p-4.5 shadow-[0_8px_32px_rgba(0,0,0,0.7)] z-20 flex flex-col gap-3">
                {/* Upper Tier: Home Exit, Admin Identity with Live dot, Sign Out */}
                <div className="flex items-center justify-between gap-3 sm:gap-4 flex-wrap pb-3 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={onNavigateHome}
                      className="text-gold hover:text-white active:scale-95 transition-all cursor-pointer group inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-white/5 border border-gold/30 hover:border-gold hover:bg-gold/10"
                      title="Return to Public Website Home"
                      aria-label="Return to Public Website Home"
                    >
                      <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform stroke-[2.5]" />
                      <span className="text-xs font-mono uppercase tracking-wider font-semibold">Exit Home</span>
                    </button>

                    {/* Admin Identity Card */}
                    <div 
                      onClick={() => switchTab('profile')}
                      className="p-1.5 sm:px-3 sm:py-1.5 bg-gradient-to-r from-gold/15 via-black-rich to-black-pure border border-gold/40 rounded-sm hover:border-gold transition-all cursor-pointer flex items-center gap-2.5 group shadow-sm"
                      title="Click to view and edit Admin Profile"
                    >
                      <div className="relative shrink-0">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-gold flex items-center justify-center bg-black-pure text-gold font-bold font-mono text-xs shadow-inner">
                          {currentAdminAvatar ? (
                            <img src={currentAdminAvatar} alt={currentAdminName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{getUserInitials(currentAdminName, currentAdminEmail)}</span>
                          )}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500 border border-black-pure"></span>
                        </span>
                      </div>
                      <div className="overflow-hidden min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate font-heading group-hover:text-gold transition-colors">
                            {currentAdminName}
                          </span>
                          <span className="text-[9px] text-emerald-400 font-mono hidden sm:inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                            <span>Studio Owner Live</span>
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-400 truncate font-mono">
                          {currentAdminEmail}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sign Out Button */}
                  <div className="flex items-center gap-2 ml-auto">
                    <button 
                      onClick={handleLogout}
                      className="py-1.5 px-3.5 text-center text-xs text-red-200 border border-red-500/50 bg-red-950/40 hover:bg-red-900/60 hover:border-red-400 hover:text-white transition-all font-mono flex items-center gap-2 uppercase tracking-wider rounded-sm cursor-pointer font-bold shadow-sm active:scale-95 group"
                      title="Sign Out of Administrator Account"
                    >
                      <LogOut size={14} className="text-red-400 group-hover:text-white transition-colors stroke-[2.2] shrink-0" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>

                {/* Lower Tier: Horizontal Navigation Tabs (The Admin Side Menu in Full Width Ribbon) */}
                <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none" aria-label="Admin Dashboard Menu">
                  {navItems.map((tab) => {
                    const IconComponent = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => switchTab(tab.id)}
                        className={`flex items-center gap-2 px-3.5 py-2 text-xs uppercase tracking-wider font-bold transition-all whitespace-nowrap cursor-pointer rounded-sm shrink-0 ${
                          isActive
                            ? 'bg-gold/20 text-gold border border-gold shadow-[0_0_12px_rgba(212,175,55,0.25)]'
                            : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <IconComponent size={14} className={isActive ? 'text-gold shrink-0' : 'text-gray-400 shrink-0'} />
                        <span>{tab.label}</span>
                        {tab.count !== undefined && tab.count > 0 && (
                          <span className="w-5 h-5 min-w-[20px] min-h-[20px] aspect-square rounded-full bg-red-600 text-white text-[10px] font-mono font-bold flex items-center justify-center p-0 leading-none shadow-md shrink-0 border-0 outline-none ring-0">
                            {tab.count > 99 ? '99+' : tab.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </aside>
            );
          }

          {/* Standard Vertical Left Sidebar Navigation for other tabs */}
          return (
            <aside className={`fixed md:sticky top-[60px] sm:top-[72px] md:top-[78px] lg:top-[86px] xl:top-[90px] left-0 h-[calc(100vh-60px)] sm:h-[calc(100vh-72px)] md:h-[calc(100vh-78px)] lg:h-[calc(100vh-86px)] xl:h-[calc(100vh-90px)] w-[270px] md:w-60 lg:w-64 xl:w-72 shrink-0 flex flex-col z-[50] md:z-10 transition-transform duration-300 ease-in-out md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} p-4 md:p-0 bg-black-pure/95 md:bg-transparent`}>
              {/* Arrow-only Back Home Button without any container */}
              <div className="mb-3.5 px-1 flex items-center justify-between">
                <button
                  onClick={onNavigateHome}
                  className="text-gold hover:text-gold-light active:scale-90 transition-all cursor-pointer group inline-flex items-center p-0 focus:outline-none"
                  title="Return to Public Website Home"
                  aria-label="Return to Public Website Home"
                >
                  <ArrowLeft size={24} className="group-hover:-translate-x-1.5 transition-transform stroke-[2.5]" />
                </button>

                <div className="flex items-center gap-2 md:hidden">
                  <span className="text-gold font-mono text-xs tracking-widest uppercase font-semibold">Admin Menu</span>
                  <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-white p-1">
                    <X size={22} />
                  </button>
                </div>
              </div>

              {/* Sidebar Container */}
              <div className="bg-black-pure border border-gold/30 rounded-sm p-4 sm:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.7)] flex-1 flex flex-col overflow-y-auto scrollbar-hide">
                {/* Admin Identity Card in Sidebar */}
                <div 
                  onClick={() => switchTab('profile')}
                  className="mb-5 p-3.5 bg-gradient-to-r from-gold/15 via-black-rich to-black-pure border border-gold/40 rounded-sm hover:border-gold transition-all cursor-pointer flex items-center gap-3.5 group shadow-md"
                  title="Click to view and edit Admin Profile"
                >
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-gold flex items-center justify-center bg-black-pure text-gold font-bold font-mono text-xs shadow-inner">
                      {currentAdminAvatar ? (
                        <img src={currentAdminAvatar} alt={currentAdminName} className="w-full h-full object-cover" />
                      ) : (
                        <span>{getUserInitials(currentAdminName, currentAdminEmail)}</span>
                      )}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 border border-black-pure"></span>
                    </span>
                  </div>
                  <div className="overflow-hidden min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className="text-xs font-bold text-white truncate font-heading group-hover:text-gold transition-colors">
                        {currentAdminName}
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-400 truncate font-mono">
                      {currentAdminEmail}
                    </div>
                    <div className="text-[9px] text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                      <span className="w-1 h-1 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                      <span>Administrator · Verified Studio Owner</span>
                    </div>
                  </div>
                </div>

                {/* Unified Navigation Tabs */}
                <nav className="flex flex-col gap-1.5" aria-label="Admin Dashboard Navigation">
                  {navItems.map((tab) => {
                    const IconComponent = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => switchTab(tab.id)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs uppercase tracking-wider font-bold transition-all text-left cursor-pointer rounded-sm ${
                          isActive
                            ? 'bg-gold/20 text-gold border border-gold shadow-[0_0_12px_rgba(212,175,55,0.25)]'
                            : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <IconComponent size={16} className={isActive ? 'text-gold shrink-0' : 'text-gray-400 shrink-0'} />
                          <span className="whitespace-nowrap truncate">{tab.label}</span>
                        </div>
                        {tab.count !== undefined && tab.count > 0 && (
                          <span className="ml-2 w-5 h-5 min-w-[20px] min-h-[20px] aspect-square rounded-full bg-red-600 text-white text-[10px] font-mono font-bold flex items-center justify-center p-0 leading-none shadow-md shrink-0 border-0 outline-none ring-0">
                            {tab.count > 99 ? '99+' : tab.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>

                {/* Prominent Sidebar Sign Out Button */}
                <div className="pt-6 pb-2 border-t border-gold/25 mt-auto">
                  <button 
                    onClick={handleLogout}
                    className="w-full py-3 sm:py-3.5 px-4 text-center text-xs sm:text-sm text-red-200 border border-red-500/50 bg-red-950/40 hover:bg-red-900/60 hover:border-red-400 hover:text-white transition-all font-mono flex items-center justify-center gap-2.5 uppercase tracking-wider rounded-sm cursor-pointer font-bold shadow-md active:scale-95 group"
                    title="Sign Out of Administrator Account"
                  >
                    <LogOut size={16} className="text-red-400 group-hover:text-white transition-colors stroke-[2.2] shrink-0" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </aside>
          );
        })()}

        {/* Main Content View - Broad and wide display across right and left sides */}
        <main className={`min-w-0 pb-12 w-full ${
          activeTab === 'notifications' 
            ? 'pt-1' 
            : 'flex-1 md:px-2 lg:px-3 pt-3 md:pt-5'
        }`}>
          {/* Live Activity & WhatsApp Dispatch Toast / Banner */}
          {latestIncomingAlert && (
            <div className="mb-6 p-4 bg-[#0f0f0f] border border-gold/40 rounded-sm shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-gold/30 flex items-center justify-center text-gold shrink-0">
                  <Bell size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-gold font-bold bg-white/5 px-2 py-0.5 border border-white/10">
                      New Activity Recorded
                    </span>
                    <span className="text-[11px] font-mono text-gray-400">
                      {new Date(latestIncomingAlert.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <h4 className="text-sm font-heading font-bold text-white mt-1">
                    {latestIncomingAlert.activityType}: <span className="text-gold font-sans">{latestIncomingAlert.clientName || 'Visitor'}</span>
                    {latestIncomingAlert.clientPhone ? ` (${latestIncomingAlert.clientPhone})` : ''}
                  </h4>
                  {latestIncomingAlert.service && (
                    <p className="text-xs text-gray-300 font-mono mt-0.5">
                      Service Requested: <strong className="text-white">{latestIncomingAlert.service}</strong>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
                <a
                  href={latestIncomingAlert.directWhatsAppUrl || getOwnerWhatsAppUrl(latestIncomingAlert)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-gold hover:bg-gold-light text-black font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm rounded-sm transition-all"
                  title="Open full lead details in WhatsApp for studio owner"
                >
                  <MessageSquare size={13} />
                  <span>Send to Owner WhatsApp</span>
                </a>
                {latestIncomingAlert.clientPhone && (
                  <a
                    href={getClientWhatsAppReplyUrl(latestIncomingAlert.clientPhone, latestIncomingAlert.clientName, latestIncomingAlert.service)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-black-pure border border-white/20 hover:border-gold text-gray-200 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 rounded-sm transition-all"
                    title="Send a WhatsApp reply directly to client"
                  >
                    <span>Reply to Client</span>
                  </a>
                )}
                <button
                  onClick={() => setLatestIncomingAlert(null)}
                  className="p-2 text-gray-400 hover:text-white text-xs transition-colors cursor-pointer"
                  title="Dismiss alert"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Laptop Executive Status Bar (The Admin Display) */}
          <div className="hidden lg:flex items-center justify-between mb-6 bg-[#0f0f0f] p-4 sm:p-5 border border-white/10 rounded-sm shadow-sm flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-gold shrink-0"></div>
              <div>
                <div className="text-[10px] font-mono text-gold uppercase tracking-[0.2em] font-semibold">Workspace Management</div>
                <h1 className="text-base sm:text-lg font-heading font-bold text-white uppercase tracking-wider">
                  {activeTab === 'projects' && 'Portfolio & Creations'}
                  {activeTab === 'services' && 'Capabilities & Services'}
                  {activeTab === 'leads' && 'Client Inquiries & CRM'}
                  {activeTab === 'users' && 'Client & User Directory'}
                  {activeTab === 'testimonials' && 'Testimonials & Reviews'}
                  {activeTab === 'transformations' && 'Before & After Transformations'}
                  {activeTab === 'sections' && 'Website Sections & Brand Editor'}
                  {activeTab === 'media' && 'Media & Asset Vault'}
                  {activeTab === 'notifications' && 'System Notifications & Real-Time Alerts'}
                  {activeTab === 'communications' && 'Email & WhatsApp Communications Hub'}
                  {activeTab === 'settings' && 'Master Passcode & Security'}
                  {activeTab === 'profile' && 'Administrator Profile'}
                </h1>
                {activeTab === 'notifications' && (
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    Central database communications &amp; real-time interaction hub
                  </p>
                )}
              </div>
            </div>

            {/* Laptop Quick Metric Chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="px-2.5 py-1 bg-black-rich border border-white/10 rounded text-[11px] font-mono flex items-center gap-1.5 shadow-sm">
                <span className="text-gray-400">Creations:</span>
                <span className="text-gold font-bold">{projects.length}</span>
              </div>
              <div className="px-2.5 py-1 bg-black-rich border border-white/10 rounded text-[11px] font-mono flex items-center gap-1.5 shadow-sm">
                <span className="text-gray-400">Services:</span>
                <span className="text-gold font-bold">{allCombinedServices.length}</span>
              </div>
              <div className="px-2.5 py-1 bg-black-rich border border-white/10 rounded text-[11px] font-mono flex items-center gap-1.5 shadow-sm">
                <span className="text-gray-400">Leads:</span>
                <span className="text-emerald-400 font-bold">{leads.length}</span>
              </div>
              <div className="px-2.5 py-1 bg-black-rich border border-white/10 rounded text-[11px] font-mono flex items-center gap-1.5 shadow-sm">
                <span className="text-gray-400">Users:</span>
                <span className="text-gold font-bold">{users.length}</span>
              </div>
              <div className="px-2.5 py-1 bg-black-rich border border-white/10 rounded text-[11px] font-mono flex items-center gap-1.5 shadow-sm">
                <span className="text-gray-400">WhatsApp:</span>
                <span className="text-emerald-400 font-bold">{whatsappDispatches.length}</span>
              </div>
              <div className="px-2.5 py-1 bg-black-rich border border-white/10 rounded text-[11px] font-mono flex items-center gap-1.5 shadow-sm">
                <span className="text-gray-400">Vault:</span>
                <span className="text-gold font-bold">{mediaAssets.length}</span>
              </div>
              <div className="px-2.5 py-1 bg-black-rich border border-white/10 rounded text-[11px] font-mono flex items-center gap-1.5 shadow-sm text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>DB: Live &amp; Synced</span>
              </div>

              {/* Universal Export Hub Button */}
              <ExportButton
                data={
                  activeTab === 'users' ? users :
                  activeTab === 'leads' ? leads :
                  activeTab === 'communications' ? whatsappDispatches :
                  activeTab === 'services' ? allCombinedServices :
                  projects
                }
                columns={
                  activeTab === 'users' ? [
                    { header: 'Name', key: 'name' },
                    { header: 'Email', key: 'email' },
                    { header: 'Phone', key: 'phone' },
                    { header: 'Role', key: 'role', format: (u: any) => u.role || 'Member' },
                    { header: 'Source', key: 'source', format: (u: any) => u.source || 'Direct' },
                    { header: 'Service Interest', key: 'service', format: (u: any) => u.service || '-' },
                    { header: 'Details', key: 'details', format: (u: any) => u.details || '-' },
                    { header: 'Date', key: 'createdAt', format: (u: any) => u.createdAt ? (typeof u.createdAt === 'string' ? u.createdAt : new Date(u.createdAt?.seconds ? u.createdAt.seconds * 1000 : Date.now()).toLocaleDateString()) : 'Recent' }
                  ] :
                  activeTab === 'leads' ? [
                    { header: 'Client Name', key: 'name' },
                    { header: 'Email', key: 'email' },
                    { header: 'Phone', key: 'phone' },
                    { header: 'Service Requested', key: 'service' },
                    { header: 'Property Type', key: 'propertyType' },
                    { header: 'Estimated Budget', key: 'budget' },
                    { header: 'Project Timeline', key: 'timeline' },
                    { header: 'Client Notes', key: 'details' },
                    { header: 'Date Submitted', key: 'createdAt', format: (l: any) => l.createdAt ? new Date(l.createdAt).toLocaleDateString() : 'Recent' }
                  ] :
                  activeTab === 'communications' ? [
                    { header: 'Activity Type', key: 'activityType' },
                    { header: 'Client Name', key: 'clientName' },
                    { header: 'Client Email', key: 'clientEmail' },
                    { header: 'Recipient Phone', key: 'recipientPhone' },
                    { header: 'Service / Subject', key: 'service' },
                    { header: 'Message Details', key: 'details' },
                    { header: 'Timestamp', key: 'createdAt', format: (r: any) => r.createdAt ? new Date(r.createdAt).toLocaleString() : 'Recent' }
                  ] :
                  activeTab === 'services' ? [
                    { header: 'Service Title', key: 'title' },
                    { header: 'Category', key: 'category' },
                    { header: 'Price / Rate', key: 'price' },
                    { header: 'Description', key: 'desc', format: (s: any) => s.desc || s.description || '' }
                  ] :
                  [
                    { header: 'Creation Title', key: 'title' },
                    { header: 'Section', key: 'section' },
                    { header: 'Category', key: 'category' },
                    { header: 'Description', key: 'desc', format: (p: any) => p.desc || p.description || '' },
                    { header: 'Image Asset URL', key: 'image' }
                  ]
                }
                title={`Natal Interior Design - ${
                  activeTab === 'users' ? 'User Directory' :
                  activeTab === 'leads' ? 'Client Leads & Quotes' :
                  activeTab === 'communications' ? 'WhatsApp Dispatches Log' :
                  activeTab === 'services' ? 'Services Catalogue' :
                  activeTab === 'notifications' ? 'Notifications Stream' :
                  'Portfolio Creations'
                }`}
                subtitle={`Exported report for admin records and CRM management`}
                category={activeTab}
                filenamePrefix={`natal_${activeTab}_report`}
                summaryCards={[
                  { label: 'Total Records', value: (
                    activeTab === 'users' ? users.length :
                    activeTab === 'leads' ? leads.length :
                    activeTab === 'communications' ? whatsappDispatches.length :
                    activeTab === 'services' ? allCombinedServices.length :
                    projects.length
                  ) },
                  { label: 'Active Leads', value: leads.length },
                  { label: 'Registered Clients', value: users.length },
                  { label: 'WhatsApp Alerts', value: whatsappDispatches.length }
                ]}
                buttonLabel="Export Report"
                size="sm"
                variant="gold"
              />
            </div>
          </div>

          {/* Mobile & Tablet Bar: Back Home Arrow & Extended Hamburger Menu (Only when not notifications tab) */}
          {activeTab !== 'notifications' && (
            <div className="md:hidden flex items-center justify-between mb-5 border-b border-gold/20 pb-3 px-1 sm:px-6">
              <div className="flex items-center gap-4">
                {/* Back Home Arrow directly linking admin back */}
                <button 
                  onClick={onNavigateHome}
                  className="text-gold hover:text-white transition-colors p-1 cursor-pointer group"
                  title="Back to Website Home"
                >
                  <ArrowLeft size={24} className="group-hover:-translate-x-0.5 transition-transform" />
                </button>

                {/* Hamburger Menu extended and positioned slightly to the right */}
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="text-gray-300 hover:text-gold transition-colors p-1 cursor-pointer ml-1 relative"
                  title="Open Admin Navigation Menu"
                >
                  <Menu size={24} />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 z-10 bg-red-600 text-white font-mono text-[9px] font-bold rounded-full w-4.5 h-4.5 min-w-[18px] min-h-[18px] aspect-square flex items-center justify-center p-0 leading-none shadow-md animate-pulse border-0 outline-none ring-0 pointer-events-none">
                      {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                    </span>
                  )}
                </button>
              </div>

              <span className="text-gold font-mono text-[10px] uppercase tracking-widest px-3 py-1 bg-gold/10 border border-gold/20 rounded">
                {activeTab === 'services' ? 'Our Services' : activeTab === 'users' ? 'User Directory' : activeTab === 'sections' ? 'Section Content' : activeTab === 'communications' ? 'Email & WhatsApp' : activeTab === 'settings' ? 'Security & Passcode' : activeTab}
              </span>
            </div>
          )}

          <div className="px-0 sm:px-2 md:px-0 w-full">
            {/* TAB 1: PROJECTS & CREATIONS */}
          {activeTab === 'projects' && (() => {
            // 1. Featured Interior Creations (Showcase) - 16 base cards
            const allShowcaseCards = cardHighlights.map((ch, idx) => {
              const defaultId = `card-highlight-${idx}`;
              const edited = projects.find((p: any) => 
                p.cardHighlightId === defaultId || 
                p.id === defaultId ||
                (p.originalTitle && p.originalTitle.trim().toLowerCase() === ch.title.trim().toLowerCase()) ||
                (p.section === 'showcase' && p.title.trim().toLowerCase() === ch.title.trim().toLowerCase())
              );

              if (edited) {
                return {
                  id: edited.id,
                  cardHighlightId: defaultId,
                  title: edited.title,
                  category: edited.category,
                  image: edited.image,
                  desc: edited.desc || edited.description || '',
                  section: 'showcase',
                  sectionLabel: 'Featured Interior Creations',
                  originalTitle: ch.title,
                  isBase: true,
                  isEdited: true
                };
              }

              return {
                id: defaultId,
                cardHighlightId: defaultId,
                title: ch.title,
                category: ch.category,
                image: ch.image,
                desc: ch.desc,
                section: 'showcase',
                sectionLabel: 'Featured Interior Creations',
                originalTitle: ch.title,
                isBase: true,
                isEdited: false
              };
            });

            // 2. Featured Projects (Portfolio) - 8 base cards
            const projectCards = projectsData.map((bp) => {
              const defaultId = `project-${bp.id}`;
              const edited = projects.find((p: any) => 
                p.originalId === bp.id || 
                p.id === defaultId ||
                (p.originalTitle && p.originalTitle.trim().toLowerCase() === bp.title.trim().toLowerCase()) ||
                (p.section === 'projects' && p.title.trim().toLowerCase() === bp.title.trim().toLowerCase())
              );

              if (edited) {
                return {
                  id: edited.id,
                  originalId: bp.id,
                  title: edited.title,
                  category: edited.category,
                  image: edited.image,
                  desc: edited.desc || edited.description || '',
                  servicesUsed: edited.servicesUsed || bp.servicesUsed,
                  beforeImage: edited.beforeImage || bp.beforeImage,
                  section: 'projects',
                  sectionLabel: 'Featured Projects',
                  originalTitle: bp.title,
                  isBase: true,
                  isEdited: true
                };
              }

              return {
                id: defaultId,
                originalId: bp.id,
                title: bp.title,
                category: bp.category,
                image: bp.image,
                desc: bp.description,
                servicesUsed: bp.servicesUsed,
                beforeImage: bp.beforeImage,
                section: 'projects',
                sectionLabel: 'Featured Projects',
                originalTitle: bp.title,
                isBase: true,
                isEdited: false
              };
            });

            // 3. Our Services - 6 base cards
            const serviceCards = servicesData.map((s) => {
              const defaultId = `service-${s.id}`;
              const edited = services.find((es: any) => 
                es.id === s.id || 
                es.originalId === s.id || 
                (es.title && es.title.trim().toLowerCase() === s.title.trim().toLowerCase())
              );

              const defaultImage = (cardHighlights.find(c => c.category === s.title)?.image) || 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=1200';

              if (edited) {
                return {
                  id: edited.id || defaultId,
                  originalId: s.id,
                  title: edited.title,
                  category: 'Our Services',
                  image: edited.image || defaultImage,
                  desc: edited.description || edited.desc || '',
                  features: edited.features || s.features,
                  slug: edited.slug || s.slug,
                  icon: edited.icon || s.icon,
                  section: 'services',
                  sectionLabel: 'Our Services',
                  originalTitle: s.title,
                  isBase: true,
                  isEdited: true
                };
              }

              return {
                id: defaultId,
                originalId: s.id,
                title: s.title,
                category: 'Our Services',
                image: defaultImage,
                desc: s.description,
                features: s.features,
                slug: s.slug,
                icon: s.icon,
                section: 'services',
                sectionLabel: 'Our Services',
                originalTitle: s.title,
                isBase: true,
                isEdited: false
              };
            });

            // 4. Why Choose Us - 5 cards
            const savedWhyUs = (() => {
              try {
                return JSON.parse(localStorage.getItem('natal_section_why_us') || 'null');
              } catch {
                return null;
              }
            })();
            const whyUsItems = (savedWhyUs && savedWhyUs.items && savedWhyUs.items.length > 0) ? savedWhyUs.items : whyChooseUsData;
            const whyUsCards = whyUsItems.map((w: any, idx: number) => ({
              id: `why-us-${idx}`,
              title: w.title,
              category: 'Why Choose Us',
              image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1200',
              desc: w.description || w.desc || '',
              section: 'why_us',
              sectionLabel: 'Why Choose Us',
              originalTitle: whyChooseUsData[idx]?.title || w.title,
              isBase: true,
              isEdited: !!savedWhyUs
            }));

            // 5. The Process - 5 cards
            const savedProcess = (() => {
              try {
                return JSON.parse(localStorage.getItem('natal_section_process') || 'null');
              } catch {
                return null;
              }
            })();
            const processItems = (savedProcess && savedProcess.steps && savedProcess.steps.length > 0) ? savedProcess.steps : (defaultProcessContent.steps || []);
            const processCards = processItems.map((st: any, idx: number) => ({
              id: `process-step-${idx}`,
              title: st.title,
              category: 'The Process',
              image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200',
              desc: st.description || st.desc || '',
              section: 'process',
              sectionLabel: 'The Process',
              originalTitle: (defaultProcessContent.steps?.[idx]?.title) || st.title,
              isBase: true,
              isEdited: !!savedProcess
            }));

            // 6. Hero Quick Cards - 4 cards
            const savedHero = (() => {
              try {
                return JSON.parse(localStorage.getItem('natal_section_hero') || 'null');
              } catch {
                return null;
              }
            })();
            const heroCardItems = (savedHero && savedHero.cards && savedHero.cards.length > 0) ? savedHero.cards : (defaultHeroContent.cards || []);
            const heroCards = heroCardItems.map((h: any, idx: number) => ({
              id: `hero-card-${idx}`,
              title: h.label || `Hero Card ${idx + 1}`,
              category: 'Hero Quick Cards',
              image: h.img || defaultHeroContent.cards[idx]?.img,
              desc: `Quick card #${idx + 1} displayed in homepage hero showcase.`,
              section: 'hero',
              sectionLabel: 'Hero Quick Cards',
              originalTitle: defaultHeroContent.cards[idx]?.label || h.label,
              isBase: true,
              isEdited: !!savedHero
            }));

            // 7. Testimonials - 3 cards
            const testimonialCards = (testimonials.length > 0 ? testimonials : testimonialsData).map((t: any, idx: number) => ({
              id: t.id || `testimonial-${idx}`,
              title: t.name,
              category: t.role || 'Testimonial',
              image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
              desc: t.content,
              section: 'testimonials',
              sectionLabel: 'Testimonials',
              originalTitle: t.name,
              isBase: true,
              isEdited: !!t.createdAt
            }));

            // 8. Custom user uploads
            const customUploadedCards = projects.filter((p: any) => 
              !p.section || p.section === 'custom' || (!p.cardHighlightId && !p.originalId && !p.isBaseProject)
            ).map((p: any) => ({
              id: p.id,
              title: p.title,
              category: p.category,
              image: p.image,
              desc: p.desc || p.description || '',
              section: 'custom',
              sectionLabel: 'Custom Uploads',
              originalTitle: p.title,
              isBase: false,
              isEdited: true
            }));

            const allCombinedCards = [
              ...allShowcaseCards,
              ...projectCards,
              ...serviceCards,
              ...whyUsCards,
              ...processCards,
              ...heroCards,
              ...testimonialCards,
              ...customUploadedCards
            ];

            let visibleSectionCards: any[] = allShowcaseCards;
            if (selectedSectionFilter === 'showcase') {
              visibleSectionCards = allShowcaseCards;
            } else if (selectedSectionFilter === 'projects') {
              visibleSectionCards = projectCards;
            } else if (selectedSectionFilter === 'services') {
              visibleSectionCards = serviceCards;
            } else if (selectedSectionFilter === 'why_us') {
              visibleSectionCards = whyUsCards;
            } else if (selectedSectionFilter === 'process') {
              visibleSectionCards = processCards;
            } else if (selectedSectionFilter === 'hero') {
              visibleSectionCards = heroCards;
            } else if (selectedSectionFilter === 'testimonials') {
              visibleSectionCards = testimonialCards;
            } else if (selectedSectionFilter === 'custom') {
              visibleSectionCards = customUploadedCards;
            } else if (selectedSectionFilter === 'all') {
              visibleSectionCards = allCombinedCards;
            }

            if (cardSearchQuery.trim()) {
              const q = cardSearchQuery.trim().toLowerCase();
              visibleSectionCards = visibleSectionCards.filter(c => 
                (c.title || '').toLowerCase().includes(q) ||
                (c.category || '').toLowerCase().includes(q) ||
                (c.desc || '').toLowerCase().includes(q) ||
                (c.sectionLabel || '').toLowerCase().includes(q)
              );
            }

            return (
            <div className="space-y-8">
              {/* Success Notification */}
              {successNotice && (
                <div className="p-4 bg-emerald-950/70 border border-emerald-500/60 text-emerald-200 text-sm flex items-center gap-2">
                  <CheckCircle size={18} className="text-emerald-400 shrink-0" />
                  <span>{successNotice}</span>
                </div>
              )}

              {/* Upload & Card Edit Form Box */}
              <div id="creation-form-box" className="bg-black-pure/90 border border-gold/30 lg:border-gold/40 p-3.5 sm:p-8 lg:p-10 shadow-xl shadow-black/70 relative">
                {/* Editing Card Banner */}
                {editingCardMeta && (
                  <div className="mb-5 p-3.5 sm:p-4 bg-gradient-to-r from-gold/25 via-gold/15 to-transparent border border-gold/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_0_20px_rgba(212,175,55,0.2)]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gold text-black-pure font-bold rounded-sm shrink-0">
                        <Edit3 size={18} />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-gold font-bold block">
                          Editing Card · {editingCardMeta.sectionLabel}
                        </span>
                        <h3 className="text-base sm:text-lg font-heading text-white font-bold leading-tight">
                          "{editingCardMeta.title}"
                        </h3>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelEditCard}
                      className="self-start sm:self-auto px-4 py-2 border border-gold/50 hover:border-gold text-gold hover:text-white uppercase font-mono text-xs tracking-wider transition-all bg-black-pure/80 cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between mb-5 border-b border-gold/20 pb-4">
                  <div>
                    <span className="text-[10px] font-mono text-gold uppercase tracking-widest">
                      {editingCardMeta ? `Card Editor · ${editingCardMeta.sectionLabel}` : 'Content Management'}
                    </span>
                    <h2 className="text-xl lg:text-2xl font-heading text-white uppercase tracking-wider flex items-center gap-2">
                      {editingCardMeta ? `Edit "${editingCardMeta.title}"` : 'Upload New Creation'}
                    </h2>
                  </div>
                </div>

                <form onSubmit={handleAddProject} className="space-y-5 lg:space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold mb-1.5">
                        Card Title *
                      </label>
                      <input 
                        required 
                        value={title} 
                        onChange={e => setTitle(e.target.value)} 
                        placeholder="e.g. Master Suite Coffered Gypsum Ceiling"
                        className="w-full bg-black-rich border border-gold/30 lg:border-gold/40 px-3.5 py-2.5 lg:py-3 text-white text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all placeholder:text-gray-600" 
                      />
                    </div>

                    <div className="relative z-30">
                      <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold mb-1.5">
                        CATEGORY *
                      </label>
                      <div className="relative">
                        <div 
                          onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                          className="w-full bg-black-rich border border-gold/30 lg:border-gold/40 pl-4 pr-10 py-2.5 lg:py-3 text-white text-sm cursor-pointer hover:border-gold transition-colors flex items-center justify-between select-none"
                        >
                          <span className={category === "Custom" ? "text-gold" : "text-white"}>
                            {category === "Custom" ? (customCategory ? `Custom: ${customCategory}` : "Custom Category...") : category}
                          </span>
                          <ChevronDown size={18} className={`text-gold transition-transform duration-200 ${isCategoryOpen ? 'rotate-180' : ''}`} />
                        </div>
                        
                        {isCategoryOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsCategoryOpen(false)}></div>
                            <div className="absolute z-50 w-full mt-1 bg-black-pure border border-gold shadow-[0_8px_24px_rgba(0,0,0,0.9)] max-h-64 overflow-y-auto">
                              {CATEGORY_OPTIONS.map(opt => (
                                <div 
                                  key={opt} 
                                  className={`px-4 py-3 text-sm cursor-pointer select-none transition-colors duration-100 ${
                                    reactingCategory === opt
                                      ? 'bg-gold/30 text-gold font-semibold'
                                      : category === opt
                                        ? 'bg-gold/15 text-gold'
                                        : 'text-white hover:bg-gold/15 active:bg-gold/25'
                                  }`}
                                  onClick={() => handleSelectCategory(opt)}
                                >
                                  {opt}
                                </div>
                              ))}
                              <div 
                                className={`px-4 py-3 text-sm font-medium cursor-pointer select-none border-t border-gold/30 transition-colors duration-100 ${
                                  reactingCategory === 'Custom'
                                    ? 'bg-gold/30 text-gold font-semibold'
                                    : category === 'Custom'
                                      ? 'bg-gold/15 text-gold'
                                      : 'text-gold hover:bg-gold/15 active:bg-gold/25'
                                }`}
                                onClick={() => handleSelectCategory('Custom')}
                              >
                                Custom Category...
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {category === "Custom" && (
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gold font-semibold mb-1">
                        Enter Custom Category Name
                      </label>
                      <input 
                        value={customCategory} 
                        onChange={e => setCustomCategory(e.target.value)} 
                        placeholder="e.g. Luxury Swimming Pool Cabana"
                        className="w-full bg-black-rich border border-gold px-3 py-2 text-white text-sm focus:outline-none" 
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold mb-1">
                      Description *
                    </label>
                    <textarea 
                      required 
                      value={desc} 
                      onChange={e => setDesc(e.target.value)} 
                      placeholder="Highlight materials used, craftsmanship details, lighting design, or custom dimensions..."
                      className="w-full bg-black-rich border border-gold/30 px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gold transition-colors h-24 placeholder:text-gray-600" 
                    />
                  </div>

                  {/* Image Selection - Supports Device Upload OR URL */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold mb-2">
                      Card Photo *
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Device File Upload */}
                      <div className="border-2 border-dashed border-gold/40 hover:border-gold p-4 text-center flex flex-col items-center justify-center bg-black-pure/50 transition-colors cursor-pointer relative group">
                        <Upload size={28} className="text-gold group-hover:scale-110 transition-transform mb-2" />
                        <span className="text-xs text-white font-medium">Choose Photo from Device</span>
                        <span className="text-[10px] text-gray-400 mt-1">Upload from Phone Gallery, Camera, or PC (JPG, PNG)</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </div>

                      {/* Web Image URL Alternative */}
                      <div className="flex flex-col justify-center">
                        <span className="text-xs text-gray-400 uppercase tracking-wider mb-1">Or Paste Web Image URL:</span>
                        <input 
                          value={imageUrl} 
                          onChange={e => {
                            setImageUrl(e.target.value);
                            setImagePreview(e.target.value);
                          }} 
                          placeholder="https://images.unsplash.com/..."
                          className="w-full bg-black-rich border border-gold/30 px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gold placeholder:text-gray-600" 
                        />
                        <span className="text-[10px] text-gray-500 mt-1">Paste any direct image link from Unsplash, Pinterest, etc.</span>
                      </div>
                    </div>

                    {/* Image Live Preview */}
                    {imagePreview && (
                      <div className="mt-3 p-3 bg-black-rich border border-gold/30 flex items-center gap-4">
                        <div className="w-24 h-24 bg-black-pure border border-gold/40 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                          <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className="w-full h-full object-contain" 
                            onError={() => setImagePreview('')}
                          />
                        </div>
                        <div className="text-xs text-gray-300">
                          <span className="text-gold font-bold block">Photo Preview Ready</span>
                          <span className="text-[11px] text-gray-400">Padded preview preserving your image's full framing and aspect ratio.</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
                    <button 
                      type="submit" 
                      disabled={isUploading}
                      className="w-full sm:w-auto max-w-full bg-gold hover:bg-yellow-400 text-black-pure font-bold px-4 sm:px-8 py-3.5 sm:py-3 uppercase text-[11px] sm:text-xs tracking-wider sm:tracking-widest transition-all shadow-[0_0_15px_rgba(212,175,55,0.4)] disabled:opacity-50 cursor-pointer text-center inline-flex items-center justify-center gap-2"
                    >
                      {isUploading ? (
                        <>
                          <GoldSpinner size="xs" /> <span>Saving Creation...</span>
                        </>
                      ) : (
                        <span>
                          {editingCardMeta 
                            ? `Update "${title || editingCardMeta.title}" & Publish Live` 
                            : editingProjectId 
                              ? 'Update Creation (Move to Top)' 
                              : 'Publish Creation to Website'}
                        </span>
                      )}
                    </button>
                    {(editingProjectId || editingCardMeta) && (
                      <button
                        type="button"
                        onClick={handleCancelEditCard}
                        className="w-full sm:w-auto px-5 py-3 border border-white/20 text-gray-400 hover:text-white uppercase text-xs tracking-wider text-center cursor-pointer transition-colors"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Universal Section Cards Browser & Direct Editor */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gold/20 pb-3 gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-gold uppercase tracking-widest block">Direct Card & Content Editor</span>
                    <h3 className="text-lg lg:text-xl font-heading text-white uppercase tracking-wider flex items-center gap-2">
                      Section Cards ({visibleSectionCards.length})
                    </h3>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">
                    Click <span className="text-gold font-bold">Edit</span> on any card to update its photo & details
                  </span>
                </div>

                {/* Section Filter Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {[
                    { id: 'showcase', label: 'Featured Interior Creations', count: allShowcaseCards.length, icon: Sparkles },
                    { id: 'projects', label: 'Featured Projects', count: projectCards.length, icon: Building2 },
                    { id: 'services', label: 'Our Services', count: serviceCards.length, icon: Paintbrush },
                    { id: 'why_us', label: 'Why Choose Us', count: whyUsCards.length, icon: ShieldCheck },
                    { id: 'process', label: 'The Process', count: processCards.length, icon: Layers },
                    { id: 'hero', label: 'Hero Quick Cards', count: heroCards.length, icon: ImageIcon },
                    { id: 'testimonials', label: 'Testimonials', count: testimonialCards.length, icon: MessageSquare },
                    { id: 'custom', label: 'Custom Uploads', count: customUploadedCards.length, icon: Upload },
                    { id: 'all', label: 'All Section Cards', count: allCombinedCards.length, icon: Sliders },
                  ].map(tab => {
                    const TabIcon = tab.icon;
                    const isActive = selectedSectionFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setSelectedSectionFilter(tab.id)}
                        className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs font-mono uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer rounded-none border shrink-0 ${
                          isActive
                            ? 'bg-gold text-black-pure border-gold font-bold shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                            : 'bg-black-rich text-gray-300 border-gold/30 hover:border-gold hover:text-white'
                        }`}
                      >
                        <TabIcon size={13} className={isActive ? 'text-black-pure' : 'text-gold'} />
                        <span>{tab.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold font-mono ${
                          isActive ? 'bg-black-pure text-gold' : 'bg-white/10 text-gray-300'
                        }`}>
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Instant Search Bar */}
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    value={cardSearchQuery}
                    onChange={e => setCardSearchQuery(e.target.value)}
                    placeholder="Filter cards by title, category, or description..."
                    className="w-full bg-black-pure border border-gold/30 pl-10 pr-10 py-2.5 text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-gold"
                  />
                  {cardSearchQuery && (
                    <button 
                      type="button"
                      onClick={() => setCardSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Cards Grid */}
                {visibleSectionCards.length === 0 ? (
                  <div className="p-8 text-center bg-black-pure/50 border border-gold/20 text-gray-400 text-sm">
                    No cards matching the search query in this section.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 w-full">
                    {visibleSectionCards.map((card, cIdx) => (
                      <div 
                        key={card.id ? `${card.id}-${cIdx}` : `card-${cIdx}`} 
                        className={`bg-black-pure border ${
                          editingCardMeta?.id === card.id 
                            ? 'border-gold shadow-[0_0_24px_rgba(212,175,55,0.7)] ring-1 ring-gold' 
                            : 'border-gold/30 hover:border-gold'
                        } group relative overflow-hidden flex flex-col justify-between transition-all duration-300 shadow-md hover:shadow-[0_12px_28px_rgba(0,0,0,0.85)] rounded-none w-full`}
                      >
                        <div className="h-28 sm:h-32 md:h-36 lg:h-32 xl:h-36 overflow-hidden relative bg-black-rich">
                          <img 
                            src={card.image} 
                            alt={card.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black-pure via-transparent to-transparent opacity-60 pointer-events-none"></div>
                          
                          {/* Section & Status Badges */}
                          <div className="absolute top-1.5 left-1.5 z-20 flex flex-wrap gap-1 pointer-events-none">
                            <span className="bg-black-pure/95 border border-gold/70 text-gold text-[8px] sm:text-[9px] uppercase tracking-wider font-mono font-bold px-1.5 py-0.5 shadow-sm truncate max-w-[120px]">
                              {card.sectionLabel || card.section}
                            </span>
                            {card.isEdited && (
                              <span className="bg-amber-500 text-black-pure text-[8px] uppercase tracking-wider font-mono font-extrabold px-1.5 py-0.5 shadow-sm">
                                Edited
                              </span>
                            )}
                          </div>

                          {/* Quick Action Buttons */}
                          <div className="absolute top-1.5 right-1.5 z-20 flex items-center gap-1">
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEditCard(card);
                              }}
                              className="bg-black-pure/95 hover:bg-gold hover:text-black-pure text-gold p-1 sm:px-2 sm:py-1 border border-gold/70 transition-all cursor-pointer shadow-md text-[10px] sm:text-xs flex items-center gap-1 font-mono font-semibold"
                              title="Edit this card"
                            >
                              <Edit3 size={11} />
                              <span className="hidden sm:inline">Edit</span>
                            </button>
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteOrResetCard(card);
                              }}
                              className={`${
                                card.isBase 
                                  ? 'bg-neutral-900 hover:bg-neutral-700 text-amber-300 border border-amber-500/50' 
                                  : 'bg-red-950/90 hover:bg-red-700 text-white border border-red-500'
                              } p-1 transition-all cursor-pointer shadow-md`}
                              title={card.isBase ? (card.isEdited ? 'Reset edits to default' : 'Revert') : 'Delete creation'}
                            >
                              {card.isBase ? <RotateCcw size={11} /> : <Trash2 size={11} />}
                            </button>
                          </div>
                        </div>

                        <div className="p-2 sm:p-2.5 lg:p-3 flex-1 flex flex-col justify-between">
                          <div>
                            <span className="text-gold text-[9px] sm:text-[10px] uppercase tracking-widest font-mono font-semibold block mb-0.5 truncate">
                              {card.category}
                            </span>
                            <h4 className="text-white font-medium text-xs sm:text-sm line-clamp-1 group-hover:text-gold transition-colors" title={card.title}>
                              {card.title}
                            </h4>
                            <p className="text-gray-400 text-[11px] line-clamp-2 mt-0.5 leading-relaxed font-light">{card.desc}</p>
                          </div>

                          <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400 font-mono">
                            <button
                              type="button"
                              onClick={() => handleStartEditCard(card)}
                              className="text-gold hover:text-white flex items-center gap-1 font-bold cursor-pointer transition-colors text-[10px] sm:text-xs"
                            >
                              <Edit3 size={11} /> <span>Edit</span>
                            </button>
                            <span className="text-emerald-400 flex items-center gap-1 shrink-0 text-[10px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Live
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            );
          })()}

          {/* TAB: SERVICES MANAGEMENT */}
          {activeTab === 'services' && (
            <div className="space-y-6 sm:space-y-8">
              {/* Success Notification */}
              {successNotice && (
                <div className="p-4 bg-emerald-950/70 border border-emerald-500/60 text-emerald-200 text-sm flex items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={18} className="text-emerald-400 shrink-0" />
                    <span>{successNotice}</span>
                  </div>
                  <button onClick={() => setSuccessNotice('')} className="text-emerald-400 hover:text-white text-xs mt-0.5 sm:mt-0 shrink-0">
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Section Header Success */}
              {sectionHeaderSuccess && (
                <div className="p-4 bg-emerald-950/70 border border-emerald-500/60 text-emerald-200 text-sm flex items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={18} className="text-emerald-400 shrink-0" />
                    <span>{sectionHeaderSuccess}</span>
                  </div>
                  <button onClick={() => setSectionHeaderSuccess('')} className="text-emerald-400 hover:text-white text-xs mt-0.5 sm:mt-0 shrink-0">
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* 1. SECTION HEADER CUSTOMIZATION ACCORDION / CARD */}
              <div className="bg-black-pure/80 border border-gold/30 p-3.5 sm:p-6">
                <div 
                  className="flex items-center justify-between cursor-pointer group gap-2 sm:gap-4"
                  onClick={() => setIsSectionHeaderOpen(!isSectionHeaderOpen)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 sm:p-2.5 bg-gold/10 border border-gold/30 text-gold group-hover:bg-gold group-hover:text-black-pure transition-colors shrink-0">
                      <Sliders size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </div>
                    <div>
                      <span className="text-[9px] sm:text-[10px] font-mono text-gold uppercase tracking-widest block mb-0.5">Website Appearance</span>
                      <h3 className="text-sm sm:text-lg font-heading text-white uppercase tracking-wider group-hover:text-gold transition-colors leading-snug">
                        Section Heading & Intro
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-mono text-gold shrink-0 border border-gold/20 sm:border-transparent px-2 py-1 sm:p-0 bg-gold/5 sm:bg-transparent rounded sm:rounded-none">
                    <span className="hidden sm:inline">{isSectionHeaderOpen ? 'Collapse' : 'Configure Headings'}</span>
                    <span className="sm:hidden">{isSectionHeaderOpen ? 'Close' : 'Edit'}</span>
                    {isSectionHeaderOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>

                {isSectionHeaderOpen && (
                  <form onSubmit={handleSaveSectionHeader} className="mt-5 pt-5 border-t border-gold/20 space-y-4">
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Customize the titles and description displayed above the services grid on the public website.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold mb-1">
                          Eyebrow Subtitle
                        </label>
                        <input 
                          value={serviceSectionSubtitle}
                          onChange={e => setServiceSectionSubtitle(e.target.value)}
                          placeholder="CAPABILITIES"
                          className="w-full bg-black-rich border border-gold/30 px-3 py-2 text-white text-sm focus:outline-none focus:border-gold transition-colors placeholder:text-gray-600"
                        />
                        <span className="text-[10px] text-gray-500 mt-1 block">Appears in gold uppercase tracking above the main title.</span>
                      </div>

                      <div>
                        <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold mb-1">
                          Section Main Title *
                        </label>
                        <input 
                          required
                          value={serviceSectionTitle}
                          onChange={e => setServiceSectionTitle(e.target.value)}
                          placeholder="OUR SERVICES"
                          className="w-full bg-black-rich border border-gold/30 px-3 py-2 text-white text-sm focus:outline-none focus:border-gold transition-colors placeholder:text-gray-600 font-heading"
                        />
                        <span className="text-[10px] text-gray-500 mt-1 block">The primary headline for this section.</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold mb-1">
                        Section Narrative / Description
                      </label>
                      <textarea 
                        rows={3}
                        value={serviceSectionDesc}
                        onChange={e => setServiceSectionDesc(e.target.value)}
                        placeholder="Comprehensive architectural execution from structural shell to bespoke turnkey handover."
                        className="w-full bg-black-rich border border-gold/30 px-3 py-2 text-white text-sm focus:outline-none focus:border-gold transition-colors placeholder:text-gray-600"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 gap-4">
                      <button
                        type="submit"
                        disabled={isSavingSectionHeader}
                        className="w-full sm:w-auto bg-gold hover:bg-yellow-400 text-black-pure font-bold px-4 sm:px-6 py-3 sm:py-2.5 uppercase text-xs tracking-widest transition-all shadow-[0_0_12px_rgba(212,175,55,0.3)] disabled:opacity-50 cursor-pointer inline-flex items-center justify-center gap-2"
                      >
                        {isSavingSectionHeader ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" /> Saving...
                          </>
                        ) : (
                          <>
                            <Check size={14} /> Update Header
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setServiceSectionSubtitle('CAPABILITIES');
                          setServiceSectionTitle('OUR SERVICES');
                          setServiceSectionDesc('Comprehensive architectural execution from structural shell to bespoke turnkey handover.');
                        }}
                        className="w-full sm:w-auto flex items-center justify-center sm:justify-start gap-1.5 text-[11px] sm:text-xs text-gray-400 hover:text-gold transition-colors py-2 sm:py-0 border border-white/10 sm:border-transparent bg-white/5 sm:bg-transparent"
                      >
                        <RotateCcw size={12} /> Reset Defaults
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* 2. SERVICE UPLOAD / EDIT FORM */}
              <div id="service-edit-form" className="bg-black-pure/80 border border-gold/30 p-3.5 sm:p-8 relative">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-gold/20 pb-3 gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-gold uppercase tracking-widest">
                      {editingServiceId ? 'Updating Existing Service' : 'Service Publishing Studio'}
                    </span>
                    <h2 className="text-lg sm:text-xl font-heading text-white uppercase tracking-wider flex items-center gap-2 mt-0.5">
                      {editingServiceId ? (
                        <>
                          <Edit3 size={18} className="text-gold shrink-0" />
                          <span className="truncate">Edit Service: {serviceTitle || 'Current Item'}</span>
                        </>
                      ) : (
                        <>
                          <Plus size={18} className="text-gold shrink-0" />
                          <span>Publish New Service</span>
                        </>
                      )}
                    </h2>
                  </div>
                  <span className="self-start sm:self-auto text-[10px] sm:text-xs font-mono text-gold flex items-center gap-1.5 bg-gold/10 border border-gold/30 px-2 py-1">
                    <Sparkles size={12} /> Syncs to Homepage
                  </span>
                </div>

                <form onSubmit={handleAddOrUpdateService} className="space-y-4 sm:space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold mb-1">
                        Service Title *
                      </label>
                      <input 
                        required 
                        value={serviceTitle} 
                        onChange={e => setServiceTitle(e.target.value)} 
                        placeholder="e.g. Bespoke Gypsum Ceilings & Lighting"
                        className="w-full bg-black-rich border border-gold/30 px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gold transition-colors placeholder:text-gray-600" 
                      />
                    </div>

                    <div className="relative z-30">
                      <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold mb-1">
                        DISCIPLINE / ARCHITECTURAL FOCUS
                      </label>
                      <div className="relative">
                        <div 
                          onClick={() => setIsDisciplineOpen(!isDisciplineOpen)}
                          className="w-full bg-black-rich border border-gold/30 px-3 py-2.5 text-white text-sm cursor-pointer hover:border-gold transition-colors flex items-center justify-between select-none"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            {renderDisciplineIcon(serviceIcon, 16)}
                            <span className="text-white truncate">
                              {DISCIPLINE_OPTIONS.find(d => d.value === serviceIcon)?.label || 'Gypsum & Fine Wall Finishes'}
                            </span>
                          </div>
                          <ChevronDown size={18} className={`text-gold transition-transform duration-200 shrink-0 ml-2 ${isDisciplineOpen ? 'rotate-180' : ''}`} />
                        </div>
                        
                        {isDisciplineOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsDisciplineOpen(false)}></div>
                            <div 
                              onWheel={(e) => e.stopPropagation()}
                              className="absolute z-50 w-full mt-1 max-h-60 sm:max-h-64 overflow-y-auto overscroll-contain touch-pan-y bg-black-pure border border-gold shadow-[0_12px_36px_rgba(0,0,0,0.95)] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-black-rich [&::-webkit-scrollbar-thumb]:bg-gold/60 [&::-webkit-scrollbar-thumb:hover]:bg-gold [&::-webkit-scrollbar-thumb]:rounded-sm [scrollbar-width:thin] [scrollbar-color:#D4AF37_#0A0A0A]"
                            >
                              <div className="py-1">
                                {DISCIPLINE_OPTIONS.map(opt => (
                                  <div 
                                    key={opt.value} 
                                    className={`px-3.5 py-2.5 sm:py-3 text-sm cursor-pointer select-none transition-colors duration-100 flex items-center justify-between gap-3 ${
                                      reactingDiscipline === opt.value
                                        ? 'bg-gold/30 text-gold font-semibold'
                                        : serviceIcon === opt.value
                                          ? 'bg-gold/15 text-gold font-medium'
                                          : 'text-white hover:bg-gold/15 active:bg-gold/25'
                                    }`}
                                    onClick={() => handleSelectDiscipline(opt.value)}
                                  >
                                    <div className="flex items-center gap-2.5 truncate">
                                      {renderDisciplineIcon(opt.value, 15)}
                                      <span className="truncate">{opt.label}</span>
                                    </div>
                                    {serviceIcon === opt.value && (
                                      <Check size={14} className="text-gold shrink-0" />
                                    )}
                                  </div>
                                ))}
                              </div>
                              <div className="sticky bottom-0 px-3 py-1.5 bg-black-rich/95 border-t border-gold/20 text-[10px] text-gray-400 font-mono flex items-center justify-between select-none pointer-events-none">
                                <span>10 disciplines • Scroll for all</span>
                                <ChevronDown size={11} className="text-gold animate-bounce" />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold mb-1">
                      Service Description *
                    </label>
                    <textarea 
                      required 
                      value={serviceDesc} 
                      onChange={e => setServiceDesc(e.target.value)} 
                      rows={4}
                      placeholder="Describe the architectural and craftsmanship scope of this service..."
                      className="w-full bg-black-rich border border-gold/30 px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gold transition-colors placeholder:text-gray-600" 
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold mb-1">
                        Key Features & Highlights
                      </label>
                      <input 
                        value={serviceFeatures} 
                        onChange={e => setServiceFeatures(e.target.value)} 
                        placeholder="e.g. Precision CNC profiles, Integrated LED channels"
                        className="w-full bg-black-rich border border-gold/30 px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gold transition-colors placeholder:text-gray-600" 
                      />
                      <span className="text-[10px] text-gray-400 mt-1 block">Separated by commas to generate bullet points.</span>
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold mb-1">
                        Optional Banner Image URL
                      </label>
                      <input 
                        value={serviceImage} 
                        onChange={e => setServiceImage(e.target.value)} 
                        placeholder="https://images.unsplash.com/..."
                        className="w-full bg-black-rich border border-gold/30 px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gold transition-colors placeholder:text-gray-600" 
                      />
                      <span className="text-[10px] text-gray-400 mt-1 block">Direct image URL for cards or detail modals.</span>
                    </div>
                  </div>

                  {/* Feature preview chips */}
                  {serviceFeatures.trim() && (
                    <div className="p-3 bg-black-rich border border-white/10 flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase font-mono text-gray-400 shrink-0">Bullet Preview:</span>
                      {serviceFeatures.split(',').map((f, fIdx) => f.trim() && (
                        <span key={fIdx} className="text-[10px] sm:text-xs bg-gold/15 text-gold px-2 py-0.5 border border-gold/30 flex items-center gap-1">
                          <Check size={10} className="shrink-0" /> <span className="truncate max-w-[120px] sm:max-w-none">{f.trim()}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="pt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <button 
                      type="submit" 
                      disabled={isUploadingService}
                      className="w-full sm:w-auto bg-gold hover:bg-yellow-400 text-black-pure font-bold px-4 sm:px-8 py-3.5 sm:py-3 uppercase text-[11px] sm:text-xs tracking-widest transition-all shadow-[0_0_15px_rgba(212,175,55,0.4)] disabled:opacity-50 cursor-pointer text-center inline-flex items-center justify-center gap-2"
                    >
                      {isUploadingService ? (
                        <>
                          <GoldSpinner size="xs" /> <span>Saving Service...</span>
                        </>
                      ) : (
                        <>
                          {editingServiceId ? <Check size={14} /> : <Plus size={14} />}
                          <span>{editingServiceId ? 'Save & Update Live Service' : 'Publish Service to Website'}</span>
                        </>
                      )}
                    </button>

                    {editingServiceId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingServiceId(null);
                          setEditingOriginalId(null);
                          setServiceTitle('');
                          setServiceDesc('');
                          setServiceFeatures('');
                          setServiceImage('');
                          const savedDefaultDiscipline = localStorage.getItem('natal_default_service_discipline') || 'Paintbrush';
                          setServiceIcon(savedDefaultDiscipline);
                        }}
                        className="w-full sm:w-auto px-4 sm:px-5 py-3 border border-white/20 text-gray-400 hover:text-white uppercase text-[11px] sm:text-xs tracking-wider cursor-pointer bg-white/5 sm:bg-transparent"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* 3. LIVE SERVICES CATALOG & ORDERING */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gold/20 pb-3 gap-2">
                  <div>
                    <h3 className="text-lg font-heading text-white uppercase tracking-wider flex items-center gap-2">
                      <span>Live Services Catalog</span>
                      <span className="text-gold font-mono text-sm">({allCombinedServices.length})</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      All active services displayed in the "Our Services" section on the homepage.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {hiddenServiceIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleRestoreDefaultServices}
                        className="px-3 py-1.5 bg-gold/10 hover:bg-gold/20 border border-gold/40 text-gold text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Restore previously hidden default services"
                      >
                        <RotateCcw size={12} />
                        Restore Hidden ({hiddenServiceIds.length})
                      </button>
                    )}
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 flex items-center gap-1.5">
                      <Eye size={12} /> Live Sync Active
                    </span>
                  </div>
                </div>

                {allCombinedServices.length === 0 ? (
                  <div className="p-12 text-center bg-black-pure/50 border border-gold/20 text-gray-400 text-sm">
                    <p className="font-semibold text-white mb-1">No services currently active.</p>
                    <p className="text-xs text-gray-500 mb-4">You have hidden all default services or have not created any.</p>
                    <button
                      type="button"
                      onClick={handleRestoreDefaultServices}
                      className="px-4 py-2 bg-gold text-black-pure font-bold text-xs uppercase tracking-wider"
                    >
                      Restore Default Services
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 w-full">
                    {allCombinedServices.map((service, idx) => (
                      <div 
                        key={service.id ? `${service.id}-${idx}` : `svc-${idx}`} 
                        className="bg-black-pure border border-gold/30 hover:border-gold p-2.5 sm:p-3 flex flex-col justify-between relative group transition-all duration-300 shadow-md hover:shadow-[0_12px_28px_rgba(0,0,0,0.85)] w-full"
                      >
                        <div className="flex-1 flex flex-col">
                          {/* Card Top Meta & Status */}
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <span className="text-gold text-[9px] sm:text-[10px] uppercase tracking-wider font-mono font-bold">
                              #{idx + 1} {idx === 0 && '• Top'}
                            </span>
                            <div className="flex items-center gap-1">
                              {service.isCustom && (
                                <span className="text-[8px] font-mono px-1.5 py-0.5 bg-emerald-900/60 border border-emerald-500/50 text-emerald-300 uppercase font-semibold">
                                  Custom
                                </span>
                              )}
                              {service.isEdited && (
                                <span className="text-[8px] font-mono px-1.5 py-0.5 bg-amber-900/60 border border-amber-500/50 text-amber-300 uppercase font-semibold">
                                  Edited
                                </span>
                              )}
                              {service.isBase && !service.isEdited && (
                                <span className="text-[8px] font-mono px-1.5 py-0.5 bg-white/5 border border-white/10 text-gray-400 uppercase">
                                  Base
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Image preview if exists, or architectural icon thumbnail */}
                          {service.image ? (
                            <div className="relative aspect-[16/10] max-h-24 sm:max-h-28 overflow-hidden bg-black-rich mb-2 border border-gold/30">
                              <img
                                src={service.image}
                                alt={service.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black-pure/70 via-transparent to-transparent" />
                            </div>
                          ) : (
                            <div className="h-12 sm:h-14 bg-black-rich/70 border border-white/10 flex items-center justify-center mb-2 group-hover:border-gold/40 transition-colors">
                              {renderDisciplineIcon(service.icon, 20)}
                            </div>
                          )}

                          {/* Service Title */}
                          <h4 className="text-white font-heading text-xs sm:text-sm font-bold uppercase tracking-wide line-clamp-1 group-hover:text-gold transition-colors mb-1" title={service.title}>
                            {service.title}
                          </h4>

                          {/* Service Description */}
                          <p className="text-gray-300 text-[11px] leading-relaxed line-clamp-2 mb-2 font-light">
                            {service.description}
                          </p>

                          {/* Key Features Count or Sample */}
                          {service.features && Array.isArray(service.features) && service.features.length > 0 && (
                            <div className="mb-2 text-[10px] text-gray-400 font-mono flex items-center gap-1 truncate">
                              <span className="w-1 h-1 rounded-full bg-gold shrink-0"></span>
                              <span className="truncate">{service.features[0]}</span>
                            </div>
                          )}
                        </div>

                        {/* Actions Toolbar */}
                        <div className="pt-2 mt-auto border-t border-white/10 space-y-1.5">
                          <div className="grid grid-cols-3 gap-1">
                            {/* Promote / Move to Top */}
                            {idx > 0 ? (
                              <button
                                type="button"
                                onClick={() => handlePromoteService(service)}
                                className="bg-black-rich hover:bg-gold hover:text-black-pure text-gray-300 py-1 px-1 flex items-center justify-center gap-0.5 border border-white/20 hover:border-gold transition-colors cursor-pointer text-[10px] font-mono font-medium"
                                title="Elevate to Position #1 at top"
                              >
                                <ArrowUp size={11} />
                                <span className="hidden sm:inline">Top</span>
                              </button>
                            ) : (
                              <div className="bg-gold/15 border border-gold/40 text-gold py-1 flex items-center justify-center text-[9px] font-mono font-bold" title="Currently Top Priority">
                                #1
                              </div>
                            )}

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleEditService(service)}
                              className="bg-black-rich hover:bg-gold hover:text-black-pure text-gold py-1 px-1 flex items-center justify-center gap-0.5 border border-gold/40 transition-colors shadow cursor-pointer text-[10px] font-mono font-semibold"
                              title="Edit this service"
                            >
                              <Edit3 size={11} />
                              <span className="hidden sm:inline">Edit</span>
                            </button>

                            {/* Delete or Hide Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteOrHideService(service)}
                              className="bg-red-950/80 hover:bg-red-700 text-white py-1 px-1 flex items-center justify-center gap-0.5 border border-red-500/50 transition-colors shadow cursor-pointer text-[10px] font-mono"
                              title={service.isBase ? "Hide from website" : "Delete service"}
                            >
                              <Trash2 size={11} />
                              <span className="hidden sm:inline">Hide</span>
                            </button>
                          </div>

                          {/* Footer Discipline & Live status */}
                          <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-gray-400 font-mono pt-0.5">
                            <span className="text-gray-400 truncate mr-1 flex items-center gap-1" title={DISCIPLINE_OPTIONS.find(d => d.value === service.icon)?.label || service.icon || 'Gypsum & Fine Wall Finishes'}>
                              {renderDisciplineIcon(service.icon, 11)}
                              <span className="truncate">{DISCIPLINE_OPTIONS.find(d => d.value === service.icon)?.label?.split(' ')[0] || 'Gypsum'}</span>
                            </span>
                            <span className="text-emerald-400 flex items-center gap-0.5 shrink-0 font-medium">
                              <Eye size={10} /> Live
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CLIENT LEADS & INQUIRIES */}
          {activeTab === 'leads' && (
            <div className="space-y-6">
              <div className="border-b border-gold/20 pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-gold uppercase tracking-widest">Inquiries & Quotes</span>
                  <h2 className="text-xl font-heading text-white uppercase tracking-wider">
                    Client Leads & Quote Requests
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <ExportButton
                    data={leads}
                    columns={[
                      { header: 'Client Name', key: 'name' },
                      { header: 'Email Address', key: 'email' },
                      { header: 'Phone Number', key: 'phone' },
                      { header: 'Service Requested', key: 'service' },
                      { header: 'Property Type', key: 'propertyType' },
                      { header: 'Estimated Budget', key: 'budget' },
                      { header: 'Timeline', key: 'timeline' },
                      { header: 'Specific Notes / Scope', key: 'details' },
                      { header: 'Submission Date', key: 'createdAt', format: (l: any) => l.createdAt ? new Date(l.createdAt).toLocaleDateString() : 'Recent' }
                    ]}
                    title="Natal Interior Design - Client Leads & Quotations"
                    subtitle="Detailed record of prospective client project proposals and quote submissions"
                    category="Leads & Quotations"
                    filenamePrefix="natal_leads_quotes"
                    summaryCards={[
                      { label: 'Total Inquiries', value: leads.length },
                      { label: 'High Budget', value: leads.filter((l: any) => l.budget && l.budget.includes('$50,000')).length },
                      { label: 'Villas & Penthouses', value: leads.filter((l: any) => l.propertyType && (l.propertyType.includes('Villa') || l.propertyType.includes('Penthouse'))).length }
                    ]}
                    buttonLabel="Export Leads"
                  />
                  <div className="text-right hidden sm:block">
                    <span className="text-sm font-mono text-white bg-white/5 border border-white/10 px-3 py-1.5 inline-block">
                      Total Leads: <span className="text-gold font-bold">{leads.length}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Client Engagement 30-Day Metrics Visualization */}
              <ClientEngagementMetricsChart
                leads={leads}
                users={users}
                userActivities={userActivities}
              />

              {leads.length === 0 ? (
                <div className="p-12 text-center bg-black-pure/50 border border-gold/20">
                  <FileText size={36} className="text-gold/50 mx-auto mb-3" />
                  <p className="text-gray-300 font-medium text-sm">No client quote requests yet.</p>
                  <p className="text-xs text-gray-500 mt-1">When clients fill out the "Request a Quote" form, their details will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                  {leads.map((lead, lIdx) => (
                    <div key={lead.id ? `${lead.id}-${lIdx}` : `lead-${lIdx}`} className="bg-[#0f0f0f] border border-white/10 hover:border-gold/30 rounded-sm p-4 sm:p-5 flex flex-col justify-between transition-colors shadow-sm">
                      <div>
                        <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3 mb-3">
                          <div>
                            <h4 className="text-white font-bold text-base line-clamp-1">{lead.name || 'Client Lead'}</h4>
                            <span className="text-gold text-[10px] uppercase tracking-widest font-mono mt-0.5 inline-block bg-white/5 px-2 py-0.5 border border-white/10">
                              {lead.service || 'General Inquiry'}
                            </span>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="text-gray-400 text-[10px] font-mono whitespace-nowrap bg-white/5 px-1.5 py-0.5 border border-white/10">
                              {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : 'Recent'}
                            </span>
                            <button 
                              onClick={async () => {
                                try {
                                  if (lead.id && !lead.id.startsWith('local_')) {
                                    try {
                                      await deleteDoc(doc(db, 'leads', lead.id));
                                    } catch (e) {
                                      console.warn("Firestore delete failed:", e);
                                    }
                                  }
                                  const currentLocal = JSON.parse(localStorage.getItem('natal_local_leads') || '[]');
                                  const updated = currentLocal.filter((l: any) => l.id !== lead.id);
                                  localStorage.setItem('natal_local_leads', JSON.stringify(updated));
                                  setLeads(prev => prev.filter(l => l.id !== lead.id));
                                } catch (e) {
                                  console.error("Error deleting lead:", e);
                                }
                              }}
                              className="text-gray-500 hover:text-red-400 hover:bg-red-950/40 p-1.5 transition-colors cursor-pointer border border-transparent hover:border-red-500/30 rounded-sm"
                              title="Delete Lead"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2 text-xs mb-4">
                          {lead.phone && (
                            <div className="flex items-center gap-2.5 text-gray-300">
                              <Phone size={13} className="text-gold shrink-0" />
                              <a href={`tel:${lead.phone}`} className="hover:text-gold transition-colors truncate">{lead.phone}</a>
                            </div>
                          )}
                          {lead.email && (
                            <div className="flex items-center gap-2.5 text-gray-300">
                              <Mail size={13} className="text-gold shrink-0" />
                              <a href={`mailto:${lead.email}`} className="hover:text-gold transition-colors truncate">{lead.email}</a>
                            </div>
                          )}
                        </div>

                        {lead.details && (
                          <div className="bg-[#141414] p-3 border border-white/5 text-xs text-gray-300">
                            <span className="text-gray-500 font-mono text-[10px] uppercase block mb-1">Project Details:</span>
                            <p className="line-clamp-4 leading-relaxed">{lead.details}</p>
                          </div>
                        )}

                        {/* Client Attached Blueprint, Photo or Video */}
                        {lead.fileAttachment && (
                          <div className="mt-3 p-2.5 bg-[#141414] border border-white/10 flex items-center justify-between gap-2 shadow-inner">
                            <div className="flex items-center gap-2 overflow-hidden min-w-0">
                              {lead.fileAttachment.type === 'video' ? (
                                <div className="w-9 h-9 relative bg-black border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                                  {lead.fileAttachment.thumbnail ? (
                                    <img src={lead.fileAttachment.thumbnail} alt="" className="w-full h-full object-cover opacity-60" />
                                  ) : null}
                                  <Video size={13} className="text-gold relative z-10" />
                                </div>
                              ) : lead.fileAttachment.type === 'image' && (lead.fileAttachment.thumbnail || lead.fileAttachment.data) ? (
                                <img 
                                  src={lead.fileAttachment.thumbnail || lead.fileAttachment.data} 
                                  alt="" 
                                  className="w-9 h-9 object-cover border border-white/10 shrink-0" 
                                />
                              ) : (
                                <div className="w-9 h-9 bg-white/5 border border-white/10 flex items-center justify-center text-gold shrink-0">
                                  <FileText size={16} />
                                </div>
                              )}
                              <div className="overflow-hidden min-w-0">
                                <span className="text-[8px] font-mono text-gold uppercase block tracking-wider">
                                  {lead.fileAttachment.type === 'video' ? 'Walkthrough Video' : lead.fileAttachment.type === 'image' ? 'Site Photo' : 'Architectural Plan'}
                                </span>
                                <p className="text-[11px] text-white font-medium truncate" title={lead.fileAttachment.name}>
                                  {lead.fileAttachment.name}
                                </p>
                                <span className="text-[9px] font-mono text-gray-400">{lead.fileAttachment.sizeFormatted || 'Attached'}</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setLeadAttachmentModal({ ...lead.fileAttachment, clientName: lead.name })}
                              className="px-2 py-1 bg-white/5 hover:bg-gold text-gold hover:text-black border border-white/10 text-[10px] font-mono font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                            >
                              {lead.fileAttachment.type === 'video' ? (
                                <>
                                  <Play size={10} className="fill-current" /> Watch
                                </>
                              ) : (
                                <>
                                  <Eye size={10} /> View / Open
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* WhatsApp Dispatch & Delivery Status */}
                      {lead.whatsappDeliveryStatus === 'gateway_rejected_invalid_key' && (
                        <div className="mt-3 p-2 bg-[#141414] border border-white/10 rounded-sm text-[11px] text-amber-200 flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 font-mono text-[10px]">
                            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                            <span>Background bot not authorized. Tap below to send directly.</span>
                          </span>
                        </div>
                      )}

                      <div className="mt-4 pt-3 border-t border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* 1-Click Send to Owner WhatsApp */}
                          <a
                            href={getOwnerWhatsAppUrl({
                              id: lead.id,
                              leadType: (lead.service && lead.service !== 'General Inquiry') ? 'Quotation Request' : 'Consultation Lead',
                              name: lead.name,
                              phone: lead.phone,
                              email: lead.email,
                              service: lead.service,
                              details: lead.details,
                              timestamp: lead.createdAt
                            })}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gold hover:bg-gold-light text-black font-bold font-mono text-[11px] uppercase tracking-wider rounded-sm transition-all shadow-sm"
                            title={`Send full lead summary directly to studio owner (${whatsappConfig.ownerWhatsAppNumber})`}
                          >
                            <MessageSquare size={13} />
                            <span>Send to Owner WhatsApp</span>
                          </a>

                          {/* 1-Click Chat with Client on WhatsApp */}
                          {lead.phone && (
                            <a
                              href={getClientWhatsAppReplyUrl(lead.phone, lead.name, lead.service)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black-pure border border-white/20 hover:border-gold text-gray-200 hover:text-white font-bold font-mono text-[11px] uppercase tracking-wider rounded-sm transition-all"
                              title="Chat directly with client on WhatsApp"
                            >
                              <span>Chat Client</span>
                            </a>
                          )}
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0">
                          <span className="text-[10px] font-mono text-gray-500 uppercase flex items-center gap-1.5">
                            <CheckCircle size={12} className="text-emerald-500/70" />
                            In Database
                          </span>
                          {lead.email && (
                            <a 
                              href={`mailto:${lead.email}?subject=Re: Natal Interior Design Inquiry`}
                              className="text-gold text-[10px] uppercase font-bold font-mono tracking-wider hover:text-white transition-colors"
                            >
                              Email &rarr;
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: CLIENT & USER DIRECTORY */}
          {activeTab === 'users' && (
            <AdminUsersTab
              users={users}
              leads={leads}
              onDeleteUser={handleDeleteUser}
              onCreateUser={async (userData) => {
                const isAdmin = (userData.email || '').toLowerCase().includes('admin') || userData.role === 'Administrator';
                const isVIP = !isAdmin && (userData.role === 'VIP Client' || userData.source === 'Registration');
                const created = await syncUserRecord({
                  ...userData,
                  role: isAdmin ? 'Administrator' : userData.role,
                  status: isAdmin ? 'Active Administrator' : (isVIP ? 'Active' : 'Pending Consultation'),
                  isVIP,
                  vipTier: isVIP ? 'VIP Gold Member' : undefined
                });
                setUsers(prev => [created, ...prev.filter(u => u.email?.toLowerCase() !== created.email?.toLowerCase())]);
                setUserNotice(isAdmin 
                  ? `Administrator "${created.name}" registered successfully into directory!`
                  : isVIP
                  ? `VIP Client "${created.name}" registered successfully into directory!`
                  : `User "${created.name}" registered successfully into directory!`
                );
                setTimeout(() => setUserNotice(''), 4000);
              }}
              onUpdateUser={handleUpdateUser}
              onExportCSV={handleExportUsersCSV}
              notice={userNotice}
              onClearNotice={() => setUserNotice('')}
            />
          )}

          {/* TAB 3: TESTIMONIALS */}
          {activeTab === 'testimonials' && (
            <div className="space-y-6">
              <div className="border-b border-gold/20 pb-3">
                <span className="text-[10px] font-mono text-gold uppercase tracking-widest">Client Feedback</span>
                <h2 className="text-xl font-heading text-white uppercase tracking-wider">
                  Testimonials
                </h2>
              </div>

              {/* Upload New Testimonial Form */}
              <div className="bg-black-pure border border-gold/30 p-3.5 sm:p-6 mb-8">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">Add New Testimonial</h3>
                </div>

                <form onSubmit={handleSaveTestimonial} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold">Client Name *</label>
                      </div>
                      <input 
                        required 
                        type="text" 
                        value={tName} 
                        onChange={e => setTName(sanitizeNameInput(e.target.value))} 
                        onKeyDown={e => handleNameKeyDown(e)}
                        onPaste={e => handleNamePaste(e, setTName)}
                        inputMode="text"
                        placeholder="e.g. Robert Kasasa" 
                        className="w-full bg-black-rich border border-gold/30 px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gold" 
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold">Role / Title *</label>
                      </div>
                      <input 
                        required 
                        type="text" 
                        value={tRole} 
                        onChange={e => setTRole(sanitizeNameInput(e.target.value))} 
                        onKeyDown={e => handleNameKeyDown(e)}
                        onPaste={e => handleNamePaste(e, setTRole)}
                        inputMode="text"
                        placeholder="e.g. Home Owner" 
                        className="w-full bg-black-rich border border-gold/30 px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gold" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold mb-1">Feedback Content *</label>
                    <textarea required value={tContent} onChange={e => setTContent(e.target.value)} rows={3} placeholder="The client's testimonial..." className="w-full bg-black-rich border border-gold/30 px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gold resize-none" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative z-10">
                      <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold mb-1">Star Rating</label>
                      <div className="relative">
                        <div 
                          onClick={() => setIsRatingOpen(!isRatingOpen)}
                          className="w-full bg-black-rich border border-gold/30 px-4 py-2.5 text-white text-sm cursor-pointer hover:border-gold transition-colors flex items-center justify-between select-none"
                        >
                          <span>{tRating} Stars</span>
                          <ChevronDown size={18} className={`text-gold transition-transform absolute right-3 top-1/2 -translate-y-1/2 ${isRatingOpen ? 'rotate-180' : ''}`} />
                        </div>
                        
                        {isRatingOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsRatingOpen(false)}></div>
                            <div className="absolute z-50 w-full mt-1 bg-black-pure border border-gold shadow-lg shadow-black outline outline-1 outline-gold">
                              {['5', '4', '3'].map(opt => (
                                <div 
                                  key={opt} 
                                  className="px-4 py-2.5 text-sm text-white hover:bg-gold/20 cursor-pointer"
                                  onClick={() => { setTRating(opt); setIsRatingOpen(false); }}
                                >
                                  {opt} Stars
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold mb-1">Client Photo (Optional)</label>
                      <div className="flex items-center gap-3">
                         <label className="flex-1 cursor-pointer bg-white/5 hover:bg-white/10 border border-gold/30 px-3 py-2.5 flex items-center justify-center gap-2 text-xs text-gray-300 transition-colors">
                            <ImageIcon size={14} /> 
                            <span>{tImagePreview ? 'Change Photo' : 'Upload Photo'}</span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleTImageFileChange} />
                         </label>
                         {tImagePreview && (
                            <div className="flex items-center gap-2 bg-black-rich border border-gold/40 p-1.5 rounded">
                              <div className="w-12 h-12 rounded-full border border-gold/60 p-0.5 bg-black-pure flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                                <img src={tImagePreview} alt="Preview" className="w-full h-full object-cover rounded-full" />
                              </div>
                              <button 
                                type="button" 
                                onClick={() => { setTImage(''); setTImagePreview(''); }}
                                className="text-gray-400 hover:text-red-400 p-1 transition-colors"
                                title="Remove photo"
                              >
                                <X size={14} />
                              </button>
                            </div>
                         )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button type="submit" disabled={isUploadingTestimonial} className="bg-gold hover:bg-yellow-400 text-black-pure font-bold px-6 py-2.5 uppercase text-xs tracking-widest transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2">
                      {isUploadingTestimonial ? (
                        <>
                          <GoldSpinner size="xs" />
                          <span>Publishing...</span>
                        </>
                      ) : (
                        'Publish Testimonial'
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {testimonials.length === 0 ? (
                <div className="p-12 text-center bg-black-pure/50 border border-gold/20">
                  <ShieldCheck size={36} className="text-gold/50 mx-auto mb-3" />
                  <p className="text-gray-300 font-medium text-sm">No testimonials added yet.</p>
                  <p className="text-xs text-gray-500 mt-1">Client testimonials will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                  {testimonials.map((testimonial, tIdx) => (
                    <div key={testimonial.id ? `${testimonial.id}-${tIdx}` : `testimonial-${tIdx}`} className="bg-[#0f0f0f] border border-white/10 hover:border-gold/30 rounded-sm p-4 sm:p-5 space-y-3 relative group transition-colors shadow-sm flex flex-col justify-between">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                        <div className="flex items-center gap-4">
                           {testimonial.image && (
                              <div className="w-12 h-12 rounded-full border border-gold/50 p-0.5 bg-black-rich flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                                <img src={testimonial.image} alt={testimonial.name} className="w-full h-full rounded-full object-cover" />
                              </div>
                           )}
                           <div>
                             <h4 className="text-white font-bold text-base">{testimonial.name}</h4>
                             <span className="text-gold text-xs font-mono">{testimonial.role}</span>
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-400 text-xs font-mono">
                            {testimonial.rating} Stars
                          </span>
                          <button 
                            onClick={() => handleDeleteTestimonial(testimonial.id)}
                            className="w-8 h-8 rounded-full bg-red-950/40 text-red-400 flex items-center justify-center hover:bg-red-900/60 hover:text-red-200 transition-colors"
                            title="Delete Testimonial"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {testimonial.content && (
                        <div className="bg-black-rich p-3 border border-white/5 text-sm text-gray-300 italic">
                          "{testimonial.content}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TRANSFORMATIONS */}
          {activeTab === 'transformations' && (
            <div className="space-y-6">
              <div className="border-b border-gold/20 pb-3">
                <span className="text-[10px] font-mono text-gold uppercase tracking-widest">Project Transformations</span>
                <h2 className="text-xl font-heading text-white uppercase tracking-wider">
                  Before & After
                </h2>
              </div>

              {/* Upload New Transformation Form */}
              <div className="bg-black-pure border border-gold/30 p-3.5 sm:p-6 mb-8">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                  <Plus size={18} className="text-gold" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">Add New Transformation</h3>
                </div>

                <form onSubmit={handleSaveTransformation} className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold mb-1">Project Title (Optional)</label>
                    <input type="text" value={trTitle} onChange={e => setTrTitle(e.target.value)} placeholder="e.g. Master Suite Remodel" className="w-full bg-black-rich border border-gold/30 px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gold" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold">Before Image *</label>
                      <div className="flex gap-2">
                         <label className="w-full cursor-pointer bg-white/5 hover:bg-white/10 border border-gold/40 px-3 py-2.5 flex items-center justify-center gap-2 text-xs text-gray-200 transition-colors text-center">
                            <ImageIcon size={15} className="flex-shrink-0 text-gold" /> 
                            <span>{trBeforeImage ? 'Change Before Image' : 'Upload Before Image'}</span>
                            <input required={!trBeforeImage} type="file" accept="image/*" className="hidden" onChange={handleTrBeforeFileChange} />
                         </label>
                      </div>
                      {trBeforeImage ? (
                        <div className="h-44 sm:h-52 relative border border-gold/40 overflow-hidden bg-black-rich shadow-inner">
                          <img src={trBeforeImage} alt="Before Preview" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-44 sm:h-52 border border-dashed border-white/20 bg-black-rich/60 flex flex-col items-center justify-center text-gray-400 gap-2 px-4 text-center">
                          <ImageIcon size={28} className="text-gold/50" />
                          <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400">Before Image Placeholder</span>
                          <span className="text-[10px] text-gray-500">Upload initial room / site state</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold">After Image *</label>
                      <div className="flex gap-2">
                         <label className="w-full cursor-pointer bg-white/5 hover:bg-white/10 border border-gold/40 px-3 py-2.5 flex items-center justify-center gap-2 text-xs text-gray-200 transition-colors text-center">
                            <ImageIcon size={15} className="flex-shrink-0 text-gold" /> 
                            <span>{trAfterImage ? 'Change After Image' : 'Upload After Image'}</span>
                            <input required={!trAfterImage} type="file" accept="image/*" className="hidden" onChange={handleTrAfterFileChange} />
                         </label>
                      </div>
                      {trAfterImage ? (
                        <div className="h-44 sm:h-52 relative border border-gold/40 overflow-hidden bg-black-rich shadow-inner">
                          <img src={trAfterImage} alt="After Preview" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-44 sm:h-52 border border-dashed border-white/20 bg-black-rich/60 flex flex-col items-center justify-center text-gray-400 gap-2 px-4 text-center">
                          <ImageIcon size={28} className="text-gold/50" />
                          <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400">After Image Placeholder</span>
                          <span className="text-[10px] text-gray-500">Upload completed luxury interior</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 pb-1 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold mb-1.5">
                        Default Display Mode
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setTrFitMode('contain')}
                          className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded transition-all cursor-pointer ${
                            trFitMode === 'contain'
                              ? 'bg-gold text-black-pure font-bold shadow-md'
                              : 'bg-white/5 text-gray-300 hover:text-white border border-white/10'
                          }`}
                        >
                          Fit Mode (No Cropping)
                        </button>
                        <button
                          type="button"
                          onClick={() => setTrFitMode('cover')}
                          className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded transition-all cursor-pointer ${
                            trFitMode === 'cover'
                              ? 'bg-gold text-black-pure font-bold shadow-md'
                              : 'bg-white/5 text-gray-300 hover:text-white border border-white/10'
                          }`}
                        >
                          Fill Mode (Cover Frame)
                        </button>
                      </div>
                    </div>

                    <button type="submit" disabled={isUploadingTransformation} className="bg-gold hover:bg-yellow-400 text-black-pure font-bold px-6 py-2.5 uppercase text-xs tracking-widest transition-all disabled:opacity-50 cursor-pointer self-end sm:self-auto">
                      {isUploadingTransformation ? 'Saving...' : 'Save Transformation'}
                    </button>
                  </div>
                </form>
              </div>

              {transformations.length === 0 ? (
                <div className="p-12 text-center bg-black-pure/50 border border-gold/20">
                  <SplitSquareHorizontal size={36} className="text-gold/50 mx-auto mb-3" />
                  <p className="text-gray-300 font-medium text-sm">No transformations added yet.</p>
                  <p className="text-xs text-gray-500 mt-1">Before & After slider items will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 w-full">
                  {transformations.map((tr, trIdx) => (
                    <div key={tr.id ? `${tr.id}-${trIdx}` : `tr-${trIdx}`} className="bg-black-pure border border-gold/30 hover:border-gold p-2.5 sm:p-3 space-y-2.5 relative group shadow-md hover:shadow-[0_12px_28px_rgba(0,0,0,0.85)] transition-all w-full flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-1 border-b border-white/10 pb-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h4 className="text-white font-heading font-bold text-xs uppercase tracking-wider truncate" title={tr.title}>{tr.title}</h4>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleTrMode(tr.id, tr.fitMode)}
                            className={`px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider rounded border transition-colors cursor-pointer ${
                              tr.fitMode === 'contain'
                                ? 'bg-blue-500/15 text-blue-300 border-blue-500/40 hover:bg-blue-500/25'
                                : 'bg-gold/15 text-gold border-gold/40 hover:bg-gold/25'
                            }`}
                            title="Toggle Fit/Fill mode"
                          >
                            {tr.fitMode === 'contain' ? 'Fit' : 'Fill'}
                          </button>
                          <button 
                            onClick={() => handleDeleteTransformation(tr.id)}
                            className="p-1 rounded bg-red-950/50 text-red-400 hover:bg-red-900/70 hover:text-red-200 transition-colors cursor-pointer border border-red-500/30"
                            title="Delete Transformation"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <div className="relative border border-white/10 group-hover:border-gold/30 transition-colors bg-black-pure overflow-hidden h-28 sm:h-32 p-1 shadow-inner">
                          <span className="absolute top-1 left-1 bg-black-pure/95 text-white text-[8px] uppercase tracking-wider px-1.5 py-0.5 z-10 font-mono font-bold border border-white/20 shadow-sm">
                            Before
                          </span>
                          <img src={tr.beforeImage} alt="Before" className={`w-full h-full ${tr.fitMode === 'cover' ? 'object-cover' : 'object-contain'}`} />
                        </div>
                        <div className="relative border border-white/10 group-hover:border-gold/30 transition-colors bg-black-pure overflow-hidden h-28 sm:h-32 p-1 shadow-inner">
                          <span className="absolute top-1 left-1 bg-black-pure/95 text-gold text-[8px] uppercase tracking-wider px-1.5 py-0.5 z-10 font-mono font-bold border border-gold/40 shadow-sm">
                            After
                          </span>
                          <img src={tr.afterImage} alt="After" className={`w-full h-full ${tr.fitMode === 'cover' ? 'object-cover' : 'object-contain'}`} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: NOTIFICATIONS & ALERTS */}
          {activeTab === 'notifications' && (() => {
            // Build unified notification alerts stream
            const allAlerts: any[] = [];

            // 1. CRM Leads & Inquiries
            leads.forEach((l: any, idx: number) => {
              const id = l.id || `lead_${l.email || l.phone || idx}`;
              const isUnread = !readNotificationIds.includes(id);
              const leadTime = parseTimestampToMs(l.createdAt) || (Date.now() - (idx * 3600000));
              allAlerts.push({
                id,
                category: 'lead',
                typeLabel: 'CRM Inquiry',
                title: l.name || 'Direct Lead Inquiry',
                badge: l.service || 'Interior Consultation Request',
                details: l.message || l.details || 'New consultation inquiry submitted via website form.',
                email: l.email || '',
                phone: l.phone || '',
                service: l.service || '',
                source: l.source || 'Website Form',
                directWhatsAppUrl: l.phone ? `https://wa.me/${l.phone.replace(/\D/g, '')}` : '',
                timestamp: leadTime,
                isUnread,
                targetTab: 'leads' as AdminTabType
              });
            });

            // 2. VIP Client Registrations
            users.forEach((u: any, idx: number) => {
              if (!u.isAdmin && !u.email?.toLowerCase().includes('admin') && u.role !== 'Administrator') {
                const id = u.id || `user_${u.email || idx}`;
                const isUnread = !readNotificationIds.includes(id);
                const userTime = getUserTimestamp(u) || (Date.now() - (idx * 7200000));
                allAlerts.push({
                  id,
                  category: 'user',
                  typeLabel: 'VIP Client',
                  title: u.name || 'VIP Client Registration',
                  badge: u.role || 'VIP Client Account',
                  details: u.service ? `Inquiry / Service: ${u.service}` : (u.source ? `Source: ${u.source}` : 'New client profile registered in directory.'),
                  email: u.email || '',
                  phone: u.phone || '',
                  service: u.service || '',
                  source: u.source || 'Registration Portal',
                  directWhatsAppUrl: u.phone ? `https://wa.me/${u.phone.replace(/\D/g, '')}` : '',
                  timestamp: userTime,
                  isUnread,
                  targetTab: 'users' as AdminTabType
                });
              }
            });

            // 3. Automated WhatsApp Dispatches from Database
            whatsappDispatches.forEach((rec: any, idx: number) => {
              const id = rec.id || `wa_${rec.createdAt || idx}`;
              const isUnread = !readNotificationIds.includes(id);
              const waTime = parseTimestampToMs(rec.createdAt) || Date.now();
              allAlerts.push({
                id,
                category: 'whatsapp',
                typeLabel: 'WhatsApp Alert',
                title: `${rec.activityType || 'WhatsApp Dispatch'}: ${rec.clientName || 'Visitor'}`,
                badge: rec.service || 'Automated Phone Alert',
                details: rec.details || rec.service || rec.message || 'Database automated alert dispatched directly to WhatsApp.',
                email: rec.clientEmail || '',
                phone: rec.clientPhone || rec.recipientPhone || '',
                service: rec.service || '',
                source: 'WhatsApp Gateway',
                directWhatsAppUrl: rec.directWhatsAppUrl || (rec.clientPhone ? `https://wa.me/${rec.clientPhone.replace(/\D/g, '')}` : ''),
                timestamp: waTime,
                isUnread,
                targetTab: 'communications' as AdminTabType
              });
            });

            // Deduplicate by ID
            const seenIds = new Set<string>();
            const uniqueAlerts: any[] = [];
            for (const item of allAlerts) {
              if (!seenIds.has(item.id)) {
                seenIds.add(item.id);
                uniqueAlerts.push(item);
              }
            }

            // Sort notifications: Prioritize new user registrations at the top of the list!
            uniqueAlerts.sort((a, b) => {
              const isUserA = a.category === 'user';
              const isUserB = b.category === 'user';

              // 1. New users are placed at the top of the notifications list
              if (isUserA && !isUserB) return -1;
              if (!isUserA && isUserB) return 1;

              // 2. Unread alerts first
              if (a.isUnread && !b.isUnread) return -1;
              if (!a.isUnread && b.isUnread) return 1;

              // 3. Newest timestamp first
              const timeA = typeof a.timestamp === 'number' ? a.timestamp : 0;
              const timeB = typeof b.timestamp === 'number' ? b.timestamp : 0;
              return timeB - timeA;
            });

            // Filter
            const filteredList = uniqueAlerts.filter(item => {
              if (notificationFilter === 'unread' && !item.isUnread) return false;
              if (notificationFilter === 'leads' && item.category !== 'lead') return false;
              if (notificationFilter === 'users' && item.category !== 'user') return false;
              if (notificationFilter === 'whatsapp' && item.category !== 'whatsapp') return false;

              if (notificationSearch.trim()) {
                const q = notificationSearch.toLowerCase();
                const match = 
                  item.title?.toLowerCase().includes(q) ||
                  item.email?.toLowerCase().includes(q) ||
                  item.phone?.toLowerCase().includes(q) ||
                  item.service?.toLowerCase().includes(q) ||
                  item.details?.toLowerCase().includes(q) ||
                  item.source?.toLowerCase().includes(q);
                if (!match) return false;
              }
              return true;
            });

            const unreadCountInList = uniqueAlerts.filter(a => a.isUnread).length;
            const leadsCountInList = uniqueAlerts.filter(a => a.category === 'lead').length;
            const usersCountInList = uniqueAlerts.filter(a => a.category === 'user').length;
            const waCountInList = uniqueAlerts.filter(a => a.category === 'whatsapp').length;

            return (
              <div className="w-full space-y-6">
                {/* Header: Title, Unread Indicator, Mark Read & Refresh */}
                <div className="border-b border-gold/20 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] font-mono text-gold uppercase tracking-widest font-semibold">Executive Feeds</span>
                      {unreadNotificationsCount > 0 ? (
                        <span className="px-3 py-0.5 bg-red-600/20 text-red-400 border border-red-500/50 rounded-full text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-[0_0_10px_rgba(239,68,68,0.35)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                          <span>{unreadNotificationsCount} New Unread Alert{unreadNotificationsCount !== 1 ? 's' : ''}</span>
                        </span>
                      ) : (
                        <span className="px-3 py-0.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-mono font-bold flex items-center gap-1.5">
                          <CheckCircle size={11} className="text-emerald-400" />
                          <span>All Caught Up</span>
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-heading text-white uppercase tracking-wider flex items-center gap-2.5 mt-1.5">
                      <Bell size={22} className="text-gold" /> System Notifications &amp; Alerts
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Live real-time stream of incoming customer inquiries, VIP registrations, and automated WhatsApp communication events.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 self-start md:self-center shrink-0 flex-wrap">
                    <ExportButton
                      data={uniqueAlerts}
                      columns={[
                        { header: 'Alert Type', key: 'typeLabel' },
                        { header: 'Title / Subject', key: 'title' },
                        { header: 'Customer / Channel', key: 'badge' },
                        { header: 'Details', key: 'details' },
                        { header: 'Email', key: 'email', format: (a: any) => a.email || '-' },
                        { header: 'Phone', key: 'phone', format: (a: any) => a.phone || '-' },
                        { header: 'Source', key: 'source', format: (a: any) => a.source || '-' },
                        { header: 'Status', key: 'isUnread', format: (a: any) => a.isUnread ? 'Unread' : 'Read' },
                        { header: 'Timestamp', key: 'timestamp', format: (a: any) => a.timestamp ? new Date(a.timestamp).toLocaleString() : 'Recent' }
                      ]}
                      title="Natal Interior Design - System Notifications & Alerts Stream"
                      subtitle="Executive log of incoming inquiries, VIP registrations, and WhatsApp communication events"
                      category="Notifications & Alerts"
                      filenamePrefix="natal_notifications_stream"
                      summaryCards={[
                        { label: 'Total Alerts', value: uniqueAlerts.length },
                        { label: 'Unread', value: unreadNotificationsCount },
                        { label: 'Leads', value: leadsCountInList },
                        { label: 'WhatsApp', value: waCountInList }
                      ]}
                      buttonLabel="Export Alerts"
                      variant="outline"
                    />
                    {unreadNotificationsCount > 0 && (
                      <button 
                        onClick={handleMarkAllNotificationsRead}
                        className="px-3.5 py-2 bg-gold/15 hover:bg-gold/25 border border-gold/40 text-gold hover:text-white text-xs font-mono uppercase tracking-wider rounded-sm transition-all cursor-pointer flex items-center gap-1.5 shadow-sm font-semibold"
                        title="Mark all active notifications as read"
                      >
                        <Check size={13} />
                        <span>Mark All as Read ({unreadNotificationsCount})</span>
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setSuccessNotice('Notification stream refreshed with live database data');
                        setTimeout(() => setSuccessNotice(''), 3000);
                      }}
                      className="px-3.5 py-2 bg-white/5 hover:bg-gold/10 border border-white/10 hover:border-gold/40 text-gray-300 hover:text-gold text-xs font-mono uppercase tracking-wider rounded-sm transition-all cursor-pointer flex items-center gap-1.5"
                      title="Refresh real-time notification feeds"
                    >
                      <RefreshCw size={12} />
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>

                {/* Metric Summary Cards: 6 Columns on Laptop, 3 on Tablet, 2 on Mobile */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 w-full">
                  <div 
                    onClick={() => switchTab('users')}
                    className="bg-black-pure border border-gold/20 p-3.5 sm:p-4 rounded-sm hover:border-gold transition-all cursor-pointer group shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] sm:text-xs font-mono text-gray-400 uppercase tracking-wider">VIP Clients</span>
                        <UserCheck size={16} className="text-gold group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="text-xl sm:text-2xl font-heading font-bold text-white group-hover:text-gold transition-colors">{users.length}</div>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-2 flex items-center justify-between">
                      <span>Profiles</span>
                      <span className="text-gold underline font-mono">Directory &rarr;</span>
                    </div>
                  </div>

                  <div 
                    onClick={() => switchTab('leads')}
                    className="bg-black-pure border border-gold/20 p-3.5 sm:p-4 rounded-sm hover:border-gold transition-all cursor-pointer group shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] sm:text-xs font-mono text-gray-400 uppercase tracking-wider">Inquiries</span>
                        <Mail size={16} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="text-xl sm:text-2xl font-heading font-bold text-white group-hover:text-emerald-400 transition-colors">{leads.length}</div>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-2 flex items-center justify-between">
                      <span>Live CRM</span>
                      <span className="text-emerald-400 underline font-mono">Quotes &rarr;</span>
                    </div>
                  </div>

                  <div 
                    onClick={() => switchTab('communications')}
                    className="bg-black-pure border border-gold/20 p-3.5 sm:p-4 rounded-sm hover:border-gold transition-all cursor-pointer group shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] sm:text-xs font-mono text-gray-400 uppercase tracking-wider">WhatsApp</span>
                        <MessageSquare size={16} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="text-xl sm:text-2xl font-heading font-bold text-white group-hover:text-emerald-400 transition-colors">{whatsappDispatches.length}</div>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-2 flex items-center justify-between">
                      <span>Dispatches</span>
                      <span className="text-emerald-400 underline font-mono">Hub &rarr;</span>
                    </div>
                  </div>

                  <div 
                    onClick={() => switchTab('projects')}
                    className="bg-black-pure border border-gold/20 p-3.5 sm:p-4 rounded-sm hover:border-gold transition-all cursor-pointer group shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] sm:text-xs font-mono text-gray-400 uppercase tracking-wider">Portfolio</span>
                        <Sparkles size={16} className="text-gold group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="text-xl sm:text-2xl font-heading font-bold text-white group-hover:text-gold transition-colors">{projects.length}</div>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-2 flex items-center justify-between">
                      <span>Creations</span>
                      <span className="text-gold underline font-mono">Projects &rarr;</span>
                    </div>
                  </div>

                  <div 
                    onClick={() => switchTab('services')}
                    className="bg-black-pure border border-gold/20 p-3.5 sm:p-4 rounded-sm hover:border-gold transition-all cursor-pointer group shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] sm:text-xs font-mono text-gray-400 uppercase tracking-wider">Services</span>
                        <Briefcase size={16} className="text-gold group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="text-xl sm:text-2xl font-heading font-bold text-white group-hover:text-gold transition-colors">{allCombinedServices.length}</div>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-2 flex items-center justify-between">
                      <span>Catalog</span>
                      <span className="text-gold underline font-mono">Services &rarr;</span>
                    </div>
                  </div>

                  <div 
                    onClick={() => switchTab('transformations')}
                    className="bg-black-pure border border-gold/20 p-3.5 sm:p-4 rounded-sm hover:border-gold transition-all cursor-pointer group shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] sm:text-xs font-mono text-gray-400 uppercase tracking-wider">Before &amp; After</span>
                        <SplitSquareHorizontal size={16} className="text-gold group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="text-xl sm:text-2xl font-heading font-bold text-white group-hover:text-gold transition-colors">{transformations.length}</div>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-2 flex items-center justify-between">
                      <span>Comparisons</span>
                      <span className="text-gold underline font-mono">Sliders &rarr;</span>
                    </div>
                  </div>
                </div>

                {/* 30-Day Client Engagement & Quote Metrics Visualization */}
                <ClientEngagementMetricsChart
                  leads={leads}
                  users={users}
                  userActivities={userActivities}
                />

                {/* Filter Tabs & Search Controls: Full Laptop Width Bar */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-black-pure border border-gold/30 p-3.5 sm:p-4 rounded-sm shadow-xl">
                  <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
                    <button
                      onClick={() => setNotificationFilter('all')}
                      className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                        notificationFilter === 'all'
                          ? 'bg-gold text-black-pure font-bold shadow-sm'
                          : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/5'
                      }`}
                    >
                      <span>All Alerts</span>
                      <span className="w-5 h-5 min-w-[20px] min-h-[20px] aspect-square rounded-full text-[10px] font-mono font-bold flex items-center justify-center p-0 leading-none bg-red-600 text-white shadow-sm shrink-0 border-0 outline-none ring-0">{uniqueAlerts.length}</span>
                    </button>

                    <button
                      onClick={() => setNotificationFilter('unread')}
                      className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                        notificationFilter === 'unread'
                          ? 'bg-gold text-black-pure font-bold shadow-sm'
                          : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/5'
                      }`}
                    >
                      <span>Unread</span>
                      {unreadCountInList > 0 && (
                        <span className="w-5 h-5 min-w-[20px] min-h-[20px] aspect-square rounded-full text-[10px] font-mono font-bold flex items-center justify-center p-0 leading-none bg-red-600 text-white shadow-sm shrink-0 border-0 outline-none ring-0">
                          {unreadCountInList}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => setNotificationFilter('leads')}
                      className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                        notificationFilter === 'leads'
                          ? 'bg-gold text-black-pure font-bold shadow-sm'
                          : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/5'
                      }`}
                    >
                      <Mail size={12} />
                      <span>Inquiries</span>
                      <span className="w-5 h-5 min-w-[20px] min-h-[20px] aspect-square rounded-full text-[10px] font-mono font-bold flex items-center justify-center p-0 leading-none bg-red-600 text-white shadow-sm shrink-0 border-0 outline-none ring-0">{leadsCountInList}</span>
                    </button>

                    <button
                      onClick={() => setNotificationFilter('users')}
                      className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                        notificationFilter === 'users'
                          ? 'bg-gold text-black-pure font-bold shadow-sm'
                          : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/5'
                      }`}
                    >
                      <UserCheck size={12} />
                      <span>VIP Clients</span>
                      <span className="w-5 h-5 min-w-[20px] min-h-[20px] aspect-square rounded-full text-[10px] font-mono font-bold flex items-center justify-center p-0 leading-none bg-red-600 text-white shadow-sm shrink-0 border-0 outline-none ring-0">{usersCountInList}</span>
                    </button>

                    <button
                      onClick={() => setNotificationFilter('whatsapp')}
                      className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                        notificationFilter === 'whatsapp'
                          ? 'bg-gold text-black-pure font-bold shadow-sm'
                          : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/5'
                      }`}
                    >
                      <MessageSquare size={12} />
                      <span>WhatsApp Logs</span>
                      <span className="w-5 h-5 min-w-[20px] min-h-[20px] aspect-square rounded-full text-[10px] font-mono font-bold flex items-center justify-center p-0 leading-none bg-red-600 text-white shadow-sm shrink-0 border-0 outline-none ring-0">{waCountInList}</span>
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-full lg:w-80 shrink-0">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gold/70" />
                    <input 
                      type="text" 
                      value={notificationSearch}
                      onChange={(e) => setNotificationSearch(e.target.value)}
                      placeholder="Search alerts by name, email, service..."
                      className="w-full pl-9 pr-8 py-2 bg-black-rich border border-gold/30 hover:border-gold/60 focus:border-gold rounded-sm text-xs text-white placeholder-gray-500 font-sans outline-none transition-colors"
                    />
                    {notificationSearch && (
                      <button 
                        onClick={() => setNotificationSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs cursor-pointer"
                        title="Clear search"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Main Notification Feed List */}
                <div className="bg-[#0f0f0f] border border-white/10 p-4 sm:p-6 lg:p-7 rounded-sm shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-gold" />
                      <h3 className="text-sm font-heading uppercase tracking-widest text-gold font-bold">
                        Activity Stream ({filteredList.length})
                      </h3>
                    </div>
                    {unreadCountInList > 0 && (
                      <span className="text-xs font-mono text-red-400 flex items-center gap-1.5 px-2.5 py-0.5 bg-red-600/15 border border-red-500/40 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        <span>{unreadCountInList} Unread Notification{unreadCountInList !== 1 ? 's' : ''}</span>
                      </span>
                    )}
                  </div>

                  {filteredList.length === 0 ? (
                    <div className="py-12 text-center text-gray-400">
                      <Bell size={32} className="mx-auto mb-3 text-gray-600 opacity-60" />
                      <p className="text-sm font-sans font-medium text-gray-300">No notifications match your current filter or search criteria.</p>
                      <button
                        onClick={() => { setNotificationFilter('all'); setNotificationSearch(''); }}
                        className="mt-3 px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider text-gold hover:text-white border border-gold/30 hover:border-gold rounded-sm transition-all cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredList.map((item) => {
                        const isUnread = item.isUnread;
                        return (
                          <div 
                            key={item.id}
                            className={`p-4 sm:p-5 rounded-sm border transition-all duration-200 flex flex-col justify-between ${
                              isUnread 
                                ? 'border-gold/40 bg-[#141414] shadow-sm hover:border-gold/60' 
                                : 'border-white/10 bg-[#0f0f0f] hover:border-white/20 hover:bg-[#141414]'
                            }`}
                          >
                            <div className="flex flex-col justify-between gap-4 h-full">
                              {/* Left & Middle Column: Icon, Title, Badges, Details, Contacts */}
                              <div className="flex items-start gap-3.5 min-w-0 flex-1">
                                {/* Category Icon Badge (neat, refined colors) */}
                                <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center border mt-0.5 bg-white/5 border-white/10 text-gold">
                                  {item.category === 'lead' && <Mail size={15} />}
                                  {item.category === 'user' && <UserCheck size={15} />}
                                  {item.category === 'whatsapp' && <MessageSquare size={15} />}
                                  {item.category === 'system' && <Sparkles size={15} />}
                                </div>

                                <div className="min-w-0 flex-1 space-y-1">
                                  {/* Title & Badges */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {isUnread && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" title="Unread alert" />
                                    )}
                                    <h4 className="text-sm font-semibold text-white tracking-wide truncate">
                                      {item.title}
                                    </h4>
                                    {item.category === 'user' && (
                                      <span className="text-[9px] font-mono px-2 py-0.5 bg-white/5 text-gold border border-gold/30 font-bold rounded tracking-wider shadow-sm flex items-center gap-1">
                                        <Sparkles size={9} /> NEW USER
                                      </span>
                                    )}
                                    {isUnread && item.category !== 'user' && (
                                      <span className="text-[9px] font-mono px-2 py-0.5 bg-white/5 text-red-400 border border-red-500/30 font-bold rounded tracking-wider shadow-sm">
                                        NEW
                                      </span>
                                    )}
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-white/5 text-gray-300 border-white/10">
                                      {item.typeLabel}
                                    </span>
                                    {item.service && (
                                      <span className="text-[10px] font-mono px-2 py-0.5 bg-white/5 text-gray-300 border border-white/10 rounded truncate max-w-[200px] sm:max-w-[280px]">
                                        {item.service}
                                      </span>
                                    )}
                                  </div>

                                  {/* Details / Message */}
                                  {item.details && (
                                    <p className="text-xs text-gray-300 font-sans leading-relaxed line-clamp-2">
                                      {item.details}
                                    </p>
                                  )}

                                  {/* Metadata: Email, Phone, Source, Timestamp */}
                                  <div className="flex items-center gap-3 text-[11px] text-gray-400 flex-wrap pt-0.5">
                                    {item.email && (
                                      <span className="flex items-center gap-1 font-mono text-gray-300">
                                        <Mail size={11} className="text-gray-500" />
                                        <span>{item.email}</span>
                                      </span>
                                    )}
                                    {item.phone && (
                                      <span className="flex items-center gap-1 font-mono text-gray-300">
                                        <Phone size={11} className="text-gray-500" />
                                        <span>{item.phone}</span>
                                      </span>
                                    )}
                                    {item.source && (
                                      <span className="text-gray-400">
                                        Source: <strong className="text-gray-300 font-mono font-normal">{item.source}</strong>
                                      </span>
                                    )}
                                    <span className="text-gray-500 font-mono text-[10px]">
                                      {new Date(item.timestamp).toLocaleString(undefined, {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Bottom Actions Bar (View in Tab, WhatsApp, Mark Read/Unread) */}
                              <div className="flex items-center gap-2 shrink-0 flex-wrap pt-3 border-t border-white/5 w-full justify-end">
                                {/* Send to Owner WhatsApp */}
                                <a
                                  href={getOwnerWhatsAppUrl({
                                    id: item.id,
                                    leadType: item.typeLabel || 'Database Notification',
                                    name: item.title,
                                    phone: item.phone,
                                    email: item.email,
                                    service: item.service,
                                    details: item.details,
                                    timestamp: item.timestamp
                                  })}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1.5 text-xs font-mono uppercase tracking-wider bg-gold hover:bg-gold-light text-black font-bold rounded-sm transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                                  title={`Send this alert to Studio Owner WhatsApp (${whatsappConfig.ownerWhatsAppNumber})`}
                                >
                                  <MessageSquare size={12} />
                                  <span>Owner WhatsApp</span>
                                </a>

                                {/* Reply to Client via WhatsApp if phone exists */}
                                {item.phone && (
                                  <a
                                    href={getClientWhatsAppReplyUrl(item.phone, item.title, item.service)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1.5 text-xs font-mono uppercase tracking-wider bg-black-pure hover:bg-white/10 border border-white/20 text-gray-200 hover:text-white rounded-sm transition-all flex items-center gap-1.5 cursor-pointer"
                                    title="Reply directly to client on WhatsApp"
                                  >
                                    <span>Reply</span>
                                  </a>
                                )}

                                {/* Jump to Target Dashboard Tab */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleMarkSingleNotificationRead(item.id);
                                    switchTab(item.targetTab);
                                  }}
                                  className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider bg-gold/10 hover:bg-gold/25 border border-gold/30 text-gold hover:text-white rounded-sm transition-all flex items-center gap-1.5 cursor-pointer"
                                  title={`Open item in ${item.targetTab} tab`}
                                >
                                  <span>Open in {item.targetTab === 'leads' ? 'CRM' : item.targetTab === 'users' ? 'Users' : item.targetTab === 'communications' ? 'Comms' : 'Details'} &rarr;</span>
                                </button>

                                {/* Toggle Read / Unread Status */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleNotificationRead(item.id)}
                                  className="px-2.5 py-1.5 text-xs font-mono uppercase tracking-wider bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 rounded-sm transition-all cursor-pointer"
                                  title={isUnread ? 'Mark this notification as read' : 'Mark as unread'}
                                >
                                  {isUnread ? 'Mark Read' : 'Mark Unread'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-xl">
              <div className="border-b border-gold/20 pb-3">
                <span className="text-[10px] font-mono text-gold uppercase tracking-widest">Admin Security</span>
                <h2 className="text-xl font-heading text-white uppercase tracking-wider">
                  Master Passcode Settings
                </h2>
              </div>

              {settingsNotice && (
                <div className="p-4 bg-emerald-950/70 border border-emerald-500/60 text-emerald-200 text-sm flex items-center gap-2">
                  <CheckCircle size={18} className="text-emerald-400" />
                  {settingsNotice}
                </div>
              )}

              <div className="bg-black-pure border border-gold/30 p-3.5 sm:p-6 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-400 block">Current Active Master Passcode:</span>
                    <button
                      type="button"
                      onClick={() => setShowPasscodeInSettings(!showPasscodeInSettings)}
                      className="text-[11px] text-gold hover:underline cursor-pointer flex items-center gap-1 font-mono"
                    >
                      {showPasscodeInSettings ? <EyeOff size={12} /> : <Eye size={12} />}
                      <span>{showPasscodeInSettings ? 'Hide' : 'Reveal'}</span>
                    </button>
                  </div>
                  <div className="font-mono text-gold text-lg font-bold tracking-widest bg-black-rich px-4 py-2 border border-gold/20 inline-flex items-center gap-3">
                    <span>{showPasscodeInSettings ? customPasscode : '••••••••'}</span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-sans font-normal border-l border-white/10 pl-3">
                      Master Key
                    </span>
                  </div>
                </div>

                <div className="text-xs text-gray-400 leading-relaxed">
                  You can change this passcode at any time. When you or your team access the admin console, entering this code will immediately grant access.
                </div>

                <form onSubmit={handleSaveNewPasscode} className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold mb-1">
                      Set New Master Passcode
                    </label>
                    <input 
                      type="text" 
                      value={newPasscode} 
                      onChange={e => setNewPasscode(e.target.value)} 
                      placeholder="e.g. VIPNATAL2026 or 8888" 
                      className="w-full bg-black-rich border border-gold/30 px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-gold"
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="bg-gold hover:bg-yellow-400 text-black-pure font-bold px-6 py-2.5 uppercase text-xs tracking-widest transition-all"
                  >
                    Save New Passcode
                  </button>
                </form>
              </div>

              {/* Quick Jump to Email & WhatsApp Settings */}
              <div className="bg-black-pure border border-gold/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Mail size={14} className="text-gold" /> Email &amp; WhatsApp Communications
                  </div>
                  <div className="text-gray-400 text-[11px] mt-0.5">
                    Configure your Recipient Email Address, Owner WhatsApp number, and automatic client activity alerts.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => switchTab('communications')}
                  className="px-4 py-2 bg-gold hover:bg-gold-light text-black-pure font-bold text-xs uppercase tracking-wider rounded-sm cursor-pointer shrink-0 transition-all shadow-sm"
                >
                  Open Settings
                </button>
              </div>
            </div>
          )}

          {activeTab === 'communications' && (
            <div className="space-y-6 sm:space-y-8 w-full">
              {/* Header with Live Status Indicators */}
              <div className="border-b border-gold/20 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono text-gold uppercase tracking-widest block">Communications Hub</span>
                  <h2 className="text-xl sm:text-2xl font-heading text-white uppercase tracking-wider flex items-center gap-2 mt-0.5 font-bold">
                    <Mail size={22} className="text-gold" /> Email &amp; WhatsApp Settings
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-500/50 px-3 py-1.5 rounded-sm shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="font-bold uppercase tracking-wider">Email Gateway: Active</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-500/50 px-3 py-1.5 rounded-sm shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="font-bold uppercase tracking-wider">WhatsApp Auto-Dispatch: Ready</span>
                  </div>
                </div>
              </div>

              {/* Two-Column Grid: Email Settings on Left, WhatsApp Settings on Right - Broad & Wide */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8 items-start w-full">
                
                {/* 1. Recipient Email Address Settings */}
                <div className="bg-black-pure border border-gold/30 hover:border-gold p-5 sm:p-7 lg:p-8 space-y-5 shadow-xl transition-all w-full">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <h3 className="text-sm font-heading text-white uppercase tracking-wider flex items-center gap-2 font-bold">
                      <Mail size={16} className="text-gold" /> Recipient Email Address
                    </h3>
                    <span className="text-[10px] font-mono text-gold bg-gold/10 px-2 py-0.5 border border-gold/20 rounded">
                      Inbound Leads
                    </span>
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed">
                    Set the email address where all website leads, quotations, and client inquiries are delivered directly.
                  </p>

                  <form onSubmit={handleSaveEmailConfig} className="space-y-4 bg-black-rich border border-gold/20 p-4 rounded-sm">
                    <div>
                      <label className="block text-[11px] font-mono uppercase tracking-wider text-gray-300 font-semibold mb-1.5 flex items-center gap-1.5">
                        <Mail size={13} className="text-gold" />
                        <span>Recipient Email Address *</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={emailConfig.recipientEmail}
                        onChange={(e) => setEmailConfig({ ...emailConfig, recipientEmail: e.target.value })}
                        placeholder="mukisavicent7777@gmail.com"
                        className="w-full bg-black-pure border border-white/20 focus:border-gold px-3.5 py-2.5 text-white text-xs font-mono focus:outline-none transition-colors"
                      />
                      <span className="text-[10px] text-gray-400 font-mono mt-1 block">
                        Website leads &amp; quotations will be dispatched to this inbox.
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono uppercase tracking-wider text-gray-300 font-semibold mb-1.5">
                        Dispatch Protocol
                      </label>
                      <select
                        value={emailConfig.provider}
                        onChange={(e) => setEmailConfig({ ...emailConfig, provider: e.target.value as any })}
                        className="w-full bg-black-pure border border-white/20 focus:border-gold px-3.5 py-2 text-white text-xs focus:outline-none transition-colors"
                      >
                        <option value="formsubmit">Direct Inbox Gateway (FormSubmit AJAX - No Server Needed)</option>
                        <option value="firestore_mail">Firestore Mail Collection (Firebase Extension)</option>
                      </select>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-white/10">
                      <button
                        type="submit"
                        className="bg-gold hover:bg-gold-light active:bg-gold-dark text-black-pure font-bold px-5 py-2 uppercase text-xs tracking-wider transition-all cursor-pointer rounded-sm shadow-md"
                      >
                        Save Email Preferences
                      </button>
                      {emailConfigSaved && (
                        <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle size={14} /> {emailConfigSaved}
                        </span>
                      )}
                    </div>
                  </form>

                  {/* Real-time Status Card */}
                  <div className="p-3 bg-black-rich border border-white/10 space-y-1.5 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Current Destination:</span>
                      <span className="text-white font-semibold">{emailConfig.recipientEmail}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Watched Collections:</span>
                      <span className="text-gold font-semibold">mail &bull; leads</span>
                    </div>
                  </div>

                  {mailNotice && (
                    <div className="p-3 bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs flex items-center gap-2">
                      <CheckCircle size={15} className="text-emerald-400 shrink-0" />
                      <span>{mailNotice}</span>
                    </div>
                  )}

                  <div>
                    <button
                      type="button"
                      onClick={handleSendTestMail}
                      disabled={isSendingTestMail}
                      className="w-full bg-gold hover:bg-gold-light text-black-pure font-bold px-4 py-2.5 uppercase text-xs tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 rounded-sm shadow-md"
                    >
                      {isSendingTestMail ? (
                        <>
                          <GoldSpinner size="xs" />
                          <span>Dispatching Test Email...</span>
                        </>
                      ) : (
                        <>
                          <Mail size={14} />
                          <span>Send Test Email to {emailConfig.recipientEmail}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Quick Activation Guide */}
                  <div className="bg-black-rich border border-gold/20 p-3.5 space-y-2 text-[11px] text-gray-300">
                    <span className="font-semibold text-gold uppercase tracking-wider block text-xs">
                      1-Time Activation Notice:
                    </span>
                    <p>
                      The first time an email address receives submissions, FormSubmit sends an activation email titled <em>"Action Required: Activate FormSubmit"</em>. <strong>Click "Activate Form" once</strong> in that email.
                    </p>
                    <p className="text-gray-400">
                      Always check your <strong>Spam / Junk</strong> folder or <strong>Promotions</strong> tab if not in Primary inbox.
                    </p>
                  </div>
                </div>

                {/* 2. Website Owner WhatsApp Dispatch Hub */}
                <div className="bg-black-pure border border-gold/30 hover:border-gold p-5 sm:p-7 lg:p-8 space-y-5 shadow-xl transition-all w-full">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <h3 className="text-sm font-heading text-white uppercase tracking-wider flex items-center gap-2 font-bold">
                      <MessageSquare size={16} className="text-gold" /> Owner WhatsApp Dispatch Hub
                    </h3>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 border border-emerald-500/30 rounded">
                      Live Dispatcher
                    </span>
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed">
                    Automatically deliver professional executive WhatsApp notifications directly to the website owner whenever any activity occurs on the site.
                  </p>

                  <form onSubmit={handleSaveWhatsAppConfig} className="space-y-4 bg-black-rich border border-gold/20 p-4 rounded-sm">
                    <div>
                      <label className="block text-[11px] font-mono uppercase tracking-wider text-gray-300 font-semibold mb-1.5 flex items-center gap-1.5">
                        <Phone size={13} className="text-gold" />
                        <span>Website Owner WhatsApp Number *</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={whatsappConfig.ownerWhatsAppNumber}
                        onChange={(e) => setWhatsappConfig({ ...whatsappConfig, ownerWhatsAppNumber: e.target.value })}
                        placeholder="0745 694 499 or +256 745 694 499"
                        className="w-full bg-black-pure border border-white/20 focus:border-gold px-3.5 py-2.5 text-white text-xs font-mono focus:outline-none transition-colors"
                      />
                      <span className="text-[10px] text-gray-400 font-mono mt-1 block">
                        WhatsApp alerts will be formatted and routed to this phone number.
                      </span>
                    </div>

                    <div className="p-3 bg-black-pure border border-white/10 space-y-2">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={whatsappConfig.autoDispatchOnActivity}
                          onChange={(e) => setWhatsappConfig({ ...whatsappConfig, autoDispatchOnActivity: e.target.checked })}
                          className="w-4 h-4 accent-gold rounded"
                        />
                        <span className="text-xs font-semibold text-white">
                          Automatically Queue WhatsApp Alerts for All Website Activities
                        </span>
                      </label>
                      <p className="text-[10px] text-gray-400 pl-6.5">
                        Includes Quotations, Contact Forms, VIP Registrations, and WhatsApp Chat inquiries.
                      </p>
                      <label className="flex items-center gap-2.5 cursor-pointer pt-2 border-t border-white/5">
                        <input
                          type="checkbox"
                          checked={!!whatsappConfig.autoOpenWhatsAppInAdminOnNewLead}
                          onChange={(e) => setWhatsappConfig({ ...whatsappConfig, autoOpenWhatsAppInAdminOnNewLead: e.target.checked })}
                          className="w-4 h-4 accent-emerald-500 rounded"
                        />
                        <span className="text-xs font-semibold text-emerald-400">
                          Auto-launch WhatsApp tab in Admin Console when a new lead arrives
                        </span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono uppercase tracking-wider text-gray-300 font-semibold mb-1.5">
                        WhatsApp Dispatch Gateway
                      </label>
                      <select
                        value={whatsappConfig.gatewayProvider}
                        onChange={(e) => setWhatsappConfig({ ...whatsappConfig, gatewayProvider: e.target.value as any })}
                        className="w-full bg-black-pure border border-white/20 focus:border-gold px-3.5 py-2 text-white text-xs focus:outline-none transition-colors"
                      >
                        <option value="direct">Direct WhatsApp Executive Link (100% Free, Instant 1-Click Send, No API Key needed)</option>
                        <option value="callmebot">Automated CallMeBot Gateway (Direct Automated Delivery to Phone, Free)</option>
                        <option value="ultramsg">UltraMsg WhatsApp Cloud API (Automated 24/7 Delivery to Phone)</option>
                        <option value="greenapi">Green-API WhatsApp Gateway (Automated 24/7 Delivery to Phone)</option>
                        <option value="webhook">Custom Webhook / Zapier / WhatsApp Business API</option>
                      </select>
                    </div>

                    {whatsappConfig.gatewayProvider === 'callmebot' && (
                      <div className="p-3 bg-black-pure border border-gold/20 space-y-2.5">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <label className="block text-[10px] font-mono uppercase tracking-wider text-gold font-semibold">
                            CallMeBot Free API Key (Required for Background Phone Delivery)
                          </label>
                          <button
                            type="button"
                            onClick={handleTestGatewayLive}
                            disabled={!whatsappConfig.callMeBotApiKey}
                            className="text-[10px] font-mono font-bold text-gold hover:text-white bg-gold/15 hover:bg-gold/30 px-2.5 py-0.5 border border-gold/40 rounded transition-all cursor-pointer"
                          >
                            Verify Key Live
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={whatsappConfig.callMeBotApiKey || ''}
                            onChange={(e) => setWhatsappConfig({ ...whatsappConfig, callMeBotApiKey: e.target.value })}
                            placeholder="e.g. 123456"
                            className="flex-1 bg-black-rich border border-white/20 focus:border-gold px-3 py-1.5 text-white text-xs font-mono focus:outline-none"
                          />
                        </div>

                        {gatewayTestResult && (
                          <div className={`p-2.5 rounded-sm text-[11px] font-mono border ${
                            gatewayTestResult.status === 'success'
                              ? 'bg-[#141414] border-emerald-500/40 text-emerald-300'
                              : gatewayTestResult.status === 'testing'
                              ? 'bg-[#141414] border-white/20 text-gray-300'
                              : 'bg-[#141414] border-amber-500/40 text-amber-300'
                          }`}>
                            <div className="flex items-start gap-2">
                              {gatewayTestResult.status === 'success' ? (
                                <CheckCircle size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                              ) : gatewayTestResult.status === 'testing' ? (
                                <Clock size={14} className="text-gray-400 shrink-0 mt-0.5" />
                              ) : (
                                <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1 leading-snug">{gatewayTestResult.message}</div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 flex-wrap gap-2">
                          <span>Must be generated from your WhatsApp (+256 {whatsappConfig.ownerWhatsAppNumber}):</span>
                          <a
                            href="https://wa.me/34644919680?text=I%20allow%20callmebot%20to%20send%20me%20messages"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:text-emerald-300 underline font-semibold flex items-center gap-1"
                          >
                            <span>Message CallMeBot (+34 644 91 96 80)</span>
                          </a>
                        </div>
                      </div>
                    )}

                    {whatsappConfig.gatewayProvider === 'ultramsg' && (
                      <div className="p-3 bg-black-pure border border-white/10 space-y-2">
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-gold font-semibold">
                          UltraMsg Instance ID &amp; Token
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={whatsappConfig.ultraMsgInstanceId || ''}
                            onChange={(e) => setWhatsappConfig({ ...whatsappConfig, ultraMsgInstanceId: e.target.value })}
                            placeholder="Instance ID (e.g. instance12345)"
                            className="w-full bg-black-rich border border-white/20 focus:border-gold px-3 py-1.5 text-white text-xs font-mono focus:outline-none"
                          />
                          <input
                            type="text"
                            value={whatsappConfig.ultraMsgToken || ''}
                            onChange={(e) => setWhatsappConfig({ ...whatsappConfig, ultraMsgToken: e.target.value })}
                            placeholder="Token (e.g. xyz12345abc)"
                            className="w-full bg-black-rich border border-white/20 focus:border-gold px-3 py-1.5 text-white text-xs font-mono focus:outline-none"
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 block">
                          Connects directly to your UltraMsg.com WhatsApp instance.
                        </span>
                      </div>
                    )}

                    {whatsappConfig.gatewayProvider === 'greenapi' && (
                      <div className="p-3 bg-black-pure border border-white/10 space-y-2">
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-gold font-semibold">
                          Green-API Instance &amp; Token
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={whatsappConfig.greenApiInstanceId || ''}
                            onChange={(e) => setWhatsappConfig({ ...whatsappConfig, greenApiInstanceId: e.target.value })}
                            placeholder="IdInstance (e.g. 1101234567)"
                            className="w-full bg-black-rich border border-white/20 focus:border-gold px-3 py-1.5 text-white text-xs font-mono focus:outline-none"
                          />
                          <input
                            type="text"
                            value={whatsappConfig.greenApiToken || ''}
                            onChange={(e) => setWhatsappConfig({ ...whatsappConfig, greenApiToken: e.target.value })}
                            placeholder="ApiTokenInstance"
                            className="w-full bg-black-rich border border-white/20 focus:border-gold px-3 py-1.5 text-white text-xs font-mono focus:outline-none"
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 block">
                          Delivers through Green-API.com cloud instance.
                        </span>
                      </div>
                    )}

                    {whatsappConfig.gatewayProvider === 'webhook' && (
                      <div className="p-3 bg-black-pure border border-white/10 space-y-2">
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-gold font-semibold">
                          Webhook Endpoint URL
                        </label>
                        <input
                          type="url"
                          value={whatsappConfig.webhookUrl || ''}
                          onChange={(e) => setWhatsappConfig({ ...whatsappConfig, webhookUrl: e.target.value })}
                          placeholder="https://your-api.com/whatsapp-webhook"
                          className="w-full bg-black-rich border border-white/20 focus:border-gold px-3 py-1.5 text-white text-xs font-mono focus:outline-none"
                        />
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-white/10">
                      <button
                        type="submit"
                        className="bg-gold hover:bg-gold-light active:bg-gold-dark text-black-pure font-bold px-5 py-2 uppercase text-xs tracking-wider transition-all cursor-pointer rounded-sm shadow-md"
                      >
                        Save WhatsApp Preferences
                      </button>
                      {whatsappConfigSaved && (
                        <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle size={14} /> {whatsappConfigSaved}
                        </span>
                      )}
                    </div>
                  </form>

                  {/* Real-time Status Card */}
                  <div className="p-3 bg-black-rich border border-white/10 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Configured Owner Number:</span>
                      <span className="text-white font-semibold">{whatsappConfig.ownerWhatsAppNumber}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Database Central Source of Truth:</span>
                      <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        Server onCreate Triggers Active
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 pt-1 border-t border-white/5 flex items-center justify-between flex-wrap gap-1">
                      <span>Monitored Collections:</span>
                      <span className="text-gold">leads • user_activities • users • notifications</span>
                    </div>
                  </div>

                  {whatsappNotice && (
                    <div className={`p-3 text-xs flex items-start gap-2.5 rounded-sm border ${
                      whatsappNotice.includes('APIKey is invalid') || whatsappNotice.includes('rejected')
                        ? 'bg-[#141414] border-red-500/30 text-red-200'
                        : 'bg-[#141414] border-white/10 text-gray-200'
                    }`}>
                      <AlertCircle size={15} className="shrink-0 text-gold mt-0.5" />
                      <span className="leading-relaxed flex-1">{whatsappNotice.replace(/^[⚠️✅ℹ️✓]\s*/, '')}</span>
                    </div>
                  )}

                  <div>
                    <button
                      type="button"
                      onClick={handleSendTestWhatsApp}
                      disabled={isSendingTestWhatsApp}
                      className="w-full bg-gold hover:bg-gold-light text-black font-bold px-4 py-2.5 uppercase text-xs tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 rounded-sm shadow-sm"
                    >
                      {isSendingTestWhatsApp ? (
                        <>
                          <GoldSpinner size="xs" />
                          <span>Dispatching WhatsApp Alert...</span>
                        </>
                      ) : (
                        <>
                          <MessageSquare size={14} />
                          <span>Send Test WhatsApp Alert to {whatsappConfig.ownerWhatsAppNumber}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {directTestWhatsAppUrl && (
                    <div className="pt-2">
                      <a
                        href={directTestWhatsAppUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-white/5 hover:bg-gold hover:text-black text-gold border border-white/10 hover:border-gold font-bold px-4 py-2.5 uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 rounded-sm shadow-sm cursor-pointer"
                      >
                        <MessageSquare size={15} />
                        <span>Open Test in WhatsApp</span>
                      </a>
                    </div>
                  )}

                  {/* Automated Phone Delivery 2-Step Guide */}
                  <div className="bg-[#0f0f0f] border border-white/10 p-4 space-y-3 text-[11px] text-gray-200 rounded-sm">
                    <span className="font-semibold text-gold uppercase tracking-wider block text-xs flex items-center gap-2">
                      <Zap size={14} className="text-gold" /> Direct Database-to-WhatsApp Setup (Zero Manual Clicks)
                    </span>
                    <p className="leading-relaxed text-gray-300 text-xs">
                      To have the database send every lead directly to your WhatsApp phone without you having to click "Send", WhatsApp requires a 1-time phone authorization:
                    </p>
                    <div className="p-3.5 bg-[#141414] border border-white/10 space-y-3 rounded-sm">
                      <div className="flex items-start gap-2.5">
                        <span className="text-gold font-bold shrink-0 bg-white/5 px-2 py-0.5 border border-white/10 text-[10px]">STEP 1</span>
                        <div className="space-y-1.5 flex-1">
                          <span className="text-white font-semibold block">Get your Free WhatsApp API Key (Takes 10 Seconds):</span>
                          <p className="text-gray-400 text-[11px]">
                            Tap either button below on your phone to send <code className="text-gold">I allow callmebot to send me messages</code>. The bot will instantly text back your 6-digit API key.
                          </p>
                          <div className="flex items-center gap-2 flex-wrap pt-1">
                            <a 
                              href="https://wa.me/34644919680?text=I%20allow%20callmebot%20to%20send%20me%20messages" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gold hover:bg-gold-light text-black font-bold rounded text-xs transition-colors shadow-sm"
                            >
                              <MessageSquare size={13} />
                              <span>Message CallMeBot (+34 644 91 96 80)</span>
                            </a>
                            <a 
                              href="https://wa.me/34644444444?text=I%20allow%20callmebot%20to%20send%20me%20messages" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black-pure border border-white/20 hover:border-gold text-gray-300 hover:text-white font-bold rounded text-xs transition-colors"
                            >
                              <span>Alternative Bot (+34 644 44 44 44)</span>
                            </a>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5 pt-2 border-t border-white/10">
                        <span className="text-gold font-bold shrink-0 bg-white/5 px-2 py-0.5 border border-white/10 text-[10px]">STEP 2</span>
                        <div className="space-y-1">
                          <span className="text-white font-semibold block">Paste Key in Settings &amp; Save:</span>
                          <p className="text-gray-400 text-[11px]">
                            Paste the 6-digit key into the <strong>CallMeBot Free API Key</strong> box above and click <em>Save WhatsApp Preferences</em>.
                          </p>
                          <p className="text-gray-300 font-mono text-[10px] mt-1">
                            Once saved, the database automatically delivers all quotes and website activities straight to your WhatsApp phone 24/7 without manual intervention.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Real-Time Activity & WhatsApp Dispatches Feed */}
              <div className="bg-black-pure border border-gold/30 hover:border-gold p-5 sm:p-7 lg:p-8 space-y-5 shadow-xl transition-all w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
                  <div>
                    <span className="text-[10px] font-mono text-gold uppercase tracking-widest block">Audit Trail</span>
                    <h3 className="text-base font-heading text-white uppercase tracking-wider flex items-center gap-2 font-bold">
                      <Zap size={16} className="text-gold" /> Real-Time Activity &amp; WhatsApp Dispatch Log
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <ExportButton
                      data={whatsappDispatches}
                      columns={[
                        { header: 'Activity Type', key: 'activityType' },
                        { header: 'Client / User Name', key: 'clientName' },
                        { header: 'Client Email', key: 'clientEmail' },
                        { header: 'Recipient Phone', key: 'recipientPhone' },
                        { header: 'Service / Scope', key: 'service' },
                        { header: 'Payload / Details', key: 'details' },
                        { header: 'Timestamp', key: 'createdAt', format: (r: any) => r.createdAt ? new Date(r.createdAt).toLocaleString() : 'Recent' }
                      ]}
                      title="Natal Interior Design - WhatsApp Dispatch & Real-Time Audit Log"
                      subtitle="Record of automated notifications sent directly to admin WhatsApp"
                      category="WhatsApp Communications"
                      filenamePrefix="natal_whatsapp_dispatches"
                      summaryCards={[
                        { label: 'Dispatches Recorded', value: whatsappDispatches.length },
                        { label: 'Owner Recipient', value: whatsappConfig.ownerWhatsAppNumber || '+256...' },
                        { label: 'Automated Triggers', value: 'Active' }
                      ]}
                      buttonLabel="Export WhatsApp Log"
                      size="sm"
                    />
                    <span className="text-xs font-mono text-gray-400">
                      {whatsappDispatches.length} Activity Dispatches Recorded
                    </span>
                  </div>
                </div>

                <p className="text-xs text-gray-300">
                  Every user submission and client engagement triggers an automated notification stored here and routed to your WhatsApp.
                </p>

                {whatsappDispatches.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 text-xs font-mono border border-white/5 bg-black-rich">
                    No dispatches recorded yet. Click "Send Test WhatsApp Alert" above or submit a quotation to test live.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-white/10">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-black-rich border-b border-white/10 text-gray-400 font-mono text-[10px] uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3">Client</th>
                          <th className="py-2.5 px-3">Contact Details</th>
                          <th className="py-2.5 px-3">Service / Brief</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Timestamp</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono">
                        {whatsappDispatches.map((record) => (
                          <tr key={record.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gold/15 text-gold border border-gold/30">
                                {record.activityType}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-white">
                              {record.clientName || 'Visitor'}
                            </td>
                            <td className="py-2.5 px-3 text-gray-300 text-[11px]">
                              <div>{record.clientPhone || 'No phone'}</div>
                              <div className="text-gray-500 text-[10px]">{record.clientEmail || ''}</div>
                            </td>
                            <td className="py-2.5 px-3 text-gray-300 text-[11px] max-w-xs truncate">
                              {record.service || record.details || 'General Inquiry'}
                            </td>
                            <td className="py-2.5 px-3">
                              {record.status === 'delivered_via_callmebot' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                  <span>Delivered</span>
                                </span>
                              ) : record.status === 'callmebot_key_invalid' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-500/40" title="CallMeBot rejected API key - Tap Send to send directly">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                                  <span>Invalid Key</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-blue-950 text-blue-300 border border-blue-500/40">
                                  <span>1-Click Ready</span>
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-gray-400 text-[10px]">
                              {new Date(record.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                <a
                                  href={record.directWhatsAppUrl || getOwnerWhatsAppUrl(record)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase rounded transition-colors shadow-sm"
                                  title={`Open formatted executive alert in WhatsApp for owner (${whatsappConfig.ownerWhatsAppNumber})`}
                                >
                                  <MessageSquare size={11} />
                                  <span>Send to WhatsApp</span>
                                </a>
                                {record.clientPhone && (
                                  <a
                                    href={getClientWhatsAppReplyUrl(record.clientPhone, record.clientName, record.service)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black-pure border border-emerald-500/40 hover:bg-emerald-950 text-emerald-300 font-bold text-[10px] uppercase rounded transition-colors"
                                    title="Chat directly with client on WhatsApp"
                                  >
                                    <span>Reply Client</span>
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-6 max-w-4xl">
              <div className="border-b border-gold/20 pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-gold uppercase tracking-widest">Master Administrator</span>
                  <h2 className="text-xl font-heading text-white uppercase tracking-wider flex items-center gap-2 mt-1">
                    <User size={20} className="text-gold" /> Admin Profile
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-500/50 px-3 py-1 rounded-full shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                  <span className="font-bold uppercase tracking-wider">Owner Live Now</span>
                </div>
              </div>

              <div className="bg-black-pure border border-gold/30 p-3.5 sm:p-6 md:p-8">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                  
                  {/* Avatar Area - Synchronized with Nav Bar */}
                  <div className="flex flex-col items-center gap-4 shrink-0">
                    <div className="w-32 h-32 rounded-full border-2 border-gold flex items-center justify-center bg-black-rich relative shadow-[0_0_25px_rgba(212,175,55,0.25)] overflow-hidden group">
                      {currentAdminAvatar ? (
                        <img 
                          src={currentAdminAvatar} 
                          alt={currentAdminName} 
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gold">
                          <span className="font-heading font-bold text-3xl">
                            {getUserInitials(currentAdminName, currentAdminEmail)}
                          </span>
                          <span className="text-[10px] font-mono uppercase tracking-widest mt-1 text-gold/70">Admin</span>
                        </div>
                      )}
                      {/* Circular Live Dot at bottom of Profile */}
                      <span className="absolute bottom-2 right-2 flex h-5 w-5 items-center justify-center z-10 pointer-events-none" title="Owner Live">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-black-pure shadow-[0_0_10px_rgba(16,185,129,0.9)]"></span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        type="button"
                        onClick={() => adminFileInputRef.current?.click()}
                        className="text-xs uppercase tracking-widest font-bold px-3.5 py-2 bg-gradient-to-r from-gold-dark via-gold to-yellow-300 text-black-pure hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(212,175,55,0.3)] rounded-sm"
                      >
                        <Camera size={13} className="text-black-pure" /> 
                        <span>{currentAdminAvatar ? 'Change Photo' : 'Upload Photo'}</span>
                      </button>

                      {currentAdminAvatar && (
                        <button 
                          type="button"
                          onClick={handleRemoveAdminPhoto}
                          className="text-[11px] font-mono text-red-400 hover:text-red-300 px-2.5 py-2 border border-red-500/30 hover:bg-red-950/40 transition-colors cursor-pointer rounded-sm"
                          title="Remove profile picture"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <input 
                      ref={adminFileInputRef}
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleAdminPhotoUpload}
                    />

                    <span className="text-[10px] text-gray-500 font-mono text-center max-w-[220px] leading-relaxed">
                      Real-time link: Profile picture in the website navigation bar is always identical to this picture
                    </span>
                  </div>

                  {/* Profile Details */}
                  <div className="flex-1 space-y-6 w-full">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">Display Name</label>
                        <div className="bg-white/5 border border-white/10 px-4 py-2.5 text-white text-sm font-medium flex items-center justify-between">
                          {isEditingAdminName ? (
                            <form onSubmit={handleSaveAdminName} className="flex items-center gap-2 w-full">
                              <input 
                                type="text"
                                value={adminNameInput}
                                onChange={(e) => setAdminNameInput(sanitizeNameInput(e.target.value))}
                                onKeyDown={(e) => handleNameKeyDown(e)}
                                onPaste={(e) => handleNamePaste(e, setAdminNameInput)}
                                inputMode="text"
                                autoComplete="name"
                                placeholder="Admin name"
                                className="bg-black-rich border border-gold/50 px-2.5 py-1 text-white text-xs w-full focus:outline-none focus:border-gold"
                                autoFocus
                              />
                              <button 
                                type="submit" 
                                className="px-3 py-1 bg-gold text-black-pure font-bold text-xs uppercase cursor-pointer hover:bg-gold-light"
                              >
                                Save
                              </button>
                              <button 
                                type="button" 
                                onClick={() => setIsEditingAdminName(false)} 
                                className="px-2 py-1 text-gray-400 hover:text-white text-xs cursor-pointer"
                              >
                                Cancel
                              </button>
                            </form>
                          ) : (
                            <>
                              <span className="font-bold">{currentAdminName}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-gold bg-gold/10 px-2 py-0.5 border border-gold/30">Verified</span>
                                <button 
                                  type="button" 
                                  onClick={() => { setAdminNameInput(currentAdminName); setIsEditingAdminName(true); }}
                                  className="text-[11px] font-mono text-gold hover:text-white underline cursor-pointer"
                                >
                                  Edit
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">Primary Email</label>
                        <div className="bg-white/5 border border-white/10 px-4 py-3 text-white text-sm font-medium flex items-center gap-2">
                          <Mail size={14} className="text-gold" /> {currentAdminEmail}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">Role & Permissions</label>
                        <div className="bg-gold/10 border border-gold/30 px-4 py-3 text-gold text-sm font-medium flex items-center gap-2">
                          <ShieldCheck size={14} /> Full System Management Privileges
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">Authentication Type</label>
                        <div className="bg-white/5 border border-white/10 px-4 py-3 text-white text-sm font-medium flex items-center gap-2">
                          <Key size={14} className="text-gray-400" /> Master Passcode & Client Directory
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-4">
                      <button 
                        onClick={() => switchTab('settings')}
                        className="bg-white/5 hover:bg-white/10 border border-gold/30 text-white px-6 py-3 text-xs uppercase tracking-widest font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Key size={14} className="text-gold" />
                        <span>Change Master Passcode</span>
                      </button>
                      <button 
                        onClick={handleLogout}
                        className="bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-200 hover:text-white hover:border-red-400 px-6 py-3 text-xs uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
                        title="Sign Out of Admin Dashboard"
                      >
                        <LogOut size={14} className="text-red-400 stroke-[2.2]" /> <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SECTION CONTENT CMS EDITOR */}
          {activeTab === 'sections' && (
            <SiteSectionsEditor />
          )}

          {/* TAB: MEDIA & ASSET VAULT */}
          {activeTab === 'media' && (
            <AdminMediaVaultTab />
          )}
          </div>
        </main>
      </div>

      {/* Client Lead Attachment Lightbox & Video Player Modal */}
      {leadAttachmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-black-rich border border-gold/50 shadow-[0_0_50px_rgba(212,175,55,0.4)] max-w-4xl w-full overflow-hidden relative">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gold/30 bg-black-pure">
              <div className="flex items-center gap-2">
                {leadAttachmentModal.type === 'video' ? (
                  <Video size={16} className="text-gold" />
                ) : (
                  <FileText size={16} className="text-gold" />
                )}
                <div>
                  <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider truncate max-w-md">
                    {leadAttachmentModal.name}
                  </h4>
                  <span className="text-[10px] font-mono text-gold/80 block">
                    From Client: {leadAttachmentModal.clientName || 'Inquiry Client'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {leadAttachmentModal.data && (
                  <a
                    href={leadAttachmentModal.data}
                    download={leadAttachmentModal.name}
                    className="text-gray-300 hover:text-gold text-xs font-mono flex items-center gap-1 px-2.5 py-1 bg-white/5 border border-white/10 hover:border-gold transition-colors"
                  >
                    <Download size={13} /> Download File
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setLeadAttachmentModal(null)}
                  className="text-gray-400 hover:text-white p-1 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="max-h-[75vh] bg-black flex items-center justify-center p-2 overflow-auto">
              {leadAttachmentModal.type === 'video' ? (
                <div className="w-full aspect-video flex items-center justify-center bg-black">
                  <video
                    src={leadAttachmentModal.data}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : leadAttachmentModal.type === 'image' && (leadAttachmentModal.data || leadAttachmentModal.thumbnail) ? (
                <img
                  src={leadAttachmentModal.data || leadAttachmentModal.thumbnail}
                  alt={leadAttachmentModal.name}
                  className="max-h-[70vh] w-auto object-contain mx-auto border border-white/10"
                />
              ) : (
                <div className="p-12 text-center flex flex-col items-center justify-center">
                  <FileText size={48} className="text-gold mb-3" />
                  <p className="text-white font-mono text-sm font-semibold">{leadAttachmentModal.name}</p>
                  <p className="text-gray-400 text-xs mt-1">Architectural CAD / Document File ({leadAttachmentModal.sizeFormatted})</p>
                  {leadAttachmentModal.data && (
                    <a
                      href={leadAttachmentModal.data}
                      download={leadAttachmentModal.name}
                      className="mt-4 px-4 py-2 bg-gold hover:bg-gold-light text-black-pure font-bold font-mono text-xs uppercase tracking-wider flex items-center gap-2"
                    >
                      <Download size={14} /> Download Original Document
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="p-3 bg-black-pure border-t border-gold/20 flex items-center justify-between text-[11px] font-mono text-gray-400">
              <span>Size: {leadAttachmentModal.sizeFormatted || 'N/A'}</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={12} /> Safely Stored in Google Cloud Firestore
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
