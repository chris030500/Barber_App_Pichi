import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
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
  signInWithPopup,
  PhoneAuthProvider,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  User as FirebaseUser,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { Platform } from 'react-native';

const BACKEND_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

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
  loginWithGoogle: () => Promise<void>;
  loginWithPhone: (phoneNumber: string) => Promise<string>;
  verifyPhoneCode: (verificationId: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  confirmationResult: ConfirmationResult | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  // ✅ Guards para evitar loops / doble ejecución (StrictMode web)
  const lastUidRef = useRef<string | null>(null);
  const runIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    console.log('🔵 AuthContext: Setting up onAuthStateChanged listener...');

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      const myRun = ++runIdRef.current;

      (async () => {
        if (cancelled) return;

        const uid = fbUser?.uid ?? null;

        // ✅ Si el mismo uid vuelve a dispararse y ya no está cargando, ignóralo
        if (uid === lastUidRef.current && isLoading === false) return;
        lastUidRef.current = uid;

        setIsLoading(true);

        // ✅ Evita setState redundante (reduce renders)
        setFirebaseUser((prev) => (prev?.uid === fbUser?.uid ? prev : fbUser));

        if (!fbUser) {
          setUser((prev) => (prev === null ? prev : null));
          setIsLoading(false);
          return;
        }

        try {
          const email = fbUser.email;
          if (!email) {
            setUser(null);
            setIsLoading(false);
            return;
          }

          // Si llegó otra ejecución, cancela esta
          if (cancelled || myRun !== runIdRef.current) return;

          console.log('🔵 Fetching user from backend:', `${BACKEND_URL}/api/users?email=${email}`);
          const response = await axios.get(
            `${BACKEND_URL}/api/users?email=${encodeURIComponent(email)}`
          );

          if (cancelled || myRun !== runIdRef.current) return;

          if (Array.isArray(response.data) && response.data.length > 0) {
            const backendUser = response.data[0] as User;
            setUser((prev) => (prev?.user_id === backendUser.user_id ? prev : backendUser));
          } else {
            const newUserResponse = await axios.post(`${BACKEND_URL}/api/users`, {
              email,
              name: fbUser.displayName || email.split('@')[0] || 'Usuario',
              role: 'client',
              phone: fbUser.phoneNumber || undefined,
            });

            if (cancelled || myRun !== runIdRef.current) return;

            const created = newUserResponse.data as User;
            setUser((prev) => (prev?.user_id === created.user_id ? prev : created));
          }
        } catch (error) {
          console.error('❌ Error fetching user data:', error);
          // ✅ Importantísimo: termina carga para no ciclar
          setUser(null);
        } finally {
          if (!cancelled && myRun === runIdRef.current) {
            setIsLoading(false);
          }
        }
      })();
    });

    return () => {
      cancelled = true;
      console.log('🔵 Cleaning up onAuthStateChanged listener');
      unsubscribe();
    };
  }, []); // ✅ vacío

  const login = async (email: string, password: string) => {
    try {
      console.log('🔵 Login: Starting login process...', { email });
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error('❌ Login error:', error);
      setIsLoading(false);
      throw new Error(getErrorMessage(error.code));
    }
  };

  const register = async (email: string, password: string, name: string, role: string) => {
    try {
      console.log('🔵 Starting registration...', { email, name, role, BACKEND_URL });
      setIsLoading(true);

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      await updateProfile(userCredential.user, { displayName: name });

      const response = await axios.post(`${BACKEND_URL}/api/users`, {
        email,
        name,
        role,
      });

      setUser(response.data);
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      throw new Error(getErrorMessage(error.code));
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      console.log('🔵 Starting Google Sign-In...');
      setIsLoading(true);

      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');

      const result = await signInWithPopup(auth, provider);
      console.log('✅ Google Sign-In successful:', result.user.email);
    } catch (error: any) {
      console.error('❌ Google Sign-In error:', error);
      setIsLoading(false);

      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Inicio de sesión cancelado');
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error('El navegador bloqueó la ventana emergente. Permite popups e intenta de nuevo.');
      }
      throw new Error(getErrorMessage(error.code));
    }
  };

  const loginWithPhone = async (phoneNumber: string): Promise<string> => {
    try {
      console.log('🔵 Starting Phone Sign-In for:', phoneNumber);

      let formattedPhone = phoneNumber;
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+52' + formattedPhone;
      }

      if (Platform.OS === 'web') {
        const existingContainer = document.getElementById('recaptcha-container');
        if (existingContainer) existingContainer.remove();

        const recaptchaContainer = document.createElement('div');
        recaptchaContainer.id = 'recaptcha-container';
        document.body.appendChild(recaptchaContainer);

        await new Promise((resolve) => setTimeout(resolve, 100));

        const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'normal',
          callback: (response: any) => console.log('✅ reCAPTCHA solved:', response),
          'expired-callback': () => console.log('⚠️ reCAPTCHA expired'),
        });

        const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);

        try {
          recaptchaVerifier.clear();
          const container = document.getElementById('recaptcha-container');
          if (container) container.remove();
        } catch {}

        setConfirmationResult(result);
        return result.verificationId || 'verification-sent';
      }

      throw new Error('La autenticación por teléfono en móvil requiere configuración adicional');
    } catch (error: any) {
      console.error('❌ Phone login error:', error);

      try {
        const container = document.getElementById('recaptcha-container');
        if (container) container.remove();
      } catch {}

      throw new Error(getErrorMessage(error.code) || error.message);
    }
  };

  const verifyPhoneCode = async (verificationId: string, code: string) => {
    try {
      if (confirmationResult) {
        await confirmationResult.confirm(code);
      } else {
        const credential = PhoneAuthProvider.credential(verificationId, code);
        await signInWithCredential(auth, credential);
      }
    } catch (error: any) {
      throw new Error(getErrorMessage(error.code));
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setFirebaseUser(null);
      await AsyncStorage.removeItem('user');
    } catch (error) {
      setUser(null);
      setFirebaseUser(null);
      throw error;
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) setUser({ ...user, ...userData });
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
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isLoading,
        isAuthenticated: !!user && !!firebaseUser,
        login,
        register,
        loginWithGoogle,
        loginWithPhone,
        verifyPhoneCode,
        logout,
        updateUser,
        confirmationResult,
      }}
    >
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
