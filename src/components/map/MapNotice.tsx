import { Ionicons } from '@react-native-vector-icons/ionicons';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radius, spacing } from '@/theme';

export interface MapNoticeProps {
  /** `resolving` while a tapped point is being looked up. */
  state: 'resolving' | 'error';
  message: string;
  /** Offer a retry when the lookup failed for a reason worth repeating. */
  onRetry?: () => void;
  /** Distance from the bottom edge, so the notice clears the panel. */
  bottomOffset: number;
}

/**
 * Small floating status card for map-tap reverse geocoding. Sits directly above
 * the bottom panel so it never covers the rider's route summary.
 */
export function MapNotice({
  state,
  message,
  onRetry,
  bottomOffset,
}: MapNoticeProps) {
  const isResolving = state === 'resolving';

  return (
    <View
      style={[styles.root, { bottom: bottomOffset + spacing.sm }]}
      pointerEvents="box-none"
    >
      <View
        style={styles.card}
        accessibilityLiveRegion="polite"
        accessibilityLabel={message}
      >
        {isResolving ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <Ionicons
            name="alert-circle-outline"
            size={16}
            color={colors.danger}
          />
        )}

        <AppText variant="caption" style={styles.message}>
          {message}
        </AppText>

        {onRetry && !isResolving ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try that point again"
            onPress={onRetry}
            hitSlop={8}
          >
            <AppText variant="caption" style={styles.retry}>
              Retry
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    alignItems: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: 480,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    elevation: 6,
    shadowColor: colors.black,
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
  },
  message: {
    flexShrink: 1,
    color: colors.text,
  },
  retry: {
    color: colors.accent,
    fontWeight: '600',
  },
});
