import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
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

interface DashboardStats {
  totalAppointments: number;
  todayAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  totalBarbers: number;
  availableBarbers: number;
  totalServices: number;
  estimatedRevenue: number;
}

interface RecentAppointment {
  appointment_id: string;
  scheduled_time: string;
  status: string;
}

export default function AdminDashboardScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalAppointments: 0,
    todayAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    totalBarbers: 0,
    availableBarbers: 0,
    totalServices: 0,
    estimatedRevenue: 0
  });
  const [recentAppointments, setRecentAppointments] = useState<RecentAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Get barbershop first (admin's shop)
      const shopsResponse = await axios.get(`${BACKEND_URL}/api/barbershops`);
      const shop = shopsResponse.data[0]; // Assuming first shop for now
      
      if (!shop) {
        setLoading(false);
        return;
      }

      // Fetch all data in parallel
      const [appointmentsRes, barbersRes, servicesRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/appointments`, { params: { shop_id: shop.shop_id } }),
        axios.get(`${BACKEND_URL}/api/barbers`, { params: { shop_id: shop.shop_id } }),
        axios.get(`${BACKEND_URL}/api/services`, { params: { shop_id: shop.shop_id } })
      ]);

      const appointments = appointmentsRes.data;
      const barbers = barbersRes.data;
      const services = servicesRes.data;

      // Calculate stats
      const today = new Date().toDateString();
      const todayAppointments = appointments.filter((a: any) => 
        new Date(a.scheduled_time).toDateString() === today
      );
      const completedAppointments = appointments.filter((a: any) => a.status === 'completed');
      const cancelledAppointments = appointments.filter((a: any) => a.status === 'cancelled');
      const availableBarbers = barbers.filter((b: any) => b.status === 'available');

      // Estimate revenue (average service price * completed appointments)
      const avgPrice = services.length > 0 
        ? services.reduce((sum: number, s: any) => sum + s.price, 0) / services.length 
        : 0;
      const estimatedRevenue = completedAppointments.length * avgPrice;

      setStats({
        totalAppointments: appointments.length,
        todayAppointments: todayAppointments.length,
        completedAppointments: completedAppointments.length,
        cancelledAppointments: cancelledAppointments.length,
        totalBarbers: barbers.length,
        availableBarbers: availableBarbers.length,
        totalServices: services.length,
        estimatedRevenue
      });

      // Get recent appointments (last 5)
      const sorted = appointments
        .sort((a: any, b: any) => new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime())
        .slice(0, 5);
      setRecentAppointments(sorted);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return palette.accent;
      case 'completed': return palette.success;
      case 'cancelled': return palette.danger;
      default: return palette.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Programada';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>¡Hola, {user?.name || 'Admin'}!</Text>
            <Text style={styles.date}>
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
            </Text>
          </View>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={20} color={palette.accent} />
            <Text style={styles.adminText}>Admin</Text>
          </View>
        </View>

        {/* Main Stats */}
        <View style={styles.statsGrid}>
          <Card style={[styles.statCard, styles.statPrimary]}>
            <Ionicons name="calendar" size={28} color="#FFFFFF" />
            <Text style={styles.statNumberPrimary}>{stats.todayAppointments}</Text>
            <Text style={styles.statLabelPrimary}>Citas Hoy</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={28} color={palette.success} />
            <Text style={styles.statNumber}>{stats.completedAppointments}</Text>
            <Text style={styles.statLabel}>Completadas</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="people" size={28} color={palette.accentSecondary} />
            <Text style={styles.statNumber}>{stats.availableBarbers}/{stats.totalBarbers}</Text>
            <Text style={styles.statLabel}>Barberos</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="cash" size={28} color={palette.warning} />
            <Text style={styles.statNumber}>${stats.estimatedRevenue.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Ingresos Est.</Text>
          </Card>
        </View>

        {/* Quick Stats Row */}
        <View style={styles.quickStatsRow}>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatNumber}>{stats.totalAppointments}</Text>
            <Text style={styles.quickStatLabel}>Total Citas</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatNumber}>{stats.totalServices}</Text>
            <Text style={styles.quickStatLabel}>Servicios</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStat}>
            <Text style={[styles.quickStatNumber, { color: palette.danger }]}>{stats.cancelledAppointments}</Text>
            <Text style={styles.quickStatLabel}>Canceladas</Text>
          </View>
        </View>

        {/* Recent Appointments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Citas Recientes</Text>
          {recentAppointments.length === 0 ? (
            <Card style={styles.emptyCard}>
          <Ionicons name="calendar-outline" size={40} color={palette.textSecondary} />
              <Text style={styles.emptyText}>No hay citas recientes</Text>
            </Card>
          ) : (
            recentAppointments.map((apt) => (
              <Card key={apt.appointment_id} style={styles.appointmentCard}>
                <View style={styles.appointmentRow}>
                  <View style={styles.appointmentInfo}>
                    <Text style={styles.appointmentTime}>
                      {format(new Date(apt.scheduled_time), "HH:mm", { locale: es })}
                    </Text>
                    <Text style={styles.appointmentDate}>
                      {format(new Date(apt.scheduled_time), "d MMM", { locale: es })}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(apt.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(apt.status) }]}>
                      {getStatusText(apt.status)}
                    </Text>
                  </View>
                </View>
              </Card>
            ))
          )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: palette.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  greeting: {
    ...typography.heading,
    fontSize: 24,
  },
  date: {
    ...typography.body,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.backgroundAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  adminText: {
    ...typography.body,
    fontWeight: '700',
    color: palette.accent,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12,
  },
  statCard: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  statPrimary: {
    backgroundColor: palette.accent,
  },
  statNumber: {
    ...typography.heading,
    fontSize: 26,
    marginTop: 8,
  },
  statNumberPrimary: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statLabel: {
    ...typography.body,
    fontSize: 12,
    marginTop: 4,
  },
  statLabelPrimary: {
    fontSize: 12,
    color: '#E2E8F0',
    marginTop: 4,
  },
  quickStatsRow: {
    flexDirection: 'row',
    backgroundColor: palette.surface,
    marginHorizontal: 16,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatNumber: {
    ...typography.heading,
    fontSize: 20,
  },
  quickStatLabel: {
    ...typography.body,
    fontSize: 12,
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: palette.border,
  },
  section: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    ...typography.heading,
    fontSize: 18,
    marginBottom: 12,
  },
  appointmentCard: {
    marginBottom: 8,
    padding: 12,
  },
  appointmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appointmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appointmentTime: {
    ...typography.heading,
    fontSize: 16,
  },
  appointmentDate: {
    ...typography.body,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    ...typography.body,
    marginTop: 8,
  },
});
