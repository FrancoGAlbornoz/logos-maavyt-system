const Tesseract = require('tesseract.js');
const fs = require('fs');

async function testOCR() {
  const imagePath = 'C:/Users/Starkl/.gemini/antigravity/brain/f9f940d7-c2e5-42ac-a538-68a2fbd73b65/.user_uploaded/media_1790282931947.png';
  console.log('Running OCR...');
  const { data: { text } } = await Tesseract.recognize(
    imagePath,
    'spa' // Spanish
  );
  console.log('OCR Output:');
  console.log(text);
}

testOCR();
