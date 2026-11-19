import { Ionicons } from '@react-native-vector-icons/ionicons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { colors, spacing } from '@/theme';
import { DEMO_ESTIMATES_NOTICE } from '@/services/fares/demoFares';

/**
 * Standing disclosure that every figure on the screen is sample data.
 * It sits above the estimates so it cannot be missed.
 */
export function DemoEstimatesNotice() {
  return (
    <Card accent style={styles.card}>
      <View
        accessible
        accessibilityLabel={`Demo estimates. ${DEMO_ESTIMATES_NOTICE}`}
        style={styles.inner}
      >
        <View style={styles.header}>
          <Ionicons name="flask-outline" size={16} color={colors.accent} />
          <AppText variant="label" style={styles.title}>
            Demo estimates
          </AppText>
        </View>

        <AppText variant="caption" style={styles.body}>
          {DEMO_ESTIMATES_NOTICE}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
  },
  inner: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: colors.accent,
  },
  body: {
    color: colors.textMuted,
  },
});
