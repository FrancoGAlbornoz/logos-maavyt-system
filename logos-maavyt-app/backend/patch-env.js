const fs = require('fs');

function appendEnv(file) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes('GEMINI_API_KEY')) {
      content += '\n# Google Gemini Vision API (Para extraer tablas de imagenes)\nGEMINI_API_KEY=\n';
      fs.writeFileSync(file, content, 'utf8');
    }
  }
}

appendEnv('.env');
appendEnv('.env.example');
console.log("Updated envs");
