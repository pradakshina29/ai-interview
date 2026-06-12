/**
 * Prompt 1 — Question Generator (Technical)
 */
function getTechnicalQuestionPrompt(resumeJSON, role, difficulty, numQuestions) {
  return `You are an expert technical interviewer.

Given the candidate's resume data: ${JSON.stringify(resumeJSON)}
Target role: ${role}
Difficulty: ${difficulty}

Generate ${numQuestions} distinct technical interview questions. Rules:
- Focus on skills explicitly listed in the resume (mix different languages/frameworks they know)
- Match seniority to years of experience
- For DSA: specify time/space complexity expectation
- For system design: scope to role level
- Make each question unique.

Respond with ONLY a JSON array of objects:
[{"question":"...","topic":"...","expectedDuration":"5-8 min","hint":"..."}]`;
}

/**
 * Prompt 3 — HR / Behavioural Mode
 */
function getBehaviouralQuestionPrompt(resumeSummary, companyType, numQuestions) {
  return `You are a senior HR interviewer.

Candidate resume summary: ${JSON.stringify(resumeSummary)}
Company type: ${companyType}

Generate ${numQuestions} distinct STAR-method behavioural questions tailored to their background.
Avoid generic questions. Reference their actual experience. Make them unique.

Respond with ONLY a JSON array of objects:
[{"question":"...","framework":"STAR","whatWeTest":"..."}]`;
}

module.exports = {
  getTechnicalQuestionPrompt,
  getBehaviouralQuestionPrompt
};
