import { StyleSheet, Text, type TextProps } from 'react-native';

import { textVariants, type TextVariant } from '@/theme';

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
}

/** Text with the app's typographic scale applied. */
export function AppText({
  variant = 'body',
  style,
  ...props
}: AppTextProps) {
  return <Text {...props} style={[styles.base, textVariants[variant], style]} />;
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
});
