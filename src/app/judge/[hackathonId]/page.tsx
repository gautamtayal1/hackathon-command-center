import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireJudgeForHackathon } from "@/lib/auth";
import { upsertJudgeScore } from "@/lib/actions";
import { Wordmark } from "@/components/brand/wordmark";
import { prisma } from "@/lib/prisma";
import { JudgeWorkspace } from "@/app/judge/[hackathonId]/judge-workspace";

export const dynamic = "force-dynamic";

type JudgeHackathonPageProps = {
  params: Promise<{
    hackathonId: string;
  }>;
};

export default async function JudgeHackathonPage({
  params,
}: JudgeHackathonPageProps) {
  const { hackathonId } = await params;
  const { judge } = await requireJudgeForHackathon(hackathonId);
  const applications = judge.groupId
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
            where: { judgeId: judge.id },
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
            {applications.length} applications
          </p>
        </div>

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
        />
      </section>
    </main>
  );
}
