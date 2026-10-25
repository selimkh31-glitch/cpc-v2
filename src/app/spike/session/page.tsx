import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOutAction } from "@/features/auth/actions";
import { SpikeClient } from "./spike-client";

/**
 * Page technique du spike S-1.4a (ADR-0002, scénarios A1–A8).
 * Désactivée sauf si ENABLE_AUTH_SPIKE=1 (CI / local) : jamais exposée en Preview ni en prod.
 */
export default async function SpikeSessionPage() {
  if (process.env.ENABLE_AUTH_SPIKE !== "1") notFound();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/login?next=/spike/session");

  const t = await getTranslations("spike");
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt>{t("serverSub")}</dt>
        <dd data-testid="server-sub">{claims.sub}</dd>
        <dt>{t("serverExp")}</dt>
        <dd data-testid="server-exp">{claims.exp}</dd>
      </dl>
      <SpikeClient userId={claims.sub} />
      <div className="flex gap-2">
        <form action={signOutAction}>
          <input type="hidden" name="scope" value="local" />
          <button type="submit" className="min-h-11 rounded-card border px-3 text-sm">{t("signOutLocal")}</button>
        </form>
        <form action={signOutAction}>
          <input type="hidden" name="scope" value="global" />
          <button type="submit" className="min-h-11 rounded-card border px-3 text-sm">{t("signOutGlobal")}</button>
        </form>
      </div>
    </main>
  );
}
