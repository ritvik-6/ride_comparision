import { isApiConfigured } from '@/config/env';
import { apiRequest } from '@/services/api/client';
import type { FareComparisonResult, Place, RouteMetrics } from '@/types';

import {
  createFareError,
  FARES_COMPARE_PATH,
  parseFareComparisonResponse,
  toFareRequest,
} from './faresContract';

/**
 * Typed client for the fare comparison endpoint.
 *
 * The backend is the source of truth for fares and ETAs. If it cannot be
 * reached this throws; there is deliberately no fallback to locally generated
 * estimates, because a stale or invented number is worse than a retry prompt.
 */
export async function fetchFareComparison(
  pickup: Place,
  destination: Place,
  route: RouteMetrics | null = null,
): Promise<FareComparisonResult> {
  if (!isApiConfigured) {
    throw createFareError('unconfigured');
  }

  const payload = await apiRequest<unknown>(FARES_COMPARE_PATH, {
    method: 'POST',
    body: toFareRequest(pickup, destination, route),
  });

  return parseFareComparisonResponse(payload);
}
