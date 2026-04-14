const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Logging Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(cors());
app.use(express.json());

let clientState = 'disconnected'; // disconnected, qr, connecting, ready
let lastQR = null;
let connectedNumber = null;

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './session'
  }),
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1012170944-alpha.html',
  },
  puppeteer: {
    // Portability: Use system path if provided (for local Win), 
    // otherwise let puppeteer find its own (default in Linux/Railway)
    executablePath: process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : '/usr/bin/google-chrome-stable'),
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--disable-extensions', 
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1920,1080'
    ],
    headless: true,
    defaultViewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
  }
});

// Sanitize App URL
const getBaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_APP_URL || '';
  return url.replace(/\/$/, ''); // Remove trailing slash
};

client.on('qr', (qr) => {
  clientState = 'qr';
  qrcode.toDataURL(qr, (err, url) => {
    lastQR = url;
  });
  console.log('QR Received');
});

client.on('ready', () => {
  clientState = 'ready';
  lastQR = null;
  connectedNumber = client.info.wid.user;
  console.log('Client is ready!');
});

client.on('authenticated', () => {
  console.log('Authenticated ✅');
});

client.on('loading_screen', (percent, message) => {
  console.log('Loading:', percent, message);
});

client.on('auth_failure', (msg) => {
  clientState = 'disconnected';
  console.error('Auth failure', msg);
});

client.on('disconnected', (reason) => {
  clientState = 'disconnected';
  lastQR = null;
  connectedNumber = null;
  console.log('Client was logged out', reason);
});

// Inbound message handler
client.on('message', async (msg) => {
  handleMessage(msg, 'incoming');
});

// Outbound/Self message handler (for testing sync)
client.on('message_create', async (msg) => {
  if (msg.fromMe) {
    console.log('[Self] Message detected:', msg.body);
  }
  // Only process messages from others for AI
  if (!msg.fromMe) {
    // Already handled by 'message' event for most cases, 
    // but some versions prefer processing here.
  }
});

async function handleMessage(msg, type) {
  if (msg.from.endsWith('@c.us')) {
    console.log(`[${type}] Message from ${msg.from}: ${msg.body}`);
    
    // Call Next.js AI handler
    try {
      const baseUrl = getBaseUrl();
      if (!baseUrl) {
        console.error('NEXT_PUBLIC_APP_URL is not configured');
        return;
      }

      console.log(`[Proxy] Sending to: ${baseUrl}/api/webhook/whatsapp/qr-bridge`);
      
      const response = await fetch(`${baseUrl}/api/webhook/whatsapp/qr-bridge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.WHATSAPP_SERVICE_API_KEY || 'default-secret'
        },
        body: JSON.stringify({
          from: msg.from,
          body: msg.body,
          pushname: msg._data.notifyName || 'WhatsApp User'
        })
      });
      
      if (!response.ok) {
        console.error(`Next.js AI responded with ${response.status}`);
        return;
      }

      const data = await response.json();
      if (data.reply) {
        console.log(`[AI Reply] ${data.reply}`);
        client.sendMessage(msg.from, data.reply);
      }
    } catch (err) {
      console.error('Error calling Next.js AI:', err);
    }
  }
}

// Endpoints
app.get('/', (req, res) => {
  res.json({
    name: 'Dr. Dent WhatsApp Bridge',
    status: 'online',
    client_state: clientState,
    version: '1.0.0'
  });
});

app.get('/status', (req, res) => {
  res.json({
    status: clientState,
    phone: connectedNumber
  });
});

app.get('/qr', (req, res) => {
  res.json({
    qr: lastQR,
    status: clientState
  });
});

app.post('/send', async (req, res) => {
  const { to, message } = req.body;
  try {
    const chat = await client.getChatById(to);
    await chat.sendMessage(message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/disconnect', async (req, res) => {
  try {
    await client.logout();
    clientState = 'disconnected';
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log('====================================');
  console.log(`🚀 Dr. Dent WhatsApp Service active`);
  console.log(`📍 URL: http://localhost:${port}`);
  console.log(`🔗 App URL: ${getBaseUrl() || 'Not configured'}`);
  console.log('====================================');
  
  // Initialize WhatsApp AFTER the server is listening
  // This helps Railway health checks pass immediately
  console.log('Initializing WhatsApp in 5 seconds...');
  setTimeout(() => {
    client.initialize().catch(err => {
      console.error('Failed to initialize client:', err);
    });
  }, 5000);
});
