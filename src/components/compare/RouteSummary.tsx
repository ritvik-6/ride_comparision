import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { colors, radius, spacing } from '@/theme';
import type { Place } from '@/types';

export interface RouteSummaryProps {
  pickup: Place;
  destination: Place;
}

/** The selected trip, restated at the top of the comparison screen. */
export function RouteSummary({ pickup, destination }: RouteSummaryProps) {
  return (
    <Card style={styles.card}>
      <AppText variant="label">Your route</AppText>

      <View style={styles.row}>
        <View style={styles.rail}>
          <View style={styles.pickupDot} />
          <View style={styles.railLine} />
          <View style={styles.destinationDot} />
        </View>

        <View style={styles.places}>
          <View style={styles.place}>
            <AppText variant="label" style={styles.placeLabel}>
              Pickup
            </AppText>
            <AppText variant="subtitle" numberOfLines={2}>
              {pickup.name}
            </AppText>
            <AppText variant="caption" numberOfLines={2}>
              {pickup.address}
            </AppText>
          </View>

          <View style={styles.divider} />

          <View style={styles.place}>
            <AppText variant="label" style={styles.placeLabel}>
              Destination
            </AppText>
            <AppText variant="subtitle" numberOfLines={2}>
              {destination.name}
            </AppText>
            <AppText variant="caption" numberOfLines={2}>
              {destination.address}
            </AppText>
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rail: {
    width: 14,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  railLine: {
    flex: 1,
    minHeight: 20,
    width: 1.5,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
  },
  destinationDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: colors.text,
  },
  places: {
    flex: 1,
  },
  place: {
    gap: 2,
  },
  placeLabel: {
    fontSize: 10,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
});
