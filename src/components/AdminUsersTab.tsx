import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, User, UserPlus, Download, Search, Filter, X, CheckCircle, CheckCircle2,
  Sparkles, FileText, Mail, Phone, Calendar, Trash2, Check, Copy, 
  UserCheck, LayoutGrid, List, Table, ChevronRight, ChevronDown,
  ArrowUpDown, SlidersHorizontal, CheckSquare, Eye, ShieldCheck,
  Zap, Clock, Activity, MessageSquare, PlusCircle, ExternalLink,
  History, ArrowRight, CornerDownRight, Tag, Layers, Camera, Edit2, Edit3, Save,
  AlertCircle
} from 'lucide-react';
import { ExportButton } from './ExportButton';
import { ExportColumn } from '../utils/exportUtils';
import { 
  recordUserActivity, 
  UserActivity, 
  getUserInitials, 
  compressImageFile,
  normalizeWhatsAppNumber,
  sanitizeNameInput,
  isValidName,
  sanitizePhoneInput,
  isValidPhone,
  handleNameKeyDown,
  handleNamePaste,
  handlePhoneKeyDown,
  handlePhonePaste,
  CONTAINS_DIGITS_OR_SYMBOLS_REGEX,
  getUserTimestamp,
  parseTimestampToMs,
  showAppNotification
} from '../utils';

const SOURCE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Channels' },
  { value: 'Registration', label: 'VIP Registration' },
  { value: 'Quotation Form', label: 'Quotation Form' },
  { value: 'Contact Form', label: 'Contact Form' },
  { value: 'Direct Channel', label: 'Direct Chat / Calls' }
];

const ROLE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Roles' },
  { value: 'Administrator', label: 'Administrators (Admins)' },
  { value: 'VIP Client', label: 'VIP Clients' },
  { value: 'Client Lead', label: 'Client Leads' },
  { value: 'Registered Member', label: 'Registered Members' }
];

const SORT_OPTIONS: { value: 'newest' | 'oldest' | 'name-asc' | 'name-desc'; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'name-asc', label: 'Name (A to Z)' },
  { value: 'name-desc', label: 'Name (Z to A)' }
];

const PROPERTY_TYPE_OPTIONS = [
  'Luxury Villa / Residence',
  'Commercial Office / Headquarters',
  'Penthouse Apartment',
  'Boutique Hotel / Hospitality',
  'Executive Boardroom',
  'Retail Showroom & Lounge',
  'Custom Architectural Space'
];

const BUDGET_OPTIONS = [
  '$5,000 - $10,000 (Essential)',
  '$10,000 - $25,000 (Premier)',
  '$25,000 - $50,000 (Signature Luxury)',
  '$50,000+ (Master Atelier Bespoke)'
];

export interface AdminUsersTabProps {
  users: any[];
  leads?: any[];
  onDeleteUser: (user: any) => void;
  onCreateUser: (userData: {
    name: string;
    email: string;
    phone?: string;
    photoURL?: string;
    source: 'Registration' | 'Quotation Form' | 'Contact Form';
    role: 'Administrator' | 'VIP Client' | 'Client Lead' | 'Registered Member';
    service?: string;
    details?: string;
    projectType?: string;
    estimatedBudget?: string;
    isVIP?: boolean;
    vipTier?: string;
  }) => Promise<void>;
  onUpdateUser?: (userIdOrEmail: string, updates: Partial<any>) => Promise<void>;
  onExportCSV: () => void;
  notice?: string;
  onClearNotice?: () => void;
  readNotificationIds?: string[];
  onToggleNotificationRead?: (id: string) => void;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  users,
  leads = [],
  onDeleteUser,
  onCreateUser,
  onUpdateUser,
  onExportCSV,
  notice,
  onClearNotice,
  readNotificationIds = [],
  onToggleNotificationRead
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'name-asc' | 'name-desc'>('newest');
  
