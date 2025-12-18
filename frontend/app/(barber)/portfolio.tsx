import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { BACKEND_URL } from '../../utils/backendUrl';

interface PortfolioImage {
  url: string;
  description?: string;
}

export default function BarberPortfolioScreen() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioImage[]>([]);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPortfolio();
    }
  }, [user]);

  const loadPortfolio = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/barbers?user_id=${user?.user_id}`);
      if (response.data && response.data.length > 0) {
        const barber = response.data[0];
        setBarberId(barber.barber_id);
        setPortfolio(barber.portfolio || []);
      }
    } catch (error) {
      console.error('Error loading portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  const addImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permiso denegado', 'Necesitas dar permiso para acceder a tus fotos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const newImage: PortfolioImage = {
        url: `data:image/jpeg;base64,${result.assets[0].base64}`,
        description: 'Nuevo trabajo'
      };
      
      const updatedPortfolio = [...portfolio, newImage];
      setPortfolio(updatedPortfolio);
      
      // Save to backend
      if (barberId) {
        try {
          await axios.put(`${BACKEND_URL}/api/barbers/${barberId}`, {
            portfolio: updatedPortfolio
          });
          Alert.alert('Éxito', 'Imagen agregada al portafolio');
        } catch (error) {
          Alert.alert('Error', 'No se pudo guardar la imagen');
        }
      }
    }
  };

  const removeImage = (index: number) => {
    Alert.alert(
      'Eliminar imagen',
      '¿Estás seguro de eliminar esta imagen del portafolio?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const updatedPortfolio = portfolio.filter((_, i) => i !== index);
            setPortfolio(updatedPortfolio);
            
            if (barberId) {
              try {
                await axios.put(`${BACKEND_URL}/api/barbers/${barberId}`, {
                  portfolio: updatedPortfolio
                });
              } catch (error) {
                console.error('Error removing image:', error);
              }
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mi Portafolio</Text>
        <Text style={styles.subtitle}>Muestra tus mejores trabajos</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Add Image Button */}
        <TouchableOpacity style={styles.addButton} onPress={addImage}>
          <Ionicons name="add-circle-outline" size={32} color="#2563EB" />
          <Text style={styles.addButtonText}>Agregar Foto</Text>
        </TouchableOpacity>

        {/* Portfolio Grid */}
        {portfolio.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="images-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Tu portafolio está vacío</Text>
            <Text style={styles.emptyText}>
              Agrega fotos de tus mejores trabajos para que los clientes vean tu estilo
            </Text>
          </Card>
        ) : (
          <View style={styles.grid}>
            {portfolio.map((item, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri: item.url }} style={styles.portfolioImage} />
                <TouchableOpacity 
                  style={styles.removeButton}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Tips Card */}
        <Card style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb-outline" size={20} color="#F59E0B" />
            <Text style={styles.tipsTitle}>Consejos para tu portafolio</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.tipText}>Usa fotos con buena iluminación</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.tipText}>Muestra variedad de estilos</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.tipText}>Incluye tus especialidades</Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#BFDBFE',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  imageContainer: {
    position: 'relative',
    width: '48%',
  },
  portfolioImage: {
    width: '100%',
    aspectRatio: 0.8,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  tipsCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    marginTop: 8,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  tipText: {
    fontSize: 13,
    color: '#78350F',
  },
});
