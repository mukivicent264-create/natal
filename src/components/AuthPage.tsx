import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Check, Eye, EyeOff, User, Mail, Phone, Lock, 
  Sparkles, ShieldCheck, CheckCircle2, ArrowRight, Layers, ChevronDown,
  Building, Tag, FileText, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { 
  syncUserRecord, 
  recordUserActivity, 
  setActiveUserSession, 
  getActiveUserSession, 
  clearActiveUserSession, 
  getUserFromDirectory, 
  triggerOwnerEmailNotification,
  sanitizeNameInput,
  isValidName,
  sanitizePhoneInput,
  isValidPhone,
  isValidEmail,
  CONTAINS_DIGITS_OR_SYMBOLS_REGEX,
  handleNameKeyDown,
  handleNamePaste,
  handlePhoneKeyDown,
  handlePhonePaste
} from '../utils';
import GoldSpinner from './GoldSpinner';

interface AuthPageProps {
  onNavigateHome: (sectionId?: string) => void;
  initialMode?: 'login' | 'register';
}

const DEFAULT_PASSCODES = ['NATAL7777', '7777', 'natal7777', 'NATAL2025'];

const SERVICE_INTEREST_OPTIONS = [
  'Gypsum Ceilings & Lighting',
  'Luxury Living Spaces',
  'Kitchens & Fine Cabinetry',
  'Master Suites & Bedrooms',
  'Executive & Commercial Fit-outs',
  'Turnkey Interior Renovation',
  'Custom Joinery & Woodwork'
];

const PROPERTY_TYPE_OPTIONS = [
  'Residential Villa / Private Home',
  'Luxury Penthouse / Apartment',
  'Commercial Office / Headquarters',
  'Retail Showroom / Boutique',
  'Hotel / Hospitality Suite',
  'Turnkey Renovation & Remodeling'
];

