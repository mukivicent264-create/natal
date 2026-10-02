import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, X, Phone, MessageSquare, ChevronDown, UserPlus, Home, Info, 
  Briefcase, Image, Folder, Star, Layers, LogOut, Camera, Shield, User, Sparkles, LayoutDashboard
} from 'lucide-react';
import { 
  cn, recordUserActivity, getActiveUserSession, setActiveUserSession, 
  clearActiveUserSession, getUserInitials, getAdminProfile, setAdminProfile,
  getUserFromDirectory, getAdminUserFromDirectory, updateUserInDirectory, type ActiveUserSession,
  compressImageFile
} from '../utils';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import NatalLogo from './NatalLogo';
import { companyDetails } from '../data';

interface NavbarProps {
  onNavigateHome?: (sectionId?: string) => void;
  onNavigateToAuth?: () => void;
}

const navLinks = [
  { name: 'Home', href: '#home', sectionId: 'home', icon: Home },
  { name: 'About', href: '#about', sectionId: 'about', icon: Info },
  { name: 'Services', href: '#services', sectionId: 'services', icon: Briefcase },
  { name: 'Creations', href: '#showcase', sectionId: 'showcase', icon: Image },
  { name: 'Projects', href: '#projects', sectionId: 'projects', icon: Folder },
  { name: 'Why Us', href: '#why-us', sectionId: 'why-us', icon: Star },
  { name: 'Process', href: '#process', sectionId: 'process', icon: Layers },
];

