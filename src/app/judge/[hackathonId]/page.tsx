import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireJudgeForHackathon } from "@/lib/auth";
import { submitJudgeScores } from "@/lib/actions";
import { ROUND1_SUBMISSIONS_TO_ADVANCE } from "@/lib/board";
import { prisma } from "@/lib/prisma";
import { JudgeWorkspace } from "@/app/judge/[hackathonId]/judge-workspace";

export const dynamic = "force-dynamic";

type JudgeHackathonPageProps = {
  params: Promise<{
    hackathonId: string;
  }>;
};

function groupNameOf(application: {
  assignment?: { group: { name: string } } | null;
  [key: string]: unknown;
}) {
  return application.assignment?.group.name ?? null;
}

const scoreSelect = {
  score: true,
  pitchScore: true,
  iterationScore: true,
  uiUxScore: true,
  executionScore: true,
} as const;

export default async function JudgeHackathonPage({
  params,
}: JudgeHackathonPageProps) {
  const { hackathonId } = await params;
  const { judge } = await requireJudgeForHackathon(hackathonId);
  const round = judge.hackathon.currentRound >= 2 ? 2 : 1;

  const applications =
    round === 2
      ? // Round 2: every judge scores the finalist teams.
        await prisma.application.findMany({
          where: { hackathonId, isFinalist: true },
          include: {
            scores: {
              where: { judgeId: judge.id, round: 2 },
              select: scoreSelect,
            },
          },
          orderBy: [{ createdAt: "asc" }],
        })
      : // Round 1: score the projects assigned to your group.
        judge.groupId
        ? await prisma.application.findMany({
            where: {
              hackathonId,
              assignment: { is: { groupId: judge.groupId } },
            },
            include: {
              scores: {
                where: { judgeId: judge.id, round: 1 },
                select: scoreSelect,
              },
              assignment: {
                include: { group: { select: { name: true } } },
              },
            },
            orderBy: [
              { assignment: { sortOrder: "asc" } },
              { createdAt: "asc" },
            ],
          })
        : [];

  const submitAction = submitJudgeScores.bind(null, hackathonId);
  const alreadySubmitted = Boolean(
    round === 2 ? judge.round2SubmittedAt : judge.round1SubmittedAt,
  );
  const round1Submissions =
    round === 1
      ? await prisma.judge.count({
          where: { hackathonId, round1SubmittedAt: { not: null } },
        })
      : 0;

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-[#f4f4f4] sm:px-6">
      <section className="mx-auto w-full max-w-[920px]">
        <Link
          href="/judge"
          className="mb-7 inline-flex items-center gap-2 rounded-[20px] px-2 py-2 text-sm font-semibold text-[#b4b4b4] transition hover:bg-[#1f1f1f] hover:text-white"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Judges
        </Link>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#9b9b9b]">
              Judging as {judge.name}
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-white">
              {judge.hackathon.name}
            </h1>
          </div>
          <p className="rounded-[20px] border border-[#303030] px-4 py-2 text-sm font-semibold text-[#b4b4b4]">
            {applications.length} {round === 2 ? "finalists" : "teams"}
          </p>
        </div>

        <div
          className={`mb-8 rounded-[20px] border px-4 py-3 text-sm font-semibold ${
            round === 2
              ? "border-[#3a5f2a] bg-[#16220f] text-[#c7f0a9]"
              : "border-[#303030] bg-[#191919] text-[#d6d6d6]"
          }`}
        >
          {round === 2
            ? "Round 2 of 2 — Finals. Score every finalist team, then submit."
            : `Round 1 of 2 — Score the teams assigned to your group, then press Submit scores. The finals open once ${ROUND1_SUBMISSIONS_TO_ADVANCE} judges submit (${round1Submissions}/${ROUND1_SUBMISSIONS_TO_ADVANCE} so far).`}
        </div>

        <JudgeWorkspace
          round={round}
          alreadySubmitted={alreadySubmitted}
          storagePrefix={`draki:scores:${judge.id}:${hackathonId}:r${round}`}
          applications={applications.map((application) => ({
            id: application.id,
            teamName: application.teamName,
            participantsFullName: application.participantsFullName,
            githubRepoUrl: application.githubRepoUrl,
            builtDescription: application.builtDescription,
            groupName: groupNameOf(application),
            score: application.scores[0] ?? null,
          }))}
          submitAction={submitAction}
        />
      </section>
    </main>
  );
}
