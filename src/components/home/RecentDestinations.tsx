import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, radius, spacing } from '@/theme';
import type { Place } from '@/types';

export interface RecentDestinationsProps {
  places: readonly Place[];
  onSelect: (place: Place) => void;
}

/** Saved places with sample addresses, drawn from local mock data. */
export function RecentDestinations({
  places,
  onSelect,
}: RecentDestinationsProps) {
  return (
    <View style={styles.root}>
      <SectionHeader
        title="Recent destinations"
        caption="Tap a place to use it as your destination."
      />

      <Card style={styles.card}>
        {places.map((place, index) => (
          <Pressable
            key={place.id}
            accessibilityRole="button"
            accessibilityLabel={`${place.name}, ${place.address}`}
            onPress={() => onSelect(place)}
            style={({ pressed }) => [
              styles.row,
              index > 0 && styles.rowDivider,
              pressed && styles.rowPressed,
            ]}
          >
            <View style={styles.icon}>
              <Ionicons name="time-outline" size={18} color={colors.textMuted} />
            </View>

            <View style={styles.copy}>
              <AppText variant="subtitle" numberOfLines={1}>
                {place.name}
              </AppText>
              <AppText variant="caption" numberOfLines={1}>
                {place.address}
              </AppText>
            </View>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textSubtle}
            />
          </Pressable>
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
    padding: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  icon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
});
