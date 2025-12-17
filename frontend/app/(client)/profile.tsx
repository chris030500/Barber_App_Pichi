import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    // Use confirm on web, Alert on mobile
    const shouldLogout = Platform.OS === 'web' 
      ? window.confirm('¿Estás seguro de que quieres cerrar sesión?')
      : await new Promise((resolve) => {
          Alert.alert(
            'Cerrar sesión',
            '¿Estás seguro de que quieres cerrar sesión?',
            [
              { text: 'Cancelar', onPress: () => resolve(false) },
              { text: 'Cerrar sesión', onPress: () => resolve(true), style: 'destructive' },
            ]
          );
        });
    
    if (!shouldLogout) return;
    
    setLoggingOut(true);
    try {
      console.log('🔴 Cerrando sesión...');
      await logout();
      console.log('✅ Sesión cerrada, forzando recarga...');
      
      // Force full page reload to clear all state
      if (Platform.OS === 'web') {
        // Clear any cached data
        if (typeof window !== 'undefined') {
          window.localStorage.clear();
          window.sessionStorage.clear();
          // Force reload to login page
          window.location.replace('/login');
        }
      } else {
        router.replace('/(auth)/login');
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      setLoggingOut(false);
      // Even on error, try to redirect
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.replace('/login');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mi Perfil</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {user?.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={48} color="#64748B" />
              </View>
            )}
          </View>
          <Text style={styles.name}>{user?.name || 'Usuario'}</Text>
          <Text style={styles.email}>{user?.email || 'email@ejemplo.com'}</Text>
          {user?.phone && <Text style={styles.phone}>{user.phone}</Text>}
        </Card>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mi Cuenta</Text>
          
          <Card style={styles.menuItem} onPress={() => Alert.alert('Próximamente', 'Editar perfil')}>
            <Ionicons name="person-outline" size={24} color="#1E293B" />
            <Text style={styles.menuText}>Editar perfil</Text>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" style={styles.menuArrow} />
          </Card>

          <Card style={styles.menuItem} onPress={() => Alert.alert('Próximamente', 'Historial de cortes')}>
            <Ionicons name="time-outline" size={24} color="#1E293B" />
            <Text style={styles.menuText}>Historial de cortes</Text>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" style={styles.menuArrow} />
          </Card>

          <Card style={styles.menuItem} onPress={() => Alert.alert('Próximamente', 'Favoritos')}>
            <Ionicons name="heart-outline" size={24} color="#1E293B" />
            <Text style={styles.menuText}>Barberos favoritos</Text>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" style={styles.menuArrow} />
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuración</Text>
          
          <Card style={styles.menuItem} onPress={() => Alert.alert('Próximamente', 'Notificaciones')}>
            <Ionicons name="notifications-outline" size={24} color="#1E293B" />
            <Text style={styles.menuText}>Notificaciones</Text>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" style={styles.menuArrow} />
          </Card>

          <Card style={styles.menuItem} onPress={() => Alert.alert('Próximamente', 'Privacidad')}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#1E293B" />
            <Text style={styles.menuText}>Privacidad</Text>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" style={styles.menuArrow} />
          </Card>

          <Card style={styles.menuItem} onPress={() => Alert.alert('Próximamente', 'Ayuda')}>
            <Ionicons name="help-circle-outline" size={24} color="#1E293B" />
            <Text style={styles.menuText}>Ayuda y soporte</Text>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" style={styles.menuArrow} />
          </Card>
        </View>

        <Button
          title={loggingOut ? "Cerrando sesión..." : "🚪 Cerrar Sesión"}
          onPress={handleLogout}
          variant="outline"
          size="large"
          loading={loggingOut}
          disabled={loggingOut}
          style={styles.logoutButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 24,
  },
  avatarContainer: {
    marginBottom: 16,
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
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#64748B',
  },
  phone: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 8,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    marginLeft: 16,
  },
  menuArrow: {
    marginLeft: 'auto',
  },
  logoutButton: {
    marginTop: 16,
  },
});
