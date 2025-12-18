import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { BACKEND_URL } from '../../utils/backendUrl';

interface Service {
  service_id: string;
  shop_id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
}

export default function AdminServicesScreen() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);
  
  // Form fields
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formDuration, setFormDuration] = useState('');

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const shopsResponse = await axios.get(`${BACKEND_URL}/api/barbershops`);
      const shop = shopsResponse.data[0];
      if (shop) {
        setShopId(shop.shop_id);
        const servicesResponse = await axios.get(`${BACKEND_URL}/api/services`, {
          params: { shop_id: shop.shop_id }
        });
        setServices(servicesResponse.data);
      }
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
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
    if (!shopId || !formName || !formPrice) {
      Alert.alert('Error', 'Completa los campos requeridos');
      return;
    }
    
    const serviceData = {
      name: formName,
      description: formDescription,
      price: parseFloat(formPrice),
      duration: parseInt(formDuration) || 30
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
          shop_id: shopId,
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
        <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{services.length}</Text>
          <Text style={styles.summaryLabel}>Servicios</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>
            ${services.length > 0 ? Math.min(...services.map(s => s.price)) : 0}
          </Text>
          <Text style={styles.summaryLabel}>Desde</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>
            ${services.length > 0 ? Math.max(...services.map(s => s.price)) : 0}
          </Text>
          <Text style={styles.summaryLabel}>Hasta</Text>
        </View>
      </View>

      <FlatList
        data={services}
        renderItem={renderService}
        keyExtractor={(item) => item.service_id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="list-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyText}>No hay servicios registrados</Text>
            <Button title="Agregar Servicio" onPress={openCreateModal} variant="primary" />
          </View>
        }
      />

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
            </Text>

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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
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
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  serviceDescription: {
    fontSize: 14,
    color: '#64748B',
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
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  actions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
