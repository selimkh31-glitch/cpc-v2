"use client";

import { useState } from "react";
import { Button, SubmitButton } from "@/components/ui/button";
import { TextArea, TextField } from "@/components/ui/text-field";
import { Stepper } from "@/components/patterns/stepper";
import { CLUB_LANGUAGES, CLUB_LEVELS, CLUB_LIMITS, type ClubLanguage, type ClubLevel } from "@/features/clubs/contract";
import { PLATFORMS, POSITIONS, type Platform, type Position } from "@/features/onboarding/referentials";
import { createClubAction } from "@/features/clubs/actions";

const PLATFORM_LABELS: Record<Platform, string> = { ps5: "PS5", xbox_series: "Xbox Series", pc: "PC" };
const LEVEL_LABELS: Record<ClubLevel, string> = { casual: "Loisir", intermediate: "Intermédiaire", competitive: "Compétitif", elite: "Élite" };
const LANGUAGE_LABELS: Record<ClubLanguage, string> = { fr: "Français", en: "Anglais", es: "Espagnol", it: "Italien", de: "Allemand", pt: "Portugais", nl: "Néerlandais", ar: "Arabe" };

/** Wizard 3 étapes, un seul envoi serveur. Les valeurs restent dans des hidden fields lors du changement d'étape. */
export function CreateClubWizard({ requestId }: { requestId: string }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState<Platform>("ps5");
  const [languages, setLanguages] = useState<ClubLanguage[]>(["fr"]);
  const [level, setLevel] = useState<ClubLevel>("casual");
  const [recruitingOpen, setRecruitingOpen] = useState(true);
  const [positions, setPositions] = useState<Position[]>([]);
  const [hint, setHint] = useState<string | null>(null);

  const next = () => {
    if (step === 0 && (name.trim().length < CLUB_LIMITS.nameMin || name.trim().length > CLUB_LIMITS.nameMax)) {
      setHint("Le nom doit contenir entre 3 et 32 caractères.");
      return;
    }
    if (step === 1 && (!languages.length || languages.length > CLUB_LIMITS.languagesMax)) {
      setHint("Sélectionne entre une et trois langues.");
      return;
    }
    setHint(null);
    setStep((current) => Math.min(current + 1, 2));
  };
  const toggleLanguage = (language: ClubLanguage, enabled: boolean) => {
    setLanguages((prev) => enabled ? [...new Set([...prev, language])].slice(0, CLUB_LIMITS.languagesMax) : prev.filter((l) => l !== language));
  };
  const togglePosition = (pos: Position, enabled: boolean) => {
    setPositions((prev) => enabled ? [...new Set([...prev, pos])] : prev.filter((p) => p !== pos));
  };

  return (
    <form action={createClubAction} className="flex flex-col gap-5">
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="description" value={description} />
      <input type="hidden" name="platform" value={platform} />
      <input type="hidden" name="level" value={level} />
      <input type="hidden" name="recruitingOpen" value={String(recruitingOpen)} />
      {languages.map((l) => <input key={l} type="hidden" name="languages" value={l} />)}
      {positions.map((p) => <input key={p} type="hidden" name="recruitingPositions" value={p} />)}
      <p className="text-footnote text-ink-2">Étape {step + 1} sur 3</p>
      <Stepper steps={["Identité", "Jeu", "Recrutement"]} current={step} />
      {step === 0 ? (
        <section className="flex flex-col gap-4 rounded-hero bg-surface-1 p-4">
          <TextField label="Nom du club" value={name} maxLength={CLUB_LIMITS.nameMax} onChange={(event) => setName(event.currentTarget.value)} placeholder="Ex. Étoile Basque" />
          <TextArea label="Description (facultative)" value={description} maxLength={CLUB_LIMITS.descriptionMax} rows={4} onChange={(event) => setDescription(event.currentTarget.value)} hint="Présente le style de jeu et l’esprit du club." />
        </section>
      ) : null}
      {step === 1 ? (
        <section className="flex flex-col gap-5 rounded-hero bg-surface-1 p-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="club-platform" className="text-subhead font-medium text-ink-2">Plateforme</label>
            <select id="club-platform" value={platform} onChange={(event) => setPlatform(event.currentTarget.value as Platform)} className="min-h-12 rounded-field bg-surface-2 px-4 text-body text-ink">
              {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
            </select>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-subhead font-medium text-ink-2">Langues (maximum 3)</legend>
            <div className="grid grid-cols-2 gap-2">
              {CLUB_LANGUAGES.map((language) => (
                <label key={language} className="flex min-h-11 items-center gap-2 rounded-field bg-surface-2 px-3 text-subhead">
                  <input type="checkbox" checked={languages.includes(language)}
                    onChange={(event) => toggleLanguage(language, event.currentTarget.checked)} />
                  {LANGUAGE_LABELS[language]}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-col gap-2">
            <label htmlFor="club-level" className="text-subhead font-medium text-ink-2">Niveau déclaré</label>
            <select id="club-level" value={level} onChange={(event) => setLevel(event.currentTarget.value as ClubLevel)} className="min-h-12 rounded-field bg-surface-2 px-4 text-body text-ink">
              {CLUB_LEVELS.map((v) => <option key={v} value={v}>{LEVEL_LABELS[v]}</option>)}
            </select>
            <p className="text-footnote text-ink-3">Le niveau est déclaré, sans vérification EA.</p>
          </div>
        </section>
      ) : null}
      {step === 2 ? (
        <section className="flex flex-col gap-5 rounded-hero bg-surface-1 p-4">
          <label className="flex min-h-12 items-center gap-3 text-body">
            <input type="checkbox" checked={recruitingOpen} onChange={(event) => setRecruitingOpen(event.currentTarget.checked)} />
            Ouvrir le recrutement
          </label>
          <fieldset className="flex flex-col gap-3">
            <legend className="text-subhead font-medium text-ink-2">Postes recherchés (facultatif)</legend>
            <div className="grid grid-cols-3 gap-2">
              {POSITIONS.map((pos) => (
                <label key={pos} className="flex min-h-11 items-center justify-center gap-2 rounded-field bg-surface-2 px-2 text-subhead">
                  <input type="checkbox" checked={positions.includes(pos)}
                    onChange={(event) => togglePosition(pos, event.currentTarget.checked)} />
                  {pos}
                </label>
              ))}
            </div>
          </fieldset>
          <p className="text-footnote text-ink-2">Tu deviendras propriétaire (OWNER) de ce club, sans perdre ton statut de joueur.</p>
        </section>
      ) : null}
      {hint ? <p role="alert" className="text-footnote text-danger">{hint}</p> : null}
      <div className="flex gap-3">
        {step > 0 ? <Button type="button" variant="secondary" size="lg" onClick={() => { setHint(null); setStep((s) => s - 1); }}>Retour</Button> : null}
        {step < 2 ? <Button type="button" size="lg" onClick={next}>Continuer</Button> : (
          <SubmitButton size="lg" pendingLabel="Création en cours…">Créer mon club</SubmitButton>
        )}
      </div>
    </form>
  );
}
