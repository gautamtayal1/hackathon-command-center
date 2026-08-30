import { ScreenRefresh } from "@/components/judging/screen-refresh";
import { getCurrentHackathon, getFinalists } from "@/lib/rounds";

export const dynamic = "force-dynamic";

export default async function FinalistsScreen() {
  const hackathon = await getCurrentHackathon();
  const finalists = await getFinalists(hackathon.id);

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-ink sm:px-10">
      <ScreenRefresh />
      <div className="mx-auto w-full max-w-[1600px]">
        <header className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-lg font-semibold text-ink-3">
              {hackathon.name} / Round 2
            </p>
            <h1 className="mt-2 text-6xl font-semibold tracking-[-0.045em] text-white">
              Finalists
            </h1>
            <p className="mt-3 text-lg font-medium text-ink-3">
              One team per judge, each the highest scorer on their roster.
            </p>
          </div>
          <p className="rounded-[20px] border border-edge px-5 py-3 text-lg font-semibold text-ink-3">
            {finalists.length} through
          </p>
        </header>

        {finalists.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {finalists.map((finalist, index) => (
              <section
                key={finalist.id}
                className="rounded-[24px] border border-edge bg-p-card p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="text-5xl font-semibold tracking-[-0.05em] text-edge-strong">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <p className="rounded-[16px] bg-background px-4 py-2 text-right">
                    <span className="block text-xs font-semibold text-ink-4">
                      Round 1
                    </span>
                    <span className="mt-1 block text-2xl font-semibold tracking-[-0.04em] text-white">
                      {finalist.roundOneTotal}
                    </span>
                  </p>
                </div>

                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">
                  {finalist.teamName}
                </h2>
                <p className="mt-2 text-sm font-medium leading-6 text-ink-3">
                  {finalist.participantsFullName}
                </p>
                <p className="mt-4 border-t border-edge pt-4 text-sm font-semibold text-ink-3">
                  Promoted by {finalist.promotedByJudge}
                </p>
              </section>
            ))}
          </div>
        ) : (
          <p className="rounded-[24px] border border-edge bg-p-card p-8 text-xl font-medium text-ink-3">
            Waiting on round 1 scores. Each judge&apos;s top team appears here as
            soon as they score it.
          </p>
        )}
      </div>
    </main>
  );
}
