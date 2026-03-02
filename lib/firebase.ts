
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Check if configuration is missing
const isConfigured = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "" && !!firebaseConfig.projectId;

if (!isConfigured) {
  console.warn("Firebase configuration is missing or invalid. Please set the environment variables.");
}

// Initialize Firebase only if configured, otherwise use null/dummy to prevent hard crash
let app: any = null;
let auth: any = null;
let db: any = null;
let storage: any = null;

if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (error) {
    console.error("Failed to initialize Firebase services:", error);
  }
}

// Export as constants but they might be null if not configured
// The App.tsx will handle the null state by showing a warning UI
export { auth, db, storage, isConfigured };
