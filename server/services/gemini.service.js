const { GoogleGenerativeAI } = require('@google/generative-ai');

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });

/**
 * Helper to call Gemini and parse strict JSON response
 */
async function generateJSON(prompt) {
  try {
    const jsonModel = ai.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });
    
    const result = await jsonModel.generateContent(prompt);
    let text = result.response.text().trim();
    
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      text = match[1].trim();
    }
    
    return JSON.parse(text);
  } catch (error) {
    console.error('Error generating or parsing JSON from Gemini:', error);
    throw error;
  }
}

/**
 * Prompt 2 — Answer Evaluator & Scorer
 * Evaluates the candidate's spoken answer transcript against the original question and role context.
 */
async function evaluateAnswer(question, transcript, role) {
  const prompt = `You are a senior hiring manager evaluating an interview answer.

Question asked: ${question}
Candidate's answer: ${transcript}
Role context: ${role}

Evaluate strictly and honestly. Also analyze their communication style (clarity, confidence, structure) based on their transcript. Respond ONLY with this JSON:
{
  "score": 7,
  "verdict": "Good — covered core concepts, weak on edge cases",
  "strengths": ["clear explanation", "used example"],
  "improvements": ["missed time complexity", "no error handling"],
  "communicationStyle": "Clear and structured, but hesitant on technical details.",
  "confidenceScore": 8,
  "modelAnswer": "A strong answer would cover...",
  "followUp": "Can you explain how you would handle..."
}`;

  return await generateJSON(prompt);
}

module.exports = {
  generateJSON,
  evaluateAnswer
};
