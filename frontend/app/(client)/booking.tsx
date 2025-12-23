import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { palette, shadows, typography } from '../../styles/theme';
import { BACKEND_URL } from '../../utils/backendUrl';

// --- Helpers para normalizar respuestas ---
function asArray<T>(value: any): T[] {
  if (Array.isArray(value)) return value;

  // patrones comunes
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;

  // por si tu backend manda { barbershops: [...] } etc.
  if (Array.isArray(value?.barbershops)) return value.barbershops;
  if (Array.isArray(value?.services)) return value.services;
  if (Array.isArray(value?.barbers)) return value.barbers;

  return [];
}

function asStringParam(param: string | string[] | undefined): string | undefined {
  if (!param) return undefined;
  return Array.isArray(param) ? param[0] : param;
}

// iOS no soporta Alert.prompt
const promptText = (
  title: string,
  message: string,
  onSave: (value: string) => void,
  currentValue: string
) => {
  if (Platform.OS === 'ios') {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Guardar',
        onPress: () => {
          // iOS: aquí puedes navegar a una pantalla modal para editar notas
          // por ahora dejamos un fallback simple
          onSave(currentValue);
        },
      },
    ]);
    return;
  }

  // @ts-ignore (web / android)
  Alert.prompt(
    title,
    message,
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Guardar', onPress: (value: string) => onSave(value || '') },
    ],
    'plain-text',
    currentValue
  );
};

interface Service {
  service_id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
}

interface Barber {
  barber_id: string;
  user_id: string;
  bio?: string;
  specialties: string[];
  status: string;
  rating: number;
}

interface Barbershop {
  shop_id: string;
  name: string;
  address: string;
}

