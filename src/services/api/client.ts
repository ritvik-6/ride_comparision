import { env, isApiConfigured } from '@/config/env';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  timeoutMs?: number;
}

/**
 * Thin JSON fetch wrapper around the comparison backend.
 * No endpoints are wired up yet — this exists so feature code has one seam.
 */
export async function apiRequest<T>(
  path: string,
  { body, timeoutMs = 10_000, headers, ...init }: RequestOptions = {},
): Promise<T> {
  if (!isApiConfigured) {
    throw new ApiError('EXPO_PUBLIC_API_BASE_URL is not configured.', 0);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${env.apiBaseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      throw new ApiError(
        `Request failed with status ${response.status}.`,
        response.status,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}
