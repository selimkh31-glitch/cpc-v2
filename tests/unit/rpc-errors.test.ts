import { describe, expect, it } from "vitest";
import { rpcErrorCode, stateKindFor } from "@/lib/errors/rpc";

describe("rpcErrorCode", () => {
  it("reconnaît les codes stables", () => {
    expect(rpcErrorCode({ message: "CONFLICT" })).toBe("CONFLICT");
    expect(rpcErrorCode({ message: " VALIDATION " })).toBe("VALIDATION");
    expect(rpcErrorCode({ message: "NOT_FOUND" })).toBe("NOT_FOUND");
    expect(rpcErrorCode({ message: "LIMIT_REACHED" })).toBe("LIMIT_REACHED");
  });
  it("ne laisse jamais passer un message technique", () => {
    expect(rpcErrorCode({ message: 'duplicate key value violates unique constraint "profiles_handle_key"' })).toBe("UNKNOWN");
    expect(rpcErrorCode(null)).toBe("UNKNOWN");
    expect(rpcErrorCode({})).toBe("UNKNOWN");
  });
});

describe("stateKindFor", () => {
  it.each([
    ["FORBIDDEN", "forbidden"],
    ["NOT_FOUND", "forbidden"],
    ["LIMIT_REACHED", "error"],
    ["UNAUTHENTICATED", "forbidden"],
    ["EXPIRED", "expired"],
    ["CONFLICT", "conflict"],
    ["ALREADY_HANDLED", "conflict"],
    ["VALIDATION", "error"],
    ["RATE_LIMITED", "error"],
    ["UNKNOWN", "error"],
  ] as const)("%s → %s", (code, kind) => {
    expect(stateKindFor(code)).toBe(kind);
  });
});
