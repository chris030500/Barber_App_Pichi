import { initializeApp, getApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyAAMKrOFFvC5AxrT5LpvdQGfAHzKFIPWlA",
  authDomain: "barbershop-app-83c6c.firebaseapp.com",
  projectId: "barbershop-app-83c6c",
  storageBucket: "barbershop-app-83c6c.firebasestorage.app",
  messagingSenderId: "291595952010",
  appId: "1:291595952010:web:39577489982bed3994b273"
};

// Initialize Firebase
let app;
let auth;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  
  // Initialize Auth with persistence for React Native
  if (Platform.OS !== 'web') {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } else {
    auth = getAuth(app);
  }
} else {
  app = getApp();
  auth = getAuth(app);
}

export { app, auth };
