import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getJudgingApplicationsForHackathon } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live ranking",
  description: "Public live hackathon ranking powered by Supabase Realtime.",
};

type RankingPageProps = {
  params: Promise<{ hackathonId: string }>;
};

export default async function HackathonRankingPage({ params }: RankingPageProps) {
  const { hackathonId } = await params;
  const hackathon = await prisma.hackathon.findUnique({
    where: { id: hackathonId },
    select: { id: true, name: true },
  });

  if (!hackathon) {
    notFound();
  }

  const applications = await getJudgingApplicationsForHackathon(hackathon.id);
  const groups = groupApplications(applications);

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-[#f4f4f4] sm:px-8 sm:py-12">
      <section className="mx-auto w-full max-w-[1180px]">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#9b9b9b]">
              <Trophy className="size-4" aria-hidden="true" />
              Live ranking
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em] text-white sm:text-6xl">
              {hackathon.name}
            </h1>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-[#212121] px-4 py-2 text-sm font-semibold text-[#b4b4b4]">
            <span className="size-2 rounded-full bg-[#15b5b0] shadow-[0_0_16px_rgba(21,181,176,0.8)]" />
            Live · {applications.length} teams
          </div>
        </header>

        {applications.length ? (
          <div className="space-y-6">
            {groups.map((group) => (
              <section
                key={group.id}
                className="overflow-hidden rounded-[28px] bg-[#2f2f2f] p-3 shadow-[0_30px_100px_rgba(0,0,0,0.45)]"
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8f8f8f]">
                      Judging group
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-white">
                      {group.name}
                    </h2>
                  </div>
                  <span className="rounded-full bg-[#212121] px-3 py-1.5 text-xs font-semibold text-[#b4b4b4]">
                    {group.applications.length} teams
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-left">
                    <thead>
                      <tr className="text-xs font-medium uppercase tracking-[0.08em] text-[#8f8f8f]">
                        <th className="w-16 px-4 py-2">Place</th>
                        <th className="px-4 py-2">Startup</th>
                        <th className="px-4 py-2">Votes</th>
                        <th className="px-4 py-2">Score</th>
                        <th className="px-4 py-2">Pitch</th>
                        <th className="px-4 py-2">Idea</th>
                        <th className="px-4 py-2">UI/UX</th>
                        <th className="px-4 py-2">Execution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.applications.map((application, index) => (
                        <tr
                          key={application.id}
                          data-ranking-team={application.teamName}
                          data-ranking-group={group.name}
                          className="text-sm font-medium text-[#f4f4f4]"
                        >
                          <td className="rounded-l-[22px] bg-[#212121] px-4 py-4 text-lg font-semibold text-white">
                            {formatPlace(index + 1)}
                          </td>
                          <td className="max-w-[260px] bg-[#212121] px-4 py-4">
                            <span className="block truncate text-base font-semibold text-white">
                              {application.teamName}
                            </span>
                          </td>
                          <td className="bg-[#212121] px-4 py-4 text-[#b4b4b4]">
                            {application.scoreCount}
                          </td>
                          <td className="bg-[#212121] px-4 py-4 text-xl font-semibold text-white">
                            {formatScore(application.averageScore)}
                          </td>
                          <td className="bg-[#212121] px-4 py-4 text-[#d6d6d6]">
                            {formatScore(application.pitchAverage)}
                          </td>
                          <td className="bg-[#212121] px-4 py-4 text-[#d6d6d6]">
                            {formatScore(application.potentialAverage)}
                          </td>
                          <td className="bg-[#212121] px-4 py-4 text-[#d6d6d6]">
                            {formatScore(application.uiUxAverage)}
                          </td>
                          <td className="rounded-r-[22px] bg-[#212121] px-4 py-4 text-[#d6d6d6]">
                            {formatScore(application.executionAverage)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="rounded-[28px] border border-[#303030] bg-[#212121] px-6 py-16 text-center">
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">
              No applications yet
            </h2>
            <p className="mt-2 text-sm font-medium text-[#9b9b9b]">
              The ranking will update automatically as teams and scores arrive.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function groupApplications(
  applications: Awaited<ReturnType<typeof getJudgingApplicationsForHackathon>>,
) {
  const groups = new Map<
    string,
    {
      id: string;
      name: string;
      applications: typeof applications;
    }
  >();

  for (const application of applications) {
    const id = application.groupId ?? "unassigned";
    const group = groups.get(id) ?? {
      id,
      name: application.groupName ?? "Unassigned",
      applications: [],
    };

    group.applications.push(application);
    groups.set(id, group);
  }

  return [...groups.values()].toSorted((a, b) => {
    if (a.id === "unassigned") return 1;
    if (b.id === "unassigned") return -1;
    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });
}

function formatPlace(place: number) {
  return String(place).padStart(2, "0");
}

function formatScore(score: number | null) {
  if (score === null) {
    return "–";
  }

  return score.toFixed(score % 1 === 0 ? 0 : 1);
}
