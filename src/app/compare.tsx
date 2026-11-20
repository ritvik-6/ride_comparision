import type { IoniconsIconName } from '@react-native-vector-icons/ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components';
import {
  ComparisonControls,
  ComparisonFallback,
  ComparisonHeader,
  ComparisonLoading,
  DemoEstimatesNotice,
  FareOptionRow,
  RouteSummary,
} from '@/components/compare';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { getProviderMeta, getRideCategoryMeta } from '@/constants';
import { useFareComparison } from '@/hooks/useFareComparison';
import {
  type FareApiErrorKind,
  toFareApiFailure,
} from '@/services/fares/faresContract';
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

const ERROR_ICONS: Record<FareApiErrorKind, IoniconsIconName> = {
  unconfigured: 'link-outline',
  unreachable: 'cloud-offline-outline',
  timeout: 'time-outline',
  rejected: 'alert-circle-outline',
  server: 'server-outline',
  malformed: 'help-circle-outline',
};

export default function CompareScreen() {
  const params = useLocalSearchParams();

  // `useLocalSearchParams` builds a new object on every render, so the route is
  // memoised on the individual values rather than on the params object: the
  // fare request is keyed off this and must not restart on unrelated renders.
  const pickupId = params.pickupId;
  const pickupName = params.pickupName;
  const pickupAddress = params.pickupAddress;
  const pickupLatitude = params.pickupLatitude;
  const pickupLongitude = params.pickupLongitude;
  const destinationId = params.destinationId;
  const destinationName = params.destinationName;
  const destinationAddress = params.destinationAddress;
  const destinationLatitude = params.destinationLatitude;
  const destinationLongitude = params.destinationLongitude;

  const route = useMemo(
    () =>
      parseComparisonParams({
        pickupId,
        pickupName,
        pickupAddress,
        pickupLatitude,
        pickupLongitude,
        destinationId,
        destinationName,
        destinationAddress,
        destinationLatitude,
        destinationLongitude,
      }),
    [
      pickupId,
      pickupName,
      pickupAddress,
      pickupLatitude,
      pickupLongitude,
      destinationId,
      destinationName,
      destinationAddress,
      destinationLatitude,
      destinationLongitude,
    ],
  );

  // Fares come from the backend; nothing is generated on the device.
  const { status, comparison, error, retry } = useFareComparison(route);

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

  const goBack = useCallback(() => {
    // The home screen stays mounted underneath, so its selected route is intact.
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  }, []);

  const renderScreen = (children: ReactNode) => (
    <View style={styles.root}>
      <Screen contentStyle={styles.content}>
        <ComparisonHeader onBack={goBack} />

        {route ? (
          <RouteSummary pickup={route.pickup} destination={route.destination} />
        ) : null}

        {children}
      </Screen>
    </View>
  );

  if (!route) {
    return renderScreen(
      <ComparisonFallback
        icon="navigate-outline"
        title="Route missing"
        message="This comparison needs a pickup and a destination. Choose both places on the home screen and try again."
        actionLabel="Back to search"
        onAction={goBack}
      />,
    );
  }

  if (status === 'error') {
    const failure = error ?? toFareApiFailure(null);

    return renderScreen(
      <>
        <ComparisonFallback
          icon={ERROR_ICONS[failure.kind]}
          title={failure.title}
          message={failure.message}
          actionLabel={failure.canRetry ? 'Try again' : 'Back to search'}
          actionVariant={failure.canRetry ? 'primary' : 'secondary'}
          onAction={failure.canRetry ? retry : goBack}
        />

        <AppText variant="caption" style={styles.footnote}>
          Fares are fetched from the RideCompare server. When it can&apos;t be
          reached, this screen says so instead of showing made-up numbers.
        </AppText>
      </>
    );
  }

  if (!comparison) {
    return renderScreen(
      <>
        <DemoEstimatesNotice />
        <ComparisonLoading />
      </>,
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

  return renderScreen(
    <>
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
            Badges mark the lowest sample fare and the shortest sample wait among
            available options. {PROVIDER_LINK_DISCLOSURE}
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
    </>
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
