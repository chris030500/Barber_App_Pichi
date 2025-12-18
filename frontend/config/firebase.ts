import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';

const envConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

const fallbackConfig = {
  apiKey: 'AIzaSyAAMKrOFFvC5AxrT5LpvdQGfAHzKFIPWlA',
  authDomain: 'barbershop-app-83c6c.firebaseapp.com',
  projectId: 'barbershop-app-83c6c',
  storageBucket: 'barbershop-app-83c6c.firebasestorage.app',
  messagingSenderId: '291595952010',
  appId: '1:291595952010:web:39577489982bed3994b273'
};

const firebaseConfig = {
  apiKey: envConfig.apiKey || fallbackConfig.apiKey,
  authDomain: envConfig.authDomain || fallbackConfig.authDomain,
  projectId: envConfig.projectId || fallbackConfig.projectId,
  storageBucket: envConfig.storageBucket || fallbackConfig.storageBucket,
  messagingSenderId: envConfig.messagingSenderId || fallbackConfig.messagingSenderId,
  appId: envConfig.appId || fallbackConfig.appId
};

const missingEnvKeys = Object.entries(envConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key.replace('EXPO_PUBLIC_', ''));

if (missingEnvKeys.length > 0) {
  console.warn(
    `⚠️ Firebase config is using fallback values. Define these env vars to use your own project: ${missingEnvKeys.join(', ')}`
  );
}

// Initialize Firebase
let app;
let auth;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  
  // Set persistence for web
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error('Error setting persistence:', error);
  });
} else {
  app = getApp();
  auth = getAuth(app);
}

export { app, auth };
