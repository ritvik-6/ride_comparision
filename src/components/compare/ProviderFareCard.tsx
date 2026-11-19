import { Ionicons } from '@react-native-vector-icons/ionicons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { getRideCategoryMeta } from '@/constants';
import { colors, radius, spacing } from '@/theme';
import type { FareEstimate, RideProviderMeta } from '@/types';
import { formatFare } from '@/utils/formatFare';

export interface ProviderFareCardProps {
  provider: RideProviderMeta;
  estimates: readonly FareEstimate[];
}

interface EstimateRowProps {
  estimate: FareEstimate;
  providerName: string;
  isFirst: boolean;
}

function EstimateRow({ estimate, providerName, isFirst }: EstimateRowProps) {
  const category = getRideCategoryMeta(estimate.category);
  const categoryLabel = category?.label ?? estimate.tierLabel;

  return (
    <View
      accessible
      accessibilityLabel={
        estimate.available
          ? `${providerName} ${categoryLabel}, ${formatFare(estimate.fare)}, arriving in ${estimate.etaMinutes} minutes`
          : `${providerName} ${categoryLabel}, not available for this route`
      }
      style={[styles.row, !isFirst && styles.rowDivider]}
    >
      <View style={[styles.icon, !estimate.available && styles.iconMuted]}>
        <Ionicons
          name={category?.icon ?? 'car-outline'}
          size={18}
          color={estimate.available ? colors.text : colors.textSubtle}
        />
      </View>

      <View style={styles.rowCopy}>
        <AppText variant="subtitle" style={!estimate.available && styles.muted}>
          {categoryLabel}
        </AppText>
        <AppText variant="caption" numberOfLines={1}>
          {estimate.available
            ? estimate.tierLabel
            : 'Not offered on this route'}
        </AppText>
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
  );
}

/** One provider's tiers and demo fares, with its brand accent. */
export function ProviderFareCard({ provider, estimates }: ProviderFareCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View
          style={[styles.badge, { backgroundColor: `${provider.brandColor}1F` }]}
        >
          <AppText variant="subtitle">{provider.name.charAt(0)}</AppText>
        </View>

        <View style={styles.headerCopy}>
          <AppText variant="subtitle">{provider.name}</AppText>
          <AppText variant="caption" numberOfLines={1}>
            {provider.tagline}
          </AppText>
        </View>
      </View>

      <View style={styles.rows}>
        {estimates.map((estimate, index) => (
          <EstimateRow
            key={estimate.id}
            estimate={estimate}
            providerName={provider.name}
            isFirst={index === 0}
          />
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  badge: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  rows: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    paddingVertical: spacing.md,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
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
    backgroundColor: colors.surfaceMuted,
    opacity: 0.7,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  muted: {
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
});
