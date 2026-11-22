import { Ionicons, type IoniconsIconName } from '@react-native-vector-icons/ionicons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { colors, spacing } from '@/theme';

export interface MapStatusOverlayProps {
  /** `loading` while the style downloads, `error` when it could not load. */
  state: 'loading' | 'error';
  onRetry: () => void;
}

const ERROR_ICON: IoniconsIconName = 'cloud-offline-outline';

/**
 * Covers the map while it loads, and replaces the map's affordances with a
 * retry card when the style cannot be fetched (offline, blocked network, or an
 * unavailable tile host).
 */
export function MapStatusOverlay({ state, onRetry }: MapStatusOverlayProps) {
  if (state === 'loading') {
    return (
      <View
        style={styles.scrim}
        pointerEvents="auto"
        accessible
        accessibilityLabel="Loading map"
        accessibilityLiveRegion="polite"
      >
        <View style={styles.loadingCard}>
          <ActivityIndicator color={colors.accent} size="small" />
          <AppText variant="bodyMuted">Loading map…</AppText>
        </View>
      </View>
    );
  }

  return (
    <View
      style={styles.scrim}
      pointerEvents="auto"
      accessibilityLiveRegion="assertive"
    >
      <Card style={styles.errorCard}>
        <View style={styles.errorIcon}>
          <Ionicons name={ERROR_ICON} size={22} color={colors.danger} />
        </View>

        <AppText variant="subtitle">Map couldn&apos;t load</AppText>
        <AppText variant="bodyMuted" style={styles.errorCopy}>
          The map style could not be downloaded. Check your internet connection
          and try again.
        </AppText>

        <AppButton
          label="Try again"
          onPress={onRetry}
          accessibilityHint="Retries loading the map."
          style={styles.retry}
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
    backgroundColor: colors.overlay,
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 999,
    backgroundColor: colors.surface,
    elevation: 3,
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
  },
  errorCard: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
  },
  errorCopy: {
    textAlign: 'center',
  },
  retry: {
    alignSelf: 'stretch',
    marginTop: spacing.md,
  },
});
