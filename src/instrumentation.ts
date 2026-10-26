import type { Instrumentation } from "next";
import { observabilityConfig } from "@/lib/observability/config";
import { NO_PII, scrubEvent } from "@/lib/observability/scrub";
import { setReporter } from "@/lib/observability";

/**
 * ADR-0012 : Sentry serveur chargé dynamiquement, seulement si SENTRY_ENABLED=true ET un DSN est présent.
 * Sans ces variables : aucun import du SDK, aucun appel réseau, aucun avertissement.
 */
const config = observabilityConfig(process.env, "server");

export async function register() {
  if (!config.enabled || !config.dsn) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    tracesSampleRate: config.tracesSampleRate,
    // ADR-0012 §2 (SDK v11 : dataCollection remplace sendDefaultPii) : aucune donnée personnelle collectée.
    dataCollection: NO_PII,
    beforeSend: (event) => scrubEvent(event as unknown as Record<string, unknown>) as unknown as typeof event,
  });
  setReporter(Sentry);
}

export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (!config.enabled) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
};
