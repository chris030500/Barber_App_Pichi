import React from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { getRedirectPath } from '../../utils/navigation';
import { palette, shadows, typography } from '../../styles/theme';

const badgeShadow = shadows.soft;
const tileShadow = shadows.elevated;
const accentColor = palette.accent;

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const features = [
    {
      icon: 'calendar-clear',
      title: 'Agenda inteligente',
      text: 'Bloques, recordatorios y disponibilidad clara.',
    },
    {
      icon: 'flash',
      title: 'IA en el flujo',
      text: 'Ideas de estilos y respuestas rápidas para clientes.',
    },
    {
      icon: 'shield-checkmark',
      title: 'Seguridad total',
      text: 'Autenticación con correo, teléfono o Google.',
    },
  ];

  if (!isLoading && user) {
    return <Redirect href={getRedirectPath(user)} />;
  }

  return (
    <ImageBackground
      source={require('../../assets/images/splash-image.png')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
      blurRadius={30}
    >
      <StatusBar style="light" />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <View style={styles.logoBadge}>
              <Ionicons name="cut" size={26} color="#0B1220" />
            </View>
            <View>
              <Text style={styles.brand}>BarberShop</Text>
              <Text style={styles.tagline}>Experiencias premium para barberías modernas</Text>
            </View>
          </View>
          <Text style={styles.title}>Gestiona, agenda y sorprende</Text>
          <Text style={styles.subtitle}>Cobra sin fricción, ofrece IA y mantén tu agenda impecable.</Text>
        </View>

        <View style={styles.tiles}>
          {features.map(feature => (
            <View key={feature.title} style={styles.tile}>
              <View style={styles.tileIcon}> 
                <Ionicons name={feature.icon as any} size={18} color="#0B1220" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tileTitle}>{feature.title}</Text>
                <Text style={styles.tileText}>{feature.text}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Button
            title="Iniciar sesión"
            onPress={() => router.push('/login')}
            size="large"
            style={styles.primary}
            textStyle={styles.primaryText}
          />
          <Button
            title="Crear cuenta"
            onPress={() => router.push('/(auth)/register')}
            variant="outline"
            size="medium"
            style={styles.secondary}
            textStyle={styles.secondaryText}
          />
          <Text style={styles.helper}>Configura Firebase y el backend para habilitar todos los accesos.</Text>
        </View>
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
    resizeMode: 'cover',
    opacity: 0.2,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 36,
    justifyContent: 'space-between',
    gap: 24,
  },
  header: {
    gap: 16,
    marginTop: 10,
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
    backgroundColor: accentColor,
    alignItems: 'center',
    justifyContent: 'center',
    ...badgeShadow,
  },
  brand: {
    ...typography.heading,
    fontSize: 22,
  },
  tagline: {
    ...typography.body,
    fontSize: 14,
  },
  title: {
    color: palette.textPrimary,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
  },
  subtitle: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 520,
  },
  tiles: {
    gap: 14,
  },
  tile: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    ...tileShadow,
  },
  tileIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: palette.accentSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: {
    color: palette.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  tileText: {
    color: palette.textSecondary,
    fontSize: 14,
  },
  actions: {
    gap: 12,
  },
  primary: {
    width: '100%',
    backgroundColor: accentColor,
  },
  primaryText: {
    color: palette.textPrimary,
    letterSpacing: 0.2,
  },
  secondary: {
    borderColor: palette.border,
  },
  secondaryText: {
    color: palette.textPrimary,
  },
  helper: {
    color: palette.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});
