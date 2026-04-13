const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

let clientState = 'disconnected'; // disconnected, qr, connecting, ready
let lastQR = null;
let connectedNumber = null;

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './session'
  }),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true
  }
});

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
  console.log('Authenticated');
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

// Incoming message handler
client.on('message', async (msg) => {
  if (msg.from.endsWith('@c.us')) {
    console.log('Received message from:', msg.from, msg.body);
    
    // Call Next.js AI handler
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/whatsapp/qr-bridge`, {
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
      
      const data = await response.json();
      if (data.reply) {
        client.sendMessage(msg.from, data.reply);
      }
    } catch (err) {
      console.error('Error calling Next.js AI:', err);
    }
  }
});

// Endpoints
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

client.initialize().catch(err => {
  console.error('Failed to initialize client:', err);
});

app.listen(port, () => {
  console.log(`WhatsApp Service listening at http://localhost:${port}`);
});
