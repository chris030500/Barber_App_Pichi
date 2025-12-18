import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Card from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { palette, typography } from '../../styles/theme';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface Appointment {
  appointment_id: string;
  client_user_id: string;
  service_id: string;
  scheduled_time: string;
  status: string;
  notes?: string;
}

export default function BarberClientsScreen() {
  const { user } = useAuth();
  const [completedAppointments, setCompletedAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadCompletedAppointments();
    }
  }, [user]);

  const loadCompletedAppointments = async () => {
    try {
      // Get barber profile first
      const barberResponse = await axios.get(`${BACKEND_URL}/api/barbers?user_id=${user?.user_id}`);
      if (barberResponse.data && barberResponse.data.length > 0) {
        const barberId = barberResponse.data[0].barber_id;
        
        // Get completed appointments
        const appointmentsResponse = await axios.get(
          `${BACKEND_URL}/api/appointments?barber_id=${barberId}&status=completed`
        );
        setCompletedAppointments(appointmentsResponse.data);
      }
    } catch (error) {
      console.error('Error loading completed appointments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCompletedAppointments();
  };

  // Group appointments by client
  const clientsMap = new Map<string, Appointment[]>();
  completedAppointments.forEach(apt => {
    const existing = clientsMap.get(apt.client_user_id) || [];
    clientsMap.set(apt.client_user_id, [...existing, apt]);
  });
  const uniqueClients = Array.from(clientsMap.entries());

  const renderClient = ({ item }: { item: [string, Appointment[]] }) => {
    const [clientId, appointments] = item;
    const lastVisit = appointments.sort((a, b) => 
      new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime()
    )[0];

    return (
      <Card style={styles.clientCard}>
        <View style={styles.clientHeader}>
          <View style={styles.clientAvatar}>
          <Ionicons name="person" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>Cliente</Text>
            <Text style={styles.clientId}>{clientId.substring(0, 12)}...</Text>
          </View>
          <View style={styles.visitBadge}>
            <Text style={styles.visitCount}>{appointments.length}</Text>
            <Text style={styles.visitLabel}>visitas</Text>
          </View>
        </View>
        <View style={styles.clientDetails}>
          <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color={palette.textSecondary} />
            <Text style={styles.detailText}>
              Última visita: {format(new Date(lastVisit.scheduled_time), "d MMM yyyy", { locale: es })}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Clientes</Text>
        <Text style={styles.subtitle}>Historial de clientes atendidos</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="people" size={24} color={palette.accent} />
          <Text style={styles.statNumber}>{uniqueClients.length}</Text>
          <Text style={styles.statLabel}>Clientes</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={24} color={palette.success} />
          <Text style={styles.statNumber}>{completedAppointments.length}</Text>
          <Text style={styles.statLabel}>Servicios</Text>
        </View>
      </View>

      {uniqueClients.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color={palette.textSecondary} />
          <Text style={styles.emptyTitle}>Aún no has atendido clientes</Text>
          <Text style={styles.emptyText}>
            El historial de tus clientes aparecerá aquí cuando completes servicios
          </Text>
        </View>
      ) : (
        <FlatList
          data={uniqueClients}
          renderItem={renderClient}
          keyExtractor={(item) => item[0]}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
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
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: palette.surface,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  statNumber: {
    ...typography.heading,
    fontSize: 22,
    marginTop: 8,
  },
  statLabel: {
    ...typography.body,
    marginTop: 2,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  clientCard: {
    marginBottom: 12,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientInfo: {
    flex: 1,
    marginLeft: 12,
  },
  clientName: {
    ...typography.heading,
    fontSize: 16,
  },
  clientId: {
    ...typography.body,
    marginTop: 2,
  },
  visitBadge: {
    backgroundColor: palette.backgroundAlt,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  visitCount: {
    ...typography.heading,
    fontSize: 18,
    color: palette.textPrimary,
  },
  visitLabel: {
    ...typography.body,
    fontSize: 12,
  },
  clientDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    ...typography.body,
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
