import { ScreenRefresh } from "@/components/judging/screen-refresh";
import { getCurrentHackathon, getFinalists } from "@/lib/rounds";

export const dynamic = "force-dynamic";

export default async function FinalistsScreen() {
  const hackathon = await getCurrentHackathon();
  const finalists = await getFinalists(hackathon.id);

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-[#f4f4f4] sm:px-10">
      <ScreenRefresh />
      <div className="mx-auto w-full max-w-[1600px]">
        <header className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-lg font-semibold text-[#9b9b9b]">
              {hackathon.name} / Round 2
            </p>
            <h1 className="mt-2 text-6xl font-semibold tracking-[-0.045em] text-white">
              Finalists
            </h1>
            <p className="mt-3 text-lg font-medium text-[#9b9b9b]">
              One team per judge, each the highest scorer on their roster.
            </p>
          </div>
          <p className="rounded-[20px] border border-[#303030] px-5 py-3 text-lg font-semibold text-[#b4b4b4]">
            {finalists.length} through
          </p>
        </header>

        {finalists.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {finalists.map((finalist, index) => (
              <section
                key={finalist.id}
                className="rounded-[24px] border border-[#303030] bg-[#212121] p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="text-5xl font-semibold tracking-[-0.05em] text-[#3a3a3a]">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <p className="rounded-[16px] bg-black px-4 py-2 text-right">
                    <span className="block text-xs font-semibold text-[#8f8f8f]">
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
                <p className="mt-2 text-sm font-medium leading-6 text-[#b4b4b4]">
                  {finalist.participantsFullName}
                </p>
                <p className="mt-4 border-t border-[#303030] pt-4 text-sm font-semibold text-[#9b9b9b]">
                  Promoted by {finalist.promotedByJudge}
                </p>
              </section>
            ))}
          </div>
        ) : (
          <p className="rounded-[24px] border border-[#303030] bg-[#212121] p-8 text-xl font-medium text-[#b4b4b4]">
            Waiting on round 1 scores. Each judge&apos;s top team appears here as
            soon as they score it.
          </p>
        )}
      </div>
    </main>
  );
}
