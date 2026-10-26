/**
 * ADR-0012 §2 : aucune donnée personnelle ni secret envoyé (emails, jetons, cookies, en-têtes d'autorisation).
 * Fonctions pures, appliquées au journal structuré ET au beforeSend de Sentry.
 */
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const JWT = /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g;
const BEARER = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi;
const SB_KEY = /\bsb_(?:publishable|secret)_[A-Za-z0-9_-]+/g;
const SENSITIVE_KEYS = /^(authorization|cookie|set-cookie|password|token|access_token|refresh_token|apikey|email|ip_address)$/i;

export function scrubString(value: string): string {
  return value.replace(JWT, "[jwt]").replace(BEARER, "Bearer [redacted]").replace(SB_KEY, "[key]").replace(EMAIL, "[email]");
}

export function scrubValue(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[depth]";
  if (typeof value === "string") return scrubString(value);
  if (Array.isArray(value)) return value.map((v) => scrubValue(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = SENSITIVE_KEYS.test(k) ? "[redacted]" : scrubValue(v, depth + 1);
    return out;
  }
  return value;
}

/** beforeSend Sentry : retire cookies, en-têtes, corps de requête et identité ; nettoie les textes. */
export function scrubEvent<T extends Record<string, unknown>>(event: T): T {
  const copy = scrubValue(event) as Record<string, unknown>;
  const request = copy.request as Record<string, unknown> | undefined;
  if (request) {
    delete request.cookies;
    delete request.headers;
    delete request.data;
  }
  const user = copy.user as Record<string, unknown> | undefined;
  if (user) copy.user = typeof user.id === "string" ? { id: user.id } : undefined;
  return copy as T;
}

/** Options Sentry v11 : aucune collecte d'identité, de cookies, d'en-têtes, de corps ni de paramètres d'URL. */
export const NO_PII: {
  userInfo: false;
  cookies: false;
  httpHeaders: false;
  httpBodies: never[];
  urlQueryParams: false;
} = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
};
