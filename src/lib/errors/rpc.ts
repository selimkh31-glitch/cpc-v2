import type { StateKind } from "@/components/states/state-panel";

/** Codes d'erreur stables renvoyés par les commandes api.* (ADR-0004). */
export const RPC_ERROR_CODES = ["UNAUTHENTICATED", "FORBIDDEN", "VALIDATION", "CONFLICT", "ALREADY_HANDLED", "EXPIRED", "RATE_LIMITED"] as const;
export type RpcErrorCode = (typeof RPC_ERROR_CODES)[number] | "UNKNOWN";

/** Extrait un code stable du message d'erreur PostgREST/Postgres ; tout le reste devient UNKNOWN (jamais de détail technique affiché). */
export function rpcErrorCode(error: { message?: string } | null | undefined): RpcErrorCode {
  const message = error?.message?.trim() ?? "";
  return (RPC_ERROR_CODES as readonly string[]).includes(message) ? (message as RpcErrorCode) : "UNKNOWN";
}

/** Correspondance code → état UX transversal (cahier UX §12). */
export function stateKindFor(code: RpcErrorCode): StateKind {
  switch (code) {
    case "FORBIDDEN":
    case "UNAUTHENTICATED":
      return "forbidden";
    case "EXPIRED":
      return "expired";
    case "CONFLICT":
    case "ALREADY_HANDLED":
      return "conflict";
    default:
      return "error";
  }
}
