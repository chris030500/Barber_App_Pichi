import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const { user, isLoading } = useAuth();

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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
});
