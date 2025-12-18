require('dotenv').config();
const QRCode = require('qrcode');
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

let latestQr = null;
let isReady = false;

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

function requireQrAuth(req, res, next) {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="QR Access"');
    return res.status(401).send('Authentication required');
  }

  const base64Credentials = auth.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
  const [username, password] = credentials.split(':');

  // username ignorujemy, sprawdzamy tylko hasło
  if (password !== process.env.QR_PASSWORD) {
    res.setHeader('WWW-Authenticate', 'Basic realm="QR Access"');
    return res.status(401).send('Invalid credentials');
  }

  next();
}


app.get('/', (req, res) => {
  res.send('✅ WhatsApp bot running');
});

app.get('/qr', requireQrAuth, async (req, res) => {
  if (isReady) {
    return res.send('✅ WhatsApp already authenticated');
  }

  if (!latestQr) {
    return res.send('⏳ QR not ready yet, refresh in a moment');
  }

  try {
    const png = await QRCode.toBuffer(latestQr, {
      type: 'png',
      width: 300,
      margin: 2
    });

    res.setHeader('Content-Type', 'image/png');
    res.send(png);
  } catch (err) {
    res.status(500).send('❌ Failed to generate QR');
  }
});



const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  }
});

client.on('qr', (qr) => {
  latestQr = qr;
  console.log('📱 Nowy QR wygenerowany');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  isReady = true;
  latestQr = null;
  console.log('🤖 WhatsApp bot gotowy!');
});

client.on('message', async (message) => {
  if (message.fromMe) return;

   console.log(`📩 WhatsApp: ${message.from} → ${message.body || '[brak treści]'}`);

  try {
    await axios.post(process.env.RAILS_WEBHOOK_URL, {
      from: message.from,
      body: message.body
    });
  } catch (error) {
    console.error('❌ Błąd wysyłania do Rails:', error.message);
  }
});

client.initialize();

app.post('/send', async (req, res) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ error: 'Missing to or message' });
  }

  console.log(`📤 WhatsApp SEND → ${to}: ${message}`);

  try {
    await client.sendMessage(to, message);
    res.json({ status: 'sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🌐 Node WhatsApp API listening on port ${PORT}`);
});
