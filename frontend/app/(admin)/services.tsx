import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { BACKEND_URL } from '../../utils/backendUrl';
import { palette, typography, shadows } from '../../styles/theme';

interface Service {
  service_id: string;
  shop_id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
}

interface Barbershop {
  shop_id: string;
  name: string;
  address?: string;
}

export default function AdminServicesScreen() {
  const router = useRouter();
  const [shops, setShops] = useState<Barbershop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formDuration, setFormDuration] = useState('');

  useEffect(() => {
    loadShops();
  }, []);

  useEffect(() => {
    if (selectedShopId) {
      loadServices(selectedShopId);
    } else {
      setServices([]);
      setLoading(false);
    }
  }, [selectedShopId]);

  const selectedShopName = useMemo(
    () => shops.find((shop) => shop.shop_id === selectedShopId)?.name || '',
    [selectedShopId, shops],
  );

  const loadShops = async () => {
    try {
      const shopsResponse = await axios.get(`${BACKEND_URL}/api/barbershops`);
      setShops(shopsResponse.data);
      if (shopsResponse.data[0]) {
        setSelectedShopId((current) => current || shopsResponse.data[0].shop_id);
      }
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async (shopId: string) => {
    setLoading(true);
    try {
      const servicesResponse = await axios.get(`${BACKEND_URL}/api/services`, {
        params: { shop_id: shopId },
      });
      setServices(servicesResponse.data);
    } catch (error) {
      console.error('Error loading services:', error);
      Alert.alert('Error', 'No se pudieron cargar los servicios');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    if (!selectedShopId) {
      Alert.alert(
        'Crea una barbería',
        'Necesitas una barbería antes de agregar servicios.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir barberías', onPress: () => router.push('/(admin)/barbershops') },
        ],
      );
      return;
    }

    setEditingService(null);
    setFormName('');
    setFormDescription('');
    setFormPrice('');
    setFormDuration('30');
    setModalVisible(true);
  };

  const openEditModal = (service: Service) => {
    setEditingService(service);
    setFormName(service.name);
    setFormDescription(service.description || '');
    setFormPrice(service.price.toString());
    setFormDuration(service.duration.toString());
    setModalVisible(true);
  };

  const saveService = async () => {
    if (!selectedShopId || !formName || !formPrice) {
      Alert.alert('Error', 'Completa los campos requeridos');
      return;
    }

    const serviceData = {
      name: formName,
      description: formDescription,
      price: parseFloat(formPrice),
      duration: parseInt(formDuration) || 30,
    };

    try {
      if (editingService) {
        await axios.put(`${BACKEND_URL}/api/services/${editingService.service_id}`, serviceData);
        setServices(services.map(s =>
          s.service_id === editingService.service_id
            ? { ...s, ...serviceData }
            : s
        ));
        Alert.alert('Éxito', 'Servicio actualizado');
      } else {
        const response = await axios.post(`${BACKEND_URL}/api/services`, {
          shop_id: selectedShopId,
          ...serviceData
        });
        setServices([...services, response.data]);
        Alert.alert('Éxito', 'Servicio creado');
      }
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el servicio');
    }
  };

  const deleteService = (service: Service) => {
    Alert.alert(
      'Eliminar Servicio',
      `¿Estás seguro de eliminar "${service.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${BACKEND_URL}/api/services/${service.service_id}`);
              setServices(services.filter(s => s.service_id !== service.service_id));
              Alert.alert('Éxito', 'Servicio eliminado');
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el servicio');
            }
          }
        }
      ]
    );
  };

  const renderService = ({ item }: { item: Service }) => (
    <Card style={styles.serviceCard}>
      <View style={styles.serviceHeader}>
        <View style={styles.iconContainer}>
          <Ionicons name="cut" size={24} color="#2563EB" />
        </View>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{item.name}</Text>
          {item.description && (
            <Text style={styles.serviceDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detail}>
          <Ionicons name="cash-outline" size={18} color="#10B981" />
          <Text style={styles.detailText}>${item.price}</Text>
        </View>
        <View style={styles.detail}>
          <Ionicons name="time-outline" size={18} color="#F59E0B" />
          <Text style={styles.detailText}>{item.duration} min</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => openEditModal(item)}>
          <Ionicons name="pencil" size={18} color="#2563EB" />
          <Text style={styles.actionText}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => deleteService(item)}>
          <Ionicons name="trash" size={18} color="#EF4444" />
          <Text style={[styles.actionText, { color: '#EF4444' }]}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestión de Servicios</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.addButton, styles.secondaryButton]}
            onPress={() => router.push('/(admin)/barbershops')}
          >
            <Ionicons name="business" size={18} color="#2563EB" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.shopSelector}>
        <View style={styles.shopSelectorHeader}>
          <Text style={styles.selectorLabel}>Barbería</Text>
          <Button
            title="Gestionar"
            variant="secondary"
            size="small"
            onPress={() => router.push('/(admin)/barbershops')}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.shopsScroll}>
          {shops.map((shop) => (
            <TouchableOpacity
              key={shop.shop_id}
              style={[
                styles.shopPill,
                selectedShopId === shop.shop_id && styles.shopPillActive,
              ]}
              onPress={() => setSelectedShopId(shop.shop_id)}
            >
              <Text
                style={[
                  styles.shopPillText,
                  selectedShopId === shop.shop_id && styles.shopPillTextActive,
                ]}
              >
                {shop.name}
              </Text>
            </TouchableOpacity>
          ))}
          {shops.length === 0 && !loading ? (
            <View style={styles.noShopPill}>
              <Text style={styles.shopPillText}>Crea una barbería para empezar</Text>
            </View>
          ) : null}
        </ScrollView>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{services.length}</Text>
          <Text style={styles.summaryLabel}>Servicios</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>
            {services.length > 0 ? `$${Math.min(...services.map(s => s.price))}` : '—'}
          </Text>
          <Text style={styles.summaryLabel}>Desde</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>
            {services.length > 0 ? `$${Math.max(...services.map(s => s.price))}` : '—'}
          </Text>
          <Text style={styles.summaryLabel}>Hasta</Text>
        </View>
      </View>

      {!loading && shops.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Ionicons name="alert-circle" size={28} color={palette.accent} />
          <Text style={styles.emptyTitle}>No hay barberías registradas</Text>
          <Text style={styles.emptySubtitle}>
            Crea una barbería para agregar y asignar servicios.
          </Text>
          <Button title="Crear barbería" onPress={() => router.push('/(admin)/barbershops')} />
        </Card>
      ) : null}

      {selectedShopId ? (
        <FlatList
          data={services}
          renderItem={renderService}
          keyExtractor={(item) => item.service_id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={() => selectedShopId && loadServices(selectedShopId)}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="list-outline" size={64} color="#CBD5E1" />
              <Text style={styles.emptyText}>No hay servicios registrados</Text>
              <Button title="Agregar Servicio" onPress={openCreateModal} variant="primary" />
            </View>
          }
        />
      ) : null}

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
            </Text>

            {selectedShopName ? (
              <Text style={styles.selectedShop}>Barbería: {selectedShopName}</Text>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nombre *</Text>
              <TextInput
                style={styles.input}
                value={formName}
                onChangeText={setFormName}
                placeholder="Corte Clásico"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Descripción</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formDescription}
                onChangeText={setFormDescription}
                placeholder="Descripción del servicio..."
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Precio *</Text>
                <TextInput
                  style={styles.input}
                  value={formPrice}
                  onChangeText={setFormPrice}
                  placeholder="150"
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>Duración (min)</Text>
                <TextInput
                  style={styles.input}
                  value={formDuration}
                  onChangeText={setFormDuration}
                  placeholder="30"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Cancelar"
                onPress={() => setModalVisible(false)}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title="Guardar"
                onPress={saveService}
                variant="primary"
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
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
    fontSize: 22,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: palette.backgroundAlt,
    borderWidth: 1,
    borderColor: palette.border,
  },
  shopSelector: {
    padding: 16,
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    gap: 8,
  },
  shopSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorLabel: {
    ...typography.heading,
    fontSize: 16,
  },
  shopsScroll: {
    marginTop: 4,
  },
  shopPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: palette.backgroundAlt,
    marginRight: 8,
  },
  shopPillActive: {
    backgroundColor: palette.accent,
  },
  shopPillText: {
    ...typography.label,
    color: palette.textPrimary,
  },
  shopPillTextActive: {
    color: '#FFFFFF',
  },
  noShopPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: palette.backgroundAlt,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: palette.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.soft,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    ...typography.heading,
    fontSize: 20,
  },
  summaryLabel: {
    ...typography.body,
    fontSize: 12,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: palette.border,
    height: '100%',
  },
  list: {
    padding: 16,
  },
  serviceCard: {
    marginBottom: 12,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: palette.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  serviceName: {
    ...typography.heading,
    fontSize: 16,
  },
  serviceDescription: {
    ...typography.body,
    marginTop: 4,
    lineHeight: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 24,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    ...typography.label,
    color: palette.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    ...typography.label,
    color: palette.accent,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  emptyText: {
    ...typography.body,
    fontSize: 16,
  },
  emptyCard: {
    margin: 16,
    gap: 8,
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.soft,
  },
  emptyTitle: {
    ...typography.heading,
    fontSize: 18,
  },
  emptySubtitle: {
    ...typography.body,
    color: palette.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: palette.border,
  },
  modalTitle: {
    ...typography.heading,
    fontSize: 20,
    marginBottom: 24,
  },
  selectedShop: {
    ...typography.body,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    ...typography.label,
    color: palette.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: palette.backgroundAlt,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
  },
});
