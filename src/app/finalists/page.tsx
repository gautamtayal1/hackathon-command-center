import { Mic } from "lucide-react";
import { AutoRefresh } from "@/app/display/auto-refresh";
import { AccessDeniedError, getAdminContext } from "@/lib/auth";
import { getActiveHackathon } from "@/lib/tasks";
import { prisma } from "@/lib/prisma";
import { Wordmark } from "@/components/brand/wordmark";

export const dynamic = "force-dynamic";

/**
 * Stable, deterministic "random" ordering. Hashing the application id means the
 * pitch sequence is drawn once and never reshuffles across the 15s auto-refresh
 * — everyone always sees the same order.
 */
function seedFromId(id: string) {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export default async function FinalistsPage() {
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

  const finalists = await prisma.application.findMany({
    where: { hackathonId: hackathon.id, isFinalist: true },
    select: { id: true, teamName: true, participantsFullName: true },
  });

  const order = finalists
    .map((finalist) => ({ ...finalist, seed: seedFromId(finalist.id) }))
    .sort((a, b) => (a.seed !== b.seed ? a.seed - b.seed : a.id.localeCompare(b.id)));

  if (!order.length) {
    return (
      <DisplayMessage
        title="No finalists yet"
        body="Finalists are locked in automatically once enough judges submit their round-1 scores."
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
            Finalists — pitch order
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#303030] px-4 py-2 text-base font-semibold text-[#b4b4b4]">
          <Mic className="size-5" aria-hidden="true" />
          {order.length} finalists
        </span>
      </header>

      <ol className="mx-auto flex max-w-[900px] flex-col gap-4">
        {order.map((finalist, index) => (
          <li
            key={finalist.id}
            className="flex items-center gap-5 rounded-[24px] border border-[#303030] bg-[#161616] p-6"
          >
            <span className="grid size-16 shrink-0 place-items-center rounded-full bg-[#7ad17a] text-3xl font-semibold text-black sm:size-20 sm:text-4xl">
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="truncate text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
                {finalist.teamName}
              </p>
              {finalist.participantsFullName ? (
                <p className="mt-1 truncate text-lg font-medium text-[#9b9b9b]">
                  {finalist.participantsFullName}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
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
