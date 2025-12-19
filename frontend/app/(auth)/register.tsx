import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Alert, ImageBackground, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Redirect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { getRedirectPath } from '../../utils/navigation';
import { palette, shadows, typography } from '../../styles/theme';

const roleShadow = shadows.accent;
const accentColor = palette.accent;

export default function RegisterScreen() {
  const router = useRouter();
  const { register, user, isLoading: authLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'client' | 'barber' | 'admin'>('client');
  const [loading, setLoading] = useState(false);

  const disableActions = useMemo(() => loading || authLoading, [authLoading, loading]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  if (!authLoading && user) {
    return <Redirect href={getRedirectPath(user)} />;
  }

  const handleRegister = async () => {
    console.log('🔵 handleRegister called with:', { name, email, password: '***', confirmPassword: '***', role });

    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Email inválido');
      return;
    }

    setLoading(true);
    try {
      await register(email.trim(), password, name.trim(), role);
    } catch (error: any) {
      console.error('❌ Registration failed:', error);
      Alert.alert('Error', error.message || 'Error al crear la cuenta');
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/images/splash-image.png')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
      blurRadius={26}
    >
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <View style={styles.logoBadge}>
                <Ionicons name="cut" size={24} color="#0B1220" />
              </View>
              <View>
                <Text style={styles.brand}>BarberShop</Text>
                <Text style={styles.tagline}>Crea tu cuenta en segundos</Text>
              </View>
            </View>
            <Text style={styles.hero}>Elegancia desde el primer acceso</Text>
            <Text style={styles.heroSub}>
              Diseñado para clientes, barberos y administradores con una experiencia sofisticada.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.pill}>
                <Ionicons name="shield-checkmark" size={16} color="#0B1220" />
                <Text style={styles.pillText}>Registro seguro</Text>
              </View>
              <Text style={styles.cardTitle}>Crear cuenta</Text>
              <Text style={styles.cardSubtitle}>
                Completa tus datos y elige el rol que mejor se adapta a ti.
              </Text>
            </View>

            <Input
              label="Nombre completo"
              value={name}
              onChangeText={setName}
              placeholder="Juan Pérez"
              autoCapitalize="words"
              variant="dark"
            />

            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="tu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              variant="dark"
            />

            <Input
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              placeholder="Mínimo 6 caracteres"
              secureTextEntry
              variant="dark"
            />

            <Input
              label="Confirmar contraseña"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repite tu contraseña"
              secureTextEntry
              variant="dark"
            />

            <View style={styles.roleSection}>
              <View style={styles.roleHeader}>
                <Text style={styles.roleLabel}>Selecciona tu rol</Text>
                <Text style={styles.roleHint}>Personaliza la experiencia según tu perfil</Text>
              </View>
              <View style={styles.roleButtons}>
                {[
                  { key: 'client', label: 'Cliente', icon: 'person', desc: 'Agenda y paga fácil' },
                  { key: 'barber', label: 'Barbero', icon: 'cut', desc: 'Gestiona tu agenda' },
                  { key: 'admin', label: 'Admin', icon: 'settings', desc: 'Control total' },
                ].map(item => {
                  const selected = role === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[styles.roleCard, selected && styles.roleCardSelected]}
                      onPress={() => setRole(item.key as typeof role)}
                      activeOpacity={0.9}
                      disabled={disableActions}
                    >
                      <View style={styles.roleIconBadge}>
                        <Ionicons
                          name={item.icon as any}
                          size={18}
                          color={selected ? '#0B1220' : '#E2E8F0'}
                        />
                      </View>
                      <Text style={[styles.roleText, selected && styles.roleTextSelected]}>{item.label}</Text>
                      <Text style={styles.roleDesc}>{item.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <Button
              title="Crear cuenta"
              onPress={handleRegister}
              size="large"
              loading={loading || authLoading}
              disabled={disableActions}
              style={styles.button}
              textStyle={styles.buttonText}
            />

            <TouchableOpacity style={styles.secondaryAction} onPress={handleBack} disabled={disableActions}>
              <Text style={styles.secondaryText}>¿Ya tienes cuenta?</Text>
              <Text style={styles.secondaryLink}>Inicia sesión</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: palette.background,
  },
  backgroundImage: {
    opacity: 0.25,
    transform: [{ scale: 1.05 }],
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'rgba(5,10,20,0.92)',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    backgroundColor: accentColor,
    padding: 12,
    borderRadius: 12,
    ...roleShadow,
  },
  brand: {
    ...typography.heading,
    fontSize: 18,
  },
  tagline: {
    ...typography.body,
    marginTop: 2,
  },
  hero: {
    marginTop: 16,
    fontSize: 24,
    fontWeight: '800',
    color: palette.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  heroSub: {
    marginTop: 8,
    fontSize: 14,
    color: palette.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 420,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 8,
    ...roleShadow,
  },
  cardHeader: {
    gap: 8,
  },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: palette.accentSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pillText: {
    color: '#0B1220',
    fontWeight: '700',
    fontSize: 12,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: palette.textPrimary,
  },
  cardSubtitle: {
    fontSize: 14,
    color: palette.textSecondary,
    lineHeight: 20,
  },
  roleSection: {
    marginTop: 6,
    gap: 10,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.textPrimary,
  },
  roleHint: {
    fontSize: 12,
    color: palette.textSecondary,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  roleCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceAlt,
    gap: 6,
  },
  roleCardSelected: {
    borderColor: accentColor,
    backgroundColor: 'rgba(139,92,246,0.12)',
    ...roleShadow,
  },
  roleIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleText: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.textPrimary,
  },
  roleTextSelected: {
    color: palette.accentSecondary,
  },
  roleDesc: {
    fontSize: 12,
    color: palette.textSecondary,
  },
  button: {
    marginTop: 10,
    backgroundColor: accentColor,
  },
  buttonText: {
    color: palette.textPrimary,
    letterSpacing: 0.2,
  },
  secondaryAction: {
    marginTop: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryText: {
    color: palette.textSecondary,
    fontSize: 14,
  },
  secondaryLink: {
    color: palette.accent,
    fontWeight: '700',
    fontSize: 14,
  },
});
