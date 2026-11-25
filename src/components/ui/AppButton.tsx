import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppText } from './AppText';
import { colors, radius, spacing } from '@/theme';

export type AppButtonVariant = 'primary' | 'secondary';

export interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: AppButtonVariant;
  /** Rendered after the label, typically an icon. */
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  disabled?: boolean;
}

/** Full-width action button with a green primary and a quiet secondary style. */
export function AppButton({
  label,
  onPress,
  variant = 'primary',
  trailing,
  style,
  accessibilityHint,
  disabled = false,
}: AppButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      android_ripple={{
        color: isPrimary ? 'rgba(255, 255, 255, 0.18)' : 'rgba(11, 15, 13, 0.06)',
      }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        disabled ? styles.disabled : null,
        pressed ? styles.pressed : null,
        style,
      ]}
    >
      <AppText
        variant="subtitle"
        style={isPrimary ? styles.labelPrimary : styles.labelSecondary}
      >
        {label}
      </AppText>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    // Keeps the Android ripple inside the rounded corners.
    overflow: 'hidden',
  },
  primary: {
    backgroundColor: colors.accent,
  },
  secondary: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.94,
  },
  disabled: {
    opacity: 0.5,
  },
  labelPrimary: {
    color: colors.textInverse,
  },
  labelSecondary: {
    color: colors.text,
  },
  trailing: {
    marginLeft: spacing.sm,
  },
});
