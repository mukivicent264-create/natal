import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { doc, setDoc, getDoc, serverTimestamp, collection, getDocs, addDoc, query, limit, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { projectsData, servicesData, testimonialsData } from './data';

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

      // Persist to Firestore users doc
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
          // If the original file is a PNG, export as PNG to preserve transparent alpha channel!
          // Converting PNG to JPEG was turning transparent logos into solid black blocks.
          const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
          const isWebp = file.type === 'image/webp' || file.name.toLowerCase().endsWith('.webp');
          
          if (isPng) {
            const compressed = canvas.toDataURL('image/png');
            resolve(compressed);
          } else if (isWebp) {
            const compressed = canvas.toDataURL('image/webp', quality);
            resolve(compressed);
          } else {
            const compressed = canvas.toDataURL('image/jpeg', quality);
            resolve(compressed);
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


