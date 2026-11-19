import type { IoniconsIconName } from '@react-native-vector-icons/ionicons';

import type { RideCategory } from '@/types';

export interface RideCategoryMeta {
  id: RideCategory;
  label: string;
  icon: IoniconsIconName;
}

/** The three tiers RideCompare compares, in the order they are shown. */
export const RIDE_CATEGORIES: readonly RideCategoryMeta[] = [
  { id: 'bike', label: 'Bike', icon: 'bicycle' },
  { id: 'auto', label: 'Auto', icon: 'car-outline' },
  { id: 'cab', label: 'Cab', icon: 'car-sport' },
] as const;

export const getRideCategoryMeta = (
  id: RideCategory,
): RideCategoryMeta | undefined =>
  RIDE_CATEGORIES.find((category) => category.id === id);
