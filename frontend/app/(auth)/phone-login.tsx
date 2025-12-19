import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert, Platform, ImageBackground } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { getRedirectPath } from '../../utils/navigation';
import { shadows } from '../../styles/theme';

const badgeShadow = shadows.soft;

export default function PhoneLoginScreen() {
  const router = useRouter();
  const { loginWithPhone, verifyPhoneCode, user, isLoading } = useAuth();

  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isLoading && user) {
    return <Redirect href={getRedirectPath(user)} />;
  }

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const handleSendCode = async () => {
    // Remove any non-digit characters
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    if (!cleanNumber || cleanNumber.length < 10) {
      Alert.alert('Error', 'Ingresa un número de teléfono válido (10 dígitos)');
      return;
    }

    setLoading(true);
    try {
      // Pass just the clean number, AuthContext will add +52
      console.log('📱 Sending code to:', cleanNumber);
      const verId = await loginWithPhone(cleanNumber);
      setVerificationId(verId);
      setStep('code');
      Alert.alert('Código Enviado', 'Te hemos enviado un SMS con el código de verificación');
    } catch (error: any) {
      console.error('Phone login error:', error);
      Alert.alert('Error', error.message || 'Error al enviar el código. Verifica tu número.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      Alert.alert('Error', 'Ingresa el código de 6 dígitos');
      return;
    }

    setLoading(true);
    try {
      await verifyPhoneCode(verificationId, verificationCode);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Código inválido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/images/splash-image.png')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
      blurRadius={24}
    >
      <StatusBar style="light" />
      <SafeAreaView style={styles.container}>
        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <View style={styles.logoBadge}>
                <Ionicons name="phone-portrait" size={24} color="#0B1220" />
              </View>
              <View>
                <Text style={styles.brand}>BarberShop</Text>
                <Text style={styles.tagline}>Verificación rápida y segura</Text>
              </View>
            </View>

            <Text style={styles.title}>
              {step === 'phone' ? 'Ingresa tu teléfono' : 'Verifica tu código'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'phone'
                ? 'Te enviaremos un código SMS para verificar tu identidad'
                : `Enviamos un código al ${phoneNumber}`}
            </Text>
          </View>

          <View style={styles.card}>
            {Platform.OS !== 'web' && (
              <View style={styles.warningCard}>
                <Ionicons name="information-circle" size={18} color="#F8FAFC" />
                <Text style={styles.warningText}>
                  La verificación por SMS funciona mejor en la versión web
                </Text>
              </View>
            )}

            <View style={styles.form}>
              {step === 'phone' ? (
                <>
                  <View style={styles.phoneInputContainer}>
                    <View style={styles.countryCode}>
                      <Text style={styles.countryCodeText}>🇲🇽 +52</Text>
                    </View>
                    <View style={styles.phoneInput}>
                      <Input
                        label="Número de teléfono"
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        placeholder="55 1234 5678"
                        keyboardType="phone-pad"
                        maxLength={15}
                        variant="dark"
                      />
                    </View>
                  </View>

                  <Button
                    title="Enviar Código SMS"
                    onPress={handleSendCode}
                    size="large"
                    loading={loading}
                    disabled={loading || phoneNumber.length < 10}
                    style={styles.button}
                    textStyle={styles.buttonText}
                  />
                </>
              ) : (
                <>
                  <Input
                    label="Código de verificación"
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    placeholder="123456"
                    keyboardType="number-pad"
                    maxLength={6}
                    variant="dark"
                  />

                  <Text style={styles.codeHint}>
                    Ingresa el código de 6 dígitos que recibiste por SMS
                  </Text>

                  <Button
                    title="Verificar Código"
                    onPress={handleVerifyCode}
                    size="large"
                    loading={loading}
                    disabled={loading || verificationCode.length < 6}
                    style={styles.button}
                    textStyle={styles.buttonText}
                  />

                  <Button
                    title="Reenviar Código"
                    onPress={() => setStep('phone')}
                    variant="outline"
                    size="medium"
                    style={styles.resendButton}
                    textStyle={styles.resendText}
                  />
                </>
              )}
            </View>

            <Button
              title="← Volver al inicio de sesión"
              onPress={handleBack}
              variant="outline"
              size="medium"
              style={styles.backButton}
              textStyle={styles.resendText}
            />
          </View>

          {/* Hidden reCAPTCHA container for web */}
          {Platform.OS === 'web' && <View nativeID="recaptcha-container" />}
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  backgroundImage: {
    opacity: 0.18,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 16,
  },
  header: {
    gap: 10,
    marginBottom: 10,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
    ...badgeShadow,
  },
  brand: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  tagline: {
    color: '#CBD5E1',
    fontSize: 13,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#E2E8F0',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'left',
    lineHeight: 20,
    maxWidth: 520,
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.1)',
    gap: 14,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#E2E8F0',
  },
  form: {
    flex: 1,
    gap: 16,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  countryCode: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    height: 48,
    marginTop: 24,
  },
  countryCodeText: {
    fontSize: 14,
    color: '#E2E8F0',
  },
  phoneInput: {
    flex: 1,
  },
  button: {
    marginTop: 8,
    backgroundColor: '#2563EB',
  },
  buttonText: {
    color: '#F8FAFC',
    letterSpacing: 0.2,
  },
  codeHint: {
    fontSize: 13,
    color: '#CBD5E1',
    textAlign: 'center',
  },
  resendButton: {
    marginTop: 8,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  resendText: {
    color: '#E2E8F0',
  },
  backButton: {
    marginTop: 12,
    borderColor: 'rgba(255,255,255,0.24)',
  },
});
