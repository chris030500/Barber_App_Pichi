import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Card from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import { palette, typography, shadows } from '../../styles/theme';

export default function AdminProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      await logout();
    } catch (error) {
      console.error('❌ Error al cerrar sesión:', error);
      Alert.alert('Error', 'No se pudo cerrar sesión. Intenta de nuevo.');
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.location.href = '/login';
    } else {
      router.replace('/login');
    }
  };

  const menuItems = [
    { icon: 'business-outline', title: 'Datos de la Barbería', subtitle: 'Editar nombre, dirección, horarios' },
    { icon: 'notifications-outline', title: 'Notificaciones', subtitle: 'Configurar alertas y recordatorios' },
    { icon: 'card-outline', title: 'Pagos', subtitle: 'Métodos de pago y facturación' },
    { icon: 'bar-chart-outline', title: 'Reportes', subtitle: 'Estadísticas detalladas' },
    { icon: 'help-circle-outline', title: 'Ayuda', subtitle: 'Soporte y preguntas frecuentes' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={40} color="#FFFFFF" />
            </View>
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={16} color="#7C3AED" />
            </View>
          </View>
          <Text style={styles.name}>{user?.name || 'Administrador'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.roleText}>Administrador</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>1</Text>
            <Text style={styles.statLabel}>Barbería</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>3</Text>
            <Text style={styles.statLabel}>Barberos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>4</Text>
            <Text style={styles.statLabel}>Servicios</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Configuración</Text>
          {menuItems.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.menuItem}
              onPress={() => Alert.alert('Próximamente', 'Esta función estará disponible pronto')}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon as any} size={22} color="#2563EB" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </TouchableOpacity>
          ))}
        </View>

        {/* App Info */}
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Versión de la app</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Última actualización</Text>
            <Text style={styles.infoValue}>Diciembre 2025</Text>
          </View>
        </Card>

        {/* Logout Button */}
        <Button
          title={isLoggingOut ? 'Cerrando sesión...' : '🚪 Cerrar Sesión'}
          onPress={handleLogout}
          disabled={isLoggingOut}
          loading={isLoggingOut}
          variant="danger"
          style={styles.logoutButton}
          textStyle={styles.logoutText}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>BarberPro © 2025</Text>
        </View>
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
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: palette.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    gap: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: palette.surfaceAlt,
  },
  name: {
    ...typography.heading,
    fontSize: 22,
  },
  email: {
    ...typography.body,
    marginTop: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.backgroundAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
  },
  roleText: {
    ...typography.label,
    color: palette.accent,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: palette.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    ...typography.heading,
    fontSize: 22,
  },
  statLabel: {
    ...typography.body,
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: palette.border,
  },
  menuSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    ...typography.label,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: palette.border,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: palette.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: 12,
  },
  menuTitle: {
    ...typography.heading,
    fontSize: 16,
  },
  menuSubtitle: {
    ...typography.body,
    marginTop: 2,
  },
  infoCard: {
    marginHorizontal: 16,
    marginTop: 16,
    ...shadows.soft,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    ...typography.body,
  },
  infoValue: {
    ...typography.label,
    color: palette.textPrimary,
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  logoutText: {
    color: palette.textPrimary,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    ...typography.label,
  },
});
