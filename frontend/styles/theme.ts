import { Platform, ViewStyle } from 'react-native';

export const palette = {
  background: '#050A14',
  backgroundAlt: '#0B1220',
  surface: '#0F172A',
  surfaceAlt: '#111827',
  accent: '#8B5CF6',
  accentSecondary: '#22D3EE',
  accentMuted: '#2DD4BF',
  border: 'rgba(255,255,255,0.08)',
  textPrimary: '#E2E8F0',
  textSecondary: '#94A3B8',
  muted: '#1F2937',
  success: '#22C55E',
  danger: '#F43F5E',
  warning: '#F59E0B'
};

export const typography = {
  heading: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: palette.textPrimary
  },
  subheading: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: palette.textSecondary
  },
  body: {
    fontSize: 14,
    color: palette.textSecondary
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: palette.textSecondary
  }
};

type ShadowOptions = {
  color?: string;
  opacity?: number;
  radius?: number;
  offsetWidth?: number;
  offsetHeight?: number;
  elevation?: number;
  web?: string;
};

const buildShadow = ({
  color = 'rgba(0,0,0,0.25)',
  opacity = 0.2,
  radius = 12,
  offsetWidth = 0,
  offsetHeight = 10,
  elevation,
  web
}: ShadowOptions): ViewStyle =>
  Platform.select({
    ios: {
      shadowColor: color,
      shadowOpacity: opacity,
      shadowRadius: radius,
      shadowOffset: { width: offsetWidth, height: offsetHeight }
    },
    android: {
      elevation: elevation ?? Math.max(4, Math.round(radius))
    },
    web: {
      boxShadow: web ?? `0 ${offsetHeight}px ${radius * 1.8}px rgba(0,0,0,${opacity})`
    }
  }) as ViewStyle;

export const shadows = {
  soft: buildShadow({ radius: 12, offsetHeight: 8, opacity: 0.16 }),
  elevated: buildShadow({ radius: 16, offsetHeight: 10, opacity: 0.22 }),
  accent: buildShadow({
    color: palette.accent,
    radius: 14,
    offsetHeight: 10,
    opacity: 0.24,
    web: '0 10px 22px rgba(139, 92, 246, 0.25)'
  })
};

export const layout = {
  screen: {
    flex: 1,
    backgroundColor: palette.background
  },
  padded: {
    paddingHorizontal: 20,
    paddingVertical: 16
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border
  }
};
