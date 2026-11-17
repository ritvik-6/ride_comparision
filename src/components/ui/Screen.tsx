import type { ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, layout, spacing } from '@/theme';

export interface ScreenProps {
  children: ReactNode;
  /** Renders children inside a ScrollView. Disable for full-bleed lists. */
  scroll?: boolean;
  /** Safe area edges to respect. */
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

/** White, safe-area aware page container with a centered max-width column. */
export function Screen({
  children,
  scroll = true,
  edges = ['top', 'left', 'right'],
  style,
  contentStyle,
}: ScreenProps) {
  const { width } = useWindowDimensions();
  // Foldables and tablets get a centred column instead of edge-to-edge text.
  const horizontalPadding =
    width >= layout.maxContentWidth
      ? spacing['3xl']
      : layout.screenPadding;

  const content = (
    <View
      style={[
        styles.column,
        {
          paddingHorizontal: horizontalPadding,
          maxWidth: layout.maxContentWidth,
        },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.root, style]} edges={edges}>
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing['4xl'],
  },
  column: {
    width: '100%',
    alignSelf: 'center',
  },
});
