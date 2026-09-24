const fs = require('fs');

let content = fs.readFileSync('src/services/gmailService.js', 'utf8');

const helperCode = `
async function getClientIdByEmail(dbConnection, senderName, senderEmail) {
  if (!senderEmail) return 1;

  // Buscar por email exacto o dominio
  const [rows] = await dbConnection.execute(
    \`SELECT id, nombre FROM clientes WHERE email = ? OR email LIKE ?\`,
    [senderEmail, \`%@\${senderEmail.split('@')[1]}\`]
  );
  
  if (rows.length > 0) {
    return rows[0].id;
  }

  // Si no existe, crear el cliente basado en el dominio
  let nombreCliente = senderName || senderEmail.split('@')[1].split('.')[0];
  // Capitalize
  nombreCliente = nombreCliente.charAt(0).toUpperCase() + nombreCliente.slice(1);

  if (senderEmail.includes('toscana.com.ar')) nombreCliente = 'Toscana';
  else if (senderEmail.includes('corporatelogistics.com.ar')) nombreCliente = 'Corporate Logistics';

  const [res] = await dbConnection.execute(
    \`INSERT INTO clientes (nombre, email, contacto_nombre) VALUES (?, ?, 'Automático (Gmail)')\`,
    [nombreCliente, senderEmail]
  );
  return res.insertId;
}
`;

if (!content.includes('getClientIdByEmail')) {
  // insert helper before syncGmailVouchers
  content = content.replace("async function syncGmailVouchers", helperCode + "\nasync function syncGmailVouchers");
  
  // replace hardcoded 1 with dynamic clientId
  // First, we need to extract sender email
  content = content.replace("const textBody = parsedEmail.text || '';", "const textBody = parsedEmail.text || '';\n        const senderEmail = (parsedEmail.from && parsedEmail.from.value && parsedEmail.from.value[0]) ? parsedEmail.from.value[0].address : '';\n        const senderName = (parsedEmail.from && parsedEmail.from.value && parsedEmail.from.value[0]) ? parsedEmail.from.value[0].name : '';");
  
  // get client id inside the try block
  content = content.replace("const dbConnection = await pool.getConnection();\n\n        try {", "const dbConnection = await pool.getConnection();\n\n        try {\n          const clientId = await getClientIdByEmail(dbConnection, senderName, senderEmail);");

  // in Alta de Nuevo Servicio, replace hardcoded 1 with clientId
  content = content.replace(/srv\.nro_reserva, 1, periodoId, 1, 1,/g, "srv.nro_reserva, clientId, periodoId, 1, 1,");
  
  fs.writeFileSync('src/services/gmailService.js', content, 'utf8');
  console.log("gmailService updated with dynamic client ID");
}
