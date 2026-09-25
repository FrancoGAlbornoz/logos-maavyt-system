const fs = require('fs');

let content = fs.readFileSync('src/services/gmailService.js', 'utf8');

// 1. Update 15 days logic
const minDateOld = "let minDate = fecha_desde ? new Date(fecha_desde) : new Date(today.getFullYear(), today.getMonth(), 1);";
const minDateNew = `let minDate = fecha_desde ? new Date(fecha_desde) : new Date();
  if (!fecha_desde) {
    minDate.setDate(today.getDate() - 15);
  }`;
content = content.replace(minDateOld, minDateNew);

// 2. Update getClientIdByEmail to restrict names
const getClientIdOldRegex = /async function getClientIdByEmail\([\s\S]*?return res\.insertId;\n\}/;
const getClientIdNew = `async function getClientIdByEmail(dbConnection, senderName, senderEmail) {
  if (!senderEmail) return 1;

  let nombreDeseado = 'Logos Traslados';
  if (senderEmail.toLowerCase().includes('toscana.com.ar')) {
    nombreDeseado = 'Toscana';
  } else if (senderEmail.toLowerCase().includes('corporatelogistics.com.ar') || senderEmail.toLowerCase().includes('monica.luna')) {
    nombreDeseado = 'Corporate Logistics';
  } else if (senderEmail.toLowerCase().includes('logostravel') || senderEmail.toLowerCase().includes('logos-travel')) {
    nombreDeseado = 'Logos Traslados';
  } else {
    // Si es un email propio o desconocido, lo asignamos a Logos Traslados por defecto
    nombreDeseado = 'Logos Traslados';
  }

  // Buscar si ya existe el cliente con ese nombre
  const [rows] = await dbConnection.execute(
    \`SELECT id FROM clientes WHERE nombre = ?\`,
    [nombreDeseado]
  );
  
  if (rows.length > 0) {
    return rows[0].id;
  }

  // Si no existe, lo creamos
  const [res] = await dbConnection.execute(
    \`INSERT INTO clientes (nombre, email, contacto_nombre) VALUES (?, ?, 'Automático (Gmail)')\`,
    [nombreDeseado, senderEmail]
  );
  return res.insertId;
}`;

content = content.replace(getClientIdOldRegex, getClientIdNew);

fs.writeFileSync('src/services/gmailService.js', content, 'utf8');
console.log("Updated gmailService.js with 15 days and restricted clients");
