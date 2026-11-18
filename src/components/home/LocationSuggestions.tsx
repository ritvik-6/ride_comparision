import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radius, spacing } from '@/theme';
import type { LocationField, Place } from '@/types';

export interface LocationSuggestionsProps {
  /** Which field the panel belongs to. */
  field: LocationField;
  /** Current text, used by the empty state. */
  query: string;
  places: readonly Place[];
  onSelect: (place: Place) => void;
}

const FIELD_LABELS: Record<LocationField, string> = {
  pickup: 'Pickup',
  destination: 'Destination',
};

/**
 * Scrollable suggestion panel for one route field.
 *
 * Rows are tap targets of at least 48pt, and the list scrolls inside a bounded
 * height so the keyboard stays usable on short Android screens.
 */
export function LocationSuggestions({
  field,
  query,
  places,
  onSelect,
}: LocationSuggestionsProps) {
  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length > 0;

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View
          style={[
            styles.indicator,
            field === 'pickup' ? styles.pickupIndicator : styles.destinationIndicator,
          ]}
        />
        <AppText variant="label" style={styles.headerLabel}>
          {FIELD_LABELS[field]}
        </AppText>
        <AppText variant="caption" style={styles.headerCount}>
          {isSearching
            ? places.length === 1
              ? '1 place'
              : `${places.length} places`
            : 'Popular in Hyderabad'}
        </AppText>
      </View>

      {places.length === 0 ? (
        <View style={styles.empty} accessibilityLiveRegion="polite">
          <Ionicons name="search" size={18} color={colors.textSubtle} />
          <AppText variant="subtitle">No places match “{trimmedQuery}”</AppText>
          <AppText variant="caption" style={styles.emptyHint}>
            Try a locality such as Gachibowli, Banjara Hills or the airport.
          </AppText>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {places.map((place, index) => (
            <Pressable
              key={place.id}
              accessibilityRole="button"
              accessibilityLabel={`${place.name}, ${place.address}`}
              accessibilityHint={`Sets ${place.name} as the ${FIELD_LABELS[field].toLowerCase()} location.`}
              onPress={() => onSelect(place)}
              style={({ pressed }) => [
                styles.row,
                index > 0 && styles.rowDivider,
                pressed && styles.rowPressed,
              ]}
            >
              <View style={styles.rowIcon}>
                <Ionicons
                  name="location-outline"
                  size={17}
                  color={colors.textMuted}
                />
              </View>

              <View style={styles.rowCopy}>
                <AppText variant="subtitle" numberOfLines={1}>
                  {place.name}
                </AppText>
                <AppText variant="caption" numberOfLines={1}>
                  {place.address}
                </AppText>
              </View>

              <Ionicons
                name="arrow-forward-outline"
                size={16}
                color={colors.textSubtle}
              />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: -spacing.xs,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  indicator: {
    width: 10,
    height: 10,
  },
  pickupIndicator: {
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  destinationIndicator: {
    borderRadius: 3,
    backgroundColor: colors.text,
  },
  headerLabel: {
    fontSize: 11,
  },
  headerCount: {
    marginLeft: 'auto',
  },
  list: {
    maxHeight: 264,
  },
  listContent: {
    paddingBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowPressed: {
    backgroundColor: colors.surface,
  },
  rowIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  empty: {
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  emptyHint: {
    color: colors.textSubtle,
  },
});
