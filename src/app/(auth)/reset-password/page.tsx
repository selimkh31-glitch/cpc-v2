import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/session";
import { updatePasswordAction } from "@/features/auth/actions";

/** Atteinte via le lien de récupération (PKCE → /auth/callback?next=/reset-password) : session fraîche requise. */
export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  await requireUser("/reset-password");
  const params = await searchParams;
  const t = await getTranslations("auth");
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-10">
      <h1 className="text-2xl font-semibold">{t("resetTitle")}</h1>
      {params.error ? (
        <p role="alert" className="rounded-card border border-red-500 p-3 text-sm">{t("invalidNewPassword")}</p>
      ) : null}
      <form action={updatePasswordAction} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          {t("newPassword")}
          <input name="password" type="password" autoComplete="new-password" required minLength={10} className="min-h-11 rounded-card border px-3" />
          <span className="text-xs opacity-70">{t("passwordHint")}</span>
        </label>
        <button type="submit" className="min-h-11 rounded-card bg-foreground px-4 font-medium text-background">
          {t("submitReset")}
        </button>
      </form>
    </main>
  );
}
