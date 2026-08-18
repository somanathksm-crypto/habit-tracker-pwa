import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '../theme';

interface Props {
  stage: 1 | 2 | 3 | 4 | 5;
  size?: number;
}

/**
 * The "Forge/Flex" companion avatar — a round creature that flexes one arm,
 * the bicep visibly bulking up across 5 stages. Ported from the approved
 * HTML/SVG mockup (see habit-tracker-project-state memory for the artifact
 * link) — geometry and gradients carried over as-is. The arm is built as a
 * bent upper-arm + forearm pair (not a single straight segment) with a
 * bicep bulge and a knuckled fist, closer to the reference sticker-style
 * flex icon than a plain rotated capsule. react-native-svg has unreliable
 * cross-platform drop-shadow filter support, so the mockup's per-shape
 * feDropShadow is dropped here; the avatar instead sits in a normal card
 * with the app's standard card shadow.
 */
export function AvatarFlex({ stage, size = 72 }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const prevStage = useRef(stage);

  useEffect(() => {
    if (stage > prevStage.current) {
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.3, friction: 3, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
    }
    prevStage.current = stage;
  }, [stage, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="bodyGradFaint" cx="34%" cy="28%" r="80%">
          <Stop offset="0%" stopColor={colors.accentFaint} />
          <Stop offset="100%" stopColor={colors.accentSoft} />
        </RadialGradient>
        <RadialGradient id="bodyGrad" cx="34%" cy="28%" r="80%">
          <Stop offset="0%" stopColor={colors.accentMedium} />
          <Stop offset="100%" stopColor={colors.accent} />
        </RadialGradient>
        <RadialGradient id="cheekGrad" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={colors.clay} stopOpacity={0.5} />
          <Stop offset="100%" stopColor={colors.clay} stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {stage === 1 && (
        <>
          <Ellipse cx="40.75" cy="78" rx="13" ry="3.4" fill={colors.border} opacity={0.4} />
          {/* upper arm (shoulder -> elbow) */}
          <Rect x="49.5" y="54" width="5" height="11" rx="2.5" fill="url(#bodyGradFaint)" rotation="95" origin="52, 54" />
          {/* forearm (elbow -> fist) */}
          <Rect x="61.46" y="53.04" width="3.6" height="10" rx="1.8" fill="url(#bodyGradFaint)" rotation="-150" origin="62.96, 53.04" />
          {/* bicep bulge */}
          <Circle cx="56.6" cy="53.6" r="3.6" fill="url(#bodyGradFaint)" />
          {/* fist + knuckles + thumb */}
          <Circle cx="57.96" cy="44.38" r="3.4" fill="url(#bodyGradFaint)" />
          <Circle cx="56.26" cy="42" r="1.2" fill="url(#bodyGradFaint)" />
          <Circle cx="57.96" cy="41.5" r="1.2" fill="url(#bodyGradFaint)" />
          <Circle cx="59.66" cy="42" r="1.2" fill="url(#bodyGradFaint)" />
          <Circle cx="55.41" cy="45.4" r="1.4" fill="url(#bodyGradFaint)" />
          <Circle cx="40.75" cy="58.5" r="15" fill="url(#bodyGradFaint)" />
          <Circle cx="34.95" cy="52" r="3.4" fill={colors.surface} opacity={0.4} />
        </>
      )}

      {stage === 2 && (
        <>
          <Ellipse cx="40.25" cy="79" rx="14.5" ry="3.5" fill={colors.border} opacity={0.4} />
          <Rect x="50.6" y="54" width="6.2" height="12" rx="3.1" fill="url(#bodyGradFaint)" rotation="95" origin="53, 54" />
          <Rect x="63.2" y="52.95" width="4.2" height="11" rx="2.1" fill="url(#bodyGradFaint)" rotation="-150" origin="64.95, 52.95" />
          <Circle cx="58" cy="53.6" r="4.4" fill="url(#bodyGradFaint)" />
          <Circle cx="59.45" cy="43.42" r="3.9" fill="url(#bodyGradFaint)" />
          <Circle cx="57.5" cy="40.65" r="1.35" fill="url(#bodyGradFaint)" />
          <Circle cx="59.45" cy="40.1" r="1.35" fill="url(#bodyGradFaint)" />
          <Circle cx="61.4" cy="40.65" r="1.35" fill="url(#bodyGradFaint)" />
          <Circle cx="56.53" cy="44.59" r="1.6" fill="url(#bodyGradFaint)" />
          <Circle cx="40.25" cy="59.1" r="17" fill="url(#bodyGradFaint)" />
          <Circle cx="33.95" cy="52" r="3.8" fill={colors.surface} opacity={0.38} />
          <Circle cx="34.95" cy="57" r="2" fill={colors.text} />
          <Circle cx="45.95" cy="57" r="2" fill={colors.text} />
          <Circle cx="34.35" cy="56.2" r="0.55" fill={colors.surface} />
          <Circle cx="45.35" cy="56.2" r="0.55" fill={colors.surface} />
        </>
      )}

      {stage === 3 && (
        <>
          <Ellipse cx="39.75" cy="81" rx="16" ry="3.6" fill={colors.border} opacity={0.4} />
          <Rect x="50.2" y="55" width="7.6" height="13.5" rx="3.8" fill="url(#bodyGrad)" rotation="95" origin="54, 55" />
          <Rect x="65.65" y="53.82" width="5" height="12.5" rx="2.5" fill="url(#bodyGrad)" rotation="-150" origin="67.45, 53.82" />
          <Circle cx="59.65" cy="54.51" r="5.4" fill="url(#bodyGrad)" />
          <Path d="M56.15 53.51 Q59.15 51.51 62.65 53.51" stroke={colors.accentFaint} strokeWidth="1" opacity={0.6} fill="none" />
          <Circle cx="61.2" cy="42.99" r="4.5" fill="url(#bodyGrad)" />
          <Circle cx="58.95" cy="39.83" r="1.55" fill="url(#bodyGrad)" />
          <Circle cx="61.2" cy="39.17" r="1.55" fill="url(#bodyGrad)" />
          <Circle cx="63.45" cy="39.83" r="1.55" fill="url(#bodyGrad)" />
          <Circle cx="57.83" cy="44.34" r="1.8" fill="url(#bodyGrad)" />
          <Circle cx="39.75" cy="60.7" r="19" fill="url(#bodyGrad)" />
          <Circle cx="32.95" cy="53" r="4.4" fill={colors.surface} opacity={0.24} />
          <Circle cx="29.95" cy="63" r="3.6" fill="url(#cheekGrad)" />
          <Circle cx="48.95" cy="63" r="3.6" fill="url(#cheekGrad)" />
          <Circle cx="33.95" cy="59" r="2.2" fill={colors.text} />
          <Circle cx="45.95" cy="59" r="2.2" fill={colors.text} />
          <Circle cx="33.25" cy="58.1" r="0.6" fill={colors.surface} />
          <Circle cx="45.25" cy="58.1" r="0.6" fill={colors.surface} />
          <Path d="M34.95 67 Q39.95 71 44.95 67" stroke={colors.text} strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </>
      )}

      {stage === 4 && (
        <>
          <Ellipse cx="39.25" cy="83" rx="17.5" ry="3.8" fill={colors.border} opacity={0.4} />
          <Rect x="50.6" y="55" width="9.2" height="15" rx="4.6" fill="url(#bodyGrad)" rotation="95" origin="55, 55" />
          <Rect x="68.44" y="53.69" width="5.8" height="14" rx="2.9" fill="url(#bodyGrad)" rotation="-150" origin="69.94, 53.69" />
          <Circle cx="61.27" cy="54.45" r="6.6" fill="url(#bodyGrad)" />
          <Path d="M57.77 53.45 Q60.77 51.45 64.27 53.45" stroke={colors.accentFaint} strokeWidth="1.1" opacity={0.6} fill="none" />
          <Path d="M59 56.5 Q61.5 55 64 56.5" stroke={colors.accentFaint} strokeWidth="1" opacity={0.5} fill="none" />
          <Circle cx="62.94" cy="41.57" r="5.2" fill="url(#bodyGrad)" />
          <Circle cx="60.34" cy="38.03" r="1.8" fill="url(#bodyGrad)" />
          <Circle cx="62.94" cy="37.29" r="1.8" fill="url(#bodyGrad)" />
          <Circle cx="65.54" cy="38.03" r="1.8" fill="url(#bodyGrad)" />
          <Circle cx="59.04" cy="42.13" r="2.1" fill="url(#bodyGrad)" />
          <Circle cx="39.25" cy="61.3" r="21" fill="url(#bodyGrad)" />
          <Circle cx="31.95" cy="53" r="4.8" fill={colors.surface} opacity={0.22} />
          <Circle cx="28.45" cy="64" r="4" fill="url(#cheekGrad)" />
          <Circle cx="49.45" cy="64" r="4" fill="url(#cheekGrad)" />
          <Circle cx="33.45" cy="60" r="2.4" fill={colors.accentFaint} />
          <Circle cx="45.95" cy="60" r="2.4" fill={colors.accentFaint} />
          <Circle cx="32.65" cy="59.1" r="0.65" fill={colors.surface} />
          <Circle cx="45.25" cy="59.1" r="0.65" fill={colors.surface} />
          <Path d="M33.95 69 Q39.95 74 45.95 69" stroke={colors.accentFaint} strokeWidth="2" strokeLinecap="round" fill="none" />
        </>
      )}

      {stage === 5 && (
        <>
          <Circle cx="39.95" cy="58" r="34" fill={colors.clay} opacity={0.13} />
          <Ellipse cx="38.75" cy="86" rx="19" ry="4" fill={colors.border} opacity={0.4} />
          <Rect x="50.5" y="56" width="11" height="16.5" rx="5.5" fill="url(#bodyGrad)" rotation="95" origin="56, 56" />
          <Rect x="70.7" y="54.56" width="6.6" height="15.5" rx="3.3" fill="url(#bodyGrad)" rotation="-150" origin="72.43, 54.56" />
          <Circle cx="62.9" cy="55.4" r="8" fill="url(#bodyGrad)" />
          <Path d="M59.4 54.4 Q62.4 52.4 65.9 54.4" stroke={colors.accentFaint} strokeWidth="1.2" opacity={0.65} fill="none" />
          <Path d="M60.5 57 Q63 55.5 66 57" stroke={colors.accentFaint} strokeWidth="1.1" opacity={0.55} fill="none" />
          <Path d="M61.5 59.5 Q63.8 58.2 66.2 59.5" stroke={colors.accentFaint} strokeWidth="1" opacity={0.45} fill="none" />
          <Circle cx="64.68" cy="41.14" r="6" fill="url(#bodyGrad)" />
          <Circle cx="61.68" cy="37.04" r="2.1" fill="url(#bodyGrad)" />
          <Circle cx="64.68" cy="36.24" r="2.1" fill="url(#bodyGrad)" />
          <Circle cx="67.68" cy="37.04" r="2.1" fill="url(#bodyGrad)" />
          <Circle cx="60.18" cy="41.94" r="2.4" fill="url(#bodyGrad)" />
          <Circle cx="39.95" cy="62.9" r="23" fill="url(#bodyGrad)" />
          <Circle cx="30.95" cy="54" r="5.2" fill={colors.surface} opacity={0.2} />
          <Circle cx="26.95" cy="66" r="4.4" fill="url(#cheekGrad)" />
          <Circle cx="49.95" cy="66" r="4.4" fill="url(#cheekGrad)" />
          <Circle cx="32.95" cy="61" r="2.6" fill={colors.accentFaint} />
          <Circle cx="46.45" cy="61" r="2.6" fill={colors.accentFaint} />
          <Circle cx="32.05" cy="60" r="0.7" fill={colors.surface} />
          <Circle cx="45.55" cy="60" r="0.7" fill={colors.surface} />
          <Path d="M33.45 71 Q39.95 77 46.45 71" stroke={colors.accentFaint} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <Polygon points="51.68,26.14 53.68,31.14 58.68,33.14 53.68,35.14 51.68,40.14 49.68,35.14 44.68,33.14 49.68,31.14" fill={colors.clay} />
          <Polygon points="75.68,19.14 77.68,24.14 82.68,26.14 77.68,28.14 75.68,33.14 73.68,28.14 68.68,26.14 73.68,24.14" fill={colors.clay} />
        </>
      )}
      </Svg>
    </Animated.View>
  );
}
