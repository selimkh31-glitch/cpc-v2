import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";

/** L'intention Clubs est la première découverte métier réelle du lot P2-B. */
export default async function ExplorePage() {
  await requireOnboardedUser("/explore");
  redirect("/explore/clubs");
}
