import { ScreenRefresh } from "@/components/judging/screen-refresh";
import { MAX_TOTAL_SCORE, SCORE_CRITERIA } from "@/lib/judging";
import { getCurrentHackathon, getFinalScores } from "@/lib/rounds";

export const dynamic = "force-dynamic";

export default async function FinalScoresScreen() {
  const hackathon = await getCurrentHackathon();
  const results = await getFinalScores(hackathon.id);
  const scored = results.filter((result) => result.average !== null);

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-[#f4f4f4] sm:px-10">
      <ScreenRefresh />
      <div className="mx-auto w-full max-w-[1400px]">
        <header className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-lg font-semibold text-[#9b9b9b]">
              {hackathon.name} / Round 2
            </p>
            <h1 className="mt-2 text-6xl font-semibold tracking-[-0.045em] text-white">
              Final scores
            </h1>
            <p className="mt-3 text-lg font-medium text-[#9b9b9b]">
              Average across every judge, out of {MAX_TOTAL_SCORE}.
            </p>
          </div>
          <p className="rounded-[20px] border border-[#303030] px-5 py-3 text-lg font-semibold text-[#b4b4b4]">
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
                    ? "border-[#15b5b0] bg-[#10201f]"
                    : "border-[#303030] bg-[#212121]"
                }`}
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-center gap-5">
                    <span className="text-5xl font-semibold tracking-[-0.05em] text-[#3a3a3a]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-3xl font-semibold tracking-[-0.04em] text-white">
                        {result.teamName}
                      </span>
                      <span className="mt-1 block truncate text-sm font-medium text-[#9b9b9b]">
                        {result.participantsFullName}
                      </span>
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    {SCORE_CRITERIA.map((criterion) => (
                      <span
                        key={criterion.name}
                        className="rounded-[16px] bg-black px-4 py-2 text-center"
                      >
                        <span className="block text-xs font-semibold text-[#8f8f8f]">
                          {criterion.label}
                        </span>
                        <span className="mt-1 block text-lg font-semibold text-white">
                          {formatScore(result.criteriaAverages[criterion.name])}
                        </span>
                      </span>
                    ))}
                    <span className="rounded-[16px] bg-white px-5 py-2 text-center text-black">
                      <span className="block text-xs font-semibold text-[#5a5a5a]">
                        Average
                      </span>
                      <span className="mt-1 block text-3xl font-semibold tracking-[-0.04em]">
                        {formatScore(result.average)}
                      </span>
                    </span>
                  </div>
                </div>

                {result.judgeScores.length ? (
                  <div className="mt-5 flex flex-wrap gap-2 border-t border-[#303030] pt-4">
                    {result.judgeScores.map((judgeScore) => (
                      <span
                        key={judgeScore.judgeName}
                        className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-[#b4b4b4]"
                      >
                        {judgeScore.judgeName}
                        <span className="ml-2 text-white">
                          {judgeScore.total}
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 border-t border-[#303030] pt-4 text-sm font-medium text-[#8f8f8f]">
                    No round 2 scores yet.
                  </p>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-[24px] border border-[#303030] bg-[#212121] p-8 text-xl font-medium text-[#b4b4b4]">
            Nothing to show until round 1 produces finalists.
          </p>
        )}
      </div>
    </main>
  );
}

function formatScore(value: number | null) {
  return value === null ? "-" : value.toFixed(1);
}
