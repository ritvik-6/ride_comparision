import { router } from 'expo-router';
import { useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';

import { BottomNav, Screen } from '@/components';
import {
  CurrentLocationButton,
  HomeBenefits,
  HomeHeader,
  PlanOnMapCard,
  ProviderSection,
  RecentDestinations,
  RideSearchCard,
} from '@/components/home';
import { HYDERABAD_LOCATIONS } from '@/constants';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { useRouteSearch } from '@/hooks/useRouteSearch';
import type { RecentLocation } from '@/services/recentSearches';
import { colors, spacing } from '@/theme';
import type { LocationField, Place } from '@/types';
import { toComparisonParams } from '@/utils/comparisonRoute';
import { fromPlace, toPlace } from '@/utils/mapLocations';
import { validateRoute } from '@/utils/routeValidation';

export default function HomeScreen() {
  const route = useRouteSearch(HYDERABAD_LOCATIONS);
  const recents = useRecentSearches();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const clearFeedback = () => {
    setError(null);
    setNotice(null);
  };

  const handleChangeText = (field: LocationField, value: string) => {
    route.changeText(field, value);
    clearFeedback();
  };

  const handleSelectPlace = (field: LocationField, place: Place) => {
    route.selectPlace(field, place);

    // Only real coordinates are stored: the mock dataset has none, and a recent
    // must never carry an invented position.
    const location = fromPlace(place, 'search');

    if (location) {
      recents.add(location);
    }

    clearFeedback();
  };

  const handleSelectRecent = (location: RecentLocation) => {
    route.selectPlace('destination', toPlace(location));
    // Tapping a recent makes it the most recent again.
    recents.add(location);
    clearFeedback();
  };

  const handleUseCurrentLocation = (place: Place) => {
    route.selectPlace('pickup', place);

    const location = fromPlace(place, 'gps');

    if (location) {
      recents.add(location);
    }

    setError(null);
    setNotice('Pickup set from your current location.');
  };

  const handleSwap = () => {
    route.swap();
    clearFeedback();
  };

  const handleChooseOnMap = () => {
    // Nothing is lost by leaving: selections live in state and this screen stays
    // mounted underneath the map route.
    route.dismissSuggestions();
    Keyboard.dismiss();
    router.push('/map');
  };

  const handleCompare = () => {
    const message = validateRoute(route.pickup, route.destination);
    const pickup = route.pickup.place;
    const destination = route.destination.place;

    if (message || !pickup || !destination) {
      setNotice(null);
      setError(message ?? 'Select a pickup and a destination to compare rides.');
      return;
    }

    route.dismissSuggestions();
    Keyboard.dismiss();
    clearFeedback();

    router.push({
      pathname: '/compare',
      params: toComparisonParams(pickup, destination),
    });
  };

  return (
    <View style={styles.root}>
      <Screen contentStyle={styles.content}>
        <HomeHeader />

        <PlanOnMapCard onPress={handleChooseOnMap} />

        <RideSearchCard
          pickup={route.pickup}
          destination={route.destination}
          error={error}
          notice={notice}
          onChangeText={handleChangeText}
          onSelectPlace={handleSelectPlace}
          onFocusField={route.focusField}
          onBlurField={route.blurField}
          onClearField={route.clearField}
          onSwap={handleSwap}
          onCompare={handleCompare}
        />

        <CurrentLocationButton onPlaceSelected={handleUseCurrentLocation} />

        <HomeBenefits />

        <RecentDestinations
          locations={recents.recents}
          onSelect={handleSelectRecent}
          onClear={recents.clear}
        />

        <ProviderSection />
      </Screen>

      <BottomNav />
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
    gap: spacing['2xl'],
  },
});
