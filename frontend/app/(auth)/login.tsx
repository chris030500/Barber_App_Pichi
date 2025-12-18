import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
  ImageBackground,
  TouchableOpacity,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { getRedirectPath } from '../../utils/navigation';

export default function LoginScreen() {
  const router = useRouter();
  const { login, loginWithGoogle, user, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const disableActions = useMemo(
    () => loading || googleLoading || authLoading,
    [authLoading, googleLoading, loading]
  );

  if (!authLoading && user) {
    return <Redirect href={getRedirectPath(user)} />;
  }

  const handleGoogleLogin = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Información', 'Google Sign-In funciona mejor en la versión web');
      return;
    }

    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      await new Promise(resolve => setTimeout(resolve, 1000));
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
      await login(email.trim(), password);
      await new Promise(resolve => setTimeout(resolve, 750));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al iniciar sesión');
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/images/splash-image.png')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
      blurRadius={25}
    >
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <View style={styles.logoBadge}>
                <Ionicons name="cut" size={26} color="#0B1220" />
              </View>
              <View>
                <Text style={styles.brand}>BarberShop</Text>
                <Text style={styles.tagline}>Acceso seguro y elegante</Text>
              </View>
            </View>
            <Text style={styles.hero}>Tu nueva sesión comienza aquí</Text>
            <Text style={styles.heroSub}>
              Agenda, cobra y cuida a tus clientes desde un entorno pensado para profesionales.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.pill}>
                <Ionicons name="lock-closed" size={16} color="#0B1220" />
                <Text style={styles.pillText}>Sesión protegida</Text>
              </View>
              <Text style={styles.cardTitle}>Iniciar sesión</Text>
              <Text style={styles.cardSubtitle}>Accede con tu correo o elige un método express.</Text>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionPrimary, disableActions && styles.actionDisabled]}
                onPress={handleGoogleLogin}
                disabled={disableActions}
                activeOpacity={0.85}
              >
                {googleLoading ? (
                  <Ionicons name="sync" size={18} color="#0B1220" />
                ) : (
                  <Ionicons name="logo-google" size={18} color="#0B1220" />
                )}
                <Text style={[styles.actionText, styles.actionTextPrimary]}>Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.actionGhost, disableActions && styles.actionDisabled]}
                onPress={handlePhoneLogin}
                disabled={disableActions}
                activeOpacity={0.85}
              >
                <Ionicons name="call" size={18} color="#E2E8F0" />
                <Text style={styles.actionText}>Teléfono</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formDivider}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>o usa tu correo</Text>
              <View style={styles.line} />
            </View>

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="tu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            variant="dark"
            containerStyle={styles.input}
          />

            <View style={styles.passwordRow}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Contraseña"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  variant="dark"
                  containerStyle={styles.input}
                />
              </View>
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                disabled={disableActions}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#E2E8F0"
                />
              </TouchableOpacity>
            </View>

            <Button
              title="Acceder"
              onPress={handleEmailLogin}
              size="large"
              loading={loading || authLoading}
              disabled={disableActions}
              style={styles.primaryButton}
              textStyle={styles.primaryButtonText}
            />

            <View style={styles.footer}>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')} disabled={disableActions}>
                <Text style={styles.link}>Crear cuenta</Text>
              </TouchableOpacity>
              <View style={styles.dot} />
              <TouchableOpacity onPress={handleBack} disabled={disableActions}>
                <Text style={styles.link}>Volver</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  backgroundImage: {
    resizeMode: 'cover',
    opacity: 0.2,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    gap: 14,
    marginBottom: 24,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
  brand: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '700',
  },
  tagline: {
    color: '#CBD5E1',
    fontSize: 14,
  },
  hero: {
    color: '#E2E8F0',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  heroSub: {
    color: '#94A3B8',
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderRadius: 24,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 10,
  },
  cardHeader: {
    gap: 10,
  },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#FACC15',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pillText: {
    color: '#0B1220',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  actionPrimary: {
    backgroundColor: '#FACC15',
  },
  actionGhost: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  actionText: {
    color: '#E2E8F0',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  actionTextPrimary: {
    color: '#0B1220',
  },
  actionDisabled: {
    opacity: 0.6,
  },
  formDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: -4,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.4)',
  },
  dividerText: {
    color: '#CBD5E1',
    fontSize: 13,
  },
  input: {
    marginBottom: 8,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  eyeButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginTop: 22,
  },
  primaryButton: {
    marginTop: 4,
    backgroundColor: '#2563EB',
  },
  primaryButtonText: {
    color: '#F8FAFC',
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  link: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 5,
    backgroundColor: '#64748B',
  },
});
