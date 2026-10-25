/**
 * Redirection post-authentification : chemins internes relatifs uniquement (ADR-0002, anti open redirect).
 */
export function safeNextPath(next: unknown, fallback = "/home"): string {
  if (typeof next !== "string" || next.length === 0 || next.length > 512) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\\]/.test(next)) return fallback;
  try {
    const parsed = new URL(next, "http://internal.invalid");
    if (parsed.origin !== "http://internal.invalid") return fallback;
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return fallback;
  }
}
