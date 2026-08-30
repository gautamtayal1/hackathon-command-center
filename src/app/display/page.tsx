import { UsersRound } from "lucide-react";
import { AutoRefresh } from "@/app/display/auto-refresh";
import { AccessDeniedError, getAdminContext } from "@/lib/auth";
import { ensureApplicationAssignments, getActiveHackathon } from "@/lib/tasks";
import { prisma } from "@/lib/prisma";
import { Wordmark } from "@/components/brand/wordmark";

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

  const groupCards = groups.map((group) => ({
    id: group.id,
    name: group.name,
    judges: group.judges.map((judge) => judge.name),
    teams: group.assignments.map((assignment) => ({
      id: assignment.application.id,
      teamName: assignment.application.teamName,
    })),
  }));

  if (!groupCards.length) {
    return (
      <DisplayMessage
        title="No groups yet"
        body="Add judges and generate groups in the command center to populate this screen."
      />
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-[#f4f4f4]">
      <AutoRefresh />
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Wordmark size="sm" />
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            {hackathon.name}
          </h1>
          <p className="mt-2 text-lg font-medium text-[#9b9b9b]">
            Team allocations by group
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#303030] px-4 py-2 text-base font-semibold text-[#b4b4b4]">
          <UsersRound className="size-5" aria-hidden="true" />
          {groupCards.length} groups
        </span>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groupCards.map((group) => (
          <article
            key={group.id}
            className="flex flex-col rounded-[24px] border border-[#303030] bg-[#161616] p-6"
          >
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
              {group.name}
            </h2>
            {group.judges.length ? (
              <p className="mt-2 text-base font-medium text-[#7ad17a]">
                {group.judges.join(" · ")}
              </p>
            ) : null}

            <div className="mt-5 border-t border-[#2a2a2a] pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#8f8f8f]">
                Teams ({group.teams.length})
              </p>
              {group.teams.length ? (
                <ul className="space-y-2">
                  {group.teams.map((team, index) => (
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
                  No teams allocated yet
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
