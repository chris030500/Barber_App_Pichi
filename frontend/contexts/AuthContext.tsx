import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
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
import { BACKEND_URL, isUsingFallbackBackend } from '../utils/backendUrl';

let warnedMissingBackend = isUsingFallbackBackend;

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
  // Keep a distinct state name to avoid accidental redeclarations when consuming the context elsewhere
  const [authLoading, setAuthLoading] = useState(true);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    let isActive = true;
    setAuthLoading(true);
    console.log('🔵 AuthContext: Setting up onAuthStateChanged listener...');

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!isActive) return;

      console.log('🔵 onAuthStateChanged triggered!', { fbUser: fbUser ? 'User exists' : 'No user' });
      setFirebaseUser(fbUser);

      if (!fbUser) {
        console.log('🔵 No user signed in, clearing user state');
        setUser(null);
        setAuthLoading(false);
        return;
      }

      const fallbackUser: User = {
        user_id: fbUser.uid,
        email: fbUser.email || '',
        name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuario',
        role: 'client',
        phone: fbUser.phoneNumber || undefined,
        created_at: fbUser.metadata?.creationTime || new Date().toISOString(),
        picture: fbUser.photoURL || undefined,
      };

      let resolvedUser: User = fallbackUser;

      if (BACKEND_URL) {
        try {
          console.log('🔵 Fetching user from backend:', `${BACKEND_URL}/api/users?email=${fbUser.email}`);
          const response = await axios.get(`${BACKEND_URL}/api/users?email=${fbUser.email}`);
          console.log('✅ Backend response:', response.data);

          if (response.data && response.data.length > 0) {
            console.log('✅ User found in backend:', response.data[0]);
            resolvedUser = response.data[0];
          } else {
            console.log('⚠️ User not found in backend, creating new user...');
            const newUserResponse = await axios.post(`${BACKEND_URL}/api/users`, {
              email: fbUser.email,
              name: fallbackUser.name,
              role: 'client',
              phone: fallbackUser.phone,
              picture: fallbackUser.picture,
            });
            console.log('✅ New user created:', newUserResponse.data);
            resolvedUser = newUserResponse.data;
          }
        } catch (error) {
          console.error('❌ Error fetching user data from backend:', error);
          // Nos quedamos con fallbackUser para no trabar la app
        }
      } else if (!warnedMissingBackend) {
        warnedMissingBackend = true;
        console.warn('⚠️ BACKEND_URL is not configured. Using Firebase profile only.');
      }

      if (!isActive) return;
      setUser(resolvedUser);
      setAuthLoading(false);
      console.log('✅ onAuthStateChanged completed, authLoading set to false');
    });

    return () => {
      console.log('🔵 Cleaning up onAuthStateChanged listener');
      isActive = false;
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
      // DON'T set authLoading to false here - let onAuthStateChanged do it
    } catch (error: any) {
      console.error('❌ Login error:', error);
      console.error('❌ Login error code:', error.code);
      setAuthLoading(false); // Only set to false on error
      throw new Error(getErrorMessage(error.code));
    }
  };

  const register = async (email: string, password: string, name: string, role: string) => {
    try {
      console.log('🔵 Starting registration...', { email, name, role, BACKEND_URL });
      setAuthLoading(true);

      console.log('🔵 Creating Firebase user...');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('✅ Firebase user created:', userCredential.user.uid);

      await updateProfile(userCredential.user, {
        displayName: name,
      });
      console.log('✅ Profile updated');

      if (!BACKEND_URL) {
        console.warn('⚠️ BACKEND_URL is not configured. Registration will not persist to the backend.');
        setUser({
          user_id: userCredential.user.uid,
          email,
          name,
          role: role as User['role'],
          created_at: userCredential.user.metadata?.creationTime || new Date().toISOString(),
        });
        return;
      }

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
      throw new Error(getErrorMessage(error?.code));
    } finally {
      setAuthLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      console.log('🔵 Starting Google Sign-In...');
      setAuthLoading(true);
      
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');

      await signInWithPopup(auth, provider);
      // onAuthStateChanged hará el resto
    } catch (error: any) {
      console.error('❌ Google Sign-In error:', error);
      setAuthLoading(false);
      
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
    try {
      setAuthLoading(true);
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('❌ Logout error:', error);
    } finally {
      setUser(null);
      setFirebaseUser(null);
      await AsyncStorage.removeItem('user');
      setAuthLoading(false);
    }
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
        return 'Credencial inválida. Verifica tu correo/contraseña o la configuración de Firebase.';
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
    <AuthContext.Provider value={{
      user,
      firebaseUser,
      isLoading: authLoading,
      isAuthenticated: !!user && !!firebaseUser,
      login,
      register,
      loginWithGoogle,
      loginWithPhone,
      verifyPhoneCode,
      logout,
      updateUser,
      confirmationResult
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
