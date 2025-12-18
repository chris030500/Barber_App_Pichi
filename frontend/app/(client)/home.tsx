import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import Constants from 'expo-constants';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { palette, typography } from '../../styles/theme';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface Barbershop {
  shop_id: string;
  name: string;
  address: string;
  phone: string;
  description?: string;
  photos: string[];
}

interface Appointment {
  appointment_id: string;
  scheduled_time: string;
  status: string;
}

export default function ClientHomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [barbershops, setBarbershops] = useState<Barbershop[]>([]);
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [shopsRes, apptsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/barbershops`),
        user
          ? axios.get(`${BACKEND_URL}/api/appointments`, {
              params: { client_user_id: user.user_id, status: 'scheduled' }
            })
          : Promise.resolve({ data: [] })
      ]);

      setBarbershops(shopsRes.data);

      if (apptsRes.data.length > 0) {
        const sorted = apptsRes.data.sort(
          (a: Appointment, b: Appointment) =>
            new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
        );
        setNextAppointment(sorted[0]);
      } else {
        setNextAppointment(null);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderBarbershop = ({ item }: { item: Barbershop }) => (
    <Card style={styles.shopCard}>
      <View style={styles.shopHeader}>
        <View style={styles.iconPill}>
          <Ionicons name="cut" size={24} color={palette.accentSecondary} />
        </View>
        <View style={styles.shopInfo}>
          <Text style={styles.shopName}>{item.name}</Text>
          <Text style={styles.shopAddress}>{item.address}</Text>
          <Text style={styles.shopPhone}>{item.phone}</Text>
        </View>
      </View>
      {item.description && <Text style={styles.shopDescription}>{item.description}</Text>}
      <View style={styles.shopActions}>
        <Button
          title="Reservar"
          onPress={() =>
            router.push({ pathname: '/(client)/booking', params: { shop_id: item.shop_id } })
          }
          variant="primary"
          size="small"
          style={styles.actionButton}
        />
        <TouchableOpacity style={styles.ghostButton}>
          <Text style={styles.ghostText}>Ver detalles</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderHeader = () => (
    <View style={styles.headerCard}>
      <View>
        <Text style={styles.greeting}>Hola, {user?.name || 'Usuario'}</Text>
        <Text style={styles.subGreeting}>Agenda, descubre y administra tus citas</Text>
      </View>
      <View style={styles.badge}>
        <Ionicons name="star" size={16} color={palette.accentSecondary} />
        <Text style={styles.badgeText}>Premium care</Text>
      </View>
    </View>
  );

  const renderAppointment = () => {
    if (loading) {
      return (
        <Card style={styles.appointmentCard}>
          <View style={styles.row}> 
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.loadingText}>Buscando tu próxima cita...</Text>
          </View>
        </Card>
      );
    }

    if (!nextAppointment) {
      return (
        <Card style={styles.appointmentCard}>
          <View style={styles.row}>
            <View style={styles.iconPillMuted}>
              <Ionicons name="calendar" size={20} color={palette.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.appointmentTitle}>Aún sin citas</Text>
              <Text style={styles.appointmentSubtitle}>
                Agenda en tu barbería favorita y recibe recordatorios automáticos.
              </Text>
            </View>
            <Button
              title="Agendar"
              onPress={() => router.push('/(client)/booking')}
              size="small"
              variant="outline"
              style={styles.compactButton}
              textStyle={styles.compactButtonText}
            />
          </View>
        </Card>
      );
    }

    const formatted = format(new Date(nextAppointment.scheduled_time), "EEEE d 'de' MMMM, HH:mm", {
      locale: es,
    });

    return (
      <Card style={styles.appointmentCard}>
        <View style={styles.row}>
          <View style={styles.iconPillAccent}>
            <Ionicons name="time" size={20} color="#0B1220" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.appointmentTitle}>Próxima cita</Text>
            <Text style={styles.appointmentTime}>{formatted}</Text>
          </View>
          <Button
            title="Ver"
            onPress={() => router.push('/(client)/appointments')}
            size="small"
            variant="outline"
            style={styles.compactButton}
            textStyle={styles.compactButtonText}
          />
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={barbershops}
        renderItem={renderBarbershop}
        keyExtractor={(item) => item.shop_id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            {renderHeader()}
            {renderAppointment()}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Barberías destacadas</Text>
              <TouchableOpacity>
                <Text style={styles.sectionLink}>Ver todas</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          !loading ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="compass" size={30} color={palette.textSecondary} />
              <Text style={styles.emptyTitle}>No hay barberías registradas</Text>
              <Text style={styles.emptyText}>
                Pronto habrá barberías disponibles en tu área.
              </Text>
            </Card>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  list: {
    padding: 20,
    gap: 14,
  },
  headerCard: {
    backgroundColor: palette.surfaceAlt,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: 12,
  },
  greeting: {
    ...typography.heading,
    fontSize: 22,
  },
  subGreeting: {
    ...typography.subheading,
    marginTop: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 14,
    gap: 6,
  },
  badgeText: {
    ...typography.body,
    color: palette.textPrimary,
  },
  appointmentCard: {
    marginBottom: 16,
    backgroundColor: palette.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appointmentTitle: {
    ...typography.subheading,
    color: palette.textPrimary,
  },
  appointmentSubtitle: {
    ...typography.body,
    marginTop: 6,
    lineHeight: 18,
  },
  appointmentTime: {
    fontSize: 16,
    color: palette.textPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  iconPill: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#0B1220',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  iconPillMuted: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  iconPillAccent: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopCard: {
    padding: 18,
  },
  shopHeader: {
    flexDirection: 'row',
    gap: 14,
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    ...typography.heading,
    fontSize: 18,
  },
  shopAddress: {
    ...typography.body,
    marginTop: 4,
  },
  shopPhone: {
    ...typography.body,
    marginTop: 2,
    color: palette.textPrimary,
  },
  shopDescription: {
    ...typography.body,
    marginTop: 12,
    lineHeight: 20,
  },
  shopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  actionButton: {
    flex: 1,
    marginRight: 10,
  },
  ghostButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  ghostText: {
    ...typography.body,
    color: palette.accentSecondary,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  sectionTitle: {
    ...typography.heading,
    fontSize: 18,
  },
  sectionLink: {
    ...typography.body,
    color: palette.accentSecondary,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyTitle: {
    ...typography.heading,
    fontSize: 18,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  loadingText: {
    ...typography.body,
    color: palette.textPrimary,
    marginLeft: 12,
  },
  compactButton: {
    borderColor: palette.border,
  },
  compactButtonText: {
    color: palette.textPrimary,
  },
});
