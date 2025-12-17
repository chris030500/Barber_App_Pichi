import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Image, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Card from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    console.log('🔴 LOGOUT: Button pressed!');
    
    // Set loading state
    setLoggingOut(true);
    
    // Execute logout asynchronously
    logout()
      .then(() => {
        console.log('✅ LOGOUT: Firebase signOut successful');
      })
      .catch((error) => {
        console.error('❌ LOGOUT: Error during logout:', error);
      })
      .finally(() => {
        console.log('🔴 LOGOUT: Redirecting to login...');
        // Force navigation after logout attempt
        router.replace('/(auth)/login');
      });
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

        <TouchableOpacity
          style={[styles.logoutButton, loggingOut && styles.logoutButtonDisabled]}
          onPress={handleLogout}
          disabled={loggingOut}
          activeOpacity={0.7}
        >
          {loggingOut ? (
            <ActivityIndicator color="#DC2626" size="small" />
          ) : (
            <Text style={styles.logoutButtonText}>🚪 Cerrar Sesión</Text>
          )}
        </TouchableOpacity>
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
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#DC2626',
  },
});
