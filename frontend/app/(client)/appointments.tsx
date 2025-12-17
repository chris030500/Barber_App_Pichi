import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface Appointment {
  appointment_id: string;
  shop_id: string;
  barber_id: string;
  scheduled_time: string;
  status: string;
  notes?: string;
}

export default function AppointmentsScreen() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'completed'>('all');

  useEffect(() => {
    if (user) {
      loadAppointments();
    }
  }, [user, filter]);

  const loadAppointments = async () => {
    if (!user) return;
    
    try {
      const params: any = { client_user_id: user.user_id };
      if (filter !== 'all') {
        params.status = filter;
      }
      
      const response = await axios.get(`${BACKEND_URL}/api/appointments`, { params });
      setAppointments(response.data);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    Alert.alert(
      'Cancelar cita',
      '¿Estás seguro de que quieres cancelar esta cita?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.put(`${BACKEND_URL}/api/appointments/${appointmentId}`, {
                status: 'cancelled'
              });
              Alert.alert('Éxito', 'Cita cancelada');
              loadAppointments();
            } catch (error) {
              Alert.alert('Error', 'No se pudo cancelar la cita');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return '#3B82F6';
      case 'confirmed':
        return '#10B981';
      case 'completed':
        return '#64748B';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#94A3B8';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Programada';
      case 'confirmed':
        return 'Confirmada';
      case 'completed':
        return 'Completada';
      case 'cancelled':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const renderAppointment = ({ item }: { item: Appointment }) => {
    const appointmentDate = new Date(item.scheduled_time);
    
    return (
      <Card style={styles.appointmentCard}>
        <View style={styles.appointmentHeader}>
          <View>
            <Text style={styles.appointmentDate}>
              {format(appointmentDate, "EEEE, d 'de' MMMM", { locale: es })}
            </Text>
            <Text style={styles.appointmentTime}>
              {format(appointmentDate, 'HH:mm', { locale: es })}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>

        {item.notes && (
          <Text style={styles.notes}>{item.notes}</Text>
        )}

        {item.status === 'scheduled' && (
          <View style={styles.actions}>
            <Button
              title="Reprogramar"
              onPress={() => Alert.alert('Próximamente', 'Función de reprogramar')}
              variant="outline"
              size="small"
              style={styles.actionButton}
            />
            <Button
              title="Cancelar"
              onPress={() => handleCancelAppointment(item.appointment_id)}
              variant="danger"
              size="small"
              style={styles.actionButton}
            />
          </View>
        )}
      </Card>
    );
  };

  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Citas</Text>
        <Button
          title="+ Nueva"
          onPress={() => router.push('/(client)/booking')}
          variant="primary"
          size="small"
        />
      </View>

      <View style={styles.filters}>
        <Button
          title="Todas"
          onPress={() => setFilter('all')}
          variant={filter === 'all' ? 'primary' : 'outline'}
          size="small"
          style={styles.filterButton}
        />
        <Button
          title="Programadas"
          onPress={() => setFilter('scheduled')}
          variant={filter === 'scheduled' ? 'primary' : 'outline'}
          size="small"
          style={styles.filterButton}
        />
        <Button
          title="Completadas"
          onPress={() => setFilter('completed')}
          variant={filter === 'completed' ? 'primary' : 'outline'}
          size="small"
          style={styles.filterButton}
        />
      </View>

      {appointments.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No tienes citas</Text>
          <Text style={styles.emptyText}>
            Agenda tu primera cita desde la pantalla de inicio
          </Text>
        </View>
      ) : (
        <FlatList
          data={appointments}
          renderItem={renderAppointment}
          keyExtractor={(item) => item.appointment_id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  appointmentCard: {
    marginBottom: 12,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  appointmentDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    textTransform: 'capitalize',
  },
  appointmentTime: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  notes: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});
