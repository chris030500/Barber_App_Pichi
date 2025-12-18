import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { shadows } from '../../styles/theme';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

const badgeShadow = shadows.soft;
const statShadow = shadows.soft;

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
  const [barberProfile, setBarberProfile] = useState<BarberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [specialtiesText, setSpecialtiesText] = useState('');

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

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar Sesión', style: 'destructive', onPress: logout }
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
          color="#F59E0B"
        />
      );
    }
    return stars;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={48} color="#FFFFFF" />
            </View>
            <View style={styles.statusBadge}>
              <View style={[
                styles.statusDot, 
                { backgroundColor: barberProfile?.status === 'available' ? '#10B981' : '#F59E0B' }
              ]} />
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
          {/* Stats Cards */}
          {barberProfile && (
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Ionicons name="star" size={24} color="#F59E0B" />
                <Text style={styles.statNumber}>{barberProfile.rating.toFixed(1)}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="chatbubbles" size={24} color="#2563EB" />
                <Text style={styles.statNumber}>{barberProfile.total_reviews}</Text>
                <Text style={styles.statLabel}>Reseñas</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="cut" size={24} color="#10B981" />
                <Text style={styles.statNumber}>{barberProfile.specialties?.length || 0}</Text>
                <Text style={styles.statLabel}>Especialidades</Text>
              </View>
            </View>
          )}

          {/* Bio Section */}
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Biografía</Text>
              {!editing && (
                <TouchableOpacity onPress={() => setEditing(true)}>
                  <Ionicons name="pencil" size={20} color="#2563EB" />
                </TouchableOpacity>
              )}
            </View>
            
            {editing ? (
              <TextInput
                style={styles.bioInput}
                value={bio}
                onChangeText={setBio}
                placeholder="Escribe una breve descripción sobre ti..."
                multiline
                numberOfLines={4}
              />
            ) : (
              <Text style={styles.bioText}>
                {barberProfile?.bio || 'Sin biografía'}
              </Text>
            )}
          </Card>

          {/* Specialties Section */}
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Especialidades</Text>
            </View>
            
            {editing ? (
              <TextInput
                style={styles.specialtiesInput}
                value={specialtiesText}
                onChangeText={setSpecialtiesText}
                placeholder="Fade, Pompadour, Barba... (separadas por coma)"
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

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#EF4444" />
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
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
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2563EB',
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...badgeShadow,
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  email: {
    fontSize: 14,
    color: '#64748B',
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
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  content: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    ...statShadow,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  bioText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  bioInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1E293B',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  specialtiesInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1E293B',
  },
  specialtiesTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
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
    marginTop: 16,
  },
  logoutText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '500',
  },
});
