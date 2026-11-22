import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type TextInputInstance,
} from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { LocationInput } from './LocationInput';
import { LocationSuggestions } from './LocationSuggestions';
import { colors, radius, spacing } from '@/theme';
import type { LocationField, LocationSearchState, Place } from '@/types';

export interface RideSearchCardProps {
  pickup: LocationSearchState;
  destination: LocationSearchState;
  /** Validation message shown when a route field is incomplete. */
  error?: string | null;
  /** Confirmation shown once the route passes validation. */
  notice?: string | null;
  onChangeText: (field: LocationField, value: string) => void;
  onSelectPlace: (field: LocationField, place: Place) => void;
  onFocusField: (field: LocationField) => void;
  onBlurField: (field: LocationField) => void;
  onClearField: (field: LocationField) => void;
  onSwap: () => void;
  onCompare: () => void;
  /** Opens the interactive map screen. */
  onChooseOnMap: () => void;
}

/**
 * Pickup and destination entry with local autocomplete, swap and the primary
 * compare action. Only the focused field shows suggestions.
 */
export function RideSearchCard({
  pickup,
  destination,
  error,
  notice,
  onChangeText,
  onSelectPlace,
  onFocusField,
  onBlurField,
  onClearField,
  onSwap,
  onCompare,
  onChooseOnMap,
}: RideSearchCardProps) {
  const destinationRef = useRef<TextInputInstance>(null);

  const activeField: LocationField | null = pickup.focused
    ? 'pickup'
    : destination.focused
      ? 'destination'
      : null;
  const activeState = activeField === 'pickup' ? pickup : destination;

  return (
    <Card style={styles.card}>
      <AppText variant="label">Search by name</AppText>

      <View style={styles.routeRow}>
        <View style={styles.routeBox}>
          <View style={styles.rail}>
            <View style={styles.pickupDot} />
            <View style={styles.railLine} />
            <View style={styles.destinationDot} />
          </View>

          <View style={styles.fields}>
            <View style={styles.field}>
              <LocationInput
                value={pickup.query}
                placeholder="Pickup location"
                onChangeText={(value) => onChangeText('pickup', value)}
                onFocus={() => onFocusField('pickup')}
                onBlur={() => onBlurField('pickup')}
                onClear={() => onClearField('pickup')}
                onSubmitEditing={() => destinationRef.current?.focus()}
                returnKeyType="next"
                selected={pickup.isSelected}
                accessibilityLabel="Pickup location"
                clearAccessibilityLabel="Clear pickup location"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.field}>
              <LocationInput
                inputRef={destinationRef}
                value={destination.query}
                placeholder="Where are you going?"
                onChangeText={(value) => onChangeText('destination', value)}
                onFocus={() => onFocusField('destination')}
                onBlur={() => onBlurField('destination')}
                onClear={() => onClearField('destination')}
                onSubmitEditing={onCompare}
                returnKeyType="search"
                selected={destination.isSelected}
                accessibilityLabel="Destination"
                clearAccessibilityLabel="Clear destination"
              />
            </View>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Swap pickup and destination"
          onPress={onSwap}
          style={({ pressed }) => [styles.swap, pressed && styles.swapPressed]}
        >
          <Ionicons name="swap-vertical" size={20} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.mapRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose location on map"
          accessibilityHint="Opens a map you can browse to pick your route."
          onPress={onChooseOnMap}
          android_ripple={{ color: 'rgba(11, 15, 13, 0.06)' }}
          style={({ pressed }) => [styles.mapAction, pressed && styles.mapPressed]}
        >
          <Ionicons name="map-outline" size={16} color={colors.accent} />
          <AppText variant="caption" style={styles.mapLabel}>
            Choose on map
          </AppText>
          <Ionicons name="chevron-forward" size={14} color={colors.textSubtle} />
        </Pressable>
      </View>

      {activeField && activeState ? (
        <LocationSuggestions
          field={activeField}
          query={activeState.query}
          places={activeState.suggestions}
          onSelect={(place) => onSelectPlace(activeField, place)}
        />
      ) : null}

      {error ? (
        <View style={styles.message} accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
          <AppText variant="caption" style={styles.errorText}>
            {error}
          </AppText>
        </View>
      ) : null}

      {notice ? (
        <View
          style={[styles.message, styles.notice]}
          accessibilityLiveRegion="polite"
        >
          <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
          <AppText variant="caption" style={styles.noticeText}>
            {notice}
          </AppText>
        </View>
      ) : null}

      <AppButton
        label="Compare rides"
        onPress={onCompare}
        trailing={
          <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
        }
        accessibilityHint="Compares fares once a pickup and destination are selected."
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  routeBox: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  rail: {
    width: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
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
    minHeight: 14,
    width: 1.5,
    backgroundColor: colors.borderStrong,
    borderRadius: radius.pill,
  },
  destinationDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: colors.text,
  },
  fields: {
    flex: 1,
    marginLeft: spacing.md,
  },
  field: {
    justifyContent: 'center',
    minHeight: 52,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  swap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  swapPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  mapRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: -spacing.xs,
  },
  mapAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    overflow: 'hidden',
  },
  mapPressed: {
    opacity: 0.85,
  },
  mapLabel: {
    color: colors.text,
  },
  message: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: -spacing.xs,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
  },
  notice: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  noticeText: {
    flex: 1,
    color: colors.textMuted,
  },
});
