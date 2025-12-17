import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
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
  client_user_id: string;
  service_id: string;
  scheduled_time: string;
  status: string;
  notes?: string;
}

export default function BarberScheduleScreen() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barberStatus, setBarberStatus] = useState('available');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadBarberData();
      loadAppointments();
    }
  }, [user]);

  const loadBarberData = async () => {
    try {
      // Get barber profile
      const response = await axios.get(`${BACKEND_URL}/api/barbers?user_id=${user?.user_id}`);
      if (response.data && response.data.length > 0) {
        setBarberStatus(response.data[0].status || 'available');
      }
    } catch (error) {
      console.error('Error loading barber data:', error);
    }
  };

  const loadAppointments = async () => {
    try {
      // Get barber's appointments
      const barberResponse = await axios.get(`${BACKEND_URL}/api/barbers?user_id=${user?.user_id}`);
      if (barberResponse.data && barberResponse.data.length > 0) {
        const barberId = barberResponse.data[0].barber_id;
        const appointmentsResponse = await axios.get(
          `${BACKEND_URL}/api/appointments?barber_id=${barberId}&status=scheduled`
        );
        setAppointments(appointmentsResponse.data);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      const barberResponse = await axios.get(`${BACKEND_URL}/api/barbers?user_id=${user?.user_id}`);
      if (barberResponse.data && barberResponse.data.length > 0) {
        const barberId = barberResponse.data[0].barber_id;
        await axios.put(`${BACKEND_URL}/api/barbers/${barberId}`, { status: newStatus });
        setBarberStatus(newStatus);
        Alert.alert('Éxito', `Estado actualizado a ${newStatus}`);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return '#10B981';
      case 'busy':
        return '#F59E0B';
      case 'unavailable':
        return '#EF4444';
      default:
        return '#64748B';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available':
        return 'Disponible';
      case 'busy':
        return 'Ocupado';
      case 'unavailable':
        return 'No Disponible';
      default:
        return status;
    }
  };

  const renderAppointment = ({ item }: { item: Appointment }) => {
    const appointmentDate = new Date(item.scheduled_time);
    
    return (
      <Card style={styles.appointmentCard}>
        <View style={styles.appointmentHeader}>
          <Text style={styles.appointmentTime}>
            {format(appointmentDate, "HH:mm", { locale: es })}
          </Text>
          <Text style={styles.appointmentDate}>
            {format(appointmentDate, "EEEE, d MMM", { locale: es })}
          </Text>
        </View>
        {item.notes && (
          <Text style={styles.notes}>Notas: {item.notes}</Text>
        )}
        <View style={styles.appointmentActions}>
          <Button
            title="Completar"
            onPress={() => Alert.alert('Funcionalidad', 'Marcar como completada')}
            variant="primary"
            size="small"
            style={styles.actionButton}
          />
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Mi Agenda</Text>
          <Text style={styles.subtitle}>Hola, {user?.name}</Text>
        </View>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Estado Actual:</Text>
        <View style={styles.statusButtons}>
          <TouchableOpacity
            style={[
              styles.statusButton,
              barberStatus === 'available' && styles.statusButtonActive,
              { borderColor: '#10B981' }
            ]}
            onPress={() => updateStatus('available')}
          >
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <Text style={styles.statusButtonText}>Disponible</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statusButton,
              barberStatus === 'busy' && styles.statusButtonActive,
              { borderColor: '#F59E0B' }
            ]}
            onPress={() => updateStatus('busy')}
          >
            <Ionicons name="time" size={24} color="#F59E0B" />
            <Text style={styles.statusButtonText}>Ocupado</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statusButton,
              barberStatus === 'unavailable' && styles.statusButtonActive,
              { borderColor: '#EF4444' }
            ]}
            onPress={() => updateStatus('unavailable')}
          >
            <Ionicons name="close-circle" size={24} color="#EF4444" />
            <Text style={styles.statusButtonText}>No Disponible</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.appointmentsHeader}>
        <Text style={styles.appointmentsTitle}>Citas de Hoy</Text>
        <Text style={styles.appointmentsCount}>{appointments.length} citas</Text>
      </View>

      {appointments.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No tienes citas programadas</Text>
          <Text style={styles.emptyText}>Las citas aparecerán aquí cuando los clientes agenden</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
  },
  statusButtonActive: {
    backgroundColor: '#F0F9FF',
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1E293B',
    marginTop: 4,
  },
  appointmentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  appointmentsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  appointmentsCount: {
    fontSize: 14,
    color: '#64748B',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  appointmentCard: {
    marginBottom: 12,
  },
  appointmentHeader: {
    marginBottom: 12,
  },
  appointmentTime: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  appointmentDate: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  notes: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 12,
  },
  appointmentActions: {
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