export default function Navbar({ onNavigateHome, onNavigateToAuth }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<ActiveUserSession | null>(getActiveUserSession);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileFileInputRef = useRef<HTMLInputElement>(null);

  const handleLinkClick = (href: string, sectionId?: string) => {
    if (onNavigateHome) {
      onNavigateHome(sectionId || 'home');
    }
    setActiveDropdown(null);
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown-container') && !target.closest('.profile-dropdown-container')) {
        setActiveDropdown(null);
        setProfileDropdownOpen(false);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const [, setDirVersion] = useState(0);

  // Listen to session changes & Firebase Auth & User Directory updates
  useEffect(() => {
    const checkSession = () => {
      const session = getActiveUserSession();
      setCurrentUser(session);
      setDirVersion(v => v + 1);
    };
    checkSession();

    const handleSessionChange = (e: any) => {
      setCurrentUser(e.detail || getActiveUserSession());
      setDirVersion(v => v + 1);
    };
    window.addEventListener('natal_user_session_changed', handleSessionChange);

    const handleAdminProfileChange = (e: any) => {
      const updatedProfile = e.detail;
      if (updatedProfile) {
        setCurrentUser(prev => ({
          ...(prev || {}),
          photoURL: updatedProfile.photoURL || undefined,
          name: updatedProfile.name || prev?.name,
          email: updatedProfile.email || prev?.email,
        }));
      }
      setDirVersion(v => v + 1);
    };
    window.addEventListener('natal_admin_profile_changed', handleAdminProfileChange);

    const handleUsersUpdated = (e: any) => {
      const updatedUser = e.detail;
      const session = getActiveUserSession();
      const isAdm = Boolean(
        session?.email && session.email.toLowerCase().includes('admin')
      );

      if (updatedUser) {
        const isCurrent = session?.email && updatedUser.email && 
          session.email.toLowerCase() === updatedUser.email.toLowerCase();
        const isTargetAdmin = updatedUser.role === 'Administrator' || updatedUser.isAdmin || 
          (updatedUser.email && updatedUser.email.toLowerCase().includes('admin'));

        if (isCurrent || (isAdm && isTargetAdmin)) {
          const newPhoto = updatedUser.photoURL !== undefined ? updatedUser.photoURL : (session?.photoURL);
          const newName = updatedUser.name || session?.name;
          const newEmail = updatedUser.email || session?.email;
          const refreshed: ActiveUserSession = {
            ...(session || {}),
            name: newName,
            email: newEmail,
            photoURL: newPhoto || undefined,
            phone: updatedUser.phone || session?.phone,
            role: updatedUser.role || session?.role,
            isVIP: updatedUser.isVIP !== undefined ? updatedUser.isVIP : session?.isVIP
          };
          setCurrentUser(refreshed);
          setActiveUserSession(refreshed);
        }
      } else {
        setCurrentUser(getActiveUserSession());
      }
      setDirVersion(v => v + 1);
    };
    window.addEventListener('natal_users_updated', handleUsersUpdated);

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const stored = getActiveUserSession() || {};
        const dirUser = fbUser.email ? getUserFromDirectory(fbUser.email) : null;
        const merged: ActiveUserSession = {
          name: dirUser?.name || stored.name || fbUser.displayName || fbUser.email?.split('@')[0] || 'Client',
          email: fbUser.email || stored.email,
          photoURL: dirUser?.photoURL || stored.photoURL || fbUser.photoURL || undefined,
          phone: dirUser?.phone || stored.phone || fbUser.phoneNumber || undefined,
          role: dirUser?.role || stored.role,
          isVIP: dirUser?.isVIP !== undefined ? dirUser.isVIP : stored.isVIP,
          vipTier: dirUser?.vipTier || stored.vipTier
        };
        setCurrentUser(merged);
        setActiveUserSession(merged);
      } else {
        const local = getActiveUserSession();
        if (!local?.email && !local?.name) {
          setCurrentUser(null);
        }
      }
      setDirVersion(v => v + 1);
    });

    const handleStorage = () => {
      setCurrentUser(getActiveUserSession());
      setDirVersion(v => v + 1);
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('natal_user_session_changed', handleSessionChange);
      window.removeEventListener('natal_admin_profile_changed', handleAdminProfileChange);
      window.removeEventListener('natal_users_updated', handleUsersUpdated);
      window.removeEventListener('storage', handleStorage);
      unsubscribe();
    };
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await compressImageFile(file, 400, 400, 0.85);
      if (isAdmin) {
        await setAdminProfile({ photoURL: base64 });
      } else if (currentUser?.email) {
        await updateUserInDirectory(currentUser.email, { photoURL: base64 });
      }
      const updated: ActiveUserSession = {
        ...(currentUser || {}),
        photoURL: base64
      };
      setCurrentUser(updated);
      setActiveUserSession(updated);
      setDirVersion(v => v + 1);
    } catch {
      const reader = new FileReader();
      reader.onload = async (loadEvent) => {
        const base64 = loadEvent.target?.result as string;
        if (base64) {
          if (isAdmin) {
            await setAdminProfile({ photoURL: base64 });
          } else if (currentUser?.email) {
            await updateUserInDirectory(currentUser.email, { photoURL: base64 });
          }
          const updated: ActiveUserSession = {
            ...(currentUser || {}),
            photoURL: base64
          };
          setCurrentUser(updated);
          setActiveUserSession(updated);
          setDirVersion(v => v + 1);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = async () => {
    if (isAdmin) {
      await setAdminProfile({ photoURL: '' });
    } else if (currentUser?.email) {
      await updateUserInDirectory(currentUser.email, { photoURL: '' });
    }
    const updated: ActiveUserSession = {
      ...(currentUser || {}),
      photoURL: undefined
    };
    delete updated.photoURL;
    setCurrentUser(updated);
    setActiveUserSession(updated);
    setDirVersion(v => v + 1);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch {}
    localStorage.removeItem('natal_admin_authenticated');
    sessionStorage.removeItem('natal_admin_passcode_verified');
    clearActiveUserSession();
    setCurrentUser(null);
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false);
    setDirVersion(v => v + 1);
  };

  const isAdmin = Boolean(
    currentUser?.email && currentUser.email.toLowerCase().includes('admin')
  );

  const adminProfile = getAdminProfile();
  // Single Source of Truth: Look up user directly from the User List in the User Tab
  const directoryUser = currentUser?.email ? getUserFromDirectory(currentUser.email) : null;
  const adminDirectoryUser = isAdmin ? (directoryUser?.role === 'Administrator' ? directoryUser : getAdminUserFromDirectory()) : null;

  const displayAvatar = isAdmin 
    ? (adminDirectoryUser?.photoURL || adminProfile.photoURL || currentUser?.photoURL) 
    : (directoryUser?.photoURL || currentUser?.photoURL);
  const displayName = isAdmin 
    ? (adminDirectoryUser?.name || adminProfile.name || currentUser?.name || 'Master Admin') 
    : (directoryUser?.name || currentUser?.name || 'Valued Client');
  const displayEmail = isAdmin 
    ? (adminDirectoryUser?.email || adminProfile.email || currentUser?.email || 'admin@nataldesign.com') 
    : (directoryUser?.email || currentUser?.email || 'Client');

  const initials = getUserInitials(displayName, displayEmail);

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-[200] transition-all duration-300',
          (scrolled || mobileMenuOpen) 
            ? 'bg-black-rich/98 backdrop-blur-2xl border-b border-gold/20 py-2.5 sm:py-3 min-h-[58px] sm:min-h-[66px] shadow-[0_10px_30px_rgba(0,0,0,0.9)] flex items-center' 
            : 'bg-gradient-to-b from-black-pure/95 via-black-pure/70 to-transparent py-3 sm:py-4 min-h-[64px] sm:min-h-[74px] flex items-center'
        )}
      >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center justify-between">
        {/* Logo */}
        <button 
          onClick={() => handleLinkClick('#home', 'home')}
          className="group focus:outline-none text-left cursor-pointer shrink-0"
        >
          <NatalLogo className="h-8 sm:h-9 md:h-10 transition-all duration-300" />
        </button>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-8 lg:translate-y-0.5">
          {navLinks.map((link) => (
            <button
              key={link.name}
              onClick={() => handleLinkClick(link.href, link.sectionId)}
              className="text-xs uppercase tracking-widest text-gray-300 hover:text-gold transition-colors duration-300 relative group font-medium py-1.5 cursor-pointer"
            >
              {link.name}
              <span className="absolute -bottom-0.5 left-0 w-0 h-[1.5px] bg-gold transition-all duration-300 group-hover:w-full"></span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-4 lg:gap-4 ml-auto lg:ml-0">
          {/* Request A Quote Button (Hidden on mobile screen, appears on tablet & desktop) */}
          <button
            onClick={() => handleLinkClick('#quote', 'quote')}
            className="hidden sm:inline-flex items-center justify-center whitespace-nowrap px-4 py-2 border border-gold/50 text-gold hover:bg-gold/10 active:bg-gold/20 hover:border-gold active:scale-95 font-semibold text-xs uppercase tracking-wider transition-all cursor-pointer rounded-sm"
          >
            Request A Quote
          </button>

          {/* Header Right Actions (Desktop/Tablet) */}
          <div className="hidden sm:flex items-center relative profile-dropdown-container">
            {isAdmin ? (
              <div className="flex items-center gap-2">
                {/* Admin Dashboard Button replacing Join Natal */}
                <button
                  type="button"
                  onClick={() => {
                    window.location.hash = '#admin';
                    window.location.reload();
                  }}
                  className="whitespace-nowrap px-3.5 sm:px-4 md:px-5 lg:px-6 py-2 sm:py-2 md:py-2.5 lg:py-3 bg-gradient-to-r from-gold-dark via-gold to-yellow-300 hover:brightness-110 active:scale-95 text-black-pure font-bold text-[9.5px] sm:text-[10px] md:text-xs lg:text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)] cursor-pointer rounded-sm flex items-center justify-center gap-1.5 lg:gap-2 ml-1"
                  title="Open Admin Dashboard"
                >
                  <LayoutDashboard className="stroke-[2.5] w-3 h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4" />
                  <span>Dashboard</span>
                </button>

                {/* Profile Icon for Admin */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="relative p-0.5 rounded-full border-2 border-gold/70 hover:border-gold transition-all duration-200 cursor-pointer shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:scale-105 active:scale-95 flex items-center justify-center bg-black-pure"
                    aria-label="Admin Profile"
                    title={displayName}
                  >
                    <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-gold/30 via-black-rich to-black-pure text-gold font-bold font-mono text-xs sm:text-sm lg:text-base select-none">
                      {displayAvatar ? (
                        <img 
                          src={displayAvatar} 
                          alt={displayName} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>

                    {/* Active Badge Status Icon */}
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center" title="Active">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border-[1.5px] border-black-pure shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                    </span>
                  </button>

                  {/* Profile Dropdown Menu */}
                  <AnimatePresence>
                    {profileDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-3 w-64 bg-black-rich/98 backdrop-blur-xl border border-gold/40 shadow-[0_20px_50px_rgba(0,0,0,0.95)] z-50 p-4 rounded-sm text-left"
                      >
                        {/* Header info */}
                        <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                          <div className="relative shrink-0">
                            <div className="w-11 h-11 rounded-full overflow-hidden border border-gold/70 flex items-center justify-center bg-black-pure text-gold font-bold font-mono text-sm shadow-md">
                              {displayAvatar ? (
                                <img 
                                  src={displayAvatar} 
                                  alt={displayName} 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span>{initials}</span>
                              )}
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center">
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-black-pure"></span>
                            </span>
                          </div>

                          <div className="overflow-hidden">
                            <h4 className="text-xs font-bold text-white truncate font-heading tracking-wide">
                              {displayName}
                            </h4>
                            <p className="text-[10px] text-gray-400 truncate font-mono mt-0.5">
                              {displayEmail}
                            </p>
                            <div className="mt-1 flex items-center gap-1.5 text-[9px] font-mono text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block shadow-[0_0_6px_rgba(16,185,129,0.8)]"></span>
                              <span>Administrator Active</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="py-2.5 space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              setProfileDropdownOpen(false);
                              window.location.hash = '#admin';
                              window.location.reload();
                            }}
                            className="w-full px-2.5 py-2 text-[11px] text-gold hover:bg-gold/10 transition-colors flex items-center gap-2.5 rounded-sm cursor-pointer font-semibold"
                          >
                            <LayoutDashboard size={13} className="text-gold" />
                            <span>Go to Dashboard</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full px-2.5 py-2 text-[11px] text-gray-300 hover:text-gold hover:bg-white/5 transition-colors flex items-center gap-2.5 rounded-sm cursor-pointer"
                          >
                            <Camera size={13} className="text-gold" />
                            <span>{displayAvatar ? 'Change Profile Photo' : 'Upload Profile Photo'}</span>
                          </button>

                          {displayAvatar && (
                            <button
                              type="button"
                              onClick={handleRemovePhoto}
                              className="w-full px-2.5 py-1.5 text-[10px] font-mono text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors flex items-center gap-2 rounded-sm cursor-pointer"
                            >
                              <span>Remove Profile Photo</span>
                            </button>
                          )}
                          <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handlePhotoUpload}
                          />
                        </div>

                        {/* Sign Out */}
                        <div className="pt-2 border-t border-white/10">
                          <button
                            type="button"
                            onClick={handleSignOut}
                            className="w-full px-2.5 py-1.5 text-[11px] text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-colors flex items-center gap-2.5 rounded-sm cursor-pointer font-mono"
                          >
                            <LogOut size={13} />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : currentUser ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="relative p-0.5 rounded-full border-2 border-gold/70 hover:border-gold transition-all duration-200 cursor-pointer shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:scale-105 active:scale-95 flex items-center justify-center bg-black-pure ml-1"
                  aria-label="User Profile"
                  title={displayName}
                >
                  <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-gold/30 via-black-rich to-black-pure text-gold font-bold font-mono text-xs lg:text-sm select-none">
                    {displayAvatar ? (
                      <img 
                        src={displayAvatar} 
                        alt={displayName} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>

                  {/* Active Badge Status Icon */}
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center" title="Active">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border-[1.5px] border-black-pure shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                  </span>
                </button>

                {/* Profile Dropdown Menu */}
                <AnimatePresence>
                  {profileDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-3 w-64 bg-black-rich/98 backdrop-blur-xl border border-gold/40 shadow-[0_20px_50px_rgba(0,0,0,0.95)] z-50 p-4 rounded-sm text-left"
                    >
                      {/* Header info */}
                      <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                        <div className="relative shrink-0">
                          <div className="w-11 h-11 rounded-full overflow-hidden border border-gold/70 flex items-center justify-center bg-black-pure text-gold font-bold font-mono text-sm shadow-md">
                            {displayAvatar ? (
                              <img 
                                src={displayAvatar} 
                                alt={displayName} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{initials}</span>
                            )}
                          </div>
                          {/* Active badge */}
                          <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center">
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-black-pure"></span>
                          </span>
                        </div>

                        <div className="overflow-hidden">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-bold text-white truncate font-heading tracking-wide">
                              {displayName}
                            </h4>
                            {isAdmin ? (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-mono uppercase bg-purple-950/80 text-purple-300 border border-purple-500/60 flex items-center gap-1 font-bold">
                                <Shield size={8} className="text-purple-400" /> Admin
                              </span>
                            ) : (currentUser?.isVIP || currentUser?.role === 'VIP Client') ? (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-mono uppercase bg-gold/15 text-gold border border-gold/40 flex items-center gap-1 font-bold">
                                <Sparkles size={8} className="text-gold" /> VIP
                              </span>
                            ) : null}
                          </div>
                          <p className="text-[10px] text-gray-400 truncate font-mono mt-0.5">
                            {displayEmail}
                          </p>
                          <div className="mt-1 flex items-center justify-between text-[9px] font-mono">
                            <div className="flex items-center gap-1 text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block shadow-[0_0_6px_rgba(16,185,129,0.8)]"></span>
                              <span>{isAdmin ? 'System Admin' : 'Active Session'}</span>
                            </div>
                            {(currentUser?.isVIP || currentUser?.role === 'VIP Client') && !isAdmin && (
                              <span className="text-gold font-semibold">{currentUser?.vipTier || 'VIP Member'}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="py-2.5 space-y-1">
                        {/* Photo upload button */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 px-2.5 py-2 text-[11px] text-gray-300 hover:text-gold hover:bg-white/5 transition-colors flex items-center gap-2.5 rounded-sm cursor-pointer"
                          >
                            <Camera size={13} className="text-gold" />
                            <span>{displayAvatar ? 'Change Photo' : 'Upload Photo'}</span>
                          </button>
                          {displayAvatar && (
                            <button
                              type="button"
                              onClick={handleRemovePhoto}
                              className="px-2 py-2 text-[10px] font-mono text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-sm cursor-pointer transition-colors"
                              title="Remove photo"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <input 
                          ref={fileInputRef}
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handlePhotoUpload}
                        />
                      </div>

                      {/* Sign Out */}
                      <div className="pt-2 border-t border-white/10">
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="w-full px-2.5 py-1.5 text-[11px] text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-colors flex items-center gap-2.5 rounded-sm cursor-pointer font-mono"
                        >
                          <LogOut size={13} />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={() => {
                  window.location.hash = '#register';
                  if (onNavigateToAuth) onNavigateToAuth();
                  setMobileMenuOpen(false);
                }}
                className="whitespace-nowrap px-3.5 sm:px-4 md:px-5 lg:px-6 py-2 sm:py-2 md:py-2.5 lg:py-3 bg-gold hover:bg-gold-light active:bg-gold-dark text-black-pure font-bold text-[9.5px] sm:text-[10px] md:text-xs lg:text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(212,175,55,0.35)] hover:scale-105 active:scale-95 cursor-pointer rounded-sm flex items-center justify-center gap-1.5 lg:gap-2 ml-1"
              >
                <span>Join Natal</span>
                <UserPlus className="stroke-[2.5] w-3 h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4" />
              </button>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="lg:hidden text-white hover:text-gold active:text-gold-light transition-all p-2 active:scale-90 cursor-pointer flex items-center justify-center focus:outline-none relative z-[120] rounded-md"
            onClick={() => {
              setMobileMenuOpen(!mobileMenuOpen);
              setActiveDropdown(null);
            }}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={26} className="text-gold" /> : <Menu size={26} />}
          </button>
        </div>
      </div>
    </header>

    {/* Mobile Navigation & Backdrop */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Soft Dimming Backdrop with blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 h-[100dvh] w-full bg-black-pure/70 backdrop-blur-md z-[100] lg:hidden overscroll-none touch-none"
            />

            {/* Left Drawer Mobile Menu */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-0 left-0 bottom-0 w-[85%] sm:w-[65%] max-w-sm bg-gradient-to-b from-black-rich to-black-pure border-r border-gold/20 shadow-[20px_0_60px_rgba(0,0,0,0.9)] lg:hidden overflow-y-auto overscroll-contain z-[110] rounded-none"
            >
              <div className="p-6 pt-8 flex flex-col gap-4 min-h-full">
                
                {/* Drawer Header (Logo & Close) */}
                <div className="flex items-center justify-between mb-2">
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    className="pl-2"
                  >
                    <NatalLogo className="h-7 sm:h-8" />
                  </motion.div>
                  
                  <motion.button
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 text-gray-400 hover:text-gold transition-colors cursor-pointer rounded-full hover:bg-white/5 focus:outline-none"
                    aria-label="Close menu"
                  >
                    <X size={24} />
                  </motion.button>
                </div>

                {/* Navigation Links with staggered animation */}
                <div className="flex flex-col">
                  {navLinks.map((link, index) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + index * 0.05, duration: 0.4, ease: "easeOut" }}
                      key={link.name} 
                      className="flex flex-col"
                    >
                      <button
                        onClick={() => handleLinkClick(link.href, link.sectionId)}
                        className="group text-xs sm:text-sm text-left uppercase tracking-[0.15em] text-gray-300 hover:text-gold active:text-gold active:bg-white/10 transition-colors py-3.5 px-3 flex items-center gap-4 font-medium hover:bg-white/5 cursor-pointer w-full rounded-none border-b border-white/10 active:scale-[0.99]"
                      >
                        <link.icon size={16} className="text-gold/70 group-hover:text-gold group-active:text-gold transition-colors" />
                        <span>{link.name}</span>
                      </button>
                    </motion.div>
                  ))}
                </div>
                
                {/* Action Buttons Section */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="pt-4 border-t border-white/10 flex flex-col gap-3 mt-2"
                >
                  <button
                    onClick={() => handleLinkClick('#quote', 'quote')}
                    className="w-full text-center px-6 py-3.5 border border-gold/40 text-gold text-[10px] sm:text-xs uppercase tracking-[0.2em] font-semibold hover:bg-gold/10 active:bg-gold/20 active:scale-98 hover:border-gold transition-all cursor-pointer rounded-sm"
                  >
                    Request Quote
                  </button>
                  {isAdmin ? (
                    <div className="space-y-3">
                      {/* Dashboard Button for Admin */}
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          window.location.hash = '#admin';
                          window.location.reload();
                        }}
                        className="w-full flex items-center justify-center gap-2.5 text-[10px] sm:text-xs uppercase tracking-[0.2em] bg-gradient-to-r from-gold-dark via-gold to-yellow-300 hover:brightness-110 active:scale-98 text-black-pure font-bold py-3.5 shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all rounded-sm cursor-pointer"
                      >
                        <LayoutDashboard size={15} className="stroke-[2.5]" />
                        <span>Dashboard</span>
                      </button>

                      {/* Admin Profile Card */}
                      <div className="p-3.5 bg-black-pure/90 border border-gold/40 rounded-sm space-y-3 shadow-lg">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-gold/70 flex items-center justify-center bg-black-rich text-gold font-bold font-mono text-sm">
                              {displayAvatar ? (
                                <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
                              ) : (
                                <span>{initials}</span>
                              )}
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-black-pure"></span>
                            </span>
                          </div>
                          <div className="overflow-hidden">
                            <div className="text-xs font-bold text-white truncate font-heading">{displayName}</div>
                            <div className="text-[10px] text-gray-400 truncate font-mono">{displayEmail}</div>
                            <div className="flex items-center gap-1 text-[9px] text-emerald-400 font-mono mt-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Administrator Active
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                          <button
                            type="button"
                            onClick={() => mobileFileInputRef.current?.click()}
                            className="px-2 py-2 text-[10px] text-gray-300 border border-white/15 hover:border-gold hover:text-gold text-center cursor-pointer font-mono flex items-center justify-center gap-1.5 bg-white/5"
                          >
                            <Camera size={11} className="text-gold" />
                            <span>Photo</span>
                          </button>
                          <input 
                            ref={mobileFileInputRef}
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handlePhotoUpload}
                          />

                          <button
                            type="button"
                            onClick={handleSignOut}
                            className="px-2 py-2 text-[10px] text-red-400 border border-red-500/30 hover:bg-red-950/40 text-center cursor-pointer font-mono flex items-center justify-center gap-1.5"
                          >
                            <LogOut size={11} />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : currentUser ? (
                    <div className="p-3.5 bg-black-pure/90 border border-gold/40 rounded-sm space-y-3 shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-gold/70 flex items-center justify-center bg-black-rich text-gold font-bold font-mono text-sm">
                            {displayAvatar ? (
                              <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
                            ) : (
                              <span>{initials}</span>
                            )}
                          </div>
                          {/* Active badge */}
                          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-black-pure"></span>
                          </span>
                        </div>
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <div className="text-xs font-bold text-white truncate font-heading">{displayName}</div>
                            {(currentUser.isVIP || currentUser.role === 'VIP Client') && (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-mono uppercase bg-gold/15 text-gold border border-gold/40 flex items-center gap-1 font-bold">
                                <Sparkles size={8} className="text-gold" /> VIP
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-400 truncate font-mono">{displayEmail}</div>
                          <div className="flex items-center justify-between text-[9px] font-mono mt-0.5">
                            <div className="flex items-center gap-1 text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Active Status
                            </div>
                            {(currentUser.isVIP || currentUser.role === 'VIP Client') && (
                              <span className="text-gold font-semibold">{currentUser.vipTier || 'VIP Member'}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => mobileFileInputRef.current?.click()}
                          className="px-2 py-2 text-[10px] text-gray-300 border border-white/15 hover:border-gold hover:text-gold text-center cursor-pointer font-mono flex items-center justify-center gap-1.5 bg-white/5"
                        >
                          <Camera size={11} className="text-gold" />
                          <span>Photo</span>
                        </button>
                        <input 
                          ref={mobileFileInputRef}
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handlePhotoUpload}
                        />

                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="px-2 py-2 text-[10px] text-red-400 border border-red-500/30 hover:bg-red-950/40 text-center cursor-pointer font-mono flex items-center justify-center gap-1.5"
                        >
                          <LogOut size={11} />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        window.location.hash = '#register';
                        if (onNavigateToAuth) onNavigateToAuth();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-3 text-[10px] sm:text-xs uppercase tracking-[0.2em] bg-gold hover:bg-gold-light active:bg-gold-dark text-black-pure font-bold py-3.5 shadow-[0_0_20px_rgba(212,175,55,0.2)] hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] active:scale-98 transition-all rounded-sm cursor-pointer"
                    >
                      <span>Join Natal</span>
                      <UserPlus size={15} className="stroke-[2.5]" />
                    </button>
                  )}

                  <div className="flex flex-col gap-4 mt-4 px-2">
                    <a
                      href={`tel:${companyDetails.phoneNumbers[0].replace(/\s/g, '')}`}
                      onClick={() => {
                        recordUserActivity({
                          type: 'call',
                          title: 'Phone Consultation Dialed',
                          description: `User clicked to call ${companyDetails.phoneNumbers[0]} from Mobile Menu.`,
                          metadata: { phoneNumber: companyDetails.phoneNumbers[0], channel: 'Mobile Menu' }
                        });
                      }}
                      className="flex items-center gap-4 hover:text-gold transition-colors text-gray-400 group"
                    >
                      <div className="w-10 h-10 sm:w-11 sm:h-11 bg-white/5 rounded-full border border-white/10 flex items-center justify-center group-hover:border-gold/50 group-hover:bg-gold/10 transition-colors">
                        <Phone size={16} className="text-gold group-hover:scale-110 transition-transform" />
                      </div>
                      <span className="text-[10px] sm:text-xs tracking-widest">{companyDetails.phoneNumbers[0]}</span>
                    </a>
                    <a
                      href={`https://wa.me/256${companyDetails.whatsappNumbers[0].replace(/[^0-9]/g, '').replace(/^0/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        recordUserActivity({
                          type: 'whatsapp',
                          title: 'WhatsApp Inquiry Initiated',
                          description: `User clicked WhatsApp chat from Mobile Menu.`,
                          metadata: { whatsappNumber: companyDetails.whatsappNumbers[0], channel: 'Mobile Menu' }
                        });
                      }}
                      className="flex items-center gap-4 hover:text-gold transition-colors text-gray-400 group"
                    >
                      <div className="w-10 h-10 sm:w-11 sm:h-11 bg-white/5 rounded-full border border-white/10 flex items-center justify-center group-hover:border-gold/50 group-hover:bg-gold/10 transition-colors">
                        <MessageSquare size={16} className="text-gold group-hover:scale-110 transition-transform" />
                      </div>
                      <span className="text-[10px] sm:text-xs tracking-widest">WhatsApp Chat</span>
                    </a>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