  // Overlay dropdown states
  const [isSourceFilterOpen, setIsSourceFilterOpen] = useState(false);
  const [isRoleFilterOpen, setIsRoleFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [reactingOption, setReactingOption] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>(() => {
    return (localStorage.getItem('natal_users_view_format') as 'grid' | 'list' | 'table') || 'grid';
  });
  const [selectedUserDetail, setSelectedUserDetail] = useState<any | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // User Detail Photo & Editing States
  const userPhotoInputRef = React.useRef<HTMLInputElement>(null);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNameError, setEditNameError] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPhoneError, setEditPhoneError] = useState('');
  const [editRole, setEditRole] = useState<'Administrator' | 'VIP Client' | 'Client Lead' | 'Registered Member'>('Client Lead');
  const [editService, setEditService] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [isSavingUserEdit, setIsSavingUserEdit] = useState(false);
  const [userModalNotice, setUserModalNotice] = useState('');

  // Keep selected user detail in sync with latest users list prop
  useEffect(() => {
    if (selectedUserDetail) {
      const fresh = users.find(u => (selectedUserDetail.id && u.id === selectedUserDetail.id) || (selectedUserDetail.email && u.email && u.email.toLowerCase() === selectedUserDetail.email.toLowerCase()));
      if (fresh) {
        setSelectedUserDetail((prev: any) => prev ? { ...prev, ...fresh } : null);
      }
    }
  }, [users]);

  const handleOpenUserDetail = (u: any) => {
    setSelectedUserDetail(u);
    setIsEditingUser(false);
    setEditName(u.name || '');
    setEditEmail(u.email || '');
    setEditPhone(u.phone || '');
    setEditRole(u.role === 'Administrator' ? 'Administrator' : (u.role || 'Client Lead'));
    setEditService(u.service || '');
    setEditStatus(u.status || (u.role === 'Administrator' ? 'Active Administrator' : 'Active'));
    setUserModalNotice('');
  };

  const handleUploadUserPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUserDetail) return;
    try {
      const base64 = await compressImageFile(file, 400, 400, 0.85);
      if (onUpdateUser) {
        await onUpdateUser(selectedUserDetail.id || selectedUserDetail.email, { photoURL: base64 });
      }
      setSelectedUserDetail((prev: any) => prev ? { ...prev, photoURL: base64 } : null);
      setUserModalNotice("Profile photo optimized, stored in Cloud Database & synchronized across Navigation Bar & Dashboard!");
      setTimeout(() => setUserModalNotice(''), 4000);
    } catch {
      const reader = new FileReader();
      reader.onload = async (loadEvt) => {
        const base64 = loadEvt.target?.result as string;
        if (base64) {
          if (onUpdateUser) {
            await onUpdateUser(selectedUserDetail.id || selectedUserDetail.email, { photoURL: base64 });
          }
          setSelectedUserDetail((prev: any) => prev ? { ...prev, photoURL: base64 } : null);
          setUserModalNotice("Profile photo updated and synchronized across Navigation Bar & Dashboard!");
          setTimeout(() => setUserModalNotice(''), 4000);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleRemoveUserPhoto = async () => {
    if (!selectedUserDetail) return;
    if (onUpdateUser) {
      await onUpdateUser(selectedUserDetail.id || selectedUserDetail.email, { photoURL: '' });
    }
    setSelectedUserDetail((prev: any) => prev ? { ...prev, photoURL: undefined } : null);
    setUserModalNotice("Profile photo removed and synchronized across Navigation Bar & Dashboard.");
    setTimeout(() => setUserModalNotice(''), 4000);
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserDetail || !editName.trim()) return;

    if (!isValidName(editName)) {
      setUserModalNotice("Error: Name must contain letters only (no numbers, digits or symbols).");
      return;
    }

    if (editPhone.trim() && !isValidPhone(editPhone)) {
      setUserModalNotice("Error: Please enter a valid phone number (at least 7 digits).");
      return;
    }

    setIsSavingUserEdit(true);
    try {
      const isAdm = editRole === 'Administrator';
      const updates = {
        name: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        role: editRole,
        service: editService.trim(),
        status: editStatus.trim() || (isAdm ? 'Active Administrator' : 'Active'),
        isAdmin: isAdm
      };
      if (onUpdateUser) {
        await onUpdateUser(selectedUserDetail.id || selectedUserDetail.email, updates);
      }
      setSelectedUserDetail((prev: any) => prev ? { ...prev, ...updates } : null);
      setIsEditingUser(false);
      setUserModalNotice("Profile details saved and synchronized across Navigation Bar & Dashboard!");
      setTimeout(() => setUserModalNotice(''), 4000);
    } catch (err: any) {
      showAppNotification("Error saving profile changes: " + err.message, "error");
    } finally {
      setIsSavingUserEdit(false);
    }
  };

  // Manual Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [source, setSource] = useState<'Registration' | 'Quotation Form' | 'Contact Form'>('Registration');
  const [role, setRole] = useState<'Administrator' | 'VIP Client' | 'Client Lead' | 'Registered Member'>('VIP Client');
  const [isModalSourceOpen, setIsModalSourceOpen] = useState(false);
  const [isModalRoleOpen, setIsModalRoleOpen] = useState(false);
  const [reactingModalOption, setReactingModalOption] = useState<string | null>(null);
  const [service, setService] = useState('');
  const [projectType, setProjectType] = useState<string>(PROPERTY_TYPE_OPTIONS[0]);
  const [estimatedBudget, setEstimatedBudget] = useState<string>(BUDGET_OPTIONS[1]);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Site Activity Feed Drawer / Modal State
  const [isActivityFeedOpen, setIsActivityFeedOpen] = useState(false);
  const [activitySearchTerm, setActivitySearchTerm] = useState('');
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('all');

  // Manual Activity Note State inside User Details Modal
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDesc, setNoteDesc] = useState('');
  const [noteType, setNoteType] = useState<'custom' | 'call' | 'quotation' | 'specs_inquiry'>('custom');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const handleSelectSource = (val: string) => {
    setReactingOption(`source-${val}`);
    setTimeout(() => {
      setSourceFilter(val);
      setReactingOption(null);
      setIsSourceFilterOpen(false);
    }, 90);
  };

  const handleSelectRole = (val: string) => {
    setReactingOption(`role-${val}`);
    setTimeout(() => {
      setRoleFilter(val);
      setReactingOption(null);
      setIsRoleFilterOpen(false);
    }, 90);
  };

  const handleSelectSort = (val: 'newest' | 'oldest' | 'name-asc' | 'name-desc') => {
    setReactingOption(`sort-${val}`);
    setTimeout(() => {
      setSortOption(val);
      setReactingOption(null);
      setIsSortOpen(false);
    }, 90);
  };

  const handleCopyEmail = (emailStr: string) => {
    if (!emailStr) return;
    navigator.clipboard?.writeText(emailStr);
    setCopiedEmail(emailStr);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleSubmitNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    if (!isValidName(name)) {
      showAppNotification("Error: Client name must contain letters only (no numbers, digits or symbols).", "error");
      return;
    }

    if (phone.trim() && !isValidPhone(phone)) {
      showAppNotification("Error: Please enter a valid phone number (at least 7 digits).", "error");
      return;
    }

    setIsSubmitting(true);
    const isVIPAccount = role === 'VIP Client';
    try {
      await onCreateUser({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        source,
        role,
        service: service.trim() || 'Gypsum Ceilings & Lighting',
        details: details.trim(),
        projectType,
        estimatedBudget,
        isVIP: isVIPAccount,
        vipTier: isVIPAccount ? 'VIP Gold Member' : undefined
      });
      setIsAddModalOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      setService('');
      setDetails('');
      setProjectType(PROPERTY_TYPE_OPTIONS[0]);
      setEstimatedBudget(BUDGET_OPTIONS[1]);
    } catch (err: any) {
      showAppNotification("Error adding user: " + err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const list = users.filter(user => {
      const term = searchTerm.toLowerCase().trim();
      const matchSearch = !term || (
        (user.name && user.name.toLowerCase().includes(term)) ||
        (user.email && user.email.toLowerCase().includes(term)) ||
        (user.phone && user.phone.toLowerCase().includes(term)) ||
        (user.service && user.service.toLowerCase().includes(term)) ||
        (user.role && user.role.toLowerCase().includes(term)) ||
        (user.source && user.source.toLowerCase().includes(term)) ||
        (user.details && user.details.toLowerCase().includes(term)) ||
        (Array.isArray(user.activities) && user.activities.some((a: any) =>
          (a.title && a.title.toLowerCase().includes(term)) ||
          (a.description && a.description.toLowerCase().includes(term)) ||
          (a.type && a.type.toLowerCase().includes(term))
        ))
      );

      const isUserAdmin = user.role === 'Administrator' || (user.email && user.email.toLowerCase().includes('admin'));
      const matchSource = sourceFilter === 'all' || user.source === sourceFilter;
      const matchRole = roleFilter === 'all' 
        ? true 
        : roleFilter === 'Administrator' 
          ? isUserAdmin 
          : user.role === roleFilter;

      return matchSearch && matchSource && matchRole;
    });

    return [...list].sort((a, b) => {
      if (sortOption === 'name-asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortOption === 'name-desc') {
        return (b.name || '').localeCompare(a.name || '');
      }
      
      const timeA = getUserTimestamp(a);
      const timeB = getUserTimestamp(b);

      if (sortOption === 'oldest') {
        return timeA - timeB;
      }

      // Default: 'newest' -> Newest registered client / user is guaranteed at the very top of the list!
      const isAdminA = a.role === 'Administrator' || a.isAdmin || (a.email && a.email.toLowerCase().includes('admin'));
      const isAdminB = b.role === 'Administrator' || b.isAdmin || (b.email && b.email.toLowerCase().includes('admin'));

      // Real client / new users are always placed above system administrators
      if (!isAdminA && isAdminB) return -1;
      if (isAdminA && !isAdminB) return 1;

      // Between clients (or between admins), newest user is first at the top
      if (timeB !== timeA) {
        return timeB - timeA;
      }

      // If timestamps tie, place VIP client first
      const isVipA = a.role === 'VIP Client' || a.source === 'Registration' || a.isVIP;
      const isVipB = b.role === 'VIP Client' || b.source === 'Registration' || b.isVIP;
      if (isVipA && !isVipB) return -1;
      if (!isVipA && isVipB) return 1;

      return 0;
    });
  }, [users, searchTerm, sourceFilter, roleFilter, sortOption]);

  const adminUsers = useMemo(() => users.filter(u => u.role === 'Administrator' || (u.email && u.email.toLowerCase().includes('admin'))), [users]);
  const vipUsers = useMemo(() => users.filter(u => (u.source === 'Registration' || u.role === 'VIP Client') && !u.email?.toLowerCase().includes('admin')), [users]);
  const quoteUsers = useMemo(() => users.filter(u => u.source === 'Quotation Form' || (u.service && u.service !== 'General Inquiry' && u.source !== 'Registration')), [users]);
  const contactUsers = useMemo(() => users.filter(u => u.source === 'Contact Form' || u.service === 'General Inquiry'), [users]);

  // Aggregate all activities chronologically across all users for live stream inspection
  const allRecordedActivities = useMemo(() => {
    const list: Array<UserActivity & { userName?: string; userEmail?: string; userPhone?: string; userId?: string }> = [];
    users.forEach(u => {
      const acts = Array.isArray(u.activities) ? u.activities : [];
      if (acts.length > 0) {
        acts.forEach(a => {
          list.push({
            ...a,
            userName: u.name,
            userEmail: u.email,
            userPhone: u.phone,
            userId: u.id
          });
        });
      } else {
        // Fallback synthetic creation activity if none logged
        list.push({
          id: `synth_${u.id}`,
          type: u.source === 'Registration' ? 'registration' : u.source === 'Quotation Form' ? 'quotation' : 'contact',
          title: u.source === 'Registration' ? 'VIP Client Account Created' : u.source === 'Quotation Form' ? 'Quotation Submitted' : 'Direct Message Received',
          description: u.details || (u.service ? `Requested: ${u.service}` : 'Profile created'),
          timestamp: u.createdAt || new Date().toISOString(),
          userName: u.name,
          userEmail: u.email,
          userPhone: u.phone,
          userId: u.id
        });
      }
    });

    return list.sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeB - timeA;
    });
  }, [users]);

  const totalActivitiesCount = useMemo(() => {
    return allRecordedActivities.length || users.length;
  }, [allRecordedActivities, users]);

  const adminCount = adminUsers.length;
  const registrationCount = vipUsers.length;
  const quoteCount = quoteUsers.length;
  const effectiveContactCount = Math.max(contactUsers.length, leads?.length || 0);
  const totalProfilesCount = users.length;

  const formatDate = (rawDate: any) => {
    if (!rawDate) return 'Recent';
    try {
      if (typeof rawDate === 'string') {
        const d = new Date(rawDate);
        return isNaN(d.getTime()) ? 'Recent' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      if (rawDate?.seconds) {
        return new Date(rawDate.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    } catch {
      return 'Recent';
    }
    return 'Recent';
  };

  const formatActivityTime = (timestamp: any) => {
    if (!timestamp) return 'Recent';
    try {
      const d = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp?.seconds ? timestamp.seconds * 1000 : timestamp);
      if (isNaN(d.getTime())) return 'Recent';
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffHour = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHour / 24);

      if (diffMin < 1) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHour < 24) return `${diffHour}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recent';
    }
  };

  const getActivityIcon = (type: string, size = 13) => {
    switch (type) {
      case 'registration':
        return <Sparkles size={size} className="text-amber-400 shrink-0" />;
      case 'quotation':
        return <FileText size={size} className="text-emerald-400 shrink-0" />;
      case 'contact':
        return <Mail size={size} className="text-blue-400 shrink-0" />;
      case 'whatsapp':
        return <MessageSquare size={size} className="text-emerald-400 shrink-0" />;
      case 'call':
        return <Phone size={size} className="text-yellow-400 shrink-0" />;
      case 'login':
        return <ShieldCheck size={size} className="text-purple-400 shrink-0" />;
      case 'specs_inquiry':
        return <Eye size={size} className="text-cyan-400 shrink-0" />;
      default:
        return <CheckCircle size={size} className="text-gold shrink-0" />;
    }
  };

  const getActivityBadgeStyle = (type: string) => {
    switch (type) {
      case 'registration':
        return 'bg-amber-950/60 text-amber-300 border-amber-500/40';
      case 'quotation':
        return 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40';
      case 'contact':
        return 'bg-blue-950/60 text-blue-300 border-blue-500/40';
      case 'whatsapp':
        return 'bg-emerald-900/60 text-emerald-200 border-emerald-400/50';
      case 'call':
        return 'bg-yellow-950/60 text-yellow-300 border-yellow-500/40';
      case 'login':
        return 'bg-purple-950/60 text-purple-300 border-purple-500/40';
      case 'specs_inquiry':
        return 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40';
      default:
        return 'bg-gold/15 text-gold border-gold/30';
    }
  };

  const handleAddNoteToUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserDetail || !noteTitle.trim()) return;

    setIsSubmittingNote(true);
    try {
      const updatedUser = await recordUserActivity({
        userId: selectedUserDetail.id,
        userEmail: selectedUserDetail.email,
        userName: selectedUserDetail.name,
        userPhone: selectedUserDetail.phone,
        type: noteType,
        title: noteTitle.trim(),
        description: noteDesc.trim() || 'Internal admin activity record',
        metadata: { author: 'Admin Console' }
      });

      if (updatedUser) {
        setSelectedUserDetail(updatedUser);
      }
      setNoteTitle('');
      setNoteDesc('');
      setIsAddingNote(false);
    } catch (err: any) {
      showAppNotification("Error adding activity note: " + err.message, "error");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Tab Header with Matching Executive Aesthetic */}
      <div className="border-b border-gold/20 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono text-gold uppercase tracking-widest block">Directory & CRM</span>
          <h2 className="text-xl sm:text-2xl font-heading text-white uppercase tracking-wider mt-0.5">
            Client & User Directory
          </h2>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsActivityFeedOpen(true)}
            className="px-3.5 py-2.5 bg-black-pure border border-gold/40 text-gold hover:bg-gold/10 hover:border-gold transition-all text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-[0.98]"
            title="Inspect real-time site activity audit stream"
          >
            <Zap size={14} className="text-gold animate-pulse" /> 
            <span>Activity Stream ({totalActivitiesCount})</span>
          </button>

          {/* Export Button: PDF Report & Editable CSV/Excel/JSON */}
          <ExportButton
            data={users}
            columns={[
              { header: 'Full Name', key: 'name' },
              { header: 'Email Address', key: 'email' },
              { header: 'Phone Number', key: 'phone' },
              { header: 'Role / Status', key: 'role', format: (u: any) => u.role || 'Member' },
              { header: 'Source / Channel', key: 'source', format: (u: any) => u.source || 'Direct' },
              { header: 'Service Interest', key: 'service', format: (u: any) => u.service || '-' },
              { header: 'Project Details', key: 'details', format: (u: any) => u.details || '-' },
              { 
                header: 'Registered Date', 
                key: 'createdAt', 
                format: (u: any) => u.createdAt ? (typeof u.createdAt === 'string' ? u.createdAt : new Date(u.createdAt?.seconds ? u.createdAt.seconds * 1000 : Date.now()).toLocaleDateString()) : 'Recent' 
              }
            ]}
            title="Natal Atelier - User & Client Directory"
            subtitle="Complete roster of registered VIP clients, leads, and administrators"
            category="Directory & CRM"
            filenamePrefix="natal_users_roster"
            summaryCards={[
              { label: 'Total Clients', value: users.length },
              { label: 'VIP Clients', value: users.filter(u => u.role === 'VIP Client' || u.isVIP).length },
              { label: 'Leads', value: users.filter(u => u.role === 'Client Lead' || u.source === 'Quotation Form').length },
              { label: 'Admins', value: users.filter(u => u.role === 'Administrator').length }
            ]}
            buttonLabel="Export Directory"
          />
          
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-gold-dark via-gold to-gold-light hover:brightness-110 text-black-pure font-bold transition-all text-xs uppercase tracking-[0.1em] flex items-center gap-2 shadow-[0_2px_15px_rgba(212,175,55,0.35)] cursor-pointer active:scale-[0.98]"
          >
            <Sparkles size={15} /> 
            <span>Register VIP / Add User</span>
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div className="p-3.5 bg-gold/10 border border-gold/50 text-gold text-xs flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle size={16} className="text-gold shrink-0" />
            <span className="font-medium">{notice}</span>
          </div>
          {onClearNotice && (
            <button onClick={onClearNotice} className="text-gold/70 hover:text-white p-1 cursor-pointer">
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* KPI Metric Cards in responsive 5-column layout - Unified Luxury Surface */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        {/* Card 1: Total Directory */}
        <div className="bg-[#0f0f0f] border border-white/10 hover:border-gold/30 rounded-sm p-3.5 sm:p-5 relative overflow-hidden select-none shadow-sm transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between text-gray-400 text-[10px] sm:text-[11px] font-mono uppercase tracking-wider">
              <span className="truncate pr-1 font-medium text-gray-300">Total Directory</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center text-gold shrink-0">
                <Users size={15} />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-3 sm:mt-4 gap-1 flex-wrap">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold font-mono text-white tracking-tight">
                {totalProfilesCount}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {adminCount > 0 && (
                  <span className="text-[9px] sm:text-[10px] font-mono text-gray-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded shrink-0 font-semibold flex items-center gap-1 shadow-sm">
                    <ShieldCheck size={10} className="text-gold" />
                    {adminCount} {adminCount === 1 ? 'Admin' : 'Admins'}
                  </span>
                )}
                <span className="text-[9px] sm:text-[10px] font-mono text-gold bg-white/5 border border-white/10 px-2 py-0.5 rounded shrink-0 font-semibold">
                  Profiles
                </span>
              </div>
            </div>
            <div className="text-[10px] sm:text-[11px] text-gray-400 font-mono mt-1.5 truncate">
              {adminCount > 0 ? `${adminCount} Administrators · ${registrationCount} Clients` : 'Aggregated user directory'}
            </div>
          </div>
        </div>

        {/* Card 2: Recorded User Activities */}
        <div className="bg-[#0f0f0f] border border-white/10 hover:border-gold/30 rounded-sm p-3.5 sm:p-5 relative overflow-hidden select-none shadow-sm transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between text-gray-400 text-[10px] sm:text-[11px] font-mono uppercase tracking-wider">
              <span className="truncate pr-1 font-medium text-gray-300">User Activities</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center text-gold shrink-0">
                <Zap size={15} />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-3 sm:mt-4 gap-1 flex-wrap">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold font-mono text-white tracking-tight">
                {totalActivitiesCount}
              </div>
              <span className="text-[9px] sm:text-[10px] font-mono text-gold bg-white/5 border border-white/10 px-2 py-0.5 rounded shrink-0 font-semibold">
                Recorded
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-gray-400 font-mono mt-1.5 truncate">
              Live audit & action trail
            </div>
          </div>
        </div>

        {/* Card 3: VIP Registrations */}
        <div className="bg-[#0f0f0f] border border-white/10 hover:border-gold/30 rounded-sm p-3.5 sm:p-5 relative overflow-hidden select-none shadow-sm transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between text-gray-400 text-[10px] sm:text-[11px] font-mono uppercase tracking-wider">
              <span className="truncate pr-1 font-medium text-gray-300">VIP Accounts</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center text-gold shrink-0">
                <Sparkles size={15} />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-3 sm:mt-4 gap-1 flex-wrap">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold font-mono text-white tracking-tight">
                {registrationCount}
              </div>
              <span className="text-[9px] sm:text-[10px] font-mono text-gold bg-white/5 border border-white/10 px-2 py-0.5 rounded shrink-0 font-semibold">
                {totalProfilesCount > 0 ? Math.round((registrationCount / totalProfilesCount) * 100) : 0}% Share
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-gray-400 font-mono mt-1.5 truncate">
              Registered VIP members
            </div>
          </div>
        </div>

        {/* Card 4: Quotation Forms */}
        <div className="bg-[#0f0f0f] border border-white/10 hover:border-gold/30 rounded-sm p-3.5 sm:p-5 relative overflow-hidden select-none shadow-sm transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between text-gray-400 text-[10px] sm:text-[11px] font-mono uppercase tracking-wider">
              <span className="truncate pr-1 font-medium text-gray-300">Scope Quotes</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center text-gold shrink-0">
                <FileText size={15} />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-3 sm:mt-4 gap-1 flex-wrap">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold font-mono text-white tracking-tight">
                {quoteCount}
              </div>
              <span className="text-[9px] sm:text-[10px] font-mono text-emerald-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded shrink-0 font-semibold">
                {totalProfilesCount > 0 ? Math.round((quoteCount / totalProfilesCount) * 100) : 0}% Share
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-gray-400 font-mono mt-1.5 truncate">
              Submitted project scopes
            </div>
          </div>
        </div>

        {/* Card 5: Contact Forms / Inquiries */}
        <div className="bg-[#0f0f0f] border border-white/10 hover:border-gold/30 rounded-sm p-3.5 sm:p-5 relative overflow-hidden select-none shadow-sm transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between text-gray-400 text-[10px] sm:text-[11px] font-mono uppercase tracking-wider">
              <span className="truncate pr-1 font-medium text-gray-300">Direct Messages</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center text-gold shrink-0">
                <Mail size={15} />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-3 sm:mt-4 gap-1 flex-wrap">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold font-mono text-white tracking-tight">
                {effectiveContactCount}
              </div>
              <span className="text-[9px] sm:text-[10px] font-mono text-gray-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded shrink-0 font-semibold">
                {totalProfilesCount > 0 ? Math.round((effectiveContactCount / totalProfilesCount) * 100) : 0}% Share
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-gray-400 font-mono mt-1.5 truncate">
              Consultation inquiries
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Quick Filter Tabs, Search, Filter Dropdowns, Sort, View Switcher */}
      <div className="bg-black-pure border border-gold/30 rounded-sm p-3.5 sm:p-5 space-y-4 shadow-xl">
        {/* Quick Category Filter Pills (Matching Notification Tabs Format) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => { setSourceFilter('all'); setRoleFilter('all'); }}
            className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              sourceFilter === 'all' && roleFilter === 'all'
                ? 'bg-gold text-black-pure font-bold shadow-sm'
                : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <span>All Profiles</span>
            <span className="w-5 h-5 min-w-[20px] min-h-[20px] aspect-square rounded-full text-[10px] font-mono font-bold flex items-center justify-center p-0 leading-none bg-red-600 text-white shadow-sm shrink-0 border-0 outline-none ring-0">{users.length}</span>
          </button>

          <button
            type="button"
            onClick={() => { setRoleFilter('VIP Client'); setSourceFilter('all'); }}
            className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              roleFilter === 'VIP Client'
                ? 'bg-gold text-black-pure font-bold shadow-sm'
                : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <Sparkles size={12} />
            <span>VIP Clients</span>
            <span className="w-5 h-5 min-w-[20px] min-h-[20px] aspect-square rounded-full text-[10px] font-mono font-bold flex items-center justify-center p-0 leading-none bg-red-600 text-white shadow-sm shrink-0 border-0 outline-none ring-0">{registrationCount}</span>
          </button>

          <button
            type="button"
            onClick={() => { setSourceFilter('Quotation Form'); setRoleFilter('all'); }}
            className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              sourceFilter === 'Quotation Form'
                ? 'bg-gold text-black-pure font-bold shadow-sm'
                : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <FileText size={12} />
            <span>Quote Leads</span>
            <span className="w-5 h-5 min-w-[20px] min-h-[20px] aspect-square rounded-full text-[10px] font-mono font-bold flex items-center justify-center p-0 leading-none bg-red-600 text-white shadow-sm shrink-0 border-0 outline-none ring-0">{quoteCount}</span>
          </button>

          <button
            type="button"
            onClick={() => { setSourceFilter('Contact Form'); setRoleFilter('all'); }}
            className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              sourceFilter === 'Contact Form'
                ? 'bg-gold text-black-pure font-bold shadow-sm'
                : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <Mail size={12} />
            <span>Inquiries</span>
            <span className="w-5 h-5 min-w-[20px] min-h-[20px] aspect-square rounded-full text-[10px] font-mono font-bold flex items-center justify-center p-0 leading-none bg-red-600 text-white shadow-sm shrink-0 border-0 outline-none ring-0">{effectiveContactCount}</span>
          </button>

          <button
            type="button"
            onClick={() => { setRoleFilter('Administrator'); setSourceFilter('all'); }}
            className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              roleFilter === 'Administrator'
                ? 'bg-gold text-black-pure font-bold shadow-sm'
                : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <ShieldCheck size={12} />
            <span>Administrators</span>
            <span className="w-5 h-5 min-w-[20px] min-h-[20px] aspect-square rounded-full text-[10px] font-mono font-bold flex items-center justify-center p-0 leading-none bg-red-600 text-white shadow-sm shrink-0 border-0 outline-none ring-0">{adminCount}</span>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-3.5 items-stretch lg:items-center justify-between">
          {/* Search Field Matching Website Signature Design */}
          <div className="relative flex-1 min-w-[280px]">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by client name, email, phone, requested service, or notes..."
              className="w-full bg-black-pure border border-gold/40 hover:border-gold/70 focus:border-gold text-white text-sm pl-11 pr-10 py-3 sm:py-3.5 focus:outline-none transition-colors placeholder:text-gray-500 rounded-none shadow-[0_4px_20px_rgba(0,0,0,0.6)]"
            />
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gold shrink-0 pointer-events-none" />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gold p-1 cursor-pointer transition-colors"
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Quick Filters, Sorting & Layout Switcher */}
          <div className="flex items-center gap-2.5 flex-wrap justify-between lg:justify-end">
            {/* Source Selector Overlay */}
            <div className="relative">
              <div
                onClick={() => {
                  setIsSourceFilterOpen(!isSourceFilterOpen);
                  setIsRoleFilterOpen(false);
                  setIsSortOpen(false);
                }}
                className={`bg-black-rich border px-3.5 py-2.5 sm:py-3 text-xs text-white cursor-pointer transition-colors flex items-center justify-between gap-2.5 select-none ${
                  isSourceFilterOpen || sourceFilter !== 'all' ? 'border-gold text-gold shadow-[0_0_12px_rgba(212,175,55,0.2)]' : 'border-gold/30 hover:border-gold'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Filter size={13} className="text-gold shrink-0" />
                  <span className="text-gray-400 text-[10px] font-mono uppercase">Source:</span>
                  <span className="font-mono text-white text-xs truncate font-medium">
                    {SOURCE_FILTER_OPTIONS.find(o => o.value === sourceFilter)?.label || 'All Channels'}
                  </span>
                </div>
                <ChevronDown size={14} className={`text-gold transition-transform duration-200 shrink-0 ml-1 ${isSourceFilterOpen ? 'rotate-180' : ''}`} />
              </div>

              {isSourceFilterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSourceFilterOpen(false)}></div>
                  <div className="absolute z-50 mt-1 min-w-[210px] w-full sm:w-auto right-0 bg-black-pure border border-gold shadow-[0_8px_24px_rgba(0,0,0,0.9)] py-1">
                    {SOURCE_FILTER_OPTIONS.map(opt => (
                      <div
                        key={opt.value}
                        className={`px-4 py-2.5 text-xs cursor-pointer select-none transition-colors duration-100 flex items-center justify-between gap-2 ${
                          reactingOption === `source-${opt.value}`
                            ? 'bg-gold/30 text-gold font-semibold'
                            : sourceFilter === opt.value
                              ? 'bg-gold/20 text-gold font-medium'
                              : 'text-white hover:bg-gold/15 active:bg-gold/25'
                        }`}
                        onClick={() => handleSelectSource(opt.value)}
                      >
                        <span>{opt.label}</span>
                        {sourceFilter === opt.value && <Check size={13} className="text-gold shrink-0" />}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Role Selector Overlay */}
            <div className="relative">
              <div
                onClick={() => {
                  setIsRoleFilterOpen(!isRoleFilterOpen);
                  setIsSourceFilterOpen(false);
                  setIsSortOpen(false);
                }}
                className={`bg-black-rich border px-3.5 py-2.5 sm:py-3 text-xs text-white cursor-pointer transition-colors flex items-center justify-between gap-2.5 select-none ${
                  isRoleFilterOpen || roleFilter !== 'all' ? 'border-gold text-gold shadow-[0_0_12px_rgba(212,175,55,0.2)]' : 'border-gold/30 hover:border-gold'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <SlidersHorizontal size={13} className="text-gold shrink-0" />
                  <span className="text-gray-400 text-[10px] font-mono uppercase">Role:</span>
                  <span className="font-mono text-white text-xs truncate font-medium">
                    {ROLE_FILTER_OPTIONS.find(o => o.value === roleFilter)?.label || 'All Roles'}
                  </span>
                </div>
                <ChevronDown size={14} className={`text-gold transition-transform duration-200 shrink-0 ml-1 ${isRoleFilterOpen ? 'rotate-180' : ''}`} />
              </div>

              {isRoleFilterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsRoleFilterOpen(false)}></div>
                  <div className="absolute z-50 mt-1 min-w-[210px] w-full sm:w-auto right-0 bg-black-pure border border-gold shadow-[0_8px_24px_rgba(0,0,0,0.9)] py-1">
                    {ROLE_FILTER_OPTIONS.map(opt => (
                      <div
                        key={opt.value}
                        className={`px-4 py-2.5 text-xs cursor-pointer select-none transition-colors duration-100 flex items-center justify-between gap-2 ${
                          reactingOption === `role-${opt.value}`
                            ? 'bg-gold/30 text-gold font-semibold'
                            : roleFilter === opt.value
                              ? 'bg-gold/20 text-gold font-medium'
                              : 'text-white hover:bg-gold/15 active:bg-gold/25'
                        }`}
                        onClick={() => handleSelectRole(opt.value)}
                      >
                        <span>{opt.label}</span>
                        {roleFilter === opt.value && <Check size={13} className="text-gold shrink-0" />}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Sort Selector Overlay */}
            <div className="relative">
              <div
                onClick={() => {
                  setIsSortOpen(!isSortOpen);
                  setIsSourceFilterOpen(false);
                  setIsRoleFilterOpen(false);
                }}
                className={`bg-black-rich border px-3.5 py-2.5 sm:py-3 text-xs text-white cursor-pointer transition-colors flex items-center justify-between gap-2.5 select-none ${
                  isSortOpen || sortOption !== 'newest' ? 'border-gold text-gold shadow-[0_0_12px_rgba(212,175,55,0.2)]' : 'border-gold/30 hover:border-gold'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <ArrowUpDown size={13} className="text-gold shrink-0" />
                  <span className="text-gray-400 text-[10px] font-mono uppercase">Sort:</span>
                  <span className="font-mono text-white text-xs truncate font-medium">
                    {SORT_OPTIONS.find(o => o.value === sortOption)?.label || 'Newest First'}
                  </span>
                </div>
                <ChevronDown size={14} className={`text-gold transition-transform duration-200 shrink-0 ml-1 ${isSortOpen ? 'rotate-180' : ''}`} />
              </div>

              {isSortOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)}></div>
                  <div className="absolute z-50 mt-1 min-w-[195px] w-full sm:w-auto right-0 bg-black-pure border border-gold shadow-[0_8px_24px_rgba(0,0,0,0.9)] py-1">
                    {SORT_OPTIONS.map(opt => (
                      <div
                        key={opt.value}
                        className={`px-4 py-2.5 text-xs cursor-pointer select-none transition-colors duration-100 flex items-center justify-between gap-2 ${
                          reactingOption === `sort-${opt.value}`
                            ? 'bg-gold/30 text-gold font-semibold'
                            : sortOption === opt.value
                              ? 'bg-gold/20 text-gold font-medium'
                              : 'text-white hover:bg-gold/15 active:bg-gold/25'
                        }`}
                        onClick={() => handleSelectSort(opt.value)}
                      >
                        <span>{opt.label}</span>
                        {sortOption === opt.value && <Check size={13} className="text-gold shrink-0" />}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* View Mode Toggle: Grid, List, Table */}
            <div className="flex items-center gap-2 flex-wrap">
              {onToggleNotificationRead && filteredUsers.some(u => !u.role?.includes('Admin') && !u.email?.toLowerCase().includes('admin') && !readNotificationIds.includes(u.id || `user_${u.email}`)) && (
                <button
                  type="button"
                  onClick={() => {
                    const unreadIds = filteredUsers
                      .filter(u => !u.role?.includes('Admin') && !u.email?.toLowerCase().includes('admin'))
                      .map(u => u.id || `user_${u.email}`)
                      .filter(id => !readNotificationIds.includes(id));
                    unreadIds.forEach(id => onToggleNotificationRead(id));
                  }}
                  className="px-2.5 py-1.5 sm:py-2 bg-gold/15 hover:bg-gold/25 border border-gold/40 text-gold hover:text-white text-[10px] font-mono uppercase tracking-wider rounded-sm transition-all cursor-pointer flex items-center gap-1.5 shadow-sm font-semibold h-[38px] sm:h-[42px]"
                  title="Mark all listed client profiles as read / reviewed"
                >
                  <Check size={11} />
                  <span>Mark All Read</span>
                </button>
              )}

              <div className="flex items-center border border-gold/30 bg-black-rich p-1 h-[38px] sm:h-[42px] gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('grid');
                    localStorage.setItem('natal_users_view_format', 'grid');
                  }}
                  className={`px-2.5 py-1.5 sm:px-3 sm:py-2 transition-colors cursor-pointer flex items-center gap-1.5 rounded-sm ${viewMode === 'grid' ? 'bg-gold text-black-pure font-bold shadow-sm' : 'text-gray-400 hover:text-white'}`}
                  title="Grid Format (2-Column Cards)"
                >
                  <LayoutGrid size={13} />
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('list');
                    localStorage.setItem('natal_users_view_format', 'list');
                  }}
                  className={`px-2.5 py-1.5 sm:px-3 sm:py-2 transition-colors cursor-pointer flex items-center gap-1.5 rounded-sm ${viewMode === 'list' ? 'bg-gold text-black-pure font-bold shadow-sm' : 'text-gray-400 hover:text-white'}`}
                  title="List Format (Single Column Rows)"
                >
                  <List size={13} />
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold">List</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('table');
                    localStorage.setItem('natal_users_view_format', 'table');
                  }}
                  className={`px-2.5 py-1.5 sm:px-3 sm:py-2 transition-colors cursor-pointer flex items-center gap-1.5 rounded-sm ${viewMode === 'table' ? 'bg-gold text-black-pure font-bold shadow-sm' : 'text-gray-400 hover:text-white'}`}
                  title="Dense Data Table"
                >
                  <Table size={13} />
                  <span className="text-[10px] font-mono uppercase tracking-wider">Table</span>
                </button>
              </div>
            </div>

            {(searchTerm || sourceFilter !== 'all' || roleFilter !== 'all' || sortOption !== 'newest') && (
              <button
                type="button"
                onClick={() => { setSearchTerm(''); setSourceFilter('all'); setRoleFilter('all'); setSortOption('newest'); }}
                className="text-[11px] font-mono text-gold hover:text-white underline transition-colors cursor-pointer px-1 py-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Counter Summary */}
        <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 pt-2.5 border-t border-white/10">
          <span>
            Showing <strong className="text-white">{filteredUsers.length}</strong> of <strong className="text-gold">{users.length}</strong> profiles
          </span>
          <span className="hidden sm:inline text-gray-500">
            Click any profile card for complete project notes & actions
          </span>
        </div>
      </div>

      {/* EMPTY STATE */}
      {filteredUsers.length === 0 ? (
        <div className="bg-black-pure border border-gold/20 p-10 sm:p-14 text-center rounded-sm shadow-xl text-gray-400">
          <div className="w-14 h-14 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-3 text-gold/60">
            <Users size={28} />
          </div>
          <h3 className="text-base font-heading text-white uppercase tracking-wider font-bold">
            No Matching Client Records Found
          </h3>
          <p className="text-xs text-gray-400 mt-1.5 max-w-md mx-auto leading-relaxed">
            {users.length === 0 
              ? "Clients who register an account, request a quote, or send a contact message are automatically compiled here in real time."
              : "No clients matched your active filter or search query. Reset filters to review the full directory."}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            {users.length === 0 ? (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-gold-dark via-gold to-gold-light hover:brightness-110 text-black-pure font-bold text-xs uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer shadow-md rounded-sm"
              >
                <UserPlus size={14} /> Add First Client
              </button>
            ) : (
              <button
                onClick={() => { setSearchTerm(''); setSourceFilter('all'); setRoleFilter('all'); setSortOption('newest'); }}
                className="px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider text-gold hover:text-white border border-gold/30 hover:border-gold rounded-sm transition-all cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID FORMAT (2-Column Executive Cards) */
        <div className="bg-black-pure border border-gold/30 p-4 sm:p-6 lg:p-7 rounded-sm shadow-xl space-y-3 font-sans">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <LayoutGrid size={16} className="text-gold" />
              <h3 className="text-sm font-heading uppercase tracking-widest text-gold font-bold">
                Client Directory Cards ({filteredUsers.length})
              </h3>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs flex-wrap">
              <span className="text-gray-400">Total:</span>
              <span className="text-gold font-bold">{users.length} Profiles</span>
              {adminCount > 0 && (
                <span className="text-purple-300 font-mono text-[10px] px-2 py-0.5 bg-purple-950/80 border border-purple-500/50 rounded-full flex items-center gap-1">
                  <ShieldCheck size={10} className="text-purple-400" />
                  {adminCount} Admin{adminCount > 1 ? 's' : ''}
                </span>
              )}
              {registrationCount > 0 && (
                <span className="text-gold font-mono text-[10px] px-2 py-0.5 bg-gold/15 border border-gold/30 rounded-full flex items-center gap-1">
                  <Sparkles size={10} className="text-gold" />
                  {registrationCount} VIP
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredUsers.map((u, uIdx) => {
              const initials = getUserInitials(u.name, u.email);
              const isCopied = copiedEmail === u.email;
              const isAdminItem = u.role === 'Administrator' || (u.email && u.email.toLowerCase().includes('admin'));
              const isVIPItem = !isAdminItem && (u.role === 'VIP Client' || u.source === 'Registration');
              const userTimestamp = getUserTimestamp(u);
              const isRecentUser = !isAdminItem && (userTimestamp > 0 ? (Date.now() - userTimestamp < 7 * 24 * 3600 * 1000) : (uIdx === 0 && !isAdminItem));
              const userNotifId = u.id || `user_${u.email}`;
              const isUnread = !readNotificationIds.includes(userNotifId) && !isAdminItem;

              return (
                <div 
                  key={u.id || u.email || `usr_grid_${uIdx}`}
                  className={`p-4 sm:p-5 rounded-sm border transition-all duration-200 flex flex-col justify-between ${
                    isUnread
                      ? 'border-gold/40 bg-[#141414] shadow-sm hover:border-gold/60'
                      : 'border-white/10 bg-[#0f0f0f] hover:border-gold/30 hover:bg-[#141414]'
                  }`}
                >
                  <div className="flex flex-col justify-between gap-4 h-full">
                    {/* Left & Middle Column: Avatar, Name, Badges, Details, Contacts */}
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      {/* Profile Avatar / Category Badge */}
                      <div className="relative shrink-0 mt-0.5">
                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full shrink-0 flex items-center justify-center border font-bold font-serif text-xs overflow-hidden ${
                          isAdminItem 
                            ? 'bg-white/5 border-gold/40 text-gold' 
                            : isVIPItem 
                            ? 'bg-white/5 border-gold/40 text-gold' 
                            : 'bg-white/5 border-white/15 text-gray-300'
                        }`}>
                          {u.photoURL ? (
                            <img src={u.photoURL} alt={u.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{initials || (isAdminItem ? 'ADM' : 'VIP')}</span>
                          )}
                        </div>
                        {/* Circular Live Dot at bottom of profile avatar */}
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center pointer-events-none" title="Live Profile">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500 border border-black-pure shadow-[0_0_6px_rgba(16,185,129,0.8)]"></span>
                        </span>
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        {/* Name & Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {isUnread && (
                            <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0 animate-pulse" title="Unread client registration" />
                          )}
                          <h4 
                            onClick={() => handleOpenUserDetail(u)}
                            className="text-sm font-semibold text-white tracking-wide truncate hover:text-gold transition-colors cursor-pointer"
                          >
                            {u.name || 'Anonymous Client'}
                          </h4>

                          {isRecentUser && (
                            <span className="text-[9px] font-mono px-2 py-0.5 bg-gradient-to-r from-gold-dark via-gold to-yellow-300 text-black-pure font-bold rounded shadow-[0_0_10px_rgba(212,175,55,0.45)] inline-flex items-center gap-1 uppercase tracking-wider animate-pulse">
                              <Sparkles size={9} /> NEW USER
                            </span>
                          )}

                          {/* Role badge */}
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border inline-flex items-center gap-1 font-semibold ${
                            isAdminItem
                              ? 'bg-purple-950/80 text-purple-300 border-purple-500/60 shadow-[0_0_8px_rgba(168,85,247,0.2)]'
                              : isVIPItem
                              ? 'bg-gold/15 text-gold border-gold/40 shadow-[0_0_8px_rgba(212,175,55,0.2)]'
                              : 'bg-emerald-950/70 text-emerald-400 border-emerald-500/40'
                          }`}>
                            {isAdminItem ? <ShieldCheck size={11} className="text-purple-400" /> : isVIPItem ? <Sparkles size={11} className="text-gold" /> : <UserCheck size={11} className="text-emerald-400" />}
                            {isAdminItem ? 'Administrator' : isVIPItem ? 'VIP Client' : (u.role || 'Client Lead')}
                          </span>

                          {/* Channel Source badge */}
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-white/5 text-gray-300 border border-white/10 rounded inline-flex items-center gap-1">
                            {u.source === 'Registration' && <Sparkles size={10} className="text-amber-400" />}
                            {u.source === 'Quotation Form' && <FileText size={10} className="text-emerald-400" />}
                            {u.source === 'Contact Form' && <Mail size={10} className="text-blue-400" />}
                            <span>{u.source === 'Registration' ? 'VIP Registration' : (u.source || 'Quotation Form')}</span>
                          </span>

                          {/* Service interest badge */}
                          {u.service && (
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-gold/10 text-gold border border-gold/25 rounded truncate max-w-[200px] sm:max-w-[280px]">
                              {u.service}
                            </span>
                          )}

                          {/* Budget tier */}
                          {u.estimatedBudget && (
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 rounded">
                              {u.estimatedBudget}
                            </span>
                          )}
                        </div>

                        {/* Details / Excerpt / Scope Notes */}
                        {(u.details || (u.activities && u.activities[0]?.title)) && (
                          <p className="text-xs text-gray-300 font-sans leading-relaxed line-clamp-2">
                            {u.details || u.activities[0]?.title}
                          </p>
                        )}

                        {/* Metadata line: Email, Phone, Joined, Recorded Actions */}
                        <div className="flex items-center gap-3 text-[11px] text-gray-400 flex-wrap pt-0.5">
                          {u.email && (
                            <div className="flex items-center gap-1 font-mono text-gray-300">
                              <Mail size={11} className="text-gray-500" />
                              <a href={`mailto:${u.email}`} className="hover:text-gold transition-colors truncate max-w-[190px]">
                                {u.email}
                              </a>
                              <button
                                type="button"
                                onClick={() => handleCopyEmail(u.email)}
                                className="text-gray-500 hover:text-gold p-0.5 transition-colors cursor-pointer"
                                title="Copy email address"
                              >
                                {isCopied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                              </button>
                              {isCopied && <span className="text-emerald-400 text-[9px] font-bold">Copied!</span>}
                            </div>
                          )}

                          {u.phone && (
                            <div className="flex items-center gap-1 font-mono text-gray-300">
                              <Phone size={11} className="text-gray-500" />
                              <a href={`tel:${u.phone}`} className="hover:text-gold transition-colors">
                                {u.phone}
                              </a>
                            </div>
                          )}

                          <span className="text-gray-500 font-mono text-[10px]">
                            Joined: {formatDate(u.createdAt)}
                          </span>

                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-gold/80 px-2 py-0.5 bg-gold/10 border border-gold/20 rounded">
                            <Zap size={10} className="text-gold" />
                            <span>{u.activities?.length || u.activityCount || 1} {((u.activities?.length || u.activityCount || 1) === 1) ? 'Action' : 'Actions'}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions Bar (Mark Read, WhatsApp, View Profile/Details, Delete) */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap pt-3 border-t border-white/5 w-full justify-end">
                      {/* Mark as Read / Reviewed Button */}
                      {onToggleNotificationRead && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleNotificationRead(userNotifId);
                          }}
                          className={`px-2.5 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm transition-all cursor-pointer flex items-center gap-1.5 border ${
                            isUnread
                              ? 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/50 text-emerald-300 font-bold'
                              : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border-white/10'
                          }`}
                          title={isUnread ? 'Mark this client profile as reviewed' : 'Mark as unread'}
                        >
                          <CheckCircle2 size={12} className={isUnread ? 'text-emerald-400' : 'text-gray-500'} />
                          <span>{isUnread ? 'Mark Read' : 'Reviewed'}</span>
                        </button>
                      )}

                      {/* Direct WhatsApp Button */}
                      {u.phone && (
                        <a
                          href={`https://wa.me/${normalizeWhatsAppNumber(u.phone)}?text=${encodeURIComponent(`Hello ${u.name || 'valued client'}, this is Natal Interior Design regarding your inquiry.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 hover:text-white rounded-sm transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                          title="Open WhatsApp chat with client"
                        >
                          <MessageSquare size={12} />
                          <span>WhatsApp</span>
                        </a>
                      )}

                      {/* View Profile Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenUserDetail(u)}
                        className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider bg-gold/10 hover:bg-gold/25 border border-gold/30 text-gold hover:text-white rounded-sm transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Open full client dossier & edit profile"
                      >
                        <span>View Profile &rarr;</span>
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => onDeleteUser(u)}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-950/40 rounded transition-colors cursor-pointer border border-transparent hover:border-red-500/30"
                        title="Delete client record"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : viewMode === 'list' ? (
        /* LIST FORMAT (Single Column Compact Rows - Aligned with Notifications & Leads List Format) */
        <div className="bg-black-pure border border-gold/30 p-4 sm:p-6 lg:p-7 rounded-sm shadow-xl space-y-3 font-sans">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <List size={16} className="text-gold" />
              <h3 className="text-sm font-heading uppercase tracking-widest text-gold font-bold">
                Client Directory List ({filteredUsers.length})
              </h3>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs flex-wrap">
              <span className="text-gray-400">Total:</span>
              <span className="text-gold font-bold">{users.length} Profiles</span>
              {adminCount > 0 && (
                <span className="text-purple-300 font-mono text-[10px] px-2 py-0.5 bg-purple-950/80 border border-purple-500/50 rounded-full flex items-center gap-1">
                  <ShieldCheck size={10} className="text-purple-400" />
                  {adminCount} Admin{adminCount > 1 ? 's' : ''}
                </span>
              )}
              {registrationCount > 0 && (
                <span className="text-gold font-mono text-[10px] px-2 py-0.5 bg-gold/15 border border-gold/30 rounded-full flex items-center gap-1">
                  <Sparkles size={10} className="text-gold" />
                  {registrationCount} VIP
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3 w-full">
            {filteredUsers.map((u, uIdx) => {
              const initials = getUserInitials(u.name, u.email);
              const isCopied = copiedEmail === u.email;
              const isAdminItem = u.role === 'Administrator' || (u.email && u.email.toLowerCase().includes('admin'));
              const isVIPItem = !isAdminItem && (u.role === 'VIP Client' || u.source === 'Registration');
              const userTimestamp = getUserTimestamp(u);
              const isRecentUser = !isAdminItem && (userTimestamp > 0 ? (Date.now() - userTimestamp < 7 * 24 * 3600 * 1000) : (uIdx === 0 && !isAdminItem));
              const userNotifId = u.id || `user_${u.email}`;
              const isUnread = !readNotificationIds.includes(userNotifId) && !isAdminItem;

              return (
                <div 
                  key={u.id || u.email || `usr_row_${uIdx}`}
                  className={`p-4 sm:p-5 rounded-sm border transition-all duration-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 ${
                    isUnread
                      ? 'border-gold/50 bg-[#141414] shadow-md hover:border-gold/70'
                      : 'border-white/10 bg-[#0f0f0f] hover:border-white/20 hover:bg-[#141414]'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                    {/* Profile Avatar / Badge */}
                    <div className="relative shrink-0 mt-0.5 sm:mt-0">
                      <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center border font-bold font-serif text-xs overflow-hidden ${
                        isAdminItem ? 'bg-white/5 border-gold/40 text-gold' : isVIPItem ? 'bg-white/5 border-gold/40 text-gold' : 'bg-white/5 border-white/15 text-gray-300'
                      }`}>
                        {u.photoURL ? (
                          <img src={u.photoURL} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{initials || (isAdminItem ? 'ADM' : 'VIP')}</span>
                        )}
                      </div>
                      {isUnread && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-gold border-2 border-black-pure animate-pulse" title="Unread profile" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 
                          onClick={() => handleOpenUserDetail(u)}
                          className="text-sm font-semibold text-white tracking-wide truncate hover:text-gold transition-colors cursor-pointer"
                        >
                          {u.name || 'Anonymous Client'}
                        </h4>

                        {isRecentUser && (
                          <span className="text-[9px] font-mono px-2 py-0.5 bg-gradient-to-r from-gold-dark via-gold to-yellow-300 text-black-pure font-bold rounded shadow-sm inline-flex items-center gap-1 uppercase tracking-wider animate-pulse">
                            <Sparkles size={9} /> NEW USER
                          </span>
                        )}

                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border inline-flex items-center gap-1 font-semibold ${
                          isAdminItem
                            ? 'bg-purple-950/80 text-purple-300 border-purple-500/60'
                            : isVIPItem
                            ? 'bg-gold/15 text-gold border-gold/40'
                            : 'bg-emerald-950/70 text-emerald-400 border-emerald-500/40'
                        }`}>
                          {isAdminItem ? <ShieldCheck size={11} className="text-purple-400" /> : isVIPItem ? <Sparkles size={11} className="text-gold" /> : <UserCheck size={11} className="text-emerald-400" />}
                          {isAdminItem ? 'Administrator' : isVIPItem ? 'VIP Client' : (u.role || 'Client Lead')}
                        </span>

                        <span className="text-[10px] font-mono px-2 py-0.5 bg-white/5 text-gray-300 border border-white/10 rounded">
                          {u.source === 'Registration' ? 'VIP Registration' : (u.source || 'Quotation Form')}
                        </span>

                        {u.service && (
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-gold/10 text-gold border border-gold/25 rounded truncate max-w-[200px]">
                            {u.service}
                          </span>
                        )}

                        {u.estimatedBudget && (
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 rounded">
                            {u.estimatedBudget}
                          </span>
                        )}
                      </div>

                      {u.details && (
                        <p className="text-xs text-gray-300 font-sans line-clamp-1">
                          {u.details}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-gray-400 flex-wrap">
                        {u.email && (
                          <div className="flex items-center gap-1 font-mono text-gray-300">
                            <Mail size={11} className="text-gray-500" />
                            <a href={`mailto:${u.email}`} className="hover:text-gold transition-colors truncate max-w-[190px]">
                              {u.email}
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopyEmail(u.email)}
                              className="text-gray-500 hover:text-gold p-0.5 transition-colors cursor-pointer"
                              title="Copy email"
                            >
                              {isCopied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                            </button>
                            {isCopied && <span className="text-emerald-400 text-[9px] font-bold">Copied!</span>}
                          </div>
                        )}

                        {u.phone && (
                          <div className="flex items-center gap-1 font-mono text-gray-300">
                            <Phone size={11} className="text-gray-500" />
                            <a href={`tel:${u.phone}`} className="hover:text-gold transition-colors">{u.phone}</a>
                          </div>
                        )}

                        <span className="text-gray-500 font-mono text-[10px]">Joined: {formatDate(u.createdAt)}</span>

                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-gold/80 px-2 py-0.5 bg-gold/10 border border-gold/20 rounded">
                          <Zap size={10} className="text-gold" />
                          <span>{u.activities?.length || u.activityCount || 1} {((u.activities?.length || u.activityCount || 1) === 1) ? 'Action' : 'Actions'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-white/5">
                    {/* Mark as Read / Reviewed Button */}
                    {onToggleNotificationRead && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleNotificationRead(userNotifId);
                        }}
                        className={`px-2.5 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm transition-all cursor-pointer flex items-center gap-1.5 border ${
                          isUnread
                            ? 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/50 text-emerald-300 font-bold'
                            : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border-white/10'
                        }`}
                        title={isUnread ? 'Mark this client profile as reviewed' : 'Mark as unread'}
                      >
                        <CheckCircle2 size={12} className={isUnread ? 'text-emerald-400' : 'text-gray-500'} />
                        <span>{isUnread ? 'Mark Read' : 'Reviewed'}</span>
                      </button>
                    )}

                    {u.phone && (
                      <a
                        href={`https://wa.me/${normalizeWhatsAppNumber(u.phone)}?text=${encodeURIComponent(`Hello ${u.name || 'valued client'}, this is Natal Interior Design regarding your inquiry.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 text-xs font-mono uppercase tracking-wider bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 hover:text-white rounded-sm transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                        title="Open WhatsApp chat with client"
                      >
                        <MessageSquare size={12} />
                        <span>WhatsApp</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenUserDetail(u)}
                      className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider bg-gold/10 hover:bg-gold/25 border border-gold/30 text-gold hover:text-white rounded-sm transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Open full client dossier & edit profile"
                    >
                      <span>Profile &rarr;</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteUser(u)}
                      className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-950/40 rounded transition-colors cursor-pointer border border-transparent hover:border-red-500/30"
                      title="Delete client record"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* TABLE VIEW (Dense Enterprise Format) */
        <div className="bg-black-pure border border-gold/30 overflow-x-auto shadow-xl">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-black-rich border-b border-gold/20 text-[10px] font-mono uppercase text-gold tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Client Name</th>
                <th className="py-3.5 px-4">Role & Status</th>
                <th className="py-3.5 px-4">Channel Source</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4">Service / Interest</th>
                <th className="py-3.5 px-4">Recorded Activities</th>
                <th className="py-3.5 px-4">Date Added</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 font-sans">
              {filteredUsers.map((u, idx) => {
                const initials = (u.name || 'User')
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);

                const isCopied = copiedEmail === u.email;

                return (
                  <tr 
                    key={u.id || u.email || `tbl_${idx}`} 
                    className="hover:bg-gold/[0.03] transition-colors group cursor-pointer"
                    onClick={() => handleOpenUserDetail(u)}
                  >
                    {/* Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/30 text-gold font-bold font-serif flex items-center justify-center text-xs overflow-hidden">
                            {u.photoURL ? (
                              <img src={u.photoURL} alt={u.name} className="w-full h-full object-cover" />
                            ) : (
                              <span>{initials || 'VIP'}</span>
                            )}
                          </div>
                          {/* Circular Live Dot at bottom of profile avatar */}
                          <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center pointer-events-none">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500 border border-black-pure shadow-[0_0_6px_rgba(16,185,129,0.8)]"></span>
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-white group-hover:text-gold transition-colors block">
                              {u.name || 'Anonymous Client'}
                            </span>
                            {!u.role?.includes('Admin') && !u.email?.toLowerCase().includes('admin') && ((getUserTimestamp(u) > 0 && Date.now() - getUserTimestamp(u) < 7 * 24 * 3600 * 1000) || (idx === 0 && !u.role?.includes('Admin') && !u.email?.toLowerCase().includes('admin'))) && (
                              <span className="text-[8px] font-mono px-1.5 py-0.2 bg-gold text-black-pure font-bold rounded shadow-sm inline-flex items-center gap-0.5">
                                <Sparkles size={8} /> NEW
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-gray-500">{u.id || 'Verified Profile'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Role & Status */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold inline-flex items-center gap-1 ${
                          u.role === 'Administrator' || (u.email && u.email.toLowerCase().includes('admin'))
                            ? 'bg-purple-950/80 text-purple-300 border border-purple-500/60 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                            : u.role === 'VIP Client'
                            ? 'bg-gold/20 text-gold border border-gold/30'
                            : u.role === 'Client Lead'
                            ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-500/40'
                            : 'bg-white/10 text-gray-300 border border-white/15'
                        }`}>
                          {(u.role === 'Administrator' || (u.email && u.email.toLowerCase().includes('admin'))) && (
                            <ShieldCheck size={11} className="text-purple-400" />
                          )}
                          <span>
                            {(u.role === 'Administrator' || (u.email && u.email.toLowerCase().includes('admin'))) ? 'Administrator' : (u.role || 'Client Lead')}
                          </span>
                        </span>
                        <div className="text-[10px] font-mono text-gray-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span>{u.status || ((u.role === 'Administrator' || (u.email && u.email.toLowerCase().includes('admin'))) ? 'Active Administrator' : 'Active')}</span>
                        </div>
                      </div>
                    </td>

                    {/* Channel Source */}
                    <td className="py-3.5 px-4">
                      <span className="text-[11px] font-mono text-gray-300 flex items-center gap-1.5">
                        {u.source === 'Registration' && <Sparkles size={12} className="text-amber-400" />}
                        {u.source === 'Quotation Form' && <FileText size={12} className="text-emerald-400" />}
                        {u.source === 'Contact Form' && <Mail size={12} className="text-blue-400" />}
                        <span>{u.source || 'Quotation Form'}</span>
                      </span>
                    </td>

                    {/* Contact Info */}
                    <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-1 font-mono text-[11px]">
                        {u.email ? (
                          <div className="flex items-center gap-1.5 text-gray-300">
                            <a href={`mailto:${u.email}`} className="hover:text-gold transition-colors truncate max-w-[160px]">
                              {u.email}
                            </a>
                            <button
                              onClick={() => handleCopyEmail(u.email)}
                              className="text-gray-500 hover:text-gold p-0.5 cursor-pointer"
                              title="Copy email"
                            >
                              {isCopied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-600 italic">No email</span>
                        )}

                        {u.phone ? (
                          <div className="text-gray-400">
                            <a href={`tel:${u.phone}`} className="hover:text-gold transition-colors">
                              {u.phone}
                            </a>
                          </div>
                        ) : (
                          <span className="text-gray-600 italic">No phone</span>
                        )}
                      </div>
                    </td>

                    {/* Service */}
                    <td className="py-3.5 px-4">
                      <span className="text-xs text-gold font-medium block truncate max-w-[180px]">
                        {u.service || 'General Interior Design'}
                      </span>
                      {u.details && (
                        <span className="text-[10px] text-gray-500 line-clamp-1 italic mt-0.5 max-w-[200px]">
                          "{u.details}"
                        </span>
                      )}
                    </td>

                    {/* Recorded Activities */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gold/15 text-gold border border-gold/30 flex items-center gap-1 font-semibold">
                            <Zap size={10} className="text-gold" />
                            {u.activities?.length || u.activityCount || 1} {((u.activities?.length || u.activityCount || 1) === 1) ? 'Action' : 'Actions'}
                          </span>
                        </div>
                        {u.activities && u.activities.length > 0 && (
                          <div className="text-[10px] font-mono text-gray-400 flex items-center gap-1 truncate max-w-[170px]" title={u.activities[0].title}>
                            {getActivityIcon(u.activities[0].type, 11)}
                            <span className="truncate text-gray-300">{u.activities[0].title}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-gray-400 whitespace-nowrap">
                      {formatDate(u.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {onToggleNotificationRead && (
                          <button
                            type="button"
                            onClick={() => {
                              const userNotifId = u.id || `user_${u.email}`;
                              onToggleNotificationRead(userNotifId);
                            }}
                            className={`px-2 py-1 text-[10px] font-mono uppercase tracking-wider rounded-sm transition-all cursor-pointer flex items-center gap-1 border ${
                              !readNotificationIds.includes(u.id || `user_${u.email}`) && !u.role?.includes('Admin') && !u.email?.toLowerCase().includes('admin')
                                ? 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/50 text-emerald-300 font-bold'
                                : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border-white/10'
                            }`}
                            title={!readNotificationIds.includes(u.id || `user_${u.email}`) ? 'Mark as read' : 'Mark as unread'}
                          >
                            <CheckCircle2 size={11} className={!readNotificationIds.includes(u.id || `user_${u.email}`) && !u.role?.includes('Admin') && !u.email?.toLowerCase().includes('admin') ? 'text-emerald-400' : 'text-gray-500'} />
                            <span>{!readNotificationIds.includes(u.id || `user_${u.email}`) && !u.role?.includes('Admin') && !u.email?.toLowerCase().includes('admin') ? 'Mark Read' : 'Reviewed'}</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenUserDetail(u)}
                          className="px-2.5 py-1 bg-white/5 hover:bg-gold hover:text-black-pure border border-white/10 hover:border-gold text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => onDeleteUser(u)}
                          className="text-gray-500 hover:text-red-400 p-1.5 transition-colors cursor-pointer"
                          title="Delete user"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW FULL PROFILE / INQUIRY MODAL */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-black-pure border border-gold/60 w-full max-w-xl p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.95)] relative animate-fadeIn max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setSelectedUserDetail(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-white p-2 cursor-pointer transition-colors"
            >
              <X size={20} />
            </button>

            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-gold/20">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0 group">
                  <div 
                    onClick={() => userPhotoInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        userPhotoInputRef.current?.click();
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    title="Click directly to upload or change profile photo"
                    className="w-16 h-16 rounded-full bg-gold/15 border-2 border-gold hover:border-yellow-300 text-gold font-bold font-serif text-2xl flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.3)] overflow-hidden cursor-pointer transition-all relative focus:outline-none focus:ring-2 focus:ring-gold"
                  >
                    {selectedUserDetail.photoURL ? (
                      <img src={selectedUserDetail.photoURL} alt={selectedUserDetail.name} className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
                    ) : (
                      <span>{getUserInitials(selectedUserDetail.name, selectedUserDetail.email) || (selectedUserDetail.name || 'U')[0].toUpperCase()}</span>
                    )}

                    {/* Interactive hover overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white pointer-events-none">
                      <Camera size={15} className="text-yellow-300 animate-bounce" />
                      <span className="text-[8px] font-mono uppercase tracking-wider text-white">Upload</span>
                    </div>
                  </div>
                  {/* Circular Live Dot at bottom of avatar */}
                  <span className="absolute -bottom-0.5 -left-0.5 flex h-3.5 w-3.5 items-center justify-center pointer-events-none" title="Live Profile">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-black-pure shadow-[0_0_8px_rgba(16,185,129,0.9)]"></span>
                  </span>
                  {/* Photo upload trigger button */}
                  <button
                    type="button"
                    onClick={() => userPhotoInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-gold text-black-pure shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer z-10"
                    title="Change / Upload Photo"
                  >
                    <Camera size={12} />
                  </button>
                  <input 
                    ref={userPhotoInputRef}
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleUploadUserPhoto}
                  />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-gold uppercase tracking-widest block">
                    {selectedUserDetail.role === 'Administrator' || (selectedUserDetail.email && selectedUserDetail.email.toLowerCase().includes('admin')) 
                      ? 'Administrator Profile' 
                      : 'Client Profile Record'}
                  </span>
                  <h3 className="text-xl font-bold text-white uppercase tracking-wider mt-0.5">
                    {selectedUserDetail.name || 'Anonymous Client'}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded font-semibold uppercase flex items-center gap-1 ${
                      selectedUserDetail.role === 'Administrator' || (selectedUserDetail.email && selectedUserDetail.email.toLowerCase().includes('admin'))
                        ? 'bg-purple-950/80 text-purple-300 border border-purple-500/60 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                        : 'bg-gold/20 text-gold border border-gold/40'
                    }`}>
                      {(selectedUserDetail.role === 'Administrator' || (selectedUserDetail.email && selectedUserDetail.email.toLowerCase().includes('admin'))) && (
                        <ShieldCheck size={11} className="text-purple-400" />
                      )}
                      <span>
                        {(selectedUserDetail.role === 'Administrator' || (selectedUserDetail.email && selectedUserDetail.email.toLowerCase().includes('admin')))
                          ? 'Administrator'
                          : (selectedUserDetail.role || 'Client Lead')
                        }
                      </span>
                    </span>
                    <span className="text-[10px] font-mono text-gray-300 bg-white/5 px-2.5 py-0.5 rounded border border-white/15">
                      Source: {selectedUserDetail.source || 'Registration'}
                    </span>
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded border border-emerald-500/30 text-emerald-400 bg-emerald-950/50 flex items-center gap-1.5 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span>{selectedUserDetail.status || ((selectedUserDetail.role === 'Administrator' || (selectedUserDetail.email && selectedUserDetail.email.toLowerCase().includes('admin'))) ? 'Active Administrator' : 'Active')}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons in Header: Photo & Edit */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => userPhotoInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-mono border border-gold/50 bg-gold/10 hover:bg-gold/20 text-gold transition-colors flex items-center gap-1.5 cursor-pointer rounded-sm"
                >
                  <Camera size={13} />
                  <span>{selectedUserDetail.photoURL ? 'Change Photo' : 'Upload Photo'}</span>
                </button>
                {selectedUserDetail.photoURL && (
                  <button
                    type="button"
                    onClick={handleRemoveUserPhoto}
                    className="px-2.5 py-1.5 text-xs font-mono text-red-400 hover:text-red-300 border border-red-500/30 hover:bg-red-950/40 transition-colors cursor-pointer rounded-sm"
                    title="Remove Photo"
                  >
                    Remove
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsEditingUser(!isEditingUser)}
                  className={`px-3 py-1.5 text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer rounded-sm ${
                    isEditingUser ? 'bg-gold text-black-pure font-bold' : 'border border-white/20 text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Edit2 size={13} />
                  <span>{isEditingUser ? 'Cancel Edit' : 'Edit Profile'}</span>
                </button>
              </div>
            </div>

            {/* User Edit Notice Toast */}
            {userModalNotice && (
              <div className="my-3 p-3 bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs font-mono flex items-center gap-2 animate-fadeIn">
                <CheckCircle size={15} className="text-emerald-400 shrink-0" />
                <span>{userModalNotice}</span>
              </div>
            )}

            {/* Inline Profile Editing Form */}
            {isEditingUser && (
              <form onSubmit={handleSaveUserEdit} className="my-5 p-4 bg-black-rich border border-gold/50 space-y-3.5 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-heading uppercase text-gold font-bold tracking-wider flex items-center gap-1.5">
                    <Edit3 size={13} /> Edit Profile & Role Details
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">Syncs immediately with Nav Bar & Dashboard</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-mono uppercase text-gray-400">Full Name *</label>
                    </div>
                    <input 
                      type="text" 
                      required 
                      value={editName} 
                      onChange={(e) => {
                        const raw = e.target.value;
                        const clean = sanitizeNameInput(raw);
                        if (CONTAINS_DIGITS_OR_SYMBOLS_REGEX.test(raw) || (raw && raw !== clean)) {
                          setEditNameError('Full name must contain letters only (no numbers or symbols).');
                        } else {
                          setEditNameError('');
                        }
                        setEditName(clean);
                      }}
                      onKeyDown={(e) => handleNameKeyDown(e, setEditNameError)}
                      onPaste={(e) => handleNamePaste(e, setEditName, setEditNameError)}
                      inputMode="text"
                      autoComplete="name"
                      className={`w-full bg-black-pure border ${editNameError ? 'border-red-500/80 focus:border-red-500' : 'border-gold/30 focus:border-gold'} px-3 py-2 text-white text-xs focus:outline-none`}
                    />
                    {editNameError && (
                      <p className="text-[9px] font-mono text-red-400 mt-1 flex items-center gap-1.5">
                        <AlertCircle size={10} className="shrink-0" />
                        <span>{editNameError}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">Email Address *</label>
                    <input 
                      type="email" 
                      required 
                      value={editEmail} 
                      onChange={(e) => setEditEmail(e.target.value)} 
                      className="w-full bg-black-pure border border-gold/30 focus:border-gold px-3 py-2 text-white text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-mono uppercase text-gray-400">Phone / WhatsApp</label>
                    </div>
                    <input 
                      type="tel" 
                      maxLength={10}
                      value={editPhone} 
                      onChange={(e) => {
                        const clean = sanitizePhoneInput(e.target.value);
                        setEditPhone(clean);
                        if (editPhoneError) setEditPhoneError('');
                      }} 
                      onKeyDown={(e) => handlePhoneKeyDown(e, setEditPhoneError)}
                      onPaste={(e) => handlePhonePaste(e, setEditPhone, setEditPhoneError)}
                      inputMode="tel"
                      placeholder="0700000000"
                      className={`w-full bg-black-pure border ${editPhoneError ? 'border-red-500/80 focus:border-red-500' : 'border-gold/30 focus:border-gold'} px-3 py-2 text-white text-xs focus:outline-none`}
                    />
                    {editPhoneError && (
                      <p className="text-[9px] font-mono text-red-400 mt-1 flex items-center gap-1.5">
                        <AlertCircle size={10} className="shrink-0" />
                        <span>{editPhoneError}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">Account Role</label>
                    <select
                      value={editRole}
                      onChange={(e: any) => setEditRole(e.target.value)}
                      className="w-full bg-black-pure border border-gold/30 focus:border-gold px-3 py-2 text-white text-xs focus:outline-none"
                    >
                      <option value="Administrator">Administrator (Master System Access)</option>
                      <option value="VIP Client">VIP Client</option>
                      <option value="Client Lead">Client Lead</option>
                      <option value="Registered Member">Registered Member</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">Primary Discipline / Service</label>
                    <input 
                      type="text" 
                      value={editService} 
                      onChange={(e) => setEditService(e.target.value)} 
                      placeholder="e.g. Gypsum Ceilings & Lighting"
                      className="w-full bg-black-pure border border-gold/30 focus:border-gold px-3 py-2 text-white text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">Account Status</label>
                    <input 
                      type="text" 
                      value={editStatus} 
                      onChange={(e) => setEditStatus(e.target.value)} 
                      placeholder="Active / Pending Consultation"
                      className="w-full bg-black-pure border border-gold/30 focus:border-gold px-3 py-2 text-white text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsEditingUser(false)}
                    className="px-3.5 py-1.5 text-xs font-mono text-gray-400 hover:text-white border border-white/10 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingUserEdit}
                    className="px-4 py-1.5 bg-gradient-to-r from-gold-dark via-gold to-gold-light hover:brightness-110 text-black-pure font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    <Save size={13} />
                    <span>{isSavingUserEdit ? 'Saving...' : 'Save Profile Changes'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Key Information in List Format */}
            <div className="space-y-2.5 my-6 text-xs font-sans">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-black-rich border border-white/10 gap-1.5">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User size={12} className="text-gold" /> Full Name
                </span>
                <span className="font-bold text-white text-sm">{selectedUserDetail.name || 'Anonymous Client'}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-black-rich border border-white/10 gap-1.5">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail size={12} className="text-gold" /> Email Address
                </span>
                {selectedUserDetail.email ? (
                  <div className="flex items-center gap-2">
                    <a href={`mailto:${selectedUserDetail.email}`} className="text-white hover:text-gold font-mono text-xs">
                      {selectedUserDetail.email}
                    </a>
                    <button
                      onClick={() => handleCopyEmail(selectedUserDetail.email)}
                      className="text-gray-400 hover:text-gold p-1 cursor-pointer"
                      title="Copy email"
                    >
                      {copiedEmail === selectedUserDetail.email ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                ) : (
                  <span className="text-gray-500 italic">Not provided</span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-black-rich border border-white/10 gap-1.5">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone size={12} className="text-gold" /> Phone / WhatsApp
                </span>
                {selectedUserDetail.phone ? (
                  <div className="flex items-center gap-2">
                    <a href={`tel:${selectedUserDetail.phone}`} className="text-white hover:text-gold font-mono text-xs">
                      {selectedUserDetail.phone}
                    </a>
                    <a
                      href={`https://wa.me/${normalizeWhatsAppNumber(selectedUserDetail.phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-0.5 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono flex items-center gap-1 hover:bg-emerald-900/60 transition-colors"
                      title="Open WhatsApp"
                    >
                      <MessageSquare size={11} /> WhatsApp
                    </a>
                  </div>
                ) : (
                  <span className="text-gray-500 italic">Not provided</span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-black-rich border border-white/10 gap-1.5">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={12} className="text-gold" /> Membership Role & Tier
                </span>
                <span className="text-gold font-bold text-xs flex items-center gap-1.5">
                  {selectedUserDetail.role === 'Administrator' ? (
                    <span className="text-purple-300">System Administrator</span>
                  ) : (
                    <span>{selectedUserDetail.vipTier || 'VIP Gold Member'}</span>
                  )}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-black-rich border border-white/10 gap-1.5">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={12} className="text-gold" /> Primary Discipline
                </span>
                <span className="text-gold font-medium text-xs">
                  {selectedUserDetail.service || 'General Interior Design'}
                </span>
              </div>

              {selectedUserDetail.projectType && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-black-rich border border-white/10 gap-1.5">
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Tag size={12} className="text-gold" /> Property / Project Type
                  </span>
                  <span className="text-white font-mono text-xs">{selectedUserDetail.projectType}</span>
                </div>
              )}

              {selectedUserDetail.estimatedBudget && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-black-rich border border-white/10 gap-1.5">
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle size={12} className="text-gold" /> Estimated Scope / Budget
                  </span>
                  <span className="text-white font-mono text-xs">{selectedUserDetail.estimatedBudget}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-black-rich border border-white/10 gap-1.5">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={12} className="text-gold" /> Registration Date
                </span>
                <span className="text-gray-300 font-mono text-xs">{formatDate(selectedUserDetail.createdAt)}</span>
              </div>

              {/* Complete Project Scope Notes */}
              {selectedUserDetail.details ? (
                <div className="bg-black-rich p-4 border border-gold/30">
                  <span className="text-[10px] font-mono text-gold uppercase tracking-wider block mb-2 font-bold flex items-center gap-1.5">
                    <FileText size={13} className="text-gold" />
                    <span>Submitted Project Scope & Requirements:</span>
                  </span>
                  <p className="text-gray-200 text-xs leading-relaxed whitespace-pre-wrap font-sans bg-black-pure/70 p-3.5 border border-white/5">
                    {selectedUserDetail.details}
                  </p>
                </div>
              ) : (
                <div className="bg-black-rich p-3.5 border border-white/5 text-gray-500 text-xs italic">
                  No additional project scope notes submitted for this profile.
                </div>
              )}

              {/* Comprehensive Chronological Activity History & Audit Trail */}
              <div className="bg-black-rich p-4 sm:p-5 border border-gold/40 shadow-inner space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Zap size={15} className="text-amber-400" />
                    <span className="text-xs font-heading uppercase tracking-wider text-white font-bold">
                      Chronological Activity Trail
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gold/15 text-gold border border-gold/30 font-semibold">
                      {selectedUserDetail.activities?.length || selectedUserDetail.activityCount || 1} Actions
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAddingNote(!isAddingNote)}
                    className="text-[11px] font-mono text-gold hover:text-white flex items-center gap-1 px-2.5 py-1 bg-gold/10 hover:bg-gold/20 border border-gold/30 cursor-pointer transition-colors"
                  >
                    <PlusCircle size={13} />
                    <span>{isAddingNote ? 'Cancel Note' : 'Log Activity / Note'}</span>
                  </button>
                </div>

                {/* Log Note / Follow-up Action Form */}
                {isAddingNote && (
                  <form onSubmit={handleAddNoteToUser} className="bg-black-pure p-3.5 border border-gold/50 space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-gold uppercase tracking-wider font-semibold">
                        Record New Activity / Client Note
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">
                          Action / Activity Title *
                        </label>
                        <input
                          type="text"
                          required
                          value={noteTitle}
                          onChange={(e) => setNoteTitle(e.target.value)}
                          placeholder="e.g. Site Visit Measurement Scheduled"
                          className="w-full bg-black-rich border border-gold/30 focus:border-gold px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">
                          Activity Type
                        </label>
                        <select
                          value={noteType}
                          onChange={(e: any) => setNoteType(e.target.value)}
                          className="w-full bg-black-rich border border-gold/30 focus:border-gold px-2.5 py-2 text-xs text-white focus:outline-none"
                        >
                          <option value="custom">Admin Note</option>
                          <option value="call">Phone Call</option>
                          <option value="quotation">Quotation Update</option>
                          <option value="specs_inquiry">Specs Consultation</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">
                        Detailed Description / Scope Notes
                      </label>
                      <textarea
                        rows={2}
                        value={noteDesc}
                        onChange={(e) => setNoteDesc(e.target.value)}
                        placeholder="Details of client discussion, agreed milestones, or next steps..."
                        className="w-full bg-black-rich border border-gold/30 focus:border-gold px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingNote(false)}
                        className="px-3 py-1.5 border border-white/10 hover:border-white/30 text-gray-400 hover:text-white text-xs font-mono uppercase cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingNote}
                        className="px-4 py-1.5 bg-gradient-to-r from-gold-dark via-gold to-gold-light hover:brightness-110 text-black-pure font-bold text-xs uppercase tracking-wider cursor-pointer shadow-sm disabled:opacity-50"
                      >
                        {isSubmittingNote ? 'Saving...' : 'Save Activity'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Timeline List */}
                <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                  {selectedUserDetail.activities && selectedUserDetail.activities.length > 0 ? (
                    selectedUserDetail.activities.map((act: any, aIdx: number) => (
                      <div
                        key={act.id || aIdx}
                        className="bg-black-pure p-3 border border-white/10 hover:border-gold/40 transition-colors space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-[9px] font-mono px-2 py-0.5 rounded border uppercase font-bold flex items-center gap-1 ${getActivityBadgeStyle(act.type)}`}>
                              {getActivityIcon(act.type, 11)}
                              <span>{act.type}</span>
                            </span>
                            <span className="font-semibold text-white text-xs truncate">
                              {act.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-400 shrink-0">
                            <Clock size={11} className="text-gold/70" />
                            <span>{formatActivityTime(act.timestamp)}</span>
                          </div>
                        </div>

                        {act.description && (
                          <p className="text-[11px] text-gray-300 leading-relaxed font-sans pl-1">
                            {act.description}
                          </p>
                        )}

                        {act.metadata && Object.keys(act.metadata).length > 0 && (
                          <div className="pt-1.5 border-t border-white/5 flex items-center gap-2 flex-wrap text-[9px] font-mono text-gray-500">
                            {act.metadata.service && (
                              <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10 text-gold">
                                Service: {act.metadata.service}
                              </span>
                            )}
                            {act.metadata.phoneNumber && (
                              <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10 text-gray-300">
                                Line: {act.metadata.phoneNumber}
                              </span>
                            )}
                            {act.metadata.channel && (
                              <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10 text-gray-400">
                                Via: {act.metadata.channel}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    /* Initial synthetic activity fallback */
                    <div className="bg-black-pure p-3 border border-white/10 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded border uppercase font-bold flex items-center gap-1 ${getActivityBadgeStyle(selectedUserDetail.source === 'Registration' ? 'registration' : 'quotation')}`}>
                            {getActivityIcon(selectedUserDetail.source === 'Registration' ? 'registration' : 'quotation', 11)}
                            <span>{selectedUserDetail.source || 'Quotation Form'}</span>
                          </span>
                          <span className="font-semibold text-white text-xs">
                            Initial Profile Created
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-gray-400">
                          {formatActivityTime(selectedUserDetail.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-300 pl-1">
                        Client recorded via {selectedUserDetail.source || 'Quotation Form'}.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10 gap-3 flex-wrap">
              <button
                onClick={() => {
                  onDeleteUser(selectedUserDetail);
                  setSelectedUserDetail(null);
                }}
                className="text-xs font-mono text-red-400 hover:text-red-300 flex items-center gap-1.5 transition-colors cursor-pointer py-1.5"
              >
                <Trash2 size={14} /> Remove User Record
              </button>

              <div className="flex items-center gap-2.5">
                {selectedUserDetail.email && (
                  <button
                    type="button"
                    onClick={() => handleCopyEmail(selectedUserDetail.email)}
                    className="px-4 py-2.5 bg-gradient-to-r from-gold-dark via-gold to-gold-light hover:brightness-110 text-black-pure font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    {copiedEmail === selectedUserDetail.email ? (
                      <>
                        <Check size={13} />
                        <span>Email Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Copy Client Email</span>
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={() => setSelectedUserDetail(null)}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD CLIENT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-black-pure border border-gold/60 w-full max-w-lg p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.95)] relative animate-fadeIn max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-white p-2 cursor-pointer transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-gold/20 mb-5">
              <div className="w-10 h-10 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center text-gold shadow-[0_0_12px_rgba(212,175,55,0.3)]">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-wider font-heading flex items-center gap-2">
                  <span>Register VIP Client / Add User</span>
                </h3>
                <p className="text-[11px] text-gray-400">Enroll a client with VIP Atelier membership status and architectural specifications</p>
              </div>
            </div>

            {/* VIP Atelier Privileges Banner */}
            <div className="p-3 bg-gradient-to-r from-gold/15 via-black-rich to-gold/10 border border-gold/40 mb-4 text-[11px]">
              <div className="flex items-center gap-1.5 text-gold font-bold uppercase tracking-wider mb-1.5 font-mono">
                <Sparkles size={12} className="text-gold" />
                <span>Natal Atelier VIP Membership Privileges</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-gray-300">
                <span className="flex items-center gap-1"><Check size={11} className="text-gold" /> Priority Gypsum Survey</span>
                <span className="flex items-center gap-1"><Check size={11} className="text-gold" /> Dedicated WhatsApp Line</span>
                <span className="flex items-center gap-1"><Check size={11} className="text-gold" /> 3D Ceiling Specs</span>
                <span className="flex items-center gap-1"><Check size={11} className="text-gold" /> Milestone Tracking</span>
              </div>
            </div>

            <form onSubmit={handleSubmitNewUser} className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-gray-300 font-mono text-[10px] uppercase font-semibold">
                    Client Full Name *
                  </label>
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const clean = sanitizeNameInput(raw);
                    if (CONTAINS_DIGITS_OR_SYMBOLS_REGEX.test(raw) || (raw && raw !== clean)) {
                      setNameError('Client name must contain letters only (no numbers or symbols).');
                    } else {
                      setNameError('');
                    }
                    setName(clean);
                  }}
                  onKeyDown={(e) => handleNameKeyDown(e, setNameError)}
                  onPaste={(e) => handleNamePaste(e, setName, setNameError)}
                  inputMode="text"
                  autoComplete="name"
                  placeholder="e.g. Jonathan Vance"
                  className={`w-full bg-black-rich border ${nameError ? 'border-red-500/80 focus:border-red-500' : 'border-gold/30 focus:border-gold'} p-2.5 text-white focus:outline-none transition-colors placeholder:text-gray-600`}
                />
                {nameError && (
                  <p className="text-[9px] font-mono text-red-400 mt-1 flex items-center gap-1.5">
                    <AlertCircle size={10} className="shrink-0" />
                    <span>{nameError}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-gray-300 font-mono text-[10px] uppercase mb-1 font-semibold">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="w-full bg-black-rich border border-gold/30 p-2.5 text-white focus:outline-none focus:border-gold transition-colors placeholder:text-gray-600 font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-gray-300 font-mono text-[10px] uppercase font-semibold">
                    Phone Number / WhatsApp
                  </label>
                </div>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => {
                    const clean = sanitizePhoneInput(e.target.value);
                    setPhone(clean);
                    if (phoneError) setPhoneError('');
                  }}
                  onKeyDown={(e) => handlePhoneKeyDown(e, setPhoneError)}
                  onPaste={(e) => handlePhonePaste(e, setPhone, setPhoneError)}
                  inputMode="tel"
                  placeholder="0700000000"
                  className={`w-full bg-black-rich border ${phoneError ? 'border-red-500/80 focus:border-red-500' : 'border-gold/30 focus:border-gold'} p-2.5 text-white focus:outline-none transition-colors placeholder:text-gray-600 font-mono`}
                />
                {phoneError && (
                  <p className="text-[9px] font-mono text-red-400 mt-1 flex items-center gap-1.5">
                    <AlertCircle size={10} className="shrink-0" />
                    <span>{phoneError}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <label className="block text-gray-300 font-mono text-[10px] uppercase mb-1 font-semibold">
                    Channel Source
                  </label>
                  <div
                    onClick={() => {
                      setIsModalSourceOpen(!isModalSourceOpen);
                      setIsModalRoleOpen(false);
                    }}
                    className="w-full bg-black-rich border border-gold/30 hover:border-gold p-2.5 text-white flex items-center justify-between cursor-pointer select-none transition-colors text-xs"
                  >
                    <span>{source === 'Registration' ? 'VIP Registration' : source}</span>
                    <ChevronDown size={14} className={`text-gold transition-transform duration-200 ${isModalSourceOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {isModalSourceOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsModalSourceOpen(false)}></div>
                      <div className="absolute z-50 mt-1 w-full bg-black-pure border border-gold shadow-[0_8px_24px_rgba(0,0,0,0.9)] py-1">
                        {(['Registration', 'Quotation Form', 'Contact Form'] as const).map(opt => (
                          <div
                            key={opt}
                            className={`px-3.5 py-2 text-xs cursor-pointer select-none transition-colors duration-100 flex items-center justify-between ${
                              reactingModalOption === `source-${opt}`
                                ? 'bg-gold/30 text-gold font-semibold'
                                : source === opt
                                  ? 'bg-gold/20 text-gold font-medium'
                                  : 'text-white hover:bg-gold/15 active:bg-gold/25'
                            }`}
                            onClick={() => {
                              setReactingModalOption(`source-${opt}`);
                              setTimeout(() => {
                                setSource(opt);
                                setReactingModalOption(null);
                                setIsModalSourceOpen(false);
                              }, 90);
                            }}
                          >
                            <span>{opt === 'Registration' ? 'VIP Registration' : opt}</span>
                            {source === opt && <Check size={12} className="text-gold shrink-0" />}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-gray-300 font-mono text-[10px] uppercase mb-1 font-semibold">
                    Role Classification
                  </label>
                  <div
                    onClick={() => {
                      setIsModalRoleOpen(!isModalRoleOpen);
                      setIsModalSourceOpen(false);
                    }}
                    className="w-full bg-black-rich border border-gold/30 hover:border-gold p-2.5 text-white flex items-center justify-between cursor-pointer select-none transition-colors text-xs"
                  >
                    <span className="flex items-center gap-1.5">
                      {role === 'VIP Client' && <Sparkles size={11} className="text-gold" />}
                      {role}
                    </span>
                    <ChevronDown size={14} className={`text-gold transition-transform duration-200 ${isModalRoleOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {isModalRoleOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsModalRoleOpen(false)}></div>
                      <div className="absolute z-50 mt-1 w-full bg-black-pure border border-gold shadow-[0_8px_24px_rgba(0,0,0,0.9)] py-1">
                        {(['VIP Client', 'Administrator', 'Client Lead', 'Registered Member'] as const).map(opt => (
                          <div
                            key={opt}
                            className={`px-3.5 py-2 text-xs cursor-pointer select-none transition-colors duration-100 flex items-center justify-between ${
                              reactingModalOption === `role-${opt}`
                                ? 'bg-gold/30 text-gold font-semibold'
                                : role === opt
                                  ? 'bg-gold/20 text-gold font-medium'
                                  : 'text-white hover:bg-gold/15 active:bg-gold/25'
                            }`}
                            onClick={() => {
                              setReactingModalOption(`role-${opt}`);
                              setTimeout(() => {
                                setRole(opt);
                                setReactingModalOption(null);
                                setIsModalRoleOpen(false);
                              }, 90);
                            }}
                          >
                            <span className="flex items-center gap-1.5">
                              {opt === 'VIP Client' && <Sparkles size={11} className="text-gold" />}
                              {opt}
                            </span>
                            {role === opt && <Check size={12} className="text-gold shrink-0" />}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Property Type & Budget Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-mono text-[10px] uppercase mb-1 font-semibold">
                    Property / Project Type
                  </label>
                  <select
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    className="w-full bg-black-rich border border-gold/30 p-2.5 text-white focus:outline-none focus:border-gold transition-colors text-xs"
                  >
                    {PROPERTY_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} className="bg-black-pure text-white">{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-mono text-[10px] uppercase mb-1 font-semibold">
                    Estimated Scope / Budget
                  </label>
                  <select
                    value={estimatedBudget}
                    onChange={(e) => setEstimatedBudget(e.target.value)}
                    className="w-full bg-black-rich border border-gold/30 p-2.5 text-white focus:outline-none focus:border-gold transition-colors text-xs"
                  >
                    {BUDGET_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} className="bg-black-pure text-white">{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-mono text-[10px] uppercase mb-1 font-semibold">
                  Discipline / Service of Interest
                </label>
                <input
                  type="text"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  placeholder="e.g. Gypsum Ceilings & Fine Wall Finishes"
                  className="w-full bg-black-rich border border-gold/30 p-2.5 text-white focus:outline-none focus:border-gold transition-colors placeholder:text-gray-600"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-mono text-[10px] uppercase mb-1 font-semibold">
                  Project Notes / Scope Details
                </label>
                <textarea
                  rows={3}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Architectural preferences, square meters, project location or consultation notes..."
                  className="w-full bg-black-rich border border-gold/30 p-2.5 text-white focus:outline-none focus:border-gold transition-colors resize-none placeholder:text-gray-600"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-gold-dark via-gold to-gold-light hover:brightness-110 text-black-pure font-bold text-xs uppercase tracking-wider transition-colors shadow-[0_2px_15px_rgba(212,175,55,0.4)] cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Sparkles size={13} />
                  <span>{isSubmitting ? 'Registering...' : role === 'VIP Client' ? 'Register VIP Client' : 'Save User Record'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersTab;
