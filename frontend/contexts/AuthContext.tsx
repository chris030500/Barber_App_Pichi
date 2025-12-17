import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithCredential,
  PhoneAuthProvider,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  User as FirebaseUser,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { Platform } from 'react-native';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  role: 'client' | 'barber' | 'admin';
  phone?: string;
  barbershop_id?: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: string) => Promise<void>;
  loginWithPhone: (phoneNumber: string) => Promise<void>;
  verifyPhoneCode: (verificationId: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('🔵 AuthContext: Setting up onAuthStateChanged listener...');
    
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      console.log('🔵 onAuthStateChanged triggered!', { fbUser: fbUser ? 'User exists' : 'No user' });
      setFirebaseUser(fbUser);
      
      if (fbUser) {
        console.log('🔵 User signed in, fetching from backend...', { email: fbUser.email });
        // User is signed in, fetch user data from backend
        try {
          console.log('🔵 Fetching user from backend:', `${BACKEND_URL}/api/users?email=${fbUser.email}`);
          const response = await axios.get(`${BACKEND_URL}/api/users?email=${fbUser.email}`);
          console.log('✅ Backend response:', response.data);
          
          if (response.data && response.data.length > 0) {
            console.log('✅ User found in backend:', response.data[0]);
            setUser(response.data[0]);
          } else {
            console.log('⚠️ User not found in backend, creating new user...');
            // Create user in backend if doesn't exist
            const newUserResponse = await axios.post(`${BACKEND_URL}/api/users`, {
              email: fbUser.email,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuario',
              role: 'client',
              phone: fbUser.phoneNumber || undefined,
            });
            console.log('✅ New user created:', newUserResponse.data);
            setUser(newUserResponse.data);
          }
        } catch (error) {
          console.error('❌ Error fetching user data:', error);
        }
      } else {
        console.log('🔵 No user signed in, clearing user state');
        setUser(null);
      }
      
      setIsLoading(false);
      console.log('✅ onAuthStateChanged completed, isLoading set to false');
    });

    return () => {
      console.log('🔵 Cleaning up onAuthStateChanged listener');
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log('🔵 Login: Starting login process...', { email });
      
      console.log('🔵 Login: Calling Firebase signInWithEmailAndPassword...');
      await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Login: Firebase authentication successful!');
      console.log('🔵 Login: onAuthStateChanged will handle the rest and set loading to false');
      // User state will be updated by onAuthStateChanged
      // DON'T set isLoading to false here - let onAuthStateChanged do it
    } catch (error: any) {
      console.error('❌ Login error:', error);
      console.error('❌ Login error code:', error.code);
      setIsLoading(false); // Only set to false on error
      throw new Error(getErrorMessage(error.code));
    }
  };

  const register = async (email: string, password: string, name: string, role: string) => {
    try {
      console.log('🔵 Starting registration...', { email, name, role, BACKEND_URL });
      setIsLoading(true);
      
      console.log('🔵 Creating Firebase user...');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('✅ Firebase user created:', userCredential.user.uid);
      
      // Update profile with name
      console.log('🔵 Updating profile with name...');
      await updateProfile(userCredential.user, {
        displayName: name,
      });
      console.log('✅ Profile updated');

      // Create user in backend
      console.log('🔵 Creating user in backend...', `${BACKEND_URL}/api/users`);
      const response = await axios.post(`${BACKEND_URL}/api/users`, {
        email: email,
        name: name,
        role: role,
      });
      console.log('✅ Backend user created:', response.data);
      
      setUser(response.data);
      console.log('✅ Registration completed successfully!');
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
      throw new Error(getErrorMessage(error.code));
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithPhone = async (phoneNumber: string) => {
    try {
      if (Platform.OS === 'web') {
        // For web, use reCAPTCHA
        const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        });
        const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
        // Store verification ID for later verification
        await AsyncStorage.setItem('verificationId', confirmationResult.verificationId);
      } else {
        // For native, phone auth requires additional setup
        // This is a placeholder - full implementation would need React Native Firebase
        throw new Error('Phone authentication on mobile requires additional setup');
      }
    } catch (error: any) {
      console.error('Phone login error:', error);
      throw new Error(getErrorMessage(error.code));
    }
  };

  const verifyPhoneCode = async (verificationId: string, code: string) => {
    try {
      const credential = PhoneAuthProvider.credential(verificationId, code);
      await signInWithCredential(auth, credential);
    } catch (error: any) {
      console.error('Verification error:', error);
      throw new Error(getErrorMessage(error.code));
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setFirebaseUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'Correo electrónico inválido';
      case 'auth/user-disabled':
        return 'Usuario deshabilitado';
      case 'auth/user-not-found':
        return 'Usuario no encontrado';
      case 'auth/wrong-password':
        return 'Contraseña incorrecta';
      case 'auth/email-already-in-use':
        return 'El correo ya está en uso';
      case 'auth/weak-password':
        return 'La contraseña es muy débil';
      case 'auth/invalid-phone-number':
        return 'Número de teléfono inválido';
      case 'auth/invalid-verification-code':
        return 'Código de verificación inválido';
      case 'auth/too-many-requests':
        return 'Demasiados intentos. Intenta más tarde';
      default:
        return 'Error de autenticación. Intenta nuevamente';
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      firebaseUser,
      isLoading,
      isAuthenticated: !!user && !!firebaseUser,
      login,
      register,
      loginWithPhone,
      verifyPhoneCode,
      logout,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
