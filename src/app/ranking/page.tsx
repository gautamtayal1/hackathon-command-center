import { redirect } from "next/navigation";
import { getActiveHackathon } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  const hackathon = await getActiveHackathon();
  redirect(`/ranking/${hackathon.id}`);
}
