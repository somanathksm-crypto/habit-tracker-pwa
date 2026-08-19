import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useData } from '../lib/store';
import { useColors, useIsDark, type Colors } from '../theme';

/**
 * Sun/moon switch for the palette.
 *
 * The stored preference starts as 'system', so a fresh install still follows
 * the phone. The first tap is what opts out of that — from then on the choice
 * is explicit, which is the point of having the control at all.
 *
 * The icon shows what you'd switch *to*, matching [LayoutToggle].
 */
export function ThemeToggle() {
  const { setThemePreference } = useData();
  const colors = useColors();
  const isDark = useIsDark();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Pressable
      hitSlop={10}
      onPress={() => setThemePreference(isDark ? 'light' : 'dark')}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <MaterialCommunityIcons
        name={isDark ? 'weather-sunny' : 'weather-night'}
        size={21}
        color={colors.accent}
      />
    </Pressable>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    button: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.accentFaint,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
