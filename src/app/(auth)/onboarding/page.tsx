import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/patterns/auth-shell";
import { SubmitButton } from "@/components/ui/button";
import { ChoiceChip } from "@/components/ui/choice-chip";
import { InlineStatus } from "@/components/ui/inline-status";
import { TextField } from "@/components/ui/text-field";
import { completeOnboardingAction } from "@/features/onboarding/actions";
import { OnboardingStepper } from "@/features/onboarding/components/onboarding-stepper";
import { AGE_MIN, PLATFORMS, POSITION_GROUPS } from "@/features/onboarding/referentials";
import { hasProfile, requireUser } from "@/lib/auth/session";

const ERRORS = new Set(["VALIDATION", "CONFLICT", "UNKNOWN"]);

/**
 * S-1.6 / AUTH-03 : profil minimal (pseudo, plateforme, postes, déclaration d'âge), aucune donnée de plus.
 * P2-A : mêmes champs et même commande `complete_onboarding`, présentés en 3 étapes, un seul envoi.
 */
export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const user = await requireUser("/onboarding");
  if (await hasProfile(user.userId)) redirect("/home");
  const params = await searchParams;
  const t = await getTranslations("onboarding");
  const tStates = await getTranslations("states");
  const errorKey = typeof params.error === "string" && ERRORS.has(params.error) ? params.error : null;
  // Clé d'idempotence générée au rendu : une double soumission du même formulaire n'écrit qu'une fois.
  const requestId = crypto.randomUUID();
  const short = (code: string) => t(`positions.${code}`).split(" — ")[1] ?? code;

  const legend = "mb-3 px-1 text-subhead font-medium text-ink-2";

  const identity = (
    <>
      <TextField
        label={t("handle")}
        name="handle"
        required
        minLength={3}
        maxLength={20}
        pattern="[a-zA-Z0-9_.\-]{3,20}"
        autoComplete="nickname"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        hint={t("handleHint")}
      />
      <fieldset>
        <legend className={legend}>{t("platform")}</legend>
        <div className="grid grid-cols-3 gap-2">
          {PLATFORMS.map((p) => (
            <ChoiceChip key={p} type="radio" name="platform" value={p} label={t(`platforms.${p}`)} required />
          ))}
        </div>
      </fieldset>
    </>
  );

  const positions = (
    <>
      <fieldset>
        <legend className={legend}>{t("mainPosition")}</legend>
        <div className="flex flex-col gap-4">
          {POSITION_GROUPS.map((group) => (
            <div key={group.key} className="flex flex-col gap-2">
              <p className="px-1 text-caption uppercase tracking-wide text-ink-3">{t(`groups.${group.key}`)}</p>
              <div className="grid grid-cols-3 gap-2">
                {group.positions.map((p) => (
                  <ChoiceChip key={p} type="radio" name="mainPosition" value={p} label={p} detail={short(p)} accessibleLabel={t(`positions.${p}`)} required />
                ))}
              </div>
            </div>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className={legend}>{t("secondaryPositions")}</legend>
        <div className="flex flex-col gap-4">
          {POSITION_GROUPS.map((group) => (
            <div key={group.key} className="flex flex-col gap-2">
              <p className="px-1 text-caption uppercase tracking-wide text-ink-3">{t(`groups.${group.key}`)}</p>
              <div className="grid grid-cols-3 gap-2">
                {group.positions.map((p) => (
                  <ChoiceChip key={p} type="checkbox" name="secondaryPositions" value={p} label={p} detail={short(p)} accessibleLabel={t(`positions.${p}`)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </fieldset>
    </>
  );

  const confirm = (
    <>
      <p className="px-1 text-body text-ink-2">{t("confirmIntro")}</p>
      <label className="flex min-h-12 items-center gap-3 rounded-row bg-surface-1 px-4 py-3 text-body">
        <input type="checkbox" name="ageConfirmed" required className="size-5 shrink-0 accent-[var(--accent)]" />
        {t("ageConfirm", { age: AGE_MIN })}
      </label>
      <SubmitButton size="lg" pendingLabel={tStates("pending")}>
        {t("submit")}
      </SubmitButton>
    </>
  );

  return (
    <AuthShell title={t("title")} className="justify-start">
      <p className="-mt-4 px-1 text-body text-ink-2">{t("intro")}</p>
      {errorKey ? <InlineStatus kind="error">{t(`errors.${errorKey}`)}</InlineStatus> : null}
      <form action={completeOnboardingAction} className="flex flex-col">
        <input type="hidden" name="requestId" value={requestId} />
        <OnboardingStepper
          steps={[
            { title: t("stepIdentity"), content: identity },
            { title: t("stepPositions"), content: positions },
            { title: t("stepConfirm"), content: confirm },
          ]}
          labels={{ next: t("next"), back: t("back"), progress: [1, 2, 3].map((current) => t("progress", { current, total: 3 })) }}
        />
      </form>
    </AuthShell>
  );
}
