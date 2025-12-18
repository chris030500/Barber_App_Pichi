import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { palette, typography } from '../styles/theme';

export default function Index() {
  const { user, isLoading } = useAuth();
  const hasNavigated = useRef(false);

  const redirectPath = useMemo(() => {
    if (isLoading) return null;
    if (!user) return '/(auth)/welcome';

    switch (user.role) {
      case 'client':
        return '/(client)/home';
      case 'barber':
        return '/(barber)/schedule';
      case 'admin':
        return '/(admin)/dashboard';
      default:
        return '/(auth)/welcome';
    }
  }, [isLoading, user]);

  if (!redirectPath) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.text}>Cargando...</Text>
      </View>
    );
  }

  return <Redirect href={redirectPath} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loaderCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: palette.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
  },
  text: {
    marginTop: 12,
    ...typography.subheading,
    color: palette.textSecondary,
  },
});
