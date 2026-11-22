import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextInputInstance,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import {
  MIN_SEARCH_LENGTH,
  type SuggestionsStatus,
} from '@/hooks/usePlaceSuggestions';
import {
  colors,
  fontSize,
  lineHeight,
  radius,
  spacing,
  textVariants,
} from '@/theme';
import type { LocationField, MapLocation } from '@/types';

export interface CurrentLocationNotice {
  message: string;
  canOpenSettings: boolean;
}

export interface MapSearchPanelProps {
  /** Which location the next tap or search result fills. */
  mode: LocationField;
  onModeChange: (field: LocationField) => void;
  /** Already-selected ends of the route, shown in the bar. */
  pickup: MapLocation | null;
  destination: MapLocation | null;
  query: string;
  onQueryChange: (value: string) => void;
  suggestions: readonly MapLocation[];
  status: SuggestionsStatus;
  errorMessage: string | null;
  onRetry: () => void;
  onSelectSuggestion: (location: MapLocation) => void;
  onUseCurrentLocation: () => void;
  locating: boolean;
  locationError: CurrentLocationNotice | null;
  onOpenSettings: () => void;
  /** Hides the panel, returning to the route summary when a route exists. */
  onDismiss: () => void;
  canDismiss: boolean;
  /** Increment to focus the input, e.g. after tapping a marker. */
  focusToken: number;
  bottomInset: number;
  attribution: string;
  onHeightChange: (height: number) => void;
}

interface RouteBarRowProps {
  field: LocationField;
  location: MapLocation | null;
  active: boolean;
  onPress: (field: LocationField) => void;
}

/**
 * One row of the pickup/destination bar.
 *
 * It shows what is actually stored for that end of the route, which is the only
 * place the rider can confirm a map tap landed on the address they expected.
 * Tapping the row makes it the active field for the next tap or search.
 */
