import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback, ReactNode } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import axios from 'axios';
import { BACKEND_URL } from '../utils/backendUrl';

const isWeb = Platform.OS === 'web';

if (!isWeb) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

interface NotificationContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  registerForPushNotifications: (userId: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);

  const expoPushTokenRef = useRef<string | null>(null);
  const registeringRef = useRef(false);
  const lastRegisteredUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (isWeb) return;

    let isMounted = true;

    const notificationListener = Notifications.addNotificationReceivedListener((n) => {
      if (!isMounted) return;
      setNotification(n);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification response:', response);
    });

    return () => {
      isMounted = false;
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  const registerForPushNotifications = useCallback(async (userId: string) => {
    if (!userId) return;

    if (isWeb) {
      // Short-circuit on web to avoid unsupported APIs and render loops
      return;
    }

    if (lastRegisteredUserRef.current === userId && expoPushTokenRef.current) {
      return;
    }

    if (registeringRef.current) return;
    registeringRef.current = true;

    try {
      if (!Device.isDevice) {
        console.log('Must use physical device for push notifications');
        return;
      }

      if (!BACKEND_URL) {
        console.warn('BACKEND_URL no configurado. No se enviará el push token al backend.');
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token');
        return;
      }

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;

      if (!projectId) {
        console.log('Project ID not configured');
        return;
      }

      const token = await Notifications.getExpoPushTokenAsync({ projectId });

      expoPushTokenRef.current = token.data;
      setExpoPushToken(token.data);
      lastRegisteredUserRef.current = userId;

      await axios.post(`${BACKEND_URL}/api/push-tokens`, {
        user_id: userId,
        token: token.data,
        platform: Platform.OS,
      });

      console.log('Push token registered:', token.data);
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    } finally {
      registeringRef.current = false;
    }
  }, []);

  const value = useMemo(
    () => ({ expoPushToken, notification, registerForPushNotifications }),
    [expoPushToken, notification, registerForPushNotifications]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within a NotificationProvider');
  return context;
}
