import type { IoniconsIconName } from '@react-native-vector-icons/ionicons';

import type { FareSortMode, RideCategoryFilter } from '@/types';

import { RIDE_CATEGORIES } from './rideCategories';

export interface FareSortModeMeta {
  id: FareSortMode;
  label: string;
  icon: IoniconsIconName;
}

/** Sort chips, in the order they are shown. Recommended stays first. */
export const FARE_SORT_MODES: readonly FareSortModeMeta[] = [
  { id: 'recommended', label: 'Recommended', icon: 'sparkles-outline' },
  { id: 'lowest-fare', label: 'Lowest fare', icon: 'trending-down-outline' },
  { id: 'fastest', label: 'Fastest', icon: 'flash-outline' },
] as const;

export interface RideCategoryFilterMeta {
  id: RideCategoryFilter;
  label: string;
  icon: IoniconsIconName;
}

/** Category chips: All first, then the three compared tiers. */
export const RIDE_CATEGORY_FILTERS: readonly RideCategoryFilterMeta[] = [
  { id: 'all', label: 'All rides', icon: 'apps-outline' },
  ...RIDE_CATEGORIES.map((category) => ({
    id: category.id,
    label: category.label,
    icon: category.icon,
  })),
];
