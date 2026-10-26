import { scrubValue } from "./scrub";

/**
 * Point d'entrée unique (ADR-0012 §3) : le code métier n'importe JAMAIS Sentry directement.
 * Toujours actif : journal structuré (console → logs de la plateforme). Sentry ne s'ajoute que s'il est activé.
 */
type Reporter = {
  captureException: (error: unknown, context?: { extra?: Record<string, unknown> }) => unknown;
  captureMessage: (message: string, level?: "info" | "warning" | "error") => unknown;
};

let reporter: Reporter | null = null;

/** Appelé uniquement par instrumentation*.ts quand Sentry est activé. */
export function setReporter(r: Reporter | null) {
  reporter = r;
}

export function logEvent(event: string, data: Record<string, unknown> = {}, level: "info" | "warn" | "error" = "info") {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...(scrubValue(data) as Record<string, unknown>) });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export function captureError(error: unknown, context: Record<string, unknown> = {}) {
  const message = error instanceof Error ? error.message : String(error);
  logEvent("error", { message, ...context }, "error");
  reporter?.captureException(error, { extra: scrubValue(context) as Record<string, unknown> });
}

export function captureMessage(message: string, level: "info" | "warning" | "error" = "info") {
  logEvent("message", { message }, level === "warning" ? "warn" : level);
  reporter?.captureMessage(message, level);
}

export function isReporterActive() {
  return reporter !== null;
}
