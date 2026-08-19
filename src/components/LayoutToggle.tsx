import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useData } from '../lib/store';
import { useColors, type Colors } from '../theme';

/**
 * Flips between the card list and the weekly grid.
 *
 * This lives in the header of both habit screens rather than only in Settings:
 * the app used to ask which layout you wanted on first launch, before you had a
 * single habit to look at — a choice made with nothing to compare. Defaulting to
 * cards and putting the switch where the habits actually are moves the decision
 * to a point where it can be made on sight.
 */
export function LayoutToggle() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { habitView, setHabitView } = useData();
  const showingGrid = habitView === 'grid';

  return (
    <Pressable
      hitSlop={10}
      onPress={() => setHabitView(showingGrid ? 'cards' : 'grid')}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel={showingGrid ? 'Switch to card layout' : 'Switch to weekly grid'}
    >
      <MaterialCommunityIcons
        name={showingGrid ? 'card-text-outline' : 'view-grid-outline'}
        size={22}
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
