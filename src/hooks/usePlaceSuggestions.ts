import { useCallback, useEffect, useRef, useState } from 'react';

import {
  GEOCODING_MESSAGES,
  getGeocodingProvider,
  isGeocodingError,
  isRetryableGeocodingErrorKind,
} from '@/services/geocoding';
import type { Coordinates, MapLocation } from '@/types';

/** Quiet period after the last keystroke before a request is sent. */
const SEARCH_DEBOUNCE_MS = 450;

/** Queries shorter than this never hit the network. */
export const MIN_SEARCH_LENGTH = 3;

const NO_SUGGESTIONS: readonly MapLocation[] = [];

export type SuggestionsStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface PlaceSuggestionsState {
  suggestions: readonly MapLocation[];
  status: SuggestionsStatus;
  /** Safe to render message when status is `error`. */
  error: string | null;
  /**
   * Whether repeating the same query could work. A permanent rejection (for
   * example HTTP 403 from the provider) is not retryable, so the UI must not
   * offer a button that is guaranteed to fail again.
   */
  canRetry: boolean;
  /** Re-runs the last query, e.g. from a retry button. */
  retry: () => void;
}

interface UsePlaceSuggestionsOptions {
  query: string;
  /** Preferred centre, normally the map camera. */
  bias?: Coordinates | null;
  /** Disable while the panel is closed so nothing is fetched. */
  enabled?: boolean;
}

/** Result of the request that has already settled, tagged with its query. */
interface SettledOutcome {
  query: string;
  status: 'ready' | 'error';
  suggestions: readonly MapLocation[];
  error: string | null;
  retryable: boolean;
}

/**
 * Debounced autocomplete against the geocoding service.
 *
 * One request per typing pause, cancelled as soon as the query changes, and
 * nothing at all for queries shorter than three characters — that keeps the
 * free public geocoder within its fair-use budget.
 *
 * The pending state is derived by comparing the settled outcome with the
 * current query, so no state is written synchronously from an effect.
 */
export function usePlaceSuggestions({
  query,
  bias,
  enabled = true,
}: UsePlaceSuggestionsOptions): PlaceSuggestionsState {
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [outcome, setOutcome] = useState<SettledOutcome | null>(null);
  const [attempt, setAttempt] = useState(0);

  // The camera moves constantly; keep the latest bias without re-firing effect.
  const biasRef = useRef<Coordinates | null>(bias ?? null);

  useEffect(() => {
    biasRef.current = bias ?? null;
  }, [bias]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const trimmed = debouncedQuery.trim();
  const isActive = enabled && trimmed.length >= MIN_SEARCH_LENGTH;

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const controller = new AbortController();
    let active = true;

    getGeocodingProvider()
      .suggest(trimmed, { bias: biasRef.current, signal: controller.signal })
      .then((results) => {
        if (!active) {
          return;
        }

        setOutcome({
          query: trimmed,
          status: 'ready',
          suggestions: results,
          error: null,
          retryable: false,
        });
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }

        // A cancelled request is the user typing, not a failure.
        if (isGeocodingError(caught) && caught.kind === 'cancelled') {
          return;
        }

        setOutcome({
          query: trimmed,
          status: 'error',
          suggestions: NO_SUGGESTIONS,
          error: isGeocodingError(caught)
            ? caught.message
            : GEOCODING_MESSAGES.network,
          // An unrecognised failure is most likely a transport problem.
          retryable: isGeocodingError(caught)
            ? isRetryableGeocodingErrorKind(caught.kind)
            : true,
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [isActive, trimmed, attempt]);

  const retry = useCallback(() => {
    // Clearing the outcome shows the loading state again immediately.
    setOutcome(null);
    setAttempt((current) => current + 1);
  }, []);

  const settled = outcome !== null && outcome.query === trimmed ? outcome : null;

  const status: SuggestionsStatus = !isActive
    ? 'idle'
    : settled === null
      ? 'loading'
      : settled.status;

  return {
    suggestions: settled !== null && settled.status === 'ready'
      ? settled.suggestions
      : NO_SUGGESTIONS,
    status,
    error: settled !== null && settled.status === 'error' ? settled.error : null,
    canRetry:
      settled !== null && settled.status === 'error' && settled.retryable,
    retry,
  };
}
