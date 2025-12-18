import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)/welcome" />
          <Stack.Screen name="(auth)/login" />
          <Stack.Screen name="(client)" />
          <Stack.Screen name="(barber)" />
          <Stack.Screen name="(admin)" />
          <Stack.Screen name="(auth)/register" />
        </Stack>
      </NotificationProvider>
    </AuthProvider>
  );
}
