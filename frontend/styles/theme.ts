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
