/**
 * Construction de la Content-Security-Policy (ADR-0002 : compensation XSS,
 * les cookies de session @supabase/ssr étant lisibles par le JS du domaine).
 * Fonction pure, testée dans tests/unit/csp.test.ts.
 */
export type CspOptions = {
  nonce: string;
  isDev: boolean;
  /** URL Supabase du projet (NEXT_PUBLIC_SUPABASE_URL), autorisée pour l'API et le Realtime. */
  supabaseUrl?: string;
  /** Origines supplémentaires de connect-src (ex. ingestion Sentry, seulement si activé — ADR-0012). */
  extraConnect?: string[];
  /**
   * Requête servie en HTTPS. `upgrade-insecure-requests` n'est émis qu'en HTTPS : sur http://localhost (CI),
   * WebKit, contrairement à Chromium, réécrit les ressources en https et leur chargement échoue.
   */
  secure?: boolean;
};

export function buildCsp({ nonce, isDev, supabaseUrl, extraConnect = [], secure = true }: CspOptions): string {
  const connect = ["'self'"];
  if (supabaseUrl) {
    const url = new URL(supabaseUrl);
    // supabase-js dérive l'URL Realtime en remplaçant http→ws (https→wss) : même règle ici.
    const wsScheme = url.protocol === "https:" ? "wss" : "ws";
    connect.push(url.origin, `${wsScheme}://${url.host}`);
  }
  for (const origin of extraConnect) {
    const parsed = new URL(origin);
    if (parsed.protocol === "https:") connect.push(parsed.origin);
  }
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", `'nonce-${nonce}'`],
    "img-src": ["'self'", "blob:", "data:", ...(supabaseUrl ? [new URL(supabaseUrl).origin] : [])],
    "font-src": ["'self'"],
    "connect-src": connect,
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const parts = Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`);
  if (!isDev && secure) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}

export function generateNonce(): string {
  return btoa(crypto.randomUUID());
}
