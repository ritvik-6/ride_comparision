import { theme, type Theme } from '@/theme';

/** Returns the app theme. Kept as a hook so a user-selectable theme can slot in later. */
export function useTheme(): Theme {
  return theme;
}
