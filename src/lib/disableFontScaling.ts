import { Text, TextInput } from 'react-native';

// Text was clipping its own last character on a real device — the layout
// box gets sized using the base fontSize, but if the device's system font
// scale (Settings > Display > Font size) is above 100%, RN renders the
// glyphs larger than that box, so the tail overflows and gets clipped.
// Forcing every Text/TextInput to ignore system font scaling keeps the
// app's own type scale in full control, matching the approved design.
// Must run before any component renders — imported first in App.tsx.
type TextWithDefaults = typeof Text & { defaultProps?: { allowFontScaling?: boolean } };
type TextInputWithDefaults = typeof TextInput & { defaultProps?: { allowFontScaling?: boolean } };

const TextAny = Text as TextWithDefaults;
const TextInputAny = TextInput as TextInputWithDefaults;

TextAny.defaultProps = TextAny.defaultProps || {};
TextAny.defaultProps.allowFontScaling = false;

TextInputAny.defaultProps = TextInputAny.defaultProps || {};
TextInputAny.defaultProps.allowFontScaling = false;
