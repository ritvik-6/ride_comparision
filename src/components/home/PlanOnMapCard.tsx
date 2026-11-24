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
      <View style={styles.orbLarge} />
      <View style={styles.orbSmall} />

      <View style={styles.copy}>
        <View style={styles.eyebrow}>
          <View style={styles.eyebrowDot} />
          <AppText variant="label" style={styles.eyebrowText}>
            MAP-FIRST PLANNING
          </AppText>
        </View>

        <AppText variant="heading" style={styles.title}>
          Plan your ride
        </AppText>
        <AppText variant="caption" style={styles.caption}>
          Choose pickup and destination on the map
        </AppText>
      </View>

      <View style={styles.artwork}>
        <Ionicons
          name="map-outline"
          size={34}
          color="rgba(255, 255, 255, 0.88)"
        />
        <View style={styles.mapPin}>
          <Ionicons name="location" size={17} color={colors.accentPressed} />
        </View>
      </View>

      <View style={styles.arrow}>
        <Ionicons name="arrow-forward" size={18} color={colors.accentPressed} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    justifyContent: 'center',
    minHeight: 158,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderRadius: radius['2xl'],
    backgroundColor: '#0A6845',
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#06452D',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  copy: {
    maxWidth: '72%',
    gap: spacing.xs,
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  eyebrowDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: '#8EE5B6',
  },
  eyebrowText: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 10,
    letterSpacing: 1,
  },
  title: {
    color: colors.textInverse,
    fontSize: 21,
    lineHeight: 27,
  },
  orbLarge: {
    position: 'absolute',
    top: -84,
    right: -38,
    width: 194,
    height: 194,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.055)',
  },
  orbSmall: {
    position: 'absolute',
    right: 56,
    bottom: -112,
    width: 176,
    height: 176,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.045)',
  },
  artwork: {
    position: 'absolute',
    top: 24,
    right: 22,
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  mapPin: {
    position: 'absolute',
    right: 3,
    bottom: 1,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: '#B9F0D1',
    borderWidth: 2,
    borderColor: '#0A6845',
  },
  arrow: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: '#D7F5E3',
  },
  caption: {
    maxWidth: 210,
    color: 'rgba(255, 255, 255, 0.78)',
    lineHeight: 19,
  },
});
