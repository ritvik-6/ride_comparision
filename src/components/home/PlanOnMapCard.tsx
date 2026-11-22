import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radius, spacing } from '@/theme';

export interface PlanOnMapCardProps {
  onPress: () => void;
}

/**
 * Primary home action.
 *
 * The map is how rides are planned now: this card is the most prominent control
 * on the screen and the manual pickup/destination search sits below it as a
 * secondary path.
 */
export function PlanOnMapCard({ onPress }: PlanOnMapCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Plan your ride on the map"
      accessibilityHint="Opens a map where you choose your pickup and destination."
      android_ripple={{ color: 'rgba(255, 255, 255, 0.18)' }}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Ionicons name="map" size={20} color={colors.accent} />
      </View>

      <View style={styles.copy}>
        <AppText variant="subtitle" style={styles.title}>
          Plan your ride
        </AppText>
        <AppText variant="caption" style={styles.caption}>
          Choose pickup and destination on the map
        </AppText>
      </View>

      <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 68,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.accent,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: colors.accentPressed,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  pressed: {
    backgroundColor: colors.accentPressed,
  },
  icon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.textInverse,
  },
  caption: {
    color: 'rgba(255, 255, 255, 0.86)',
  },
});
