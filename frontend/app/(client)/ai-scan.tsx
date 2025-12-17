import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert, 
  Image, 
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';

const { width: screenWidth } = Dimensions.get('window');

const API_URL = Constants.expoConfig?.extra?.backendUrl || 
                process.env.EXPO_PUBLIC_BACKEND_URL || 
                'https://clipcraft-236.preview.emergentagent.com';

interface HaircutStyle {
  name: string;
  description: string;
  reference_image?: string;
}

interface AIScanResult {
  success: boolean;
  face_shape?: string;
  recommendations: HaircutStyle[];
  detailed_analysis?: string;
  error?: string;
}

interface GeneratedImage {
  style: string;
  image_base64: string;
}

export default function AIScanScreen() {
  const { user } = useAuth();
  const [userImage, setUserImage] = useState<string | null>(null);
  const [userImageBase64, setUserImageBase64] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AIScanResult | null>(null);
  const [generatingImage, setGeneratingImage] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permiso denegado', 'Necesitas dar permiso para usar la cámara');
      return;
    }

    const imageResult = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!imageResult.canceled && imageResult.assets[0].base64) {
      const base64Image = imageResult.assets[0].base64;
      setUserImage(`data:image/jpeg;base64,${base64Image}`);
      setUserImageBase64(base64Image);
      analyzeImage(base64Image);
    }
  };

  const pickFromGallery = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permiso denegado', 'Necesitas dar permiso para acceder a tus fotos');
      return;
    }

    const imageResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!imageResult.canceled && imageResult.assets[0].base64) {
      const base64Image = imageResult.assets[0].base64;
      setUserImage(`data:image/jpeg;base64,${base64Image}`);
      setUserImageBase64(base64Image);
      analyzeImage(base64Image);
    }
  };

  const analyzeImage = async (base64Image: string) => {
    setAnalyzing(true);
    setResult(null);
    setGeneratedImages([]);
    
    try {
      // Use the v2 endpoint that includes reference images
      const response = await fetch(`${API_URL}/api/ai-scan-v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: base64Image,
          user_id: user?.user_id || null,
        }),
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data: AIScanResult = await response.json();
      
      if (data.success) {
        setResult(data);
      } else {
        Alert.alert('Error', data.error || 'No se pudo analizar la imagen');
        setResult(data);
      }
    } catch (error: any) {
      console.error('Error analyzing image:', error);
      Alert.alert('Error de conexión', 'No se pudo conectar con el servidor de IA.');
      setResult({ success: false, recommendations: [], error: error.message });
    } finally {
      setAnalyzing(false);
    }
  };

  const generatePersonalizedImage = async (styleName: string) => {
    if (!userImageBase64) {
      Alert.alert('Error', 'Primero debes tomar o seleccionar una foto');
      return;
    }

    // Check if already generated
    const existing = generatedImages.find(g => g.style === styleName);
    if (existing) {
      setSelectedImage(`data:image/png;base64,${existing.image_base64}`);
      setModalVisible(true);
      return;
    }

    setGeneratingImage(styleName);
    
    try {
      const response = await fetch(`${API_URL}/api/generate-haircut-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_image_base64: userImageBase64,
          haircut_style: styleName,
        }),
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      
      if (data.success && data.generated_image_base64) {
        const newGenerated: GeneratedImage = {
          style: styleName,
          image_base64: data.generated_image_base64
        };
        setGeneratedImages(prev => [...prev, newGenerated]);
        setSelectedImage(`data:image/png;base64,${data.generated_image_base64}`);
        setModalVisible(true);
      } else {
        Alert.alert('Error', data.error || 'No se pudo generar la imagen');
      }
    } catch (error: any) {
      console.error('Error generating image:', error);
      Alert.alert('Error', 'No se pudo generar la imagen personalizada');
    } finally {
      setGeneratingImage(null);
    }
  };

  const resetScan = () => {
    setUserImage(null);
    setUserImageBase64(null);
    setResult(null);
    setGeneratedImages([]);
  };

  const openImageModal = (imageUri: string) => {
    setSelectedImage(imageUri);
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="scan" size={32} color="#2563EB" />
          </View>
          <Text style={styles.title}>Escaneo IA Facial</Text>
          <Text style={styles.subtitle}>
            Analiza tu rostro y visualiza diferentes estilos de corte
          </Text>
        </View>

        <View style={styles.content}>
          {!userImage ? (
            <Card style={styles.uploadCard}>
              <View style={styles.cameraIconContainer}>
                <Ionicons name="camera" size={60} color="#CBD5E1" />
              </View>
              <Text style={styles.uploadTitle}>Captura tu rostro</Text>
              <Text style={styles.uploadText}>
                Toma una foto frontal clara para obtener recomendaciones y visualizaciones personalizadas
              </Text>
              <View style={styles.uploadButtons}>
                <Button
                  title="📸 Tomar Foto"
                  onPress={pickImage}
                  variant="primary"
                  size="large"
                  style={styles.uploadButton}
                />
                <Button
                  title="🖼️ Elegir de Galería"
                  onPress={pickFromGallery}
                  variant="outline"
                  size="large"
                  style={styles.uploadButton}
                />
              </View>
            </Card>
          ) : (
            <View style={styles.resultContainer}>
              {/* User's Photo */}
              <Card style={styles.imageCard}>
                <Text style={styles.sectionLabel}>Tu foto</Text>
                <Image source={{ uri: userImage }} style={styles.userImage} />
              </Card>

              {/* Analyzing State */}
              {analyzing && (
                <Card style={styles.analyzingCard}>
                  <ActivityIndicator size="large" color="#2563EB" />
                  <Text style={styles.analyzingText}>Analizando tu rostro con IA...</Text>
                  <Text style={styles.analyzingSubtext}>Esto puede tomar unos segundos</Text>
                </Card>
              )}

              {/* Results */}
              {result && result.success && (
                <>
                  {/* Face Shape */}
                  {result.face_shape && (
                    <Card style={styles.faceShapeCard}>
                      <View style={styles.faceShapeHeader}>
                        <Ionicons name="person-circle" size={28} color="#2563EB" />
                        <View>
                          <Text style={styles.faceShapeLabel}>Forma de tu rostro</Text>
                          <Text style={styles.faceShapeValue}>
                            {result.face_shape.charAt(0).toUpperCase() + result.face_shape.slice(1)}
                          </Text>
                        </View>
                      </View>
                    </Card>
                  )}

                  {/* Recommendations with Reference Images */}
                  <Text style={styles.sectionTitle}>✂️ Cortes Recomendados</Text>
                  
                  {result.recommendations.map((rec, index) => {
                    const isGenerating = generatingImage === rec.name;
                    const hasGenerated = generatedImages.some(g => g.style === rec.name);
                    
                    return (
                      <Card key={index} style={styles.recommendationCard}>
                        <View style={styles.recHeader}>
                          <View style={styles.recNumber}>
                            <Text style={styles.recNumberText}>{index + 1}</Text>
                          </View>
                          <Text style={styles.recName}>{rec.name}</Text>
                        </View>
                        
                        <Text style={styles.recDescription}>{rec.description}</Text>
                        
                        {/* Reference Image */}
                        {rec.reference_image && (
                          <TouchableOpacity 
                            onPress={() => openImageModal(rec.reference_image!)}
                            style={styles.referenceImageContainer}
                          >
                            <Image 
                              source={{ uri: rec.reference_image }} 
                              style={styles.referenceImage}
                            />
                            <View style={styles.referenceLabel}>
                              <Ionicons name="image" size={14} color="#64748B" />
                              <Text style={styles.referenceLabelText}>Imagen de referencia</Text>
                            </View>
                          </TouchableOpacity>
                        )}
                        
                        {/* Generate Personalized Button */}
                        <TouchableOpacity
                          style={[
                            styles.generateButton,
                            hasGenerated && styles.generateButtonSuccess,
                            isGenerating && styles.generateButtonLoading
                          ]}
                          onPress={() => generatePersonalizedImage(rec.name)}
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <>
                              <ActivityIndicator size="small" color="#FFFFFF" />
                              <Text style={styles.generateButtonText}>Generando...</Text>
                            </>
                          ) : hasGenerated ? (
                            <>
                              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                              <Text style={styles.generateButtonText}>Ver mi visualización</Text>
                            </>
                          ) : (
                            <>
                              <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                              <Text style={styles.generateButtonText}>Generar con mi rostro</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </Card>
                    );
                  })}

                  {/* Detailed Analysis */}
                  {result.detailed_analysis && (
                    <Card style={styles.analysisCard}>
                      <View style={styles.analysisHeader}>
                        <Ionicons name="bulb" size={24} color="#F59E0B" />
                        <Text style={styles.analysisTitle}>Análisis Detallado</Text>
                      </View>
                      <Text style={styles.analysisText}>{result.detailed_analysis}</Text>
                    </Card>
                  )}
                </>
              )}

              {/* Error State */}
              {result && !result.success && (
                <Card style={styles.errorCard}>
                  <Ionicons name="alert-circle" size={40} color="#EF4444" />
                  <Text style={styles.errorTitle}>No se pudo analizar</Text>
                  <Text style={styles.errorText}>
                    {result.error || 'Intenta con otra foto con mejor iluminación'}
                  </Text>
                </Card>
              )}

              <Button
                title="🔄 Escanear otra foto"
                onPress={resetScan}
                variant="outline"
                size="medium"
                style={styles.resetButton}
              />
            </View>
          )}

          {/* Tips Card */}
          <Card style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb-outline" size={20} color="#2563EB" />
              <Text style={styles.tipsTitle}>Tips para mejores resultados</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.tipText}>Buena iluminación frontal</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.tipText}>Rostro completamente visible</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.tipText}>Sin gafas ni accesorios que cubran</Text>
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* Image Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalCloseArea} 
            onPress={() => setModalVisible(false)}
          />
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close-circle" size={36} color="#FFFFFF" />
            </TouchableOpacity>
            {selectedImage && (
              <Image 
                source={{ uri: selectedImage }} 
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  uploadCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  cameraIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
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
    paddingHorizontal: 16,
  },
  uploadButton: {
    width: '100%',
  },
  resultContainer: {
    gap: 16,
  },
  imageCard: {
    padding: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  analyzingCard: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  analyzingText: {
    fontSize: 16,
    color: '#2563EB',
    marginTop: 16,
    fontWeight: '600',
  },
  analyzingSubtext: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  faceShapeCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
  },
  faceShapeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  faceShapeLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  faceShapeValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 8,
    marginBottom: 4,
  },
  recommendationCard: {
    backgroundColor: '#FFFFFF',
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  recNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  recName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  recDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 12,
  },
  referenceImageContainer: {
    marginBottom: 12,
  },
  referenceImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  referenceLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  referenceLabelText: {
    fontSize: 12,
    color: '#64748B',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  generateButtonSuccess: {
    backgroundColor: '#10B981',
  },
  generateButtonLoading: {
    backgroundColor: '#A78BFA',
  },
  generateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  analysisCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
  },
  analysisText: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 22,
  },
  errorCard: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#FEF2F2',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#7F1D1D',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  resetButton: {
    marginTop: 8,
  },
  tipsCard: {
    marginTop: 16,
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
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
    color: '#166534',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  tipText: {
    fontSize: 13,
    color: '#15803D',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    width: screenWidth - 32,
    maxHeight: '80%',
  },
  modalCloseButton: {
    position: 'absolute',
    top: -50,
    right: 0,
    zIndex: 10,
  },
  modalImage: {
    width: '100%',
    height: screenWidth - 32,
    borderRadius: 12,
  },
});
