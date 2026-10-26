/**
 * ADR-0012 : Sentry actif UNIQUEMENT si explicitement activé ET doté d'un DSN. Sinon no-op total.
 * Serveur : SENTRY_ENABLED=true + NEXT_PUBLIC_SENTRY_DSN. Navigateur : NEXT_PUBLIC_SENTRY_ENABLED=true + NEXT_PUBLIC_SENTRY_DSN
 * (seules les variables NEXT_PUBLIC_* sont lisibles côté client).
 */
export type ObservabilityConfig = {
  enabled: boolean;
  dsn: string | null;
  environment: string;
  tracesSampleRate: number;
};

type Env = Record<string, string | undefined>;

export function sampleRate(raw: string | undefined): number {
  const n = Number.parseFloat(raw ?? "");
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), 1) : 0;
}

export function observabilityConfig(env: Env, side: "server" | "client"): ObservabilityConfig {
  const flag = side === "server" ? env.SENTRY_ENABLED : env.NEXT_PUBLIC_SENTRY_ENABLED;
  const dsn = env.NEXT_PUBLIC_SENTRY_DSN?.trim() || null;
  return {
    enabled: flag === "true" && dsn !== null,
    dsn,
    environment: env.SENTRY_ENVIRONMENT ?? env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? "development",
    tracesSampleRate: sampleRate(env.SENTRY_TRACES_SAMPLE_RATE ?? env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE),
  };
}

/** Origine d'ingestion à autoriser dans connect-src, seulement si Sentry navigateur est actif. */
export function sentryConnectOrigin(env: Env): string | null {
  const cfg = observabilityConfig(env, "client");
  if (!cfg.enabled || !cfg.dsn) return null;
  try {
    return new URL(cfg.dsn).origin;
  } catch {
    return null;
  }
}
