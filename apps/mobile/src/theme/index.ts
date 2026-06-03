export const colors = {
  // Brand
  primary: '#00C851',      // FIFA Green
  primaryDark: '#007E33',
  primaryLight: '#5EFC82',
  secondary: '#1565C0',    // Deep Blue
  secondaryDark: '#003c8f',
  secondaryLight: '#5E92F3',
  accent: '#FFD700',       // Gold

  // FIFA World Cup 2026 Colors
  wc26Primary: '#D4213D',   // WC 2026 Red
  wc26Secondary: '#001489', // WC 2026 Blue
  wc26Gold: '#C9A84C',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // Status
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Match Status
  live: '#EF4444',
  liveBackground: '#FEE2E2',
  upcoming: '#3B82F6',
  finished: '#6B7280',

  // Prediction
  correct: '#10B981',
  incorrect: '#EF4444',
  pending: '#F59E0B',
};

export const darkColors = {
  ...colors,
  background: '#0F172A',
  surface: '#1E293B',
  surfaceSecondary: '#334155',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  border: '#334155',
  divider: '#1E293B',
  card: '#1E293B',
  inputBackground: '#334155',
};

export const lightColors = {
  ...colors,
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',
  text: '#0F172A',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  divider: '#F1F5F9',
  card: '#FFFFFF',
  inputBackground: '#F1F5F9',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  screen: 16,
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
  card: 16,
};

export const typography = {
  fontFamily: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    black: 'Inter_900Black',
  },
  fontSize: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 28,
    display: 32,
    hero: 40,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  }),
};

export type ColorScheme = 'light' | 'dark';
export type AppColors = typeof lightColors;
