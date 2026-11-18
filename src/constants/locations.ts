import type { Place } from '@/types';

/**
 * Local Hyderabad location dataset used by the pickup and destination search.
 * Search runs entirely on-device: nothing here is fetched or geocoded, and no
 * coordinates are implied.
 */
export const HYDERABAD_LOCATIONS: readonly Place[] = [
  {
    id: 'hitech-city',
    name: 'Hitech City',
    address: 'HITEC City, Madhapur, Hyderabad',
  },
  {
    id: 'gachibowli',
    name: 'Gachibowli',
    address: 'Gachibowli, Hyderabad',
  },
  {
    id: 'madhapur',
    name: 'Madhapur',
    address: 'Madhapur, Hyderabad',
  },
  {
    id: 'jubilee-hills',
    name: 'Jubilee Hills',
    address: 'Jubilee Hills, Hyderabad',
  },
  {
    id: 'banjara-hills',
    name: 'Banjara Hills',
    address: 'Banjara Hills, Hyderabad',
  },
  {
    id: 'begumpet',
    name: 'Begumpet',
    address: 'Begumpet, Hyderabad',
  },
  {
    id: 'secunderabad',
    name: 'Secunderabad',
    address: 'Secunderabad Railway Station area, Hyderabad',
  },
  {
    id: 'kukatpally',
    name: 'Kukatpally',
    address: 'Kukatpally, Hyderabad',
  },
  {
    id: 'kondapur',
    name: 'Kondapur',
    address: 'Kondapur, Hyderabad',
  },
  {
    id: 'ameerpet',
    name: 'Ameerpet',
    address: 'Ameerpet, Hyderabad',
  },
  {
    id: 'financial-district',
    name: 'Financial District',
    address: 'Nanakramguda, Hyderabad',
  },
  {
    id: 'charminar',
    name: 'Charminar',
    address: 'Charminar, Old City, Hyderabad',
  },
  {
    id: 'hussain-sagar',
    name: 'Hussain Sagar',
    address: 'Tank Bund Road, Hyderabad',
  },
  {
    id: 'lb-nagar',
    name: 'LB Nagar',
    address: 'LB Nagar, Hyderabad',
  },
  {
    id: 'airport',
    name: 'Rajiv Gandhi International Airport',
    address: 'Shamshabad, Hyderabad',
  },
] as const;
