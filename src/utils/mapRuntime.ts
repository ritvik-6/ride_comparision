type MapRuntime = {
  isRunningInExpoGo: boolean;
  executionEnvironment: string;
  appOwnership: string | null;
};

export function shouldUseExpoGoMapFallback({
  isRunningInExpoGo,
  executionEnvironment,
  appOwnership,
}: MapRuntime): boolean {
  return (
    isRunningInExpoGo ||
    (executionEnvironment === 'storeClient' && appOwnership === 'expo')
  );
}
