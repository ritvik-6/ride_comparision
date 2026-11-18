import { useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';

import { BottomNav, Screen } from '@/components';
import {
  CurrentLocationButton,
  HomeHeader,
  ProviderSection,
  RecentDestinations,
  RideSearchCard,
} from '@/components/home';
import { HYDERABAD_LOCATIONS, RECENT_DESTINATIONS } from '@/constants';
import { useRouteSearch } from '@/hooks/useRouteSearch';
import { colors, spacing } from '@/theme';
import type { LocationField, Place } from '@/types';
import { validateRoute } from '@/utils/routeValidation';

export default function HomeScreen() {
  const route = useRouteSearch(HYDERABAD_LOCATIONS);
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
    clearFeedback();
  };

  const handleSelectRecent = (place: Place) => {
    route.selectPlace('destination', place);
    clearFeedback();
  };

  const handleSwap = () => {
    route.swap();
    clearFeedback();
  };

  const handleCompare = () => {
    const message = validateRoute(route.pickup, route.destination);

    if (message) {
      setNotice(null);
      setError(message);
      return;
    }

    const origin = route.pickup.place?.name;
    const target = route.destination.place?.name;

    route.dismissSuggestions();
    Keyboard.dismiss();
    setError(null);
    setNotice(
      `Route ready: ${origin} to ${target}. Fare comparison arrives in the next update.`,
    );
  };

  return (
    <View style={styles.root}>
      <Screen contentStyle={styles.content}>
        <HomeHeader />

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

        <CurrentLocationButton />

        <RecentDestinations
          places={RECENT_DESTINATIONS}
          onSelect={handleSelectRecent}
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
