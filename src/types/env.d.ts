declare namespace NodeJS {
  interface ProcessEnv {
    /** Base URL of the fare comparison backend. Public: never put secrets here. */
    readonly EXPO_PUBLIC_API_BASE_URL?: string;
    /** 'development' | 'production' — used for diagnostics only. */
    readonly EXPO_PUBLIC_APP_ENV?: string;
    /** Origin of the geocoding service; defaults to the public Photon instance. */
    readonly EXPO_PUBLIC_GEOCODING_BASE_URL?: string;
    /** Origin of the routing service; defaults to the public OSRM demo server. */
    readonly EXPO_PUBLIC_ROUTING_BASE_URL?: string;
  }
}
