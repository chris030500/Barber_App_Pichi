import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { palette, typography, shadows } from '../../styles/theme';
import { BACKEND_URL } from '../../utils/backendUrl';

interface BarberProfile {
  barber_id: string;
  shop_id: string;
  bio: string;
  specialties: string[];
  status: string;
  rating: number;
  total_reviews: number;
}

export default function BarberProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [barberProfile, setBarberProfile] = useState<BarberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [specialtiesText, setSpecialtiesText] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (user) {
      loadBarberProfile();
    }
  }, [user]);

  const loadBarberProfile = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/barbers?user_id=${user?.user_id}`);
      if (response.data && response.data.length > 0) {
        const profile = response.data[0];
        setBarberProfile(profile);
        setBio(profile.bio || '');
        setSpecialtiesText(profile.specialties?.join(', ') || '');
      }
    } catch (error) {
      console.error('Error loading barber profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!barberProfile) return;
    
    try {
      const specialties = specialtiesText.split(',').map(s => s.trim()).filter(s => s);
      await axios.put(`${BACKEND_URL}/api/barbers/${barberProfile.barber_id}`, {
        bio,
        specialties
      });
      
      setBarberProfile({
        ...barberProfile,
        bio,
        specialties
      });
      setEditing(false);
      Alert.alert('Éxito', 'Perfil actualizado correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el perfil');
    }
  };

  const performLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      await logout();
    } catch (error) {
      console.error('❌ Error al cerrar sesión (barber):', error);
      Alert.alert('Error', 'No se pudo cerrar sesión. Intenta de nuevo.');
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.location.href = '/login';
    } else {
      router.replace('/login');
    }

    setIsLoggingOut(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: performLogout,
        }
      ]
    );
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={20}
          color={palette.warning}
        />
      );
    }
    return stars;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={48} color={palette.textPrimary} />
            </View>
            <View style={styles.statusBadge}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: barberProfile?.status === 'available' ? palette.success : palette.warning }
                ]}
              />
            </View>
          </View>
          <Text style={styles.name}>{user?.name || 'Barbero'}</Text>
          <Text style={styles.email}>{user?.email}</Text>

          {barberProfile && (
            <View style={styles.ratingContainer}>
              <View style={styles.stars}>
                {renderStars(barberProfile.rating)}
              </View>
              <Text style={styles.ratingText}>
                {barberProfile.rating.toFixed(1)} ({barberProfile.total_reviews} reseñas)
              </Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          {barberProfile && (
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Ionicons name="star" size={24} color={palette.warning} />
                <Text style={styles.statNumber}>{barberProfile.rating.toFixed(1)}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="chatbubbles" size={24} color={palette.accentSecondary} />
                <Text style={styles.statNumber}>{barberProfile.total_reviews}</Text>
                <Text style={styles.statLabel}>Reseñas</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="cut" size={24} color={palette.success} />
                <Text style={styles.statNumber}>{barberProfile.specialties?.length || 0}</Text>
                <Text style={styles.statLabel}>Especialidades</Text>
              </View>
            </View>
          )}

          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleWrap}>
                <View style={styles.sectionBadge}>
                  <Ionicons name="book-outline" size={14} color={palette.accentSecondary} />
                </View>
                <Text style={styles.sectionTitle}>Biografía</Text>
              </View>
              {!editing && (
                <TouchableOpacity onPress={() => setEditing(true)}>
                  <Ionicons name="pencil" size={20} color={palette.accentSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {editing ? (
              <TextInput
                style={styles.bioInput}
                value={bio}
                onChangeText={setBio}
                placeholder="Escribe una breve descripción sobre ti..."
                placeholderTextColor={palette.textSecondary}
                multiline
                numberOfLines={4}
              />
            ) : (
              <Text style={styles.bioText}>
                {barberProfile?.bio || 'Sin biografía'}
              </Text>
            )}
          </Card>

          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleWrap}>
                <View style={styles.sectionBadgeAlt}>
                  <Ionicons name="sparkles-outline" size={14} color={palette.accent} />
                </View>
                <Text style={styles.sectionTitle}>Especialidades</Text>
              </View>
            </View>

            {editing ? (
              <TextInput
                style={styles.specialtiesInput}
                value={specialtiesText}
                onChangeText={setSpecialtiesText}
                placeholder="Fade, Pompadour, Barba... (separadas por coma)"
                placeholderTextColor={palette.textSecondary}
              />
            ) : (
              <View style={styles.specialtiesTags}>
                {barberProfile?.specialties?.length ? (
                  barberProfile.specialties.map((specialty, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{specialty}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>Sin especialidades</Text>
                )}
              </View>
            )}
          </Card>

          {editing && (
            <View style={styles.editButtons}>
              <Button
                title="Cancelar"
                onPress={() => {
                  setEditing(false);
                  setBio(barberProfile?.bio || '');
                  setSpecialtiesText(barberProfile?.specialties?.join(', ') || '');
                }}
                variant="outline"
                style={styles.editButton}
              />
              <Button
                title="Guardar"
                onPress={saveProfile}
                variant="primary"
                style={styles.editButton}
              />
            </View>
          )}

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} disabled={isLoggingOut}>
            <Ionicons name="log-out-outline" size={22} color={palette.danger} />
            <Text style={styles.logoutText}>
              {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}
            </Text>
          </TouchableOpacity>
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
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: palette.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  name: {
    ...typography.heading,
    fontSize: 24,
  },
  email: {
    ...typography.body,
    marginTop: 4,
  },
  ratingContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  stars: {
    flexDirection: 'row',
    gap: 4,
  },
  ratingText: {
    ...typography.body,
    color: palette.textSecondary,
    marginTop: 4,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: palette.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.soft,
  },
  statNumber: {
    ...typography.heading,
    fontSize: 20,
    color: palette.textPrimary,
    marginTop: 8,
  },
  statLabel: {
    ...typography.label,
    color: palette.textSecondary,
    marginTop: 2,
  },
  section: {
    marginBottom: 16,
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    ...typography.heading,
    fontSize: 16,
  },
  sectionBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: palette.muted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  sectionBadgeAlt: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: palette.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  bioText: {
    ...typography.body,
    color: palette.textPrimary,
    lineHeight: 22,
  },
  bioInput: {
    backgroundColor: palette.surfaceAlt,
    borderRadius: 12,
    padding: 12,
    ...typography.body,
    color: palette.textPrimary,
    borderWidth: 1,
    borderColor: palette.border,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  specialtiesInput: {
    backgroundColor: palette.surfaceAlt,
    borderRadius: 12,
    padding: 12,
    ...typography.body,
    color: palette.textPrimary,
    borderWidth: 1,
    borderColor: palette.border,
  },
  specialtiesTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: palette.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  tagText: {
    ...typography.label,
    color: palette.accentSecondary,
  },
  emptyText: {
    ...typography.body,
    color: palette.textSecondary,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  editButton: {
    flex: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceAlt,
  },
  logoutText: {
    ...typography.subheading,
    color: palette.danger,
  },
});
