import { requireOnboardedUser } from "@/lib/auth/session";

/** Shell authentifié (ADR-0005). Garde serveur ; la navigation 3 onglets arrive en S-1.7. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireOnboardedUser("/home");
  return <>{children}</>;
}
