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
import { RECENT_DESTINATIONS } from '@/constants';
import { colors, spacing } from '@/theme';
import type { Place } from '@/types';

export default function HomeScreen() {
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const clearFeedback = () => {
    setError(null);
    setNotice(null);
  };

  const handlePickupChange = (value: string) => {
    setPickup(value);
    clearFeedback();
  };

  const handleDestinationChange = (value: string) => {
    setDestination(value);
    clearFeedback();
  };

  const handleSwap = () => {
    setPickup(destination);
    setDestination(pickup);
    clearFeedback();
  };

  const handleSelectRecent = (place: Place) => {
    setDestination(place.name);
    clearFeedback();
  };

  const handleCompare = () => {
    const missingPickup = pickup.trim().length === 0;
    const missingDestination = destination.trim().length === 0;

    if (missingPickup || missingDestination) {
      if (missingPickup && missingDestination) {
        setError('Add a pickup and a destination to compare rides.');
      } else if (missingPickup) {
        setError('Add a pickup location to continue.');
      } else {
        setError('Add a destination to continue.');
      }
      setNotice(null);
      return;
    }

    Keyboard.dismiss();
    setError(null);
    setNotice('Route ready. Fare comparison arrives in the next update.');
  };

  return (
    <View style={styles.root}>
      <Screen contentStyle={styles.content}>
        <HomeHeader />

        <RideSearchCard
          pickup={pickup}
          destination={destination}
          error={error}
          notice={notice}
          onChangePickup={handlePickupChange}
          onChangeDestination={handleDestinationChange}
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
