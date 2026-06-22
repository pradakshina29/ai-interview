const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getDb } = require('../db');

// ─── GET /api/sessions ────────────────────────────────────────────────────────
// Returns all sessions for the logged-in user
router.get('/', verifyToken, async (req, res) => {
  try {
    const snapshot = await getDb()
      .collection('sessions')
      .where('userId', '==', req.user.uid)
      .get();

    const sessions = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      sessions.push({
        sessionId: data.sessionId,
        role: data.role,
        difficulty: data.difficulty,
        status: data.status,
        score: data.score,
        grade: data.grade,
        numQuestions: data.numQuestions,
        answeredCount: data.answers ? data.answers.length : 0,
        createdAt: data.createdAt,
        completedAt: data.completedAt || null,
      });
    });

    // Sort in memory to avoid Firestore Composite Index requirements
    sessions.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });

    // Return the latest 20
    const limitedSessions = sessions.slice(0, 20);

    res.json({ sessions: limitedSessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions.', details: error.message });
  }
});

// ─── GET /api/sessions/:id ────────────────────────────────────────────────────
// Returns full details of a single session
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const sessionDoc = await getDb().collection('sessions').doc(req.params.id).get();

    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const session = sessionDoc.data();

    if (session.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Forbidden: Not your session.' });
    }

    res.json({ session });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session.', details: error.message });
  }
});

// ─── DELETE /api/sessions/:id ─────────────────────────────────────────────────
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const sessionRef = getDb().collection('sessions').doc(req.params.id);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    if (sessionDoc.data().userId !== req.user.uid) {
      return res.status(403).json({ error: 'Forbidden: Not your session.' });
    }

    await sessionRef.delete();
    res.json({ message: 'Session deleted successfully.' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session.' });
  }
});

// ─── GET /api/sessions/stats/summary ─────────────────────────────────────────
// Returns stats for the dashboard
router.get('/stats/summary', verifyToken, async (req, res) => {
  try {
    const snapshot = await getDb()
      .collection('sessions')
      .where('userId', '==', req.user.uid)
      .get();

    let total = 0, completed = 0, totalScore = 0;
    const roleCount = {};

    snapshot.forEach(doc => {
      const data = doc.data();
      total++;
      if (data.status === 'completed') {
        completed++;
        totalScore += data.score || 0;
      }
      roleCount[data.role] = (roleCount[data.role] || 0) + 1;
    });

    const avgScore = completed > 0 ? Math.round((totalScore / completed) * 10) / 10 : 0;
    const topRole = Object.entries(roleCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    res.json({ total, completed, avgScore, topRole });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

module.exports = router;
