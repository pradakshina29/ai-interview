const admin = require('firebase-admin');

function getDb() {
  if (!admin.apps.length) {
    throw new Error('Firebase Admin is not initialized');
  }
  return admin.firestore();
}

module.exports = { getDb };
