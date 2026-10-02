import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, addDoc, setDoc, serverTimestamp, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db, auth, databaseId, projectId } from '../firebase';
import { servicesData } from '../data';
import { 
  LogOut, Plus, Trash2, Home, Users, Image as ImageIcon, 
  Key, ShieldCheck, Upload, CheckCircle, RefreshCw, Eye, 
  Sparkles, ExternalLink, Calendar, Phone, Mail, FileText, Menu, X, Bell, User, SplitSquareHorizontal, ArrowLeft, ChevronDown,
  Briefcase, Edit3, Layers, Paintbrush, ArrowUp, ArrowRight, Check, Settings, AlertCircle, EyeOff, ChevronUp, RotateCcw, Sliders,
  Hammer, HardHat, Zap, Droplet, TreePine, Building2, UserCheck, UserPlus, Search, Download, Filter, MessageSquare, Copy, Camera,
  Lock, Unlock, HardDrive, Film, Video, FileUp, Play, Database, FileCode, FolderArchive, CheckCircle2
} from 'lucide-react';
import NatalLogo from './NatalLogo';
import { 
  syncUserRecord, AppUser, getAdminProfile, setAdminProfile, getUserInitials, 
  AdminProfileData, updateUserInDirectory, getActiveUserSession, setActiveUserSession, 
  clearActiveUserSession, recordUserActivity, storeUserCredential, verifyUserPassword, 
  getUserFromDirectory, ActiveUserSession, compressImageFile, captureVideoThumbnail,
  readFileAsDataUrl, saveMediaAssetToCloud, seedInitialDatabaseIfEmpty, MediaAsset, loadMediaAssetData,
  sanitizeForFirestore
} from '../utils';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import AdminUsersTab from './AdminUsersTab';
import SiteSectionsEditor from './SiteSectionsEditor';
import AdminMediaVaultTab from './AdminMediaVaultTab';

