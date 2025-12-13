const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
  authStrategy: new LocalAuth(), // zapisuje sesję
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

client.on('message', message => {
  console.log(`📩 ${message.from}: ${message.body}`);

  if (message.body.toLowerCase() === 'ping') {
    message.reply('pong');
  }
});

client.initialize();
