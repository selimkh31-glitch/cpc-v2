import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { hasProfile, requireUser } from "@/lib/auth/session";
import { completeOnboardingAction } from "@/features/onboarding/actions";
import { AGE_MIN, PLATFORMS, POSITIONS } from "@/features/onboarding/referentials";

const ERRORS = new Set(["VALIDATION", "CONFLICT", "UNKNOWN"]);

/** S-1.6 / AUTH-03 : profil minimal (pseudo, plateforme, postes, déclaration d'âge). Aucune donnée de plus. */
export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const user = await requireUser("/onboarding");
  if (await hasProfile(user.userId)) redirect("/home");
  const params = await searchParams;
  const t = await getTranslations("onboarding");
  const errorKey = typeof params.error === "string" && ERRORS.has(params.error) ? params.error : null;
  // Clé d'idempotence générée au rendu : une double soumission du même formulaire n'écrit qu'une fois.
  const requestId = crypto.randomUUID();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="text-sm opacity-80">{t("intro")}</p>
      {errorKey ? (
        <p role="alert" className="rounded-card border border-red-500 p-3 text-sm">{t(`errors.${errorKey}`)}</p>
      ) : null}
      <form action={completeOnboardingAction} className="flex flex-col gap-5">
        <input type="hidden" name="requestId" value={requestId} />
        <label className="flex flex-col gap-1 text-sm">
          {t("handle")}
          <input name="handle" required minLength={3} maxLength={20} pattern="[a-zA-Z0-9_.\-]{3,20}" autoComplete="nickname" className="min-h-11 rounded-card border px-3" />
          <span className="text-xs opacity-70">{t("handleHint")}</span>
        </label>
        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1">{t("platform")}</legend>
          {PLATFORMS.map((p) => (
            <label key={p} className="flex min-h-11 items-center gap-3">
              <input type="radio" name="platform" value={p} required className="size-5" />
              {t(`platforms.${p}`)}
            </label>
          ))}
        </fieldset>
        <label className="flex flex-col gap-1 text-sm">
          {t("mainPosition")}
          <select name="mainPosition" required defaultValue="" className="min-h-11 rounded-card border px-3">
            <option value="" disabled>—</option>
            {POSITIONS.map((p) => (
              <option key={p} value={p}>{t(`positions.${p}`)}</option>
            ))}
          </select>
        </label>
        <fieldset className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          <legend className="col-span-2 mb-1">{t("secondaryPositions")}</legend>
          {POSITIONS.map((p) => (
            <label key={p} className="flex min-h-11 items-center gap-2">
              <input type="checkbox" name="secondaryPositions" value={p} className="size-5" />
              {t(`positions.${p}`)}
            </label>
          ))}
        </fieldset>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" name="ageConfirmed" required className="size-5" />
          {t("ageConfirm", { age: AGE_MIN })}
        </label>
        <button type="submit" className="min-h-11 rounded-card bg-foreground px-4 font-medium text-background">{t("submit")}</button>
      </form>
    </main>
  );
}
