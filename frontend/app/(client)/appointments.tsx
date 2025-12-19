import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { format, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { palette, typography } from '../../styles/theme';
import { BACKEND_URL } from '../../utils/backendUrl';

interface Appointment {
  appointment_id: string;
  shop_id: string;
  barber_id: string;
  scheduled_time: string; // ej: "2025-12-17 10:30:00" o ISO
  status: string;
  notes?: string;
}

function toValidDate(raw: unknown): Date | null {
  if (!raw) return null;

  // Si viene como número (timestamp)
  if (typeof raw === 'number') {
    const d = new Date(raw);
    return isValid(d) ? d : null;
  }

  if (typeof raw === 'string') {
    const value = raw.trim();
    if (!value) return null;

    // Normaliza "YYYY-MM-DD HH:mm:ss" -> "YYYY-MM-DDTHH:mm:ss"
    const normalized = value.includes(' ') && !value.includes('T') ? value.replace(' ', 'T') : value;

    // parseISO para ISO/normalizado
    const dIso = parseISO(normalized);
    if (isValid(dIso)) return dIso;

    // fallback a Date() por si viene en otro formato tolerado por runtime
    const d = new Date(value);
    return isValid(d) ? d : null;
  }

  // Por si llega como Date ya
  if (raw instanceof Date) {
    return isValid(raw) ? raw : null;
  }

  return null;
}

export default function AppointmentsScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'completed'>('all');

  useEffect(() => {
    if (user) {
      loadAppointments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filter]);

  const loadAppointments = async () => {
    if (!user) return;

    try {
      const params: any = { client_user_id: user.user_id };
      if (filter !== 'all') {
        params.status = filter;
      }

      const response = await axios.get(`${BACKEND_URL}/api/appointments`, { params });
      setAppointments(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    Alert.alert('Cancelar cita', '¿Estás seguro de que quieres cancelar esta cita?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: async () => {
          try {
            await axios.put(`${BACKEND_URL}/api/appointments/${appointmentId}`, {
              status: 'cancelled',
            });
            Alert.alert('Éxito', 'Cita cancelada');
            loadAppointments();
          } catch (error) {
            Alert.alert('Error', 'No se pudo cancelar la cita');
          }
        },
      },
    ]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return palette.accent;
      case 'confirmed':
        return palette.success;
      case 'completed':
        return palette.textSecondary;
      case 'cancelled':
        return palette.danger;
      default:
        return palette.textSecondary;
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
              {appointmentDate
                ? format(appointmentDate, "EEEE, d 'de' MMMM", { locale: es })
                : 'Fecha inválida'}
            </Text>
            <Text style={styles.appointmentTime}>
              {appointmentDate ? format(appointmentDate, 'HH:mm', { locale: es }) : String(item.scheduled_time)}
            </Text>
          </View>
          <View
            style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}22` }]}
          >
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>

        {item.notes && <Text style={styles.notes}>{item.notes}</Text>}

        {item.status === 'scheduled' && (
          <View style={styles.actions}>
            <Button
              title="Reprogramar"
              onPress={() => Alert.alert('Próximamente', 'Función de reprogramar')}
              variant="outline"
              size="small"
              style={styles.actionButton}
              textStyle={styles.actionText}
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis citas</Text>
        <Button
          title="+ Nueva"
          onPress={() => router.push('/(client)/booking')}
          variant="primary"
          size="small"
          style={styles.newButton}
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

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.loadingText}>Sincronizando tus citas...</Text>
        </View>
      ) : appointments.length === 0 ? (
        <Card style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={48} color={palette.textSecondary} />
          <Text style={styles.emptyTitle}>No tienes citas</Text>
          <Text style={styles.emptyText}>
            Agenda tu primera cita desde la pantalla de inicio o comienza ahora.
          </Text>
          <Button
            title="Agendar"
            onPress={() => router.push('/(client)/booking')}
            variant="primary"
            size="small"
            style={styles.emptyButton}
          />
        </Card>
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
  },
  title: {
    ...typography.heading,
    fontSize: 22,
  },
  newButton: {
    minWidth: 96,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
  },
  filterButton: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  appointmentCard: {
    gap: 10,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  appointmentDate: {
    ...typography.heading,
    fontSize: 16,
    textTransform: 'capitalize',
  },
  appointmentTime: {
    ...typography.body,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  notes: {
    ...typography.body,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
  },
  actionText: {
    color: palette.textPrimary,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    ...typography.body,
    color: palette.textPrimary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 10,
    marginHorizontal: 16,
    marginTop: 20,
  },
  emptyTitle: {
    ...typography.heading,
    fontSize: 18,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  emptyButton: {
    marginTop: 6,
    paddingHorizontal: 24,
  },
});
