import { requireStaff } from "@/lib/auth/session";

/** Zone admin CPC : introuvable hors staff (T-14). */
export default async function AdminPage() {
  await requireStaff();
}
