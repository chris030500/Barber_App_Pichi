import axios from 'axios';
import { Platform } from 'react-native';
import { BACKEND_URL } from './backendUrl';

type LogLevel = 'error' | 'warning' | 'warn' | 'info';

interface LogOptions {
  level?: LogLevel;
  context?: Record<string, any>;
  screen?: string;
  userId?: string;
  stack?: string;
}

export async function logClientEvent(message: string, options: LogOptions = {}) {
  if (!BACKEND_URL) return;

  const payload = {
    message,
    level: options.level ?? 'error',
    context: options.context,
    screen: options.screen,
    user_id: options.userId,
    stack: options.stack,
    platform: Platform.OS,
  };

  try {
    await axios.post(`${BACKEND_URL}/api/logs`, payload);
  } catch (error) {
    console.warn('No se pudo registrar el log en backend', error);
  }
}

export async function logNetworkError(message: string, options: LogOptions = {}) {
  await logClientEvent(message, { ...options, level: options.level ?? 'error' });
}
