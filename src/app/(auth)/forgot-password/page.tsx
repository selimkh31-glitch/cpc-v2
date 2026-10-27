import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/patterns/auth-shell";
import { SubmitButton } from "@/components/ui/button";
import { buttonClasses } from "@/components/ui/button-styles";
import { InlineStatus } from "@/components/ui/inline-status";
import { TextField } from "@/components/ui/text-field";
import { requestPasswordResetAction } from "@/features/auth/actions";

export default async function ForgotPasswordPage({ searchParams }: PageProps<"/forgot-password">) {
  const params = await searchParams;
  const t = await getTranslations("auth");
  const tStates = await getTranslations("states");
  const back = (
    <div className="flex justify-center">
      <Link href="/login" className={buttonClasses({ variant: "ghost" })}>
        {t("goToLogin")}
      </Link>
    </div>
  );
  if (params.sent) {
    return (
      <AuthShell title={t("checkEmailTitle")}>
        <InlineStatus kind="info">{t("resetEmailSent")}</InlineStatus>
        {back}
      </AuthShell>
    );
  }
  return (
    <AuthShell title={t("forgotTitle")}>
      <form action={requestPasswordResetAction} className="flex flex-col gap-4">
        <TextField label={t("email")} name="email" type="email" autoComplete="email" inputMode="email" required />
        <SubmitButton size="lg" pendingLabel={tStates("pending")} className="mt-2">
          {t("submitForgot")}
        </SubmitButton>
      </form>
      {back}
    </AuthShell>
  );
}
