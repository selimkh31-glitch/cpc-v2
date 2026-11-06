"use client";

import Link from "next/link";
import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { FilterBar } from "@/components/patterns/filter-bar";
import { FilterSheet } from "@/components/patterns/filter-sheet";
import { SearchField } from "@/components/ui/search-field";
import { Button } from "@/components/ui/button";
import { activeFilterCount, serializeClubFilters, type ClubFilters, type ClubFilterDefaults } from "@/features/explore/contract";
import { CLUB_LANGUAGES, CLUB_LEVELS } from "@/features/clubs/contract";
import { PLATFORMS, POSITIONS } from "@/features/onboarding/referentials";

const PLATFORM_LABEL: Record<string, string> = { ps5: "PS5", xbox_series: "Xbox Series", pc: "PC" };
const LEVEL_LABEL: Record<string, string> = { casual: "Loisir", intermediate: "Intermédiaire", competitive: "Compétitif", elite: "Élite" };

function urlFor(filters: ClubFilters, defaults: ClubFilterDefaults) {
  const params = serializeClubFilters({ ...filters, cursor: null }, defaults);
  const query = params.toString();
  return "/explore/clubs" + (query ? "?" + query : "");
}

/** Panneau de filtres : HTML GET, sans appels par frappe, et URL partageable. */
export function ClubFiltersControls({ filters, defaults }: { filters: ClubFilters; defaults: ClubFilterDefaults }) {
  const [open, setOpen] = useState(false);
  const count = activeFilterCount(filters, defaults);
  const keep = serializeClubFilters({ ...filters, q: null, cursor: null }, defaults);

  return (
    <section aria-label="Recherche des clubs" className="flex flex-col gap-3">
      <form action="/explore/clubs" method="GET" role="search" className="flex gap-2">
        <div className="min-w-0 flex-1">
          <SearchField key={filters.q ?? ""} name="q" label="Rechercher un club par nom" maxLength={32}
            defaultValue={filters.q ?? ""} placeholder="Rechercher un club…" />
        </div>
        {[...keep.entries()].map(([key, value], i) => (
          <input key={key + i} type="hidden" name={key} value={value} />
        ))}
        <Button type="submit" variant="secondary">Chercher</Button>
      </form>
      <FilterBar>
        <Link href={urlFor({ ...filters, recruitingOnly: !filters.recruitingOnly }, defaults)}
          aria-pressed={filters.recruitingOnly}
          className={"inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-subhead " +
            (filters.recruitingOnly ? "border-accent bg-surface-2 text-ink" : "border-separator bg-surface-1 text-ink-2")}>
          {filters.recruitingOnly ? "Recrute uniquement" : "Tous recrutements"}
        </Link>
        <Link href={urlFor({ ...filters, platform: filters.platform === null ? defaults.platform : null }, defaults)}
          className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-separator bg-surface-1 px-4 text-subhead text-ink">
          {filters.platform === null ? "Toutes plateformes" : (PLATFORM_LABEL[filters.platform] ?? filters.platform)}
        </Link>
        <button type="button" onClick={() => setOpen(true)}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-separator bg-surface-1 px-4 text-subhead text-ink">
          <SlidersHorizontal aria-hidden className="size-4" />
          Filtres{count ? " (" + count + ")" : ""}
        </button>
      </FilterBar>
      {(filters.q || count > 0) ? (
        <div className="flex flex-wrap items-center gap-2 text-footnote">
          {filters.q ? <Link href={urlFor({ ...filters, q: null }, defaults)}
            className="inline-flex min-h-11 items-center gap-1 rounded-full bg-surface-2 px-3 text-ink"
            aria-label="Effacer la recherche par nom">
            Recherche : {filters.q}<X aria-hidden className="size-4" /></Link> : null}
          {filters.position ? <Link href={urlFor({ ...filters, position: null }, defaults)}
            className="inline-flex min-h-11 items-center gap-1 rounded-full bg-surface-2 px-3 text-ink"
            aria-label={"Retirer le filtre poste " + filters.position}>
            {filters.position}<X aria-hidden className="size-4" /></Link> : null}
          {filters.level ? <Link href={urlFor({ ...filters, level: null }, defaults)}
            className="inline-flex min-h-11 items-center gap-1 rounded-full bg-surface-2 px-3 text-ink">
            {LEVEL_LABEL[filters.level]}<X aria-hidden className="size-4" /></Link> : null}
          {filters.languages.map(l => <Link key={l} href={urlFor({ ...filters, languages: filters.languages.filter(x => x !== l) }, defaults)}
            aria-label={"Retirer le filtre langue " + l.toUpperCase()}
            className="inline-flex min-h-11 items-center gap-1 rounded-full bg-surface-2 px-3 text-ink">
            {l.toUpperCase()}<X aria-hidden className="size-4" /></Link>)}
          <Link href="/explore/clubs" className="inline-flex min-h-11 items-center px-2 text-ink-2 underline-offset-4 hover:underline">
            Tout effacer
          </Link>
        </div>
      ) : null}
      <FilterSheet open={open} onOpenChange={setOpen}>
        <form action="/explore/clubs" method="GET" className="flex flex-col gap-5">
          {filters.q ? <input type="hidden" name="q" value={filters.q} /> : null}
          <label className="flex flex-col gap-2 text-subhead text-ink-2">
            Plateforme
            <select name="platform" defaultValue={filters.platform ?? "all"}
              className="min-h-12 rounded-field bg-surface-2 px-3 text-base text-ink">
              <option value="all">Toutes les plateformes</option>
              {PLATFORMS.map(p => <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-subhead text-ink-2">
            Recrutement
            <select name="recruiting" defaultValue={filters.recruitingOnly ? "1" : "all"}
              className="min-h-12 rounded-field bg-surface-2 px-3 text-base text-ink">
              <option value="1">Recrute uniquement</option>
              <option value="all">Tous les clubs</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-subhead text-ink-2">
            Poste recherché
            <select name="position" defaultValue={filters.position ?? ""}
              className="min-h-12 rounded-field bg-surface-2 px-3 text-base text-ink">
              <option value="">Tous les postes</option>
              {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-subhead text-ink-2">
            Niveau déclaré
            <select name="level" defaultValue={filters.level ?? ""}
              className="min-h-12 rounded-field bg-surface-2 px-3 text-base text-ink">
              <option value="">Tous les niveaux</option>
              {CLUB_LEVELS.map(l => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
            </select>
          </label>
          <fieldset>
            <legend className="mb-2 text-subhead text-ink-2">Langues</legend>
            <div className="grid grid-cols-4 gap-2">
              {CLUB_LANGUAGES.map(l => (
                <label key={l} className="flex min-h-11 items-center justify-center gap-1 rounded-field bg-surface-2 px-2 text-subhead text-ink">
                  <input type="checkbox" name="lang" value={l} defaultChecked={filters.languages.includes(l)}
                    className="size-4 accent-[var(--accent)]" />
                  {l.toUpperCase()}
                </label>
              ))}
            </div>
          </fieldset>
          <Button type="submit" size="lg">Appliquer les filtres</Button>
          <Link href="/explore/clubs" className="flex min-h-11 items-center justify-center text-subhead text-ink-2">
            Réinitialiser
          </Link>
        </form>
      </FilterSheet>
    </section>
  );
}
