import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radius, spacing } from '@/theme';

export interface ComparisonHeaderProps {
  onBack: () => void;
}

/** Back affordance, screen title and the demo-data badge. */
export function ComparisonHeader({ onBack }: ComparisonHeaderProps) {
  return (
    <View style={styles.root}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        accessibilityHint="Returns to the route search."
        onPress={onBack}
        hitSlop={8}
        style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
      >
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>

      <View style={styles.copy}>
        <AppText variant="subtitle">Fare comparison</AppText>
        <AppText variant="caption">Rapido, Uber and Ola side by side</AppText>
      </View>

      <View
        style={styles.badge}
        accessible
        accessibilityLabel="Demo estimates"
      >
        <AppText variant="label" style={styles.badgeLabel}>
          Demo
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  backPressed: {
    backgroundColor: colors.border,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  badge: {
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
  },
  badgeLabel: {
    fontSize: 10,
    color: colors.accent,
  },
});
