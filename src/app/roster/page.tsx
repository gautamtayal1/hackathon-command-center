import type { Metadata } from "next";
import { Wordmark } from "@/components/brand/wordmark";
import { ScreenRefresh } from "@/components/screens/screen-refresh";
import { getRoster } from "@/lib/screens";
import { getActiveHackathon } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Judging roster",
  description: "Which judge each team pitches to in the group round.",
};

export default async function RosterScreen() {
  const hackathon = await getActiveHackathon();
  const roster = await getRoster(hackathon.id);
  const teamCount = roster.reduce((total, group) => total + group.teams.length, 0);

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-[#f4f4f4] sm:px-10">
      <ScreenRefresh />
      <div className="mx-auto w-full max-w-[1600px]">
        <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Wordmark size="sm" label="Hackathons" />
            <h1 className="mt-4 text-6xl font-semibold tracking-[-0.045em] text-white">
              Who judges you
            </h1>
            <p className="mt-3 text-lg font-medium text-[#9b9b9b]">
              {hackathon.name} · group round
            </p>
          </div>
          <p className="rounded-[20px] border border-[#26262a] bg-[#111114] px-5 py-3 text-lg font-semibold text-[#b4b4b4]">
            {roster.length} groups · {teamCount} teams
          </p>
        </header>

        {roster.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {roster.map((group) => (
              <section
                key={group.id}
                className="rounded-[24px] border border-[#26262a] bg-[#111114] p-6"
              >
                <p className="text-sm font-semibold text-[#6d78a6]">
                  {group.name}
                </p>
                <h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-white">
                  {group.judgeNames.length
                    ? group.judgeNames.join(" & ")
                    : "No judge yet"}
                </h2>

                {group.teams.length ? (
                  <ol className="mt-5 space-y-2">
                    {group.teams.map((team, index) => (
                      <li
                        key={team.id}
                        className="rounded-[18px] bg-black px-4 py-3"
                      >
                        <p className="text-xl font-semibold tracking-[-0.03em] text-white">
                          <span className="mr-2 text-[#4f76ff]">
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
          <p className="rounded-[24px] border border-[#26262a] bg-[#111114] p-8 text-xl font-medium text-[#b4b4b4]">
            No judging groups yet.
          </p>
        )}
      </div>
    </main>
  );
}
