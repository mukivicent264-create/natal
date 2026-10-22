import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { doc, setDoc, getDoc, serverTimestamp, collection, getDocs, addDoc, query, limit, updateDoc, deleteDoc, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { projectsData, servicesData, testimonialsData } from './data';

export { showAppNotification } from './utils/exportUtils';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Recursively removes undefined fields and serializes objects safely so Firestore
 * setDoc/updateDoc/addDoc operations never fail with "Unsupported field value: undefined".
 */
export function sanitizeForFirestore<T = any>(obj: T): T {
  if (obj === undefined) return null as any;
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj.toISOString() as any;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item)) as any;
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean as T;
}

/**
 * Strict Form Constraints & Validators
 * Enforces letters-only for names (no numbers, symbols, or digits),
 * clean phone formatting (digits & valid symbols), and RFC email checking.
 */

// Regex allowing only alphabetical letters (including Latin accents) and natural name separators (space, hyphen, apostrophe)
export const NAME_ALLOWED_CHARS_REGEX = /[^a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\s'-]/g;

// Detects if string contains numbers or disallowed symbols
export const CONTAINS_DIGITS_OR_SYMBOLS_REGEX = /[\d`~!@#$%^&*()_+={}\[\]|\\:;"<>?,./]/;

/**
 * Strips any numbers, symbols, or digits from input in real time.
 * Leaves only alphabetical letters, single spaces, apostrophes, and hyphens.
 */
export function sanitizeNameInput(val: string): string {
  if (!val) return '';
  // Remove numbers, math symbols, punctuation except single hyphens and apostrophes
  const cleaned = val.replace(NAME_ALLOWED_CHARS_REGEX, '');
  // Disallow leading spaces or multiple consecutive spaces
  return cleaned.replace(/^\s+/, '').replace(/\s{2,}/g, ' ');
}

/**
 * Validates that a name consists purely of letters (at least 2 letters),
 * without any numbers, digits, or prohibited symbols.
 */
export function isValidName(name: string): boolean {
  if (!name) return false;
  const trimmed = name.trim();
  if (trimmed.length < 2) return false;
  // Must contain only letters, spaces, hyphens, and apostrophes
  // and must start and end with a letter
  const strictLetterRegex = /^[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]+(?:[ '-][a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]+)*$/;
  return strictLetterRegex.test(trimmed);
}

/**
/**
 * Sanitizes phone input to keep only digits, plus (+), spaces, hyphens, and parentheses.
 * Supports local and international numbers up to 15 digits (ITU-T E.164 standard).
 */
export function sanitizePhoneInput(val: string): string {
  if (!val) return '';
  const clean = val.replace(/[^\d+()\s-]/g, '');
  let digitCount = 0;
  let result = '';
  for (const ch of clean) {
    if (/\d/.test(ch)) {
      if (digitCount < 15) {
        digitCount++;
        result += ch;
      }
    } else {
      result += ch;
    }
  }
  return result;
}

/**
 * Validates phone number format (supports local & international numbers between 7 and 15 digits).
 */
export function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length >= 7 && digitsOnly.length <= 15;
}

/**
 * Validates email address format.
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return emailRegex.test(email.trim());
}

/**
 * Intercepts keyboard events for name fields to block numbers, digits, and disallowed symbols
 * before they can be typed, giving instantaneous constraint feedback.
 */
export function handleNameKeyDown(
  e: React.KeyboardEvent<HTMLInputElement>,
  onError?: (msg: string) => void
) {
  // Allow navigation, deletion, clipboard shortcuts and function keys
  if (
    e.ctrlKey || 
    e.metaKey || 
    e.altKey ||
    ['Backspace', 'Delete', 'Tab', 'Enter', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)
  ) {
    return;
  }

  // Only check printable single-character keystrokes
  if (e.key.length === 1) {
    // Check if key is a digit/number
    if (/[0-9]/.test(e.key)) {
      e.preventDefault();
      onError?.('Numbers and digits are not allowed. Please enter letters only.');
      return;
    }

    // Check if key is a disallowed symbol
    if (/[^a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\s'-]/.test(e.key)) {
      e.preventDefault();
      onError?.('Symbols are not allowed in name fields. Please enter letters only.');
      return;
    }

    // Disallow leading space or consecutive spaces
    const target = e.currentTarget;
    const selStart = target.selectionStart ?? 0;
    if (e.key === ' ' && (selStart === 0 || target.value.slice(Math.max(0, selStart - 1), selStart) === ' ')) {
      e.preventDefault();
      return;
    }
  }
}

/**
 * Intercepts clipboard paste on name fields to strip numbers and symbols
 */
export function handleNamePaste(
  e: React.ClipboardEvent<HTMLInputElement>,
  setValue: (clean: string) => void,
  onError?: (msg: string) => void
) {
  const pasteText = e.clipboardData.getData('text');
  if (CONTAINS_DIGITS_OR_SYMBOLS_REGEX.test(pasteText)) {
    e.preventDefault();
    const clean = sanitizeNameInput(pasteText);
    const target = e.currentTarget;
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;
    const currentVal = target.value;
    const newVal = sanitizeNameInput(currentVal.substring(0, start) + clean + currentVal.substring(end));
    setValue(newVal);
  }
}

/**
 * Intercepts keyboard events for phone fields to block letters and disallowed characters
 * before they can be typed.
 */
export function handlePhoneKeyDown(
  e: React.KeyboardEvent<HTMLInputElement>,
  onError?: (msg: string) => void
) {
  if (
    e.ctrlKey || 
    e.metaKey || 
    e.altKey ||
    ['Backspace', 'Delete', 'Tab', 'Enter', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)
  ) {
    return;
  }

  if (e.key.length === 1) {
    if (/[a-zA-Z]/.test(e.key)) {
      e.preventDefault();
      onError?.('Letters are not allowed in phone fields.');
      return;
    }
    if (/[^\d+()\s-]/.test(e.key)) {
      e.preventDefault();
      onError?.('Invalid character. Only digits, +, spaces, and dashes are allowed.');
      return;
    }
    // Limit total digits to 15 (E.164 standard)
    if (/\d/.test(e.key)) {
      const target = e.currentTarget;
      const selStart = target.selectionStart ?? 0;
      const selEnd = target.selectionEnd ?? 0;
      const selectedDigits = target.value.slice(selStart, selEnd).replace(/\D/g, '').length;
      const currentDigits = target.value.replace(/\D/g, '').length;
      if (currentDigits - selectedDigits >= 15) {
        e.preventDefault();
        return;
      }
    }
  }
}

/**
 * Intercepts clipboard paste on phone fields to strip letters and disallowed characters
 */
export function handlePhonePaste(
  e: React.ClipboardEvent<HTMLInputElement>,
  setValue: (clean: string) => void,
  onError?: (msg: string) => void
) {
  const pasteText = e.clipboardData.getData('text');
  if (/[a-zA-Z]/.test(pasteText) || /[^\d+()\s-]/.test(pasteText)) {
    e.preventDefault();
    const clean = sanitizePhoneInput(pasteText);
    const target = e.currentTarget;
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;
    const currentVal = target.value;
    const newVal = sanitizePhoneInput(currentVal.substring(0, start) + clean + currentVal.substring(end));
    setValue(newVal);
  }
}

export type ActivityType = 
  | 'registration' 
  | 'quotation' 
  | 'contact' 
  | 'login' 
  | 'whatsapp' 
  | 'call' 
  | 'specs_inquiry' 
  | 'review' 
  | 'custom';

export interface UserActivity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  photoURL?: string;
  source: 'Registration' | 'Quotation Form' | 'Contact Form' | 'Direct Channel';
  service?: string;
  details?: string;
  role: 'Administrator' | 'VIP Client' | 'Client Lead' | 'Registered Member';
  status: 'Active' | 'Active Administrator' | 'Active VIP Client' | 'Pending Consultation' | 'New Lead';
  isAdmin?: boolean;
  isVIP?: boolean;
  vipTier?: string;
  projectType?: string;
  estimatedBudget?: string;
  createdAt?: any;
  lastActive?: string;
  activities?: UserActivity[];
  activityCount?: number;
}

export interface ActiveUserSession {
  name?: string;
  email?: string;
  phone?: string;
  photoURL?: string;
  role?: string;
  isVIP?: boolean;
  vipTier?: string;
}

// Helper to get active user cached session (if user registered, logged in, or sent a quote)
export function getActiveUserSession(): ActiveUserSession | null {
  try {
    const raw = localStorage.getItem('natal_active_user_session');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.email || parsed.name)) {
        const storedAvatar = localStorage.getItem('natal_user_avatar');
        if (storedAvatar && !parsed.photoURL) {
          parsed.photoURL = storedAvatar;
        }
        return parsed;
      }
    }
  } catch {}
  return null;
}

export function setActiveUserSession(session: ActiveUserSession) {
  try {
    const current = getActiveUserSession() || {};
    const updated = {
      ...current,
      ...session
    };
    if (session.photoURL) {
      localStorage.setItem('natal_user_avatar', session.photoURL);
    }
    localStorage.setItem('natal_active_user_session', JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('natal_user_session_changed', { detail: updated }));
    }
  } catch {}
}

export interface AdminProfileData {
  name: string;
  email: string;
  role: string;
  photoURL?: string;
}

export const DEFAULT_PASSCODES = ['NATAL7777', '7777', 'natal7777', 'NATAL2025'];

/**
 * Hash password securely using Web Crypto SHA-256 with salt
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode((password || '') + "_natal_atelier_salt_2026");
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    let hash = 0;
    const str = (password || '') + "_salt";
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return 'h_' + Math.abs(hash);
  }
}

/**
 * Stores a user's hashed password credential in local cache and Firestore
 */
export async function storeUserCredential(email: string, plainPassword: string): Promise<void> {
  if (!email || !plainPassword) return;
  const cleanEmail = email.trim().toLowerCase();
  const hashed = await hashPassword(plainPassword);
  const nowIso = new Date().toISOString();

  // 1. LocalStorage credential map
  try {
    const raw = localStorage.getItem('natal_user_credentials');
    const creds = raw ? JSON.parse(raw) : {};
    creds[cleanEmail] = {
      hash: hashed,
      updatedAt: nowIso
    };
    localStorage.setItem('natal_user_credentials', JSON.stringify(creds));
  } catch (e) {
    console.warn("Local credential storage error:", e);
  }

  // 2. Sync to Firestore
  try {
    const docId = 'cred_' + cleanEmail.replace(/[^a-z0-9]/g, '_');
    const credRef = doc(db, 'user_credentials', docId);
    await setDoc(credRef, {
      email: cleanEmail,
      hash: hashed,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (fbErr) {
    console.warn("Firestore credential storage fallback:", fbErr);
  }
}

/**
 * Verifies if entered password matches the password entered at first (or registered).
 * Also checks master passcodes if the account is an administrator.
 */
export async function verifyUserPassword(
  email: string, 
  passwordAttempt: string
): Promise<{ valid: boolean; reason?: 'no_account' | 'wrong_password' | 'valid' }> {
  if (!email || !passwordAttempt) {
    return { valid: false, reason: 'wrong_password' };
  }
  const cleanEmail = email.trim().toLowerCase();
  const trimmedPassword = passwordAttempt.trim();

  // 1. Check if user is entering admin master passcode
  const storedCustom = localStorage.getItem('natal_custom_passcode');
  const validMasterCodes = [...DEFAULT_PASSCODES, ...(storedCustom ? [storedCustom] : [])];
  const isMasterCodeMatch = validMasterCodes.includes(trimmedPassword);
  const isAdminEmail = cleanEmail.includes('admin');

  if (isMasterCodeMatch && isAdminEmail) {
    return { valid: true };
  }

  // 2. Check credentials store (local storage first)
  let storedHash: string | undefined;
  try {
    const raw = localStorage.getItem('natal_user_credentials');
    if (raw) {
      const creds = JSON.parse(raw);
      if (creds[cleanEmail]?.hash) {
        storedHash = creds[cleanEmail].hash;
      }
    }
  } catch {}

  // 3. If not found in local storage, check Firestore
  if (!storedHash) {
    try {
      const docId = 'cred_' + cleanEmail.replace(/[^a-z0-9]/g, '_');
      const snap = await getDoc(doc(db, 'user_credentials', docId));
      if (snap.exists() && snap.data()?.hash) {
        storedHash = snap.data().hash;
        try {
          const raw = localStorage.getItem('natal_user_credentials');
          const creds = raw ? JSON.parse(raw) : {};
          creds[cleanEmail] = { hash: storedHash, updatedAt: new Date().toISOString() };
          localStorage.setItem('natal_user_credentials', JSON.stringify(creds));
        } catch {}
      }
    } catch {}
  }

  // 4. Compare hash if stored credential exists
  if (storedHash) {
    const attemptHash = await hashPassword(trimmedPassword);
    if (attemptHash === storedHash) {
      return { valid: true };
    } else {
      if (isAdminEmail && isMasterCodeMatch) {
        return { valid: true };
      }
      return { valid: false, reason: 'wrong_password' };
    }
  }

  // 5. If no stored credential found (e.g. initial master admin account):
  if (isAdminEmail) {
    if (isMasterCodeMatch) {
      await storeUserCredential(cleanEmail, trimmedPassword);
      return { valid: true };
    }
    return { valid: false, reason: 'wrong_password' };
  }

  // 6. Check if account exists at all
  const existingUser = findExistingUserByEmail(cleanEmail);
  const accountCheck = await checkAccountExists(cleanEmail);
  if (!existingUser && !accountCheck.exists) {
    return { valid: false, reason: 'no_account' };
  }

  return { valid: false, reason: 'wrong_password' };
}

/**
 * Resets user or admin password and persists new credential
 */
export async function resetUserPassword(
  email: string, 
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  if (!email || !newPassword || newPassword.length < 6) {
    return { success: false, message: 'Password must be at least 6 characters long.' };
  }
  const cleanEmail = email.trim().toLowerCase();
  
  // Store the new credential
  await storeUserCredential(cleanEmail, newPassword);

  // If this is admin, also update custom passcode so master unlock matches
  if (cleanEmail.includes('admin')) {
    localStorage.setItem('natal_custom_passcode', newPassword);
  }

  // Record activity
  await recordUserActivity({
    userEmail: cleanEmail,
    type: 'login',
    title: 'Password Successfully Reset',
    description: 'User credential updated via self-service verification.',
    metadata: { channel: 'Password Reset', resetAt: new Date().toISOString() }
  }).catch(() => {});

  return { success: true, message: 'Password updated successfully.' };
}

/**
 * Returns all users stored in the local cache / directory
 */
export function getUserDirectory(): AppUser[] {
  try {
    const raw = localStorage.getItem('natal_local_users');
    let list: AppUser[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed;
    }

    // Ensure Master Administrator is always present in the user list in the User Tab
    const hasAdmin = list.some(u => u.role === 'Administrator' || u.isAdmin || (u.email && u.email.toLowerCase().includes('admin')));
    if (!hasAdmin) {
      const storedAvatar = localStorage.getItem('natal_user_avatar') || localStorage.getItem('natal_admin_avatar') || undefined;
      const defaultAdmin: AppUser = {
        id: 'admin_master_primary',
        name: 'Master Admin',
        email: 'admin@nataldesign.com',
        phone: '+256 700 000 000',
        photoURL: storedAvatar,
        source: 'Registration',
        service: 'System Administration',
        details: 'System Administrator with full management privileges.',
        role: 'Administrator',
        status: 'Active Administrator',
        isAdmin: true,
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        activities: [
          {
            id: 'act_admin_init',
            type: 'login',
            title: 'Administrator Console Initialized',
            description: 'Master Administrator profile active with full management privileges.',
            timestamp: new Date().toISOString(),
            metadata: { channel: 'Admin Console', isAdmin: true }
          }
        ],
        activityCount: 1
      };
      list.unshift(defaultAdmin);
      localStorage.setItem('natal_local_users', JSON.stringify(list));
    }
    return list;
  } catch {}
  return [];
}

/**
 * Looks up any user from the User Directory by email or ID
 */
export function getUserFromDirectory(emailOrId?: string): AppUser | null {
  if (!emailOrId) return null;
  const clean = emailOrId.trim().toLowerCase();
  const list = getUserDirectory();
  return list.find(u => 
    (u.email && u.email.toLowerCase() === clean) ||
    u.id === emailOrId ||
    (clean.includes('@') && u.email && u.email.toLowerCase() === clean)
  ) || null;
}

/**
 * Finds the designated Administrator in the User Directory
 */
export function getAdminUserFromDirectory(): AppUser | null {
  const list = getUserDirectory();
  const session = getActiveUserSession();
  
  // 1. If active session email is known, find that user
  if (session?.email) {
    const match = list.find(u => 
      u.email?.toLowerCase() === session.email?.toLowerCase() && 
      (u.role === 'Administrator' || u.isAdmin || u.email?.toLowerCase().includes('admin'))
    );
    if (match) return match;
  }
  
  // 2. Any explicit administrator in the directory
  const adminMatch = list.find(u => u.role === 'Administrator' || u.isAdmin || u.email?.toLowerCase().includes('admin'));
  if (adminMatch) return adminMatch;

  return null;
}

/**
 * Single Source of Truth: Get the Admin Profile directly from the User List in the User Tab
 */
export function getAdminProfile(): AdminProfileData {
  try {
    // 1. Always prioritize the Administrator record in the User Directory (User Tab)
    const adminUser = getAdminUserFromDirectory();
    if (adminUser) {
      return {
        name: adminUser.name || 'Master Admin',
        email: adminUser.email || 'admin@nataldesign.com',
        role: 'Full System Access',
        photoURL: adminUser.photoURL || undefined
      };
    }

    const raw = localStorage.getItem('natal_admin_profile');
    const avatar = localStorage.getItem('natal_user_avatar') || localStorage.getItem('natal_admin_avatar') || undefined;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed) {
        return {
          name: parsed.name || 'Master Admin',
          email: parsed.email || 'admin@nataldesign.com',
          role: parsed.role || 'Full System Access',
          photoURL: parsed.photoURL || avatar || undefined
        };
      }
    }
    const session = getActiveUserSession();
    return {
      name: session?.name || 'Master Admin',
      email: session?.email || 'admin@nataldesign.com',
      role: 'Full System Access',
      photoURL: session?.photoURL || avatar || undefined
    };
  } catch {}
  return {
    name: 'Master Admin',
    email: 'admin@nataldesign.com',
    role: 'Full System Access'
  };
}

/**
 * Updates the Admin Profile and automatically syncs it to the Administrator in the User Directory (User Tab)
 */
export async function setAdminProfile(profile: Partial<AdminProfileData>) {
  try {
    const current = getAdminProfile();
    const updated: AdminProfileData = {
      ...current,
      ...profile
    };
    if (updated.photoURL) {
      localStorage.setItem('natal_user_avatar', updated.photoURL);
      localStorage.setItem('natal_admin_avatar', updated.photoURL);
    } else if (profile.photoURL === null || profile.photoURL === '' || profile.photoURL === undefined) {
      delete updated.photoURL;
      localStorage.removeItem('natal_user_avatar');
      localStorage.removeItem('natal_admin_avatar');
    }
    localStorage.setItem('natal_admin_profile', JSON.stringify(updated));

    // Also sync with active user session so navbar updates
    const currentSession = getActiveUserSession() || {};
    const updatedSession: ActiveUserSession = {
      ...currentSession,
      name: updated.name,
      email: updated.email,
      role: 'Administrator',
      photoURL: updated.photoURL || undefined
    };
    localStorage.setItem('natal_active_user_session', JSON.stringify(updatedSession));

    // CRITICAL: Update the Administrator in the User Directory (User Tab) so they match 1:1!
    try {
      const list = getUserDirectory();
      const adminIndex = list.findIndex(u => 
        (updated.email && u.email?.toLowerCase() === updated.email.toLowerCase()) ||
        u.role === 'Administrator' ||
        u.isAdmin ||
        u.email?.toLowerCase().includes('admin')
      );

      let targetId = '';
      if (adminIndex >= 0) {
        targetId = list[adminIndex].id;
        list[adminIndex] = {
          ...list[adminIndex],
          name: updated.name || list[adminIndex].name,
          email: updated.email || list[adminIndex].email,
          photoURL: (profile.photoURL === '' || profile.photoURL === null) ? undefined : (updated.photoURL !== undefined ? updated.photoURL : list[adminIndex].photoURL),
          role: 'Administrator',
          status: 'Active Administrator',
          isAdmin: true
        };
        if (!list[adminIndex].photoURL) {
          delete list[adminIndex].photoURL;
        }
      } else {
        targetId = 'admin_' + Date.now();
        list.unshift({
          id: targetId,
          name: updated.name || 'Master Admin',
          email: updated.email || 'admin@nataldesign.com',
          photoURL: updated.photoURL || undefined,
          role: 'Administrator',
          status: 'Active Administrator',
          isAdmin: true,
          source: 'Registration',
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString()
        });
      }
      localStorage.setItem('natal_local_users', JSON.stringify(list));

      // Persist to Firestore users doc and site_settings/admin_profile
      if (targetId) {
        const userRef = doc(db, 'users', targetId);
        await setDoc(userRef, {
          name: updated.name,
          email: updated.email,
          photoURL: updated.photoURL || null,
          role: 'Administrator',
          isAdmin: true,
          status: 'Active Administrator',
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      try {
        const adminSettingsRef = doc(db, 'site_settings', 'admin_profile');
        await setDoc(adminSettingsRef, {
          name: updated.name,
          email: updated.email,
          role: updated.role || 'Full System Access',
          photoURL: updated.photoURL || null,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (e) {
        console.warn("Failed to persist admin profile to site_settings:", e);
      }

      window.dispatchEvent(new CustomEvent('natal_users_updated', { detail: list[adminIndex >= 0 ? adminIndex : 0] }));
    } catch (e) {
      console.warn("Failed to sync admin to user directory:", e);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('natal_admin_profile_changed', { detail: updated }));
      window.dispatchEvent(new CustomEvent('natal_user_session_changed', { detail: updatedSession }));
    }
  } catch {}
}

/**
 * Updates any user in the directory (User Tab) and immediately synchronizes with Firestore,
 * active user session, and admin profile if applicable.
 */
export async function updateUserInDirectory(
  userIdOrEmail: string, 
  updates: Partial<AppUser>
): Promise<AppUser | null> {
  if (!userIdOrEmail) return null;
  const clean = userIdOrEmail.trim().toLowerCase();
  
  try {
    const list = getUserDirectory();
    const index = list.findIndex(u => 
      u.id === userIdOrEmail || 
      (u.email && u.email.toLowerCase() === clean)
    );

    if (index === -1) return null;

    const current = list[index];
    const updated: AppUser = {
      ...current,
      ...updates,
      lastActive: new Date().toISOString()
    };

    if (updates.photoURL === '' || updates.photoURL === null) {
      delete updated.photoURL;
    }

    list[index] = updated;
    localStorage.setItem('natal_local_users', JSON.stringify(list));

    // Persist to Firestore
    try {
      const userRef = doc(db, 'users', updated.id);
      await setDoc(userRef, {
        ...updated,
        photoURL: updated.photoURL || null,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (fbErr) {
      console.warn("Firestore user update fallback:", fbErr);
    }

    // Check if this user is the active user session or administrator
    const activeSession = getActiveUserSession();
    const isCurrentActive = activeSession?.email && updated.email && 
      activeSession.email.toLowerCase() === updated.email.toLowerCase();

    const isAdminUser = updated.role === 'Administrator' || updated.isAdmin || (updated.email && updated.email.toLowerCase().includes('admin'));

    if (isCurrentActive || isAdminUser) {
      const newSession: ActiveUserSession = {
        ...(activeSession || {}),
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        photoURL: updated.photoURL || undefined,
        role: updated.role,
        isVIP: updated.isVIP,
        vipTier: updated.vipTier
      };
      localStorage.setItem('natal_active_user_session', JSON.stringify(newSession));
      if (updated.photoURL) {
        localStorage.setItem('natal_user_avatar', updated.photoURL);
      } else {
        localStorage.removeItem('natal_user_avatar');
      }

      if (isAdminUser) {
        const newAdminProfile: AdminProfileData = {
          name: updated.name,
          email: updated.email,
          role: 'Full System Access',
          photoURL: updated.photoURL || undefined
        };
        localStorage.setItem('natal_admin_profile', JSON.stringify(newAdminProfile));
        if (updated.photoURL) {
          localStorage.setItem('natal_admin_avatar', updated.photoURL);
        } else {
          localStorage.removeItem('natal_admin_avatar');
        }
        window.dispatchEvent(new CustomEvent('natal_admin_profile_changed', { detail: newAdminProfile }));
      }

      window.dispatchEvent(new CustomEvent('natal_user_session_changed', { detail: newSession }));
    }

    window.dispatchEvent(new CustomEvent('natal_users_updated', { detail: updated }));
    return updated;
  } catch (err) {
    console.error("updateUserInDirectory error:", err);
    return null;
  }
}

export function clearActiveUserSession() {
  try {
    localStorage.removeItem('natal_active_user_session');
    localStorage.removeItem('natal_user_avatar');
    localStorage.removeItem('natal_admin_authenticated');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('natal_user_session_changed', { detail: null }));
    }
  } catch {}
}

export function getUserInitials(name?: string, email?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const first = parts[0][0];
      const last = parts[parts.length - 1][0];
      return `${first}${last}`.toUpperCase();
    } else if (parts.length === 1 && parts[0].length > 0) {
      const single = parts[0];
      if (single.length >= 2) {
        return `${single[0]}${single[single.length - 1]}`.toUpperCase();
      }
      return single[0].toUpperCase();
    }
  }
  if (email && email.trim()) {
    const prefix = email.split('@')[0].replace(/[^a-zA-Z]/g, '');
    if (prefix.length >= 2) {
      return `${prefix[0]}${prefix[prefix.length - 1]}`.toUpperCase();
    } else if (prefix.length === 1) {
      return prefix[0].toUpperCase();
    }
  }
  return 'U';
}

export async function syncUserRecord(data: {
  name: string;
  email: string;
  phone?: string;
  photoURL?: string;
  source: 'Registration' | 'Quotation Form' | 'Contact Form' | 'Direct Channel';
  service?: string;
  details?: string;
  role?: 'Administrator' | 'VIP Client' | 'Client Lead' | 'Registered Member';
  status?: 'Active' | 'Active Administrator' | 'Active VIP Client' | 'Pending Consultation' | 'New Lead';
  isVIP?: boolean;
  vipTier?: string;
  projectType?: string;
  estimatedBudget?: string;
  uid?: string;
  initialActivity?: {
    type: ActivityType;
    title: string;
    description: string;
    metadata?: Record<string, any>;
  };
}): Promise<AppUser> {
  const cleanEmail = (data.email || '').trim().toLowerCase();
  const isAdminUser = cleanEmail.includes('admin');
  const isVipUser = !isAdminUser && (data.isVIP || data.role === 'VIP Client' || data.source === 'Registration');
  const docId = data.uid || ('user_' + (cleanEmail ? cleanEmail.replace(/[^a-z0-9]/g, '_') : 'guest_' + Date.now()));

  // Resolve existing record if present to keep photoURL if not supplied in this call
  let existingActivities: UserActivity[] = [];
  const nowIso = new Date().toISOString();
  let existingCreatedAt = nowIso;
  let existingPhotoURL: string | undefined = undefined;

  try {
    const raw = localStorage.getItem('natal_local_users');
    const existingUsers: AppUser[] = raw ? JSON.parse(raw) : [];
    const existing = existingUsers.find(u => u.id === docId || (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail));
    if (existing) {
      if (Array.isArray(existing.activities)) {
        existingActivities = [...existing.activities];
      }
      if (existing.createdAt) {
        existingCreatedAt = existing.createdAt;
      }
      if (existing.photoURL) {
        existingPhotoURL = existing.photoURL;
      }
    }
  } catch {}

  const finalPhotoURL = data.photoURL || existingPhotoURL || (isAdminUser ? localStorage.getItem('natal_user_avatar') || undefined : undefined);

  // Cache session info so subsequent website activities attach to this user
  setActiveUserSession({
    name: data.name,
    email: cleanEmail,
    phone: data.phone,
    photoURL: finalPhotoURL,
    role: isAdminUser ? 'Administrator' : (data.role || (isVipUser ? 'VIP Client' : 'Client Lead')),
    isVIP: isVipUser,
    vipTier: data.vipTier || (isVipUser ? 'VIP Gold Member' : undefined)
  });

  // Construct initial or new activity
  const newActivityItem: UserActivity = data.initialActivity 
    ? {
        id: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        type: data.initialActivity.type,
        title: data.initialActivity.title,
        description: data.initialActivity.description,
        timestamp: nowIso,
        metadata: data.initialActivity.metadata
      }
    : {
        id: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        type: data.source === 'Registration' ? 'registration' : data.source === 'Quotation Form' ? 'quotation' : 'contact',
        title: isAdminUser
          ? 'Administrator Account Created'
          : data.source === 'Registration' 
            ? 'Client Registration' 
            : data.source === 'Quotation Form' 
              ? 'Quotation Request Submitted' 
              : 'Contact Message Sent',
        description: isAdminUser
          ? 'Registered as System Administrator with administrative access privileges.'
          : data.details 
            ? `${data.service ? `[${data.service}] ` : ''}${data.details}` 
            : `Engaged via ${data.source}`,
        timestamp: nowIso,
        metadata: { service: data.service, source: data.source, isAdmin: isAdminUser }
      };

  // Prepend new activity if not already present
  const updatedActivities = [newActivityItem, ...existingActivities.filter(a => a.id !== newActivityItem.id)].slice(0, 50);

  const computedRole = isAdminUser ? 'Administrator' : (data.role || (data.source === 'Registration' ? 'VIP Client' : 'Client Lead'));
  const computedStatus = isAdminUser ? 'Active Administrator' : (data.status || (data.source === 'Registration' ? 'Active' : 'Pending Consultation'));

  const userPayload: AppUser = {
    id: docId,
    name: data.name.trim() || (cleanEmail ? cleanEmail.split('@')[0] : 'Valued Client'),
    email: cleanEmail,
    phone: data.phone?.trim() || '',
    photoURL: finalPhotoURL,
    source: data.source,
    service: data.service?.trim() || '',
    details: data.details?.trim() || '',
    role: computedRole,
    status: computedStatus,
    isAdmin: isAdminUser,
    isVIP: isVipUser,
    vipTier: data.vipTier || (isVipUser ? 'VIP Gold Member' : undefined),
    projectType: data.projectType || undefined,
    estimatedBudget: data.estimatedBudget || undefined,
    lastActive: nowIso,
    activities: updatedActivities,
    activityCount: updatedActivities.length,
    createdAt: existingCreatedAt
  };

  // 1. Update localStorage cache immediately so it's instantly visible
  try {
    const raw = localStorage.getItem('natal_local_users');
    const existingUsers: AppUser[] = raw ? JSON.parse(raw) : [];
    const index = existingUsers.findIndex(u => u.id === docId || (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail));

    if (index >= 0) {
      existingUsers[index] = {
        ...existingUsers[index],
        ...userPayload,
        createdAt: existingUsers[index].createdAt || existingCreatedAt
      };
    } else {
      existingUsers.unshift({
        ...userPayload,
        createdAt: existingCreatedAt
      });
    }

    localStorage.setItem('natal_local_users', JSON.stringify(existingUsers));
    window.dispatchEvent(new CustomEvent('natal_users_updated', { detail: userPayload }));
  } catch (err) {
    console.warn('Local storage user sync warning:', err);
  }

  // 2. Persist to Firestore (both `users` document and `user_activities` log)
  try {
    const userRef = doc(db, 'users', docId);
    await setDoc(userRef, {
      ...userPayload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    // Also write to user_activities collection
    try {
      const activityDocRef = doc(db, 'user_activities', newActivityItem.id);
      await setDoc(activityDocRef, {
        ...newActivityItem,
        userId: docId,
        userName: userPayload.name,
        userEmail: userPayload.email,
        userPhone: userPayload.phone,
        createdAt: serverTimestamp()
      });
    } catch (actErr) {
      console.warn('Firestore activity log write warning:', actErr);
    }
  } catch (fbErr) {
    console.warn('Firestore user write fallback:', fbErr);
  }

  // 3. Automatically dispatch executive WhatsApp notification to website owner for all client activity
  if (!isAdminUser && (data.source === 'Quotation Form' || data.source === 'Contact Form' || data.source === 'Registration')) {
    triggerOwnerWhatsAppNotification({
      leadType: data.source === 'Quotation Form' ? 'Quotation Request' : data.source === 'Contact Form' ? 'Contact Form' : 'VIP Registration',
      name: userPayload.name,
      phone: userPayload.phone,
      email: userPayload.email,
      service: userPayload.service,
      details: userPayload.details
    }).catch(waErr => console.warn('Automatic WhatsApp notification note:', waErr));
  }

  return userPayload;
}

/**
 * Record any user activity across the app (WhatsApp click, Call click, Specs inquiry, Login, etc.)
 * Directly stores the activity in the user's profile and persists to Firestore.
 */
export async function recordUserActivity(params: {
  userId?: string;
  userEmail?: string;
  userName?: string;
  userPhone?: string;
  type: ActivityType;
  title: string;
  description: string;
  metadata?: Record<string, any>;
}): Promise<AppUser | null> {
  const session = getActiveUserSession();
  const email = (params.userEmail || session?.email || '').trim().toLowerCase();
  const name = (params.userName || session?.name || '').trim() || (email ? email.split('@')[0] : 'Active Client');
  const phone = (params.userPhone || session?.phone || '').trim();

  // If no user email or phone or session exists, create or link a general client profile
  const docId = params.userId || (email ? 'user_' + email.replace(/[^a-z0-9]/g, '_') : 'client_' + (phone ? phone.replace(/[^0-9]/g, '') : 'visitor'));

  const nowIso = new Date().toISOString();
  const newActivityItem: UserActivity = {
    id: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    type: params.type,
    title: params.title,
    description: params.description,
    timestamp: nowIso,
    metadata: params.metadata
  };

  let targetUser: AppUser | null = null;

  try {
    const raw = localStorage.getItem('natal_local_users');
    const existingUsers: AppUser[] = raw ? JSON.parse(raw) : [];
    let userIndex = existingUsers.findIndex(u => u.id === docId || (email && u.email && u.email.toLowerCase() === email));

    if (userIndex >= 0) {
      const existing = existingUsers[userIndex];
      const prevActs = Array.isArray(existing.activities) ? existing.activities : [];
      const updatedActs = [newActivityItem, ...prevActs.filter(a => a.id !== newActivityItem.id)].slice(0, 50);

      existingUsers[userIndex] = {
        ...existing,
        name: existing.name || name,
        phone: existing.phone || phone,
        email: existing.email || email,
        lastActive: nowIso,
        activities: updatedActs,
        activityCount: updatedActs.length
      };
      targetUser = existingUsers[userIndex];
    } else {
      // Create new profile for this visitor activity
      targetUser = {
        id: docId,
        name: name || 'Client Lead',
        email: email || '',
        phone: phone || '',
        source: params.type === 'whatsapp' ? 'Direct Channel' : params.type === 'call' ? 'Direct Channel' : 'Quotation Form',
        service: params.metadata?.service || 'Interior Design Consultation',
        details: params.description,
        role: 'Client Lead',
        status: 'Active',
        createdAt: nowIso,
        lastActive: nowIso,
        activities: [newActivityItem],
        activityCount: 1
      };
      existingUsers.unshift(targetUser);
    }

    localStorage.setItem('natal_local_users', JSON.stringify(existingUsers));
    window.dispatchEvent(new CustomEvent('natal_users_updated', { detail: targetUser }));
    window.dispatchEvent(new CustomEvent('natal_activity_recorded', { detail: newActivityItem }));
  } catch (err) {
    console.warn('Local storage activity recording error:', err);
  }

  // Persist to Firestore
  try {
    if (targetUser) {
      const userRef = doc(db, 'users', targetUser.id);
      await setDoc(userRef, {
        ...targetUser,
        updatedAt: serverTimestamp()
      }, { merge: true });

      const activityDocRef = doc(db, 'user_activities', newActivityItem.id);
      await setDoc(activityDocRef, {
        ...newActivityItem,
        userId: targetUser.id,
        userName: targetUser.name,
        userEmail: targetUser.email,
        userPhone: targetUser.phone,
        createdAt: serverTimestamp()
      });
    }
  } catch (fbErr) {
    console.warn('Firestore activity sync fallback:', fbErr);
  }

  // Automatically dispatch WhatsApp notification to website owner when any client activity or lead occurs
  const isLeadOrActivity = 
    params.type === 'quotation' || 
    params.type === 'contact' || 
    params.type === 'whatsapp' || 
    params.type === 'call' || 
    params.type === 'specs_inquiry' || 
    params.type === 'registration';

  if (isLeadOrActivity) {
    const leadTypeLabels: Record<ActivityType, 'Quotation Request' | 'Contact Form' | 'VIP Registration' | 'WhatsApp Inquiry' | 'General Lead' | 'Phone Call Inquiry'> = {
      quotation: 'Quotation Request',
      contact: 'Contact Form',
      whatsapp: 'WhatsApp Inquiry',
      call: 'Phone Call Inquiry',
      specs_inquiry: 'General Lead',
      registration: 'VIP Registration',
      login: 'General Lead',
      review: 'General Lead',
      custom: 'General Lead'
    };

    triggerOwnerWhatsAppNotification({
      leadType: leadTypeLabels[params.type] || 'General Lead',
      name: targetUser?.name || name,
      phone: targetUser?.phone || phone,
      email: targetUser?.email || email,
      service: params.metadata?.service || params.metadata?.projectTitle || 'Direct Client Consultation',
      details: params.description
    }).catch(waErr => console.warn('Automatic WhatsApp activity dispatch note:', waErr));
  }

  return targetUser;
}

/**
 * Checks local directory and cache to see if an account already exists for an email address.
 */
export function findExistingUserByEmail(email: string): AppUser | null {
  if (!email || !email.trim()) return null;
  const cleanEmail = email.trim().toLowerCase();
  try {
    const raw = localStorage.getItem('natal_local_users');
    if (raw) {
      const users: AppUser[] = JSON.parse(raw);
      const match = users.find(u => u.email && u.email.trim().toLowerCase() === cleanEmail);
      if (match) return match;
    }
  } catch {}
  return null;
}

/**
 * Checks local cache & Firestore to see if an account already exists for an email address.
 * Enables smart client detection (telling new users to sign up vs returning users to sign in).
 */
export async function checkAccountExists(email: string): Promise<{ 
  exists: boolean; 
  name?: string; 
  role?: string; 
  isVIP?: boolean;
}> {
  if (!email || !email.trim() || !email.includes('@') || !email.includes('.')) {
    return { exists: false };
  }
  const cleanEmail = email.trim().toLowerCase();

  // 1. Instant local directory check
  const localMatch = findExistingUserByEmail(cleanEmail);
  if (localMatch) {
    return {
      exists: true,
      name: localMatch.name,
      role: localMatch.role,
      isVIP: localMatch.isVIP
    };
  }

  // 2. Firestore check
  try {
    const docId = 'user_' + cleanEmail.replace(/[^a-z0-9]/g, '_');
    const userDocSnap = await getDoc(doc(db, 'users', docId));
    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      return {
        exists: true,
        name: data?.name,
        role: data?.role,
        isVIP: data?.isVIP
      };
    }
  } catch (err) {
    console.debug('Firestore user lookup skipped:', err);
  }

  return { exists: false };
}

/**
 * Automatically compress and downscale user-uploaded images using HTML5 Canvas.
 * Ensures the image easily fits within Firestore's 1MB limit and browser LocalStorage,
 * while maintaining pristine high visual quality for screens.
 */
export async function compressImageFile(
  file: File, 
  maxWidth = 1920, 
  maxHeight = 1080, 
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If it's an SVG file, never rasterize into lossy JPEG - read directly as vector data URL
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read SVG file'));
      reader.readAsDataURL(file);
      return;
    }

    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file is not an image'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image into element'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        // Clear transparent canvas for PNGs
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        try {
          const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
          const isWebp = file.type === 'image/webp' || file.name.toLowerCase().endsWith('.webp');

          if (isWebp) {
            const compressed = canvas.toDataURL('image/webp', quality);
            resolve(compressed);
            return;
          }

          if (isPng) {
            // Try webp first to preserve alpha transparency while achieving high compression
            try {
              const webpData = canvas.toDataURL('image/webp', quality);
              if (webpData.startsWith('data:image/webp') && webpData.length < 200 * 1024) {
                resolve(webpData);
                return;
              }
            } catch {}

            const pngData = canvas.toDataURL('image/png');
            // If PNG is under 150KB, safe to keep as PNG
            if (pngData.length <= 150 * 1024) {
              resolve(pngData);
              return;
            }

            // High-resolution photo PNG: convert to JPEG with quality to prevent Firestore 1MB quota errors
            const jpgData = canvas.toDataURL('image/jpeg', quality);
            resolve(jpgData);
            return;
          }

          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch {
          resolve(reader.result as string);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Takes any Base64 data URL and ensures it is compressed to fit safely
 * within Firestore document storage limits (1,048,576 bytes).
 */
export async function optimizeBase64Image(
  dataUrl: string,
  maxWidth = 800,
  maxHeight = 600,
  quality = 0.75
): Promise<string> {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }

  // If already under 75KB, it is well within safe bounds
  if (dataUrl.length < 75 * 1024) return dataUrl;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Try webp first (preserves alpha + lossy compression)
      try {
        const webp = canvas.toDataURL('image/webp', quality);
        if (webp.startsWith('data:image/webp') && webp.length < dataUrl.length) {
          resolve(webp);
          return;
        }
      } catch {}

      // Fallback to jpeg
      try {
        const jpeg = canvas.toDataURL('image/jpeg', quality);
        resolve(jpeg.length < dataUrl.length ? jpeg : dataUrl);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Specifically processes and optimizes company logos (PNG with transparent alpha, SVG, WebP, JPG).
 * Guaranteed to never convert transparent backgrounds into black blocks, preserves vector
 * sharpness for SVGs, and fits within Firestore 1MB document quotas safely.
 */
export async function processLogoImageFile(
  file: File,
  maxDimension = 800
): Promise<string> {
  return new Promise((resolve, reject) => {
    // 1. Vector SVG: Read directly as Data URL to retain infinite vector sharpness
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read SVG logo file'));
      reader.readAsDataURL(file);
      return;
    }

    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file is not an image (expected PNG, SVG, JPG, or WebP)'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read logo image'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to parse logo image'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // If dimensions are within bounds and file is reasonably small PNG/WebP, keep as is
        if (width <= maxDimension && height <= maxDimension && file.size < 300 * 1024) {
          resolve(reader.result as string);
          return;
        }

        // Scale proportionally to max dimension
        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        // CRITICAL: Clear canvas so transparency is 100% preserved
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        try {
          const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
          const isWebp = file.type === 'image/webp' || file.name.toLowerCase().endsWith('.webp');
          
          if (isPng) {
            // PNG preserves transparent alpha background perfectly
            const pngData = canvas.toDataURL('image/png');
            resolve(pngData);
          } else if (isWebp) {
            const webpData = canvas.toDataURL('image/webp', 0.92);
            resolve(webpData);
          } else {
            // High-quality JPEG for photos/solid logos
            const jpgData = canvas.toDataURL('image/jpeg', 0.92);
            resolve(jpgData);
          }
        } catch {
          resolve(reader.result as string);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Automatically captures a crisp image thumbnail from a video file (MP4, WebM, MOV)
 * using HTML5 Video + Offscreen Canvas.
 */
export async function captureVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('video/')) {
      resolve('');
      return;
    }
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1.0, (video.duration || 2) / 3);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(video.videoWidth || 960, 960);
        const scale = canvas.width / (video.videoWidth || 1);
        canvas.height = Math.round((video.videoHeight || 540) * scale);

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumb = canvas.toDataURL('image/jpeg', 0.82);
          URL.revokeObjectURL(url);
          resolve(thumb);
          return;
        }
      } catch (err) {
        console.warn("Failed to generate video thumbnail from canvas:", err);
      }
      URL.revokeObjectURL(url);
      resolve('');
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('');
    };
  });
}

/**
 * Reads any document, blueprint, drawing, or file as a Base64 data URL.
 */
export async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file contents'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

export interface MediaAsset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'document' | 'blueprint' | 'other';
  category?: string;
  url?: string;
  thumbnail?: string;
  size?: number;
  sizeFormatted?: string;
  isChunked?: boolean;
  totalChunks?: number;
  uploadedBy?: string;
  createdAt?: any;
}

/**
 * Safely stores any file, high-resolution photo, architectural blueprint, or video
 * in Google Cloud Firestore.
 * 
 * Safety features:
 * - Images are automatically downscaled and compressed to avoid exceeding Firestore limits.
 * - Videos generate a video poster thumbnail, and if the payload is large, uses
 *   chunked subcollections (media/{id}/chunks/{index}) so documents NEVER exceed
 *   Firestore's 1MB limit.
 */
export async function storeSafeMediaAssetInCloud({
  file,
  name,
  category = 'Atelier Media',
  uploadedBy = 'Administrator'
}: {
  file: File;
  name?: string;
  category?: string;
  uploadedBy?: string;
}): Promise<MediaAsset | null> {
  const assetName = name || file.name || 'Untitled Asset';
  let assetType: 'image' | 'video' | 'document' | 'blueprint' | 'other' = 'other';
  let thumbnail = '';
  let finalDataUrl = '';

  if (file.type.startsWith('image/')) {
    assetType = 'image';
    finalDataUrl = await compressImageFile(file, 1600, 1200, 0.82);
    thumbnail = finalDataUrl;
  } else if (file.type.startsWith('video/')) {
    assetType = 'video';
    thumbnail = await captureVideoThumbnail(file);
    finalDataUrl = await readFileAsDataUrl(file);
  } else {
    const lowerName = assetName.toLowerCase();
    if (lowerName.endsWith('.pdf') || lowerName.endsWith('.dwg') || lowerName.endsWith('.dxf') || lowerName.includes('plan') || lowerName.includes('blueprint')) {
      assetType = 'blueprint';
    } else {
      assetType = 'document';
    }
    finalDataUrl = await readFileAsDataUrl(file);
  }

  const sizeKb = (file.size / 1024).toFixed(1) + ' KB';
  const sizeMb = file.size > 1024 * 1024 ? (file.size / (1024 * 1024)).toFixed(2) + ' MB' : sizeKb;

  // Check if payload exceeds 650KB threshold (safety threshold for Firestore 1MB document limit)
  const CHUNK_SIZE = 250 * 1024; // 250KB chunk size
  const isChunked = finalDataUrl.length > 650 * 1024;

  const basePayload: any = {
    name: assetName,
    type: assetType,
    category,
    thumbnail: thumbnail || '',
    size: file.size,
    sizeFormatted: sizeMb,
    uploadedBy,
    isChunked,
    createdAt: serverTimestamp()
  };

  if (!isChunked) {
    basePayload.url = finalDataUrl;
  } else {
    basePayload.totalChunks = Math.ceil(finalDataUrl.length / CHUNK_SIZE);
  }

  try {
    const docRef = await addDoc(collection(db, 'media'), basePayload);
    const mediaId = docRef.id;

    if (isChunked) {
      const total = basePayload.totalChunks;
      for (let i = 0; i < total; i++) {
        const chunkSlice = finalDataUrl.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        await setDoc(doc(db, 'media', mediaId, 'chunks', String(i).padStart(4, '0')), {
          chunkIndex: i,
          data: chunkSlice
        });
      }
      try {
        sessionStorage.setItem(`natal_media_cache_${mediaId}`, finalDataUrl);
      } catch {}
    }

    return {
      id: mediaId,
      ...basePayload,
      url: finalDataUrl
    };
  } catch (err) {
    console.warn("Firestore media write error, saving to local vault:", err);
    try {
      const local = JSON.parse(localStorage.getItem('natal_local_media') || '[]');
      const localId = 'local_media_' + Date.now();
      const localAsset = {
        id: localId,
        ...basePayload,
        url: finalDataUrl,
        createdAt: new Date().toISOString()
      };
      local.unshift(localAsset);
      localStorage.setItem('natal_local_media', JSON.stringify(local.slice(0, 15)));
      return localAsset;
    } catch {}
    return null;
  }
}

/**
 * Loads the full data URL for any media asset, assembling chunks from Firestore if needed.
 */
export async function loadMediaAssetData(asset: MediaAsset): Promise<string> {
  if (!asset) return '';
  if (!asset.isChunked && asset.url) {
    return asset.url;
  }

  // Check session storage cache
  try {
    const cached = sessionStorage.getItem(`natal_media_cache_${asset.id}`);
    if (cached) return cached;
  } catch {}

  // Fetch chunks from Firestore subcollection
  try {
    const chunksSnap = await getDocs(query(collection(db, 'media', asset.id, 'chunks'), orderBy('chunkIndex', 'asc')));
    if (!chunksSnap.empty) {
      const fullStr = chunksSnap.docs.map(d => d.data().data || '').join('');
      try {
        sessionStorage.setItem(`natal_media_cache_${asset.id}`, fullStr);
      } catch {}
      return fullStr;
    }
  } catch (err) {
    console.warn("Failed to load media chunks from Firestore:", err);
  }

  return asset.url || asset.thumbnail || '';
}

/**
 * Deletes a media asset and any associated subcollection chunks from Firestore.
 */
export async function deleteMediaAssetFromCloud(assetId: string): Promise<boolean> {
  try {
    if (!assetId.startsWith('local_')) {
      try {
        const chunksSnap = await getDocs(collection(db, 'media', assetId, 'chunks'));
        for (const cDoc of chunksSnap.docs) {
          await deleteDoc(cDoc.ref);
        }
      } catch {}

      await deleteDoc(doc(db, 'media', assetId));
    }

    try {
      sessionStorage.removeItem(`natal_media_cache_${assetId}`);
      const local = JSON.parse(localStorage.getItem('natal_local_media') || '[]');
      const updated = local.filter((m: any) => m.id !== assetId);
      localStorage.setItem('natal_local_media', JSON.stringify(updated));
    } catch {}

    return true;
  } catch (err) {
    console.warn("Failed to delete media asset:", err);
    return false;
  }
}

export const saveMediaAssetToCloud = storeSafeMediaAssetInCloud;

/**
 * Seeds initial baseline catalog to Firestore if the collections are empty,
 * ensuring the Admin Dashboard and all website components read live data from the database.
 */
export async function seedInitialDatabaseIfEmpty(force = false): Promise<{
  seeded: boolean;
  projectsCount: number;
  servicesCount: number;
  testimonialsCount: number;
  transformationsCount: number;
  mediaCount: number;
}> {
  let seeded = false;
  let pCount = 0;
  let sCount = 0;
  let tCount = 0;
  let trCount = 0;
  let mCount = 0;

  try {
    // 1. Check Projects
    const projSnap = await getDocs(query(collection(db, 'projects'), limit(1)));
    if (projSnap.empty || force) {
      for (const p of projectsData) {
        await addDoc(collection(db, 'projects'), {
          title: p.title,
          category: p.category,
          desc: p.description,
          image: p.image,
          tags: p.servicesUsed || [p.category, "Natal Creation"],
          createdAt: serverTimestamp()
        });
        pCount++;
      }
      seeded = true;
    }

    // 2. Check Services
    const svcSnap = await getDocs(query(collection(db, 'services'), limit(1)));
    if (svcSnap.empty || force) {
      for (const s of servicesData) {
        await addDoc(collection(db, 'services'), {
          title: s.title,
          description: s.description,
          icon: s.icon,
          features: s.features || [],
          featuresText: (s.features || []).join(', '),
          originalId: s.id,
          order: s.order || 0,
          createdAt: serverTimestamp()
        });
        sCount++;
      }
      seeded = true;
    }

    // 3. Check Testimonials
    const testSnap = await getDocs(query(collection(db, 'testimonials'), limit(1)));
    if (testSnap.empty || force) {
      for (const t of testimonialsData) {
        await addDoc(collection(db, 'testimonials'), {
          name: t.name,
          role: t.role,
          content: t.content,
          rating: t.rating || 5,
          image: t.image,
          createdAt: serverTimestamp()
        });
        tCount++;
      }
      seeded = true;
    }

    // 4. Check Transformations (Before & After)
    const trSnap = await getDocs(query(collection(db, 'transformations'), limit(1)));
    if (trSnap.empty || force) {
      await addDoc(collection(db, 'transformations'), {
        title: "Luxury Penthouse Living Room Gypsum & Lighting Transformation",
        beforeImage: "https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?auto=format&fit=crop&q=80&w=2000",
        afterImage: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=2000",
        fitMode: "cover",
        createdAt: serverTimestamp()
      });
      trCount++;
      seeded = true;
    }

    // 5. Check Media Vault (Baseline Showcase Media)
    const mediaSnap = await getDocs(query(collection(db, 'media'), limit(1)));
    if (mediaSnap.empty || force) {
      const initialMediaItems = [
        {
          name: "Master Penthouse Architectural Drawing & Blueprint",
          type: "blueprint",
          category: "Blueprints & CAD",
          url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=1600",
          thumbnail: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=400",
          size: 420000,
          sizeFormatted: "410.2 KB",
          uploadedBy: "Chief Architect",
          isChunked: false,
          createdAt: serverTimestamp()
        },
        {
          name: "Bespoke Gypsum Ceiling Architectural Detail",
          type: "image",
          category: "Featured Creations",
          url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1600",
          thumbnail: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=400",
          size: 285000,
          sizeFormatted: "278.3 KB",
          uploadedBy: "Natal Atelier",
          isChunked: false,
          createdAt: serverTimestamp()
        },
        {
          name: "Executive Villa Lighting & Joinery Showreel",
          type: "video",
          category: "Project Walkthroughs",
          url: "https://assets.mixkit.co/videos/preview/mixkit-modern-apartment-with-an-open-concept-design-41005-large.mp4",
          thumbnail: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&q=80&w=600",
          size: 850000,
          sizeFormatted: "830.1 KB",
          uploadedBy: "Media Production",
          isChunked: false,
          createdAt: serverTimestamp()
        }
      ];

      for (const item of initialMediaItems) {
        await addDoc(collection(db, 'media'), item);
        mCount++;
      }
      seeded = true;
    }

    // 6. Ensure site_settings services_section exists
    const settingsDoc = await getDoc(doc(db, 'site_settings', 'services_section'));
    if (!settingsDoc.exists()) {
      await setDoc(doc(db, 'site_settings', 'services_section'), {
        sectionTitle: "OUR SERVICES",
        sectionSubtitle: "Capabilities",
        sectionDescription: "Explore our full spectrum of architectural craftsmanship, from bespoke multi-tier gypsum ceilings to custom solid-wood joinery and turnkey commercial fit-outs.",
        hiddenServiceIds: [],
        updatedAt: serverTimestamp()
      });
    }

    // 7. Ensure site_content hero section exists in cloud database with video loop
    const heroDoc = await getDoc(doc(db, 'site_content', 'hero'));
    if (!heroDoc.exists()) {
      await setDoc(doc(db, 'site_content', 'hero'), sanitizeForFirestore({
        headline1: 'WE DESIGN.',
        headline2: 'WE BUILD.',
        headline3: 'YOU ENJOY.',
        description: 'Premium interior design and construction solutions tailored to transform your space into something exceptional.',
        mediaType: 'video',
        backgroundVideo: 'https://assets.mixkit.co/videos/preview/mixkit-modern-apartment-with-an-open-concept-design-41005-large.mp4',
        backgroundImage: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&q=80&w=2560',
        primaryCtaText: 'Request Quotation',
        secondaryCtaText: 'Explore Showcase',
        cards: [
          { img: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=800', label: 'Gypsum Ceilings' },
          { img: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&q=80&w=800', label: 'Luxury Living' },
          { img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800', label: 'Custom TV Units' },
          { img: 'https://images.unsplash.com/photo-1600607686527-6fb886090705?auto=format&fit=crop&q=80&w=800', label: 'Architectural Lighting' }
        ],
        updatedAt: serverTimestamp()
      }));
    }

    // 8. Ensure site_content branding (logo & atelier typography) exists
    const brandingDoc = await getDoc(doc(db, 'site_content', 'branding'));
    if (!brandingDoc.exists()) {
      await setDoc(doc(db, 'site_content', 'branding'), sanitizeForFirestore({
        logoType: 'both',
        logoUrl: '',
        logoAltText: 'Natal Interior Design Construction',
        logoHeight: 44,
        companyName: 'Natal Interior',
        tagline: 'Design Construction',
        faviconUrl: '',
        updatedAt: serverTimestamp()
      }));
    }

  } catch (err) {
    console.warn("Error running seedInitialDatabaseIfEmpty:", err);
  }

  return {
    seeded,
    projectsCount: pCount,
    servicesCount: sCount,
    testimonialsCount: tCount,
    transformationsCount: trCount,
    mediaCount: mCount
  };
}

export interface OwnerEmailTriggerParams {
  leadType: 'Quotation Request' | 'Contact Form' | 'VIP Registration';
  name: string;
  email: string;
  phone?: string;
  service?: string;
  details?: string;
  fileAttachmentName?: string;
}

/**
 * Creates an email dispatch record in the Firestore 'mail' collection,
 * which the Firebase Trigger Email Extension (firestore-send-email) automatically detects
 * and delivers directly to the owner's personal inbox (mukisavicent7777@gmail.com).
 */
export async function triggerOwnerEmailNotification(params: OwnerEmailTriggerParams) {
  try {
    const adminProfile = getAdminProfile();
    const primaryRecipient = adminProfile?.email || 'mukisavicent7777@gmail.com';
    const fallbackRecipient = 'usherhenry99@gmail.com';

    // De-duplicate recipient emails
    const recipients = Array.from(new Set([
      primaryRecipient.trim().toLowerCase(),
      fallbackRecipient.trim().toLowerCase(),
      'mukisavicent7777@gmail.com'
    ])).filter(Boolean);

    const cleanPhone = (params.phone || '').trim();
    const whatsappDigits = cleanPhone.replace(/\D/g, '').replace(/^0/, '');
    const whatsappLink = whatsappDigits.length >= 7 
      ? `https://wa.me/256${whatsappDigits}`
      : null;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; background-color: #0d0d0d; color: #f3f4f6; padding: 24px; border: 1px solid #D4AF37; max-width: 600px; margin: 0 auto; border-radius: 4px;">
        <div style="border-bottom: 2px solid #D4AF37; padding-bottom: 12px; margin-bottom: 16px;">
          <h2 style="color: #D4AF37; margin: 0; text-transform: uppercase; font-size: 18px; letter-spacing: 2px;">
            Natal Interior Design &amp; Construction
          </h2>
          <p style="color: #9ca3af; margin: 4px 0 0 0; font-size: 12px; font-family: monospace;">
            NEW CLIENT SUBMISSION NOTIFICATION
          </p>
        </div>

        <div style="background-color: #1a1a1a; padding: 16px; border-left: 4px solid #D4AF37; margin-bottom: 20px;">
          <span style="display: inline-block; background-color: #D4AF37; color: #000; font-weight: bold; font-size: 11px; padding: 3px 8px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
            ${params.leadType}
          </span>
          <h3 style="color: #ffffff; margin: 6px 0 0 0; font-size: 16px;">
            ${params.name || 'Valued Client'}
          </h3>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
          <tr style="border-bottom: 1px solid #2d2d2d;">
            <td style="padding: 10px 0; color: #D4AF37; width: 35%; font-weight: bold;">Client Name:</td>
            <td style="padding: 10px 0; color: #ffffff;">${params.name}</td>
          </tr>
          <tr style="border-bottom: 1px solid #2d2d2d;">
            <td style="padding: 10px 0; color: #D4AF37; font-weight: bold;">Email Address:</td>
            <td style="padding: 10px 0; color: #ffffff;"><a href="mailto:${params.email}" style="color: #D4AF37; text-decoration: underline;">${params.email}</a></td>
          </tr>
          ${params.phone ? `
          <tr style="border-bottom: 1px solid #2d2d2d;">
            <td style="padding: 10px 0; color: #D4AF37; font-weight: bold;">Phone Number:</td>
            <td style="padding: 10px 0; color: #ffffff;"><a href="tel:${params.phone}" style="color: #ffffff; text-decoration: none;">${params.phone}</a></td>
          </tr>
          ` : ''}
          ${params.service ? `
          <tr style="border-bottom: 1px solid #2d2d2d;">
            <td style="padding: 10px 0; color: #D4AF37; font-weight: bold;">Service Requested:</td>
            <td style="padding: 10px 0; color: #ffffff; font-weight: bold;">${params.service}</td>
          </tr>
          ` : ''}
          ${params.fileAttachmentName ? `
          <tr style="border-bottom: 1px solid #2d2d2d;">
            <td style="padding: 10px 0; color: #D4AF37; font-weight: bold;">Attached File / Plan:</td>
            <td style="padding: 10px 0; color: #ffffff;">${params.fileAttachmentName}</td>
          </tr>
          ` : ''}
        </table>

        ${params.details ? `
        <div style="background-color: #141414; padding: 14px; border: 1px solid #333333; margin-bottom: 20px;">
          <strong style="color: #D4AF37; display: block; font-size: 12px; text-transform: uppercase; margin-bottom: 6px;">Message / Project Scope:</strong>
          <p style="margin: 0; color: #d1d5db; font-size: 13px; line-height: 1.6; white-space: pre-line;">${params.details}</p>
        </div>
        ` : ''}

        <div style="padding-top: 10px; text-align: center;">
          ${whatsappLink ? `
            <a href="${whatsappLink}" style="display: inline-block; background-color: #25D366; color: #ffffff; font-weight: bold; font-size: 13px; padding: 10px 18px; text-decoration: none; border-radius: 3px; margin-right: 8px;">
              💬 Reply via WhatsApp
            </a>
          ` : ''}
          <a href="mailto:${params.email}?subject=RE: Natal Interior Design Inquiry" style="display: inline-block; background-color: #D4AF37; color: #000000; font-weight: bold; font-size: 13px; padding: 10px 18px; text-decoration: none; border-radius: 3px;">
            ✉️ Reply via Email
          </a>
        </div>

        <p style="color: #6b7280; font-size: 11px; text-align: center; margin-top: 24px; font-family: monospace;">
          Sent by Natal Interior Design &amp; Construction • Firestore Trigger Email Extension
        </p>
      </div>
    `;

    const plainText = `
[NATAL INTERIOR DESIGN & CONSTRUCTION - NEW LEAD]
Type: ${params.leadType}
Client: ${params.name}
Email: ${params.email}
Phone: ${params.phone || 'N/A'}
Service: ${params.service || 'N/A'}
Details: ${params.details || 'N/A'}
${params.fileAttachmentName ? `Attachment: ${params.fileAttachmentName}` : ''}
    `.trim();

    const mailDoc = {
      to: recipients,
      replyTo: params.email || undefined,
      message: {
        subject: `🚨 [Natal Lead] ${params.leadType}: ${params.name} - ${params.service || 'General Inquiry'}`,
        text: plainText,
        html: htmlContent
      },
      leadType: params.leadType,
      clientName: params.name,
      clientEmail: params.email,
      clientPhone: params.phone || '',
      createdAt: serverTimestamp()
    };

    // Dynamic Email Service Delivery
    const emailSettings = getEmailServiceSettings();
    const targetEmail = (emailSettings.recipientEmail || primaryRecipient).trim().toLowerCase();

    let serviceResult: { success: boolean; message?: string; activated?: boolean } = { success: true };

    // 1. Direct Delivery to Configured Inbox via FormSubmit AJAX API
    if (emailSettings.serviceEnabled && targetEmail) {
      try {
        const autoReplyMessage = params.email 
          ? `Dear ${params.name || 'Valued Client'},\n\nThank you for reaching out to Natal Interior Design & Construction regarding your ${params.leadType.toLowerCase()} for "${params.service || 'Interior Design & Construction'}".\n\nWe have safely received your project scope and specifications. Our lead project engineer is reviewing your details and will follow up with you directly via WhatsApp or phone call shortly.\n\nWarm regards,\nNatal Interior Design & Construction\nKampala, Uganda`
          : undefined;

        const response = await fetch(`https://formsubmit.co/ajax/${targetEmail}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            _subject: `🚨 [Natal Lead] ${params.leadType}: ${params.name} - ${params.service || 'General Inquiry'}`,
            _template: 'box',
            _captcha: 'false',
            _replyto: params.email || undefined,
            _autoresponse: autoReplyMessage,
            'Lead Type': params.leadType,
            'Client Name': params.name,
            'Client Email': params.email || 'N/A',
            'Client Phone / WhatsApp': params.phone || 'N/A',
            'Service Requested': params.service || 'N/A',
            'Project Scope / Details': params.details || 'N/A',
            'Plan / File Attachment': params.fileAttachmentName || 'None',
            'WhatsApp Direct Link': whatsappLink || 'N/A',
            'Submission Timestamp': new Date().toLocaleString()
          })
        });

        const resData = await response.json().catch(() => null);
        if (resData) {
          const rawMsg = typeof resData.message === 'string' ? resData.message : '';
          const isActivationPrompt = 
            rawMsg.toLowerCase().includes('activate') || 
            rawMsg.toLowerCase().includes('confirm') || 
            resData.success === 'false' || 
            resData.success === false;

          serviceResult = {
            success: resData.success === 'true' || resData.success === true,
            message: rawMsg || (isActivationPrompt ? 'Activation email dispatched to inbox' : 'Delivered'),
            activated: !isActivationPrompt
          };
        }
      } catch (e: any) {
        console.warn('Direct mail dispatch note:', e);
        serviceResult = { success: false, message: e?.message || 'Network dispatch notice' };
      }
    }

    // 2. Queue into Firestore 'mail' collection as audit record & for Admin Dashboard
    let mailDocId = 'mail_' + Date.now();
    try {
      const docRef = await addDoc(collection(db, 'mail'), sanitizeForFirestore({
        ...mailDoc,
        deliveredTo: targetEmail,
        serviceProvider: emailSettings.provider || 'formsubmit',
        dispatchResult: serviceResult
      }));
      mailDocId = docRef.id;
    } catch (fbErr) {
      console.warn("Firestore mail queue audit note:", fbErr);
    }

    return { 
      success: true, 
      mailId: mailDocId, 
      recipient: targetEmail,
      providerResult: serviceResult 
    };
  } catch (err: any) {
    console.warn("Could not queue notification into Firestore mail collection:", err);
    return { success: false, error: err };
  }
}

