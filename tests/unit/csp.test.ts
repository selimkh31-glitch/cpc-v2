import { describe, expect, it } from "vitest";
import { buildCsp, generateNonce } from "@/lib/security/csp";

const directive = (csp: string, name: string) =>
  csp.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";

describe("buildCsp", () => {
  it("inclut le nonce et strict-dynamic dans script-src", () => {
    const csp = buildCsp({ nonce: "abc123", isDev: false });
    expect(directive(csp, "script-src")).toBe("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
  });

  it("n'autorise jamais unsafe-inline, et unsafe-eval seulement en dev", () => {
    const prod = buildCsp({ nonce: "n", isDev: false });
    const dev = buildCsp({ nonce: "n", isDev: true });
    expect(prod).not.toContain("unsafe-inline");
    expect(prod).not.toContain("unsafe-eval");
    expect(dev).toContain("'unsafe-eval'");
    expect(dev).not.toContain("unsafe-inline");
  });

  it("interdit le framing et les objets", () => {
    const csp = buildCsp({ nonce: "n", isDev: false });
    expect(directive(csp, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive(csp, "object-src")).toBe("object-src 'none'");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("autorise uniquement l'origine Supabase fournie (https + wss)", () => {
    const csp = buildCsp({ nonce: "n", isDev: false, supabaseUrl: "https://example-ref.supabase.co" });
    expect(directive(csp, "connect-src")).toBe(
      "connect-src 'self' https://example-ref.supabase.co wss://example-ref.supabase.co",
    );
  });

  it("en HTTP local, autorise le WebSocket ws:// de la même origine (et pas wss)", () => {
    const csp = buildCsp({ nonce: "n", isDev: true, supabaseUrl: "http://127.0.0.1:54321" });
    expect(directive(csp, "connect-src")).toBe("connect-src 'self' http://127.0.0.1:54321 ws://127.0.0.1:54321");
  });

  it("sans URL Supabase, connect-src reste limité à 'self'", () => {
    expect(directive(buildCsp({ nonce: "n", isDev: false }), "connect-src")).toBe("connect-src 'self'");
  });
});

describe("generateNonce", () => {
  it("produit des valeurs uniques et non vides", () => {
    const values = new Set(Array.from({ length: 50 }, () => generateNonce()));
    expect(values.size).toBe(50);
    for (const v of values) expect(v.length).toBeGreaterThan(20);
  });
});
