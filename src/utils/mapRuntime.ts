export function shouldUseExpoGoMapFallback(
  appOwnership: string | null,
): boolean {
  return appOwnership === 'expo';
}
