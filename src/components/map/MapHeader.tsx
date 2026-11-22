import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, layout, radius, spacing } from '@/theme';

export interface MapHeaderProps {
  onBack: () => void;
  /** Top safe-area inset, so the header clears the status bar and notch. */
  topInset: number;
}

/**
 * Floating header over the map: back affordance and the screen title.
 * Attribution lives in the bottom panel footer, where it can never collide with
 * the native compass, logo or attribution button.
 */
export function MapHeader({ onBack, topInset }: MapHeaderProps) {
  return (
    <View
      style={[styles.root, { paddingTop: topInset + spacing.md }]}
      pointerEvents="box-none"
    >
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          accessibilityHint="Returns to the previous screen."
          onPress={onBack}
          hitSlop={8}
          style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.card}>
          <AppText variant="subtitle" accessibilityRole="header">
            Plan your ride
          </AppText>
          <AppText variant="caption">
            Tap the map or search to set your route
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: layout.screenPadding,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  back: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    // Keeps the button readable over light and dark map tiles alike.
    elevation: 4,
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  backPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  card: {
    flex: 1,
    gap: 2,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    elevation: 4,
    shadowColor: colors.black,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
  },
});
