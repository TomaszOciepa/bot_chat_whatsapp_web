const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

//
// --- WHATSAPP CLIENT ---
//

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true
  }
});

client.on('qr', (qr) => {
  console.log('Zeskanuj QR kod:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('🤖 Bot gotowy!');
});

//
// --- ODBIÓR WIADOMOŚCI (NIGDY NIE WYSYŁAMY TU ODPOWIEDZI) ---
//

client.on('message', async (message) => {
  if (message.fromMe) return;

  console.log(`📩 ${message.from}: ${message.body}`);

  try {
    await axios.post('http://localhost:3000/messages', {
      from: message.from,
      body: message.body
    });
  } catch (error) {
    console.error('❌ Błąd wysyłania do Rails:', error.message);
  }
});

client.initialize();

//
// --- EXPRESS API (TYLKO DO WYSYŁANIA WIADOMOŚCI) ---
//

const app = express();
app.use(express.json());

//
// Rails → Node → WhatsApp
//
app.post('/send', async (req, res) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ error: 'Missing to or message' });
  }

  try {
    await client.sendMessage(to, message);
    res.json({ status: 'sent' });
  } catch (error) {
    console.error('❌ Send error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3005, () => {
  console.log('🌐 Node WhatsApp API listening on http://localhost:3005');
});
