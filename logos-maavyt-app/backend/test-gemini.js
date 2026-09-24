require('dotenv').config();
const fs = require('fs');
const { parseImageWithGemini } = require('./src/services/visionService');

async function testGeminiVision() {
  console.log("Iniciando prueba con Gemini API...");
  const imagePath = 'C:/Users/Starkl/.gemini/antigravity/brain/f9f940d7-c2e5-42ac-a538-68a2fbd73b65/.user_uploaded/media_1790282931947.png';
  
  if (!fs.existsSync(imagePath)) {
    console.error("No se encontró la imagen en:", imagePath);
    return;
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const mimeType = 'image/png';

  console.log("Enviando imagen a Gemini...");
  const result = await parseImageWithGemini(imageBuffer, mimeType);
  
  console.log("=== RESULTADO EXTRAIDO ===");
  console.log(JSON.stringify(result, null, 2));
}

testGeminiVision();
