import { Ionicons, type IoniconsIconName } from '@react-native-vector-icons/ionicons';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { colors, radius, spacing } from '@/theme';

export interface ComparisonFallbackProps {
  icon: IoniconsIconName;
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
}

/** Recoverable state card used for missing routes and empty comparisons. */
export function ComparisonFallback({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: ComparisonFallbackProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.icon}>
        <Ionicons name={icon} size={22} color={colors.textMuted} />
      </View>

      <View style={styles.copy}>
        <AppText variant="heading">{title}</AppText>
        <AppText variant="bodyMuted">{message}</AppText>
      </View>

      <AppButton label={actionLabel} onPress={onAction} variant="secondary" />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  icon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  copy: {
    gap: spacing.xs,
  },
});
