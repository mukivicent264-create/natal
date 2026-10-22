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

