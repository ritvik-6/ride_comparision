import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components';
import {
  ComparisonControls,
  ComparisonFallback,
  ComparisonHeader,
  DemoEstimatesNotice,
  FareOptionRow,
  RouteSummary,
} from '@/components/compare';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { getProviderMeta, getRideCategoryMeta } from '@/constants';
import { getDemoFareComparison } from '@/services/fares/demoFares';
import {
  openProviderLink,
  PROVIDER_LINK_DISCLOSURE,
} from '@/services/links';
import { colors, spacing } from '@/theme';
import type {
  FareSortMode,
  RideCategoryFilter,
  RideProvider,
} from '@/types';
import { parseComparisonParams } from '@/utils/comparisonRoute';
import { rankFareEstimates } from '@/utils/fareRanking';

export default function CompareScreen() {
  const params = useLocalSearchParams();
  const route = useMemo(() => parseComparisonParams(params), [params]);
  const comparison = useMemo(
    () =>
      route ? getDemoFareComparison(route.pickup, route.destination) : null,
    [route],
  );

  const [sort, setSort] = useState<FareSortMode>('recommended');
  const [category, setCategory] = useState<RideCategoryFilter>('all');

  // Ranking (filter, order, badges) is pure and lives outside the components.
  const rows = useMemo(
    () =>
      comparison
        ? rankFareEstimates(comparison.estimates, { sort, category }).flatMap(
            (row) => {
              const provider = getProviderMeta(row.estimate.provider);
              return provider ? [{ ...row, provider }] : [];
            },
          )
        : [],
    [comparison, sort, category],
  );

  // URL construction lives in the link service; this only forwards the route.
  const handleContinue = useCallback(
    (provider: RideProvider) => {
      if (!route) {
        return;
      }

      void openProviderLink({
        provider,
        pickup: route.pickup,
        destination: route.destination,
      });
    },
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

  const availableCount = rows.filter((row) => row.estimate.available).length;
  const hasAvailableOption = comparison.estimates.some(
    (estimate) => estimate.available,
  );
  const categoryName =
    category === 'all'
      ? null
      : (getRideCategoryMeta(category)?.label.toLowerCase() ?? null);

  const showAllRides = () => setCategory('all');

  return (
    <View style={styles.root}>
      <Screen contentStyle={styles.content}>
        <ComparisonHeader onBack={goBack} />

        <RouteSummary pickup={route.pickup} destination={route.destination} />

        <DemoEstimatesNotice />

        {hasAvailableOption ? (
          <View style={styles.section}>
            <ComparisonControls
              sort={sort}
              category={category}
              onSortChange={setSort}
              onCategoryChange={setCategory}
            />

            {rows.length === 0 ? (
              <ComparisonFallback
                icon="funnel-outline"
                title={
                  categoryName
                    ? `No ${categoryName} rides in this comparison`
                    : 'No rides in this comparison'
                }
                message="The sample comparison has no options for this category. Show all rides to see every provider."
                actionLabel="Show all rides"
                onAction={showAllRides}
              />
            ) : (
              <>
                {availableCount === 0 ? (
                  <ComparisonFallback
                    icon="alert-circle-outline"
                    title={
                      categoryName
                        ? `No available ${categoryName} rides`
                        : 'No available rides'
                    }
                    message="Every sample option here is unavailable on this route. Try another category or sort order."
                    actionLabel="Show all rides"
                    onAction={showAllRides}
                  />
                ) : null}

                <Card style={styles.listCard}>
                  {rows.map((row, index) => (
                    <FareOptionRow
                      key={row.estimate.id}
                      estimate={row.estimate}
                      provider={row.provider}
                      highlights={row.highlights}
                      isFirst={index === 0}
                      onContinue={() => handleContinue(row.estimate.provider)}
                    />
                  ))}
                </Card>
              </>
            )}

            <AppText variant="caption" style={styles.footnote}>
              Badges mark the lowest sample fare and the shortest sample wait
              among available options. {PROVIDER_LINK_DISCLOSURE}
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
  section: {
    gap: spacing.lg,
  },
  listCard: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  footnote: {
    paddingHorizontal: spacing.xs,
  },
});
