import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { initFirestoreServerTriggers, triggerMetrics } from './server/firestoreTriggers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// In AI Studio container environments, Nginx runs on port 8080 and reverse proxies to port 3000.
// The dev/app server MUST always listen on port 3000.
const PORT = 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Start background server-side Firestore onCreate triggers
console.log('[Natal Server] Initializing background Firestore onCreate triggers...');
initFirestoreServerTriggers();

// -------------------------------------------------------------
// API Routes: Server-Side Firestore Trigger Pipeline & Gateways
// -------------------------------------------------------------

// Health & Status endpoint for Firestore Triggers
app.get('/api/triggers/status', (_req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    metrics: triggerMetrics,
    databaseCentralized: true,
    message: 'Firestore acts as the central source of truth for all email and WhatsApp communication flows.'
  });
});

// Trigger test simulation endpoint
app.post('/api/triggers/test', async (req, res) => {
  try {
    const { name, email, phone, service, details } = req.body || {};
    res.json({
      success: true,
      message: 'Test interaction received. Database trigger is monitoring new records.',
      data: { name, email, phone, service, details }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// Server-side robust email dispatch with FormSubmit and Web3Forms fallbacks
app.post('/api/notifications/dispatch-email', async (req, res) => {
  try {
    const { 
      recipientEmail = 'mukisavicent7777@gmail.com',
      subject = 'New Client Activity Alert',
      fields = {},
      leadType = 'Website Activity',
      clientName = 'Client',
      clientEmail = '',
      clientPhone = '',
      service = '',
      details = '',
      fileAttachmentName = '',
      web3FormsKey = ''
    } = req.body || {};

    const targetEmail = (recipientEmail || 'mukisavicent7777@gmail.com').trim().toLowerCase();
    const cleanPhone = (clientPhone || '').trim();
    const whatsappDigits = cleanPhone.replace(/\D/g, '').replace(/^0/, '256');
    const whatsappLink = whatsappDigits.length >= 7 ? `https://wa.me/${whatsappDigits}` : null;

    let formSubmitResult: any = null;
    let web3FormsResult: any = null;
    let activated = true;
    let statusMessage = '';

    // 1. Dispatch via FormSubmit with full server headers (Origin, Referer, Accept)
    try {
      const fsPayload: Record<string, any> = {
        _subject: `🚨 [Natal Lead] ${leadType}: ${clientName} - ${service || 'General Inquiry'}`,
        _template: 'box',
        _captcha: 'false',
        _replyto: clientEmail || undefined,
        'Lead Type': leadType,
        'Client Name': clientName,
        'Client Email': clientEmail || 'N/A',
        'Client Phone / WhatsApp': clientPhone || 'N/A',
        'Service Requested': service || 'N/A',
        'Project Scope / Details': details || 'N/A',
        'Plan / Attachment': fileAttachmentName || 'None',
        'WhatsApp Direct Link': whatsappLink || 'N/A',
        'Submission Timestamp': new Date().toLocaleString(),
        ...fields
      };

      const fsRes = await fetch(`https://formsubmit.co/ajax/${targetEmail}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': 'https://nataldesign.com',
          'Referer': 'https://nataldesign.com/'
        },
        body: JSON.stringify(fsPayload)
      });

      const fsData = await fsRes.json().catch(() => null);
      if (fsData) {
        formSubmitResult = fsData;
        const rawMsg = typeof fsData.message === 'string' ? fsData.message : '';
        const isActivationNeeded = 
          rawMsg.toLowerCase().includes('activation') || 
          rawMsg.toLowerCase().includes('activate') || 
          rawMsg.toLowerCase().includes('confirm') ||
          fsData.success === 'false' ||
          fsData.success === false;

        if (isActivationNeeded) {
          activated = false;
          statusMessage = `FormSubmit sent an activation email to ${targetEmail}. Please open your inbox (or spam) and click "Activate Form" once to complete setup.`;
        } else {
          statusMessage = `Email successfully delivered to ${targetEmail} via FormSubmit!`;
        }
      }
    } catch (fsErr: any) {
      console.warn('[Server Email] FormSubmit error:', fsErr?.message);
    }

    // 2. If Web3Forms key is configured, also dispatch via Web3Forms
    if (web3FormsKey && web3FormsKey.trim()) {
      try {
        const w3Res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            access_key: web3FormsKey.trim(),
            subject: `🚨 [Natal Lead] ${leadType}: ${clientName}`,
            from_name: 'Natal Interior Design & Construction',
            name: clientName,
            email: clientEmail,
            phone: clientPhone,
            message: `Lead Type: ${leadType}\nService: ${service}\nDetails: ${details}\nAttachment: ${fileAttachmentName || 'None'}`
          })
        });
        web3FormsResult = await w3Res.json().catch(() => null);
      } catch (w3Err: any) {
        console.warn('[Server Email] Web3Forms error:', w3Err?.message);
      }
    }

    return res.json({
      success: true,
      delivered: activated && (formSubmitResult?.success === 'true' || formSubmitResult?.success === true || web3FormsResult?.success === true),
      activated,
      recipient: targetEmail,
      message: statusMessage || 'Email notification processed.',
      formSubmitResult,
      web3FormsResult
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// Endpoint to check FormSubmit activation status or resend activation link
app.post('/api/notifications/check-email-status', async (req, res) => {
  try {
    const { email = 'mukisavicent7777@gmail.com' } = req.body || {};
    const targetEmail = (email || 'mukisavicent7777@gmail.com').trim().toLowerCase();

    const checkRes = await fetch(`https://formsubmit.co/ajax/${targetEmail}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'https://nataldesign.com',
        'Referer': 'https://nataldesign.com/'
      },
      body: JSON.stringify({
        _subject: 'Natal Design Cloud - Email Gateway Activation Ping',
        _template: 'box',
        _captcha: 'false',
        'Service Verification': 'Testing connection to owner inbox',
        'Target Inbox': targetEmail,
        'Timestamp': new Date().toLocaleString()
      })
    });

    const data = await checkRes.json().catch(() => ({}));
    const rawMsg = typeof data.message === 'string' ? data.message : '';
    const needsActivation = 
      rawMsg.toLowerCase().includes('activation') || 
      rawMsg.toLowerCase().includes('activate') || 
      rawMsg.toLowerCase().includes('confirm') ||
      data.success === 'false' ||
      data.success === false;

    res.json({
      success: true,
      isActivated: !needsActivation,
      targetEmail,
      message: needsActivation 
        ? `FormSubmit has sent an activation email to "${targetEmail}". Open your Gmail (check Inbox & Spam) and click "Activate Form" once.` 
        : `Email gateway is active! Delivery to "${targetEmail}" is verified.`,
      raw: data
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// Server-side proxy for CallMeBot WhatsApp API to bypass CORS
app.get('/api/callmebot/whatsapp.php', async (req, res) => {
  try {
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const targetUrl = `https://api.callmebot.com/whatsapp.php?${queryString}`;
    const response = await fetch(targetUrl);
    const text = await response.text();
    res.status(response.status).send(text);
  } catch (err: any) {
    res.status(500).json({ error: 'CallMeBot proxy error', details: err?.message });
  }
});

// Live test endpoint for validating WhatsApp gateway connection from Admin UI
app.post('/api/whatsapp/test-gateway', async (req, res) => {
  try {
    const { provider = 'callmebot', phone, apiKey, instanceId, token, webhookUrl, message = 'Test connection from Natal Design Cloud' } = req.body || {};
    
    const cleanDigits = (phone || '').replace(/\D/g, '').replace(/^0/, '256');
    if (!cleanDigits) {
      return res.status(400).json({ success: false, message: 'Valid phone number required' });
    }

    if (provider === 'callmebot') {
      const cleanKey = (apiKey || '').trim();
      if (!cleanKey) {
        return res.status(400).json({
          success: false,
          status: 400,
          message: 'CallMeBot API Key is missing. Tap the button to message CallMeBot on WhatsApp to get your 6-digit key.'
        });
      }

      const query = `phone=${cleanDigits}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(cleanKey)}`;
      const targetUrl = `https://api.callmebot.com/whatsapp.php?${query}`;
      const response = await fetch(targetUrl);
      const text = await response.text();
      const stripped = text.replace(/<[^>]*>?/gm, '').trim();

      const isInvalid = response.status === 203 ||
        response.status >= 400 ||
        stripped.toLowerCase().includes('invalid') ||
        stripped.toLowerCase().includes('create a new one') ||
        stripped.toLowerCase().includes('error');

      if (isInvalid) {
        return res.status(200).json({
          success: false,
          status: response.status,
          gateway: 'callmebot',
          message: stripped || 'APIKey is invalid. Tap Step 1 on your phone to send "I allow callmebot to send me messages" and get your active key.',
          rawResponse: stripped
        });
      }

      return res.json({
        success: true,
        status: 200,
        gateway: 'callmebot',
        message: `Success! CallMeBot accepted the message for +${cleanDigits}. Check your WhatsApp.`,
        rawResponse: stripped
      });
    }

    if (provider === 'ultramsg') {
      if (!instanceId || !token) {
        return res.status(400).json({ success: false, message: 'UltraMsg Instance ID and Token are required' });
      }
      const response = await fetch(`https://api.ultramsg.com/${instanceId.trim()}/messages/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: token.trim(),
          to: '+' + cleanDigits,
          body: message
        })
      });
      const data = await response.json().catch(() => ({}));
      const ok = response.ok && (data.sent === 'true' || data.sent === true || data.id);
      return res.json({
        success: ok,
        status: response.status,
        gateway: 'ultramsg',
        message: ok ? 'Dispatched directly via UltraMsg!' : (data?.error || 'UltraMsg response error'),
        details: data
      });
    }

    return res.json({
      success: true,
      gateway: provider,
      message: 'Direct WhatsApp link is configured. Messages open in WhatsApp app/web.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// Prevent unexpected errors or external gateway network drops from crashing the server
process.on('uncaughtException', (err) => {
  console.error('[Natal Server] Uncaught exception caught:', err?.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Natal Server] Unhandled rejection caught:', reason);
});

// -------------------------------------------------------------
// Vite Middlewares in Dev / Static Assets in Production
// -------------------------------------------------------------
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Natal Server] Server running on http://0.0.0.0:${PORT} [${isProd ? 'production' : 'development'}]`);
    console.log(`[Natal Server] Firestore database is acting as central source of truth for communication flows.`);
  });

  const handleShutdown = (signal: string) => {
    console.log(`[Natal Server] Received ${signal}. Shutting down server gracefully...`);
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('[Natal Server] Startup error:', err);
  process.exit(1);
});

