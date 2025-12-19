import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Image, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Card from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { palette, typography } from '../../styles/theme';
import Button from '../../components/ui/Button';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);

    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.location.href = '/login';
    } else {
      router.replace('/login');
    }
  };

  const renderMenuItem = (icon: any, label: string, action: () => void) => (
    <Card style={styles.menuItem} onPress={action}>
      <View style={styles.menuIconWrapper}>
        <Ionicons name={icon} size={22} color={palette.accentSecondary} />
      </View>
      <Text style={styles.menuText}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={palette.textSecondary} />
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mi perfil</Text>
        <Text style={styles.subtitle}>Gestiona tu cuenta y preferencias</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {user?.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={48} color={palette.textSecondary} />
              </View>
            )}
          </View>
          <Text style={styles.name}>{user?.name || 'Usuario'}</Text>
          <Text style={styles.email}>{user?.email || 'email@ejemplo.com'}</Text>
          {user?.phone && <Text style={styles.phone}>{user.phone}</Text>}

          <View style={styles.badges}>
            <View style={styles.badge}>
              <Ionicons name="shield-checkmark" size={14} color={palette.accentSecondary} />
              <Text style={styles.badgeText}>{user?.role || 'Cliente'}</Text>
            </View>
            <View style={styles.badgeMuted}>
              <Ionicons name="sparkles" size={14} color={palette.textSecondary} />
              <Text style={styles.badgeMutedText}>Membresía activa</Text>
            </View>
          </View>
        </Card>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mi cuenta</Text>
          {renderMenuItem('person-outline', 'Editar perfil', () =>
            Alert.alert('Próximamente', 'Editar perfil')
          )}
          {renderMenuItem('time-outline', 'Historial de cortes', () =>
            Alert.alert('Próximamente', 'Historial de cortes')
          )}
          {renderMenuItem('heart-outline', 'Barberos favoritos', () =>
            Alert.alert('Próximamente', 'Favoritos')
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferencias</Text>
          {renderMenuItem('notifications-outline', 'Notificaciones', () =>
            Alert.alert('Próximamente', 'Notificaciones')
          )}
          {renderMenuItem('shield-checkmark-outline', 'Privacidad', () =>
            Alert.alert('Próximamente', 'Privacidad')
          )}
          {renderMenuItem('help-circle-outline', 'Ayuda y soporte', () =>
            Alert.alert('Próximamente', 'Ayuda y soporte')
          )}
        </View>

        <Button
          title={loggingOut ? 'Cerrando sesión...' : '🚪 Cerrar Sesión'}
          onPress={handleLogout}
          disabled={loggingOut}
          style={styles.logoutButton}
          textStyle={styles.logoutText}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    ...typography.heading,
    fontSize: 24,
  },
  subtitle: {
    ...typography.body,
    marginTop: 6,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
    gap: 18,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 26,
    gap: 8,
  },
  avatarContainer: {
    marginBottom: 8,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: palette.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  name: {
    ...typography.heading,
    fontSize: 22,
  },
  email: {
    ...typography.body,
  },
  phone: {
    ...typography.body,
    color: palette.textPrimary,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
  },
  badgeText: {
    ...typography.label,
    color: palette.textPrimary,
  },
  badgeMuted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
  },
  badgeMutedText: {
    ...typography.label,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    ...typography.heading,
    fontSize: 16,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  menuIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#0C1527',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  menuText: {
    flex: 1,
    ...typography.subheading,
    color: palette.textPrimary,
    marginLeft: 12,
  },
  logoutButton: {
    marginTop: 8,
  },
  logoutText: {
    color: palette.textPrimary,
  },
});
