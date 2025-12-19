import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { BACKEND_URL } from '../../utils/backendUrl';
import { palette, typography, shadows } from '../../styles/theme';

interface Barbershop {
  shop_id: string;
  owner_user_id: string;
  name: string;
  address: string;
  phone: string;
  description?: string;
  working_hours?: Record<string, any>;
}

export default function AdminBarbershopsScreen() {
  const { user } = useAuth();
  const [shops, setShops] = useState<Barbershop[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingShop, setEditingShop] = useState<Barbershop | null>(null);

  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDescription, setFormDescription] = useState('');

  useEffect(() => {
    loadShops();
  }, []);

  const loadShops = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/barbershops`);
      setShops(response.data);
    } catch (error) {
      console.error('Error loading barbershops:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingShop(null);
    setFormName('');
    setFormAddress('');
    setFormPhone('');
    setFormDescription('');
    setModalVisible(true);
  };

  const openEditModal = (shop: Barbershop) => {
    setEditingShop(shop);
    setFormName(shop.name);
    setFormAddress(shop.address);
    setFormPhone(shop.phone);
    setFormDescription(shop.description || '');
    setModalVisible(true);
  };

  const saveShop = async () => {
    if (!formName || !formAddress || !formPhone) {
      Alert.alert('Campos requeridos', 'Completa el nombre, dirección y teléfono.');
      return;
    }

    const payload = {
      name: formName,
      address: formAddress,
      phone: formPhone,
      description: formDescription,
      owner_user_id: editingShop?.owner_user_id || user?.user_id || `owner_${Date.now()}`,
      working_hours: editingShop?.working_hours || {},
    };

    try {
      if (editingShop) {
        const response = await axios.put(
          `${BACKEND_URL}/api/barbershops/${editingShop.shop_id}`,
          payload,
        );
        setShops(shops.map((shop) => (shop.shop_id === editingShop.shop_id ? response.data : shop)));
        Alert.alert('Éxito', 'Barbería actualizada');
      } else {
        const response = await axios.post(`${BACKEND_URL}/api/barbershops`, payload);
        setShops([...shops, response.data]);
        Alert.alert('Éxito', 'Barbería creada');
      }
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la barbería');
    }
  };

  const renderShop = ({ item }: { item: Barbershop }) => (
    <Card style={styles.shopCard}>
      <View style={styles.shopHeader}>
        <View style={styles.iconContainer}>
          <Ionicons name="business" size={22} color={palette.accent} />
        </View>
        <View style={styles.shopInfo}>
          <Text style={styles.shopName}>{item.name}</Text>
          <Text style={styles.shopAddress}>{item.address}</Text>
          <Text style={styles.shopPhone}>{item.phone}</Text>
        </View>
        <TouchableOpacity onPress={() => openEditModal(item)}>
          <Ionicons name="pencil" size={20} color={palette.accent} />
        </TouchableOpacity>
      </View>
      {item.description ? (
        <Text style={styles.shopDescription}>{item.description}</Text>
      ) : null}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="person" size={16} color={palette.textSecondary} />
          <Text style={styles.metaText}>{item.owner_user_id}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time" size={16} color={palette.textSecondary} />
          <Text style={styles.metaText}>Horario configurado</Text>
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Barberías</Text>
        <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{shops.length}</Text>
          <Text style={styles.summaryLabel}>Registradas</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{shops.filter((s) => s.description).length}</Text>
          <Text style={styles.summaryLabel}>Con descripción</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{shops.filter((s) => s.working_hours && Object.keys(s.working_hours).length > 0).length}</Text>
          <Text style={styles.summaryLabel}>Con horario</Text>
        </View>
      </View>

      {!loading && shops.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Ionicons name="alert-circle" size={28} color={palette.accent} />
          <Text style={styles.emptyTitle}>Aún no hay barberías</Text>
          <Text style={styles.emptySubtitle}>Crea tu primera sucursal para habilitar barberos y servicios.</Text>
          <Button title="Crear barbería" onPress={openCreateModal} />
        </Card>
      ) : (
        <FlatList
          data={shops}
          keyExtractor={(item) => item.shop_id}
          renderItem={renderShop}
          contentContainerStyle={styles.listContent}
        />
      )}

      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingShop ? 'Editar barbería' : 'Nueva barbería'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={palette.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Nombre"
              value={formName}
              onChangeText={setFormName}
            />
            <TextInput
              style={styles.input}
              placeholder="Dirección"
              value={formAddress}
              onChangeText={setFormAddress}
            />
            <TextInput
              style={styles.input}
              placeholder="Teléfono"
              value={formPhone}
              onChangeText={setFormPhone}
              keyboardType="phone-pad"
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descripción"
              value={formDescription}
              onChangeText={setFormDescription}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <Button title="Guardar" onPress={saveShop} />
              <Button
                title="Cancelar"
                onPress={() => setModalVisible(false)}
                variant="secondary"
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
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    ...typography.heading,
    fontSize: 22,
  },
  addButton: {
    backgroundColor: palette.accent,
    borderRadius: 12,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
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
    fontSize: 22,
  },
  summaryLabel: {
    ...typography.body,
    fontSize: 12,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: palette.border,
  },
  emptyCard: {
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    ...typography.heading,
    fontSize: 18,
  },
  emptySubtitle: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: 8,
  },
  listContent: {
    paddingBottom: 24,
    gap: 12,
  },
  shopCard: {
    padding: 16,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.soft,
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: palette.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  shopInfo: {
    flex: 1,
    gap: 2,
  },
  shopName: {
    ...typography.heading,
    fontSize: 18,
  },
  shopAddress: {
    ...typography.body,
  },
  shopPhone: {
    ...typography.label,
    color: palette.textPrimary,
  },
  shopDescription: {
    ...typography.body,
    color: palette.textSecondary,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    ...typography.body,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    ...typography.heading,
    fontSize: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    backgroundColor: palette.backgroundAlt,
  },
  textArea: {
    height: 96,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
});
