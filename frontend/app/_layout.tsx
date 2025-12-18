import React from 'react';
import { Stack } from 'expo-router';
import { LogBox } from 'react-native';
import { AuthProvider } from '../contexts/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { PushBootstrap } from '../components/PushBootstrap';

LogBox.ignoreLogs([
  '"shadow*" style props are deprecated. Use "boxShadow".',
  'props.pointerEvents is deprecated. Use style.pointerEvents',
  'BACKEND_URL no está configurado',
  'BACKEND_URL is not configured',
  'Firebase config is using fallback values',
  '[expo-notifications] Listening to push token changes is not yet fully supported on web'
]);

export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <PushBootstrap />
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
