import { Ionicons } from '@react-native-vector-icons/ionicons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, radius, spacing } from '@/theme';

const benefits = [
  {
    icon: 'pricetag-outline',
    title: 'Compare fares side by side',
    description: 'See your options before you choose a ride.',
  },
  {
    icon: 'options-outline',
    title: 'Find the ride that fits',
    description: 'Pick what works for your budget and plans.',
  },
  {
    icon: 'time-outline',
    title: 'Spend less time switching',
    description: 'Explore multiple providers in one place.',
  },
] as const;

/** Quick benefits that explain why comparing rides is useful. */
export function HomeBenefits() {
  return (
    <View style={styles.root}>
      <SectionHeader
        title="Why compare with RideCompare?"
        caption="A smarter way to choose your next ride."
      />

      <Card style={styles.card}>
        {benefits.map((benefit, index) => (
          <View
            key={benefit.title}
            style={[styles.row, index > 0 && styles.rowDivider]}
          >
            <View style={styles.icon}>
              <Ionicons name={benefit.icon} size={19} color={colors.accent} />
            </View>

            <View style={styles.copy}>
              <AppText variant="subtitle" style={styles.title}>
                {benefit.title}
              </AppText>
              <AppText variant="caption">{benefit.description}</AppText>
            </View>
          </View>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
  },
  card: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: radius['2xl'],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  icon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
  },
});
