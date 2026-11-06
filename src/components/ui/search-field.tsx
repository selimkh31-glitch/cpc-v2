import { useId } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/** Champ de recherche accessible, sans requête automatique à chaque caractère (D-48). */
export function SearchField({
  label,
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "id"> & {
  label: string;
}) {
  const id = useId();
  return (
    <div className={cn("relative flex min-h-12 items-center rounded-field bg-surface-2", className)}>
      <Search aria-hidden className="pointer-events-none ml-3 size-5 shrink-0 text-ink-2" />
      <label htmlFor={id} className="sr-only">{label}</label>
      <input
        {...props}
        id={id}
        type="search"
        autoComplete="off"
        aria-label={label}
        className="min-h-12 min-w-0 flex-1 rounded-field bg-transparent px-3 text-base text-ink outline-none placeholder:text-ink-3 focus-visible:ring-2 focus-visible:ring-accent"
      />
    </div>
  );
}
