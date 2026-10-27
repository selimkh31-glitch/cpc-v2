import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/patterns/auth-shell";
import { SubmitButton } from "@/components/ui/button";
import { buttonClasses } from "@/components/ui/button-styles";
import { InlineStatus } from "@/components/ui/inline-status";
import { TextField } from "@/components/ui/text-field";
import { signInAction } from "@/features/auth/actions";
import { safeNextPath } from "@/lib/auth/redirect";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const t = await getTranslations("auth");
  const tStates = await getTranslations("states");
  const next = safeNextPath(params.next, "/home");
  return (
    <AuthShell
      title={t("loginTitle")}
      footer={
        // Accès sans compte aux documents légaux.
        <nav aria-label={t("legalNav")} className="flex flex-wrap justify-center gap-x-5 text-footnote text-ink-3">
          <Link href="/legal/terms" className="inline-flex min-h-11 items-center">{t("legalTerms")}</Link>
          <Link href="/legal/privacy" className="inline-flex min-h-11 items-center">{t("legalPrivacy")}</Link>
          <Link href="/legal/support" className="inline-flex min-h-11 items-center">{t("legalSupport")}</Link>
        </nav>
      }
    >
      {params.error ? <InlineStatus kind="error">{t("invalidCredentials")}</InlineStatus> : null}
      <form action={signInAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <TextField label={t("email")} name="email" type="email" autoComplete="email" inputMode="email" required />
        <TextField label={t("password")} name="password" type="password" autoComplete="current-password" required minLength={10} />
        <SubmitButton size="lg" pendingLabel={tStates("pending")} className="mt-2">
          {t("submitLogin")}
        </SubmitButton>
      </form>
      <div className="flex flex-col items-center gap-1">
        <Link href="/forgot-password" className={buttonClasses({ variant: "ghost" })}>
          {t("goToForgot")}
        </Link>
        <Link href={`/signup?next=${encodeURIComponent(next)}`} className={buttonClasses({ variant: "ghost" })}>
          {t("goToSignup")}
        </Link>
      </div>
    </AuthShell>
  );
}
