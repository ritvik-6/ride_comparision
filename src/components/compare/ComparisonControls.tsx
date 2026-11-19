import { Ionicons, type IoniconsIconName } from '@react-native-vector-icons/ionicons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { FARE_SORT_MODES, RIDE_CATEGORY_FILTERS } from '@/constants';
import { colors, radius, spacing } from '@/theme';
import type { FareSortMode, RideCategoryFilter } from '@/types';

export interface ComparisonControlsProps {
  sort: FareSortMode;
  category: RideCategoryFilter;
  onSortChange: (sort: FareSortMode) => void;
  onCategoryChange: (category: RideCategoryFilter) => void;
}

interface ChipProps {
  label: string;
  icon: IoniconsIconName;
  selected: boolean;
  accessibilityLabel: string;
  onPress: () => void;
}

function Chip({
  label,
  icon,
  selected,
  accessibilityLabel,
  onPress,
}: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.chipPressed,
      ]}
    >
      <Ionicons
        name={icon}
        size={14}
        color={selected ? colors.accent : colors.textMuted}
      />
      <AppText
        variant="caption"
        style={[styles.chipLabel, selected && styles.chipLabelSelected]}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

/**
 * Sort and category controls above the comparison list.
 *
 * Both rows scroll horizontally so longer labels never squeeze or clip on
 * small Android screens.
 */
export function ComparisonControls({
  sort,
  category,
  onSortChange,
  onCategoryChange,
}: ComparisonControlsProps) {
  return (
    <View style={styles.root}>
      <View style={styles.group}>
        <AppText variant="label">Sort by</AppText>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {FARE_SORT_MODES.map((mode) => (
            <Chip
              key={mode.id}
              label={mode.label}
              icon={mode.icon}
              selected={sort === mode.id}
              accessibilityLabel={`Sort by ${mode.label}`}
              onPress={() => onSortChange(mode.id)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.group}>
        <AppText variant="label">Category</AppText>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {RIDE_CATEGORY_FILTERS.map((filter) => (
            <Chip
              key={filter.id}
              label={filter.label}
              icon={filter.icon}
              selected={category === filter.id}
              accessibilityLabel={`Show ${filter.label.toLowerCase()}`}
              onPress={() => onCategoryChange(filter.id)}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.lg,
  },
  group: {
    gap: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentSoft,
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipLabel: {
    color: colors.textMuted,
  },
  chipLabelSelected: {
    color: colors.accent,
  },
});
