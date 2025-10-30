/**
 * Theme Constants
 * Константы цветов и стилей для светлой и темной темы
 */

export type ThemeMode = 'light' | 'dark';

export interface Theme {
  // Background colors
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  safeAreaBackground: string; // For Dynamic Island and status bar area

  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;

  // Primary colors
  primary: string;
  primaryLight: string;
  primaryDark: string;

  // Border colors
  border: string;
  borderLight: string;

  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;

  // Chat/Message colors
  messageOwn: string;
  messageOther: string;
  chatBackground: string;

  // Card colors
  card: string;
  cardHover: string;

  // Input colors
  input: string;
  inputBorder: string;
  inputPlaceholder: string;

  // Shadow
  shadow: string;

  // Special
  overlay: string;
  ripple: string;
}

export const lightTheme: Theme = {
  // Background colors
  background: '#F9FAFB',
  backgroundSecondary: '#FFFFFF',
  backgroundTertiary: '#F3F4F6',
  safeAreaBackground: '#E5E7EB', // Darker gray for iOS Dynamic Island area

  // Text colors
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',

  // Primary colors
  primary: '#E94444',
  primaryLight: '#FEE2E2',
  primaryDark: '#B91C1C',

  // Border colors
  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Chat/Message colors
  messageOwn: '#ffffffff',
  messageOther: '#ffffffff',
  chatBackground: '#d6dde7ff',

  card: '#FFFFFF',
  cardHover: '#F9FAFB',

  // Input colors
  input: '#F3F4F6',
  inputBorder: '#E5E7EB',
  inputPlaceholder: '#9CA3AF',

  // Shadow
  shadow: 'rgba(0, 0, 0, 0.1)',

  // Special
  overlay: 'rgba(0, 0, 0, 0.5)',
  ripple: 'rgba(0, 0, 0, 0.1)',
};

export const darkTheme: Theme = {
  // Background colors
  background: '#111827',
  backgroundSecondary: '#1F2937',
  backgroundTertiary: '#374151',
  safeAreaBackground: '#0F172A', // Even darker for iOS Dynamic Island area

  // Text colors
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textTertiary: '#9CA3AF',

  // Primary colors
  primary: '#EF4444',
  primaryLight: '#7F1D1D',
  primaryDark: '#FCA5A5',

  // Border colors
  border: '#374151',
  borderLight: '#4B5563',

  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Chat/Message colors
  messageOwn: '#222831ff',
  messageOther: '#222831ff',
  chatBackground: '#0b0f13ff',

  // Card colors
  card: '#1F2937',
  cardHover: '#374151',

  // Input colors
  input: '#374151',
  inputBorder: '#4B5563',
  inputPlaceholder: '#6B7280',

  // Shadow
  shadow: 'rgba(0, 0, 0, 0.3)',

  // Special
  overlay: 'rgba(0, 0, 0, 0.7)',
  ripple: 'rgba(255, 255, 255, 0.1)',
};

export const themes: Record<ThemeMode, Theme> = {
  light: lightTheme,
  dark: darkTheme,
};
