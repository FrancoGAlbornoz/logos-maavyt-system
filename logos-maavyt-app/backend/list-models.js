require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
    const models = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=\${process.env.GEMINI_API_KEY}`);
    const data = await models.json();
    console.log(data.models.map(m => m.name).join('\\n'));
  } catch (e) {
    console.error(e);
  }
}

listModels();
