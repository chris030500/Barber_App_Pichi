import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { palette, typography } from '../../styles/theme';
import { BACKEND_URL } from '../../utils/backendUrl';

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

  const completeAppointment = async (appointmentId: string) => {
    Alert.alert(
      'Completar Cita',
      '¿Marcar esta cita como completada?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Completar',
          onPress: async () => {
            try {
              await axios.put(`${BACKEND_URL}/api/appointments/${appointmentId}`, { status: 'completed' });
              setAppointments(appointments.filter(a => a.appointment_id !== appointmentId));
              Alert.alert('Éxito', 'Cita marcada como completada');
            } catch (error) {
              Alert.alert('Error', 'No se pudo actualizar la cita');
            }
          }
        }
      ]
    );
  };

  const cancelAppointment = async (appointmentId: string) => {
    Alert.alert(
      'Cancelar Cita',
      '¿Estás seguro de cancelar esta cita?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.put(`${BACKEND_URL}/api/appointments/${appointmentId}`, { status: 'cancelled' });
              setAppointments(appointments.filter(a => a.appointment_id !== appointmentId));
              Alert.alert('Éxito', 'Cita cancelada');
            } catch (error) {
              Alert.alert('Error', 'No se pudo cancelar la cita');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return palette.success;
      case 'busy':
        return palette.warning;
      case 'unavailable':
        return palette.danger;
      default:
        return palette.textSecondary;
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
            title="✓ Completar"
            onPress={() => completeAppointment(item.appointment_id)}
            variant="primary"
            size="small"
            style={styles.actionButton}
          />
          <Button
            title="✕ Cancelar"
            onPress={() => cancelAppointment(item.appointment_id)}
            variant="outline"
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
              { borderColor: palette.success }
            ]}
            onPress={() => updateStatus('available')}
          >
            <Ionicons name="checkmark-circle" size={24} color={palette.success} />
            <Text style={styles.statusButtonText}>Disponible</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statusButton,
              barberStatus === 'busy' && styles.statusButtonActive,
              { borderColor: palette.warning }
            ]}
            onPress={() => updateStatus('busy')}
          >
            <Ionicons name="time" size={24} color={palette.warning} />
            <Text style={styles.statusButtonText}>Ocupado</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statusButton,
              barberStatus === 'unavailable' && styles.statusButtonActive,
              { borderColor: palette.danger }
            ]}
            onPress={() => updateStatus('unavailable')}
          >
            <Ionicons name="close-circle" size={24} color={palette.danger} />
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
          <Ionicons name="calendar-outline" size={64} color={palette.textSecondary} />
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
    backgroundColor: palette.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: palette.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  title: {
    ...typography.heading,
    fontSize: 24,
  },
  subtitle: {
    ...typography.body,
    marginTop: 2,
  },
  statusCard: {
    backgroundColor: palette.surface,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  statusLabel: {
    ...typography.subheading,
    color: palette.textPrimary,
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
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: palette.surfaceAlt,
  },
  statusButtonActive: {
    backgroundColor: palette.backgroundAlt,
  },
  statusButtonText: {
    ...typography.body,
    color: palette.textPrimary,
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
    ...typography.heading,
    fontSize: 18,
  },
  appointmentsCount: {
    ...typography.body,
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
    ...typography.heading,
    fontSize: 20,
  },
  appointmentDate: {
    ...typography.body,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  notes: {
    ...typography.body,
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
    ...typography.heading,
    fontSize: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 20,
  },
});
