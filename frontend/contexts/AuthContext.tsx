import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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
import { Platform } from 'react-native';
import { auth } from '../config/firebase';

const BACKEND_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export interface User {
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
  const [authLoading, setAuthLoading] = useState(true);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    let isActive = true;
    setAuthLoading(true);

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!isActive) return;

      setFirebaseUser(fbUser);

      // ✅ No hay sesión
      if (!fbUser) {
        setUser(null);
        setAuthLoading(false);
        return;
      }

      // ✅ Sesión existe: armamos fallback desde Firebase
      const email = fbUser.email || '';
      const fallbackUser: User = {
        user_id: fbUser.uid,
        email,
        name: fbUser.displayName || email.split('@')[0] || 'Usuario',
        role: 'client',
        phone: fbUser.phoneNumber || undefined,
        created_at: fbUser.metadata?.creationTime || new Date().toISOString(),
        picture: fbUser.photoURL || undefined,
      };

      let resolvedUser: User = fallbackUser;

      // ✅ Intentar resolver contra backend
      if (BACKEND_URL && email) {
        try {
          const response = await axios.get(`${BACKEND_URL}/api/users?email=${encodeURIComponent(email)}`);

          if (Array.isArray(response.data) && response.data.length > 0) {
            resolvedUser = response.data[0];
          } else {
            const newUserResponse = await axios.post(`${BACKEND_URL}/api/users`, {
              email,
              name: fallbackUser.name,
              role: 'client',
              phone: fallbackUser.phone,
              picture: fallbackUser.picture,
            });

            resolvedUser = newUserResponse.data;
          }
        } catch (error) {
          console.error('❌ Error fetching user data from backend:', error);
          // Nos quedamos con fallbackUser para no trabar la app
        }
      } else {
        if (!BACKEND_URL) console.warn('⚠️ BACKEND_URL no configurado. Usando solo Firebase.');
        if (!email) console.warn('⚠️ Firebase user sin email. No se puede consultar backend.');
      }

      if (!isActive) return;
      setUser(resolvedUser);
      setAuthLoading(false);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // onAuthStateChanged actualiza todo
    } catch (error: any) {
      setAuthLoading(false);
      throw new Error(getErrorMessage(error?.code));
    }
  };

  const register = async (email: string, password: string, name: string, role: string) => {
    try {
      setAuthLoading(true);

      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(userCredential.user, { displayName: name });

      // si tienes backend, crea usuario ahí también
      if (BACKEND_URL) {
        const response = await axios.post(`${BACKEND_URL}/api/users`, {
          email: email.trim(),
          name,
          role,
        });
        setUser(response.data);
      } else {
        setUser({
          user_id: userCredential.user.uid,
          email: email.trim(),
          name,
          role: role as User['role'],
          created_at: userCredential.user.metadata?.creationTime || new Date().toISOString(),
        });
      }
    } catch (error: any) {
      throw new Error(getErrorMessage(error?.code));
    } finally {
      setAuthLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      setAuthLoading(true);

      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');

      await signInWithPopup(auth, provider);
      // onAuthStateChanged hará el resto
    } catch (error: any) {
      setAuthLoading(false);
      throw new Error(getErrorMessage(error?.code));
    }
  };

  const loginWithPhone = async (phoneNumber: string): Promise<string> => {
    try {
      let formattedPhone = phoneNumber.trim();
      if (!formattedPhone.startsWith('+')) formattedPhone = '+52' + formattedPhone;

      if (Platform.OS !== 'web') {
        throw new Error('La autenticación por teléfono en móvil requiere configuración adicional');
      }

      // container para recaptcha
      const existing = document.getElementById('recaptcha-container');
      if (!existing) {
        const div = document.createElement('div');
        div.id = 'recaptcha-container';
        document.body.appendChild(div);
      }

      const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });

      const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
      setConfirmationResult(result);

      return result.verificationId || 'verification-sent';
    } catch (error: any) {
      throw new Error(getErrorMessage(error?.code) || error?.message);
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
      throw new Error(getErrorMessage(error?.code));
    }
  };

  const logout = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setFirebaseUser(null);
    await AsyncStorage.removeItem('user');
  };

  const updateUser = (userData: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...userData } : prev));
  };

  const getErrorMessage = (errorCode?: string): string => {
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
      case 'auth/invalid-credential':
        return 'Credencial inválida. Verifica tu correo/contraseña.';
      case 'auth/too-many-requests':
        return 'Demasiados intentos. Intenta más tarde';
      case 'auth/popup-closed-by-user':
        return 'Inicio de sesión cancelado';
      case 'auth/popup-blocked':
        return 'El navegador bloqueó la ventana emergente. Permite popups e intenta de nuevo.';
      default:
        return 'Error de autenticación. Intenta nuevamente';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isLoading: authLoading,
        isAuthenticated: !!firebaseUser, // ✅ recomendado (no dependas del backend para considerar sesión)
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
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
