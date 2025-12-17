import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Información', 'Google Sign-In funciona mejor en la versión web');
      return;
    }
    
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      await new Promise(resolve => setTimeout(resolve, 1000));
      router.replace('/');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al iniciar sesión con Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handlePhoneLogin = () => {
    router.push('/(auth)/phone-login');
  };

  const handleEmailLogin = async () => {
    console.log('🔵 Login Screen: handleEmailLogin called');
    
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      console.log('🔵 Login Screen: Calling login function...');
      await login(email.trim(), password);
      
      // Wait a bit for AuthContext to update
      console.log('🔵 Login Screen: Login successful, waiting for user state...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Force navigation to index which will handle routing
      console.log('🔵 Login Screen: Forcing navigation to index');
      router.replace('/');
    } catch (error: any) {
      console.error('❌ Login Screen: Error during login', error);
      Alert.alert('Error', error.message || 'Error al iniciar sesión');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Ionicons name="cut" size={60} color="#2563EB" />
          <Text style={styles.title}>Bienvenido</Text>
          <Text style={styles.subtitle}>Inicia sesión para continuar</Text>
        </View>

        <View style={styles.form}>
          <Button
            title="🔵 Continuar con Google"
            onPress={handleGoogleLogin}
            variant="outline"
            size="large"
            loading={googleLoading}
            disabled={googleLoading}
            style={styles.socialButton}
          />

          <Button
            title="Continuar con Teléfono"
            onPress={handlePhoneLogin}
            variant="outline"
            size="large"
            style={styles.socialButton}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="tu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Input
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
          />

          <Button
            title="Iniciar Sesión"
            onPress={handleEmailLogin}
            size="large"
            loading={loading}
            disabled={loading}
            style={styles.button}
          />

          <Button
            title="¿No tienes cuenta? Regístrate"
            onPress={() => router.push('/(auth)/register')}
            variant="outline"
            size="medium"
            style={styles.registerButton}
          />
        </View>

        <Button
          title="Volver"
          onPress={() => router.back()}
          variant="outline"
          size="medium"
          style={styles.backButton}
        />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 8,
  },
  form: {
    flex: 1,
    gap: 16,
  },
  socialButton: {
    marginBottom: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#64748B',
    fontSize: 14,
  },
  button: {
    marginTop: 8,
  },
  registerButton: {
    marginTop: 8,
  },
  backButton: {
    marginTop: 24,
  },
});
