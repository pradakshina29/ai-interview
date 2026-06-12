const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'services', 'gemini.service.js');
let content = fs.readFileSync(filePath, 'utf8');

const oldFunc = /async function generateJSON\([\s\S]*?\}\s*\n\s*\}/;

const newFunc = `async function generateJSON(prompt) {
  try {
    const jsonModel = ai.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });
    
    const result = await jsonModel.generateContent(prompt);
    let text = result.response.text().trim();
    
    const match = text.match(/\`\`\`(?:json)?\\s*([\\s\\S]*?)\\s*\`\`\`/);
    if (match) {
      text = match[1].trim();
    }
    
    return JSON.parse(text);
  } catch (error) {
    console.error('Error generating or parsing JSON from Gemini:', error);
    throw error;
  }
}`;

content = content.replace(/async function generateJSON\([\s\S]*?\} catch \(error\) \{[\s\S]*?throw error;\s*\r?\n\s*\}/m, newFunc);

fs.writeFileSync(filePath, content);
console.log('Fixed gemini.service.js');
