import { Search, X } from "lucide-react";

/** Recherche progressive sans requête à chaque frappe ; form GET et navigation natives. */
export function SearchField({
  action, name = "q", label, placeholder, defaultValue = "", clearHref,
}: {
  action: string;
  name?: string;
  label: string;
  placeholder: string;
  defaultValue?: string;
  clearHref?: string;
}) {
  return (
    <form action={action} method="get" role="search" className="flex items-center gap-2">
      <label className="sr-only" htmlFor={"search-" + name}>{label}</label>
      <div className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-field bg-surface-2 px-3 text-ink">
        <Search aria-hidden className="size-5 shrink-0 text-ink-3" />
        <input
          id={"search-" + name}
          name={name}
          type="search"
          defaultValue={defaultValue}
          placeholder={placeholder}
          autoComplete="off"
          maxLength={32}
          className="min-h-12 w-full min-w-0 bg-transparent text-body text-ink outline-none placeholder:text-ink-3"
        />
        {clearHref && defaultValue ? (
          <a href={clearHref} className="flex size-11 shrink-0 items-center justify-center" aria-label="Effacer la recherche">
            <X aria-hidden className="size-4" />
          </a>
        ) : null}
      </div>
      <button type="submit" className="min-h-12 shrink-0 rounded-field bg-accent px-3 text-subhead font-semibold text-on-accent">
        Rechercher
      </button>
    </form>
  );
}
