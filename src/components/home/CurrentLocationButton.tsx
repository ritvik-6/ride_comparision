import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radius, spacing } from '@/theme';

/** GPS pickup detection is not wired up yet, so the control is a placeholder. */
const handlePress = () => {};

/** Secondary action that will fill the pickup field from the device location. */
export function CurrentLocationButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Use current location"
      accessibilityHint="Location detection arrives in a later update."
      onPress={handlePress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Ionicons name="locate" size={18} color={colors.accent} />
      </View>

      <View style={styles.copy}>
        <AppText variant="subtitle">Use current location</AppText>
        <AppText variant="caption">Fill your pickup point in one tap</AppText>
      </View>

      <View style={styles.badge}>
        <AppText variant="caption" style={styles.badgeLabel}>
          Soon
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
  badge: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accent,
  },
});
