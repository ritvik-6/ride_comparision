import type { Place } from '@/types';

/**
 * Local sample data for the home screen.
 * Nothing here is fetched, and no fares are implied.
 */
export const RECENT_DESTINATIONS: readonly Place[] = [
  {
    id: 'home',
    name: 'Home',
    address: '12th Main, Indiranagar, Bengaluru',
  },
  {
    id: 'work',
    name: 'Work',
    address: 'Manyata Tech Park, Nagawara, Bengaluru',
  },
  {
    id: 'airport',
    name: 'Kempegowda Airport',
    address: 'Devanahalli, Bengaluru Rural',
  },
] as const;
