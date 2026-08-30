import { prisma } from "@/lib/prisma";
import { ensureApplicationAssignments } from "@/lib/tasks";

/**
 * Read models for the pages that run unattended on the venue screens. They are
 * public and read-only, so everything here works without a session.
 */

export type RosterJudgeGroup = {
  id: string;
  name: string;
  judgeNames: string[];
  teams: Array<{ id: string; teamName: string; participantsFullName: string }>;
};

export type FinalistEntry = {
  id: string;
  teamName: string;
  participantsFullName: string;
  builtDescription: string;
  groupName: string | null;
  judgeNames: string[];
};

export type FinalScoreEntry = {
  id: string;
  teamName: string;
  participantsFullName: string;
  groupName: string | null;
  average: number | null;
  scoredBy: number;
  judgeScores: Array<{ judgeName: string; total: number }>;
};

function scoreTotal(score: {
  pitchScore: number;
  potentialScore: number;
  uiUxScore: number;
  executionScore: number;
}) {
  return (
    score.pitchScore +
    score.potentialScore +
    score.uiUxScore +
    score.executionScore
  );
}

function average(values: number[]) {
  if (!values.length) {
    return null;
  }

  return (
    Math.round(
      (values.reduce((total, value) => total + value, 0) / values.length) * 10,
    ) / 10
  );
}

export async function getRoster(hackathonId: string): Promise<RosterJudgeGroup[]> {
  await ensureApplicationAssignments(hackathonId);

  const groups = await prisma.judgeGroup.findMany({
    where: { hackathonId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      judges: {
        where: { inviteStatus: { not: "REVOKED" } },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { name: true },
      },
      assignments: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          application: {
            select: { id: true, teamName: true, participantsFullName: true },
          },
        },
      },
    },
  });

  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    judgeNames: group.judges.map((judge) => judge.name),
    teams: group.assignments.map((assignment) => assignment.application),
  }));
}

/** The judges a single team will pitch to, shown on the apply confirmation. */
export async function getJudgesForApplication(applicationId: string) {
  const assignment = await prisma.applicationAssignment.findUnique({
    where: { applicationId },
    include: {
      group: {
        include: {
          judges: {
            where: { inviteStatus: { not: "REVOKED" } },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: { name: true },
          },
        },
      },
    },
  });

  return {
    groupName: assignment?.group.name ?? null,
    judgeNames: assignment?.group.judges.map((judge) => judge.name) ?? [],
  };
}

async function getFinalRound(hackathonId: string) {
  return prisma.judgingRound.findUnique({
    where: { hackathonId_type: { hackathonId, type: "FINAL" } },
  });
}

export async function getFinalists(
  hackathonId: string,
): Promise<FinalistEntry[]> {
  const finalRound = await getFinalRound(hackathonId);

  if (!finalRound) {
    return [];
  }

  const selections = await prisma.finalistSelection.findMany({
    where: { finalRoundId: finalRound.id },
    include: {
      application: true,
      sourceGroup: {
        include: {
          judges: {
            where: { inviteStatus: { not: "REVOKED" } },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: { name: true },
          },
        },
      },
    },
  });

  return selections
    .toSorted((a, b) => a.sourceGroup.sortOrder - b.sourceGroup.sortOrder)
    .map((selection) => ({
      id: selection.application.id,
      teamName: selection.application.teamName,
      participantsFullName: selection.application.participantsFullName,
      builtDescription: selection.application.builtDescription,
      groupName: selection.sourceGroup.name,
      judgeNames: selection.sourceGroup.judges.map((judge) => judge.name),
    }));
}

export async function getFinalScores(
  hackathonId: string,
): Promise<FinalScoreEntry[]> {
  const finalRound = await getFinalRound(hackathonId);

  if (!finalRound) {
    return [];
  }

  const selections = await prisma.finalistSelection.findMany({
    where: { finalRoundId: finalRound.id },
    include: {
      sourceGroup: { select: { name: true } },
      application: {
        include: {
          scores: {
            where: { roundId: finalRound.id },
            include: { judge: { select: { name: true, sortOrder: true } } },
          },
        },
      },
    },
  });

  return selections
    .map((selection) => {
      const scored = selection.application.scores.filter(
        (score) => scoreTotal(score) > 0,
      );

      return {
        id: selection.application.id,
        teamName: selection.application.teamName,
        participantsFullName: selection.application.participantsFullName,
        groupName: selection.sourceGroup.name,
        average: average(scored.map(scoreTotal)),
        scoredBy: scored.length,
        judgeScores: scored
          .toSorted((a, b) => a.judge.sortOrder - b.judge.sortOrder)
          .map((score) => ({
            judgeName: score.judge.name,
            total: scoreTotal(score),
          })),
      };
    })
    .toSorted((a, b) => {
      if (a.average === b.average) {
        return a.teamName.localeCompare(b.teamName);
      }

      return (b.average ?? -1) - (a.average ?? -1);
    });
}
