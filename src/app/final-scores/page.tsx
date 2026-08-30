import { ScreenRefresh } from "@/components/judging/screen-refresh";
import { MAX_TOTAL_SCORE, SCORE_CRITERIA } from "@/lib/judging";
import { getCurrentHackathon, getFinalScores } from "@/lib/rounds";
import { BrandLockup } from "@/components/brand/brand-lockup";

export const dynamic = "force-dynamic";

export default async function FinalScoresScreen() {
  const hackathon = await getCurrentHackathon();
  const results = await getFinalScores(hackathon.id);
  const scored = results.filter((result) => result.average !== null);

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-ink sm:px-10">
      <ScreenRefresh />
      <div className="mx-auto w-full max-w-[1400px]">
        <header className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <BrandLockup size="lg" className="mb-6" />
            <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase">
              {hackathon.name} · Round 2
            </p>
            <h1 className="mt-2 text-6xl font-semibold tracking-[-0.045em] text-accent">
              Final scores
            </h1>
            <p className="mt-3 text-lg font-medium text-ink-3">
              Average across every judge, out of {MAX_TOTAL_SCORE}.
            </p>
          </div>
          <p className="rounded-[20px] border border-ok-line bg-ok-soft px-5 py-3 text-lg font-semibold text-ok">
            {scored.length} of {results.length} scored
          </p>
        </header>

        {results.length ? (
          <ol className="space-y-3">
            {results.map((result, index) => {
              const isLeader = index === 0 && result.average !== null;

              return (
              <li
                key={result.id}
                className={`brand-card relative overflow-hidden rounded-[24px] border p-6 ${
                  isLeader
                    ? "border-accent-line bg-accent-soft"
                    : "border-edge bg-p-card"
                }`}
              >
                {isLeader ? (
                  <span
                    className="absolute inset-y-0 left-0 w-[3px] bg-accent"
                    aria-hidden="true"
                  />
                ) : null}
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-center gap-5">
                    <span
                      className={`text-5xl font-semibold tracking-[-0.05em] ${
                        isLeader ? "text-accent" : "text-edge-strong"
                      }`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-3xl font-semibold tracking-[-0.04em] text-white">
                        {result.teamName}
                      </span>
                      <span className="mt-1 block truncate text-sm font-medium text-ink-3">
                        {result.participantsFullName}
                      </span>
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    {SCORE_CRITERIA.map((criterion) => (
                      <span
                        key={criterion.name}
                        className="rounded-[16px] border border-edge bg-surface px-4 py-2 text-center"
                      >
                        <span className="block text-xs font-semibold text-ink-4">
                          {criterion.label}
                        </span>
                        <span className="mt-1 block text-lg font-semibold text-white">
                          {formatScore(result.criteriaAverages[criterion.name])}
                        </span>
                      </span>
                    ))}
                    <span className="brand-btn rounded-[16px] px-5 py-2 text-center">
                      <span className="block text-xs font-semibold text-btn-fg/75">
                        Average
                      </span>
                      <span className="mt-1 block text-3xl font-semibold tracking-[-0.04em]">
                        {formatScore(result.average)}
                      </span>
                    </span>
                  </div>
                </div>

                {result.judgeScores.length ? (
                  <div className="mt-5 flex flex-wrap gap-2 border-t border-edge pt-4">
                    {result.judgeScores.map((judgeScore) => (
                      <span
                        key={judgeScore.judgeName}
                        className="rounded-full border border-edge bg-surface px-4 py-2 text-sm font-semibold text-ink-3"
                      >
                        {judgeScore.judgeName}
                        <span className="ml-2 text-white">
                          {judgeScore.total}
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 border-t border-edge pt-4 text-sm font-medium text-ink-4">
                    No round 2 scores yet.
                  </p>
                )}
              </li>
              );
            })}
          </ol>
        ) : (
          <p className="rounded-[24px] border border-edge bg-p-card p-8 text-xl font-medium text-ink-3">
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
