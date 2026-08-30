import { CheckCircle2 } from "lucide-react";
import { ScreenRefresh } from "@/components/judging/screen-refresh";
import { getCurrentHackathon, getRoster } from "@/lib/rounds";

export const dynamic = "force-dynamic";

export default async function RosterScreen() {
  const hackathon = await getCurrentHackathon();
  const roster = await getRoster(hackathon.id);
  const teamCount = roster.reduce((total, judge) => total + judge.teams.length, 0);

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-[#f4f4f4] sm:px-10">
      <ScreenRefresh />
      <div className="mx-auto w-full max-w-[1600px]">
        <header className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-lg font-semibold text-[#9b9b9b]">
              {hackathon.name} / Round 1
            </p>
            <h1 className="mt-2 text-6xl font-semibold tracking-[-0.045em] text-white">
              Who judges you
            </h1>
          </div>
          <p className="rounded-[20px] border border-[#303030] px-5 py-3 text-lg font-semibold text-[#b4b4b4]">
            {roster.length} judges / {teamCount} teams
          </p>
        </header>

        {roster.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {roster.map((judge) => (
              <section
                key={judge.id}
                className="rounded-[24px] border border-[#303030] bg-[#212121] p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#8f8f8f]">
                      {judge.groupName ?? "No group"}
                    </p>
                    <h2 className="mt-1 truncate text-3xl font-semibold tracking-[-0.04em] text-white">
                      {judge.name}
                    </h2>
                  </div>
                  {judge.submittedRoundOne ? (
                    <CheckCircle2
                      className="mt-1 size-6 shrink-0 text-[#15b5b0]"
                      aria-label="Round 1 submitted"
                    />
                  ) : null}
                </div>

                {judge.teams.length ? (
                  <ol className="mt-5 space-y-2">
                    {judge.teams.map((team, index) => (
                      <li
                        key={team.id}
                        className="rounded-[18px] bg-black px-4 py-3"
                      >
                        <p className="text-xl font-semibold tracking-[-0.03em] text-white">
                          <span className="mr-2 text-[#8f8f8f]">
                            {index + 1}.
                          </span>
                          {team.teamName}
                        </p>
                        <p className="mt-1 truncate text-sm font-medium text-[#9b9b9b]">
                          {team.participantsFullName}
                        </p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-5 rounded-[18px] bg-black px-4 py-3 text-sm font-medium text-[#9b9b9b]">
                    No teams assigned yet.
                  </p>
                )}
              </section>
            ))}
          </div>
        ) : (
          <p className="rounded-[24px] border border-[#303030] bg-[#212121] p-8 text-xl font-medium text-[#b4b4b4]">
            No judges added yet.
          </p>
        )}
      </div>
    </main>
  );
}