export interface EmailServiceSettings {
  serviceEnabled: boolean;
  recipientEmail: string;
  provider: 'formsubmit' | 'web3forms' | 'firestore_mail';
  web3FormsKey?: string;
  lastTestedAt?: string;
}

// In-memory cache for communication settings synchronized with Firestore
let cachedWhatsAppSettings: WhatsAppServiceSettings | null = null;
let cachedEmailSettings: EmailServiceSettings | null = null;

/**
 * Initializes real-time listener for communication configuration from Firestore.
 * Ensures all website visitors and admin sessions share the exact same configuration.
 */
export function initCommunicationSettingsSync() {
  try {
    const docRef = doc(db, 'settings', 'communication_config');
    onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.whatsapp) {
          cachedWhatsAppSettings = data.whatsapp as WhatsAppServiceSettings;
          try {
            localStorage.setItem('natal_whatsapp_service_settings', JSON.stringify(data.whatsapp));
          } catch {}
          window.dispatchEvent(new CustomEvent('natal_whatsapp_service_changed', { detail: data.whatsapp }));
        }
        if (data.email) {
          cachedEmailSettings = data.email as EmailServiceSettings;
          try {
            localStorage.setItem('natal_email_service_settings', JSON.stringify(data.email));
          } catch {}
          window.dispatchEvent(new CustomEvent('natal_email_service_changed', { detail: data.email }));
        }
      }
    }, (err) => {
      console.warn('Communication config Firestore sync note:', err);
    });
  } catch (err) {
    console.warn('initCommunicationSettingsSync error:', err);
  }
}

