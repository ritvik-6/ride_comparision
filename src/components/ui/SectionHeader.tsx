import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { spacing } from '@/theme';

export interface SectionHeaderProps {
  title: string;
  caption?: string;
}

/** Small section title with an optional one-line description. */
export function SectionHeader({ title, caption }: SectionHeaderProps) {
  return (
    <View style={styles.root}>
      <AppText variant="subtitle">{title}</AppText>
      {caption ? <AppText variant="caption">{caption}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.xs,
  },
});
