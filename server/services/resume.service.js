// Direct import avoids Vercel serverless issues with pdf-parse debug/test file loading
const pdfParse = require('pdf-parse/lib/pdf-parse.js');
const { generateJSON } = require('./gemini.service');

/**
 * Parses a PDF buffer to extract raw text
 */
async function parsePDF(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to read PDF file.');
  }
}

/**
 * Prompt 4 — Resume Skill Extractor
 * Converts raw PDF text into typed structured JSON.
 */
async function extractResumeData(rawText) {
  const prompt = `Extract structured data from this resume text.

Resume text: ${rawText}

Return ONLY valid JSON:
{
  "name": "...",
  "currentRole": "...",
  "yearsExperience": 3,
  "skills": {
    "languages": [], "frameworks": [], "databases": [], "tools": []
  },
  "recentCompanies": [],
  "education": { "degree": "...", "field": "..." },
  "targetRoles": []
}`;

  return await generateJSON(prompt);
}

module.exports = {
  parsePDF,
  extractResumeData
};
