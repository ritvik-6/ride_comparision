import { StyleSheet, View } from 'react-native';

import { AppText, Card, ProviderChip, Screen } from '@/components';
import { APP_NAME, APP_TAGLINE, RIDE_PROVIDERS } from '@/constants';
import { isApiConfigured } from '@/config/env';
import { colors, radius, spacing } from '@/theme';

export default function HomeScreen() {
  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.hero}>
        <AppText variant="label">Fair fares, every ride</AppText>
        <AppText variant="display" style={styles.title}>
          {APP_NAME}
        </AppText>
        <AppText variant="bodyMuted" style={styles.tagline}>
          {APP_TAGLINE}
        </AppText>
      </View>

      <View style={styles.providers}>
        {RIDE_PROVIDERS.map((provider) => (
          <ProviderChip key={provider.id} provider={provider} />
        ))}
      </View>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.accentBar} />
          <AppText variant="heading">Ready to compare</AppText>
        </View>
        <AppText variant="bodyMuted" style={styles.cardBody}>
          The project shell is set up: routing, theme tokens and typed provider
          data. Fare search and trip comparison arrive in the next stage.
        </AppText>

        <View style={styles.metaRow}>
          <AppText variant="caption">Backend</AppText>
          <AppText variant="caption" style={styles.metaValue}>
            {isApiConfigured ? 'Connected' : 'Not configured'}
          </AppText>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing['2xl'],
    gap: spacing['2xl'],
  },
  hero: {
    gap: spacing.sm,
  },
  title: {
    marginTop: spacing.xs,
  },
  tagline: {
    maxWidth: 320,
  },
  providers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  accentBar: {
    width: 4,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  cardBody: {
    maxWidth: 420,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  metaValue: {
    color: colors.text,
  },
});
