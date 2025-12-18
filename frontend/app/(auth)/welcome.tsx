import React from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { getRedirectPath } from '../../utils/navigation';
import { shadows } from '../../styles/theme';

const badgeShadow = shadows.soft;
const tileShadow = shadows.elevated;

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

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
          <View style={styles.tile}>
            <Ionicons name="calendar-clear" size={24} color="#0B1220" />
            <View>
              <Text style={styles.tileTitle}>Agenda inteligente</Text>
              <Text style={styles.tileText}>Bloques, recordatorios y disponibilidad clara.</Text>
            </View>
          </View>
          <View style={styles.tile}>
            <Ionicons name="flash" size={24} color="#0B1220" />
            <View>
              <Text style={styles.tileTitle}>IA en el flujo</Text>
              <Text style={styles.tileText}>Ideas de estilos y respuestas rápidas para clientes.</Text>
            </View>
          </View>
          <View style={styles.tile}>
            <Ionicons name="shield-checkmark" size={24} color="#0B1220" />
            <View>
              <Text style={styles.tileTitle}>Seguridad total</Text>
              <Text style={styles.tileText}>Autenticación con correo, teléfono o Google.</Text>
            </View>
          </View>
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
    backgroundColor: '#0B1220',
  },
  backgroundImage: {
    resizeMode: 'cover',
    opacity: 0.18,
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
    backgroundColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
    ...badgeShadow,
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
  title: {
    color: '#E2E8F0',
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 520,
  },
  tiles: {
    gap: 14,
  },
  tile: {
    backgroundColor: '#FACC15',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    ...tileShadow,
  },
  tileTitle: {
    color: '#0B1220',
    fontSize: 16,
    fontWeight: '800',
  },
  tileText: {
    color: '#111827',
    fontSize: 14,
  },
  actions: {
    gap: 12,
  },
  primary: {
    width: '100%',
    backgroundColor: '#2563EB',
  },
  primaryText: {
    color: '#F8FAFC',
    letterSpacing: 0.2,
  },
  secondary: {
    borderColor: '#F8FAFC',
  },
  secondaryText: {
    color: '#F8FAFC',
  },
  helper: {
    color: '#CBD5E1',
    textAlign: 'center',
    marginTop: 4,
  },
});
