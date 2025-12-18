import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { getRedirectPath } from '../utils/navigation';
import { palette, typography } from '../styles/theme';

export default function Index() {
  const { user, isLoading } = useAuth();

  const redirectPath = useMemo(() => {
    if (isLoading) return null;
    return getRedirectPath(user);
  }, [isLoading, user]);

  // Mientras Firebase + backend resuelven el estado
  if (!redirectPath) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.text}>Cargando...</Text>
      </View>
    );
  }

  // Redirección FINAL (sin useEffect, sin loops)
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
  text: {
    marginTop: 12,
    ...typography.subheading,
    color: palette.textSecondary,
  },
});