export type AdminTabType = 'projects' | 'services' | 'leads' | 'users' | 'testimonials' | 'transformations' | 'settings' | 'notifications' | 'profile' | 'sections' | 'media';

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
  const [mediaAssets, setMediaAssets] = useState<any[]>([]);
  const [leadAttachmentModal, setLeadAttachmentModal] = useState<any | null>(null);
  const [isSyncingDb, setIsSyncingDb] = useState(false);

  const [isEditingAdminName, setIsEditingAdminName] = useState(false);
  const [adminNameInput, setAdminNameInput] = useState('');

  const handleSaveAdminName = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!adminNameInput.trim()) return;
    const newName = adminNameInput.trim();
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

  // Project Form State
  const [title, setTitle] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  
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

    if (!emailClean) {
      setAdminAuthError('Please enter your administrator email address.');
      return;
    }

    // MANDATORY REQUIREMENT: Admin email must contain "admin"
    if (!emailClean.includes('admin')) {
      setAdminAuthError('Admin access denied: Your email address must contain the word "admin" (e.g. admin@nataldesign.com or name.admin@gmail.com).');
      return;
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

    // Auto-seed initial baseline catalog to Firestore if database is empty
    seedInitialDatabaseIfEmpty(false).catch(e => console.warn("Admin DB auto-seed check:", e));

    try {
      const qMedia = query(collection(db, 'media'), orderBy('createdAt', 'desc'));
      unsubMedia = onSnapshot(qMedia, (snapshot) => {
        const fbMedia: any[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
      const qServices = query(collection(db, 'services'), orderBy('createdAt', 'desc'));
      unsubServices = onSnapshot(qServices, (snapshot) => {
        const fbServices: any[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
      const qProjects = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
      unsubProjects = onSnapshot(qProjects, (snapshot) => {
        const fbProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
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

      // 1. Process users from Firestore
      fbUsersList.forEach(u => {
        const key = (u.email ? u.email.toLowerCase().trim() : '') || u.id || u.phone;
        if (key) {
          map.set(key, { 
            ...u,
            activities: Array.isArray(u.activities) ? [...u.activities] : []
          });
        }
      });

      // 2. Merge local storage registered users
      localUsers.forEach((lu: any) => {
        const key = (lu.email ? lu.email.toLowerCase().trim() : '') || lu.id || lu.phone;
        if (key) {
          if (!map.has(key)) {
            map.set(key, { 
              ...lu,
              activities: Array.isArray(lu.activities) ? [...lu.activities] : []
            });
          } else {
            const existing = map.get(key);
            const combinedActs = [...(lu.activities || []), ...(existing.activities || [])];
            const seenActs = new Set<string>();
            const uniqueActs: any[] = [];
            for (const act of combinedActs) {
              const actKey = act.id || `${act.type}_${act.timestamp}`;
              if (!seenActs.has(actKey)) {
                seenActs.add(actKey);
                uniqueActs.push(act);
              }
            }
            map.set(key, {
              ...lu,
              ...existing,
              phone: existing.phone || lu.phone,
              photoURL: lu.photoURL || existing.photoURL,
              service: existing.service || lu.service,
              details: existing.details || lu.details,
              activities: uniqueActs,
              activityCount: uniqueActs.length,
              lastActive: existing.lastActive || lu.lastActive
            });
          }
        }
      });

      // 3. Merge all quotation & contact leads (both from Firestore and local cache)
      const allLeads = [...extraFbLeads, ...localLeads];
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

      // 4. Merge standalone activities from user_activities (Firestore & local)
      const allActs = [...extraFbActs, ...localActivities];
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
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          activities: [{
            id: 'admin_init_act',
            type: 'registration',
            title: 'System Administrator Profile',
            description: 'Master Administrator with full system control and client management.',
            timestamp: new Date().toISOString()
          }],
          activityCount: 1
        });
      }

      return Array.from(map.values());
    };

    try {
      const qLeads = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
      unsubLeads = onSnapshot(qLeads, (snapshot) => {
        const fbLeads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        latestFbLeads = fbLeads;
        const localLeads = JSON.parse(localStorage.getItem('natal_local_leads') || '[]');
        const combined = [...fbLeads];
        localLeads.forEach((ll: any) => {
          if (!combined.some(cl => cl.id === ll.id)) {
            combined.unshift(ll);
          }
        });
        setLeads(deduplicateList(combined));
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
      const qTestimonials = query(collection(db, 'testimonials'), orderBy('createdAt', 'desc'));
      unsubTestimonials = onSnapshot(qTestimonials, (snapshot) => {
        const fbTestimonials = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const localTestimonials = JSON.parse(localStorage.getItem('natal_local_testimonials') || '[]');
        const combined = [...fbTestimonials];
        localTestimonials.forEach((lt: any) => {
          if (!combined.some(ct => ct.id === lt.id)) {
            combined.unshift(lt);
          }
        });
        setTestimonials(deduplicateList(combined));
      }, (err) => {
        console.warn("Firestore testimonials snapshot fallback to local:", err);
        const localTestimonials = JSON.parse(localStorage.getItem('natal_local_testimonials') || '[]');
        setTestimonials(deduplicateList(localTestimonials));
      });
    } catch (e) {
      console.warn("Firestore error:", e);
    }

    try {
      const qTransformations = query(collection(db, 'transformations'), orderBy('createdAt', 'desc'));
      unsubTransformations = onSnapshot(qTransformations, (snapshot) => {
        const fbTransformations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const localTransformations = JSON.parse(localStorage.getItem('natal_local_transformations') || '[]');
        const combined = [...fbTransformations];
        localTransformations.forEach((lt: any) => {
          if (!combined.some(ct => ct.id === lt.id)) {
            combined.unshift(lt);
          }
        });
        setTransformations(deduplicateList(combined));
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
      const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      unsubUsers = onSnapshot(qUsers, (snapshot) => {
        const fbUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
      const qActivities = query(collection(db, 'user_activities'), orderBy('createdAt', 'desc'));
      unsubActivities = onSnapshot(qActivities, (snapshot) => {
        const fbActivities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        latestFbActivities = fbActivities;
        setUsers(syncAndAggregateUsers(latestFbUsers, latestFbLeads, latestFbActivities));
      }, (err) => {
        console.warn("Firestore user_activities snapshot fallback:", err);
      });
    } catch (e) {
      console.warn("Firestore user_activities error:", e);
    }

    const handleCustomUserUpdate = () => {
      setUsers(syncAndAggregateUsers(latestFbUsers, latestFbLeads, latestFbActivities));
    };
    window.addEventListener('natal_users_updated', handleCustomUserUpdate);
    window.addEventListener('natal_activity_recorded', handleCustomUserUpdate);

    return () => {
      unsubProjects();
      unsubServices();
      unsubServicesSettings();
      unsubLeads();
      unsubUsers();
      unsubActivities();
      window.removeEventListener('natal_users_updated', handleCustomUserUpdate);
      window.removeEventListener('natal_activity_recorded', handleCustomUserUpdate);
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

  // Handle Add or Update Project
  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !desc || (!imageUrl && !imagePreview)) {
      alert("Please fill in the title, description, and provide an image.");
      return;
    }

    setIsUploading(true);
    const finalCategory = category === "Custom" ? (customCategory || "Interior Design") : category;
    const finalImage = imageUrl || imagePreview;

    const newProjItem = {
      title,
      category: finalCategory,
      desc,
      image: finalImage,
      tags: [finalCategory, "Natal Creation"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingProjectId) {
        // Update existing project
        if (!editingProjectId.startsWith('local_')) {
          try {
            await updateDoc(doc(db, 'projects', editingProjectId), sanitizeForFirestore({
              ...newProjItem,
              createdAt: serverTimestamp(),
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
        setEditingProjectId(null);
        setSuccessNotice('Creation updated successfully! It has been moved to the top of the homepage and gallery.');
      } else {
        // Save new project to Firestore
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

        // Save to LocalStorage backup
        const currentLocal = JSON.parse(localStorage.getItem('natal_local_projects') || '[]');
        const savedLocal = deduplicateList([{ id: 'local_' + Date.now(), ...newProjItem }, ...currentLocal]);
        localStorage.setItem('natal_local_projects', JSON.stringify(savedLocal));
        if (!isFbSuccess) {
          setProjects(savedLocal);
        }

        setSuccessNotice('Creation published successfully! It appears at the very top of the homepage and gallery.');
      }

      // Reset form
      setTitle('');
      setDesc('');
      setImageUrl('');
      setImagePreview('');
      setCustomCategory('');
      const savedDefault = localStorage.getItem('natal_default_creation_category') || defaultCategory || CATEGORY_OPTIONS[0];
      setCategory(savedDefault);
      setTimeout(() => setSuccessNotice(''), 4000);
    } catch (error: any) {
      alert('Error saving project: ' + error.message);
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
      alert("Please enter both a service title and description.");
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
      alert('Error saving service: ' + err.message);
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
    
    if (!tName || !tRole || !tContent) {
      alert("Please fill in the client name, role, and feedback content.");
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
      alert('Error saving testimonial: ' + error.message);
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
      alert("Please provide both a Before and an After image.");
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
      alert('Error saving transformation: ' + error.message);
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
      alert("Error updating transformation mode: " + err.message);
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
      alert("Error deleting transformation: " + e.message);
    }
  };

  // Handle Save New Passcode
  const handleSaveNewPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasscode.trim() || newPasscode.trim().length < 4) {
      alert("Passcode must be at least 4 characters long.");
      return;
    }
    localStorage.setItem('natal_custom_passcode', newPasscode.trim());
    setCustomPasscode(newPasscode.trim());
    setNewPasscode('');
    setSettingsNotice('New Master Passcode saved successfully!');
    setTimeout(() => setSettingsNotice(''), 4000);
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
      alert("Error deleting user: " + err.message);
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
      alert("Error creating user: " + err.message);
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
      alert("No users to export yet.");
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
                    <label className="block text-[11px] uppercase tracking-wider text-gray-300 font-semibold mb-1 flex items-center gap-1.5 font-mono">
                      <User size={13} className="text-gold" />
                      <span>Admin Full Name *</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={adminAuthName}
                      onChange={(e) => setAdminAuthName(e.target.value)}
                      placeholder="e.g. Master Administrator"
                      className="w-full bg-black-pure border border-white/20 focus:border-gold px-3.5 py-2.5 text-white text-xs sm:text-sm focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-gray-300 font-semibold mb-1 flex items-center gap-1.5 font-mono">
                      <Phone size={13} className="text-gold" />
                      <span>Phone / Contact Number (Optional)</span>
                    </label>
                    <input
                      type="tel"
                      value={adminAuthPhone}
                      onChange={(e) => setAdminAuthPhone(e.target.value)}
                      placeholder="+256 700 000 000"
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
                  <span>Authenticating...</span>
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
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-400 transition-colors text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/10 hover:border-red-500/40 cursor-pointer"
              title="Sign out of admin session"
            >
              <LogOut size={13} /> <span>Sign Out</span>
            </button>
            <button 
              type="button"
              onClick={onNavigateHome}
              className="text-gold hover:text-white transition-colors text-xs font-mono uppercase tracking-widest flex items-center gap-2 px-3 py-1.5 rounded border border-gold/30 hover:border-gold hover:bg-white/5 cursor-pointer"
            >
              <Home size={14} /> <span>Exit</span>
            </button>
          </div>
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
                  <span>Verifying Passcode...</span>
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
      <header className="h-[60px] sm:h-[72px] md:h-[78px] lg:h-[86px] xl:h-[90px] bg-black-pure/95 backdrop-blur-md border-b border-gold/30 px-4 sm:px-6 lg:px-10 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
          <NatalLogo className="h-7 sm:h-8 md:h-9 lg:h-10 xl:h-11 transition-all duration-300" variant="small" />

          <div className="hidden sm:flex items-center gap-2 border-l border-gold/30 pl-3 sm:pl-4 lg:pl-5">
            <span className="text-gold font-mono text-[9px] sm:text-[10px] md:text-xs lg:text-xs tracking-widest uppercase font-semibold">
              Owner Admin Console
            </span>
          </div>
        </div>

        {/* Right side Profile & Status */}
        <div className="flex items-center gap-2.5 sm:gap-4 lg:gap-5 ml-auto">
          {/* Cloud Firestore Live Status Badge */}
          <div 
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 bg-emerald-950/60 border border-emerald-500/50 rounded-full shadow-inner cursor-help"
            title={`Connected to Google Cloud Firebase Firestore\nProject: ${projectId || 'data-lightning-x6shk'}\nDatabase: ${databaseId || 'ai-studio-natalinteriordes'}\nSynced Collections: projects (${projects.length}), services (${services.length}), leads (${leads.length}), users (${users.length}), media (${mediaAssets.length})`}
          >
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
            <Database size={12} className="text-emerald-400 hidden sm:inline" />
            <span className="text-emerald-300 font-mono text-[9px] sm:text-[10px] lg:text-[11px] uppercase tracking-wider font-bold">
              Firestore Live
            </span>
          </div>

          {/* Sync Database Button */}
          <button
            type="button"
            onClick={async () => {
              setIsSyncingDb(true);
              try {
                const res = await seedInitialDatabaseIfEmpty(false);
                setSuccessNotice(`Firestore verified! Collections synced in real-time. Live Records: ${projects.length} Creations, ${services.length} Services, ${leads.length} Leads, ${users.length} Users, ${mediaAssets.length} Media Files.`);
                setTimeout(() => setSuccessNotice(''), 5000);
              } catch (e: any) {
                alert("Database verification: " + (e?.message || String(e)));
              } finally {
                setIsSyncingDb(false);
              }
            }}
            disabled={isSyncingDb}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-gold/10 hover:bg-gold/25 border border-gold/40 text-gold text-[10px] font-mono uppercase font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            title="Verify & synchronize all cloud database records"
          >
            <RefreshCw size={11} className={isSyncingDb ? 'animate-spin' : ''} />
            <span>{isSyncingDb ? 'Syncing...' : 'Sync DB'}</span>
          </button>

          {/* Notifications */}
          <button 
            type="button"
            onClick={() => switchTab('notifications')}
            className={`p-1.5 sm:p-2 transition-all relative rounded-sm flex items-center justify-center cursor-pointer ${
              activeTab === 'notifications' 
                ? 'text-gold bg-gold/20 border border-gold/50 shadow-[0_0_12px_rgba(212,175,55,0.4)] ring-1 ring-gold/40' 
                : 'text-gray-300 hover:text-gold hover:bg-white/10 border border-transparent'
            }`}
            title="System Notifications"
            aria-label="System Notifications"
          >
            <Bell size={20} className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] lg:w-[22px] lg:h-[22px] transition-transform hover:scale-110" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-black-pure animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
          </button>

          {/* Admin Profile */}
          <button 
            type="button"
            onClick={() => switchTab('profile')}
            className={`w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 rounded-full border flex items-center justify-center cursor-pointer transition-all relative overflow-hidden ${
              activeTab === 'profile' 
                ? 'bg-gold/25 border-gold text-gold shadow-[0_0_15px_rgba(212,175,55,0.5)] ring-2 ring-gold/50' 
                : 'bg-gold/10 border-gold/40 text-gold/80 hover:bg-gold/20 hover:border-gold hover:text-gold'
            }`}
            title={`${currentAdminName} Profile`}
            aria-label="Admin Profile"
          >
            {currentAdminAvatar ? (
              <img 
                src={currentAdminAvatar} 
                alt={currentAdminName} 
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-mono font-bold text-[10px] sm:text-xs text-gold">
                {getUserInitials(currentAdminName, currentAdminEmail)}
              </span>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-emerald-500 border-[1.5px] border-black-pure rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></span>
          </button>

          {/* Prominent Header Sign Out Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-sm border border-red-500/50 bg-red-950/40 hover:bg-red-900/60 hover:border-red-400 text-red-200 hover:text-white transition-all text-[11px] sm:text-xs font-mono uppercase tracking-wider font-bold shadow-sm cursor-pointer active:scale-95 ml-1"
            title="Sign Out of Admin Dashboard"
          >
            <LogOut size={14} className="text-red-400 shrink-0 stroke-[2.2]" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Body - Enhanced layout and spacing for laptop screens */}
      <div className="max-w-[1720px] mx-auto w-full px-4 sm:px-6 lg:px-10 py-5 sm:py-6 lg:py-6 flex-1 flex flex-col md:flex-row gap-5 sm:gap-6 lg:gap-8 relative">
        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed top-[60px] sm:top-[72px] md:top-[78px] lg:top-[86px] xl:top-[90px] inset-x-0 bottom-0 bg-black/80 z-[40] md:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar Navigation - Polished layout */}
        <aside className={`fixed md:sticky top-[60px] sm:top-[72px] md:top-[78px] lg:top-[86px] xl:top-[90px] left-0 h-[calc(100vh-60px)] sm:h-[calc(100vh-72px)] md:h-[calc(100vh-78px)] lg:h-[calc(100vh-86px)] xl:h-[calc(100vh-90px)] w-[270px] md:w-64 lg:w-72 xl:w-80 flex flex-col z-[50] md:z-10 transition-transform duration-300 ease-in-out md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} p-4 md:p-0 bg-black-pure/95 md:bg-transparent`}>
          {/* Arrow-only Back Home Button without any container - placed at the left between nav bar and side bar */}
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
              className="mb-4 p-3 bg-gradient-to-r from-gold/15 via-black-rich to-black-pure border border-gold/40 rounded-sm hover:border-gold transition-all cursor-pointer flex items-center gap-3 group shadow-md"
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
                <div className="text-xs font-bold text-white truncate font-heading group-hover:text-gold transition-colors">
                  {currentAdminName}
                </div>
                <div className="text-[10px] text-gray-400 truncate font-mono">
                  {currentAdminEmail}
                </div>
                <div className="text-[9px] text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 inline-block"></span>
                  <span>Administrator Active</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              {/* Content Management Group */}
              <div>
                <h4 className="text-[10px] font-mono text-gold/70 uppercase tracking-widest mb-2 px-1">Content Management</h4>
                <div className="flex flex-col gap-1.5">
                  <button 
                    onClick={() => switchTab('projects')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs uppercase tracking-widest font-bold transition-all text-left cursor-pointer ${
                      activeTab === 'projects' 
                        ? 'bg-gold/20 text-gold border border-gold shadow-[0_0_10px_rgba(212,175,55,0.2)]' 
                        : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <ImageIcon size={16} className={activeTab === 'projects' ? 'text-gold' : 'text-gray-400'} /> Creations
                  </button>

                  <button 
                    onClick={() => switchTab('services')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-xs uppercase tracking-widest font-bold transition-all text-left cursor-pointer ${
                      activeTab === 'services' 
                        ? 'bg-gold/20 text-gold border border-gold shadow-[0_0_10px_rgba(212,175,55,0.2)]' 
                        : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Briefcase size={16} className={activeTab === 'services' ? 'text-gold' : 'text-gray-400'} /> Our Services
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                      activeTab === 'services' ? 'bg-gold text-black-pure' : 'bg-gold/20 text-gold'
                    }`}>
                      {allCombinedServices.length}
                    </span>
                  </button>

                  <button 
                    onClick={() => switchTab('testimonials')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs uppercase tracking-widest font-bold transition-all text-left cursor-pointer ${
                      activeTab === 'testimonials' 
                        ? 'bg-gold/20 text-gold border border-gold shadow-[0_0_10px_rgba(212,175,55,0.2)]' 
                        : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <ShieldCheck size={16} className={activeTab === 'testimonials' ? 'text-gold' : 'text-gray-400'} /> Testimonials
                  </button>

                  <button 
                    onClick={() => switchTab('transformations')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs uppercase tracking-widest font-bold transition-all text-left cursor-pointer ${
                      activeTab === 'transformations' 
                        ? 'bg-gold/20 text-gold border border-gold shadow-[0_0_10px_rgba(212,175,55,0.2)]' 
                        : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <SplitSquareHorizontal size={16} className={activeTab === 'transformations' ? 'text-gold' : 'text-gray-400'} /> Before & After
                  </button>

                  <button 
                    onClick={() => switchTab('sections')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-xs uppercase tracking-widest font-bold transition-all text-left cursor-pointer ${
                      activeTab === 'sections' 
                        ? 'bg-gold/20 text-gold border border-gold shadow-[0_0_10px_rgba(212,175,55,0.2)]' 
                        : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Edit3 size={16} className={activeTab === 'sections' ? 'text-gold' : 'text-gray-400'} /> Brand Logo & Sections
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-gold/15 text-gold border border-gold/30">
                      Logo & Hero
                    </span>
                  </button>

                  <button 
                    onClick={() => switchTab('media')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-xs uppercase tracking-widest font-bold transition-all text-left cursor-pointer ${
                      activeTab === 'media' 
                        ? 'bg-gold/20 text-gold border border-gold shadow-[0_0_10px_rgba(212,175,55,0.2)]' 
                        : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FolderArchive size={16} className={activeTab === 'media' ? 'text-gold' : 'text-gray-400'} /> Media & Vault
                    </div>
                    {mediaAssets.length > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                        activeTab === 'media' ? 'bg-gold text-black-pure' : 'bg-gold/20 text-gold'
                      }`}>
                        {mediaAssets.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* CRM & Activity Group */}
              <div>
                <h4 className="text-[10px] font-mono text-gold/70 uppercase tracking-widest mb-2 px-1">CRM & Activity</h4>
                <div className="flex flex-col gap-1.5">
                  <button 
                    onClick={() => switchTab('leads')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-xs uppercase tracking-widest font-bold transition-all text-left cursor-pointer ${
                      activeTab === 'leads' 
                        ? 'bg-gold/20 text-gold border border-gold shadow-[0_0_10px_rgba(212,175,55,0.2)]' 
                        : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Users size={16} className={activeTab === 'leads' ? 'text-gold' : 'text-gray-400'} /> Leads
                    </div>
                    {leads.length > 0 && (
                      <span className="bg-gold text-black-pure text-[10px] px-1.5 py-0.5 rounded font-bold">
                        {leads.length}
                      </span>
                    )}
                  </button>

                  <button 
                    onClick={() => switchTab('users')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-xs uppercase tracking-widest font-bold transition-all text-left cursor-pointer ${
                      activeTab === 'users' 
                        ? 'bg-gold/20 text-gold border border-gold shadow-[0_0_10px_rgba(212,175,55,0.2)]' 
                        : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <UserCheck size={16} className={activeTab === 'users' ? 'text-gold' : 'text-gray-400'} /> Users
                    </div>
                    {users.length > 0 && (
                      <span className="bg-gold text-black-pure text-[10px] px-1.5 py-0.5 rounded font-bold">
                        {users.length}
                      </span>
                    )}
                  </button>

                  <button 
                    onClick={() => switchTab('notifications')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-xs uppercase tracking-widest font-bold transition-all text-left cursor-pointer ${
                      activeTab === 'notifications' 
                        ? 'bg-gold/20 text-gold border border-gold shadow-[0_0_10px_rgba(212,175,55,0.2)]' 
                        : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Bell size={16} className={activeTab === 'notifications' ? 'text-gold' : 'text-gray-400'} /> Notifications
                    </div>
                  </button>
                </div>
              </div>

              {/* System Settings Group */}
              <div>
                <h4 className="text-[10px] font-mono text-gold/70 uppercase tracking-widest mb-2 px-1">System</h4>
                <div className="flex flex-col gap-1.5">
                  <button 
                    onClick={() => switchTab('profile')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs uppercase tracking-widest font-bold transition-all text-left cursor-pointer ${
                      activeTab === 'profile' 
                        ? 'bg-gold/20 text-gold border border-gold shadow-[0_0_10px_rgba(212,175,55,0.2)]' 
                        : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <User size={16} className={activeTab === 'profile' ? 'text-gold' : 'text-gray-400'} /> Admin Profile
                  </button>

                  <button 
                    onClick={() => switchTab('settings')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs uppercase tracking-widest font-bold transition-all text-left cursor-pointer ${
                      activeTab === 'settings' 
                        ? 'bg-gold/20 text-gold border border-gold shadow-[0_0_10px_rgba(212,175,55,0.2)]' 
                        : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <Key size={16} className={activeTab === 'settings' ? 'text-gold' : 'text-gray-400'} /> Security
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-5 border-t border-gold/20 mt-auto mb-1">
              <button 
                onClick={handleLogout}
                className="w-full py-2.5 px-3 text-center text-xs text-red-200 border border-red-500/40 bg-red-950/40 hover:bg-red-900/60 hover:border-red-400 hover:text-white transition-all font-mono flex items-center justify-center gap-2 uppercase tracking-wider rounded-sm cursor-pointer font-bold shadow-sm active:scale-95"
                title="Sign Out of Administrator Account"
              >
                <LogOut size={15} className="text-red-400 stroke-[2.2]" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content View */}
        <main className="flex-1 min-w-0 pb-12 md:px-6 lg:px-8 xl:px-10 pt-4 md:pt-6 lg:pt-8">
          {/* Laptop Executive Status Bar (Appears on laptop screens) */}
          <div className="hidden lg:flex items-center justify-between mb-6 pb-4 border-b border-gold/20 bg-black-pure/60 p-4 border border-white/5 rounded-sm shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-gold animate-pulse"></div>
              <div>
                <div className="text-[10px] font-mono text-gold uppercase tracking-[0.2em] font-semibold">Workspace Management</div>
                <h1 className="text-base font-heading font-bold text-white uppercase tracking-wider">
                  {activeTab === 'projects' && 'Portfolio & Creations'}
                  {activeTab === 'services' && 'Capabilities & Services'}
                  {activeTab === 'leads' && 'Client Inquiries & CRM'}
                  {activeTab === 'users' && 'Client & User Directory'}
                  {activeTab === 'testimonials' && 'Testimonials & Reviews'}
                  {activeTab === 'transformations' && 'Before & After Transformations'}
                  {activeTab === 'sections' && 'Website Sections & Brand Editor'}
                  {activeTab === 'media' && 'Media & Asset Vault (Photos, CAD Plans & Videos)'}
                  {activeTab === 'notifications' && 'System Notifications'}
                  {activeTab === 'settings' && 'Master Passcode & Security'}
                  {activeTab === 'profile' && 'Administrator Profile'}
                </h1>
              </div>
            </div>

            {/* Laptop Quick Metric Chips */}
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 bg-black-rich border border-white/10 rounded text-[11px] font-mono flex items-center gap-1.5">
                <span className="text-gray-400">Creations:</span>
                <span className="text-gold font-bold">{projects.length}</span>
              </div>
              <div className="px-2.5 py-1 bg-black-rich border border-white/10 rounded text-[11px] font-mono flex items-center gap-1.5">
                <span className="text-gray-400">Leads:</span>
                <span className="text-emerald-400 font-bold">{leads.length}</span>
              </div>
              <div className="px-2.5 py-1 bg-black-rich border border-white/10 rounded text-[11px] font-mono flex items-center gap-1.5">
                <span className="text-gray-400">Users:</span>
                <span className="text-gold font-bold">{users.length}</span>
              </div>
              <div className="px-2.5 py-1 bg-black-rich border border-white/10 rounded text-[11px] font-mono flex items-center gap-1.5">
                <span className="text-gray-400">Vault:</span>
                <span className="text-gold font-bold">{mediaAssets.length}</span>
              </div>
            </div>
          </div>

          {/* Mobile & Tablet Bar: Back Home Arrow & Extended Hamburger Menu */}
          <div className="md:hidden flex items-center justify-between mb-8 border-b border-gold/20 pb-4 px-4 sm:px-6">
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
                className="text-gray-300 hover:text-gold transition-colors p-1 cursor-pointer ml-1"
                title="Open Admin Navigation Menu"
              >
                <Menu size={24} />
              </button>
            </div>

            <span className="text-gold font-mono text-[10px] uppercase tracking-widest px-3 py-1 bg-gold/10 border border-gold/20 rounded">
              {activeTab === 'services' ? 'Our Services' : activeTab === 'users' ? 'User Directory' : activeTab === 'sections' ? 'Section Content' : activeTab}
            </span>
          </div>

          <div className="px-4 sm:px-6 md:px-0">
            {/* TAB 1: PROJECTS & CREATIONS */}
          {activeTab === 'projects' && (
            <div className="space-y-8">
              {/* Success Notification */}
              {successNotice && (
                <div className="p-4 bg-emerald-950/70 border border-emerald-500/60 text-emerald-200 text-sm flex items-center gap-2">
                  <CheckCircle size={18} className="text-emerald-400" />
                  {successNotice}
                </div>
              )}

              {/* Upload Form Box */}
              <div className="bg-black-pure/90 border border-gold/30 lg:border-gold/40 p-6 sm:p-8 lg:p-10 shadow-xl shadow-black/70 relative">
                <div className="flex items-center justify-between mb-5 border-b border-gold/20 pb-4">
                  <div>
                    <span className="text-[10px] font-mono text-gold uppercase tracking-widest">Content Management</span>
                    <h2 className="text-xl lg:text-2xl font-heading text-white uppercase tracking-wider flex items-center gap-2">
                      Upload New Creation
                    </h2>
                  </div>
                </div>

                <form onSubmit={handleAddProject} className="space-y-5 lg:space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold mb-1.5">
                        Creation Title *
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
                            <div className="absolute z-50 w-full mt-1 bg-black-pure border border-gold shadow-[0_8px_24px_rgba(0,0,0,0.9)]">
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
                      Project Description *
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
                      Project Photo *
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
                          <RefreshCw size={16} className="animate-spin mr-2" /> Saving...
                        </>
                      ) : (
                        <span>{editingProjectId ? 'Update Creation (Move to Top)' : 'Publish Creation to Website'}</span>
                      )}
                    </button>
                    {editingProjectId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProjectId(null);
                          setTitle('');
                          setDesc('');
                          setImageUrl('');
                          setImagePreview('');
                          setCustomCategory('');
                          const savedDefault = localStorage.getItem('natal_default_creation_category') || CATEGORY_OPTIONS[0];
                          setCategory(savedDefault);
                        }}
                        className="w-full sm:w-auto px-5 py-3 border border-white/20 text-gray-400 hover:text-white uppercase text-xs tracking-wider text-center"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Existing Uploaded Projects Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gold/20 pb-2">
                  <h3 className="text-lg font-heading text-white uppercase tracking-wider">
                    Published Creations ({projects.length})
                  </h3>
                  <span className="text-xs font-mono text-gray-400">Live in Gallery</span>
                </div>

                {projects.length === 0 ? (
                  <div className="p-8 text-center bg-black-pure/50 border border-gold/20 text-gray-400 text-sm">
                    No creations uploaded yet. Use the form above to add your first project!
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5 lg:gap-4">
                    {projects.map((project, pIdx) => (
                      <div key={project.id ? `${project.id}-${pIdx}` : `proj-${pIdx}`} className="bg-black-pure border border-gold/30 lg:border-gold/40 group relative overflow-hidden flex flex-col justify-between hover:border-gold transition-all duration-300 shadow-md hover:shadow-[0_12px_28px_rgba(0,0,0,0.8)] rounded-none">
                        <div className="h-28 xs:h-32 sm:h-36 md:h-40 lg:h-32 xl:h-36 overflow-hidden relative">
                          <img 
                            src={project.image} 
                            alt={project.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black-pure via-transparent to-transparent opacity-60 pointer-events-none"></div>
                          
                          <div className="absolute top-1.5 right-1.5 z-20 flex items-center gap-1">
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingProjectId(project.id);
                                setTitle(project.title);
                                setDesc(project.desc || project.description || '');
                                setCategory(CATEGORY_OPTIONS.includes(project.category) ? project.category : 'Custom');
                                if (!CATEGORY_OPTIONS.includes(project.category)) {
                                  setCustomCategory(project.category);
                                }
                                setImageUrl(project.image);
                                setImagePreview(project.image);
                                window.scrollTo({ top: 120, behavior: 'smooth' });
                              }}
                              className="bg-black-pure/90 hover:bg-gold hover:text-black-pure text-gold p-1 sm:p-1.5 border border-gold/50 transition-all cursor-pointer shadow-md"
                              title="Edit creation and bump to top"
                            >
                              <Edit3 size={12} className="sm:hidden" />
                              <Edit3 size={13} className="hidden sm:block" />
                            </button>
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProject(project.id);
                              }}
                              className="bg-red-950/90 hover:bg-red-700 text-white p-1 sm:p-1.5 border border-red-500 transition-all cursor-pointer shadow-md"
                              title="Delete this creation"
                            >
                              <Trash2 size={12} className="sm:hidden" />
                              <Trash2 size={13} className="hidden sm:block" />
                            </button>
                          </div>
                        </div>

                        <div className="p-2 sm:p-2.5 lg:p-3 flex-1 flex flex-col justify-between">
                          <div>
                            <span className="text-gold text-[8px] sm:text-[9px] uppercase tracking-widest font-mono block mb-0.5 truncate">
                              {project.category}
                            </span>
                            <h4 className="text-white font-medium text-xs line-clamp-1">{project.title}</h4>
                            <p className="text-gray-400 text-[10px] line-clamp-2 mt-0.5">{project.desc}</p>
                          </div>

                          <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[9px] text-gray-400 font-mono">
                            <span className="truncate">Active</span>
                            <span className="text-gold flex items-center gap-1 shrink-0">
                              <Eye size={10} className="sm:hidden" />
                              <Eye size={11} className="hidden sm:block" /> Live
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
              <div className="bg-black-pure/80 border border-gold/30 p-4 sm:p-6">
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
              <div id="service-edit-form" className="bg-black-pure/80 border border-gold/30 p-4 sm:p-8 relative">
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
                          <RefreshCw size={14} className="animate-spin" /> Saving Service...
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                    {allCombinedServices.map((service, idx) => (
                      <div 
                        key={service.id ? `${service.id}-${idx}` : `svc-${idx}`} 
                        className="bg-black-pure border border-gold/30 hover:border-gold p-3 sm:p-3.5 flex flex-col justify-between relative group transition-all duration-300 shadow-md hover:shadow-[0_4px_20px_rgba(212,175,55,0.15)]"
                      >
                        <div className="flex-1 flex flex-col">
                          {/* Card Top Meta & Status */}
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <span className="text-gold text-[9px] sm:text-[10px] uppercase tracking-wider font-mono font-bold">
                              #{idx + 1} {idx === 0 && '• Top'}
                            </span>
                            <div className="flex items-center gap-1">
                              {service.isCustom && (
                                <span className="text-[8px] font-mono px-1 py-0.5 bg-emerald-900/60 border border-emerald-500/50 text-emerald-300 uppercase">
                                  Custom
                                </span>
                              )}
                              {service.isEdited && (
                                <span className="text-[8px] font-mono px-1 py-0.5 bg-amber-900/60 border border-amber-500/50 text-amber-300 uppercase">
                                  Edited
                                </span>
                              )}
                              {service.isBase && !service.isEdited && (
                                <span className="text-[8px] font-mono px-1 py-0.5 bg-white/5 border border-white/10 text-gray-400 uppercase">
                                  Base
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Image preview if exists, or architectural icon thumbnail */}
                          {service.image ? (
                            <div className="relative aspect-[16/10] overflow-hidden bg-black-rich mb-2 border border-gold/20">
                              <img
                                src={service.image}
                                alt={service.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black-pure/70 via-transparent to-transparent" />
                            </div>
                          ) : (
                            <div className="h-12 bg-black-rich/60 border border-white/5 flex items-center justify-center mb-2 group-hover:border-gold/30 transition-colors">
                              {renderDisciplineIcon(service.icon, 20)}
                            </div>
                          )}

                          {/* Service Title */}
                          <h4 className="text-white font-heading text-xs sm:text-sm font-bold uppercase tracking-wide line-clamp-1 group-hover:text-gold transition-colors mb-1" title={service.title}>
                            {service.title}
                          </h4>

                          {/* Service Description */}
                          <p className="text-gray-400 text-[10px] sm:text-[11px] leading-relaxed line-clamp-2 mb-2 font-light">
                            {service.description}
                          </p>

                          {/* Key Features Count or Sample */}
                          {service.features && Array.isArray(service.features) && service.features.length > 0 && (
                            <div className="mb-2 text-[10px] text-gray-400 font-mono flex items-center gap-1 truncate">
                              <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0"></span>
                              <span className="truncate">{service.features[0]}</span>
                              {service.features.length > 1 && (
                                <span className="text-gray-500 shrink-0">+{service.features.length - 1}</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions Toolbar */}
                        <div className="pt-2 mt-auto border-t border-white/10 space-y-2">
                          <div className="grid grid-cols-3 gap-1">
                            {/* Promote / Move to Top */}
                            {idx > 0 ? (
                              <button
                                type="button"
                                onClick={() => handlePromoteService(service)}
                                className="bg-black-rich hover:bg-gold hover:text-black-pure text-gray-300 py-1 flex items-center justify-center border border-white/20 hover:border-gold transition-colors cursor-pointer text-[10px]"
                                title="Elevate to Position #1 at top"
                              >
                                <ArrowUp size={13} />
                              </button>
                            ) : (
                              <div className="bg-gold/15 border border-gold/40 text-gold py-1 flex items-center justify-center text-[9px] font-mono font-bold" title="Currently Top Priority">
                                #1 TOP
                              </div>
                            )}

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleEditService(service)}
                              className="bg-black-rich hover:bg-gold hover:text-black-pure text-gold py-1 flex items-center justify-center border border-gold/40 transition-colors shadow cursor-pointer text-[10px]"
                              title="Edit this service"
                            >
                              <Edit3 size={13} />
                            </button>

                            {/* Delete or Hide Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteOrHideService(service)}
                              className="bg-red-950/80 hover:bg-red-700 text-white py-1 flex items-center justify-center border border-red-500/50 transition-colors shadow cursor-pointer text-[10px]"
                              title={service.isBase ? "Hide from website" : "Delete service"}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          {/* Footer Discipline & Live status */}
                          <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-gray-400 font-mono pt-1">
                            <span className="text-gray-400 truncate mr-1 flex items-center gap-1" title={DISCIPLINE_OPTIONS.find(d => d.value === service.icon)?.label || service.icon || 'Gypsum & Fine Wall Finishes'}>
                              {renderDisciplineIcon(service.icon, 11)}
                              <span className="truncate">{DISCIPLINE_OPTIONS.find(d => d.value === service.icon)?.label?.split(' ')[0] || 'Gypsum'}</span>
                            </span>
                            <span className="text-emerald-400 flex items-center gap-0.5 shrink-0">
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
                <div className="text-right hidden sm:block">
                  <span className="text-sm font-mono text-white bg-white/5 border border-white/10 px-3 py-1.5 inline-block">
                    Total Leads: <span className="text-gold font-bold">{leads.length}</span>
                  </span>
                </div>
              </div>

              {leads.length === 0 ? (
                <div className="p-12 text-center bg-black-pure/50 border border-gold/20">
                  <FileText size={36} className="text-gold/50 mx-auto mb-3" />
                  <p className="text-gray-300 font-medium text-sm">No client quote requests yet.</p>
                  <p className="text-xs text-gray-500 mt-1">When clients fill out the "Request a Quote" form, their details will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {leads.map((lead, lIdx) => (
                    <div key={lead.id ? `${lead.id}-${lIdx}` : `lead-${lIdx}`} className="bg-black-pure border border-gold/30 p-5 flex flex-col justify-between hover:border-gold/50 transition-colors">
                      <div>
                        <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3 mb-3">
                          <div>
                            <h4 className="text-white font-bold text-base line-clamp-1">{lead.name || 'Client Lead'}</h4>
                            <span className="text-gold text-[10px] uppercase tracking-widest font-mono mt-0.5 inline-block bg-gold/10 px-1.5 py-0.5 border border-gold/20">
                              {lead.service || 'General Inquiry'}
                            </span>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="text-gray-400 text-[10px] font-mono whitespace-nowrap bg-white/5 px-1.5 py-0.5">
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
                              className="text-red-500 hover:text-white hover:bg-red-900/60 p-1 transition-colors cursor-pointer border border-transparent hover:border-red-500 rounded-sm"
                              title="Delete Lead"
                            >
                              <Trash2 size={14} />
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
                          <div className="bg-black-rich p-3 border border-white/5 text-xs text-gray-300">
                            <span className="text-gray-500 font-mono text-[10px] uppercase block mb-1">Project Details:</span>
                            <p className="line-clamp-4 leading-relaxed">{lead.details}</p>
                          </div>
                        )}

                        {/* Client Attached Blueprint, Photo or Video */}
                        {lead.fileAttachment && (
                          <div className="mt-3 p-2.5 bg-black-rich border border-gold/40 flex items-center justify-between gap-2 shadow-inner">
                            <div className="flex items-center gap-2 overflow-hidden min-w-0">
                              {lead.fileAttachment.type === 'video' ? (
                                <div className="w-9 h-9 relative bg-black border border-gold/40 flex items-center justify-center shrink-0 overflow-hidden">
                                  {lead.fileAttachment.thumbnail ? (
                                    <img src={lead.fileAttachment.thumbnail} alt="" className="w-full h-full object-cover opacity-60" />
                                  ) : null}
                                  <Video size={13} className="text-gold relative z-10" />
                                </div>
                              ) : lead.fileAttachment.type === 'image' && (lead.fileAttachment.thumbnail || lead.fileAttachment.data) ? (
                                <img 
                                  src={lead.fileAttachment.thumbnail || lead.fileAttachment.data} 
                                  alt="" 
                                  className="w-9 h-9 object-cover border border-gold/40 shrink-0" 
                                />
                              ) : (
                                <div className="w-9 h-9 bg-gold/10 border border-gold/40 flex items-center justify-center text-gold shrink-0">
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
                              className="px-2 py-1 bg-gold/20 hover:bg-gold text-gold hover:text-black-pure border border-gold/50 text-[10px] font-mono font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer"
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
                      
                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                         <span className="text-[10px] font-mono text-gray-500 uppercase flex items-center gap-1.5">
                           <CheckCircle size={12} className="text-emerald-500/70" />
                           Received
                         </span>
                         <a 
                           href={`mailto:${lead.email}?subject=Re: Natal Interior Design Inquiry`}
                           className="text-gold text-[10px] uppercase font-bold font-mono tracking-wider hover:text-white transition-colors"
                         >
                           Reply via Email &rarr;
                         </a>
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
              <div className="bg-black-pure border border-gold/30 p-5 md:p-6 mb-8">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">Add New Testimonial</h3>
                </div>

                <form onSubmit={handleSaveTestimonial} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold mb-1">Client Name *</label>
                      <input required type="text" value={tName} onChange={e => setTName(e.target.value)} placeholder="e.g. Robert Kasasa" className="w-full bg-black-rich border border-gold/30 px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gold" />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold mb-1">Role / Title *</label>
                      <input required type="text" value={tRole} onChange={e => setTRole(e.target.value)} placeholder="e.g. Home Owner" className="w-full bg-black-rich border border-gold/30 px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gold" />
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
                    <button type="submit" disabled={isUploadingTestimonial} className="bg-gold hover:bg-yellow-400 text-black-pure font-bold px-6 py-2.5 uppercase text-xs tracking-widest transition-all disabled:opacity-50">
                      {isUploadingTestimonial ? 'Publishing...' : 'Publish Testimonial'}
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
                <div className="space-y-4">
                  {testimonials.map((testimonial, tIdx) => (
                    <div key={testimonial.id ? `${testimonial.id}-${tIdx}` : `testimonial-${tIdx}`} className="bg-black-pure border border-gold/30 p-5 space-y-3 relative group">
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
              <div className="bg-black-pure border border-gold/30 p-5 md:p-6 mb-8">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {transformations.map((tr, trIdx) => (
                    <div key={tr.id ? `${tr.id}-${trIdx}` : `tr-${trIdx}`} className="bg-black-pure border border-gold/30 p-4 space-y-3 relative group shadow-lg">
                      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2">
                          <h4 className="text-white font-bold text-sm tracking-wider uppercase">{tr.title}</h4>
                          <button
                            type="button"
                            onClick={() => handleToggleTrMode(tr.id, tr.fitMode)}
                            className={`px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider rounded border transition-colors cursor-pointer ${
                              tr.fitMode === 'contain'
                                ? 'bg-blue-500/10 text-blue-300 border-blue-500/30 hover:bg-blue-500/20'
                                : 'bg-gold/10 text-gold border-gold/30 hover:bg-gold/20'
                            }`}
                            title="Click to toggle between Fill and Fit mode"
                          >
                            {tr.fitMode === 'contain' ? 'Fit Mode' : 'Fill Mode'}
                          </button>
                        </div>
                        <button 
                          onClick={() => handleDeleteTransformation(tr.id)}
                          className="w-8 h-8 rounded-full bg-red-950/40 text-red-400 flex items-center justify-center hover:bg-red-900/60 hover:text-red-200 transition-colors cursor-pointer"
                          title="Delete Transformation"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 h-44 sm:h-48">
                        <div className="relative border border-white/10 group-hover:border-gold/30 transition-colors bg-black-pure overflow-hidden flex items-center justify-center p-1">
                          <span className="absolute top-2 left-2 bg-black-pure/90 text-white text-[10px] uppercase tracking-widest px-2 py-0.5 z-10 font-mono font-bold border border-white/20">Before</span>
                          <img src={tr.beforeImage} alt="Before" className={`w-full h-full ${tr.fitMode === 'cover' ? 'object-cover' : 'object-contain'}`} />
                        </div>
                        <div className="relative border border-white/10 group-hover:border-gold/30 transition-colors bg-black-pure overflow-hidden flex items-center justify-center p-1">
                          <span className="absolute top-2 left-2 bg-black-pure/90 text-gold text-[10px] uppercase tracking-widest px-2 py-0.5 z-10 font-mono font-bold border border-gold/30">After</span>
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
          {activeTab === 'notifications' && (
            <div className="space-y-6 max-w-5xl">
              <div className="border-b border-gold/20 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-gold uppercase tracking-widest">Executive Feeds</span>
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-300 border border-red-500/40 rounded-full text-[10px] font-mono font-bold animate-pulse">
                      Live Stream
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-heading text-white uppercase tracking-wider flex items-center gap-2.5 mt-1">
                    <Bell size={22} className="text-gold" /> System Notifications & Alerts
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      setSuccessNotice('Notification stream refreshed with live data');
                      setTimeout(() => setSuccessNotice(''), 3000);
                    }}
                    className="px-3.5 py-1.5 bg-white/5 hover:bg-gold/10 border border-white/10 hover:border-gold/40 text-gray-300 hover:text-gold text-xs font-mono uppercase tracking-wider rounded transition-all cursor-pointer"
                  >
                    Refresh Stream
                  </button>
                </div>
              </div>

              {/* Notification Summary Cards with Instant Tab Links */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div 
                  onClick={() => switchTab('users')}
                  className="bg-black-pure border border-gold/20 p-4 rounded-sm hover:border-gold transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">VIP & Users</span>
                    <UserCheck size={16} className="text-gold group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-2xl font-heading font-bold text-white group-hover:text-gold transition-colors">{users.length}</div>
                  <div className="text-[11px] text-gray-400 mt-1 flex items-center justify-between">
                    <span>Registered profiles</span>
                    <span className="text-gold text-[10px] underline">Open Directory &rarr;</span>
                  </div>
                </div>

                <div 
                  onClick={() => switchTab('leads')}
                  className="bg-black-pure border border-gold/20 p-4 rounded-sm hover:border-gold transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">Direct Inquiries</span>
                    <Mail size={16} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-2xl font-heading font-bold text-white group-hover:text-emerald-400 transition-colors">{leads.length}</div>
                  <div className="text-[11px] text-gray-400 mt-1 flex items-center justify-between">
                    <span>Active client leads</span>
                    <span className="text-emerald-400 text-[10px] underline">Open CRM &rarr;</span>
                  </div>
                </div>

                <div 
                  onClick={() => switchTab('profile')}
                  className="bg-black-pure border border-gold/20 p-4 rounded-sm hover:border-gold transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">Security State</span>
                    <ShieldCheck size={16} className="text-gold group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-base font-heading font-bold text-emerald-400 group-hover:text-gold transition-colors">Authenticated</div>
                  <div className="text-[11px] text-gray-400 mt-1 flex items-center justify-between">
                    <span>Master Admin Online</span>
                    <span className="text-gold text-[10px] underline">Admin Profile &rarr;</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity Feed */}
              <div className="bg-black-pure border border-gold/20 p-5 sm:p-6 rounded-sm shadow-lg">
                <h3 className="text-sm font-heading uppercase tracking-widest text-gold mb-4 flex items-center gap-2">
                  <Sparkles size={16} /> Latest System Alerts & Submissions
                </h3>
                <div className="divide-y divide-white/5 space-y-1">
                  {users.slice(0, 5).map((userItem, idx) => (
                    <div key={userItem.id || idx} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/5 px-2 rounded transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center shrink-0 mt-0.5">
                          <UserCheck size={15} className="text-gold" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white flex items-center gap-2">
                            <span>{userItem.name}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-gold/10 text-gold border border-gold/30 rounded">
                              {userItem.role || 'VIP Client'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {userItem.email} &bull; Source: <span className="text-gray-300 font-mono">{userItem.source || 'Quotation Form'}</span>
                            {userItem.service && ` &bull; Project: ${userItem.service}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:self-center">
                        <button 
                          onClick={() => switchTab('users')}
                          className="px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider bg-gold/10 hover:bg-gold/25 border border-gold/30 text-gold rounded transition-colors cursor-pointer"
                        >
                          View in Users
                        </button>
                      </div>
                    </div>
                  ))}

                  {leads.slice(0, 5).map((leadItem, idx) => (
                    <div key={leadItem.id || idx} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/5 px-2 rounded transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5">
                          <Mail size={15} className="text-emerald-400" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white flex items-center gap-2">
                            <span>{leadItem.name || 'Direct Lead'}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded">
                              Direct Message
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {leadItem.email || leadItem.phone} &bull; <span className="italic">{leadItem.message ? `"${leadItem.message.slice(0, 50)}..."` : 'No message body'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:self-center">
                        <button 
                          onClick={() => switchTab('leads')}
                          className="px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 rounded transition-colors cursor-pointer"
                        >
                          View in CRM
                        </button>
                      </div>
                    </div>
                  ))}

                  {users.length === 0 && leads.length === 0 && (
                    <div className="p-8 text-center text-gray-400 text-sm">
                      No active alerts recorded yet. Submissions from quotation forms and user registrations will populate here in real-time.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

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

              <div className="bg-black-pure border border-gold/30 p-6 space-y-4">
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
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Nav Bar & Suite Synchronized</span>
                </div>
              </div>

              <div className="bg-black-pure border border-gold/30 p-6 md:p-8">
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
                      <div className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/85 border border-emerald-500/50 rounded-full shadow-lg backdrop-blur-sm z-10">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-emerald-400 font-mono text-[9px] uppercase tracking-widest font-bold">Online</span>
                      </div>
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
                      ✓ Real-time link: Profile picture in the website navigation bar is always identical to this picture
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
                                onChange={(e) => setAdminNameInput(e.target.value)}
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
