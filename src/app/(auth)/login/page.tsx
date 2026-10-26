import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PendingButton } from "@/components/states/pending-button";
import { signInAction } from "@/features/auth/actions";
import { safeNextPath } from "@/lib/auth/redirect";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const t = await getTranslations("auth");
  const tStates = await getTranslations("states");
  const next = safeNextPath(params.next, "/home");
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-10">
      <h1 className="text-2xl font-semibold">{t("loginTitle")}</h1>
      {params.error ? (
        <p role="alert" className="rounded-card border border-red-500 p-3 text-sm">
          {t("invalidCredentials")}
        </p>
      ) : null}
      <form action={signInAction} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />
        <label className="flex flex-col gap-1 text-sm">
          {t("email")}
          <input name="email" type="email" autoComplete="email" required className="min-h-11 rounded-card border px-3" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("password")}
          <input name="password" type="password" autoComplete="current-password" required minLength={10} className="min-h-11 rounded-card border px-3" />
        </label>
        <PendingButton pendingLabel={tStates("pending")} className="bg-foreground font-medium text-background">
          {t("submitLogin")}
        </PendingButton>
      </form>
      <Link href="/forgot-password" className="inline-flex min-h-11 items-center text-sm underline">
        {t("goToForgot")}
      </Link>
      <Link href={`/signup?next=${encodeURIComponent(next)}`} className="inline-flex min-h-11 items-center text-sm underline">
        {t("goToSignup")}
      </Link>
      {/* Accès sans compte aux documents légaux (auparavant sur la page provisoire `/`). */}
      <nav aria-label={t("legalNav")} className="mt-6 flex flex-wrap gap-x-4 text-sm">
        <Link href="/legal/terms" className="inline-flex min-h-11 items-center underline">{t("legalTerms")}</Link>
        <Link href="/legal/privacy" className="inline-flex min-h-11 items-center underline">{t("legalPrivacy")}</Link>
        <Link href="/legal/support" className="inline-flex min-h-11 items-center underline">{t("legalSupport")}</Link>
      </nav>
    </main>
  );
}
