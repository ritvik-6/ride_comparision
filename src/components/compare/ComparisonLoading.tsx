import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { colors, spacing } from '@/theme';

/** Placeholder shown while the backend builds the comparison. */
export function ComparisonLoading() {
  return (
    <Card style={styles.card}>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Loading demo fare estimates for this route"
        style={styles.inner}
      >
        <ActivityIndicator color={colors.accent} size="small" />

        <View style={styles.copy}>
          <AppText variant="heading">Comparing rides…</AppText>
          <AppText variant="bodyMuted">
            Fetching sample fares and ETAs for Rapido, Uber and Ola.
          </AppText>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
});