export default function BookingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const [barbershops, setBarbershops] = useState<Barbershop[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);

  const [selectedShop, setSelectedShop] = useState<Barbershop | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [depositRequired, setDepositRequired] = useState(false);
  const [depositAmount, setDepositAmount] = useState<number | null>(null);
  const [depositStatusMessage, setDepositStatusMessage] = useState<string | null>(null);

  const availableDates = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00'
  ];

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedShop) {
      loadServicesAndBarbers();
    } else {
      setServices([]);
      setBarbers([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShop?.shop_id]);

  useEffect(() => {
    if (selectedService) {
      const suggested = Number((selectedService.price * 0.3).toFixed(2));
      setDepositAmount(suggested);
    } else {
      setDepositAmount(null);
      setDepositRequired(false);
    }
  }, [selectedService]);

  const loadInitialData = async () => {
    try {
      if (!BACKEND_URL) {
        console.warn('⚠️ BACKEND_URL no está configurado');
        setBarbershops([]);
        return;
      }

      const response = await axios.get(`${BACKEND_URL}/api/barbershops`);
      setBarbershops(response.data);

      if (params.shop_id) {
        const shop = response.data.find((s: Barbershop) => s.shop_id === params.shop_id);
        if (shop) {
          setSelectedShop(shop);
          setStep(2);
        }
      }
    } catch (error) {
      console.error('Error loading barbershops:', error);
      setBarbershops([]);
    } finally {
      setLoading(false);
    }
  };

  const loadServicesAndBarbers = async () => {
    if (!selectedShop) return;

    try {
      const [servicesRes, barbersRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/services`, { params: { shop_id: selectedShop.shop_id } }),
        axios.get(`${BACKEND_URL}/api/barbers`, { params: { shop_id: selectedShop.shop_id } }),
      ]);

      setServices(servicesRes.data);
      setBarbers(barbersRes.data.filter((b: Barber) => b.status === 'available'));
    } catch (error) {
      console.error('Error loading services/barbers:', error);
      setServices([]);
      setBarbers([]);
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedShop || !selectedService || !selectedBarber || !selectedDate || !selectedTime || !user) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setSubmitting(true);
    setDepositStatusMessage(null);

    try {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const scheduledTime = setMinutes(setHours(selectedDate, hours), minutes);

      const appointmentResponse = await axios.post(`${BACKEND_URL}/api/appointments`, {
        shop_id: selectedShop.shop_id,
        barber_id: selectedBarber.barber_id,
        client_user_id: user.user_id,
        service_id: selectedService.service_id,
        scheduled_time: scheduledTime.toISOString(),
        notes: notes || null,
        deposit_required: depositRequired,
        deposit_amount: depositRequired ? depositAmount : null,
      });

      const appointment = appointmentResponse.data;

      if (depositRequired && depositAmount && appointment?.appointment_id) {
        const depositRes = await axios.post(`${BACKEND_URL}/api/payments/deposits`, {
          appointment_id: appointment.appointment_id,
          client_user_id: user.user_id,
          amount: depositAmount,
          currency: 'USD',
          provider: 'manual',
          metadata: {
            shop_id: selectedShop.shop_id,
            service_id: selectedService.service_id,
          },
        });

        const paymentUrl = depositRes?.data?.payment_url;
        setDepositStatusMessage(
          depositRes?.data?.status === 'paid'
            ? 'Anticipo registrado'
            : 'Anticipo pendiente de pago'
        );

        if (paymentUrl) {
          Alert.alert(
            'Completa tu anticipo',
            'Abre el enlace para pagar el anticipo y asegurar tu cita.',
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Abrir enlace',
                onPress: () => Linking.openURL(paymentUrl),
              },
            ]
          );
        }
      }

      Alert.alert(
        '¡Cita reservada!',
        `Tu cita fue agendada para el ${format(scheduledTime, "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })}`,
        [{ text: 'OK', onPress: () => router.replace('/(client)/appointments') }]
      );
    } catch (error) {
      console.error('Error creating appointment:', error);
      Alert.alert('Error', 'No se pudo crear la cita. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const StepHeader = () => (
    <View style={styles.progressWrapper}>
      {[1, 2, 3, 4].map((s) => (
        <View key={s} style={styles.stepItem}>
          <View style={[styles.stepCircle, step >= s && styles.stepCircleActive]}>
            {step > s ? (
              <Ionicons name="checkmark" size={14} color={palette.background} />
            ) : (
              <Text style={[styles.stepNumber, step >= s && styles.stepNumberActive]}>{s}</Text>
            )}
          </View>
          {s < 4 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
          <Text style={[styles.stepLabel, step >= s && styles.stepLabelActive]}>
            {['Sucursal', 'Servicio', 'Barbero', 'Horario'][s - 1]}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <Card style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Selecciona una barbería</Text>
          <Text style={styles.sectionSubtitle}>Elige el espacio que prefieres para tu sesión</Text>
        </View>
        <Ionicons name="storefront" size={22} color={palette.accentSecondary} />
      </View>
      {loading ? (
        <ActivityIndicator color={palette.accent} />
      ) : barbershops.length === 0 ? (
        <Text style={styles.emptyText}>No hay barberías disponibles</Text>
      ) : (
        barbershops.map((shop) => (
          <TouchableOpacity
            key={shop.shop_id}
            style={[
              styles.optionCard,
              selectedShop?.shop_id === shop.shop_id && styles.optionCardSelected,
            ]}
            onPress={() => setSelectedShop(shop)}
            activeOpacity={0.88}
          >
            <View style={styles.optionHeader}>
              <View style={styles.iconBadge}>
                <Ionicons name="pin" size={16} color={palette.accentSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>{shop.name}</Text>
                <Text style={styles.optionSubtitle}>{shop.address}</Text>
              </View>
              {selectedShop?.shop_id === shop.shop_id && (
                <Ionicons name="checkmark-circle" size={20} color={palette.accent} />
              )}
            </View>
          </TouchableOpacity>
        ))
      )}
      <Button
        title="Continuar"
        onPress={() => setStep(2)}
        variant="primary"
        size="large"
        disabled={!selectedShop}
        style={styles.primaryAction}
      />
    </Card>
  );

  const renderStep2 = () => (
    <Card style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Servicio</Text>
          <Text style={styles.sectionSubtitle}>Define el tipo de servicio y duración</Text>
        </View>
        <Ionicons name="sparkles" size={22} color={palette.accentSecondary} />
      </View>
      {services.length === 0 ? (
        <Text style={styles.emptyText}>Selecciona una barbería para ver servicios.</Text>
      ) : (
        services.map((service) => (
          <TouchableOpacity
            key={service.service_id}
            style={[
              styles.optionCard,
              selectedService?.service_id === service.service_id && styles.optionCardSelected,
            ]}
            onPress={() => setSelectedService(service)}
            activeOpacity={0.88}
          >
            <View style={styles.optionHeader}>
              <View style={[styles.iconBadge, styles.iconBadgeAlt]}>
                <Ionicons name="flash" size={16} color={palette.background} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>{service.name}</Text>
                <Text style={styles.optionSubtitle}>{service.description || 'Servicio personalizado'}</Text>
                <Text style={styles.optionMeta}>{service.duration} min • ${service.price}</Text>
              </View>
              {selectedService?.service_id === service.service_id && (
                <Ionicons name="checkmark-circle" size={20} color={palette.accent} />
              )}
            </View>
          </TouchableOpacity>
        ))
      )}
      <View style={styles.dualActions}>
        <Button title="Atrás" onPress={() => setStep(1)} variant="outline" style={styles.secondaryAction} />
        <Button
          title="Elegir barbero"
          onPress={() => setStep(3)}
          disabled={!selectedService}
          style={styles.primaryAction}
        />
      </View>
    </Card>
  );

  const renderStep3 = () => (
    <Card style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Barbero</Text>
          <Text style={styles.sectionSubtitle}>Selecciona quién llevará tu estilo</Text>
        </View>
        <Ionicons name="people" size={22} color={palette.accentSecondary} />
      </View>
      {barbers.length === 0 ? (
        <Text style={styles.emptyText}>No hay barberos disponibles en este momento.</Text>
      ) : (
        barbers.map((barber) => (
          <TouchableOpacity
            key={barber.barber_id}
            style={[
              styles.optionCard,
              selectedBarber?.barber_id === barber.barber_id && styles.optionCardSelected,
            ]}
            onPress={() => setSelectedBarber(barber)}
            activeOpacity={0.88}
          >
            <View style={styles.optionHeader}>
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={18} color={palette.textPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>Barbero {barber.barber_id.slice(0, 4)}</Text>
                <Text style={styles.optionSubtitle}>{barber.bio || 'Perfil en construcción'}</Text>
                <Text style={styles.optionMeta}>⭐ {barber.rating || 'N/A'} • {barber.specialties?.join(', ')}</Text>
              </View>
              {selectedBarber?.barber_id === barber.barber_id && (
                <Ionicons name="checkmark-circle" size={20} color={palette.accent} />
              )}
            </View>
          </TouchableOpacity>
        ))
      )}
      <View style={styles.dualActions}>
        <Button title="Atrás" onPress={() => setStep(2)} variant="outline" style={styles.secondaryAction} />
        <Button
          title="Elegir horario"
          onPress={() => setStep(4)}
          disabled={!selectedBarber}
          style={styles.primaryAction}
        />
      </View>
    </Card>
  );

  const renderStep4 = () => (
    <Card style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Horario y notas</Text>
          <Text style={styles.sectionSubtitle}>Escoge día, hora y agrega un mensaje</Text>
        </View>
        <Ionicons name="calendar" size={22} color={palette.accentSecondary} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
        {availableDates.map((date) => {
          const formatted = format(date, 'EEE d', { locale: es });
          const isSelected = selectedDate?.toDateString() === date.toDateString();

          return (
            <TouchableOpacity
              key={date.toISOString()}
              style={[styles.dateCard, isSelected && styles.dateCardActive]}
              onPress={() => setSelectedDate(date)}
            >
              <Text style={[styles.dateText, isSelected && styles.dateTextActive]}>{formatted}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.timesGrid}>
        {timeSlots.map((time) => {
          const isActive = selectedTime === time;
          return (
            <TouchableOpacity
              key={time}
              style={[styles.timeSlot, isActive && styles.timeSlotActive]}
              onPress={() => setSelectedTime(time)}
            >
              <Text style={[styles.timeText, isActive && styles.timeTextActive]}>{time}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.depositBox}>
        <View style={styles.depositHeader}>
          <View>
            <Text style={styles.depositTitle}>Anticipo opcional</Text>
            <Text style={styles.depositSubtitle}>
              Paga un depósito para asegurar tu lugar y reducir no-shows.
            </Text>
          </View>
          <Switch
            value={depositRequired}
            onValueChange={setDepositRequired}
            trackColor={{ false: palette.border, true: palette.accentSecondary }}
            thumbColor={depositRequired ? palette.accent : palette.textPrimary}
          />
        </View>

        {depositRequired && (
          <View style={styles.depositDetails}>
            <Text style={styles.depositAmount}>
              Anticipo sugerido: ${depositAmount ?? 0} ({selectedService?.price ? '30% del servicio' : 'ajustable'})
            </Text>
            <Text style={styles.depositHint}>
              El cobro se procesa vía enlace seguro. Puedes pagar más tarde desde tu correo.
            </Text>
          </View>
        )}

        <View style={styles.policyBox}>
          <Ionicons name="time" size={16} color={palette.accentSecondary} />
          <Text style={styles.policyText}>
            Reprogramaciones permitidas hasta 2h antes. Recibirás recordatorios 24h y 2h previas a tu cita.
          </Text>
        </View>

        {depositStatusMessage && <Text style={styles.depositStatus}>{depositStatusMessage}</Text>}
      </View>

      <View style={styles.notesBox}>
        <Text style={styles.notesLabel}>Notas para tu barbero</Text>
        <TouchableOpacity
          style={styles.notesInput}
          activeOpacity={0.9}
          onPress={() =>
            Alert.prompt('Notas', 'Agrega detalles de tu estilo o peticiones especiales', [
              {
                text: 'Cancelar',
                style: 'cancel',
              },
              {
                text: 'Guardar',
                onPress: (value) => setNotes(value || ''),
              },
            ], 'plain-text', notes)
          }
        >
          <Text style={styles.notesValue}>{notes || 'Opcional'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dualActions}>
        <Button title="Atrás" onPress={() => setStep(3)} variant="outline" style={styles.secondaryAction} />
        <Button
          title={submitting ? 'Reservando...' : 'Confirmar cita'}
          onPress={handleConfirmBooking}
          disabled={!selectedDate || !selectedTime || submitting}
          loading={submitting}
          style={styles.primaryAction}
        />
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={palette.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reserva tu cita</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <StepHeader />
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  headerTitle: {
    ...typography.heading,
    fontSize: 18,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  progressWrapper: {
    backgroundColor: palette.surfaceAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
  },
  stepCircle: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
  },
  stepCircleActive: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  stepNumber: {
    color: palette.textSecondary,
    fontWeight: '700',
  },
  stepNumberActive: {
    color: palette.background,
  },
  stepLine: {
    height: 2,
    width: '100%',
    backgroundColor: palette.border,
    marginTop: 8,
    marginBottom: 8,
  },
  stepLineActive: {
    backgroundColor: palette.accent,
  },
  stepLabel: {
    ...typography.body,
    fontSize: 12,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: palette.textPrimary,
    fontWeight: '700',
  },
  sectionCard: {
    gap: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    ...typography.heading,
    fontSize: 18,
  },
  sectionSubtitle: {
    ...typography.body,
    marginTop: 4,
  },
  optionCard: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    padding: 14,
    backgroundColor: palette.surfaceAlt,
    marginTop: 10,
  },
  optionCardSelected: {
    borderColor: palette.accent,
    ...shadows.accent,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionTitle: {
    ...typography.heading,
    fontSize: 16,
  },
  optionSubtitle: {
    ...typography.body,
    marginTop: 2,
  },
  optionMeta: {
    ...typography.body,
    marginTop: 6,
    color: palette.textPrimary,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  iconBadgeAlt: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  dualActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  primaryAction: {
    flex: 1,
  },
  secondaryAction: {
    flex: 1,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  dateScroll: {
    marginVertical: 4,
  },
  dateCard: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: palette.surfaceAlt,
    borderWidth: 1,
    borderColor: palette.border,
    marginRight: 10,
  },
  dateCardActive: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  dateText: {
    ...typography.body,
    color: palette.textSecondary,
  },
  dateTextActive: {
    color: palette.background,
    fontWeight: '700',
  },
  timesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  timeSlot: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: palette.surfaceAlt,
    borderWidth: 1,
    borderColor: palette.border,
    minWidth: '28%',
    alignItems: 'center',
  },
  timeSlotActive: {
    backgroundColor: palette.accentSecondary,
    borderColor: palette.accentSecondary,
  },
  timeText: {
    ...typography.body,
    color: palette.textSecondary,
  },
  timeTextActive: {
    color: palette.background,
    fontWeight: '700',
  },
  notesBox: {
    marginTop: 12,
    gap: 8,
  },
  notesLabel: {
    ...typography.subheading,
    fontSize: 14,
  },
  notesInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceAlt,
    padding: 14,
  },
  notesValue: {
    ...typography.body,
    color: palette.textPrimary,
  },
  depositBox: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  depositHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  depositTitle: {
    ...typography.subtitle,
    color: palette.textPrimary,
  },
  depositSubtitle: {
    ...typography.body,
    color: palette.textSecondary,
    marginTop: 4,
    maxWidth: '85%',
  },
  depositDetails: {
    marginTop: 4,
  },
  depositAmount: {
    ...typography.bodyBold,
    color: palette.accent,
  },
  depositHint: {
    ...typography.caption,
    color: palette.textSecondary,
    marginTop: 4,
  },
  policyBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: `${palette.accentSecondary}11`,
    padding: 10,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: `${palette.accentSecondary}55`,
  },
  policyText: {
    ...typography.caption,
    color: palette.textPrimary,
    flex: 1,
    lineHeight: 16,
  },
  depositStatus: {
    marginTop: 8,
    color: palette.accent,
    ...typography.caption,
  },
  emptyText: {
    ...typography.body,
    color: palette.textSecondary,
    marginTop: 8,
  },
});
