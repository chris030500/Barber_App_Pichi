import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import Constants from 'expo-constants';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

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
  
  // Data
  const [barbershops, setBarbershops] = useState<Barbershop[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  
  // Selections
  const [selectedShop, setSelectedShop] = useState<Barbershop | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // Generate next 7 days
  const availableDates = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));
  
  // Available time slots
  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00'
  ];

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedShop) {
      loadServicesAndBarbers();
    }
  }, [selectedShop]);

  const loadInitialData = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/barbershops`);
      setBarbershops(response.data);
      
      // If shop_id passed as param, auto-select it
      if (params.shop_id) {
        const shop = response.data.find((s: Barbershop) => s.shop_id === params.shop_id);
        if (shop) {
          setSelectedShop(shop);
          setStep(2);
        }
      }
    } catch (error) {
      console.error('Error loading barbershops:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadServicesAndBarbers = async () => {
    if (!selectedShop) return;
    
    try {
      const [servicesRes, barbersRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/services`, { params: { shop_id: selectedShop.shop_id } }),
        axios.get(`${BACKEND_URL}/api/barbers`, { params: { shop_id: selectedShop.shop_id } })
      ]);
      
      setServices(servicesRes.data);
      setBarbers(barbersRes.data.filter((b: Barber) => b.status === 'available'));
    } catch (error) {
      console.error('Error loading services/barbers:', error);
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedShop || !selectedService || !selectedBarber || !selectedDate || !selectedTime || !user) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setSubmitting(true);
    
    try {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const scheduledTime = setMinutes(setHours(selectedDate, hours), minutes);
      
      await axios.post(`${BACKEND_URL}/api/appointments`, {
        shop_id: selectedShop.shop_id,
        barber_id: selectedBarber.barber_id,
        client_user_id: user.user_id,
        service_id: selectedService.service_id,
        scheduled_time: scheduledTime.toISOString(),
        notes: notes || null
      });
      
      Alert.alert(
        '¡Cita Reservada!',
        `Tu cita ha sido agendada para el ${format(scheduledTime, "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })}`,
        [{ text: 'OK', onPress: () => router.replace('/(client)/appointments') }]
      );
    } catch (error) {
      console.error('Error creating appointment:', error);
      Alert.alert('Error', 'No se pudo crear la cita. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4].map((s) => (
        <View key={s} style={styles.stepRow}>
          <View style={[styles.stepCircle, step >= s && styles.stepCircleActive]}>
            {step > s ? (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            ) : (
              <Text style={[styles.stepNumber, step >= s && styles.stepNumberActive]}>{s}</Text>
            )}
          </View>
          {s < 4 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Selecciona una Barbería</Text>
      {barbershops.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>No hay barberías disponibles</Text>
        </Card>
      ) : (
        barbershops.map((shop) => (
          <TouchableOpacity
            key={shop.shop_id}
            style={[styles.optionCard, selectedShop?.shop_id === shop.shop_id && styles.optionCardSelected]}
            onPress={() => setSelectedShop(shop)}
          >
            <View style={styles.optionContent}>
              <Ionicons name="storefront" size={24} color={selectedShop?.shop_id === shop.shop_id ? '#2563EB' : '#64748B'} />
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, selectedShop?.shop_id === shop.shop_id && styles.optionTitleSelected]}>
                  {shop.name}
                </Text>
                <Text style={styles.optionSubtitle}>{shop.address}</Text>
              </View>
            </View>
            {selectedShop?.shop_id === shop.shop_id && (
              <Ionicons name="checkmark-circle" size={24} color="#2563EB" />
            )}
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Selecciona un Servicio</Text>
      {services.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>No hay servicios disponibles</Text>
        </Card>
      ) : (
        services.map((service) => (
          <TouchableOpacity
            key={service.service_id}
            style={[styles.optionCard, selectedService?.service_id === service.service_id && styles.optionCardSelected]}
            onPress={() => setSelectedService(service)}
          >
            <View style={styles.optionContent}>
              <Ionicons name="cut" size={24} color={selectedService?.service_id === service.service_id ? '#2563EB' : '#64748B'} />
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, selectedService?.service_id === service.service_id && styles.optionTitleSelected]}>
                  {service.name}
                </Text>
                <Text style={styles.optionSubtitle}>
                  ${service.price} • {service.duration} min
                </Text>
              </View>
            </View>
            {selectedService?.service_id === service.service_id && (
              <Ionicons name="checkmark-circle" size={24} color="#2563EB" />
            )}
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Selecciona un Barbero</Text>
      {barbers.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Ionicons name="person-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>No hay barberos disponibles</Text>
        </Card>
      ) : (
        barbers.map((barber) => (
          <TouchableOpacity
            key={barber.barber_id}
            style={[styles.optionCard, selectedBarber?.barber_id === barber.barber_id && styles.optionCardSelected]}
            onPress={() => setSelectedBarber(barber)}
          >
            <View style={styles.optionContent}>
              <View style={styles.barberAvatar}>
                <Ionicons name="person" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, selectedBarber?.barber_id === barber.barber_id && styles.optionTitleSelected]}>
                  Barbero
                </Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color="#F59E0B" />
                  <Text style={styles.ratingText}>{barber.rating.toFixed(1)}</Text>
                </View>
                {barber.specialties.length > 0 && (
                  <Text style={styles.specialties}>{barber.specialties.slice(0, 2).join(', ')}</Text>
                )}
              </View>
            </View>
            {selectedBarber?.barber_id === barber.barber_id && (
              <Ionicons name="checkmark-circle" size={24} color="#2563EB" />
            )}
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Selecciona Fecha y Hora</Text>
      
      <Text style={styles.sectionLabel}>Fecha</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datesScroll}>
        {availableDates.map((date) => {
          const isSelected = selectedDate && format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
          return (
            <TouchableOpacity
              key={date.toISOString()}
              style={[styles.dateCard, isSelected && styles.dateCardSelected]}
              onPress={() => setSelectedDate(date)}
            >
              <Text style={[styles.dateDay, isSelected && styles.dateDaySelected]}>
                {format(date, 'EEE', { locale: es })}
              </Text>
              <Text style={[styles.dateNumber, isSelected && styles.dateNumberSelected]}>
                {format(date, 'd')}
              </Text>
              <Text style={[styles.dateMonth, isSelected && styles.dateMonthSelected]}>
                {format(date, 'MMM', { locale: es })}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={styles.sectionLabel}>Hora</Text>
      <View style={styles.timeSlotsGrid}>
        {timeSlots.map((time) => (
          <TouchableOpacity
            key={time}
            style={[styles.timeSlot, selectedTime === time && styles.timeSlotSelected]}
            onPress={() => setSelectedTime(time)}
          >
            <Text style={[styles.timeSlotText, selectedTime === time && styles.timeSlotTextSelected]}>
              {time}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nueva Cita</Text>
        <View style={{ width: 40 }} />
      </View>

      {renderStepIndicator()}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </ScrollView>

      <View style={styles.footer}>
        {step > 1 && (
          <Button
            title="Atrás"
            onPress={() => setStep(step - 1)}
            variant="outline"
            style={styles.footerButton}
          />
        )}
        {step < 4 ? (
          <Button
            title="Continuar"
            onPress={() => setStep(step + 1)}
            variant="primary"
            disabled={
              (step === 1 && !selectedShop) ||
              (step === 2 && !selectedService) ||
              (step === 3 && !selectedBarber)
            }
            style={[styles.footerButton, step === 1 && styles.footerButtonFull]}
          />
        ) : (
          <Button
            title={submitting ? 'Reservando...' : 'Confirmar Cita'}
            onPress={handleConfirmBooking}
            variant="primary"
            disabled={!selectedDate || !selectedTime || submitting}
            style={styles.footerButton}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#2563EB',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#2563EB',
  },
  scrollView: {
    flex: 1,
  },
  stepContent: {
    padding: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  optionCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionText: {
    marginLeft: 12,
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  optionTitleSelected: {
    color: '#2563EB',
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  barberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 4,
  },
  specialties: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 12,
    marginTop: 8,
  },
  datesScroll: {
    marginBottom: 16,
  },
  dateCard: {
    width: 70,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    marginRight: 10,
  },
  dateCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#2563EB',
  },
  dateDay: {
    fontSize: 12,
    color: '#64748B',
    textTransform: 'capitalize',
  },
  dateDaySelected: {
    color: '#BFDBFE',
  },
  dateNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginVertical: 4,
  },
  dateNumberSelected: {
    color: '#FFFFFF',
  },
  dateMonth: {
    fontSize: 12,
    color: '#64748B',
    textTransform: 'capitalize',
  },
  dateMonthSelected: {
    color: '#BFDBFE',
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeSlot: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timeSlotSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  timeSlotText: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  timeSlotTextSelected: {
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  footerButton: {
    flex: 1,
  },
  footerButtonFull: {
    flex: 1,
  },
});
