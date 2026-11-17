import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { APP_NAME, APP_TAGLINE } from '@/constants';
import { colors, radius, spacing } from '@/theme';

/** Placeholder until the profile screen exists. */
const handleAvatarPress = () => {};

function getGreeting(hour: number): string {
  if (hour < 12) {
    return 'Good morning';
  }
  if (hour < 17) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

/** Branding, profile entry point and a friendly, time-aware greeting. */
export function HomeHeader() {
  const greeting = getGreeting(new Date().getHours());

  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        <View style={styles.brand}>
          <View style={styles.brandMark}>
            <Ionicons name="swap-vertical" size={16} color={colors.textInverse} />
          </View>
          <AppText variant="subtitle" style={styles.brandName}>
            {APP_NAME}
          </AppText>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profile"
          accessibilityHint="Profile settings arrive in a later update."
          onPress={handleAvatarPress}
          style={({ pressed }) => [styles.avatar, pressed && styles.avatarPressed]}
        >
          <Ionicons name="person-outline" size={20} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.greeting}>
        <AppText variant="label">{greeting}</AppText>
        <AppText variant="title">Where to next?</AppText>
        <AppText variant="bodyMuted" style={styles.tagline}>
          {APP_TAGLINE}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing['2xl'],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  brandMark: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.accent,
  },
  brandName: {
    letterSpacing: -0.2,
  },
  avatar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  avatarPressed: {
    backgroundColor: colors.border,
  },
  greeting: {
    gap: spacing.xs,
  },
  tagline: {
    maxWidth: 320,
    marginTop: spacing.xs,
  },
});
