import type { Metadata } from "next";
import { Wordmark } from "@/components/brand/wordmark";
import { ScreenRefresh } from "@/components/screens/screen-refresh";
import { getFinalists } from "@/lib/screens";
import { getActiveHackathon } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Finalists",
  description: "The teams that came through the group round.",
};

export default async function FinalistsScreen() {
  const hackathon = await getActiveHackathon();
  const finalists = await getFinalists(hackathon.id);

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-[#f4f4f4] sm:px-10">
      <ScreenRefresh />
      <div className="mx-auto w-full max-w-[1600px]">
        <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Wordmark size="sm" label="Hackathons" />
            <h1 className="mt-4 text-6xl font-semibold tracking-[-0.045em] text-white">
              Finalists
            </h1>
            <p className="mt-3 text-lg font-medium text-[#9b9b9b]">
              One team per judging group, top of their round 1 scores.
            </p>
          </div>
          <p className="rounded-[20px] border border-[#26262a] bg-[#111114] px-5 py-3 text-lg font-semibold text-[#b4b4b4]">
            {finalists.length} through
          </p>
        </header>

        {finalists.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {finalists.map((finalist, index) => (
              <section
                key={finalist.id}
                className="rounded-[24px] border border-[#26262a] bg-[#111114] p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="text-5xl font-semibold tracking-[-0.05em] text-[#2a2a30]">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <p className="rounded-full border border-[#26262a] bg-black px-3 py-1.5 text-xs font-semibold tracking-[0.08em] text-[#6d78a6] uppercase">
                    {finalist.groupName ?? "No group"}
                  </p>
                </div>

                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">
                  {finalist.teamName}
                </h2>
                <p className="mt-2 text-sm font-medium leading-6 text-[#b4b4b4]">
                  {finalist.participantsFullName}
                </p>
                {finalist.judgeNames.length ? (
                  <p className="mt-4 border-t border-[#26262a] pt-4 text-sm font-semibold text-[#9b9b9b]">
                    Put through by {finalist.judgeNames.join(" & ")}
                  </p>
                ) : null}
              </section>
            ))}
          </div>
        ) : (
          <p className="rounded-[24px] border border-[#26262a] bg-[#111114] p-8 text-xl font-medium text-[#b4b4b4]">
            The final round has not started yet. Finalists appear here once an
            organizer opens it from the board.
          </p>
        )}
      </div>
    </main>
  );
}
