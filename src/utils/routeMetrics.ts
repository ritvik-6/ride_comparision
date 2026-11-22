import type { RouteMetrics } from '@/types';

/**
 * Validation and display helpers for route metrics.
 *
 * Kept pure and free of runtime dependencies so the numbers used for pricing can
 * be checked once, in one place, on both the way out of the map screen and the
 * way into the comparison request.
 */

/** Beyond these a "route" is almost certainly a client bug, not a trip. */
export const MAX_ROUTE_DISTANCE_KM = 500;
export const MAX_ROUTE_DURATION_MINUTES = 1_440;

/** True only for a positive, finite, plausible pair of road metrics. */
export function isValidRouteMetrics(
  value: RouteMetrics | null | undefined,
): value is RouteMetrics {
  return (
    value !== null &&
    value !== undefined &&
    Number.isFinite(value.distanceKm) &&
    Number.isFinite(value.durationMinutes) &&
    value.distanceKm > 0 &&
    value.distanceKm <= MAX_ROUTE_DISTANCE_KM &&
    value.durationMinutes > 0 &&
    value.durationMinutes <= MAX_ROUTE_DURATION_MINUTES
  );
}

/** Parses one router/navigation param into a number, or null when unusable. */
export function parseRouteMetricParam(
  value: string | string[] | undefined,
): number | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  // `Number('')` is 0, which would look like a valid metric.
  if (trimmed.length === 0) {
    return null;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? parsed : null;
}

/** Short distance label: "850 m" under a kilometre, otherwise "12.4 km". */
export function formatDistance(distanceKm: number): string {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
    return '—';
  }

  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1_000)} m`;
  }

  return `${distanceKm.toFixed(1)} km`;
}

/** Duration label: "28 min", or "1 h 05 min" past the hour. */
export function formatDuration(durationMinutes: number): string {
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return '—';
  }

  const whole = Math.round(durationMinutes);

  if (whole < 60) {
    return `${whole} min`;
  }

  const hours = Math.floor(whole / 60);
  const minutes = whole % 60;

  return `${hours} h ${String(minutes).padStart(2, '0')} min`;
}

/** One-line summary used in the map panel and the comparison header. */
export function formatRouteSummary(metrics: RouteMetrics): string {
  return `${formatDistance(metrics.distanceKm)} · ${formatDuration(metrics.durationMinutes)} drive`;
}
