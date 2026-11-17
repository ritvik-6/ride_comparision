import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputInstance,
} from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import {
  colors,
  fontSize,
  lineHeight,
  radius,
  spacing,
  textVariants,
} from '@/theme';

export interface RideSearchCardProps {
  pickup: string;
  destination: string;
  /** Validation message shown when a field is missing. */
  error?: string | null;
  /** Confirmation shown once the route passes validation. */
  notice?: string | null;
  onChangePickup: (value: string) => void;
  onChangeDestination: (value: string) => void;
  onSwap: () => void;
  onCompare: () => void;
}

/** Pickup and destination entry with swap and the primary compare action. */
export function RideSearchCard({
  pickup,
  destination,
  error,
  notice,
  onChangePickup,
  onChangeDestination,
  onSwap,
  onCompare,
}: RideSearchCardProps) {
  const destinationRef = useRef<TextInputInstance>(null);

  return (
    <Card style={styles.card}>
      <AppText variant="label">Plan your ride</AppText>

      <View style={styles.routeRow}>
        <View style={styles.routeBox}>
          <View style={styles.rail}>
            <View style={styles.pickupDot} />
            <View style={styles.railLine} />
            <View style={styles.destinationDot} />
          </View>

          <View style={styles.fields}>
            <View style={styles.field}>
              <TextInput
                value={pickup}
                onChangeText={onChangePickup}
                placeholder="Pickup location"
                placeholderTextColor={colors.textSubtle}
                style={styles.input}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => destinationRef.current?.focus()}
                selectionColor={colors.accent}
                accessibilityLabel="Pickup location"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.field}>
              <TextInput
                ref={destinationRef}
                value={destination}
                onChangeText={onChangeDestination}
                placeholder="Where are you going?"
                placeholderTextColor={colors.textSubtle}
                style={styles.input}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={onCompare}
                selectionColor={colors.accent}
                accessibilityLabel="Destination"
              />
            </View>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Swap pickup and destination"
          onPress={onSwap}
          style={({ pressed }) => [styles.swap, pressed && styles.swapPressed]}
        >
          <Ionicons name="swap-vertical" size={20} color={colors.text} />
        </Pressable>
      </View>

      {error ? (
        <View style={styles.message} accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
          <AppText variant="caption" style={styles.errorText}>
            {error}
          </AppText>
        </View>
      ) : null}

      {notice ? (
        <View
          style={[styles.message, styles.notice]}
          accessibilityLiveRegion="polite"
        >
          <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
          <AppText variant="caption" style={styles.noticeText}>
            {notice}
          </AppText>
        </View>
      ) : null}

      <AppButton
        label="Compare rides"
        onPress={onCompare}
        trailing={
          <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
        }
        accessibilityHint="Checks the route fields before comparing fares."
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  routeBox: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  rail: {
    width: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  railLine: {
    flex: 1,
    minHeight: 14,
    width: 1.5,
    backgroundColor: colors.borderStrong,
    borderRadius: radius.pill,
  },
  destinationDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: colors.text,
  },
  fields: {
    flex: 1,
    marginLeft: spacing.md,
  },
  field: {
    justifyContent: 'center',
    minHeight: 52,
  },
  input: {
    ...textVariants.body,
    padding: 0,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  swap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  swapPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  message: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: -spacing.xs,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
  },
  notice: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  noticeText: {
    flex: 1,
    color: colors.textMuted,
  },
});
