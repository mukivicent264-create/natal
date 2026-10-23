import { initializeApp, getApps } from 'firebase/app';
import { 
  initializeFirestore, 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  setDoc,
  serverTimestamp, 
  setLogLevel, 
  getDoc,
  Firestore
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Load Firebase applet configuration
let firebaseConfig: any = {};
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
} catch (err) {
  console.warn('[Server Triggers] Warning loading firebase-applet-config.json:', err);
}

// Silence noisy SDK warnings in container environments
setLogLevel('silent');

let db: Firestore | null = null;
let initialized = false;

// Statistics and health metrics
export const triggerMetrics = {
  startedAt: new Date().toISOString(),
  leadsProcessed: 0,
  activitiesProcessed: 0,
  usersProcessed: 0,
  notificationsDispatched: 0,
  emailsSent: 0,
  whatsappSent: 0,
  lastEventAt: '',
  activeListeners: [] as string[],
  errors: [] as string[]
};

// Cached dynamic communication settings from Firestore (settings/communication_config)
let activeSettings = {
  adminEmail: 'mukisavicent7777@gmail.com',
  ownerPhone: '256745694499', // 0745 694 499
  gatewayProvider: 'callmebot',
  callMeBotApiKey: '',
  ultraMsgInstanceId: '',
  ultraMsgToken: '',
  autoDispatch: true
};

// Deduplication cache to prevent re-notifying within 20 seconds
const processedCache = new Set<string>();

function normalizePhoneDigits(phone: string): string {
  if (!phone) return '256745694499';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('256')) return digits;
  if (digits.startsWith('0')) return '256' + digits.substring(1);
  return '256' + digits;
}

/**
 * Dispatch notification email to admin via FormSubmit HTTP API & Firestore mail collection
 */
