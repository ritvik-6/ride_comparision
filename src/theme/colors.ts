/**
 * Central color palette. Every color used by the app should come from here.
 * Design direction: white canvas, near-black typography, single green accent.
 */
export const colors = {
  /** App background */
  background: '#FFFFFF',
  /** Raised surfaces such as cards and sheets */
  surface: '#FFFFFF',
  /** Subtle filled areas, chips and inputs */
  surfaceMuted: '#F5F7F6',
  /** Hairline separators and card borders */
  border: '#E8ECEA',
  borderStrong: '#D5DCD9',

  /** Primary typography */
  text: '#0B0F0D',
  /** Secondary typography */
  textMuted: '#5C6963',
  /** Tertiary typography, hints, disclaimers */
  textSubtle: '#8A968F',
  /** Text on accent backgrounds */
  textInverse: '#FFFFFF',

  /** Brand accent */
  accent: '#0FA968',
  accentPressed: '#0B8A55',
  accentSoft: '#E7F8EF',

  /** Status colors */
  success: '#0FA968',
  warning: '#F5A524',
  danger: '#E5484D',

  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(11, 15, 13, 0.45)',
  transparent: 'transparent',
} as const;

export type ColorName = keyof typeof colors;
