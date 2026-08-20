import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useColors } from '../theme';

interface Props {
  /** 0..1 — how much of the day's slots are ticked. */
  fraction: number;
  size: number;
  radius: number;
  /** Faded treatment for days the habit was never due. */
  muted?: boolean;
  /**
   * Outline, drawn on this element rather than a wrapper. A wrapper would sit
   * outside the clipped fill and lose the rounded corners — and the grid needs
   * the outline, or an untouched week reads as blank space instead of seven
   * unticked days.
   */
  borderWidth?: number;
  borderColor?: string;
}

/**
 * A day square that can be part-filled.
 *
 * Fills from the bottom like a glass, rather than shading the whole box a
 * lighter colour — at 23px a partial *height* is readable where a partial
 * *opacity* just looks like a rendering mistake.
 */
export function SlotFill({ fraction, size, radius, muted, borderWidth, borderColor }: Props) {
  const colors = useColors();
  const clamped = Math.max(0, Math.min(1, fraction));

  return (
    <View
      style={[
        styles.box,
        { width: size, height: size, borderRadius: radius, backgroundColor: colors.dayEmpty },
        borderWidth ? { borderWidth, borderColor: borderColor ?? colors.border } : null,
        muted && styles.muted,
      ]}
    >
      {clamped > 0 && (
        <View
          style={{
            height: `${clamped * 100}%`,
            backgroundColor: colors.dayFilled,
            borderBottomLeftRadius: radius,
            borderBottomRightRadius: radius,
            // Square off the top edge unless the box is full, so a partial
            // fill reads as a level rather than a smaller box.
            borderTopLeftRadius: clamped === 1 ? radius : 0,
            borderTopRightRadius: clamped === 1 ? radius : 0,
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden', justifyContent: 'flex-end' },
  muted: { opacity: 0.4 },
});
