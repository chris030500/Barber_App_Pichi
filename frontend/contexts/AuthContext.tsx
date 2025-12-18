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

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

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
  const [isLoading, setIsLoading] = useState(true);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    console.log('🔵 AuthContext: Setting up onAuthStateChanged listener...');

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!isActive) return;

      console.log('🔵 onAuthStateChanged triggered!', { fbUser: fbUser ? 'User exists' : 'No user' });
      setFirebaseUser(fbUser);

      if (!fbUser) {
        console.log('🔵 No user signed in, clearing user state');
        setUser(null);
        setIsLoading(false);
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
              phone: fbUser.phoneNumber || undefined,
            });
            console.log('✅ New user created:', newUserResponse.data);
            resolvedUser = newUserResponse.data;
          }
        } catch (error) {
          console.error('❌ Error fetching user data:', error);
        }
      } else {
        console.warn('⚠️ BACKEND_URL is not configured. Using Firebase profile only.');
      }

      if (!isActive) return;
      setUser(resolvedUser);
      setIsLoading(false);
      console.log('✅ onAuthStateChanged completed, isLoading set to false');
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
      console.error('❌ Registration error:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
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
      
      // User state will be updated by onAuthStateChanged
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
      
      // Format phone number if needed
      let formattedPhone = phoneNumber;
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+52' + formattedPhone; // Default to Mexico
      }
      
      if (Platform.OS === 'web') {
        // Create invisible reCAPTCHA
        const recaptchaContainer = document.getElementById('recaptcha-container');
        if (!recaptchaContainer) {
          const div = document.createElement('div');
          div.id = 'recaptcha-container';
          document.body.appendChild(div);
        }
        
        const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {
            console.log('✅ reCAPTCHA solved');
          },
        });
        
        const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
        console.log('✅ SMS sent successfully');
        
        setConfirmationResult(result);
        return result.verificationId;
      } else {
        throw new Error('La autenticación por teléfono en móvil requiere configuración adicional');
      }
    } catch (error: any) {
      console.error('❌ Phone login error:', error);
      throw new Error(getErrorMessage(error.code));
    }
  };

  const verifyPhoneCode = async (verificationId: string, code: string) => {
    try {
      console.log('🔵 Verifying phone code...');
      
      if (confirmationResult) {
        await confirmationResult.confirm(code);
        console.log('✅ Phone verification successful');
      } else {
        const credential = PhoneAuthProvider.credential(verificationId, code);
        await signInWithCredential(auth, credential);
      }
      
      // User state will be updated by onAuthStateChanged
    } catch (error: any) {
      console.error('❌ Verification error:', error);
      throw new Error(getErrorMessage(error.code));
    }
  };

  const logout = async () => {
    try {
      console.log('🔴 Logout: Starting logout process...');
      await firebaseSignOut(auth);
      console.log('🔴 Logout: Firebase signOut completed');
      setUser(null);
      setFirebaseUser(null);
      // Clear AsyncStorage
      await AsyncStorage.removeItem('user');
      console.log('🔴 Logout: User state cleared');
    } catch (error) {
      console.error('🔴 Logout: Error logging out:', error);
      // Even if there's an error, clear local state
      setUser(null);
      setFirebaseUser(null);
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
      case 'auth/invalid-credential':
        return 'Credencial inválida. Verifica tu correo/contraseña o la configuración de Firebase.';
      case 'auth/too-many-requests':
        return 'Demasiados intentos. Intenta más tarde';
      default:
        return '/(auth)/welcome';
    }
  }, [isLoading, user]);

  if (!redirectPath) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.text}>Cargando...</Text>
      </View>
    );
  }

  return <Redirect href={redirectPath} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  text: {
    marginTop: 12,
    ...typography.subheading,
    color: palette.textSecondary,
  },
});