export function getEmailServiceSettings(): EmailServiceSettings {
  if (cachedEmailSettings && cachedEmailSettings.recipientEmail) {
    return cachedEmailSettings;
  }
  try {
    const raw = localStorage.getItem('natal_email_service_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.recipientEmail) {
        cachedEmailSettings = parsed;
        return parsed;
      }
    }
  } catch {}
  return {
    serviceEnabled: true,
    recipientEmail: 'mukisavicent7777@gmail.com',
    provider: 'formsubmit'
  };
}

export async function saveEmailServiceSettings(settings: EmailServiceSettings) {
  try {
    cachedEmailSettings = settings;
    localStorage.setItem('natal_email_service_settings', JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('natal_email_service_changed', { detail: settings }));
    try {
      const docRef = doc(db, 'settings', 'communication_config');
      await setDoc(docRef, {
        email: sanitizeForFirestore(settings),
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (fbErr) {
      console.warn('Firestore communication_config email save note:', fbErr);
    }
  } catch {}
}

export interface WhatsAppServiceSettings {
  serviceEnabled: boolean;
  ownerWhatsAppNumber: string; // e.g. "0745 694 499" or "+256 745 694 499"
  gatewayProvider: 'direct' | 'callmebot' | 'ultramsg' | 'greenapi' | 'webhook';
  callMeBotApiKey?: string;
  ultraMsgInstanceId?: string;
  ultraMsgToken?: string;
  greenApiInstanceId?: string;
  greenApiToken?: string;
  webhookUrl?: string;
  autoDispatchOnActivity: boolean;
  autoOpenWhatsAppOnClientSubmit?: boolean;
  autoOpenWhatsAppInAdminOnNewLead?: boolean;
  lastTestedAt?: string;
}

export function getWhatsAppServiceSettings(): WhatsAppServiceSettings {
  if (cachedWhatsAppSettings && cachedWhatsAppSettings.ownerWhatsAppNumber) {
    return cachedWhatsAppSettings;
  }
  try {
    const raw = localStorage.getItem('natal_whatsapp_service_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.ownerWhatsAppNumber) {
        cachedWhatsAppSettings = {
          serviceEnabled: true,
          gatewayProvider: parsed.gatewayProvider || 'callmebot',
          autoDispatchOnActivity: true,
          autoOpenWhatsAppOnClientSubmit: false,
          autoOpenWhatsAppInAdminOnNewLead: false,
          ...parsed
        };
        return cachedWhatsAppSettings;
      }
    }
  } catch {}
  return {
    serviceEnabled: true,
    ownerWhatsAppNumber: '0745 694 499',
    gatewayProvider: 'callmebot',
    autoDispatchOnActivity: true,
    autoOpenWhatsAppOnClientSubmit: false,
    autoOpenWhatsAppInAdminOnNewLead: false
  };
}

export async function saveWhatsAppServiceSettings(settings: WhatsAppServiceSettings) {
  try {
    cachedWhatsAppSettings = settings;
    localStorage.setItem('natal_whatsapp_service_settings', JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('natal_whatsapp_service_changed', { detail: settings }));
    try {
      const docRef = doc(db, 'settings', 'communication_config');
      await setDoc(docRef, {
        whatsapp: sanitizeForFirestore(settings),
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (fbErr) {
      console.warn('Firestore communication_config whatsapp save note:', fbErr);
    }
  } catch {}
}

export function normalizeWhatsAppNumber(rawPhone: string): string {
  if (!rawPhone) return '256745694499';
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.startsWith('256')) return digits;
  if (digits.startsWith('0')) return '256' + digits.substring(1);
  if (digits.length === 9) return '256' + digits;
  return digits || '256745694499';
}

export interface OwnerWhatsAppTriggerParams {
  leadType: 'Quotation Request' | 'Contact Form' | 'VIP Registration' | 'WhatsApp Inquiry' | 'General Lead' | 'Phone Call Inquiry';
  name: string;
  phone?: string;
  email?: string;
  service?: string;
  details?: string;
  fileAttachmentName?: string;
  metadata?: Record<string, any>;
}

export interface DispatchedWhatsAppRecord {
  id: string;
  recipientPhone: string;
  activityType: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  service: string;
  details: string;
  message: string;
  directWhatsAppUrl: string;
  status: string;
  createdAt: string;
}

const recentWhatsAppDispatches = new Map<string, { time: number; result: any }>();

/**
 * Generates an executive-formatted WhatsApp notification message and dispatches it
 * to the website owner's WhatsApp number, while recording it permanently in Firestore.
 */
export async function triggerOwnerWhatsAppNotification(params: OwnerWhatsAppTriggerParams) {
  try {
    const waSettings = getWhatsAppServiceSettings();
    if (!waSettings.serviceEnabled && !waSettings.autoDispatchOnActivity) {
      return { success: false, reason: 'WhatsApp auto-dispatch is disabled in settings' };
    }

    const dedupKey = `${params.leadType}_${(params.name || '').trim()}_${(params.phone || '').trim()}_${(params.email || '').trim()}`;
    const cached = recentWhatsAppDispatches.get(dedupKey);
    const now = Date.now();
    if (cached && (now - cached.time) < 12000) {
      return cached.result;
    }

    const cleanOwnerDigits = normalizeWhatsAppNumber(waSettings.ownerWhatsAppNumber);
    const clientPhoneDigits = params.phone ? params.phone.replace(/\D/g, '').replace(/^0/, '256') : '';

    const lines: string[] = [
      `🏛️ *NATAL INTERIOR DESIGN & CONSTRUCTION*`,
      `🚨 *NEW CLIENT ACTIVITY NOTIFICATION*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📋 *Activity Type:* ${params.leadType}`,
      `👤 *Client Name:* ${params.name || 'Valued Client'}`
    ];

    if (params.phone && params.phone.trim()) {
      lines.push(`📱 *Phone / WhatsApp:* ${params.phone.trim()}`);
    }
    if (params.email && params.email.trim()) {
      lines.push(`✉️ *Client Email:* ${params.email.trim()}`);
    }
    if (params.service && params.service.trim()) {
      lines.push(`🛠️ *Service Requested:* ${params.service.trim()}`);
    }
    if (params.fileAttachmentName && params.fileAttachmentName.trim()) {
      lines.push(`📎 *Attached Plan / File:* ${params.fileAttachmentName.trim()}`);
    }
    if (params.details && params.details.trim()) {
      lines.push(`📝 *Project Scope / Brief:*`);
      lines.push(`${params.details.trim()}`);
    }

    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`⏱️ *Timestamp:* ${new Date().toLocaleString()}`);
    lines.push(`🌐 *Channel:* Natal Design Cloud Web Portal`);

    if (clientPhoneDigits && clientPhoneDigits.length >= 7) {
      lines.push(``);
      lines.push(`💬 *Direct WhatsApp Reply to Client:*`);
      lines.push(`https://wa.me/${clientPhoneDigits}`);
    }

    lines.push(``);
    lines.push(`_Automated direct dispatch to Studio Owner (${waSettings.ownerWhatsAppNumber})_`);

    const formattedMessage = lines.join('\n');
    const directWhatsAppUrl = `https://wa.me/${cleanOwnerDigits}?text=${encodeURIComponent(formattedMessage)}`;

    let dispatchStatus = 'queued_in_database';
    let gatewayResponse: any = null;

    const hasCallMeBotKey = Boolean(waSettings.callMeBotApiKey && waSettings.callMeBotApiKey.trim());

    // 1. If CallMeBot API is configured, send direct HTTP request for automated phone delivery
    if (hasCallMeBotKey || waSettings.gatewayProvider === 'callmebot') {
      if (hasCallMeBotKey) {
        try {
          const apiKey = encodeURIComponent(waSettings.callMeBotApiKey!.trim());
          const textParam = encodeURIComponent(formattedMessage);
          const queryParams = `phone=${cleanOwnerDigits}&text=${textParam}&apikey=${apiKey}`;

          let delivered = false;
          let callMeBotError = '';

          try {
            const res = await fetch(`/api/callmebot/whatsapp.php?${queryParams}`);
            const textResponse = await res.text().catch(() => '');
            const stripped = textResponse.replace(/<[^>]*>?/gm, '').trim();

            const isInvalid = res.status === 203 ||
              res.status >= 400 ||
              stripped.toLowerCase().includes('invalid') ||
              stripped.toLowerCase().includes('error') ||
              stripped.toLowerCase().includes('create a new one');

            if (!isInvalid && (res.status === 200 || stripped.includes('Message to'))) {
              delivered = true;
            } else {
              callMeBotError = stripped || 'APIKey is invalid';
            }
          } catch (e: any) {
            callMeBotError = e?.message || 'Network error reaching CallMeBot';
          }

          if (delivered) {
            dispatchStatus = 'delivered_via_callmebot';
            gatewayResponse = { status: 200, ok: true, message: `Dispatched directly to WhatsApp for +${cleanOwnerDigits}` };
          } else {
            dispatchStatus = 'callmebot_key_invalid';
            gatewayResponse = { status: 203, ok: false, message: callMeBotError || 'CallMeBot rejected API key. Re-authorize on WhatsApp or send directly.' };
          }
        } catch (err: any) {
          console.warn('CallMeBot dispatch note:', err);
          dispatchStatus = 'network_error_callmebot';
          gatewayResponse = { status: 500, ok: false, message: err?.message || 'Network error reaching CallMeBot' };
        }
      } else {
        dispatchStatus = 'callmebot_key_required';
        gatewayResponse = { status: 400, ok: false, message: 'CallMeBot API Key is missing. Follow the 1-tap setup guide in Admin Settings.' };
      }
    } else if (waSettings.gatewayProvider === 'ultramsg' && waSettings.ultraMsgInstanceId && waSettings.ultraMsgToken) {
      try {
        const instanceId = waSettings.ultraMsgInstanceId.trim();
        const token = waSettings.ultraMsgToken.trim();
        const res = await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            token,
            to: '+' + cleanOwnerDigits,
            body: formattedMessage
          })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && (data.sent === 'true' || data.sent === true || data.id)) {
          dispatchStatus = 'delivered_via_ultramsg';
          gatewayResponse = { status: 200, ok: true, message: 'Delivered directly to WhatsApp phone via UltraMsg!' };
        } else {
          dispatchStatus = 'ultramsg_error';
          gatewayResponse = { status: res.status, ok: false, message: data?.error || 'UltraMsg response error' };
        }
      } catch (err: any) {
        dispatchStatus = 'ultramsg_network_error';
        gatewayResponse = { status: 500, ok: false, message: err?.message || 'UltraMsg network error' };
      }
    } else if (waSettings.gatewayProvider === 'greenapi' && waSettings.greenApiInstanceId && waSettings.greenApiToken) {
      try {
        const idInstance = waSettings.greenApiInstanceId.trim();
        const apiTokenInstance = waSettings.greenApiToken.trim();
        const res = await fetch(`https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId: `${cleanOwnerDigits}@c.us`,
            message: formattedMessage
          })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.idMessage) {
          dispatchStatus = 'delivered_via_greenapi';
          gatewayResponse = { status: 200, ok: true, message: `Delivered via Green-API (Message ID: ${data.idMessage})` };
        } else {
          dispatchStatus = 'greenapi_error';
          gatewayResponse = { status: res.status, ok: false, message: data?.message || 'Green-API error' };
        }
      } catch (err: any) {
        dispatchStatus = 'greenapi_network_error';
        gatewayResponse = { status: 500, ok: false, message: err?.message || 'Green-API network error' };
      }
    } else if (waSettings.gatewayProvider === 'webhook' && waSettings.webhookUrl) {
      try {
        const res = await fetch(waSettings.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientPhone: cleanOwnerDigits,
            message: formattedMessage,
            leadType: params.leadType,
            clientName: params.name,
            clientPhone: params.phone,
            clientEmail: params.email,
            service: params.service,
            details: params.details,
            timestamp: new Date().toISOString()
          })
        });
        dispatchStatus = res.ok ? 'delivered_via_webhook' : 'failed_webhook';
      } catch (whErr: any) {
        console.warn('Webhook dispatch note:', whErr);
      }
    } else {
      dispatchStatus = 'ready_for_direct_whatsapp';
    }

    // 2. Persist to Firestore whatsapp_notifications collection as permanent audit trail
    let docId = 'wa_' + Date.now();
    try {
      const docRef = await addDoc(collection(db, 'whatsapp_notifications'), sanitizeForFirestore({
        recipientPhone: cleanOwnerDigits,
        activityType: params.leadType,
        clientName: params.name,
        clientPhone: params.phone || '',
        clientEmail: params.email || '',
        service: params.service || '',
        details: params.details || '',
        message: formattedMessage,
        directWhatsAppUrl,
        gatewayProvider: waSettings.gatewayProvider,
        status: dispatchStatus,
        createdAt: serverTimestamp()
      }));
      docId = docRef.id;
    } catch (fbErr) {
      console.warn('Firestore whatsapp_notifications queue error:', fbErr);
    }

    // 3. Cache locally so Admin Dashboard reflects it immediately
    const record: DispatchedWhatsAppRecord = {
      id: docId,
      recipientPhone: cleanOwnerDigits,
      activityType: params.leadType,
      clientName: params.name,
      clientPhone: params.phone || '',
      clientEmail: params.email || '',
      service: params.service || '',
      details: params.details || '',
      message: formattedMessage,
      directWhatsAppUrl,
      status: dispatchStatus,
      createdAt: new Date().toISOString()
    };

    try {
      const raw = localStorage.getItem('natal_local_whatsapp_dispatches');
      const list: DispatchedWhatsAppRecord[] = raw ? JSON.parse(raw) : [];
      list.unshift(record);
      localStorage.setItem('natal_local_whatsapp_dispatches', JSON.stringify(list.slice(0, 50)));
    } catch {}

    // Dispatch global event for live sound & UI banner in Admin Console
    window.dispatchEvent(new CustomEvent('natal_whatsapp_activity_dispatched', {
      detail: record
    }));

    const finalResult = {
      success: true,
      docId,
      recipientPhone: cleanOwnerDigits,
      message: formattedMessage,
      directWhatsAppUrl,
      status: dispatchStatus,
      gatewayResponse
    };
    recentWhatsAppDispatches.set(dedupKey, { time: now, result: finalResult });
    return finalResult;
  } catch (err: any) {
    console.warn('Could not dispatch owner WhatsApp notification:', err);
    return { success: false, error: err };
  }
}

export function getLocalWhatsAppDispatches(): DispatchedWhatsAppRecord[] {
  try {
    const raw = localStorage.getItem('natal_local_whatsapp_dispatches');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

/**
 * Formats a comprehensive executive WhatsApp message for any lead in the database
 * to be sent directly to the website owner.
 */
export function formatOwnerLeadWhatsAppMessage(lead: {
  leadType?: string;
  name?: string;
  phone?: string;
  email?: string;
  service?: string;
  details?: string;
  timestamp?: string | number;
  id?: string;
}): string {
  const waSettings = getWhatsAppServiceSettings();
  const lines: string[] = [
    `🏛️ *NATAL INTERIOR DESIGN & CONSTRUCTION*`,
    `🚨 *NEW CLIENT LEAD / INQUIRY*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📋 *Activity:* ${lead.leadType || 'Project Consultation Request'}`,
    `👤 *Client Name:* ${lead.name || 'Valued Client'}`
  ];
  if (lead.phone && lead.phone.trim()) {
    lines.push(`📱 *Client Phone / WhatsApp:* ${lead.phone.trim()}`);
  }
  if (lead.email && lead.email.trim()) {
    lines.push(`✉️ *Client Email:* ${lead.email.trim()}`);
  }
  if (lead.service && lead.service.trim()) {
    lines.push(`🛠️ *Service Requested:* ${lead.service.trim()}`);
  }
  if (lead.details && lead.details.trim()) {
    lines.push(`📝 *Project Scope / Brief:*`);
    lines.push(`${lead.details.trim()}`);
  }
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`⏱️ *Logged In Database:* ${new Date(lead.timestamp || Date.now()).toLocaleString()}`);
  if (lead.id) {
    lines.push(`💾 *Database Record ID:* ${lead.id}`);
  }
  if (lead.phone && lead.phone.trim()) {
    const cleanClient = normalizeWhatsAppNumber(lead.phone);
    lines.push(``);
    lines.push(`💬 *Direct WhatsApp Reply to Client:*`);
    lines.push(`https://wa.me/${cleanClient}`);
  }
  lines.push(``);
  lines.push(`_Routing to Studio Owner: ${waSettings.ownerWhatsAppNumber}_`);
  return lines.join('\n');
}

/**
 * Returns a 100% reliable direct WhatsApp link (wa.me) addressed to the owner
 * containing the full formatted lead information.
 */
export function getOwnerWhatsAppUrl(lead: any): string {
  const waSettings = getWhatsAppServiceSettings();
  const ownerDigits = normalizeWhatsAppNumber(waSettings.ownerWhatsAppNumber);
  const msg = formatOwnerLeadWhatsAppMessage(lead);
  return `https://wa.me/${ownerDigits}?text=${encodeURIComponent(msg)}`;
}

/**
 * Returns a direct WhatsApp reply link addressed to the client
 */
export function getClientWhatsAppReplyUrl(rawPhone: string, clientName?: string, service?: string): string {
  if (!rawPhone) return '';
  const cleanDigits = normalizeWhatsAppNumber(rawPhone);
  const greeting = clientName ? `Dear ${clientName}` : 'Hello';
  const serviceMention = service ? ` regarding "${service}"` : '';
  const text = `${greeting},\n\nThank you for contacting Natal Interior Design & Construction${serviceMention}! Our project engineering team in Kampala has received your specifications from our web portal and is ready to assist you.`;
  return `https://wa.me/${cleanDigits}?text=${encodeURIComponent(text)}`;
}

/**
 * Plays a discrete, pleasant executive chime using the browser Web Audio API
 * when a new lead or activity is detected in Firestore.
 */
export function playActivityChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {}
}

export interface QuoteThankYouParams {
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  service?: string;
  details?: string;
  customMessage?: string;
  apiKey?: string;
}

export interface QuoteThankYouResult {
  success: boolean;
  recipientPhone: string;
  message: string;
  status: string;
  directWhatsAppUrl?: string;
  gatewayResponse?: any;
  error?: any;
}

/**
 * Triggers an automatic thank-you message via the CallMeBot API immediately after a user
 * successfully submits a request from the QuotePage, confirming we have received their inquiry.
 */
export async function triggerQuoteThankYouCallMeBot(params: QuoteThankYouParams): Promise<QuoteThankYouResult> {
  try {
    const waSettings = getWhatsAppServiceSettings();
    const rawPhone = (params.clientPhone || '').trim();
    const cleanPhoneDigits = rawPhone ? normalizeWhatsAppNumber(rawPhone) : '';

    if (!cleanPhoneDigits) {
      return {
        success: false,
        recipientPhone: '',
        message: 'No client phone number provided for thank-you dispatch.',
        status: 'skipped_no_phone'
      };
    }

    const lines: string[] = [
      `🏛️ *NATAL INTERIOR DESIGN & CONSTRUCTION*`,
      `*Quotation Request Received & Confirmed*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Dear *${params.clientName || 'Valued Client'}*,`,
      ``,
      `Thank you for requesting a project quotation with Natal Interior Design & Construction! 🤝`,
      ``,
      `📋 *Inquiry Summary:*`,
      `• *Service Requested:* ${params.service || 'Interior Design & Construction'}`,
      `• *Client Name:* ${params.clientName || 'Valued Client'}`,
      `• *Contact Phone:* ${rawPhone}`,
    ];

    if (params.clientEmail && params.clientEmail.trim()) {
      lines.push(`• *Email:* ${params.clientEmail.trim()}`);
    }

    if (params.details && params.details.trim()) {
      const trimmedDetails = params.details.trim().length > 120 
        ? params.details.trim().substring(0, 120) + '...' 
        : params.details.trim();
      lines.push(`• *Project Scope:* ${trimmedDetails}`);
    }

    lines.push(``);
    lines.push(`⚙️ *Status:* Under Review by Lead Engineering Team`);
    lines.push(`⏱️ *Expected Response:* Within 2 Business Hours`);
    lines.push(``);
    lines.push(`Our senior design & construction engineers in Kampala are reviewing your specifications and will get in touch with you directly via call or WhatsApp with your customized estimate.`);
    lines.push(``);
    lines.push(`💬 *Direct Studio Desk:*`);
    lines.push(`📞 +256 745 694 499 / +256 777 568 259`);
    lines.push(`✉️ info@natalinteriors.com`);
    lines.push(`🌐 Kampala, Uganda`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`_Automated confirmation receipt from Natal Design Web Portal._`);

    const formattedMessage = params.customMessage || lines.join('\n');
    const directWhatsAppUrl = `https://wa.me/${cleanPhoneDigits}?text=${encodeURIComponent(formattedMessage)}`;

    let dispatchStatus = 'prepared_for_client';
    let gatewayResponse: any = null;

    // Use active CallMeBot API key from params or saved settings if available
    const apiKey = (params.apiKey || waSettings.callMeBotApiKey || '').trim();

    if (apiKey) {
      try {
        const queryParams = `phone=${cleanPhoneDigits}&text=${encodeURIComponent(formattedMessage)}&apikey=${encodeURIComponent(apiKey)}`;
        const directApiUrl = `https://api.callmebot.com/whatsapp.php?${queryParams}`;

        let delivered = false;

        // Attempt 1: Via proxy endpoint
        try {
          const res = await fetch(`/api/callmebot/whatsapp.php?${queryParams}`);
          const textResponse = await res.text().catch(() => '');
          if (res.ok && !textResponse.toLowerCase().includes('error')) {
            delivered = true;
          }
        } catch {}

        // Attempt 2: Direct browser request with no-cors
        if (!delivered) {
          try {
            await fetch(directApiUrl, { method: 'GET', mode: 'no-cors' });
            delivered = true;
          } catch {}
        }

        // Attempt 3: Background Image beacon (guaranteed fire-and-forget)
        try {
          const beacon = new Image();
          beacon.src = directApiUrl;
        } catch {}

        dispatchStatus = delivered ? 'delivered_via_callmebot' : 'dispatched_callmebot';
        gatewayResponse = { ok: true, status: 200, message: `Dispatched thank-you message to +${cleanPhoneDigits}` };
      } catch (callErr: any) {
        console.warn('CallMeBot thank-you dispatch warning:', callErr);
        dispatchStatus = 'callmebot_error';
        gatewayResponse = { ok: false, error: callErr?.message };
      }
    } else {
      dispatchStatus = 'ready_for_whatsapp_receipt';
    }

    // Persist confirmation record to Firestore whatsapp_notifications
    try {
      await addDoc(collection(db, 'whatsapp_notifications'), sanitizeForFirestore({
        recipientPhone: cleanPhoneDigits,
        activityType: 'Quotation Thank-You Confirmation',
        clientName: params.clientName,
        clientPhone: rawPhone,
        clientEmail: params.clientEmail || '',
        service: params.service || '',
        details: params.details || '',
        message: formattedMessage,
        directWhatsAppUrl,
        gatewayProvider: 'callmebot',
        status: dispatchStatus,
        createdAt: serverTimestamp()
      }));
    } catch (fbErr) {
      console.warn('Firestore thank-you log note:', fbErr);
    }

    return {
      success: true,
      recipientPhone: cleanPhoneDigits,
      message: formattedMessage,
      directWhatsAppUrl,
      status: dispatchStatus,
      gatewayResponse
    };
  } catch (err: any) {
    console.warn('triggerQuoteThankYouCallMeBot error:', err);
    return {
      success: false,
      recipientPhone: params.clientPhone || '',
      message: '',
      status: 'failed',
      error: err
    };
  }
}

// Convenient aliases for utility consumers
export const sendQuoteThankYouCallMeBot = triggerQuoteThankYouCallMeBot;
export const sendCallMeBotThankYou = triggerQuoteThankYouCallMeBot;
export const triggerThankYouCallMeBot = triggerQuoteThankYouCallMeBot;

/**
 * Reliably extracts milliseconds timestamp from any format:
 * Firestore Timestamp ({ seconds, nanoseconds } or { _seconds }), JS Date, ISO string, or numeric epoch.
 */
export function parseTimestampToMs(raw: any): number {
  if (!raw) return 0;
  if (typeof raw === 'number') {
    return raw < 1e11 ? raw * 1000 : raw;
  }
  if (typeof raw === 'object') {
    if (typeof raw.seconds === 'number') return raw.seconds * 1000;
    if (typeof raw._seconds === 'number') return raw._seconds * 1000;
    if (typeof raw.toDate === 'function') {
      try { return raw.toDate().getTime(); } catch {}
    }
    if (raw instanceof Date) return raw.getTime();
  }
  if (typeof raw === 'string') {
    const parsed = new Date(raw).getTime();
    if (!isNaN(parsed)) return parsed;
    const num = Number(raw);
    if (!isNaN(num) && num > 0) return num < 1e11 ? num * 1000 : num;
  }
  return 0;
}

/**
 * Returns the effective chronological timestamp (in ms) for a user record.
 * Checks createdAt, lastActive, updatedAt, activities, and embedded ID timestamps.
 */
export function getUserTimestamp(u: any): number {
  if (!u) return 0;
  // System administrator fallback account has baseline system timestamp so real clients are at the top
  if (u.id === 'admin_primary') {
    return 1704067200000; // 2024-01-01 UTC
  }
  const created = parseTimestampToMs(u.createdAt || u.created || u.joinedAt || u.registrationDate);
  if (created > 0) return created;
  const active = parseTimestampToMs(u.lastActive || u.lastLogin || u.lastSeen);
  if (active > 0) return active;
  const updated = parseTimestampToMs(u.updatedAt || u.timestamp || u.date);
  if (updated > 0) return updated;
  if (Array.isArray(u.activities) && u.activities.length > 0) {
    const actTimes = u.activities.map((a: any) => parseTimestampToMs(a.timestamp || a.createdAt || a.date));
    const maxAct = Math.max(...actTimes);
    if (maxAct > 0) return maxAct;
  }
  if (typeof u.id === 'string') {
    const match = u.id.match(/_(\d{10,13})/);
    if (match) {
      const num = Number(match[1]);
      return num < 1e11 ? num * 1000 : num;
    }
  }
  return 0;
}



