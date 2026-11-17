declare namespace NodeJS {
  interface ProcessEnv {
    /** Base URL of the fare comparison backend. Public: never put secrets here. */
    readonly EXPO_PUBLIC_API_BASE_URL?: string;
    /** 'development' | 'production' — used for diagnostics only. */
    readonly EXPO_PUBLIC_APP_ENV?: string;
  }
}
