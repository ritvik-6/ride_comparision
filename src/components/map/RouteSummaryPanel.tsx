import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { colors, radius, spacing } from '@/theme';
import type { LocationField, MapLocation } from '@/types';

export interface RouteSummaryPanelProps {
  pickup: MapLocation;
  destination: MapLocation;
  /** Opens the search panel for that end of the route. */
  onEdit: (field: LocationField) => void;
  onClear: () => void;
  onConfirm: () => void;
  bottomInset: number;
  /** Tile and data attribution, kept visible with the map on screen. */
  attribution: string;
  onHeightChange: (height: number) => void;
}

interface RouteRowProps {
  field: LocationField;
  location: MapLocation;
  onEdit: (field: LocationField) => void;
}

function RouteRow({ field, location, onEdit }: RouteRowProps) {
  const isPickup = field === 'pickup';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Change ${isPickup ? 'pickup' : 'destination'}, currently ${location.displayName}`}
      accessibilityHint="Opens the search panel for this location."
      onPress={() => onEdit(field)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rail}>
        <View style={isPickup ? styles.pickupDot : styles.destinationDot} />
        {isPickup ? <View style={styles.railLine} /> : null}
      </View>

      <View style={styles.copy}>
        <AppText variant="label">{isPickup ? 'Pickup' : 'Destination'}</AppText>
        <AppText variant="subtitle" numberOfLines={1}>
          {location.displayName}
        </AppText>
        <AppText variant="caption" numberOfLines={2}>
          {location.formattedAddress}
        </AppText>
      </View>

      <View style={styles.edit}>
        <Ionicons name="create-outline" size={18} color={colors.accent} />
      </View>
    </Pressable>
  );
}

/**
 * Confirmation panel.
 *
 * Shown instead of the search sheet once both ends of the route are known, so
 * the map stays visible while the rider checks the route and continues.
 */
export function RouteSummaryPanel({
  pickup,
  destination,
  onEdit,
  onClear,
  onConfirm,
  bottomInset,
  attribution,
  onHeightChange,
}: RouteSummaryPanelProps) {
  return (
    <View
      style={[styles.sheet, { paddingBottom: bottomInset + spacing.lg }]}
      onLayout={(event) => onHeightChange(event.nativeEvent.layout.height)}
    >
      <View style={styles.grabber} />

      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText variant="label">Your route</AppText>
          <AppText variant="subtitle">Ready when you are</AppText>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear both locations"
          onPress={onClear}
          hitSlop={8}
          style={({ pressed }) => [styles.clear, pressed && styles.rowPressed]}
        >
          <Ionicons name="refresh-outline" size={15} color={colors.textMuted} />
          <AppText variant="caption" style={styles.clearLabel}>
            Reset
          </AppText>
        </Pressable>
      </View>

      <View style={styles.rows}>
        <RouteRow field="pickup" location={pickup} onEdit={onEdit} />
        <View style={styles.divider} />
        <RouteRow field="destination" location={destination} onEdit={onEdit} />
      </View>

      <AppButton
        label="Compare fares"
        onPress={onConfirm}
        trailing={
          <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
        }
        accessibilityHint="Opens the fare comparison for this route."
      />

      <AppText variant="caption" style={styles.attribution}>
        {attribution}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    elevation: 12,
    shadowColor: colors.black,
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    marginBottom: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
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
  clearLabel: {
    color: colors.textMuted,
  },
  rows: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rail: {
    width: 14,
    alignItems: 'center',
    paddingTop: spacing.md,
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
  destinationDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: colors.text,
  },
  railLine: {
    width: 1.5,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  edit: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 26,
  },
  attribution: {
    fontSize: 10,
    color: colors.textSubtle,
  },
});
