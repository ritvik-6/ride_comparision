import {
  Ionicons,
  type IoniconsIconName,
} from '@react-native-vector-icons/ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from './ui/AppText';
import { colors, fontSize, layout, spacing } from '@/theme';

type TabKey = 'home' | 'activity' | 'profile';

interface TabMeta {
  key: TabKey;
  label: string;
  icon: IoniconsIconName;
}

const TABS: readonly TabMeta[] = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'activity', label: 'Activity', icon: 'receipt-outline' },
  { key: 'profile', label: 'Profile', icon: 'person-outline' },
];

/**
 * App-level tab bar. Home is the only destination in this stage, so the other
 * tabs are presentational and marked disabled for assistive tech.
 */
export function BottomNav() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.bar}>
      <View
        style={[
          styles.column,
          { paddingBottom: Math.max(insets.bottom, spacing.sm) },
        ]}
      >
        {TABS.map((tab) => {
          const isActive = tab.key === 'home';

          return (
            <Pressable
              key={tab.key}
              disabled={!isActive}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isActive, disabled: !isActive }}
              style={styles.item}
            >
              <View style={[styles.iconHolder, isActive && styles.iconActive]}>
                <Ionicons
                  name={tab.icon}
                  size={21}
                  color={isActive ? colors.accent : colors.textSubtle}
                />
              </View>
              <AppText
                style={[styles.label, isActive ? styles.labelActive : null]}
              >
                {tab.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  column: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingHorizontal: layout.screenPadding,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconHolder: {
    height: 30,
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  iconActive: {
    backgroundColor: colors.accentSoft,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    color: colors.textSubtle,
  },
  labelActive: {
    color: colors.text,
    fontWeight: '600',
  },
});
