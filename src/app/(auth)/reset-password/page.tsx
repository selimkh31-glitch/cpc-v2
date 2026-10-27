import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/patterns/auth-shell";
import { SubmitButton } from "@/components/ui/button";
import { InlineStatus } from "@/components/ui/inline-status";
import { TextField } from "@/components/ui/text-field";
import { updatePasswordAction } from "@/features/auth/actions";
import { requireUser } from "@/lib/auth/session";

/** Atteinte via le lien de récupération (PKCE → /auth/callback?next=/reset-password) : session fraîche requise. */
export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  await requireUser("/reset-password");
  const params = await searchParams;
  const t = await getTranslations("auth");
  const tStates = await getTranslations("states");
  return (
    <AuthShell title={t("resetTitle")}>
      {params.error ? <InlineStatus kind="error">{t("invalidNewPassword")}</InlineStatus> : null}
      <form action={updatePasswordAction} className="flex flex-col gap-4">
        <TextField label={t("newPassword")} name="password" type="password" autoComplete="new-password" required minLength={10} hint={t("passwordHint")} />
        <SubmitButton size="lg" pendingLabel={tStates("pending")} className="mt-2">
          {t("submitReset")}
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
