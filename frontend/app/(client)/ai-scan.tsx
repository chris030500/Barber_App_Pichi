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
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { palette, typography } from '../../styles/theme';
import { BACKEND_URL } from '../../utils/backendUrl';

const { width: screenWidth } = Dimensions.get('window');

const API_URL = BACKEND_URL;

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

    const existing = generatedImages.find((g) => g.style === styleName);
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
          image_base64: data.generated_image_base64,
        };
        setGeneratedImages((prev) => [...prev, newGenerated]);
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
            <Ionicons name="scan" size={32} color={palette.accentSecondary} />
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
                <Ionicons name="camera" size={60} color={palette.textSecondary} />
              </View>
              <Text style={styles.uploadTitle}>Captura tu rostro</Text>
              <Text style={styles.uploadText}>
                Toma una foto frontal clara para obtener recomendaciones y visualizaciones personalizadas.
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
                  textStyle={styles.outlineText}
                />
              </View>
            </Card>
          ) : (
            <View style={styles.resultContainer}>
              <Card style={styles.imageCard}>
                <Text style={styles.sectionLabel}>Tu foto</Text>
                <Image source={{ uri: userImage }} style={styles.userImage} />
              </Card>

              {analyzing && (
                <Card style={styles.analyzingCard}>
                  <ActivityIndicator size="large" color={palette.accent} />
                  <Text style={styles.analyzingText}>Analizando tu rostro con IA...</Text>
                  <Text style={styles.analyzingSubtext}>Esto puede tomar unos segundos</Text>
                </Card>
              )}

              {result && result.success && (
                <>
                  {result.face_shape && (
                    <Card style={styles.faceShapeCard}>
                      <View style={styles.faceShapeHeader}>
                        <Ionicons name="person-circle" size={28} color={palette.accentSecondary} />
                        <View>
                          <Text style={styles.faceShapeLabel}>Forma de tu rostro</Text>
                          <Text style={styles.faceShapeValue}>
                            {result.face_shape.charAt(0).toUpperCase() + result.face_shape.slice(1)}
                          </Text>
                        </View>
                      </View>
                    </Card>
                  )}

                  <Text style={styles.sectionTitle}>✂️ Cortes recomendados</Text>

                  {result.recommendations.map((rec, index) => {
                    const isGenerating = generatingImage === rec.name;
                    const hasGenerated = generatedImages.some((g) => g.style === rec.name);

                    return (
                      <Card key={index} style={styles.recommendationCard}>
                        <View style={styles.recHeader}>
                          <View style={styles.recNumber}>
                            <Text style={styles.recNumberText}>{index + 1}</Text>
                          </View>
                          <Text style={styles.recName}>{rec.name}</Text>
                        </View>

                        <Text style={styles.recDescription}>{rec.description}</Text>

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
                              <Ionicons name="image" size={14} color={palette.textSecondary} />
                              <Text style={styles.referenceLabelText}>Imagen de referencia</Text>
                            </View>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={[
                            styles.generateButton,
                            hasGenerated && styles.generateButtonSuccess,
                            isGenerating && styles.generateButtonLoading,
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

                  {result.detailed_analysis && (
                    <Card style={styles.analysisCard}>
                      <View style={styles.analysisHeader}>
                        <Ionicons name="bulb" size={24} color={palette.warning} />
                        <Text style={styles.analysisTitle}>Análisis detallado</Text>
                      </View>
                      <Text style={styles.analysisText}>{result.detailed_analysis}</Text>
                    </Card>
                  )}
                </>
              )}

              {result && !result.success && (
                <Card style={styles.errorCard}>
                  <Ionicons name="alert-circle" size={40} color={palette.danger} />
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
                textStyle={styles.outlineText}
              />
            </View>
          )}

          <Card style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb-outline" size={20} color={palette.accentSecondary} />
              <Text style={styles.tipsTitle}>Tips para mejores resultados</Text>
            </View>
            {["Buena iluminación frontal", "Rostro completamente visible", "Sin gafas ni accesorios que cubran"].map((tip) => (
              <View style={styles.tipItem} key={tip}>
                <Ionicons name="checkmark-circle" size={16} color={palette.success} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </Card>
        </View>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalCloseArea} onPress={() => setModalVisible(false)} />
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setModalVisible(false)}>
              <Ionicons name="close-circle" size={36} color="#FFFFFF" />
            </TouchableOpacity>
            {selectedImage && (
              <Image source={{ uri: selectedImage }} style={styles.modalImage} resizeMode="contain" />
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
    backgroundColor: palette.background,
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
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0B1324',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  title: {
    ...typography.heading,
    fontSize: 24,
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
    marginTop: 6,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  uploadCard: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  cameraIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: palette.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  uploadTitle: {
    ...typography.heading,
    fontSize: 20,
  },
  uploadText: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 24,
  },
  uploadButtons: {
    width: '100%',
    gap: 10,
    paddingHorizontal: 16,
  },
  uploadButton: {
    width: '100%',
  },
  outlineText: {
    color: palette.textPrimary,
  },
  resultContainer: {
    gap: 16,
  },
  imageCard: {
    padding: 12,
  },
  sectionLabel: {
    ...typography.label,
    marginBottom: 10,
  },
  userImage: {
    width: '100%',
    height: 260,
    borderRadius: 16,
  },
  analyzingCard: {
    alignItems: 'center',
    gap: 8,
  },
  analyzingText: {
    ...typography.subheading,
    color: palette.textPrimary,
  },
  analyzingSubtext: {
    ...typography.body,
  },
  faceShapeCard: {
    gap: 10,
  },
  faceShapeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  faceShapeLabel: {
    ...typography.label,
    color: palette.textSecondary,
  },
  faceShapeValue: {
    ...typography.heading,
    fontSize: 18,
  },
  sectionTitle: {
    ...typography.heading,
    fontSize: 18,
    marginTop: 4,
  },
  recommendationCard: {
    gap: 10,
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recNumber: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recNumberText: {
    color: palette.background,
    fontWeight: '700',
  },
  recName: {
    ...typography.subheading,
    color: palette.textPrimary,
    fontSize: 16,
  },
  recDescription: {
    ...typography.body,
    lineHeight: 20,
  },
  referenceImageContainer: {
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.border,
  },
  referenceImage: {
    width: '100%',
    height: 220,
  },
  referenceLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    backgroundColor: palette.surfaceAlt,
  },
  referenceLabelText: {
    ...typography.body,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.accent,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  generateButtonSuccess: {
    backgroundColor: palette.success,
  },
  generateButtonLoading: {
    backgroundColor: palette.accentSecondary,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  analysisCard: {
    borderColor: palette.border,
    borderWidth: 1,
    backgroundColor: '#0D1322',
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  analysisTitle: {
    ...typography.subheading,
    color: palette.textPrimary,
  },
  analysisText: {
    ...typography.body,
    lineHeight: 22,
  },
  errorCard: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  errorTitle: {
    ...typography.subheading,
    color: palette.danger,
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 20,
  },
  resetButton: {
    marginTop: 8,
  },
  tipsCard: {
    marginTop: 6,
    gap: 8,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipsTitle: {
    ...typography.subheading,
    fontSize: 14,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipText: {
    ...typography.body,
    color: palette.textPrimary,
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
