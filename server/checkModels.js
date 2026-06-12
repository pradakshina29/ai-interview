require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function checkModels() {
  const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  try {
    const fetch = globalThis.fetch;
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await res.json();
    console.log("Available models:");
    data.models.forEach(m => console.log(m.name));
  } catch (err) {
    console.error("Error listing models:", err);
  }
}

checkModels();
