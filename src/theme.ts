import { Platform } from 'react-native';
import { configureFonts, MD3LightTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

// v2 palette — approved 2026-08-15. Warm stone ground, deep sage accent,
// clay reserved exclusively for streaks (an earned signal, not decoration).
export const colors = {
  background: '#F1EFE9',
  surface: '#FFFFFF',
  surfaceMuted: '#E8E5DC',
  text: '#1B211D',
  textMedium: '#3F453E', // between text and textSecondary — body items that sit under a heading
  textSecondary: '#63695F',
  textFaint: '#9A9A8E',
  border: '#DEDACD',
  accent: '#35513F',
  accentMedium: '#7C9587',
  accentSoft: '#DCE6DB',
  accentFaint: '#EEF2EC',
  accentInk: '#FFFFFF',
  clay: '#AC6440',
  claySoft: '#F1DED2',
  success: '#35513F',
  warning: '#B8874A',
  warningSoft: '#F2E6D5',
  danger: '#B4544A',
  dangerSoft: '#F3DAD7',
  longestStreak: '#4A7FB5',
};


// React Native Paper's default MD3 type scale uses a distinct "medium"
// font alias on Android (sans-serif-medium) for buttons/chips/labels,
// which renders visibly differently from plain Text with fontWeight set
// (what every custom component in this app uses) — normalizing both to
// the same bare system family so Paper components match everywhere else.
const systemFontFamily = Platform.select({ ios: 'System', default: 'sans-serif' });
const fonts = configureFonts({ config: { fontFamily: systemFontFamily } });

export const theme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 3,
  fonts,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.accent,
    onPrimary: colors.accentInk,
    primaryContainer: colors.accentSoft,
    onPrimaryContainer: colors.accent,
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: colors.surfaceMuted,
    onSurface: colors.text,
    onSurfaceVariant: colors.textSecondary,
    outline: colors.border,
    error: colors.danger,
  },
};
