import React, { createContext, useContext, useMemo } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { configureFonts, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

/**
 * Both palettes share this shape, so holding either one type-checks the same
 * and a stray or missing token is a compile error rather than a colour that
 * quietly only works in one theme.
 */
export interface Colors {
  background: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textMedium: string;
  textSecondary: string;
  textFaint: string;
  border: string;
  accent: string;
  accentMedium: string;
  accentSoft: string;
  accentFaint: string;
  accentInk: string;
  clay: string;
  claySoft: string;
  success: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  longestStreak: string;
  /** The day squares on the grid and week strip — the app's loudest surface. */
  dayFilled: string;
  dayEmpty: string;
  /** Clock icon and reminder time. */
  alarm: string;
  alarmFaint: string;
  /** Today's marker in the grid's day-letter row. */
  today: string;
}

// v2 palette — approved 2026-08-15. Warm stone ground, deep sage accent,
// clay reserved exclusively for streaks (an earned signal, not decoration).
export const lightColors: Colors = {
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
  dayFilled: '#7C9587',
  dayEmpty: '#EEF2EC',
  alarm: '#35513F',
  alarmFaint: '#EEF2EC',
  today: '#35513F',
};

/**
 * Derived from the light palette, not inverted from it — approved 2026-08-19.
 *
 * Two decisions carry the whole theme. The ground keeps the stone's warm green
 * bias rather than going blue-black, so the sage still belongs on it. And the
 * accent *flips*: #35513F was chosen to be dark against a pale ground and is
 * unreadable on a dark one, so it lifts to #8FB39B — same hue, enough
 * lightness to carry text.
 *
 * The day squares do not follow the accent tints — see dayFilled/dayEmpty.
 */
export const darkColors: Colors = {
  background: '#0D0E0D',
  surface: '#151715',
  surfaceMuted: '#1F221F',
  text: '#ECEAE2', // warm off-white; pure white glares against this ground
  textMedium: '#C4C6BC',
  textSecondary: '#969C92',
  textFaint: '#6B7268',
  border: '#2E322E',
  accent: '#8FB39B',
  accentMedium: '#5E7A68',
  accentSoft: '#2A3B30',
  accentFaint: '#1F2A23',
  accentInk: '#10140F', // inverts, because the fill it sits on inverts
  clay: '#E4593C',
  claySoft: '#3A2A20',
  success: '#8FB39B',
  warning: '#D6A868',
  warningSoft: '#3A2F1E',
  danger: '#E0796D',
  dangerSoft: '#3B2320',
  longestStreak: '#6FA4DC',
  // Deliberately pale rather than dark. The squares read as paper to be filled
  // in, the way a printed tracker does, and sage ticks read as marks on it.
  dayFilled: '#8FA894',
  dayEmpty: '#EDF2EC',
  alarm: '#5B9BD5',
  alarmFaint: '#18242E',
  today: '#5B9BD5',
};

/** 'system' defers to the phone; the other two override it. */
export type ThemeMode = 'system' | 'light' | 'dark';

/**
 * Whether the dark palette applies, given a stored preference and whatever the
 * phone reports.
 *
 * The OS only ever answers 'dark' because `userInterfaceStyle` is "automatic"
 * in app.json — left at "light" it says light forever and 'system' would never
 * resolve dark.
 */
export function isDarkFor(mode: ThemeMode, systemScheme: 'light' | 'dark' | null | undefined): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return systemScheme === 'dark';
}

interface ThemeValue {
  colors: Colors;
  isDark: boolean;
  theme: MD3Theme;
}

/**
 * Defaults to following the phone, so a component rendered outside the provider
 * still gets a sensible palette rather than throwing.
 */
const ThemeContext = createContext<ThemeValue | null>(null);

/**
 * Resolves the palette once, here, rather than in each of the twenty-odd
 * components that read it — they all call [useColors] and stay unaware of where
 * the choice came from. Must sit inside DataProvider, since the preference is
 * stored state.
 */
export function ThemeProvider({ mode, children }: { mode: ThemeMode; children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const value = useMemo<ThemeValue>(() => {
    const isDark = isDarkFor(mode, systemScheme);
    return {
      isDark,
      colors: isDark ? darkColors : lightColors,
      theme: isDark ? darkTheme : lightTheme,
    };
  }, [mode, systemScheme]);

  return React.createElement(ThemeContext.Provider, { value }, children);
}

function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  const systemScheme = useColorScheme();
  if (ctx) return ctx;
  // No provider above (only App's own tree lacks one) — fall back to the phone.
  const isDark = systemScheme === 'dark';
  return { isDark, colors: isDark ? darkColors : lightColors, theme: isDark ? darkTheme : lightTheme };
}

export function useColors(): Colors {
  return useTheme().colors;
}

export function useIsDark(): boolean {
  return useTheme().isDark;
}

// React Native Paper's default MD3 type scale uses a distinct "medium"
// font alias on Android (sans-serif-medium) for buttons/chips/labels,
// which renders visibly differently from plain Text with fontWeight set
// (what every custom component in this app uses) — normalizing both to
// the same bare system family so Paper components match everywhere else.
const systemFontFamily = Platform.select({ ios: 'System', default: 'sans-serif' });
const fonts = configureFonts({ config: { fontFamily: systemFontFamily } });

function buildPaperTheme(colors: Colors, base: MD3Theme): MD3Theme {
  return {
    ...base,
    roundness: 3,
    fonts,
    colors: {
      ...base.colors,
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
}

export const lightTheme = buildPaperTheme(lightColors, MD3LightTheme);
export const darkTheme = buildPaperTheme(darkColors, MD3DarkTheme);

export function usePaperTheme(): MD3Theme {
  return useTheme().theme;
}
