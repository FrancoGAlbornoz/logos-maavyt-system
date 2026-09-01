const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');
require('dotenv').config();

async function inspectInbox() {
  const user = process.env.GMAIL_USER;
  const password = process.env.GMAIL_APP_PASSWORD;

  const config = {
    imap: {
      user: user.trim(),
      password: password.trim(),
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 10000
    }
  };

  console.log(`--- Inspeccionando bandeja de entrada para ${user} ---`);

  try {
    const connection = await imaps.connect(config);
    await connection.openBox('INBOX');

    // Traer los últimos 15 correos de la bandeja de entrada
    const searchCriteria = ['ALL'];
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''],
      markSeen: false
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    console.log(`Total de correos en INBOX: ${messages.length}`);

    const lastMessages = messages.slice(-15);

    for (let i = 0; i < lastMessages.length; i++) {
      const msg = lastMessages[i];
      const allParts = msg.parts.find(part => part.which === '');
      const flags = msg.attributes.flags || [];
      const isUnseen = !flags.includes('\\Seen');

      if (allParts && allParts.body) {
        const parsed = await simpleParser(allParts.body);
        console.log(`\n[#${i + 1}] ID: ${msg.attributes.uid} | Estado: ${isUnseen ? 'SIN LEER (UNSEEN)' : 'LEIDO (SEEN)'}`);
        console.log(`     De: ${parsed.from ? parsed.from.text : 'Desconocido'}`);
        console.log(`     Fecha: ${parsed.date}`);
        console.log(`     Asunto: "${parsed.subject}"`);
        console.log(`     Snippet: ${parsed.text ? parsed.text.substring(0, 120).replace(/\n/g, ' ') : 'Sin texto'}`);
      }
    }

    connection.end();
  } catch (err) {
    console.error('Error al inspeccionar correos:', err);
  }
}

inspectInbox();
