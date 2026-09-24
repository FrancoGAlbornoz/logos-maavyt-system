const fs = require('fs');

const path = './src/services/gmailService.js';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes("require('./visionService')")) {
  content = content.replace(
    "const { calculatePrice } = require('./tariffService');",
    "const { calculatePrice } = require('./tariffService');\nconst { parseImageWithGemini } = require('./visionService');"
  );
}

const targetStr = "const parsedServices = parseVoucherText(textBody, htmlBody);";
const replacementStr = `let parsedServices = parseVoucherText(textBody, htmlBody);

          // Si no se encontraron servicios en el texto/html, buscar en imágenes adjuntas
          if (parsedServices.length === 0 && parsedEmail.attachments && parsedEmail.attachments.length > 0) {
            for (const att of parsedEmail.attachments) {
              if (att.contentType.startsWith('image/')) {
                console.log(\`[Gmail Service] Imagen detectada en adjuntos (\${att.filename}). Procesando con Vision...\`);
                const visionServices = await parseImageWithGemini(att.content, att.contentType);
                if (visionServices && visionServices.length > 0) {
                  parsedServices = visionServices;
                  break; // Procesamos la primera imagen que contenga tabla
                }
              }
            }
          }`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync(path, content, 'utf8');
console.log("Updated gmailService.js");
