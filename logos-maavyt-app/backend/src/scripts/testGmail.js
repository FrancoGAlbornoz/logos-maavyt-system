const { syncGmailVouchers } = require('../services/gmailService');

async function test() {
  console.log('--- Probando conexión y sincronización con Gmail ---');
  const result = await syncGmailVouchers();
  console.log('Resultado:', JSON.stringify(result, null, 2));
  process.exit(0);
}

test();
