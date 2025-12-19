import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Card from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { palette, typography } from '../../styles/theme';
import { BACKEND_URL } from '../../utils/backendUrl';
import { logNetworkError } from '../../utils/logger';

interface StatusBreakdown {
  scheduled: number;
  completed: number;
  cancelled: number;
  in_progress: number;
}

interface TopService {
  service_id: string;
  name: string;
  count: number;
  price?: number;
}

interface DashboardStats {
  totalAppointments: number;
  todayAppointments: number;
  completedAppointments: number;
  totalBarbers: number;
  revenueToday: number;
  ticketAverage: number;
  occupancyRate: number | null;
  capacity: number | null;
  statusBreakdown: StatusBreakdown;
  topServices: TopService[];
  lastUpdated?: string;
}

interface RecentAppointment {
  appointment_id: string;
  scheduled_time: string;
  status: string;
}

export default function AdminDashboardScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentAppointments, setRecentAppointments] = useState<RecentAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shopName, setShopName] = useState<string>('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setError(null);
    try {
      const shopsResponse = await axios.get(`${BACKEND_URL}/api/barbershops`);
      const shop = shopsResponse.data[0];

      if (!shop) {
        setShopName('');
        setStats(null);
        setRecentAppointments([]);
        setLoading(false);
        return;
      }

      setShopName(shop.name || 'Tu barbería');

      const statsResponse = await axios.get(`${BACKEND_URL}/api/dashboard/stats`, {
        params: { shop_id: shop.shop_id }
      });

      const payload = statsResponse.data;

      const normalized: DashboardStats = {
        totalAppointments: payload?.total_appointments ?? 0,
        todayAppointments: payload?.today_appointments ?? 0,
        completedAppointments: payload?.completed_appointments ?? 0,
        totalBarbers: payload?.total_barbers ?? 0,
        revenueToday: payload?.revenue_today ?? 0,
        ticketAverage: payload?.ticket_average ?? 0,
        occupancyRate: payload?.occupancy_rate ?? null,
        capacity: payload?.capacity ?? null,
        statusBreakdown: payload?.status_breakdown ?? {
          scheduled: 0,
          completed: 0,
          cancelled: 0,
          in_progress: 0,
        },
        topServices: payload?.top_services ?? [],
        lastUpdated: payload?.last_updated,
      };

      setStats(normalized);
      setRecentAppointments(payload?.recent_appointments ?? []);
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      setError('No pudimos cargar el panel de métricas. Desliza para reintentar.');
      await logNetworkError('admin_dashboard_fetch_failed', {
        screen: 'admin_dashboard',
        userId: user?.user_id,
        context: { message: error?.message, stack: error?.stack },
      });
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
      case 'in_progress': return palette.warning;
      default: return palette.textSecondary;
    }
  };

  const maxTopServiceCount = useMemo(() => {
    if (!stats?.topServices?.length) return 1;
    return Math.max(...stats.topServices.map((s) => s.count));
  }, [stats?.topServices]);

  const totalTodayAppointments = useMemo(() => {
    if (!stats) return 0;
    const breakdown = stats.statusBreakdown;
    return breakdown.scheduled + breakdown.completed + breakdown.cancelled + breakdown.in_progress;
  }, [stats]);

  const renderStatusRow = (label: string, value: number, color: string) => (
    <View style={styles.statusRow}>
      <View style={styles.statusRowHeader}>
        <Text style={styles.statusLabel}>{label}</Text>
        <Text style={styles.statusValue}>{value}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${totalTodayAppointments ? Math.min(100, (value / totalTodayAppointments) * 100) : 0}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </View>
  );

  const renderTopServices = () => {
    if (!stats?.topServices?.length) {
      return (
        <Card style={styles.emptyCard}>
          <Ionicons name="bar-chart-outline" size={40} color={palette.textSecondary} />
          <Text style={styles.emptyText}>Aún no hay servicios destacados</Text>
        </Card>
      );
    }

    return stats.topServices.map((service) => {
      const width = Math.max(8, (service.count / maxTopServiceCount) * 100);
      return (
        <Card key={service.service_id} style={styles.serviceCard}>
          <View style={styles.serviceRow}>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.serviceMeta}>{service.count} citas · ${service.price ?? '--'}</Text>
            </View>
            <Text style={styles.serviceBadge}>Top</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${width}%`, backgroundColor: palette.accent }]} />
          </View>
        </Card>
      );
    });
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
            {shopName ? <Text style={styles.shopName}>{shopName}</Text> : null}
          </View>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={20} color={palette.accent} />
            <Text style={styles.adminText}>Admin</Text>
          </View>
        </View>

        {error && (
          <Card style={styles.errorCard}>
            <View style={styles.errorRow}>
              <Ionicons name="warning" size={20} color={palette.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
            <TouchableOpacity style={styles.retryButton} onPress={loadDashboardData}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </Card>
        )}

        {loading ? (
          <Card style={styles.loadingCard}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.loadingText}>Cargando métricas...</Text>
          </Card>
        ) : null}

        {!stats && !loading ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="storefront-outline" size={40} color={palette.textSecondary} />
            <Text style={styles.emptyText}>Crea una barbería para ver las métricas</Text>
          </Card>
        ) : null}

        {stats ? (
          <>
            <View style={styles.statsGrid}>
              <Card style={[styles.statCard, styles.statPrimary]}>
                <Ionicons name="calendar" size={28} color="#FFFFFF" />
                <Text style={styles.statNumberPrimary}>{stats.todayAppointments}</Text>
                <Text style={styles.statLabelPrimary}>Citas Hoy</Text>
              </Card>
              <Card style={styles.statCard}>
                <Ionicons name="cash" size={28} color={palette.warning} />
                <Text style={styles.statNumber}>${stats.revenueToday.toFixed(0)}</Text>
                <Text style={styles.statLabel}>Ingresos Hoy</Text>
              </Card>
              <Card style={styles.statCard}>
                <Ionicons name="pricetag" size={28} color={palette.accentSecondary} />
                <Text style={styles.statNumber}>${stats.ticketAverage.toFixed(0)}</Text>
                <Text style={styles.statLabel}>Ticket Promedio</Text>
              </Card>
              <Card style={styles.statCard}>
                <Ionicons name="barbell" size={28} color={palette.success} />
                <Text style={styles.statNumber}>{stats.totalBarbers}</Text>
                <Text style={styles.statLabel}>Barberos</Text>
              </Card>
            </View>

            <Card style={styles.occupancyCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.sectionTitle}>Ocupación de agenda</Text>
                <Text style={styles.badge}>{stats.capacity ? `${stats.capacity} sillas` : 'Sin capacidad'}</Text>
              </View>
              <View style={styles.progressTrackTall}>
                <View
                  style={[styles.progressFillTall, {
                    width: `${stats.occupancyRate ? Math.min(stats.occupancyRate, 100) : 0}%`,
                    backgroundColor: palette.accent,
                  }]} />
              </View>
              <View style={styles.occupancyFooter}>
                <Text style={styles.occupancyValue}>{stats.occupancyRate ? `${stats.occupancyRate.toFixed(0)}%` : '--'}</Text>
                <Text style={styles.occupancyHint}>Citas de hoy vs capacidad</Text>
              </View>
            </Card>

            <View style={styles.quickStatsRow}>
              <View style={styles.quickStat}>
                <Text style={styles.quickStatNumber}>{stats.totalAppointments}</Text>
                <Text style={styles.quickStatLabel}>Citas totales</Text>
              </View>
              <View style={styles.quickStatDivider} />
              <View style={styles.quickStat}>
                <Text style={styles.quickStatNumber}>{stats.completedAppointments}</Text>
                <Text style={styles.quickStatLabel}>Completadas</Text>
              </View>
              <View style={styles.quickStatDivider} />
              <View style={styles.quickStat}>
                <Text style={[styles.quickStatNumber, { color: palette.warning }]}>{stats.statusBreakdown.in_progress}</Text>
                <Text style={styles.quickStatLabel}>En curso</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Estado de las citas hoy</Text>
              <Card style={styles.statusCard}>
                {renderStatusRow('Programadas', stats.statusBreakdown.scheduled, palette.accent)}
                {renderStatusRow('Completadas', stats.statusBreakdown.completed, palette.success)}
                {renderStatusRow('Canceladas', stats.statusBreakdown.cancelled, palette.danger)}
                {renderStatusRow('En curso', stats.statusBreakdown.in_progress, palette.warning)}
              </Card>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top servicios por barbería</Text>
              {renderTopServices()}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Citas recientes</Text>
                <Text style={styles.sectionHint}>Últimas 5</Text>
              </View>
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
                          {format(new Date(apt.scheduled_time), 'HH:mm', { locale: es })}
                        </Text>
                        <Text style={styles.appointmentDate}>
                          {format(new Date(apt.scheduled_time), 'd MMM', { locale: es })}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(apt.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(apt.status) }]}>
                          {apt.status}
                        </Text>
                      </View>
                    </View>
                  </Card>
                ))
              )}
            </View>

            <Text style={styles.updatedAt}>Actualizado: {stats.lastUpdated ? format(new Date(stats.lastUpdated), 'HH:mm') : 'N/D'}</Text>
          </>
        ) : null}
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
  shopName: {
    ...typography.body,
    marginTop: 6,
    color: palette.textSecondary,
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
  occupancyCard: {
    marginHorizontal: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    ...typography.body,
    color: palette.accent,
    backgroundColor: palette.backgroundAlt,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    fontWeight: '600',
  },
  progressTrackTall: {
    height: 12,
    backgroundColor: palette.backgroundAlt,
    borderRadius: 12,
    overflow: 'hidden',
  },
  progressFillTall: {
    height: '100%',
    borderRadius: 12,
  },
  occupancyFooter: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  occupancyValue: {
    ...typography.heading,
    fontSize: 20,
  },
  occupancyHint: {
    ...typography.body,
    color: palette.textSecondary,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionHint: {
    ...typography.body,
    color: palette.textSecondary,
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
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    marginHorizontal: 4,
  },
  emptyText: {
    ...typography.body,
    marginTop: 8,
  },
  statusCard: {
    padding: 16,
  },
  statusRow: {
    marginBottom: 12,
  },
  statusRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statusLabel: {
    ...typography.body,
  },
  statusValue: {
    ...typography.heading,
    fontSize: 16,
  },
  progressTrack: {
    height: 8,
    backgroundColor: palette.backgroundAlt,
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
  },
  serviceCard: {
    marginBottom: 10,
    padding: 12,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  serviceInfo: {
    gap: 4,
  },
  serviceName: {
    ...typography.heading,
    fontSize: 16,
  },
  serviceMeta: {
    ...typography.body,
    color: palette.textSecondary,
  },
  serviceBadge: {
    ...typography.body,
    color: palette.accent,
    fontWeight: '700',
  },
  quickServiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderColor: palette.danger,
    borderWidth: 1,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    ...typography.body,
    color: palette.danger,
  },
  retryButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: palette.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
  },
  retryText: {
    ...typography.body,
    color: palette.accent,
    fontWeight: '700',
  },
  loadingCard: {
    marginHorizontal: 16,
    marginVertical: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    ...typography.body,
  },
  updatedAt: {
    ...typography.body,
    color: palette.textSecondary,
    textAlign: 'center',
    paddingBottom: 20,
  },
});
