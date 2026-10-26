import { describe, expect, it } from "vitest";
import { avatarExtension, signedUrlTtl, sniffImageMime } from "@/lib/media/ttl";

describe("signedUrlTtl (ADR-0015)", () => {
  it("10 min par défaut", () => {
    expect(signedUrlTtl(undefined)).toBe(600);
    expect(signedUrlTtl("abc")).toBe(600);
  });
  it("S9 — plafonné à 900 s", () => {
    expect(signedUrlTtl("3600")).toBe(900);
    expect(signedUrlTtl("901")).toBe(900);
  });
  it("plancher 60 s", () => {
    expect(signedUrlTtl("5")).toBe(60);
    expect(signedUrlTtl("-1")).toBe(60);
  });
  it("valeur valide conservée", () => {
    expect(signedUrlTtl("300")).toBe(300);
  });
});

describe("avatars : type de fichier", () => {
  it("liste blanche, SVG refusé", () => {
    expect(avatarExtension("image/png")).toBe("png");
    expect(avatarExtension("image/jpeg")).toBe("jpg");
    expect(avatarExtension("image/webp")).toBe("webp");
    expect(avatarExtension("image/svg+xml")).toBeNull();
    expect(avatarExtension("toString")).toBeNull();
  });
  it("signature réelle du fichier", () => {
    expect(sniffImageMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]))).toBe("image/png");
    expect(sniffImageMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImageMime(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe("image/webp");
    expect(sniffImageMime(new TextEncoder().encode("<svg xmlns="))).toBeNull();
  });
});
