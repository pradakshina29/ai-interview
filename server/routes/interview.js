const express = require('express');
const router = express.Router();
const multer = require('multer');
const admin = require('firebase-admin');
const { verifyToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const { generateJSON, evaluateAnswer } = require('../services/gemini.service');
const { parsePDF, extractResumeData } = require('../services/resume.service');
const { getTechnicalQuestionPrompt, getBehaviouralQuestionPrompt } = require('../config/gemini.config');

const db = admin.firestore();

// Set up multer for PDF upload (store in memory)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDFs are allowed'));
  }
});

// ─── POST /api/interview/upload-resume ───────────────────────────────────────
router.post('/upload-resume', verifyToken, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No resume file provided.' });
    
    const rawText = await parsePDF(req.file.buffer);
    const resumeJSON = await extractResumeData(rawText);
    
    res.json({ resumeJSON, rawText });
  } catch (error) {
    console.error('Error uploading resume:', error);
    res.status(500).json({ error: 'Failed to process resume.', details: error.message });
  }
});

// ─── POST /api/interview/start ───────────────────────────────────────────────
router.post('/start', verifyToken, async (req, res) => {
  try {
    const { role, difficulty, numQuestions = 5, mode = 'technical', resumeJSON } = req.body;

    if (!role || !difficulty) {
      return res.status(400).json({ error: 'Role and difficulty are required.' });
    }

    const sessionId = uuidv4();
    const questions = [];

    if (resumeJSON) {
      // Generate all questions in a single API call to prevent rate limits and be super fast
      let promptText = '';
      if (mode === 'behavioural') {
        const summary = resumeJSON.summary || resumeJSON.currentRole || 'Candidate';
        promptText = getBehaviouralQuestionPrompt(summary, 'Tech Company', numQuestions);
      } else {
        promptText = getTechnicalQuestionPrompt(resumeJSON, role, difficulty, numQuestions);
      }

      try {
        const qJsonArray = await generateJSON(promptText);
        
        if (Array.isArray(qJsonArray)) {
          qJsonArray.forEach((qJson, i) => {
            questions.push({
              id: i + 1,
              question: qJson.question || 'Describe your experience with ' + role,
              type: mode,
              topic: qJson.topic || qJson.whatWeTest || 'General',
              expectedPoints: [qJson.hint || qJson.framework || 'Use STAR method'],
              expectedDuration: qJson.expectedDuration || '5 mins'
            });
          });
        } else {
          throw new Error('Generation did not return an array');
        }
      } catch (err) {
        console.error('Error generating questions:', err.message);
        // Fallback to a single generic question if generation fails entirely
        for (let i = 0; i < numQuestions; i++) {
          questions.push({
            id: i + 1,
            question: `Can you explain a challenging project you worked on as a ${role}?`,
            type: mode,
            topic: 'Experience',
            expectedPoints: ['Situation', 'Task', 'Action', 'Result'],
            expectedDuration: '5 mins'
          });
        }
      }
      try {
        const fallbackQs = await generateJSON(fallbackPrompt);
        if (Array.isArray(fallbackQs)) {
          questions.push(...fallbackQs);
        } else {
          throw new Error('Fallback generation did not return an array');
        }
      } catch (err) {
        console.error('Fallback generation failed, using static fallback questions:', err.message);
        for (let i = 0; i < numQuestions; i++) {
          const type = i % 2 === 0 ? 'technical' : 'behavioral';
          questions.push({
            id: i + 1,
            question: type === 'technical' 
              ? `Can you describe the architecture of a project you've worked on, and how you ensured scalability as a ${role}?`
              : `Tell me about a time when you had a conflict with a team member or stakeholder. How did you resolve it?`,
            type: type,
            topic: type === 'technical' ? 'System Design' : 'Teamwork',
            expectedPoints: type === 'technical' 
              ? ['Database choices', 'API design', 'Scaling strategies']
              : ['Situation', 'Conflict resolution', 'Action taken', 'Result'],
            expectedDuration: '5 mins'
          });
        }
      }
    }

    // Save session to Firestore
    const sessionData = {
      sessionId,
      userId: req.user.uid,
      userEmail: req.user.email,
      role,
      difficulty,
      mode,
      numQuestions,
      resumeJSON: resumeJSON || null,
      questions,
      answers: [],
      status: 'in_progress',
      score: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('sessions').doc(sessionId).set(sessionData);

    res.json({ sessionId, questions, role, difficulty, mode });
  } catch (error) {
    console.error('Error starting interview:', error);
    res.status(500).json({ 
      error: 'Failed to generate interview questions.', 
      details: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    });
  }
});

// ─── POST /api/interview/evaluate ────────────────────────────────────────────
router.post('/evaluate', verifyToken, async (req, res) => {
  try {
    const { sessionId, questionId, question, answer, role, speakingDuration } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ error: 'Question and answer are required.' });
    }

    if (answer.trim().length < 10) {
      return res.status(400).json({ error: 'Answer is too short. Please provide a detailed response.' });
    }

    // Behavioral Analytics Calculations
    const wordCount = answer.trim().split(/\s+/).length;
    let wpm = 0;
    if (speakingDuration && speakingDuration > 0) {
      wpm = Math.round((wordCount / speakingDuration) * 60);
    }
    
    // Count filler words
    const fillerWordsRegex = /\b(um|uh|like|you know|basically|literally|actually|right|so)\b/gi;
    const fillerMatches = answer.match(fillerWordsRegex);
    const fillerWordCount = fillerMatches ? fillerMatches.length : 0;

    // Use Prompt 2 to evaluate with robust fallback if Gemini is rate limited
    let evaluation;
    try {
      evaluation = await evaluateAnswer(question, answer, role);
    } catch (geminiError) {
      console.warn('Gemini evaluation failed, using fallback heuristic:', geminiError.message);
      const wordCountVal = answer.trim().split(/\s+/).length;
      let scoreVal = 5;
      if (wordCountVal > 100) scoreVal = 8;
      else if (wordCountVal > 50) scoreVal = 7;
      else if (wordCountVal > 20) scoreVal = 6;

      evaluation = {
        score: scoreVal,
        verdict: "Answer submitted successfully. (AI detailed breakdown is temporarily unavailable due to high API traffic.)",
        strengths: ["Clear and coherent answer length", "Vocabulary and sentence completion"],
        improvements: ["Ensure structured explanation", "Verify technical specifications under high load"],
        communicationStyle: "Vocabulary and speech pace analyzed. Words: " + wordCountVal,
        confidenceScore: 7,
        modelAnswer: "A standard answer should clearly state the challenge, action taken, and final outcome.",
        followUp: "Can you elaborate more on the specific challenges you faced?"
      };
    }
    
    // Merge behavioral analytics
    evaluation.wpm = wpm;
    evaluation.fillerWordCount = fillerWordCount;
    evaluation.speakingDuration = speakingDuration || 0;

    // Update session in Firestore
    if (sessionId) {
      const sessionRef = db.collection('sessions').doc(sessionId);
      await sessionRef.update({
        answers: admin.firestore.FieldValue.arrayUnion({
          questionId,
          question,
          answer,
          evaluation,
          answeredAt: new Date().toISOString(),
        }),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    res.json({ evaluation });
  } catch (error) {
    console.error('Error evaluating answer:', error);
    res.status(500).json({ error: 'Failed to evaluate answer.', details: error.message });
  }
});

// ─── POST /api/interview/complete ────────────────────────────────────────────
router.post('/complete', verifyToken, async (req, res) => {
  try {
    const { sessionId, answers } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required.' });
    }

    const sessionRef = db.collection('sessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const session = sessionDoc.data();

    if (session.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Forbidden: Not your session.' });
    }

    const scores = answers.map(a => a.evaluation?.score || 0);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const interviewScore = Math.round(avgScore * 10) / 10;

    let resumeScore = null;
    let resumeRemarks = null;

    if (session.resumeJSON) {
      const resumePrompt = `Evaluate how well this candidate's resume fits a ${session.role} position (${session.difficulty} level). 
Resume details: ${JSON.stringify(session.resumeJSON).substring(0, 1500)}
Return ONLY a JSON object: { "score": number (1-10, just the number), "remarks": "brief evaluation of resume fit" }`;
      try {
        const rEval = await generateJSON(resumePrompt);
        resumeScore = typeof rEval.score === 'number' ? rEval.score : parseFloat(rEval.score);
        resumeRemarks = rEval.remarks;
      } catch (e) {
        console.error("Resume eval failed", e);
      }
    }

    // Weightage calculation: 80% Interview, 20% Resume (if resume exists)
    let overallScore = interviewScore;
    if (resumeScore) {
      overallScore = Math.round((interviewScore * 0.8 + resumeScore * 0.2) * 10) / 10;
    }

    let overallGrade = 'Poor';
    if (overallScore >= 8) overallGrade = 'Excellent';
    else if (overallScore >= 6) overallGrade = 'Good';
    else if (overallScore >= 4) overallGrade = 'Average';

    // Generate overall summary with Gemini
    const summaryPrompt = `Based on this interview performance summary for a ${session.role} (${session.difficulty} level):
- Interview Score: ${interviewScore}/10
${resumeScore ? `- Resume Fit Score: ${resumeScore}/10\n- Resume Remarks: ${resumeRemarks}\n` : ''}
- Overall Score: ${overallScore}/10
- Grade: ${overallGrade}
- Questions Answered: ${answers.length}

Write a brief 3-sentence motivational summary with top 2 areas to improve. Be encouraging and specific.
Return ONLY a JSON object:
{
  "summary": "3 sentence summary here",
  "topSkills": ["skill 1", "skill 2"],
  "areasToImprove": ["area 1", "area 2"],
  "recommendation": "One actionable next step"
}`;

    const report = await generateJSON(summaryPrompt).catch((geminiError) => {
      console.warn('Gemini overall report failed, using fallback:', geminiError.message);
      return {
        summary: "Congratulations on completing your practice interview! You've shown great dedication.",
        topSkills: ["Interview Preparation", "Submitting Answers", "Verbal Communication"],
        areasToImprove: ["AI Detailed Analytics was unavailable due to high API traffic. Please try again later."],
        recommendation: "Take another session with different roles to test your breadth of knowledge."
      };
    });
    
    if (resumeScore) {
      report.resumeWeightage = {
        score: resumeScore,
        remarks: resumeRemarks,
        interviewScore: interviewScore
      };
    }

    await sessionRef.update({
      status: 'completed',
      score: overallScore,
      grade: overallGrade,
      report,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ overallScore, overallGrade, report });
  } catch (error) {
    console.error('Error completing interview:', error);
    res.status(500).json({ error: 'Failed to complete interview.', details: error.message });
  }
});

// ─── GET /api/interview/roles ─────────────────────────────────────────────────
router.get('/roles', (req, res) => {
  const ROLE_TOPICS = {
    // Tech Roles
    'Software Engineer': [], 'Full Stack Developer': [], 'Frontend Developer': [], 'Backend Developer': [],
    'Software Tester / QA': [], 'Data Scientist': [], 'Machine Learning Engineer': [], 'DevOps Engineer': [], 
    'Cloud Architect': [], 'Product Manager': [], 'Business Analyst': [], 'UI/UX Designer': [], 'Cybersecurity Analyst': [],
    'AI Prompt Engineer': [], 'Blockchain Developer': [], 'Site Reliability Engineer': [], 'Game Developer': [],

    // Non-Tech Roles
    'Human Resources Specialist': [], 'Marketing Manager': [], 'Sales Representative': [], 'Financial Analyst': [],
    'Content Writer': [], 'Customer Success Manager': [], 'Operations Manager': [], 'Project Manager': [],
    'Office Administrator': [], 'Recruiter': [], 'Public Relations Specialist': []
  };
  res.json({ roles: Object.keys(ROLE_TOPICS) });
});

module.exports = router;
