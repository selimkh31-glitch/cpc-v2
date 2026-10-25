import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Utilitaire de composition de classes (convention shadcn/ui). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
