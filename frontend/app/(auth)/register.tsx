import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/ui/Card';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'client' | 'barber' | 'admin'>('client');
  const [loading, setLoading] = useState(false);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const handleRegister = async () => {
    console.log('🔵 handleRegister called with:', { name, email, password: '***', confirmPassword: '***', role });
    
    // Validations
    if (!name || !email || !password || !confirmPassword) {
      console.log('❌ Validation failed: Missing fields');
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (password !== confirmPassword) {
      console.log('❌ Validation failed: Passwords do not match');
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      console.log('❌ Validation failed: Password too short');
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Validation failed: Invalid email format');
      Alert.alert('Error', 'Email inválido');
      return;
    }

    console.log('✅ All validations passed, starting registration...');
    setLoading(true);
    try {
      console.log('🔵 Calling register function...');
      await register(email.trim(), password, name.trim(), role);
      console.log('✅ Register function completed successfully!');
      console.log('🔵 AuthContext will handle navigation automatically');
      
      // No Alert needed - AuthContext will redirect automatically
      // User will see loading state and then be redirected to their role's home screen
    } catch (error: any) {
      console.error('❌ Registration failed:', error);
      Alert.alert('Error', error.message || 'Error al crear la cuenta');
      setLoading(false);
    }
    // Don't set loading to false on success - let navigation happen
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Ionicons name="person-add" size={60} color="#2563EB" />
          <Text style={styles.title}>Crear Cuenta</Text>
          <Text style={styles.subtitle}>Completa el formulario para registrarte</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Nombre completo"
            value={name}
            onChangeText={setName}
            placeholder="Juan Pérez"
            autoCapitalize="words"
          />

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="tu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Input
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            placeholder="Mínimo 6 caracteres"
            secureTextEntry
          />

          <Input
            label="Confirmar contraseña"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repite tu contraseña"
            secureTextEntry
          />

          <View style={styles.roleSection}>
            <Text style={styles.roleLabel}>Tipo de cuenta:</Text>
            <View style={styles.roleButtons}>
              <Card
                style={[
                  styles.roleCard,
                  role === 'client' && styles.roleCardSelected,
                ]}
                onPress={() => setRole('client')}
              >
                <Ionicons
                  name="person"
                  size={32}
                  color={role === 'client' ? '#2563EB' : '#64748B'}
                />
                <Text
                  style={[
                    styles.roleText,
                    role === 'client' && styles.roleTextSelected,
                  ]}
                >
                  Cliente
                </Text>
              </Card>

              <Card
                style={[
                  styles.roleCard,
                  role === 'barber' && styles.roleCardSelected,
                ]}
                onPress={() => setRole('barber')}
              >
                <Ionicons
                  name="cut"
                  size={32}
                  color={role === 'barber' ? '#2563EB' : '#64748B'}
                />
                <Text
                  style={[
                    styles.roleText,
                    role === 'barber' && styles.roleTextSelected,
                  ]}
                >
                  Barbero
                </Text>
              </Card>

              <Card
                style={[
                  styles.roleCard,
                  role === 'admin' && styles.roleCardSelected,
                ]}
                onPress={() => setRole('admin')}
              >
                <Ionicons
                  name="settings"
                  size={32}
                  color={role === 'admin' ? '#2563EB' : '#64748B'}
                />
                <Text
                  style={[
                    styles.roleText,
                    role === 'admin' && styles.roleTextSelected,
                  ]}
                >
                  Admin
                </Text>
              </Card>
            </View>
          </View>

          <Button
            title="Crear Cuenta"
            onPress={handleRegister}
            size="large"
            loading={loading}
            disabled={loading}
            style={styles.button}
          />

          <Button
            title="¿Ya tienes cuenta? Inicia sesión"
            onPress={handleBack}
            variant="outline"
            size="medium"
            style={styles.loginButton}
          />
        </View>
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  roleSection: {
    marginVertical: 16,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roleCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  roleText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  roleTextSelected: {
    color: '#2563EB',
    fontWeight: '600',
  },
  button: {
    marginTop: 24,
  },
  loginButton: {
    marginTop: 12,
  },
});