async function sendAdminEmail(subject: string, fields: Record<string, any>) {
  try {
    triggerMetrics.emailsSent++;
    const recipient = activeSettings.adminEmail || 'mukisavicent7777@gmail.com';

    // 1. Send via FormSubmit HTTP API
    try {
      await fetch(`https://formsubmit.co/ajax/${recipient}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': 'https://nataldesign.com',
          'Referer': 'https://nataldesign.com/'
        },
        body: JSON.stringify({
          _subject: `[Natal Design Cloud] ${subject}`,
          _template: 'table',
          _captcha: 'false',
          source: 'Server-Side Firestore onCreate Trigger',
          ...fields,
          timestamp: new Date().toLocaleString()
        })
      });
    } catch (e: any) {
      console.warn('[Server Triggers] FormSubmit API email note:', e?.message);
    }

    // 2. Also log to mail collection in Firestore for Firebase Email Trigger extension
    if (db) {
      try {
        const mailDocId = 'mail_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        await setDoc(doc(db, 'mail', mailDocId), {
          to: [recipient],
          message: {
            subject: `[Natal Design Cloud] ${subject}`,
            html: `
              <div style="font-family: Arial, sans-serif; background-color: #0b0b0b; color: #fff; padding: 24px; border: 1px solid #D4AF37;">
                <h2 style="color: #D4AF37; margin-top: 0;">🏛️ NATAL INTERIOR DESIGN & CONSTRUCTION</h2>
                <h3 style="color: #ffffff; margin-bottom: 16px;">${subject}</h3>
                <table style="width: 100%; border-collapse: collapse; color: #ddd; font-size: 13px;">
                  ${Object.entries(fields).map(([key, val]) => `
                    <tr>
                      <td style="padding: 6px 12px; border-bottom: 1px solid #222; font-weight: bold; width: 140px; color: #D4AF37;">${key}</td>
                      <td style="padding: 6px 12px; border-bottom: 1px solid #222;">${val || '—'}</td>
                    </tr>
                  `).join('')}
                </table>
                <p style="font-size: 11px; color: #888; margin-top: 20px;">Automated Server Trigger from Natal Design Cloud Platform.</p>
              </div>
            `
          },
          createdAt: serverTimestamp()
        });
      } catch (fbMailErr) {
        // Mail collection fallback
      }
    }
  } catch (err: any) {
    console.error('[Server Triggers] sendAdminEmail error:', err?.message);
    triggerMetrics.errors.push(`Email error: ${err?.message}`);
  }
}

/**
 * Dispatch WhatsApp notification directly to owner or client via configured gateway
 */
async function sendWhatsAppMessage(targetPhoneDigits: string, textMessage: string): Promise<{ success: boolean; message: string; status?: number }> {
  try {
    triggerMetrics.whatsappSent++;
    const cleanDigits = normalizePhoneDigits(targetPhoneDigits);
    const apiKey = activeSettings.callMeBotApiKey?.trim();

    // 1. CallMeBot Gateway
    if (apiKey || activeSettings.gatewayProvider === 'callmebot') {
      if (!apiKey) {
        console.warn(`[Server Triggers] ⚠️ CallMeBot API key missing for +${cleanDigits}`);
        return { success: false, message: 'CallMeBot API key is not configured' };
      }

      try {
        const query = `phone=${cleanDigits}&text=${encodeURIComponent(textMessage)}&apikey=${encodeURIComponent(apiKey || '')}`;
        const url = `https://api.callmebot.com/whatsapp.php?${query}`;
        const res = await fetch(url, { method: 'GET' });
        const resText = await res.text().catch(() => '');
        const stripped = resText.replace(/<[^>]*>?/gm, '').trim();

        const isInvalid = res.status === 203 ||
          res.status >= 400 ||
          stripped.toLowerCase().includes('invalid') ||
          stripped.toLowerCase().includes('error') ||
          stripped.toLowerCase().includes('create a new one');

        if (isInvalid) {
          console.warn(`[Server Triggers] ⚠️ CallMeBot rejected delivery to +${cleanDigits}: ${stripped}`);
          triggerMetrics.errors.push(`CallMeBot: ${stripped || 'APIKey is invalid'}`);
          return { success: false, message: stripped || 'APIKey is invalid', status: res.status };
        }

        console.log(`[Server Triggers] ✅ CallMeBot accepted message for +${cleanDigits}`);
        return { success: true, message: 'Delivered via CallMeBot', status: res.status };
      } catch (err: any) {
        console.warn('[Server Triggers] CallMeBot dispatch network note:', err?.message);
        return { success: false, message: err?.message || 'CallMeBot network error' };
      }
    }

    // 2. UltraMsg Gateway
    if (activeSettings.gatewayProvider === 'ultramsg' && activeSettings.ultraMsgInstanceId && activeSettings.ultraMsgToken) {
      try {
        const res = await fetch(`https://api.ultramsg.com/${activeSettings.ultraMsgInstanceId}/messages/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            token: activeSettings.ultraMsgToken,
            to: '+' + cleanDigits,
            body: textMessage
          })
        });
        const json = await res.json().catch(() => ({}));
        const ok = res.ok && (json.sent === 'true' || json.sent === true || json.id);
        return { success: ok, message: ok ? 'Delivered via UltraMsg' : (json?.error || 'UltraMsg error') };
      } catch (err: any) {
        console.warn('[Server Triggers] UltraMsg dispatch note:', err?.message);
        return { success: false, message: err?.message };
      }
    }

    return { success: true, message: 'Direct WhatsApp link ready' };
  } catch (err: any) {
    console.error('[Server Triggers] sendWhatsAppMessage error:', err?.message);
    triggerMetrics.errors.push(`WhatsApp error: ${err?.message}`);
    return { success: false, message: err?.message };
  }
}

/**
 * Handle new lead document created in Firestore (leads collection)
 */
async function handleLeadCreated(docId: string, data: any) {
  if (data.serverProcessed || processedCache.has(`lead_${docId}`)) {
    return;
  }
  processedCache.add(`lead_${docId}`);
  triggerMetrics.leadsProcessed++;
  triggerMetrics.lastEventAt = new Date().toISOString();

  const isQuote = (data.service && data.service !== 'General Inquiry') || (data.details && data.details.toLowerCase().includes('quote'));
  const leadTitle = isQuote ? 'New Project Quotation Request' : 'New Client Consultation Inquiry';
  console.log(`[Server Triggers] ⚡ Processing new Firestore lead [${docId}]: ${leadTitle} from "${data.name || 'Anonymous'}"`);

  // 1. Notify Admin via Email
  await sendAdminEmail(leadTitle, {
    'Client Name': data.name || 'Valued Client',
    'Phone / WhatsApp': data.phone || 'Not provided',
    'Email': data.email || 'Not provided',
    'Service Requested': data.service || 'Custom Interior Design & Construction',
    'Project Scope / Brief': data.details || 'General Consultation',
    'Document ID': docId,
    'Database Collection': 'leads'
  });

  // 2. Notify Owner via WhatsApp
  const ownerLines = [
    `*NATAL INTERIOR DESIGN & CONSTRUCTION*`,
    `*Activity:* ${leadTitle}`,
    `*Name:* ${data.name || 'Client'}`
  ];
  if (data.phone) ownerLines.push(`*Phone:* ${data.phone}`);
  if (data.email) ownerLines.push(`*Email:* ${data.email}`);
  if (data.service) ownerLines.push(`*Service:* ${data.service}`);
  if (data.details) ownerLines.push(`*Details:* ${data.details}`);
  ownerLines.push(`*Date:* ${new Date().toLocaleString()}`);

  const ownerMessage = ownerLines.join('\n');
  const waResult = await sendWhatsAppMessage(activeSettings.ownerPhone, ownerMessage);
  const directWhatsAppUrl = `https://wa.me/${activeSettings.ownerPhone}?text=${encodeURIComponent(ownerMessage)}`;

  // 3. If client provided phone, send automatic confirmation receipt to client
  if (data.phone && data.phone.trim()) {
    const clientPhoneDigits = normalizePhoneDigits(data.phone);
    const clientLines = [
      `*NATAL INTERIOR DESIGN & CONSTRUCTION*`,
      `*Inquiry Received*`,
      ``,
      `Dear ${data.name || 'Client'},`,
      ``,
      `Thank you for contacting Natal Interior Design & Construction. We have received your inquiry.`,
      ``,
      `*Service:* ${data.service || 'Interior Design & Construction'}`,
      `*Status:* Under review by our design team`,
      ``,
      `Our team will contact you shortly.`,
      ``,
      `Natal Interior Design & Construction`,
      `Kampala, Uganda`
    ];
    await sendWhatsAppMessage(clientPhoneDigits, clientLines.join('\n'));
  }

  // 4. Update the Firestore document marking it as processed by the server trigger
  if (db) {
    try {
      await updateDoc(doc(db, 'leads', docId), {
        serverProcessed: true,
        serverNotifiedAt: serverTimestamp(),
        notifiedAdminViaEmail: true,
        notifiedAdminViaWhatsApp: waResult.success,
        whatsappDeliveryStatus: waResult.success ? 'delivered_via_gateway' : 'gateway_rejected_invalid_key',
        whatsappDeliveryNote: waResult.message,
        directOwnerWhatsAppUrl: directWhatsAppUrl
      });
    } catch (updateErr) {
      // Document update note
    }
  }
}

/**
 * Handle new user activity logged in Firestore (user_activities collection)
 */
async function handleActivityCreated(docId: string, data: any) {
  if (data.serverProcessed || processedCache.has(`act_${docId}`)) {
    return;
  }
  processedCache.add(`act_${docId}`);
  triggerMetrics.activitiesProcessed++;
  triggerMetrics.lastEventAt = new Date().toISOString();

  // Filter for significant user interactions (skip passive internal logs)
  const isKeyInteraction = 
    data.type === 'quotation' || 
    data.type === 'contact' || 
    data.type === 'registration' || 
    data.type === 'specs_inquiry' || 
    data.type === 'whatsapp' || 
    data.type === 'call';

  if (!isKeyInteraction) return;

  console.log(`[Server Triggers] ⚡ Processing user activity [${docId}]: ${data.title} (${data.type})`);

  // 1. Notify Admin via Email for activities
  await sendAdminEmail(`Activity Alert: ${data.title || 'Client Action'}`, {
    'Activity': data.title || 'Client Interaction',
    'Activity Type': data.type || 'Interaction',
    'Client / Visitor': data.userName || data.userEmail || 'Website Visitor',
    'Phone / WhatsApp': data.userPhone || 'Not provided',
    'Email Address': data.userEmail || 'Not provided',
    'Activity Details': data.description || 'User performed interaction on website',
    'Document ID': docId,
    'Database Collection': 'user_activities'
  });

  // 2. Notify Owner via WhatsApp for critical activities
  const lines = [
    `*NATAL INTERIOR DESIGN & CONSTRUCTION*`,
    `*Activity:* ${data.title || data.type || 'Client Activity'}`,
    `*Name:* ${data.userName || data.userEmail || 'Client'}`
  ];
  if (data.userPhone) {
    lines.push(`*Phone:* ${data.userPhone}`);
  }
  if (data.userEmail) {
    lines.push(`*Email:* ${data.userEmail}`);
  }
  if (data.description) {
    lines.push(`*Details:* ${data.description}`);
  }
  lines.push(`*Date:* ${data.timestamp || new Date().toLocaleString()}`);

  await sendWhatsAppMessage(activeSettings.ownerPhone, lines.join('\n'));

  // Mark activity as processed
  if (db) {
    try {
      await updateDoc(doc(db, 'user_activities', docId), {
        serverProcessed: true,
        serverNotifiedAt: serverTimestamp()
      });
    } catch {}
  }
}

/**
 * Handle new client user registered in Firestore (users collection)
 */
async function handleUserCreated(docId: string, data: any) {
  if (data.serverNotifiedAt || processedCache.has(`user_${docId}`) || data.isAdmin) {
    return;
  }
  processedCache.add(`user_${docId}`);
  triggerMetrics.usersProcessed++;
  triggerMetrics.lastEventAt = new Date().toISOString();

  console.log(`[Server Triggers] ⚡ Processing new user registration [${docId}]: ${data.name} (${data.email})`);

  // 1. Email Admin
  await sendAdminEmail('New VIP Client Registration', {
    'Client Name': data.name || 'VIP Client',
    'Email Address': data.email,
    'Phone': data.phone || 'Not provided',
    'VIP Tier': data.vipTier || 'VIP Gold Member',
    'Property Type': data.projectType || 'General Architecture',
    'Primary Discipline': data.service || 'Interior Design & Lighting',
    'Registration Date': data.createdAt ? new Date().toLocaleString() : new Date().toLocaleString()
  });

  // 2. WhatsApp Owner
  const lines = [
    `*NATAL INTERIOR DESIGN & CONSTRUCTION*`,
    `*Activity:* Client Registration`,
    `*Name:* ${data.name || 'Client'}`
  ];
  if (data.phone) {
    lines.push(`*Phone:* ${data.phone}`);
  }
  if (data.email) {
    lines.push(`*Email:* ${data.email}`);
  }
  if (data.vipTier) {
    lines.push(`*Tier:* ${data.vipTier}`);
  }
  if (data.projectType) {
    lines.push(`*Project Type:* ${data.projectType}`);
  }
  if (data.service) {
    lines.push(`*Service:* ${data.service}`);
  }
  lines.push(`*Date:* ${new Date().toLocaleString()}`);

  await sendWhatsAppMessage(activeSettings.ownerPhone, lines.join('\n'));

  // 3. WhatsApp Welcome Confirmation to Client if phone exists
  if (data.phone && data.phone.trim()) {
    const clientPhone = normalizePhoneDigits(data.phone);
    const welcome = [
      `*NATAL INTERIOR DESIGN & CONSTRUCTION*`,
      `*Welcome to Natal Interior Design*`,
      ``,
      `Dear ${data.name || 'Client'},`,
      ``,
      `Your account has been successfully created. You now have access to project tracking and direct consultations with our design team.`,
      ``,
      `Natal Interior Design & Construction`,
      `Kampala, Uganda`
    ];
    await sendWhatsAppMessage(clientPhone, welcome.join('\n'));
  }

  // Update document
  if (db) {
    try {
      await updateDoc(doc(db, 'users', docId), {
        serverNotifiedAt: serverTimestamp()
      });
    } catch {}
  }
}

/**
 * Handle new records created in whatsapp_notifications queue
 */
async function handleNotificationCreated(docId: string, data: any) {
  if (data.status === 'delivered_via_callmebot' || data.serverProcessed || processedCache.has(`wa_${docId}`)) {
    return;
  }
  processedCache.add(`wa_${docId}`);
  triggerMetrics.notificationsDispatched++;

  // If status is queued_in_database or ready_for_direct_whatsapp, server dispatches it directly via gateway!
  if (data.status === 'queued_in_database' || data.status === 'ready_for_direct_whatsapp' || data.status === 'callmebot_key_required') {
    const res = await sendWhatsAppMessage(data.recipientPhone || activeSettings.ownerPhone, data.message);
    if (db) {
      try {
        await updateDoc(doc(db, 'whatsapp_notifications', docId), {
          status: res.success ? 'delivered_via_callmebot' : 'callmebot_key_invalid',
          serverProcessed: true,
          deliveredAt: serverTimestamp(),
          gatewayNote: res.message
        });
      } catch {}
    }
  }
}

/**
 * Initializes real-time Firestore onCreate triggers for all communication flows.
 * This ensures the database acts as the single central source of truth.
 */
export function initFirestoreServerTriggers() {
  if (initialized) return;
  initialized = true;

  try {
    const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    const firestoreDbId = firebaseConfig.firestoreDatabaseId || "ai-studio-natalinteriordes-140ac38f-5cb8-448a-9690-3bb623514906";
    
    db = initializeFirestore(app, {}, firestoreDbId);
    console.log(`[Server Triggers] Connected to Firestore database: "${firestoreDbId}"`);

    // 0. Listen to settings/communication_config for live admin preferences
    try {
      onSnapshot(doc(db, 'settings', 'communication_config'), (snap) => {
        if (snap.exists()) {
          const cfg = snap.data();
          if (cfg.whatsapp) {
            activeSettings.ownerPhone = normalizePhoneDigits(cfg.whatsapp.ownerWhatsAppNumber || '256745694499');
            activeSettings.gatewayProvider = cfg.whatsapp.gatewayProvider || 'callmebot';
            activeSettings.callMeBotApiKey = cfg.whatsapp.callMeBotApiKey || '';
            activeSettings.ultraMsgInstanceId = cfg.whatsapp.ultraMsgInstanceId || '';
            activeSettings.ultraMsgToken = cfg.whatsapp.ultraMsgToken || '';
            activeSettings.autoDispatch = cfg.whatsapp.autoDispatchOnActivity !== false;
          }
          if (cfg.email && cfg.email.recipientEmail) {
            activeSettings.adminEmail = cfg.email.recipientEmail;
          }
          console.log('[Server Triggers] Synced live communication preferences from Firestore.');
        }
      });
      triggerMetrics.activeListeners.push('settings/communication_config');
    } catch (e: any) {
      console.warn('[Server Triggers] Settings sync note:', e?.message);
    }

    // 1. Trigger for 'leads' collection (Quote requests, consultation inquiries)
    try {
      let isFirstLeadsSnapshot = true;
      onSnapshot(collection(db, 'leads'), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            // In initial snapshot, only process leads created recently (last 10 minutes) or unnotified
            if (isFirstLeadsSnapshot) {
              if (!data.serverProcessed && !data.notifiedAdminViaEmail) {
                handleLeadCreated(change.doc.id, data);
              }
            } else {
              handleLeadCreated(change.doc.id, data);
            }
          }
        });
        isFirstLeadsSnapshot = false;
      }, (err) => {
        console.warn('[Server Triggers] leads listener note:', err?.message);
      });
      triggerMetrics.activeListeners.push('leads');
      console.log('[Server Triggers] Registered onCreate trigger on collection: "leads"');
    } catch (e: any) {
      console.warn('[Server Triggers] Failed to attach leads trigger:', e?.message);
    }

    // 2. Trigger for 'user_activities' collection (User interactions, clicks, inquiries)
    try {
      let isFirstActivitySnapshot = true;
      onSnapshot(collection(db, 'user_activities'), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            if (isFirstActivitySnapshot) {
              if (!data.serverProcessed) {
                handleActivityCreated(change.doc.id, data);
              }
            } else {
              handleActivityCreated(change.doc.id, data);
            }
          }
        });
        isFirstActivitySnapshot = false;
      }, (err) => {
        console.warn('[Server Triggers] user_activities listener note:', err?.message);
      });
      triggerMetrics.activeListeners.push('user_activities');
      console.log('[Server Triggers] Registered onCreate trigger on collection: "user_activities"');
    } catch (e: any) {
      console.warn('[Server Triggers] Failed to attach user_activities trigger:', e?.message);
    }

    // 3. Trigger for 'users' collection (VIP Client registrations)
    try {
      let isFirstUsersSnapshot = true;
      onSnapshot(collection(db, 'users'), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            if (isFirstUsersSnapshot) {
              if (!data.serverNotifiedAt && !data.isAdmin && data.source === 'Registration') {
                handleUserCreated(change.doc.id, data);
              }
            } else {
              handleUserCreated(change.doc.id, data);
            }
          }
        });
        isFirstUsersSnapshot = false;
      }, (err) => {
        console.warn('[Server Triggers] users listener note:', err?.message);
      });
      triggerMetrics.activeListeners.push('users');
      console.log('[Server Triggers] Registered onCreate trigger on collection: "users"');
    } catch (e: any) {
      console.warn('[Server Triggers] Failed to attach users trigger:', e?.message);
    }

    // 4. Trigger for 'whatsapp_notifications' collection (Background WhatsApp message queue)
    try {
      let isFirstWaSnapshot = true;
      onSnapshot(collection(db, 'whatsapp_notifications'), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            if (isFirstWaSnapshot) {
              if (data.status === 'queued_in_database') {
                handleNotificationCreated(change.doc.id, data);
              }
            } else {
              handleNotificationCreated(change.doc.id, data);
            }
          }
        });
        isFirstWaSnapshot = false;
      }, (err) => {
        console.warn('[Server Triggers] whatsapp_notifications listener note:', err?.message);
      });
      triggerMetrics.activeListeners.push('whatsapp_notifications');
      console.log('[Server Triggers] Registered onCreate trigger on collection: "whatsapp_notifications"');
    } catch (e: any) {
      console.warn('[Server Triggers] Failed to attach whatsapp_notifications trigger:', e?.message);
    }

    console.log('[Server Triggers] 🚀 All server-side Firestore triggers are active and monitoring the database.');
  } catch (err: any) {
    console.error('[Server Triggers] Initialization error:', err?.message);
    triggerMetrics.errors.push(`Init error: ${err?.message}`);
  }
}
