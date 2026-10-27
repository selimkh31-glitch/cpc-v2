import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/patterns/auth-shell";
import { SubmitButton } from "@/components/ui/button";
import { buttonClasses } from "@/components/ui/button-styles";
import { InlineStatus } from "@/components/ui/inline-status";
import { TextField } from "@/components/ui/text-field";
import { signUpAction } from "@/features/auth/actions";
import { safeNextPath } from "@/lib/auth/redirect";

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const params = await searchParams;
  const t = await getTranslations("auth");
  const tStates = await getTranslations("states");
  const next = safeNextPath(params.next, "/home");
  if (params.sent) {
    return (
      <AuthShell title={t("checkEmailTitle")}>
        <InlineStatus kind="info">{t("checkEmailBody")}</InlineStatus>
      </AuthShell>
    );
  }
  return (
    <AuthShell title={t("signupTitle")}>
      {params.error ? <InlineStatus kind="error">{t("invalidSignup")}</InlineStatus> : null}
      <form action={signUpAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <TextField label={t("email")} name="email" type="email" autoComplete="email" inputMode="email" required />
        <TextField label={t("password")} name="password" type="password" autoComplete="new-password" required minLength={10} hint={t("passwordHint")} />
        <SubmitButton size="lg" pendingLabel={tStates("pending")} className="mt-2">
          {t("submitSignup")}
        </SubmitButton>
      </form>
      <div className="flex justify-center">
        <Link href={`/login?next=${encodeURIComponent(next)}`} className={buttonClasses({ variant: "ghost" })}>
          {t("goToLogin")}
        </Link>
      </div>
    </AuthShell>
  );
}
