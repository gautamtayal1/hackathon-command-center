import { redirect } from "next/navigation";

/**
 * Judge invite links point here. Scoring now lives on the round routes, so this
 * only forwards; the round pages resolve the active hackathon themselves.
 */
export default async function JudgeHackathonPage() {
  redirect("/round1");
}
