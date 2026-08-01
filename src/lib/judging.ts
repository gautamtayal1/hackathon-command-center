import { prisma } from "@/lib/prisma";
import { selectSingleGroupWinner } from "@/lib/judging-rules";

export async function ensureGroupJudgingRound(hackathonId: string) {
  const round = await prisma.judgingRound.upsert({
    where: {
      hackathonId_type: { hackathonId, type: "GROUP" },
    },
    update: {},
    create: {
      hackathonId,
      type: "GROUP",
      status: "OPEN",
      openedAt: new Date(),
    },
  });

  return round;
}

export async function getJudgingRoundState(hackathonId: string) {
  const groupRound = await ensureGroupJudgingRound(hackathonId);
  const finalRound = await prisma.judgingRound.findUnique({
    where: {
      hackathonId_type: { hackathonId, type: "FINAL" },
    },
  });

  return {
    groupRoundId: groupRound.id,
    groupRoundStatus: groupRound.status,
    finalRoundId: finalRound?.id ?? null,
    finalRoundStatus: finalRound?.status ?? null,
  };
}

function scoreTotal(score: {
  score: number;
  pitchScore: number;
  potentialScore: number;
  uiUxScore: number;
  executionScore: number;
}) {
  const criteriaTotal =
    score.pitchScore +
    score.potentialScore +
    score.uiUxScore +
    score.executionScore;

  return criteriaTotal > 0 ? criteriaTotal : score.score * 4;
}

export async function startFinalRoundForHackathon(hackathonId: string) {
  const groupRound = await ensureGroupJudgingRound(hackathonId);

  if (groupRound.status === "CLOSED") {
    const existingFinal = await prisma.judgingRound.findUnique({
      where: { hackathonId_type: { hackathonId, type: "FINAL" } },
    });

    if (existingFinal) {
      return existingFinal;
    }
  }

  const groups = await prisma.judgeGroup.findMany({
    where: { hackathonId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      judges: { select: { id: true } },
      assignments: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          application: {
            select: {
              id: true,
              teamName: true,
              scores: {
                where: { roundId: groupRound.id },
                select: {
                  judgeId: true,
                  score: true,
                  pitchScore: true,
                  potentialScore: true,
                  uiUxScore: true,
                  executionScore: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const groupsWithApplications = groups.filter(
    (group) => group.assignments.length > 0,
  );

  if (!groupsWithApplications.length) {
    throw new Error("Add applications to judging groups before starting finals.");
  }

  const winners: Array<{ applicationId: string; sourceGroupId: string }> = [];

  for (const group of groupsWithApplications) {
    if (!group.judges.length) {
      throw new Error(`${group.name} has no judges.`);
    }

    const judgeIds = new Set(group.judges.map((judge) => judge.id));
    const ranked = group.assignments.map(({ application }) => {
      const completedScores = application.scores.filter(
        (score) => judgeIds.has(score.judgeId) && scoreTotal(score) > 0,
      );

      if (completedScores.length !== judgeIds.size) {
        throw new Error(
          `${application.teamName} is missing ${judgeIds.size - completedScores.length} vote(s) in ${group.name}.`,
        );
      }

      return {
        applicationId: application.id,
        teamName: application.teamName,
        total: completedScores.reduce(
          (sum, score) => sum + scoreTotal(score),
          0,
        ),
      };
    });

    const winner = selectSingleGroupWinner(group.name, ranked);

    winners.push({
      applicationId: winner.applicationId,
      sourceGroupId: group.id,
    });
  }

  return prisma.$transaction(async (tx) => {
    const finalRound = await tx.judgingRound.upsert({
      where: { hackathonId_type: { hackathonId, type: "FINAL" } },
      update: {
        status: "OPEN",
        openedAt: new Date(),
        closedAt: null,
      },
      create: {
        hackathonId,
        type: "FINAL",
        status: "OPEN",
        openedAt: new Date(),
      },
    });

    await tx.finalistSelection.deleteMany({
      where: { finalRoundId: finalRound.id },
    });
    await tx.finalistSelection.createMany({
      data: winners.map((winner) => ({
        hackathonId,
        finalRoundId: finalRound.id,
        applicationId: winner.applicationId,
        sourceGroupId: winner.sourceGroupId,
      })),
    });
    await tx.judgingRound.update({
      where: { id: groupRound.id },
      data: { status: "CLOSED", closedAt: new Date() },
    });

    return finalRound;
  });
}
