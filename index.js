require('dotenv').config();
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

//
// ===== EXPRESS =====
//
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('✅ WhatsApp bot running');
});

//
// ===== WHATSAPP CLIENT =====
//
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
  console.log('📱 Zeskanuj QR kod:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('🤖 WhatsApp bot gotowy!');
});

//
// ===== ODBIÓR WIADOMOŚCI (Node → Rails) =====
//
client.on('message', async (message) => {
  if (message.fromMe) return;

  console.log(`📩 ${message.from}: ${message.body}`);

  try {
    await axios.post(
      process.env.RAILS_WEBHOOK_URL, // 👈 ENV
      {
        from: message.from,
        body: message.body
      },
      { timeout: 5000 }
    );
  } catch (error) {
    console.error('❌ Błąd wysyłania do Rails:', error.message);
  }
});

client.initialize();

//
// ===== Rails → Node → WhatsApp =====
//
app.post('/send', async (req, res) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ error: 'Missing to or message' });
  }

  try {
    await client.sendMessage(to, message);
    console.log(`📤 ${to}: ${message}`);
    res.json({ status: 'sent' });
  } catch (error) {
    console.error('❌ Send error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

//
// ===== START SERVER =====
//
app.listen(PORT, () => {
  console.log(`🌐 Node WhatsApp API listening on port ${PORT}`);
});
