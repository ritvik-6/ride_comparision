import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { getRideCategoryMeta } from '@/constants';
import { colors, fontWeight, radius, spacing } from '@/theme';
import type { FareEstimate, FareHighlight, RideProviderMeta } from '@/types';
import { formatFare } from '@/utils/formatFare';

export interface FareOptionRowProps {
  estimate: FareEstimate;
  provider: RideProviderMeta;
  highlights: readonly FareHighlight[];
  isFirst: boolean;
  /**
   * Hand-off to the provider's own platform. Only rendered for available
   * options; unavailable rides have nothing to continue to.
   */
  onContinue?: () => void;
}

const BADGE_LABELS: Record<FareHighlight, string> = {
  cheapest: 'Cheapest',
  fastest: 'Fastest',
};

/** One ride option: provider, tier, demo fare, ETA and any earned badges. */
export function FareOptionRow({
  estimate,
  provider,
  highlights,
  isFirst,
  onContinue,
}: FareOptionRowProps) {
  const category = getRideCategoryMeta(estimate.category);
  const categoryLabel = category?.label ?? estimate.tierLabel;
  const badgeLabels = highlights.map((highlight) => BADGE_LABELS[highlight]);
  const canContinue = estimate.available && onContinue !== undefined;

  const spokenDetails = estimate.available
    ? [
        formatFare(estimate.fare),
        `arriving in ${estimate.etaMinutes} minutes`,
        ...badgeLabels,
      ].join(', ')
    : 'not available for this route';

  return (
    <View style={[styles.row, !isFirst && styles.rowDivider]}>
      {/* The summary is one accessibility element; the action below stays a
          separate, reachable button. */}
      <View
        accessible
        accessibilityLabel={`${provider.name} ${categoryLabel}, ${spokenDetails}`}
        style={styles.summary}
      >
        <View style={[styles.icon, !estimate.available && styles.iconMuted]}>
          <Ionicons
            name={category?.icon ?? 'car-outline'}
            size={18}
            color={estimate.available ? colors.text : colors.textSubtle}
          />
        </View>

        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <AppText
              variant="subtitle"
              style={!estimate.available ? styles.muted : null}
            >
              {categoryLabel}
            </AppText>
            <View
              style={[styles.brandDot, { backgroundColor: provider.brandColor }]}
            />
            <AppText variant="caption" numberOfLines={1}>
              {provider.shortName}
            </AppText>
          </View>

          <AppText variant="caption" numberOfLines={1}>
            {estimate.available
              ? estimate.tierLabel
              : 'Not offered on this route'}
          </AppText>

          {badgeLabels.length > 0 ? (
            <View style={styles.badges}>
              {highlights.map((highlight) => (
                <View
                  key={highlight}
                  style={[
                    styles.badge,
                    highlight === 'cheapest'
                      ? styles.badgeCheapest
                      : styles.badgeFastest,
                  ]}
                >
                  <Ionicons
                    name={
                      highlight === 'cheapest'
                        ? 'pricetag-outline'
                        : 'flash-outline'
                    }
                    size={10}
                    color={
                      highlight === 'cheapest'
                        ? colors.accent
                        : colors.textMuted
                    }
                  />
                  <AppText
                    variant="label"
                    style={[
                      styles.badgeLabel,
                      highlight === 'cheapest'
                        ? styles.badgeLabelCheapest
                        : styles.badgeLabelFastest,
                    ]}
                  >
                    {BADGE_LABELS[highlight]}
                  </AppText>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {estimate.available ? (
          <View style={styles.price}>
            <AppText variant="heading" style={styles.fare}>
              {formatFare(estimate.fare)}
            </AppText>
            <AppText variant="caption">{estimate.etaMinutes} min away</AppText>
          </View>
        ) : (
          <AppText variant="caption" style={styles.unavailable}>
            Unavailable
          </AppText>
        )}
      </View>

      {canContinue ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Continue to ${provider.shortName}`}
          accessibilityHint={`Opens ${provider.shortName} to confirm the fare and book`}
          android_ripple={{ color: 'rgba(15, 169, 104, 0.12)' }}
          hitSlop={8}
          onPress={onContinue}
          style={({ pressed }) => [
            styles.continueButton,
            pressed ? styles.continuePressed : null,
          ]}
        >
          <AppText variant="caption" style={styles.continueLabel}>
            Continue to {provider.shortName}
          </AppText>
          <Ionicons name="open-outline" size={13} color={colors.accent} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
  },
  icon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  iconMuted: {
    opacity: 0.7,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  brandDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    marginLeft: spacing.xs,
  },
  muted: {
    color: colors.textMuted,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  badgeCheapest: {
    backgroundColor: colors.accentSoft,
  },
  badgeFastest: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  badgeLabel: {
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.6,
  },
  badgeLabelCheapest: {
    color: colors.accent,
  },
  badgeLabelFastest: {
    color: colors.textMuted,
  },
  price: {
    alignItems: 'flex-end',
    gap: 2,
  },
  fare: {
    fontSize: 17,
    lineHeight: 22,
  },
  unavailable: {
    color: colors.textSubtle,
  },
  continueButton: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    overflow: 'hidden',
  },
  continuePressed: {
    opacity: 0.78,
  },
  continueLabel: {
    color: colors.accent,
    fontWeight: fontWeight.semibold,
  },
});
