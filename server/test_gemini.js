require('dotenv').config();
const { generateJSON } = require('./services/gemini.service');
const { getTechnicalQuestionPrompt, getBehaviouralQuestionPrompt } = require('./config/gemini.config');

async function test() {
  console.log("Testing fallback generation...");
  const fallbackPrompt = `You are an expert technical interviewer. Generate 3 interview questions for a Medium level Software Engineer position.
Rules: Mix technical and behavioral. Return ONLY a valid JSON array.
Format: [{"id": 1, "question": "...", "type": "technical", "topic": "...", "expectedPoints": ["..."]}]`;
  
  try {
    const res = await generateJSON(fallbackPrompt);
    console.log("Fallback result:", typeof res, res);
  } catch (err) {
    console.error("Fallback error:", err);
  }

  console.log("\nTesting resume-based technical generation...");
  const resume = { skills: { languages: ['JavaScript', 'Python'] } };
  const techPrompt = getTechnicalQuestionPrompt(resume, 'Software Engineer', 'Medium');
  try {
    const res2 = await generateJSON(techPrompt);
    console.log("Tech result:", typeof res2, res2);
  } catch (err) {
    console.error("Tech error:", err);
  }

  console.log("\nTesting resume-based behavioural generation...");
  const behPrompt = getBehaviouralQuestionPrompt('Worked 3 years at tech company', 'Tech Company');
  try {
    const res3 = await generateJSON(behPrompt);
    console.log("Beh result:", typeof res3, res3);
  } catch (err) {
    console.error("Beh error:", err);
  }
}

test();