function RouteBarRow({ field, location, active, onPress }: RouteBarRowProps) {
  const isPickup = field === 'pickup';
  const emptyLabel = isPickup
    ? 'Tap the map or search for pickup'
    : 'Tap the map or search for destination';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${isPickup ? 'Pickup' : 'Destination'}: ${
        location ? location.displayName : 'not set'
      }`}
      accessibilityHint={`Makes ${isPickup ? 'pickup' : 'destination'} the location you are setting.`}
      onPress={() => onPress(field)}
      style={({ pressed }) => [
        styles.barRow,
        active && styles.barRowActive,
        pressed && styles.barRowPressed,
      ]}
    >
      <View style={styles.barRail}>
        <View style={isPickup ? styles.pickupDot : styles.destinationDot} />
      </View>

      <View style={styles.barCopy}>
        <AppText variant="label" style={active ? styles.barLabelActive : null}>
          {isPickup ? 'Pickup' : 'Destination'}
        </AppText>

        {location ? (
          <>
            <AppText variant="body" numberOfLines={1}>
              {location.displayName}
            </AppText>
            {active ? (
              <AppText variant="caption" numberOfLines={1}>
                {location.formattedAddress}
              </AppText>
            ) : null}
          </>
        ) : (
          <AppText variant="caption" numberOfLines={1} style={styles.barEmpty}>
            {emptyLabel}
          </AppText>
        )}
      </View>

      <Ionicons
        name={active ? 'chevron-forward' : 'ellipse-outline'}
        size={active ? 16 : 12}
        color={active ? colors.accent : colors.borderStrong}
      />
    </Pressable>
  );
}

/** Floating bottom sheet: the pickup/destination bar plus place search. */
export function MapSearchPanel({
  mode,
  onModeChange,
  pickup,
  destination,
  query,
  onQueryChange,
  suggestions,
  status,
  errorMessage,
  onRetry,
  onSelectSuggestion,
  onUseCurrentLocation,
  locating,
  locationError,
  onOpenSettings,
  onDismiss,
  canDismiss,
  focusToken,
  bottomInset,
  attribution,
  onHeightChange,
}: MapSearchPanelProps) {
  const inputRef = useRef<TextInputInstance>(null);
  const trimmedLength = query.trim().length;
  const isTooShort =
    trimmedLength > 0 && trimmedLength < MIN_SEARCH_LENGTH && status !== 'loading';
  const showEmpty =
    status === 'ready' &&
    suggestions.length === 0 &&
    trimmedLength >= MIN_SEARCH_LENGTH;

  // Only focus on an explicit request, so opening the map never pops a keyboard.
  useEffect(() => {
    if (focusToken > 0) {
      inputRef.current?.focus();
    }
  }, [focusToken]);

  return (
    <View
      style={[styles.sheet, { paddingBottom: bottomInset + spacing.lg }]}
      onLayout={(event) => onHeightChange(event.nativeEvent.layout.height)}
    >
      <View style={styles.grabber} />

      <View style={styles.bar}>
        <RouteBarRow
          field="pickup"
          location={pickup}
          active={mode === 'pickup'}
          onPress={onModeChange}
        />
        <View style={styles.barDivider} />
        <RouteBarRow
          field="destination"
          location={destination}
          active={mode === 'destination'}
          onPress={onModeChange}
        />
      </View>

      <View style={styles.inputRow}>
        <View
          style={[
            styles.inputDot,
            mode === 'pickup' ? styles.pickupDot : styles.destinationDot,
          ]}
        />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={onQueryChange}
          placeholder={mode === 'pickup' ? 'Search pickup' : 'Where to?'}
          placeholderTextColor={colors.textSubtle}
          style={styles.input}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="search"
          selectionColor={colors.accent}
          accessibilityLabel={
            mode === 'pickup' ? 'Search pickup location' : 'Search destination'
          }
          accessibilityHint="Type at least three characters to see matching places."
        />

        {query.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search text"
            onPress={() => onQueryChange('')}
            hitSlop={10}
            style={styles.inputAction}
          >
            <Ionicons name="close-circle" size={18} color={colors.textSubtle} />
          </Pressable>
        ) : null}

        {canDismiss ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close search"
            onPress={onDismiss}
            hitSlop={10}
            style={styles.inputAction}
          >
            <Ionicons name="chevron-down" size={20} color={colors.text} />
          </Pressable>
        ) : null}
      </View>

      {mode === 'pickup' ? (
        <View style={styles.currentLocation}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Use current location"
            accessibilityHint="Requests location permission, then uses your position as pickup."
            accessibilityState={{ busy: locating, disabled: locating }}
            disabled={locating}
            onPress={onUseCurrentLocation}
            style={({ pressed }) => [
              styles.currentLocationButton,
              pressed && !locating ? styles.currentLocationPressed : null,
            ]}
          >
            {locating ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Ionicons name="locate" size={16} color={colors.accent} />
            )}
            <AppText variant="caption" style={styles.currentLocationLabel}>
              {locating ? 'Finding your location…' : 'Use current location'}
            </AppText>
          </Pressable>

          {locationError ? (
            <View style={styles.inlineError} accessibilityLiveRegion="polite">
              <Ionicons
                name="alert-circle-outline"
                size={15}
                color={colors.danger}
              />
              <AppText variant="caption" style={styles.errorText}>
                {locationError.message}
              </AppText>

              {locationError.canOpenSettings ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open settings"
                  onPress={onOpenSettings}
                  hitSlop={8}
                >
                  <AppText variant="caption" style={styles.link}>
                    Settings
                  </AppText>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      {status === 'loading' ? (
        <View style={styles.stateRow} accessibilityLiveRegion="polite">
          <ActivityIndicator size="small" color={colors.accent} />
          <AppText variant="caption">Searching places…</AppText>
        </View>
      ) : null}

      {status === 'error' ? (
        <View style={styles.inlineError} accessibilityLiveRegion="polite">
          <Ionicons name="cloud-offline-outline" size={15} color={colors.danger} />
          <AppText variant="caption" style={styles.errorText}>
            {errorMessage ?? 'Place search is unavailable right now.'}
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry place search"
            onPress={onRetry}
            hitSlop={8}
          >
            <AppText variant="caption" style={styles.link}>
              Retry
            </AppText>
          </Pressable>
        </View>
      ) : null}

      {isTooShort ? (
        <View style={styles.stateRow}>
          <AppText variant="caption">
            Type at least {MIN_SEARCH_LENGTH} characters to search.
          </AppText>
        </View>
      ) : null}

      {showEmpty ? (
        <View style={styles.stateRow} accessibilityLiveRegion="polite">
          <Ionicons name="search-outline" size={15} color={colors.textSubtle} />
          <AppText variant="caption" style={styles.stateText}>
            No places match “{query.trim()}”. Try a different spelling, or tap
            the map to drop a pin.
          </AppText>
        </View>
      ) : null}

      {suggestions.length > 0 ? (
        <ScrollView
          style={styles.suggestions}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator
          accessibilityLabel="Place suggestions"
        >
          {suggestions.map((location, index) => (
            <Pressable
              key={location.placeId ?? `${location.latitude},${location.longitude}`}
              accessibilityRole="button"
              accessibilityLabel={`${location.displayName}, ${location.formattedAddress}`}
              onPress={() => onSelectSuggestion(location)}
              style={({ pressed }) => [
                styles.suggestion,
                index > 0 && styles.suggestionDivider,
                pressed && styles.suggestionPressed,
              ]}
            >
              <View style={styles.suggestionIcon}>
                <Ionicons
                  name="location-outline"
                  size={16}
                  color={colors.textMuted}
                />
              </View>

              <View style={styles.suggestionCopy}>
                <AppText variant="body" numberOfLines={1}>
                  {location.displayName}
                </AppText>
                <AppText variant="caption" numberOfLines={2}>
                  {location.formattedAddress}
                </AppText>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {status === 'idle' && trimmedLength === 0 ? (
        <View style={styles.stateRow}>
          <Ionicons name="hand-left-outline" size={15} color={colors.textSubtle} />
          <AppText variant="caption" style={styles.stateText}>
            Search for a place, or tap anywhere on the map to drop a pin.
          </AppText>
        </View>
      ) : null}

      <AppText variant="caption" style={styles.attribution}>
        {attribution}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    gap: spacing.sm,
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
  bar: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  barRowActive: {
    backgroundColor: colors.accentSoft,
  },
  barRowPressed: {
    opacity: 0.7,
  },
  barRail: {
    width: 12,
    alignItems: 'center',
  },
  barCopy: {
    flex: 1,
    gap: 1,
  },
  barLabelActive: {
    color: colors.accent,
  },
  barEmpty: {
    color: colors.textSubtle,
  },
  barDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.lg + spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  inputDot: {
    width: 10,
    height: 10,
  },
  pickupDot: {
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  destinationDot: {
    borderRadius: 3,
    backgroundColor: colors.text,
  },
  input: {
    flex: 1,
    ...textVariants.body,
    padding: 0,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
  },
  inputAction: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocation: {
    gap: spacing.sm,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
  },
  currentLocationPressed: {
    opacity: 0.85,
  },
  currentLocationLabel: {
    color: colors.text,
    fontWeight: '600',
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
  },
  link: {
    color: colors.accent,
    fontWeight: '600',
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  stateText: {
    flex: 1,
  },
  suggestions: {
    maxHeight: 204,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  suggestionDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  suggestionPressed: {
    opacity: 0.6,
  },
  suggestionIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  suggestionCopy: {
    flex: 1,
    gap: 2,
  },
  attribution: {
    marginTop: spacing.xs,
    fontSize: 10,
    color: colors.textSubtle,
  },
});
