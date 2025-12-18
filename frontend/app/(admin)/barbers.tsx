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
import axios from 'axios';
import { useRouter } from 'expo-router';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { BACKEND_URL } from '../../utils/backendUrl';

interface Barber {
  barber_id: string;
  user_id: string;
  shop_id: string;
  bio: string;
  specialties: string[];
  status: string;
  rating: number;
  total_reviews: number;
}

interface Barbershop {
  shop_id: string;
  name: string;
  address: string;
}

export default function AdminBarbersScreen() {
  const router = useRouter();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [shops, setShops] = useState<Barbershop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);

  const [formUserId, setFormUserId] = useState('');
  const [formBio, setFormBio] = useState('');
  const [formSpecialties, setFormSpecialties] = useState('');

  useEffect(() => {
    loadShops();
  }, []);

  useEffect(() => {
    if (selectedShopId) {
      loadBarbers(selectedShopId);
    } else {
      setBarbers([]);
      setLoading(false);
    }
  }, [selectedShopId]);

  const selectedShopName = useMemo(() => {
    return shops.find((shop) => shop.shop_id === selectedShopId)?.name || '';
  }, [selectedShopId, shops]);

  const loadShops = async () => {
    setLoading(true);
    try {
      const shopsResponse = await axios.get(`${BACKEND_URL}/api/barbershops`);
      setShops(shopsResponse.data);
      if (shopsResponse.data[0]) {
        setSelectedShopId((current) => current || shopsResponse.data[0].shop_id);
      }
    } catch (error) {
      console.error('Error loading barbershops:', error);
      Alert.alert('Error', 'No se pudieron cargar las barberías');
    } finally {
      setLoading(false);
    }
  };

  const loadBarbers = async (shopId: string) => {
    setLoading(true);
    try {
      const barbersResponse = await axios.get(`${BACKEND_URL}/api/barbers`, {
        params: { shop_id: shopId },
      });
      setBarbers(barbersResponse.data);
    } catch (error) {
      console.error('Error loading barbers:', error);
      Alert.alert('Error', 'No se pudieron cargar los barberos');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    if (!selectedShopId) {
      Alert.alert(
        'Crea una barbería',
        'Necesitas una barbería para agregar barberos.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir barberías', onPress: () => router.push('/(admin)/barbershops') },
        ],
      );
      return;
    }

    setEditingBarber(null);
    setFormUserId('');
    setFormBio('');
    setFormSpecialties('');
    setModalVisible(true);
  };

  const openEditModal = (barber: Barber) => {
    setEditingBarber(barber);
    setFormUserId(barber.user_id);
    setFormBio(barber.bio || '');
    setFormSpecialties(barber.specialties?.join(', ') || '');
    setModalVisible(true);
  };

  const saveBarber = async () => {
    if (!selectedShopId) return;

    const trimmedUserId = formUserId.trim();

    const specialties = formSpecialties
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s);

    if (!editingBarber && !trimmedUserId) {
      Alert.alert('Campos requeridos', 'Ingresa el ID de usuario para el barbero.');
      return;
    }

    try {
      if (editingBarber) {
        await axios.put(`${BACKEND_URL}/api/barbers/${editingBarber.barber_id}`, {
          bio: formBio,
          specialties,
        });
        setBarbers((prev) =>
          prev.map((b) =>
            b.barber_id === editingBarber.barber_id ? { ...b, bio: formBio, specialties } : b,
          ),
        );
        Alert.alert('Éxito', 'Barbero actualizado');
      } else {
        const response = await axios.post(`${BACKEND_URL}/api/barbers`, {
          shop_id: selectedShopId,
          user_id: trimmedUserId,
          bio: formBio,
          specialties,
        });
        setBarbers((prev) => [...prev, response.data]);
        Alert.alert('Éxito', 'Barbero agregado');
      }
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el barbero');
    }
  };

  const deleteBarber = (barber: Barber) => {
    Alert.alert('Eliminar Barbero', '¿Estás seguro de eliminar este barbero?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`${BACKEND_URL}/api/barbers/${barber.barber_id}`);
            setBarbers((prev) => prev.filter((b) => b.barber_id !== barber.barber_id));
            Alert.alert('Éxito', 'Barbero eliminado');
          } catch (error) {
            Alert.alert('Error', 'No se pudo eliminar el barbero');
          }
        },
      },
    ]);
  };

  const toggleStatus = async (barber: Barber) => {
    const newStatus = barber.status === 'available' ? 'unavailable' : 'available';
    try {
      await axios.put(`${BACKEND_URL}/api/barbers/${barber.barber_id}`, { status: newStatus });
      setBarbers((prev) =>
        prev.map((b) => (b.barber_id === barber.barber_id ? { ...b, status: newStatus } : b)),
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'available' ? '#10B981' : '#EF4444';
  };

  const renderBarber = ({ item }: { item: Barber }) => (
    <Card style={styles.barberCard}>
      <View style={styles.barberHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={24} color="#FFFFFF" />
          </View>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
        </View>
        <View style={styles.barberInfo}>
          <Text style={styles.barberName}>{selectedShopName}</Text>
          <Text style={styles.barberId}>{item.user_id}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.ratingText}>
              {item.rating.toFixed(1)} ({item.total_reviews})
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => toggleStatus(item)} style={styles.statusToggle}>
          <Ionicons
            name={item.status === 'available' ? 'checkmark-circle' : 'close-circle'}
            size={28}
            color={getStatusColor(item.status)}
          />
        </TouchableOpacity>
      </View>

      {item.bio ? <Text style={styles.bio} numberOfLines={2}>{item.bio}</Text> : null}

      {item.specialties?.length > 0 ? (
        <View style={styles.tags}>
          {item.specialties.slice(0, 3).map((spec, idx) => (
            <View key={idx} style={styles.tag}>
              <Text style={styles.tagText}>{spec}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => openEditModal(item)}>
          <Ionicons name="pencil" size={18} color="#2563EB" />
          <Text style={styles.actionText}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => deleteBarber(item)}>
          <Ionicons name="trash" size={18} color="#EF4444" />
          <Text style={[styles.actionText, { color: '#EF4444' }]}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestión de Barberos</Text>
        <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.shopSelector}>
        <View style={styles.shopSelectorHeader}>
          <Text style={styles.selectorLabel}>Barbería</Text>
          <Button
            title="Gestionar barberías"
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

      {!loading && shops.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Ionicons name="alert-circle" size={28} color="#2563EB" />
          <Text style={styles.emptyTitle}>No hay barberías registradas</Text>
          <Text style={styles.emptySubtitle}>
            Crea una barbería para agregar barberos y asignarlos.
          </Text>
          <Button title="Crear barbería" onPress={() => router.push('/(admin)/barbershops')} />
        </Card>
      ) : null}

      {selectedShopId ? (
        <>
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{barbers.length}</Text>
              <Text style={styles.summaryLabel}>Barberos</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>
                {barbers.filter((b) => b.status === 'available').length}
              </Text>
              <Text style={styles.summaryLabel}>Disponibles</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>
                {barbers.reduce((acc, b) => acc + (b.rating || 0), 0)}
              </Text>
              <Text style={styles.summaryLabel}>Puntuación total</Text>
            </View>
          </View>

          <FlatList
            data={barbers}
            renderItem={renderBarber}
            keyExtractor={(item) => item.barber_id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshing={loading}
            onRefresh={() => selectedShopId && loadBarbers(selectedShopId)}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={64} color="#CBD5E1" />
                <Text style={styles.emptyText}>No hay barberos registrados</Text>
              </View>
            }
          />
        </>
      ) : null}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingBarber ? 'Editar Barbero' : 'Nuevo Barbero'}
            </Text>

            {selectedShopName ? (
              <Text style={styles.selectedShop}>Barbería: {selectedShopName}</Text>
            ) : null}

            {!editingBarber && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ID de Usuario</Text>
                <TextInput
                  style={styles.input}
                  value={formUserId}
                  onChangeText={setFormUserId}
                  placeholder="barber_001"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Biografía</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formBio}
                onChangeText={setFormBio}
                placeholder="Experiencia y descripción..."
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Especialidades</Text>
              <TextInput
                style={styles.input}
                value={formSpecialties}
                onChangeText={setFormSpecialties}
                placeholder="Fade, Pompadour, Barba (separadas por coma)"
              />
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
                onPress={saveBarber}
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
  shopSelector: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  shopSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  shopsScroll: {
    marginTop: 4,
  },
  shopPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    marginRight: 8,
  },
  shopPillActive: {
    backgroundColor: '#2563EB',
  },
  shopPillText: {
    color: '#0F172A',
    fontWeight: '600',
  },
  shopPillTextActive: {
    color: '#FFFFFF',
  },
  noShopPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#475569',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
  },
  list: {
    padding: 16,
  },
  barberCard: {
    marginBottom: 12,
  },
  barberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  barberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  barberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  barberId: {
    fontSize: 12,
    color: '#64748B',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 12,
    color: '#64748B',
  },
  statusToggle: {
    padding: 4,
  },
  bio: {
    fontSize: 14,
    color: '#475569',
    marginTop: 12,
    lineHeight: 20,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: '#2563EB',
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
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 16,
  },
  emptyCard: {
    margin: 16,
    gap: 8,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 8,
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
    marginBottom: 8,
  },
  selectedShop: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 16,
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
    minHeight: 80,
    textAlignVertical: 'top',
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
