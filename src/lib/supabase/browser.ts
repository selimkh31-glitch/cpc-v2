"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

/** Client Supabase navigateur (composants client). Les valeurs publiques sont injectées au build. */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase non configuré côté navigateur.");
  const secure = (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://");
  client = createBrowserClient(url, key, { cookieOptions: { secure } });
  return client;
}
