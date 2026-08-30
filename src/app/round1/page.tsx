import { redirect } from "next/navigation";
import { getActiveHackathon } from "@/lib/tasks";

export const dynamic = "force-dynamic";

/**
 * Judges are told to go to /round1, so this resolves the live hackathon and
 * hands off to the existing judging screen with the group round selected.
 */
export default async function RoundOnePage() {
  const hackathon = await getActiveHackathon();

  redirect(`/judge/${hackathon.id}?round=group`);
}
