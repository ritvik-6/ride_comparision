import { StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { spacing } from '@/theme';

export function ExpoGoMapFallback() {
  return (
    <Screen scroll={false} contentStyle={styles.content}>
      <Card style={styles.card}>
        <AppText variant="subtitle">Map unavailable in Expo Go</AppText>
        <AppText variant="bodyMuted">
          Native map functionality requires the RideCompare development build.
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    gap: spacing.sm,
  },
});
