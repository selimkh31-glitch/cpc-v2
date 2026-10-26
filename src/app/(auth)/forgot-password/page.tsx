import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requestPasswordResetAction } from "@/features/auth/actions";

export default async function ForgotPasswordPage({ searchParams }: PageProps<"/forgot-password">) {
  const params = await searchParams;
  const t = await getTranslations("auth");
  if (params.sent) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-3 px-4 py-10">
        <h1 className="text-2xl font-semibold">{t("checkEmailTitle")}</h1>
        <p role="status">{t("resetEmailSent")}</p>
        <Link href="/login" className="text-sm underline">{t("goToLogin")}</Link>
      </main>
    );
  }
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-10">
      <h1 className="text-2xl font-semibold">{t("forgotTitle")}</h1>
      <form action={requestPasswordResetAction} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          {t("email")}
          <input name="email" type="email" autoComplete="email" required className="min-h-11 rounded-card border px-3" />
        </label>
        <button type="submit" className="min-h-11 rounded-card bg-foreground px-4 font-medium text-background">
          {t("submitForgot")}
        </button>
      </form>
      <Link href="/login" className="text-sm underline">{t("goToLogin")}</Link>
    </main>
  );
}
