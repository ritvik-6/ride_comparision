import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/theme';

export interface CardProps {
  children: ReactNode;
  /** Adds the soft green tint used for highlighted content. */
  accent?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Rounded, hairline-bordered surface used across the app. */
export function Card({ children, accent = false, style }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        accent ? styles.accent : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.xl,
    // Subtle elevation keeps cards readable on white without heavy shadows.
    shadowColor: colors.black,
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  accent: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentSoft,
  },
});
