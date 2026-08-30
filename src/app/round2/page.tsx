import { redirect } from "next/navigation";
import { getActiveHackathon } from "@/lib/tasks";

export const dynamic = "force-dynamic";

/** Same as /round1, but lands on the final round. */
export default async function RoundTwoPage() {
  const hackathon = await getActiveHackathon();

  redirect(`/judge/${hackathon.id}?round=final`);
}
