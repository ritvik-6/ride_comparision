import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components';
import {
  ComparisonFallback,
  ComparisonHeader,
  DemoEstimatesNotice,
  ProviderFareCard,
  RouteSummary,
} from '@/components/compare';
import { AppText } from '@/components/ui/AppText';
import { RIDE_PROVIDERS } from '@/constants';
import { getDemoFareComparison } from '@/services/fares/demoFares';
import { colors, spacing } from '@/theme';
import { parseComparisonParams } from '@/utils/comparisonRoute';

export default function CompareScreen() {
  const params = useLocalSearchParams();
  const route = useMemo(() => parseComparisonParams(params), [params]);
  const comparison = useMemo(
    () =>
      route ? getDemoFareComparison(route.pickup, route.destination) : null,
    [route],
  );

  const goBack = () => {
    // The home screen stays mounted underneath, so its selected route is intact.
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  };

  if (!route || !comparison) {
    return (
      <View style={styles.root}>
        <Screen contentStyle={styles.content}>
          <ComparisonHeader onBack={goBack} />

          <ComparisonFallback
            icon="navigate-outline"
            title="Route missing"
            message="This comparison needs a pickup and a destination. Choose both places on the home screen and try again."
            actionLabel="Back to search"
            onAction={goBack}
          />
        </Screen>
      </View>
    );
  }

  const groups = RIDE_PROVIDERS.map((provider) => ({
    provider,
    estimates: comparison.estimates.filter(
      (estimate) => estimate.provider === provider.id,
    ),
  })).filter((group) => group.estimates.length > 0);

  const hasAvailableOption = comparison.estimates.some(
    (estimate) => estimate.available,
  );

  return (
    <View style={styles.root}>
      <Screen contentStyle={styles.content}>
        <ComparisonHeader onBack={goBack} />

        <RouteSummary pickup={route.pickup} destination={route.destination} />

        <DemoEstimatesNotice />

        {hasAvailableOption ? (
          <View style={styles.list}>
            {groups.map((group) => (
              <ProviderFareCard
                key={group.provider.id}
                provider={group.provider}
                estimates={group.estimates}
              />
            ))}

            <AppText variant="caption" style={styles.footnote}>
              RideCompare compares estimates only. Booking happens in the
              provider&apos;s own app.
            </AppText>
          </View>
        ) : (
          <ComparisonFallback
            icon="pricetags-outline"
            title="No demo offers for this route"
            message="None of the sample ride options are available for this trip. Try a different pickup or destination."
            actionLabel="Change route"
            onAction={goBack}
          />
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: spacing.lg,
    gap: spacing.xl,
  },
  list: {
    gap: spacing.lg,
  },
  footnote: {
    paddingHorizontal: spacing.xs,
  },
});
