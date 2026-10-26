import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { signUpAction } from "@/features/auth/actions";
import { safeNextPath } from "@/lib/auth/redirect";

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const params = await searchParams;
  const t = await getTranslations("auth");
  const next = safeNextPath(params.next, "/home");
  if (params.sent) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-3 px-4 py-10">
        <h1 className="text-2xl font-semibold">{t("checkEmailTitle")}</h1>
        <p role="status">{t("checkEmailBody")}</p>
      </main>
    );
  }
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-10">
      <h1 className="text-2xl font-semibold">{t("signupTitle")}</h1>
      {params.error ? (
        <p role="alert" className="rounded-card border border-red-500 p-3 text-sm">
          {t("invalidSignup")}
        </p>
      ) : null}
      <form action={signUpAction} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />
        <label className="flex flex-col gap-1 text-sm">
          {t("email")}
          <input name="email" type="email" autoComplete="email" required className="min-h-11 rounded-card border px-3" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("password")}
          <input name="password" type="password" autoComplete="new-password" required minLength={10} className="min-h-11 rounded-card border px-3" />
          <span className="text-xs opacity-70">{t("passwordHint")}</span>
        </label>
        <button type="submit" className="min-h-11 rounded-card bg-foreground px-4 font-medium text-background">
          {t("submitSignup")}
        </button>
      </form>
      <Link href={`/login?next=${encodeURIComponent(next)}`} className="inline-flex min-h-11 items-center text-sm underline">
        {t("goToLogin")}
      </Link>
    </main>
  );
}
