import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.text}>Cargando...</Text>
      </View>
    );
  }

  const redirectPath = (() => {
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
  })();

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
