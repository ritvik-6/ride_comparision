import { Ionicons } from '@react-native-vector-icons/ionicons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radius, spacing } from '@/theme';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { openAppSettings } from '@/services/location/currentLocation';
import type { Place } from '@/types';

export interface CurrentLocationButtonProps {
  /** Called with the resolved place so it can become the pickup location. */
  onPlaceSelected: (place: Place) => void;
}

/**
 * Secondary action that fills the pickup field from the device location.
 *
 * The hook requests permission only when this is pressed, and the button is
 * disabled while a request is running so it cannot be fired twice.
 */
export function CurrentLocationButton({
  onPlaceSelected,
}: CurrentLocationButtonProps) {
  const { status, error, requestLocation } = useCurrentLocation();
  const isLocating = status === 'locating';

  const handlePress = async () => {
    const place = await requestLocation();

    if (place) {
      onPlaceSelected(place);
    }
  };

  return (
    <View style={styles.root}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Use current location"
        accessibilityHint="Fills your pickup point using your device location."
        accessibilityState={{ busy: isLocating, disabled: isLocating }}
        disabled={isLocating}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.button,
          pressed && !isLocating ? styles.pressed : null,
        ]}
      >
        <View style={styles.icon}>
          {isLocating ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Ionicons name="locate" size={18} color={colors.accent} />
          )}
        </View>

        <View style={styles.copy}>
          <AppText variant="subtitle">
            {isLocating ? 'Finding your location' : 'Use current location'}
          </AppText>
          <AppText variant="caption" numberOfLines={2}>
            {isLocating
              ? 'Getting a GPS fix and reading your address…'
              : 'Fill your pickup point in one tap'}
          </AppText>
        </View>

        {isLocating ? null : (
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.textSubtle}
          />
        )}
      </Pressable>

      {error ? (
        <View style={styles.error} accessibilityLiveRegion="polite">
          <Ionicons
            name="alert-circle-outline"
            size={16}
            color={colors.danger}
          />

          <View style={styles.errorCopy}>
            <AppText variant="caption" style={styles.errorText}>
              {error.message}
            </AppText>

            {error.canOpenSettings ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open settings"
                accessibilityHint="Opens this app's settings so location permission can be enabled."
                onPress={openAppSettings}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.settingsLink,
                  pressed && styles.settingsLinkPressed,
                ]}
              >
                <AppText variant="caption" style={styles.settingsLabel}>
                  Open settings
                </AppText>
                <Ionicons
                  name="open-outline"
                  size={13}
                  color={colors.accent}
                />
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 60,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.accentSoft,
  },
  pressed: {
    opacity: 0.9,
  },
  icon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  errorCopy: {
    flex: 1,
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  errorText: {
    color: colors.danger,
  },
  settingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 32,
    paddingVertical: spacing.xs,
  },
  settingsLinkPressed: {
    opacity: 0.6,
  },
  settingsLabel: {
    color: colors.accent,
    fontWeight: '600',
  },
});
