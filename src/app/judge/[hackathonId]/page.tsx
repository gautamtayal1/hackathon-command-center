import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireJudgeForHackathon } from "@/lib/auth";
import { upsertJudgeScore } from "@/lib/actions";
import { Wordmark } from "@/components/brand/wordmark";
import { prisma } from "@/lib/prisma";
import { JudgeWorkspace } from "@/app/judge/[hackathonId]/judge-workspace";
import { ensureGroupJudgingRound } from "@/lib/judging";

export const dynamic = "force-dynamic";

type JudgeHackathonPageProps = {
  params: Promise<{
    hackathonId: string;
  }>;
  searchParams: Promise<{
    round?: string;
  }>;
};

export default async function JudgeHackathonPage({
  params,
  searchParams,
}: JudgeHackathonPageProps) {
  const { hackathonId } = await params;
  const { round } = await searchParams;
  const { judge } = await requireJudgeForHackathon(hackathonId);
  const groupRound = await ensureGroupJudgingRound(hackathonId);
  const finalRound = await prisma.judgingRound.findFirst({
    where: { hackathonId, type: "FINAL", status: "OPEN" },
  });
  const activeRound = finalRound && round !== "group" ? finalRound : groupRound;
  const applications = activeRound.type === "FINAL"
    ? await prisma.application.findMany({
        where: {
          hackathonId,
          finalistSelection: { is: { finalRoundId: activeRound.id } },
        },
        include: {
          scores: {
            where: { judgeId: judge.id, roundId: activeRound.id },
            select: {
              score: true,
              pitchScore: true,
              potentialScore: true,
              uiUxScore: true,
              executionScore: true,
              note: true,
            },
          },
          assignment: {
            include: { group: { select: { name: true } } },
          },
        },
        orderBy: [
          { assignment: { group: { sortOrder: "asc" } } },
          { createdAt: "asc" },
        ],
      })
    : judge.groupId
    ? await prisma.application.findMany({
        where: {
          hackathonId,
          assignment: {
            is: {
              groupId: judge.groupId,
            },
          },
        },
        include: {
          scores: {
            where: { judgeId: judge.id, roundId: activeRound.id },
            select: {
              score: true,
              pitchScore: true,
              potentialScore: true,
              uiUxScore: true,
              executionScore: true,
              note: true,
            },
          },
          assignment: {
            include: {
              group: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: [{ assignment: { sortOrder: "asc" } }, { createdAt: "asc" }],
      })
    : [];
  const scoreAction = upsertJudgeScore.bind(null, hackathonId);

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-[#f4f4f4] sm:px-6">
      <section className="mx-auto w-full max-w-[920px]">
        <div className="mb-7 flex items-center justify-between gap-4">
          <Link
            href="/judge"
            className="inline-flex items-center gap-2 rounded-[20px] px-2 py-2 text-sm font-semibold text-[#b4b4b4] transition hover:bg-[#1f1f1f] hover:text-white"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Judges
          </Link>
          <Wordmark size="sm" label="Judges" />
        </div>

        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#9b9b9b]">
              Judging as {judge.name}
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-white">
              {judge.hackathon.name}
            </h1>
          </div>
          <p className="rounded-[20px] border border-[#303030] px-4 py-2 text-sm font-semibold text-[#b4b4b4]">
            {activeRound.type === "FINAL" ? "Final round" : "Group round"} ·{" "}
            {applications.length} applications
          </p>
        </div>

        {finalRound ? (
          <nav className="mb-5 flex gap-2" aria-label="Judging round">
            <Link
              href={`/judge/${hackathonId}?round=group`}
              className={`rounded-[20px] px-4 py-2 text-sm font-semibold transition ${
                activeRound.type === "GROUP"
                  ? "bg-[#f4f4f4] text-black"
                  : "bg-[#212121] text-[#b4b4b4] hover:text-white"
              }`}
            >
              Group round
            </Link>
            <Link
              href={`/judge/${hackathonId}?round=final`}
              className={`rounded-[20px] px-4 py-2 text-sm font-semibold transition ${
                activeRound.type === "FINAL"
                  ? "bg-[#15b5b0] text-black"
                  : "bg-[#212121] text-[#b4b4b4] hover:text-white"
              }`}
            >
              Final round · all finalists
            </Link>
          </nav>
        ) : null}

        <JudgeWorkspace
          applications={applications.map((application) => ({
            id: application.id,
            teamName: application.teamName,
            participantsFullName: application.participantsFullName,
            githubRepoUrl: application.githubRepoUrl,
            builtDescription: application.builtDescription,
            groupName: application.assignment?.group.name ?? null,
            score: application.scores[0] ?? null,
          }))}
          scoreAction={scoreAction}
          roundLabel={activeRound.type === "FINAL" ? "Final" : "Group round"}
          roundType={activeRound.type}
        />
      </section>
    </main>
  );
}
