import { useId } from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-field bg-surface-2 px-4 text-body text-ink placeholder:text-ink-3 outline-none transition-[box-shadow] duration-150 " +
  "focus-visible:outline-none focus:ring-2 focus:ring-accent aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-danger";

type FieldShellProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  counter?: string;
  children: React.ReactNode;
};

function FieldShell({ id, label, hint, error, counter, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <label htmlFor={id} className="text-subhead font-medium text-ink-2">
          {label}
        </label>
        {counter ? <span className="text-caption tabular-nums text-ink-3" aria-hidden>{counter}</span> : null}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="px-1 text-footnote text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="px-1 text-footnote text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, hint?: string, error?: string) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

type TextFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> & { label: string; hint?: string; error?: string };

/** Champ texte : libellé toujours visible, aide ou erreur liée (aria-describedby), 16 px minimum. */
export function TextField({ label, hint, error, className, ...props }: TextFieldProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <input id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error)} className={cn(control, "min-h-12", className)} {...props} />
    </FieldShell>
  );
}

type TextAreaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & { label: string; hint?: string; error?: string; counter?: string };

export function TextArea({ label, hint, error, counter, className, ...props }: TextAreaProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} counter={counter}>
      <textarea id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error)} className={cn(control, "min-h-28 py-3", className)} {...props} />
    </FieldShell>
  );
}
