require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const admin = require('firebase-admin');

// ─── Firebase Admin Initialization ───────────────────────────────────────────
function initFirebaseAdmin() {
  if (admin.apps.length) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.error(
      'Missing Firebase credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in Vercel environment variables.'
    );
    return;
  }

  privateKey = privateKey.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n').replace(/\r/g, '');

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } catch (error) {
    console.error('Firebase Admin initialization failed:', error.message);
  }
}

initFirebaseAdmin();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Increased to 1000 to prevent locking out active users
    message: { error: 'Too many requests, please try again later.' },
  });
  app.use('/api/', apiLimiter);
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/interview', require('./routes/interview'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/chatbot', require('./routes/chatbot'));

const path = require('path');

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const firebaseReady = admin.apps.length > 0;
  const geminiReady = Boolean(process.env.GEMINI_API_KEY);

  res.json({
    status: firebaseReady && geminiReady ? 'OK' : 'DEGRADED',
    message: 'AI Interview Server is running!',
    firebase: firebaseReady,
    gemini: geminiReady,
    timestamp: new Date().toISOString(),
  });
});

// ─── Serve React Frontend in Production ──────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React app build directory
  app.use(express.static(path.join(__dirname, '../client/build')));

  // For any route not matching /api/, serve the React index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
// Only listen when running locally — Vercel uses the exported app as a serverless function
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n🚀  Server running on http://localhost:${PORT}`);
    console.log(`🤖  AI Interview Practice System ready!\n`);
  });
}

module.exports = app;
