const admin = require('firebase-admin');

/**
 * Middleware to verify Firebase ID token from Authorization header.
 * Attaches decoded user info to req.user.
 */
async function verifyToken(req, res, next) {
  if (!admin.apps.length) {
    return res.status(503).json({
      error: 'Server configuration error',
      details: 'Firebase Admin is not initialized. Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY on Vercel.',
    });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}

module.exports = { verifyToken };
