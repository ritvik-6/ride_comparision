import type { RideProvider, RideProviderMeta } from '@/types';

/** Static presentation metadata. Fares are fetched elsewhere, never from here. */
export const RIDE_PROVIDERS: readonly RideProviderMeta[] = [
  {
    id: 'rapido',
    name: 'Rapido',
    shortName: 'Rapido',
    tagline: 'Bike taxis & autos',
    categories: ['Bike', 'Auto', 'Cab'],
    brandColor: '#F5C518',
  },
  {
    id: 'uber',
    name: 'Uber',
    shortName: 'Uber',
    tagline: 'Cabs, moto & auto',
    categories: ['Moto', 'Auto', 'Go', 'Premier'],
    brandColor: '#111111',
  },
  {
    id: 'ola',
    name: 'Ola',
    shortName: 'Ola',
    tagline: 'Cabs & autos',
    categories: ['Bike', 'Auto', 'Mini', 'Prime'],
    brandColor: '#1E9E4A',
  },
] as const;

export const PROVIDER_IDS: readonly RideProvider[] = RIDE_PROVIDERS.map(
  (provider) => provider.id,
);

export const getProviderMeta = (id: RideProvider): RideProviderMeta | undefined =>
  RIDE_PROVIDERS.find((provider) => provider.id === id);
