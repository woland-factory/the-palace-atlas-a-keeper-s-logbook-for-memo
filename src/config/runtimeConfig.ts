export interface RuntimeEnv {
  SENTRY_DSN?: string;
  UMAMI_URL?: string;
  UMAMI_WEBSITE_ID?: string;
  SEED_DEMO?: string;
}

export interface RuntimeConfig {
  sentryDsn: string;
  umamiUrl: string;
  umamiWebsiteId: string;
  seedDemo: boolean;
}

declare global {
  interface Window {
    __ENV__?: RuntimeEnv;
  }
}

function clean(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export function getRuntimeConfig(): RuntimeConfig {
  const env: RuntimeEnv =
    (typeof window !== "undefined" && window.__ENV__) || {};
  return {
    sentryDsn: clean(env.SENTRY_DSN),
    umamiUrl: clean(env.UMAMI_URL),
    umamiWebsiteId: clean(env.UMAMI_WEBSITE_ID),
    seedDemo: clean(env.SEED_DEMO) === "1",
  };
}
