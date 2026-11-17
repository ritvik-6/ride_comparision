import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import type { RideProviderMeta } from '@/types';
import { colors, radius, spacing } from '@/theme';

export interface ProviderChipProps {
  provider: RideProviderMeta;
}

/** Compact provider pill showing the brand dot and provider name. */
export function ProviderChip({ provider }: ProviderChipProps) {
  return (
    <View style={styles.chip}>
      <View style={[styles.dot, { backgroundColor: provider.brandColor }]} />
      <AppText variant="subtitle" style={styles.label}>
        {provider.shortName}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
  },
});
