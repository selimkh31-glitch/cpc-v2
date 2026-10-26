import { observabilityConfig } from "@/lib/observability/config";
import { NO_PII, scrubEvent } from "@/lib/observability/scrub";
import { setReporter } from "@/lib/observability";

/**
 * ADR-0012 : Sentry navigateur, seulement si NEXT_PUBLIC_SENTRY_ENABLED=true ET NEXT_PUBLIC_SENTRY_DSN.
 * Sinon rien n'est chargé (import dynamique, aucun appel réseau). Pas de Session Replay (PII).
 */
const config = observabilityConfig(
  {
    NEXT_PUBLIC_SENTRY_ENABLED: process.env.NEXT_PUBLIC_SENTRY_ENABLED,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_SENTRY_ENVIRONMENT: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
    NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
  },
  "client",
);

if (config.enabled && config.dsn) {
  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn: config.dsn ?? undefined,
      environment: config.environment,
      tracesSampleRate: config.tracesSampleRate,
      // ADR-0012 §2 (SDK v11 : dataCollection remplace sendDefaultPii) : aucune donnée personnelle collectée.
      dataCollection: NO_PII,
      beforeSend: (event) => scrubEvent(event as unknown as Record<string, unknown>) as unknown as typeof event,
    });
    setReporter(Sentry);
  });
}
