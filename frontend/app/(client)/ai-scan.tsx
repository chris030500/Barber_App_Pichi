import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

export default function AIScanScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<string | null>(null);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permiso denegado', 'Necesitas dar permiso para usar la cámara');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
      analyzeImage(result.assets[0].base64);
    }
  };

  const pickFromGallery = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permiso denegado', 'Necesitas dar permiso para acceder a tus fotos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
      analyzeImage(result.assets[0].base64);
    }
  };

  const analyzeImage = async (base64Image: string) => {
    setAnalyzing(true);
    setRecommendations(null);
    
    try {
      // Placeholder for Gemini 2.5 Flash integration
      // Will be implemented when Emergent LLM key is integrated
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      Alert.alert(
        'IA en configuración',
        'La integración con Gemini 2.5 Flash se activará próximamente para analizar tu rostro y recomendar estilos de corte'
      );
      
      // Mock recommendations
      setRecommendations(
        'Basado en la forma de tu rostro, te recomendamos:\n\n' +
        '• Fade clásico con largo en la parte superior\n' +
        '• Undercut moderno\n' +
        '• Corte texturizado con flequillo lateral\n\n' +
        'Estos estilos complementarán mejor tus rasgos faciales.'
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo analizar la imagen');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Escaneo IA Facial</Text>
        <Text style={styles.subtitle}>
          Usa IA para recibir recomendaciones de cortes personalizadas
        </Text>
      </View>

      <View style={styles.content}>
        {!image ? (
          <Card style={styles.uploadCard}>
            <Ionicons name="camera" size={80} color="#CBD5E1" />
            <Text style={styles.uploadTitle}>Captura tu rostro</Text>
            <Text style={styles.uploadText}>
              Toma una foto frontal para obtener recomendaciones personalizadas
            </Text>
            <View style={styles.uploadButtons}>
              <Button
                title="Tomar Foto"
                onPress={pickImage}
                variant="primary"
                size="large"
                style={styles.uploadButton}
              />
              <Button
                title="Elegir de Galería"
                onPress={pickFromGallery}
                variant="outline"
                size="large"
                style={styles.uploadButton}
              />
            </View>
          </Card>
        ) : (
          <View style={styles.resultContainer}>
            <Card style={styles.imageCard}>
              <Image source={{ uri: image }} style={styles.image} />
            </Card>

            {analyzing && (
              <Card style={styles.analyzingCard}>
                <Ionicons name="sync" size={40} color="#2563EB" />
                <Text style={styles.analyzingText}>Analizando tu rostro...</Text>
              </Card>
            )}

            {recommendations && (
              <Card style={styles.recommendationsCard}>
                <View style={styles.recommendationsHeader}>
                  <Ionicons name="sparkles" size={24} color="#2563EB" />
                  <Text style={styles.recommendationsTitle}>Recomendaciones</Text>
                </View>
                <Text style={styles.recommendationsText}>{recommendations}</Text>
              </Card>
            )}

            <Button
              title="Escanear otra foto"
              onPress={() => {
                setImage(null);
                setRecommendations(null);
              }}
              variant="outline"
              size="medium"
            />
          </View>
        )}

        <Card style={styles.noticeCard}>
          <Ionicons name="information-circle" size={20} color="#F59E0B" />
          <Text style={styles.noticeText}>
            Esta funcionalidad usará Gemini 2.5 Flash con Emergent LLM key
          </Text>
        </Card>
      </View>
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  uploadCard: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  uploadTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  uploadText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  uploadButtons: {
    width: '100%',
    gap: 12,
  },
  uploadButton: {
    width: '100%',
  },
  resultContainer: {
    gap: 16,
  },
  imageCard: {
    padding: 0,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  analyzingCard: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  analyzingText: {
    fontSize: 16,
    color: '#2563EB',
    marginTop: 12,
    fontWeight: '500',
  },
  recommendationsCard: {
    backgroundColor: '#EFF6FF',
  },
  recommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  recommendationsText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FEF3C7',
    marginTop: 'auto',
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
});
