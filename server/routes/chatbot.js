const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });

router.post('/', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    // Map sender history format to Gemini roles ('user' and 'model')
    const formattedHistory = history.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    })).filter(h => h.role === 'user' || h.role === 'model');

    // Build chat session with custom system prompt context
    const chatSession = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: `You are "AI Career Coach", a brilliant and helpful virtual assistant for the InterviewAI platform.
Your purpose is to help users practice interviews, build confidence, answer job search questions, and navigate the website.
Keep your answers brief (under 3 sentences), encouraging, professional, and full of modern emojis! 
If the user asks technical questions, explain clearly. If they ask about the site, explain that they can upload a PDF resume, select a job track (technical or business), choose difficulty levels, practice in front of a camera with real-time face detection, and receive deep AI analytics.` }]
        },
        {
          role: 'model',
          parts: [{ text: `Hello! 🤖 I am your AI Career Coach. I'm here to help you practice interviews, answer job search questions, and master your career path! How can I help you succeed today? 🚀` }]
        },
        ...formattedHistory
      ]
    });

    const result = await chatSession.sendMessage(message);
    const text = result.response.text();

    res.json({ reply: text });
  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({ reply: "Oh no! 🤖 I'm having trouble connecting to my brain right now. Please try again in a moment! ⚡" });
  }
});

module.exports = router;
