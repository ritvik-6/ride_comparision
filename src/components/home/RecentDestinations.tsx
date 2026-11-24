import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import type { RecentLocation } from '@/services/recentSearches';
import { colors, radius, spacing } from '@/theme';

export interface RecentDestinationsProps {
  /** Stored selections, newest first. */
  locations: readonly RecentLocation[];
  onSelect: (location: RecentLocation) => void;
  onClear: () => void;
}

/** Key for a row: the provider place id when known, else the exact point. */
const rowKey = (location: RecentLocation): string =>
  location.placeId ??
  `${location.latitude.toFixed(5)},${location.longitude.toFixed(5)}`;

/**
 * Locations the rider selected recently.
 *
 * Backed by the shared recent-search store, so this list matches the one the map
 * screen offers and survives an app restart. Only locations with real
 * coordinates are stored, which is why the empty state talks about choosing a
 * place rather than promising sample destinations.
 */
export function RecentDestinations({
  locations,
  onSelect,
  onClear,
}: RecentDestinationsProps) {
  const hasLocations = locations.length > 0;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <SectionHeader
            title="Recent searches"
            caption="Tap a place to use it as your destination."
          />
        </View>

        {hasLocations ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear recent searches"
            onPress={onClear}
            hitSlop={8}
            style={({ pressed }) => [styles.clear, pressed && styles.clearPressed]}
          >
            <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
            <AppText variant="caption" style={styles.clearLabel}>
              Clear
            </AppText>
          </Pressable>
        ) : null}
      </View>

      <Card style={styles.card}>
        {hasLocations ? (
          locations.map((location, index) => (
            <Pressable
              key={rowKey(location)}
              accessibilityRole="button"
              accessibilityLabel={`${location.displayName}, ${location.formattedAddress}`}
              accessibilityHint="Uses this place as your destination."
              onPress={() => onSelect(location)}
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
                  {location.displayName}
                </AppText>
                <AppText variant="caption" numberOfLines={1}>
                  {location.formattedAddress}
                </AppText>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textSubtle}
              />
            </Pressable>
          ))
        ) : (
          <View style={styles.empty}>
            <View style={styles.icon}>
              <Ionicons name="time-outline" size={18} color={colors.textSubtle} />
            </View>
            <View style={styles.copy}>
              <AppText variant="caption" style={styles.emptyText}>
                Places you pick on the map or from your current location will
                appear here for quick access.
              </AppText>
            </View>
          </View>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
  },
  clear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 32,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  clearPressed: {
    opacity: 0.7,
  },
  clearLabel: {
    color: colors.textMuted,
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
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    color: colors.textMuted,
  },
});
