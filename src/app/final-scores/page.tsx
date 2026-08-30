import type { Metadata } from "next";
import { Wordmark } from "@/components/brand/wordmark";
import { ScreenRefresh } from "@/components/screens/screen-refresh";
import { getFinalScores } from "@/lib/screens";
import { getActiveHackathon } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Final scores",
  description: "Average final-round score for every finalist.",
};

const MAX_TOTAL = 40;

export default async function FinalScoresScreen() {
  const hackathon = await getActiveHackathon();
  const results = await getFinalScores(hackathon.id);
  const scored = results.filter((result) => result.average !== null);

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-[#f4f4f4] sm:px-10">
      <ScreenRefresh />
      <div className="mx-auto w-full max-w-[1400px]">
        <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Wordmark size="sm" label="Hackathons" />
            <h1 className="mt-4 text-6xl font-semibold tracking-[-0.045em] text-white">
              Final scores
            </h1>
            <p className="mt-3 text-lg font-medium text-[#9b9b9b]">
              Average across every judge who scored, out of {MAX_TOTAL}.
            </p>
          </div>
          <p className="rounded-[20px] border border-[#26262a] bg-[#111114] px-5 py-3 text-lg font-semibold text-[#b4b4b4]">
            {scored.length} of {results.length} scored
          </p>
        </header>

        {results.length ? (
          <ol className="space-y-3">
            {results.map((result, index) => (
              <li
                key={result.id}
                className={`rounded-[24px] border p-6 ${
                  index === 0 && result.average !== null
                    ? "border-[#1d4dff] bg-[#0b1030]"
                    : "border-[#26262a] bg-[#111114]"
                }`}
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-center gap-5">
                    <span className="text-5xl font-semibold tracking-[-0.05em] text-[#2a2a30]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-3xl font-semibold tracking-[-0.04em] text-white">
                        {result.teamName}
                      </span>
                      <span className="mt-1 block truncate text-sm font-medium text-[#9b9b9b]">
                        {result.groupName ? `${result.groupName} · ` : ""}
                        {result.participantsFullName}
                      </span>
                    </span>
                  </div>

                  <span className="shrink-0 rounded-[16px] bg-white px-6 py-3 text-center text-black">
                    <span className="block text-xs font-semibold tracking-[0.08em] text-[#5a5a5a] uppercase">
                      Average
                    </span>
                    <span className="mt-1 block text-4xl font-semibold tracking-[-0.04em]">
                      {result.average === null ? "-" : result.average.toFixed(1)}
                    </span>
                  </span>
                </div>

                {result.judgeScores.length ? (
                  <div className="mt-5 flex flex-wrap gap-2 border-t border-[#26262a] pt-4">
                    {result.judgeScores.map((judgeScore) => (
                      <span
                        key={judgeScore.judgeName}
                        className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-[#9b9b9b]"
                      >
                        {judgeScore.judgeName}
                        <span className="ml-2 text-white">
                          {judgeScore.total}
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 border-t border-[#26262a] pt-4 text-sm font-medium text-[#6f6f6f]">
                    No final-round scores yet.
                  </p>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-[24px] border border-[#26262a] bg-[#111114] p-8 text-xl font-medium text-[#b4b4b4]">
            Nothing to show until the final round starts.
          </p>
        )}
      </div>
    </main>
  );
}
