import Constants from 'expo-constants';

const configExtra = Constants.expoConfig?.extra ?? {};

const configBackendUrl =
  // Prefer explicit public env key embedded in Expo config
  // fall back to the older backendUrl key if present
  (configExtra as Record<string, string | undefined>).EXPO_PUBLIC_BACKEND_URL ||
  (configExtra as Record<string, string | undefined>).backendUrl;

const envBackendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;

const FALLBACK_BACKEND_URL = 'http://localhost:8000';

// Single source of truth for API calls across the app
export const BACKEND_URL = configBackendUrl || envBackendUrl || FALLBACK_BACKEND_URL;

const shouldWarn = !configBackendUrl && !envBackendUrl;
if (shouldWarn) {
  console.warn(
    `⚠️ BACKEND_URL no está configurado. Usando valor por defecto ${FALLBACK_BACKEND_URL} (configura EXPO_PUBLIC_BACKEND_URL para apuntar a tu backend).`
  );
}

export const isUsingFallbackBackend = shouldWarn;
