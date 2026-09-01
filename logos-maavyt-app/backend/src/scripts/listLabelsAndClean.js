const imaps = require('imap-simple');
const { pool } = require('../config/database');
require('dotenv').config();

async function listLabelsAndClean() {
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

  console.log(`--- Buscando Etiquetas de Gmail para ${user} ---`);

  try {
    const connection = await imaps.connect(config);
    const boxes = await connection.getBoxes();

    console.log('Carpetas y Etiquetas disponibles en tu Gmail:');
    printBoxes(boxes, '');

    connection.end();
  } catch (err) {
    console.error('Error al obtener carpetas:', err);
  }
}

function printBoxes(boxes, prefix) {
  for (const key in boxes) {
    const box = boxes[key];
    const fullPath = prefix ? `${prefix}/${key}` : key;
    console.log(` - ${fullPath}`);
    if (box.children) {
      printBoxes(box.children, fullPath);
    }
  }
}

listLabelsAndClean();
