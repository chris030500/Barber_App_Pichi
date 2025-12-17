import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';

export default function PhoneLoginScreen() {
  const router = useRouter();
  const { loginWithPhone, verifyPhoneCode, user, isLoading } = useAuth();

  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isLoading && user) {
    return <Redirect href="/" />;
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
    <SafeAreaView style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="phone-portrait" size={48} color="#2563EB" />
          </View>
          <Text style={styles.title}>
            {step === 'phone' ? 'Ingresa tu teléfono' : 'Verifica tu código'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'phone' 
              ? 'Te enviaremos un código SMS para verificar tu identidad'
              : `Enviamos un código al ${phoneNumber}`
            }
          </Text>
        </View>

        {Platform.OS !== 'web' && (
          <View style={styles.warningCard}>
            <Ionicons name="information-circle" size={20} color="#F59E0B" />
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
              />

              <Button
                title="Reenviar Código"
                onPress={() => setStep('phone')}
                variant="outline"
                size="medium"
                style={styles.resendButton}
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
        />

        {/* Hidden reCAPTCHA container for web */}
        {Platform.OS === 'web' && <View nativeID="recaptcha-container" />}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
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
    paddingHorizontal: 16,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
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
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 48,
    marginTop: 24,
  },
  countryCodeText: {
    fontSize: 14,
    color: '#1E293B',
  },
  phoneInput: {
    flex: 1,
  },
  button: {
    marginTop: 8,
  },
  codeHint: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  resendButton: {
    marginTop: 8,
  },
  backButton: {
    marginTop: 24,
  },
});
