import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { RIDE_PROVIDERS } from '@/constants';
import { colors, radius, spacing } from '@/theme';

/** The three providers RideCompare compares, with their ride categories. */
export function ProviderSection() {
  return (
    <View style={styles.root}>
      <SectionHeader
        title="Providers we compare"
        caption="One search across all three apps."
      />

      <Card style={styles.card}>
        {RIDE_PROVIDERS.map((provider, index) => (
          <View
            key={provider.id}
            style={[styles.row, index > 0 && styles.rowDivider]}
          >
            <View
              style={[
                styles.badge,
                // Soft brand tint keeps the initial readable on every brand color.
                { backgroundColor: `${provider.brandColor}1F` },
              ]}
            >
              <AppText variant="subtitle" style={styles.badgeLabel}>
                {provider.name.charAt(0)}
              </AppText>
            </View>

            <View style={styles.copy}>
              <AppText variant="subtitle">{provider.name}</AppText>
              <AppText variant="caption" numberOfLines={1}>
                {provider.categories.join('  ·  ')}
              </AppText>
            </View>
          </View>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
  },
  card: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  badge: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  badgeLabel: {
    color: colors.text,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
});
