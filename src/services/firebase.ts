import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const isFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID
);

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Connect to Firebase Emulators in development
if (import.meta.env.DEV) {
  // Detect if running on phone (non-localhost origin)
  // Replace LAN_IP with your Mac's actual LAN IP (run `ifconfig | grep "inet " | grep -v 127.0.0.1`)
  const isPhone = typeof window !== 'undefined' && 
    window.location.hostname !== 'localhost' && 
    window.location.hostname !== '127.0.0.1';
  
  const LAN_IP = '192.168.0.4'; // TODO: Replace with your Mac's LAN IP
  const firestoreHost = isPhone ? LAN_IP : 'localhost';
  const authHost = isPhone ? `http://${LAN_IP}:9099` : 'http://localhost:9099';
  
  // Firestore emulator runs on port 4001
  connectFirestoreEmulator(db, firestoreHost, 4001);
  
  // Auth emulator runs on port 9099
  connectAuthEmulator(auth, authHost, { disableWarnings: true });
  
  // Storage emulator runs on port 9199
  connectStorageEmulator(storage, firestoreHost, 9199);
  
  if (isPhone) {
    console.log(`📱 Phone detected - connecting to emulators at ${LAN_IP}`);
  }
}
