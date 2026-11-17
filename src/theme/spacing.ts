/** 4pt spacing scale. */
export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

/** Corner radii for cards, inputs and pills. */
export const radius = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 28,
  pill: 999,
} as const;

/** Layout constants for the Android-first responsive shell. */
export const layout = {
  /** Phone gutter */
  screenPadding: spacing.xl,
  /** Content column never grows past this width on tablets/foldables */
  maxContentWidth: 560,
} as const;
