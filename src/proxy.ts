import { NextResponse, type NextRequest } from "next/server";
import { buildCsp, generateNonce } from "@/lib/security/csp";
import { refreshSession } from "@/lib/supabase/proxy";

/**
 * Proxy (Next.js 16) :
 * 1. rafraîchit la session Supabase (ADR-0002) ;
 * 2. pose une CSP à nonce par requête (ADR-0002 / ADR-0017).
 * Le proxy est un confort : l'autorisation est toujours revérifiée côté serveur et en base.
 */
export async function proxy(request: NextRequest) {
  const auth = await refreshSession(request);

  const nonce = generateNonce();
  const csp = buildCsp({
    nonce,
    isDev: process.env.NODE_ENV === "development",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });

  // En-têtes de requête construits APRÈS le rafraîchissement : ils portent les cookies à jour.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  for (const { name, value, options } of auth.cookies) response.cookies.set(name, value, options);
  for (const [key, value] of Object.entries(auth.headers)) response.headers.set(key, value);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
