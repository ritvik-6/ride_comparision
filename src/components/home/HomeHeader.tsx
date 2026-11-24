import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

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
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(10));

  useEffect(() => {
    const entrance = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    entrance.start();
    return () => entrance.stop();
  }, [opacity, translateY]);

  return (
    <Animated.View style={[styles.root, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.topRow}>
        <View style={styles.brand}>
          <View style={styles.brandMark}>
            <Ionicons name="swap-horizontal" size={18} color={colors.textInverse} />
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

      <View style={styles.hero}>
        <View style={styles.heroOrbLarge} />
        <View style={styles.heroOrbSmall} />
        <View style={styles.heroContent}>
          <View style={styles.eyebrow}>
            <Ionicons name="sparkles" size={14} color={colors.accent} />
            <AppText variant="label" style={styles.eyebrowText}>
              {greeting}, ride smarter
            </AppText>
          </View>

          <AppText variant="display" style={styles.headline}>
            Compare fares.{'\n'}Ride smarter.
          </AppText>

          <AppText variant="bodyMuted" style={styles.tagline}>
            {APP_TAGLINE}
          </AppText>

          <View style={styles.valuePill}>
            <Ionicons name="git-compare-outline" size={15} color={colors.accent} />
            <AppText variant="caption" style={styles.valueText}>
              One search. More ways to save.
            </AppText>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.xl,
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
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    elevation: 3,
    shadowColor: colors.accentPressed,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  brandName: {
    letterSpacing: -0.4,
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
  hero: {
    overflow: 'hidden',
    borderRadius: radius['2xl'],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#DDEEE4',
    backgroundColor: '#F0F8F3',
    padding: spacing.xl,
  },
  heroOrbLarge: {
    position: 'absolute',
    top: -92,
    right: -72,
    width: 220,
    height: 220,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(15, 169, 104, 0.07)',
  },
  heroOrbSmall: {
    position: 'absolute',
    right: 38,
    bottom: -96,
    width: 172,
    height: 172,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(15, 169, 104, 0.05)',
  },
  heroContent: {
    gap: spacing.md,
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
  },
  eyebrowText: {
    color: colors.accentPressed,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  headline: {
    fontSize: 31,
    lineHeight: 36,
    letterSpacing: -0.9,
  },
  tagline: {
    maxWidth: 300,
  },
  valuePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  valueText: {
    color: colors.textMuted,
    fontWeight: '600',
  },
});
