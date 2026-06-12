import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sign up with email
  async function signup(email, password, displayName) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName });
    return result;
  }

  // Login with email
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Login with Google — popup with redirect fallback
  async function loginWithGoogle() {
    try {
      return await signInWithPopup(auth, googleProvider);
    } catch (err) {
      // If popup is blocked by browser, fall back to redirect
      if (
        err.code === 'auth/popup-blocked' ||
        err.code === 'auth/popup-closed-by-user'
      ) {
        return signInWithRedirect(auth, googleProvider);
      }
      throw err;
    }
  }

  // Logout
  function logout() {
    return signOut(auth);
  }

  // Forgot Password / Password Reset
  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  // Send Email Verification
  function verifyEmail() {
    if (auth.currentUser) {
      return sendEmailVerification(auth.currentUser);
    }
  }

  // Get Firebase ID token for API calls
  async function getToken() {
    if (currentUser) {
      return await currentUser.getIdToken();
    }
    return null;
  }

  useEffect(() => {
    // Handle redirect result (Google sign-in redirect fallback)
    getRedirectResult(auth).catch((err) => {
      // Silently ignore — no redirect was in progress
      if (err.code !== 'auth/no-auth-event') {
        console.error('Redirect result error:', err.message);
      }
    });

    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      setLoading(false);

      // Developer Helper: Print token easily
      if (user) {
        window.printMyToken = () => user.getIdToken().then(t => console.log("Bearer " + t));
      }
    });
    return unsubscribe;
  }, []);

  const value = { currentUser, signup, login, loginWithGoogle, logout, getToken, resetPassword, verifyEmail };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
