import { afterEach, describe, expect, it, vi } from "vitest";
import { observabilityConfig, sampleRate, sentryConnectOrigin } from "@/lib/observability/config";
import { scrubEvent, scrubString, scrubValue } from "@/lib/observability/scrub";
import { captureError, isReporterActive, logEvent, setReporter } from "@/lib/observability";

const DSN = "https://abc123@o1.ingest.example.io/42";

describe("ADR-0012 — activation", () => {
  it("désactivé par défaut (aucune variable)", () => {
    expect(observabilityConfig({}, "server").enabled).toBe(false);
    expect(observabilityConfig({}, "client").enabled).toBe(false);
  });
  it("DSN seul ne suffit pas, drapeau seul non plus", () => {
    expect(observabilityConfig({ NEXT_PUBLIC_SENTRY_DSN: DSN }, "server").enabled).toBe(false);
    expect(observabilityConfig({ SENTRY_ENABLED: "true" }, "server").enabled).toBe(false);
  });
  it("actif seulement avec drapeau ET DSN, côté serveur et côté client séparément", () => {
    expect(observabilityConfig({ SENTRY_ENABLED: "true", NEXT_PUBLIC_SENTRY_DSN: DSN }, "server").enabled).toBe(true);
    expect(observabilityConfig({ SENTRY_ENABLED: "true", NEXT_PUBLIC_SENTRY_DSN: DSN }, "client").enabled).toBe(false);
    expect(observabilityConfig({ NEXT_PUBLIC_SENTRY_ENABLED: "true", NEXT_PUBLIC_SENTRY_DSN: DSN }, "client").enabled).toBe(true);
  });
  it("taux d'échantillonnage borné à [0, 1], 0 par défaut", () => {
    expect(sampleRate(undefined)).toBe(0);
    expect(sampleRate("0.2")).toBe(0.2);
    expect(sampleRate("5")).toBe(1);
    expect(sampleRate("-1")).toBe(0);
  });
  it("CSP : origine d'ingestion ajoutée uniquement si Sentry navigateur actif", () => {
    expect(sentryConnectOrigin({ NEXT_PUBLIC_SENTRY_DSN: DSN })).toBeNull();
    expect(sentryConnectOrigin({ NEXT_PUBLIC_SENTRY_ENABLED: "true", NEXT_PUBLIC_SENTRY_DSN: DSN })).toBe("https://o1.ingest.example.io");
  });
});

describe("ADR-0012 — confidentialité", () => {
  it("masque emails, JWT, Bearer et clés Supabase", () => {
    const s = scrubString("qa_x@example.test Bearer abc.def eyJhbGciOiJIUzI1.eyJzdWIiOiIxMjM0.c2lnbmF0dXJlX3Rlc3Q sb_secret_abcdef123");
    expect(s).not.toContain("@example.test");
    expect(s).not.toContain("eyJhbGci");
    expect(s).not.toContain("sb_secret_");
    expect(s).toContain("Bearer [redacted]");
  });
  it("masque les clés sensibles en profondeur", () => {
    expect(scrubValue({ a: { password: "x", Authorization: "y", nested: [{ email: "e" }] } })).toEqual({
      a: { password: "[redacted]", Authorization: "[redacted]", nested: [{ email: "[redacted]" }] },
    });
  });
  it("beforeSend : supprime cookies, en-têtes, corps ; ne garde que l'id utilisateur", () => {
    const ev = scrubEvent({ request: { url: "/x", cookies: "sb=1", headers: { cookie: "sb" }, data: { bio: "b" } }, user: { id: "u1", email: "a@b.io", ip_address: "1.2.3.4" } });
    expect(ev).toEqual({ request: { url: "/x" }, user: { id: "u1" } });
  });
});

describe("ADR-0012 — abstraction", () => {
  afterEach(() => setReporter(null));
  it("sans Sentry : aucun rapporteur, journal structuré nettoyé", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(isReporterActive()).toBe(false);
    captureError(new Error("échec pour qa_x@example.test"), { userEmail: "qa_x@example.test" });
    const line = String(spy.mock.calls[0]?.[0]);
    expect(JSON.parse(line)).toMatchObject({ level: "error", event: "error", message: "échec pour [email]" });
    expect(line).not.toContain("@example.test");
    spy.mockRestore();
  });
  it("avec rapporteur : l'erreur lui est transmise avec un contexte nettoyé", () => {
    const captureException = vi.fn();
    setReporter({ captureException, captureMessage: vi.fn() });
    vi.spyOn(console, "error").mockImplementation(() => {});
    captureError(new Error("x"), { token: "secret" });
    expect(captureException).toHaveBeenCalledWith(expect.any(Error), { extra: { token: "[redacted]" } });
  });
  it("logEvent : JSON d'une ligne", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logEvent("demo", { n: 1 });
    expect(JSON.parse(String(spy.mock.calls[0]?.[0]))).toMatchObject({ level: "info", event: "demo", n: 1 });
    spy.mockRestore();
  });
});
