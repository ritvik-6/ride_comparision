import { colors } from './colors';
import { layout, radius, spacing } from './spacing';
import { fontSize, fontWeight, lineHeight, textVariants } from './typography';

export { colors } from './colors';
export type { ColorName } from './colors';
export { layout, radius, spacing } from './spacing';
export { fontSize, fontWeight, lineHeight, textVariants } from './typography';
export type { TextVariant } from './typography';

/** Single theme object for code that needs tokens as a value. */
export const theme = {
  colors,
  spacing,
  radius,
  layout,
  fontSize,
  lineHeight,
  fontWeight,
  textVariants,
} as const;

export type Theme = typeof theme;