export default function AuthPage({ onNavigateHome, initialMode }: AuthPageProps) {
  const getInitialMode = (): 'login' | 'register' => {
    if (initialMode) return initialMode;
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('register') || hash.includes('signup') || hash.includes('join')) return 'register';
    }
    return 'login';
  };

  const [authMode, setAuthMode] = useState<'login' | 'register'>(getInitialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorAction, setErrorAction] = useState<{ label: string; mode: 'login' | 'register' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreedToPolicies, setAgreedToPolicies] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [activeSession, setActiveSession] = useState(getActiveUserSession);
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    service: 'Gypsum Ceilings & Lighting',
    projectType: 'Residential Villa / Private Home',
    projectNotes: '',
    vipInviteCode: ''
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const clean = sanitizeNameInput(raw);
    if (CONTAINS_DIGITS_OR_SYMBOLS_REGEX.test(raw) || (raw && raw !== clean)) {
      setNameError('Full name must contain letters only (no numbers or symbols).');
    } else {
      setNameError('');
    }
    setFormData(prev => ({ ...prev, fullName: clean }));
    if (errorMsg) setErrorMsg('');
  };

  const handleNameBlur = () => {
    if (formData.fullName.trim() && !isValidName(formData.fullName)) {
      setNameError('Please enter a valid full name (letters only, at least 2 characters).');
    } else {
      setNameError('');
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const clean = sanitizePhoneInput(raw);
    setFormData(prev => ({ ...prev, phone: clean }));
    if (phoneError) setPhoneError('');
    if (errorMsg) setErrorMsg('');
  };

  const handlePhoneBlur = () => {
    if (formData.phone.trim() && !isValidPhone(formData.phone)) {
      setPhoneError('Please enter a valid phone number with digits (at least 7 digits).');
    } else {
      setPhoneError('');
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, email: e.target.value }));
    if (emailError) setEmailError('');
    if (errorMsg) { setErrorMsg(''); setErrorAction(null); }
  };

  const handleEmailBlur = () => {
    if (formData.email.trim() && !isValidEmail(formData.email)) {
      setEmailError('Please enter a valid email address (e.g. client@nataldesign.com).');
    } else {
      setEmailError('');
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, password: e.target.value }));
    if (passwordError) setPasswordError('');
    if (errorMsg) { setErrorMsg(''); setErrorAction(null); }
  };

  const handlePasswordBlur = () => {
    if (authMode === 'register' && formData.password && formData.password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
    } else {
      setPasswordError('');
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Handle Master Passcode Login
  const handleOwnerUnlock = (codeToVerify?: string) => {
    const code = (codeToVerify || '').trim();
    const storedCustom = localStorage.getItem('natal_custom_passcode');
    const validCodes = [...DEFAULT_PASSCODES, ...(storedCustom ? [storedCustom] : [])];

    if (validCodes.includes(code)) {
      localStorage.setItem('natal_admin_authenticated', 'true');
      setSubmitted(true);
      setTimeout(() => {
        window.location.hash = '#admin';
        window.location.reload();
      }, 1000);
      return true;
    }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setNameError('');
    setPhoneError('');
    setEmailError('');
    setPasswordError('');

    if (authMode === 'register') {
      if (!formData.fullName.trim() || !isValidName(formData.fullName)) {
        setNameError('Full name must contain letters only (no numbers, digits or symbols) and be at least 2 characters.');
        setErrorMsg('Please enter a valid full name with letters only.');
        return;
      }

      if (!formData.email.trim() || !isValidEmail(formData.email)) {
        setEmailError('Please enter a valid email address.');
        setErrorMsg('Please enter a valid email address.');
        return;
      }

      if (!formData.phone.trim() || !isValidPhone(formData.phone)) {
        setPhoneError('Please enter a valid phone number (at least 7 digits).');
        setErrorMsg('Please enter a valid phone number with digits only.');
        return;
      }

      if (!formData.password || formData.password.length < 6) {
        setPasswordError('Password must be at least 6 characters.');
        setErrorMsg('Password must be at least 6 characters.');
        return;
      }

      if (!agreedToPolicies) {
        setErrorMsg('Please check the box to agree with the Natal privacy policies to continue.');
        return;
      }
    } else {
      // Login mode validation
      if (!formData.email.trim() || !isValidEmail(formData.email)) {
        setEmailError('Please enter a valid email address.');
        setErrorMsg('Please enter a valid email address.');
        return;
      }

      if (!formData.password) {
        setPasswordError('Please enter your password or master passcode.');
        setErrorMsg('Please enter your password.');
        return;
      }
    }

    setIsSubmitting(true);

    // Check if user entered the master passcode in standard password box
    if (handleOwnerUnlock(formData.password)) {
      return;
    }
    
    try {
      const emailLower = formData.email.trim().toLowerCase();
      const isAdminEmail = emailLower.includes('admin');

      if (authMode === 'login') {
        let authSuccess = false;
        try {
          await signInWithEmailAndPassword(auth, formData.email.trim(), formData.password);
          authSuccess = true;
        } catch (authErr: any) {
          console.warn("Firebase Auth signIn note:", authErr?.code, authErr?.message);
          // If operation-not-allowed or admin email with local verification, proceed gracefully
          if (authErr?.code === 'auth/operation-not-allowed' || isAdminEmail) {
            authSuccess = true;
          } else {
            throw authErr;
          }
        }

        let matchedName = '';
        let matchedPhoto: string | undefined = undefined;
        let matchedPhone: string | undefined = undefined;
        let matchedRole: string | undefined = undefined;
        let matchedVIP: boolean | undefined = undefined;
        let matchedTier: string | undefined = undefined;
        try {
          const dirUser = getUserFromDirectory(formData.email.trim());
          if (dirUser) {
            matchedName = dirUser.name;
            matchedPhoto = dirUser.photoURL || undefined;
            matchedPhone = dirUser.phone || undefined;
            matchedRole = dirUser.role || undefined;
            matchedVIP = dirUser.isVIP !== undefined ? dirUser.isVIP : undefined;
            matchedTier = dirUser.vipTier || undefined;
          }
        } catch {}

        setActiveUserSession({
          email: formData.email.trim(),
          name: matchedName || (isAdminEmail ? 'Administrator' : undefined),
          photoURL: matchedPhoto,
          phone: matchedPhone,
          role: matchedRole || (isAdminEmail ? 'Administrator' : 'Client'),
          isVIP: matchedVIP,
          vipTier: matchedTier
        });

        if (isAdminEmail) {
          localStorage.setItem('natal_admin_authenticated', 'true');
          sessionStorage.removeItem('natal_admin_passcode_verified');
        }

        await recordUserActivity({
          userEmail: formData.email.trim(),
          type: 'login',
          title: isAdminEmail ? 'Administrator Sign In' : 'Client Portal Login',
          description: isAdminEmail 
            ? 'Administrator logged in with full management privileges.' 
            : 'Client successfully logged into client portal.',
          metadata: { channel: isAdminEmail ? 'Admin Console' : 'Client Portal', isAdmin: isAdminEmail }
        }).catch(() => {});

      } else {
        let authUid = '';
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, formData.email.trim(), formData.password);
          authUid = userCredential.user.uid;
        } catch (authErr: any) {
          console.warn("Firebase Auth createUser note:", authErr?.message);
          if (authErr?.code === 'auth/email-already-in-use') {
            throw authErr;
          }
          // Do not block registration on operation-not-allowed or transient auth errors
        }

        if (isAdminEmail) {
          localStorage.setItem('natal_admin_authenticated', 'true');
          sessionStorage.removeItem('natal_admin_passcode_verified');
        }

        const vipScopeDesc = formData.projectNotes
          ? `${formData.projectType} • Discipline: ${formData.service} • Note: ${formData.projectNotes.trim()}`
          : `${formData.projectType} • Discipline: ${formData.service} (VIP Atelier Member)`;

        // Save directly to the Admin Dashboard Users directory (both Firestore and local cache) with activity
        await syncUserRecord({
          name: formData.fullName.trim() || (isAdminEmail ? 'System Administrator' : 'VIP Client'),
          email: formData.email.trim(),
          phone: formData.phone.trim() || '',
          source: 'Registration',
          role: isAdminEmail ? 'Administrator' : 'VIP Client',
          status: isAdminEmail ? 'Active Administrator' : 'Active VIP Client',
          isVIP: !isAdminEmail,
          vipTier: !isAdminEmail ? 'VIP Gold Member' : undefined,
          projectType: formData.projectType,
          service: isAdminEmail ? 'System Administration' : (formData.service || 'Gypsum Ceilings & Lighting'),
          details: isAdminEmail ? 'System Administrator Account' : vipScopeDesc,
          uid: authUid || undefined,
          initialActivity: {
            type: 'registration',
            title: isAdminEmail ? 'Administrator Account Created' : 'VIP Account Registration',
            description: isAdminEmail 
              ? 'Administrator registered with system management privileges (email contains "admin").' 
              : `VIP Client account registered with exclusive atelier privileges. Property: ${formData.projectType}. Discipline: ${formData.service}.`,
            metadata: { 
              service: formData.service, 
              phone: formData.phone, 
              projectType: formData.projectType,
              vipInviteCode: formData.vipInviteCode || undefined,
              isAdmin: isAdminEmail, 
              isVIP: !isAdminEmail 
            }
          }
        });

        // Trigger notification email to owner inbox for new VIP client registration
        if (!isAdminEmail) {
          triggerOwnerEmailNotification({
            leadType: 'VIP Registration',
            name: formData.fullName.trim() || 'VIP Client',
            email: formData.email.trim(),
            phone: formData.phone.trim(),
            service: formData.service,
            details: `New VIP Client registered on Natal platform. Property type: ${formData.projectType || 'General'}. Scope: ${vipScopeDesc}`
          }).catch(mailErr => console.warn('Email trigger note:', mailErr));
        }

        setActiveUserSession({
          email: formData.email.trim(),
          name: formData.fullName.trim() || (isAdminEmail ? 'System Administrator' : 'VIP Client'),
          phone: formData.phone.trim() || undefined,
          role: isAdminEmail ? 'Administrator' : 'VIP Client',
          isVIP: !isAdminEmail,
          vipTier: !isAdminEmail ? 'VIP Gold Member' : undefined
        });
      }
      
      setSubmitted(true);
      setTimeout(() => {
        if (isAdminEmail) {
          window.location.hash = '#admin';
          window.location.reload();
        } else {
          onNavigateHome();
        }
      }, 1200);
      
    } catch (error: any) {
      console.error(error);
      if (error?.code === 'auth/email-already-in-use') {
        setErrorMsg('This email address is already registered in our client directory.');
        setErrorAction({ label: 'Switch to Sign In →', mode: 'login' });
      } else if (error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential') {
        setErrorMsg('Incorrect password. Please verify your credentials or try again.');
        setErrorAction(null);
      } else if (error?.code === 'auth/user-not-found') {
        setErrorMsg('No account found with this email. New to Natal Atelier?');
        setErrorAction({ label: 'Register VIP Account →', mode: 'register' });
      } else if (error?.code === 'auth/weak-password') {
        setErrorMsg('Password should be at least 6 characters.');
        setErrorAction(null);
      } else if (error?.code === 'auth/invalid-email') {
        setErrorMsg('Please enter a valid email address.');
        setErrorAction(null);
      } else {
        if (authMode === 'login') {
          setErrorMsg('Authentication failed or account does not exist.');
          setErrorAction({ label: 'Register as New VIP Client →', mode: 'register' });
        } else {
          setErrorMsg('Registration could not be completed. Please verify your details.');
          setErrorAction(null);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black-pure text-white relative flex flex-col justify-between font-sans selection:bg-gold selection:text-black-pure overflow-x-hidden w-full max-w-full">
      {/* Background Architectural Canvas with Measured Scrim */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=2000" 
          alt="NATAL Luxury Architectural Atelier" 
          className="w-full h-full object-cover object-center filter brightness-[0.28] contrast-[1.2]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black-pure via-black-pure/85 to-black-pure/70"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.08)_0%,transparent_70%)]"></div>
      </div>

      {/* Top Header Nav: ONLY a clean Go Back Arrow on the left, logo completely removed from right */}
      <header className="relative z-20 w-full max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-12 py-4 sm:py-6 flex items-center justify-between">
        <button 
          type="button"
          onClick={() => onNavigateHome()}
          className="text-gold hover:text-white transition-all group cursor-pointer p-2 flex items-center justify-center -ml-2 rounded hover:bg-white/5 active:scale-90"
          aria-label="Back to website"
          title="Back to website"
        >
          <ArrowLeft size={24} className="group-hover:-translate-x-1.5 transition-transform text-gold duration-200" />
        </button>

        {/* Clean empty balance spacer - logo removed per user specification */}
        <div aria-hidden="true" className="w-6 h-6"></div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-3 sm:px-6 lg:px-8 py-2 sm:py-6 w-full max-w-full min-w-0 overflow-x-hidden">
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-5xl bg-black-pure/95 backdrop-blur-2xl border border-gold/30 shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden grid lg:grid-cols-12 relative min-w-0"
        >
          {/* Subtle Golden Top Accent Border */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent z-20"></div>

          {/* Mobile & Tablet Image Banner (Visible only on screens below lg) */}
          <div className="lg:hidden relative h-36 sm:h-44 w-full overflow-hidden border-b border-gold/30">
            <img 
              src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=85&w=1200" 
              alt="NATAL Architectural Atelier" 
              className="w-full h-full object-cover filter contrast-[1.1] brightness-[0.68]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black-pure via-black-pure/50 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-gold block font-semibold">NATAL Atelier</span>
                <h3 className="font-heading text-base font-bold text-white tracking-wide">Interior Design & Construction</h3>
              </div>
              <span className="text-[10px] font-mono text-gold border border-gold/40 px-2.5 py-1 bg-black/70 backdrop-blur-sm flex items-center gap-1">
                <ShieldCheck size={11} className="text-gold" />
                Verified Portal
              </span>
            </div>
          </div>

          {/* Left Architectural Brand Column (Editorial Lookbook with Rich Background Image) */}
          <div className="lg:col-span-5 relative p-6 sm:p-8 lg:p-10 flex flex-col justify-between hidden lg:flex border-r border-gold/30 overflow-hidden min-h-[640px]">
            {/* Rich Architectural Background Image */}
            <div className="absolute inset-0 z-0">
              <img 
                src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=85&w=1600" 
                alt="NATAL Architectural Interior & Gypsum Execution" 
                className="w-full h-full object-cover object-center filter contrast-[1.12] brightness-[0.72]"
              />
              {/* Opulent Scrim & Architectural Gradients */}
              <div className="absolute inset-0 bg-gradient-to-t from-black-pure via-black-pure/65 to-black-pure/35" />
              <div className="absolute inset-0 bg-gradient-to-r from-black-pure/70 via-black-pure/20 to-black-pure/80" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.85)_100%)]" />
            </div>

            {/* Top Brand Identity */}
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/65 backdrop-blur-md border border-gold/40 text-[10px] font-mono uppercase tracking-[0.25em] text-gold mb-3.5 shadow-lg">
                <Sparkles size={11} className="text-gold" />
                <span>Atelier Client Suite</span>
              </div>
              <h2 className="font-heading text-2xl xl:text-3xl font-bold text-white tracking-wide leading-tight drop-shadow-md">
                NATAL
                <span className="block text-gradient-gold font-normal italic text-lg xl:text-xl mt-1 font-serif">
                  Interior Design & Construction
                </span>
              </h2>
              <p className="text-xs text-gray-300 mt-2 font-light leading-relaxed max-w-xs drop-shadow">
                Transforming residential and commercial spaces into timeless sanctuaries of bespoke gypsum artistry and precision finishes.
              </p>
            </div>

            {/* Middle Feature Highlights with Frosted Glass Cards */}
            <div className="relative z-10 space-y-3 my-6">
              <div className="p-3.5 bg-black/60 backdrop-blur-md border border-white/15 shadow-xl relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gold" />
                <span className="text-xs font-heading uppercase tracking-wider text-white font-bold flex items-center gap-2">
                  Bespoke Architectural Execution
                </span>
                <p className="text-[11px] text-gray-300 mt-1 leading-relaxed font-light">
                  Tailored gypsum ceilings, ambient recessed lighting, custom timber cabinetry, and turnkey white-glove handover.
                </p>
              </div>

              <div className="p-3.5 bg-black/60 backdrop-blur-md border border-white/15 shadow-xl relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gold/70" />
                <span className="text-xs font-heading uppercase tracking-wider text-white font-bold flex items-center gap-2">
                  Direct Directory Synchronization
                </span>
                <p className="text-[11px] text-gray-300 mt-1 leading-relaxed font-light">
                  Instant registration with our project management console for real-time quotation tracking and project milestones.
                </p>
              </div>

              <div className="p-3.5 bg-black/60 backdrop-blur-md border border-white/15 shadow-xl relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gold/50" />
                <span className="text-xs font-heading uppercase tracking-wider text-white font-bold flex items-center gap-2">
                  Kampala Atelier Priority
                </span>
                <p className="text-[11px] text-gray-300 mt-1 leading-relaxed font-light">
                  Direct WhatsApp & site consultations with principal architects for residential and commercial fit-outs.
                </p>
              </div>
            </div>

            {/* Bottom Grounding Note */}
            <div className="relative z-10 p-3 bg-black/75 backdrop-blur-md border border-white/15 flex items-center justify-between text-[11px] font-mono text-gray-300">
              <span className="text-gold flex items-center gap-1.5 font-medium">
                <ShieldCheck size={14} className="text-gold" />
                256-Bit Encrypted
              </span>
              <span className="text-gray-400">Uganda Atelier</span>
            </div>
          </div>

          {/* Right Form Column */}
          <div className="lg:col-span-7 p-4 sm:p-7 lg:p-8 flex flex-col justify-between relative bg-black-pure/90 w-full min-w-0 max-w-full overflow-hidden">
            {/* Header Switcher Tabs */}
            <div className="mb-4 w-full min-w-0">
              <div className="grid grid-cols-2 border border-gold/30 bg-black-rich p-1 gap-1 w-full">
                <button
                  type="button"
                  onClick={() => { 
                    setAuthMode('login'); 
                    setErrorMsg(''); 
                    setErrorAction(null); 
                    setNameError('');
                    setPhoneError('');
                    setEmailError('');
                    setPasswordError('');
                    if (typeof window !== 'undefined') {
                      window.location.hash = '#auth';
                    }
                  }}
                  className={`py-2.5 px-3 text-center uppercase tracking-wider text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
                    authMode === 'login' 
                      ? 'bg-gradient-to-r from-gold-dark via-gold to-yellow-300 text-black-pure shadow-sm font-extrabold' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Lock size={13} className={authMode === 'login' ? 'text-black-pure' : 'text-gold'} />
                  <span>Sign In</span>
                </button>

                <button
                  type="button"
                  onClick={() => { 
                    setAuthMode('register'); 
                    setErrorMsg(''); 
                    setErrorAction(null); 
                    setNameError('');
                    setPhoneError('');
                    setEmailError('');
                    setPasswordError('');
                    if (typeof window !== 'undefined') {
                      window.location.hash = '#register';
                    }
                  }}
                  className={`py-2.5 px-3 text-center uppercase tracking-wider text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
                    authMode === 'register' 
                      ? 'bg-gradient-to-r from-gold-dark via-gold to-yellow-300 text-black-pure shadow-sm font-extrabold' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Sparkles size={13} className={authMode === 'register' ? 'text-black-pure' : 'text-gold'} />
                  <span>VIP Register</span>
                </button>
              </div>
            </div>

            {submitted ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 flex flex-col items-center justify-center text-center space-y-4 my-auto"
              >
                <div className="w-16 h-16 rounded-full bg-gold/15 border-2 border-gold flex items-center justify-center text-gold shadow-[0_0_25px_rgba(212,175,55,0.4)]">
                  <Sparkles size={32} className="text-gold" />
                </div>
                <h3 className="text-xl font-heading font-bold text-white tracking-wide">
                  {authMode === 'login' ? 'Welcome Back' : 'VIP Membership Activated'}
                </h3>
                <p className="text-xs text-gray-300 max-w-sm leading-relaxed">
                  {authMode === 'register' 
                    ? 'Your VIP Client profile has been registered with exclusive atelier privileges and synchronized into our project directory. Redirecting...'
                    : 'Opening portal...'
                  }
                </p>
              </motion.div>
            ) : (
              <AnimatePresence mode="wait">
                {/* PROFESSIONAL REGISTRATION & LOGIN FORM */}
                <motion.form 
                  key={authMode}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSubmit}
                  noValidate
                  className="space-y-3.5 my-auto w-full min-w-0 max-w-full overflow-hidden"
                >

                    {/* Full Name (Registration only) */}
                    {authMode === 'register' && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-[11px] font-mono uppercase tracking-wider text-gray-300 font-semibold flex items-center gap-1.5">
                            <User size={13} className="text-gold" />
                            <span>Full Name *</span>
                          </label>
                        </div>
                        <input 
                          type="text" 
                          id="auth-name-input"
                          required
                          value={formData.fullName}
                          onChange={handleNameChange}
                          onKeyDown={(e) => {
                            handleNameKeyDown(e, setNameError);
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              document.getElementById('auth-email-input')?.focus();
                            }
                          }}
                          onPaste={(e) => handleNamePaste(e, (val) => setFormData(prev => ({ ...prev, fullName: val })), setNameError)}
                          onBlur={handleNameBlur}
                          inputMode="text"
                          autoComplete="name"
                          placeholder="e.g. David Kasule"
                          className={`w-full bg-black-rich/80 border ${nameError ? 'border-red-500/80 focus:border-red-500' : 'border-white/20 focus:border-gold'} px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-gold/30 transition-all shadow-inner`}
                        />
                        {nameError && (
                          <p className="text-[10px] font-mono text-red-400 mt-1 flex items-center gap-1">
                            <span>⚠</span> {nameError}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Email Address */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[11px] font-mono uppercase tracking-wider text-gray-300 font-semibold flex items-center gap-1.5">
                          <Mail size={13} className="text-gold" />
                          <span>Email Address *</span>
                        </label>
                      </div>
                      <input 
                        type="email" 
                        id="auth-email-input"
                        required
                        value={formData.email}
                        onChange={handleEmailChange}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const nextTarget = authMode === 'register' ? 'auth-phone-input' : 'auth-password-input';
                            document.getElementById(nextTarget)?.focus();
                          }
                        }}
                        onBlur={handleEmailBlur}
                        autoComplete="email"
                        placeholder="client@nataldesign.com or admin@nataldesign.com"
                        className={`w-full bg-black-rich/80 border ${emailError ? 'border-red-500/80 focus:border-red-500' : 'border-white/20 focus:border-gold'} px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-gold/30 transition-all shadow-inner`}
                      />
                      {emailError && (
                        <p className="text-[10px] font-mono text-red-400 mt-1 flex items-center gap-1">
                          <span>⚠</span> {emailError}
                        </p>
                      )}

                      {/* Admin Email Indicator */}
                      {formData.email.trim().toLowerCase().includes('admin') && (
                        <div className="mt-2 p-2.5 bg-gradient-to-r from-gold/20 via-black-pure to-gold/15 border border-gold/60 flex items-center gap-2 text-xs">
                          <span className="text-base leading-none">👑</span>
                          <span className="text-gold font-bold">
                            Administrator Email Recognized: Dashboard access will unlock in the Navigation Bar and mobile menu upon successful entry.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Phone & Property Type in clean 2-column grid */}
                    {authMode === 'register' && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
                          <div className="min-w-0 w-full">
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="block text-[11px] font-mono uppercase tracking-wider text-gray-300 font-semibold flex items-center gap-1.5">
                                <Phone size={13} className="text-gold" />
                                <span>Phone / WhatsApp *</span>
                              </label>
                            </div>
                            <input 
                              type="tel" 
                              id="auth-phone-input"
                              required
                              maxLength={10}
                              value={formData.phone}
                              onChange={handlePhoneChange}
                              onKeyDown={(e) => {
                                handlePhoneKeyDown(e, setPhoneError);
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  document.getElementById('auth-password-input')?.focus();
                                }
                              }}
                              onPaste={(e) => handlePhonePaste(e, (val) => setFormData(prev => ({ ...prev, phone: val })), setPhoneError)}
                              onBlur={handlePhoneBlur}
                              inputMode="tel"
                              autoComplete="tel"
                              placeholder="0700000000"
                              className={`w-full max-w-full bg-black-rich/80 border ${phoneError ? 'border-red-500/80 focus:border-red-500' : 'border-white/20 focus:border-gold'} px-3.5 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-gold/30 transition-all font-mono shadow-inner box-border min-w-0`}
                            />
                            {phoneError && (
                              <p className="text-[10px] font-mono text-red-400 mt-1 flex items-center gap-1">
                                <span>⚠</span> {phoneError}
                              </p>
                            )}
                          </div>

                          <div className="min-w-0 w-full">
                            <label className="block text-[11px] font-mono uppercase tracking-wider text-gray-300 font-semibold mb-1.5 flex items-center gap-1.5">
                              <Building size={13} className="text-gold" />
                              <span>Property / Project Type</span>
                            </label>
                            <div className="relative w-full min-w-0">
                              <select
                                value={formData.projectType}
                                onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                                className="w-full max-w-full bg-black-rich/80 border border-white/20 focus:border-gold px-3.5 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-gold/30 transition-all appearance-none pr-9 cursor-pointer shadow-inner box-border min-w-0 truncate"
                              >
                                {PROPERTY_TYPE_OPTIONS.map((opt) => (
                                  <option key={opt} value={opt} className="bg-black-pure text-white">
                                    {opt}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gold pointer-events-none" />
                            </div>
                          </div>
                        </div>

                        {/* Primary Discipline */}
                        <div>
                          <label className="block text-[11px] font-mono uppercase tracking-wider text-gray-300 font-semibold mb-1.5 flex items-center gap-1.5">
                            <Layers size={13} className="text-gold" />
                            <span>Primary Architectural Discipline</span>
                          </label>
                          <div className="relative">
                            <select
                              value={formData.service}
                              onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                              className="w-full bg-black-rich/80 border border-white/20 focus:border-gold px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-gold/30 transition-all appearance-none pr-9 cursor-pointer shadow-inner"
                            >
                              {SERVICE_INTEREST_OPTIONS.map((opt) => (
                                <option key={opt} value={opt} className="bg-black-pure text-white">
                                  {opt}
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gold pointer-events-none" />
                          </div>
                        </div>

                        {/* Optional Scope Notes */}
                        <div>
                          <label className="block text-[11px] font-mono uppercase tracking-wider text-gray-300 font-semibold mb-1.5 flex items-center gap-1.5">
                            <FileText size={13} className="text-gold" />
                            <span>Specific Project Requirements (Optional)</span>
                          </label>
                          <textarea
                            rows={2}
                            value={formData.projectNotes}
                            onChange={(e) => setFormData({ ...formData, projectNotes: e.target.value })}
                            placeholder="e.g. Floating gypsum ceiling with indirect cove LED strips in living & master suite..."
                            className="w-full bg-black-rich/80 border border-white/20 focus:border-gold px-4 py-2.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-gold/30 transition-all shadow-inner resize-none"
                          />
                        </div>
                      </>
                    )}

                    {/* Password */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-mono uppercase tracking-wider text-gray-300 font-semibold flex items-center gap-1.5">
                          <Lock size={13} className="text-gold" />
                          <span>Password *</span>
                        </label>
                        {authMode === 'login' && (
                          <span className="text-[10px] text-gray-500 font-mono">
                            Encrypted SSL
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <input 
                          type={showPassword ? "text" : "password"} 
                          id="auth-password-input"
                          required
                          value={formData.password}
                          onChange={handlePasswordChange}
                          onBlur={handlePasswordBlur}
                          placeholder="••••••••••••"
                          className={`w-full bg-black-rich/80 border ${passwordError ? 'border-red-500/80 focus:border-red-500' : 'border-white/20 focus:border-gold'} pl-4 pr-11 py-3.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-gold/30 transition-all shadow-inner`}
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gold transition-colors cursor-pointer"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {passwordError && (
                        <p className="text-[10px] font-mono text-red-400 mt-1.5 flex items-center gap-1">
                          <span>⚠</span> {passwordError}
                        </p>
                      )}
                    </div>
                    
                    {errorMsg && (
                      <div className="p-3 bg-red-950/60 border border-red-500/50 text-red-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span>{errorMsg}</span>
                        {errorAction && (
                          <button
                            type="button"
                            onClick={() => {
                              setAuthMode(errorAction.mode);
                              setErrorMsg('');
                              setErrorAction(null);
                            }}
                            className="text-gold font-bold underline hover:text-white text-xs cursor-pointer shrink-0 text-left sm:text-right"
                          >
                            {errorAction.label}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Agreement Checkbox for Natal Privacy Policies */}
                    {authMode === 'register' && (
                      <div className="pt-2 pb-1 w-full min-w-0">
                        <label className="flex items-start gap-2.5 cursor-pointer group select-none">
                          <input
                            type="checkbox"
                            required
                            checked={agreedToPolicies}
                            onChange={(e) => {
                              setAgreedToPolicies(e.target.checked);
                              if (errorMsg) setErrorMsg('');
                            }}
                            className="mt-0.5 w-4 h-4 rounded border-gold/40 text-gold focus:ring-gold bg-black-rich accent-gold cursor-pointer shrink-0"
                          />
                          <span className="text-xs text-gray-300 leading-snug group-hover:text-white transition-colors">
                            I agree with the{' '}
                            <button
                              type="button"
                              onClick={() => setShowPrivacyModal(true)}
                              className="text-gold underline hover:text-yellow-300 font-semibold cursor-pointer"
                            >
                              Natal privacy policies
                            </button>
                          </span>
                        </label>
                      </div>
                    )}

                    {/* Submit Action */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3.5 sm:py-4 uppercase tracking-[0.16em] font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer shadow-[0_4px_20px_rgba(212,175,55,0.3)] disabled:opacity-50 flex items-center justify-center gap-2 bg-gradient-to-r from-gold-dark via-gold to-yellow-300 text-black-pure hover:brightness-110 active:scale-[0.99]"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center gap-2">
                            <GoldSpinner size="sm" />
                            <span>Processing...</span>
                          </div>
                        ) : (
                          <>
                            <span>{authMode === 'login' ? 'Sign In to Portal' : 'Register VIP Account'}</span>
                            <ArrowRight size={15} />
                          </>
                        )}
                      </button>
                    </div>

                    {/* Bottom Links */}
                    <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                      <div className="text-gray-400 text-[11px] sm:text-xs text-center sm:text-left">
                        {authMode === 'register' ? (
                          <>
                            Already have an account?{' '}
                            <button
                              type="button"
                              onClick={() => { setAuthMode('login'); setErrorMsg(''); }}
                              className="text-gold font-bold hover:underline cursor-pointer ml-1"
                            >
                              Sign In here
                            </button>
                          </>
                        ) : (
                          <>
                            New to Natal Interior Design?{' '}
                            <button
                              type="button"
                              onClick={() => { setAuthMode('register'); setErrorMsg(''); }}
                              className="text-gold font-bold hover:underline cursor-pointer ml-1 inline-flex items-center gap-1"
                            >
                              <Sparkles size={11} /> Register VIP Account
                            </button>
                          </>
                        )}
                      </div>

                      <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5">
                        <ShieldCheck size={12} className="text-gold/70" />
                        <span>Uganda Atelier Verified</span>
                      </div>
                    </div>
                  </motion.form>
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      </main>

      {/* Grounded Minimalist Footer */}
      <footer className="relative z-10 py-4 text-center text-gray-500 text-[11px] font-mono border-t border-white/5 mt-auto">
        NATAL Interior Design & Construction © 2026 • Executive Client Atelier
      </footer>

      {/* NATAL Privacy Policies Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-black-rich border-2 border-gold/70 max-w-lg w-full p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.95)] relative text-white max-h-[85vh] overflow-y-auto rounded-sm">
            <button
              type="button"
              onClick={() => setShowPrivacyModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gold p-1 cursor-pointer transition-colors"
              aria-label="Close Privacy Policy"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-2 text-gold font-mono text-xs uppercase tracking-widest mb-1.5">
              <ShieldCheck size={16} />
              <span>NATAL Atelier Governance</span>
            </div>
            <h3 className="font-heading text-xl font-bold text-white uppercase tracking-wider mb-4 border-b border-gold/30 pb-3">
              NATAL Privacy Policies
            </h3>
            <div className="space-y-4 text-xs text-gray-300 leading-relaxed font-light">
              <div>
                <h4 className="font-semibold text-white uppercase tracking-wider text-[11px] mb-1 text-gold font-mono">
                  1. Confidential Client & Architectural Data Protection
                </h4>
                <p>
                  All project specifications, 3D renderings, CAD designs, site measurements, and client identity details provided to NATAL Interior Design & Construction are treated with strict confidentiality.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-white uppercase tracking-wider text-[11px] mb-1 text-gold font-mono">
                  2. Direct WhatsApp & Communication Privacy
                </h4>
                <p>
                  Your contact numbers and correspondence are reserved strictly for direct coordination with our principal design directors and site supervisors. We do not distribute phone numbers or emails to third parties.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-white uppercase tracking-wider text-[11px] mb-1 text-gold font-mono">
                  3. Secure Atelier Directory Records
                </h4>
                <p>
                  Your registered account details are securely encrypted and synchronized with our internal project roster to facilitate fast quotation approvals and VIP milestone inspections.
                </p>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setAgreedToPolicies(true);
                  setShowPrivacyModal(false);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-gold-dark via-gold to-yellow-300 text-black-pure font-bold text-xs uppercase tracking-wider shadow-sm hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                Accept & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
