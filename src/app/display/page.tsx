import { UsersRound } from "lucide-react";
import { AccessDeniedError, getAdminContext } from "@/lib/auth";
import { ensureApplicationAssignments, getActiveHackathon } from "@/lib/tasks";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DisplayPage() {
  let workspaceId: string;

  try {
    const context = await getAdminContext();
    workspaceId = context.workspace.id;
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return <DisplayMessage title="No admin access" />;
    }
    throw error;
  }

  const hackathon = await getActiveHackathon(workspaceId);
  await ensureApplicationAssignments(hackathon.id);

  const groups = await prisma.judgeGroup.findMany({
    where: { hackathonId: hackathon.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      judges: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, name: true },
      },
      assignments: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: { application: { select: { id: true, teamName: true } } },
      },
    },
  });

  // Flatten to one card per judge, each showing the teams assigned to that
  // judge's group.
  const judgeCards = groups.flatMap((group) =>
    group.judges.map((judge) => ({
      id: judge.id,
      name: judge.name,
      groupName: group.name,
      teams: group.assignments.map((assignment) => ({
        id: assignment.application.id,
        teamName: assignment.application.teamName,
      })),
    })),
  );

  if (!judgeCards.length) {
    return (
      <DisplayMessage
        title="No judges assigned yet"
        body="Add judges and generate groups in the command center to populate this screen."
      />
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-[#f4f4f4]">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9b9b9b]">
            Draki
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            {hackathon.name}
          </h1>
          <p className="mt-2 text-lg font-medium text-[#9b9b9b]">
            Judge assignments
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#303030] px-4 py-2 text-base font-semibold text-[#b4b4b4]">
          <UsersRound className="size-5" aria-hidden="true" />
          {judgeCards.length} judges
        </span>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {judgeCards.map((judge) => (
          <article
            key={judge.id}
            className="flex flex-col rounded-[24px] border border-[#303030] bg-[#161616] p-6"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#7ad17a]">
              {judge.groupName}
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
              {judge.name}
            </h2>

            <div className="mt-5 border-t border-[#2a2a2a] pt-4">
              {judge.teams.length ? (
                <ul className="space-y-2">
                  {judge.teams.map((team, index) => (
                    <li
                      key={team.id}
                      className="flex items-center gap-3 text-xl font-medium text-[#ededed]"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#212121] text-sm font-semibold text-[#9b9b9b]">
                        {index + 1}
                      </span>
                      <span className="truncate">{team.teamName}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-lg font-medium text-[#6f6f6f]">
                  No teams assigned yet
                </p>
              )}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function DisplayMessage({ title, body }: { title: string; body?: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-black px-6 text-center text-[#f4f4f4]">
      <div className="max-w-[520px]">
        <h1 className="text-4xl font-semibold tracking-[-0.04em] text-white">
          {title}
        </h1>
        {body ? (
          <p className="mt-3 text-lg font-medium leading-7 text-[#9b9b9b]">
            {body}
          </p>
        ) : null}
      </div>
    </main>
  );
}
