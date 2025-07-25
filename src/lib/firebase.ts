import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// These are public keys and safe to expose in frontend code
const firebaseConfig = {
  apiKey: "AIzaSyDyHsgQxPKh7tyjnklGs9Mdl6whknVt4Qc",
  authDomain: "financebonus-c858e.firebaseapp.com",
  projectId: "financebonus-c858e",
  storageBucket: "financebonus-c858e.firebasestorage.app",
  messagingSenderId: "957913841390",
  appId: "1:957913841390:web:5747005fb5f641b04e3dff",
  measurementId: "G-80ME6ZBM87"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;