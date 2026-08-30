import "server-only";

import { prisma } from "@/lib/prisma";
import {
  averageOf,
  ROUND_ONE,
  ROUND_TWO,
  SCORE_CRITERIA,
  scoreTotal,
  type CriterionName,
  type FinalScore,
  type Finalist,
  type RosterJudge,
  type RoundScore,
  type RoundTeam,
} from "@/lib/judging";
import { ensureApplicationAssignments, getActiveHackathon } from "@/lib/tasks";

/**
 * Every public screen and judging route reads the one hackathon that is live,
 * so none of them need a hackathon id in the URL.
 */
export async function getCurrentHackathon() {
  const hackathon = await getActiveHackathon();
  await ensureApplicationAssignments(hackathon.id);

  return hackathon;
}

/** Teams a judge owns in round 1, decided by the group their judge row sits in. */
export async function getRoundOneTeams(
  hackathonId: string,
  judgeId: string,
  groupId: string | null,
): Promise<RoundTeam[]> {
  if (!groupId) {
    return [];
  }

  const applications = await prisma.application.findMany({
    where: {
      hackathonId,
      assignment: { is: { groupId } },
    },
    include: {
      scores: {
        where: { judgeId, round: ROUND_ONE },
      },
      assignment: { select: { sortOrder: true } },
    },
    orderBy: [{ assignment: { sortOrder: "asc" } }, { createdAt: "asc" }],
  });

  return applications.map(toRoundTeam);
}

/**
 * One finalist per judge: the highest total they gave in round 1. A judge who
 * has not scored anything yet promotes nobody, and a team that two judges
 * somehow share is listed once.
 */
export async function getFinalists(hackathonId: string): Promise<Finalist[]> {
  const judges = await prisma.judge.findMany({
    where: { hackathonId, inviteStatus: { not: "REVOKED" } },
    include: {
      group: { select: { sortOrder: true } },
      scores: {
        where: { round: ROUND_ONE },
        include: {
          application: true,
        },
      },
    },
    orderBy: [{ group: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  });

  const finalists: Finalist[] = [];
  const seen = new Set<string>();

  for (const judge of judges) {
    const ranked = judge.scores
      .filter((score) => scoreTotal(score) > 0)
      .toSorted((a, b) => {
        const difference = scoreTotal(b) - scoreTotal(a);

        if (difference !== 0) {
          return difference;
        }

        return a.application.createdAt.getTime() - b.application.createdAt.getTime();
      });
    const top = ranked[0];

    if (!top || seen.has(top.applicationId)) {
      continue;
    }

    seen.add(top.applicationId);
    finalists.push({
      id: top.application.id,
      teamName: top.application.teamName,
      participantsFullName: top.application.participantsFullName,
      githubRepoUrl: top.application.githubRepoUrl,
      builtDescription: top.application.builtDescription,
      promotedByJudge: judge.name,
      roundOneTotal: scoreTotal(top),
    });
  }

  return finalists;
}

/** In round 2 every judge scores every finalist, so the list is not per-judge. */
export async function getRoundTwoTeams(
  hackathonId: string,
  judgeId: string,
): Promise<RoundTeam[]> {
  const finalists = await getFinalists(hackathonId);

  if (!finalists.length) {
    return [];
  }

  const scores = await prisma.score.findMany({
    where: {
      judgeId,
      round: ROUND_TWO,
      applicationId: { in: finalists.map((finalist) => finalist.id) },
    },
  });
  const scoreByApplication = new Map(
    scores.map((score) => [score.applicationId, score]),
  );

  return finalists.map((finalist) => ({
    id: finalist.id,
    teamName: finalist.teamName,
    participantsFullName: finalist.participantsFullName,
    githubRepoUrl: finalist.githubRepoUrl,
    builtDescription: finalist.builtDescription,
    score: toRoundScore(scoreByApplication.get(finalist.id) ?? null),
  }));
}

export async function getRoster(hackathonId: string): Promise<RosterJudge[]> {
  const judges = await prisma.judge.findMany({
    where: { hackathonId, inviteStatus: { not: "REVOKED" } },
    include: {
      group: {
        select: {
          name: true,
          sortOrder: true,
          assignments: {
            include: {
              application: {
                select: {
                  id: true,
                  teamName: true,
                  participantsFullName: true,
                },
              },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
    orderBy: [{ group: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  });

  return judges.map((judge) => ({
    id: judge.id,
    name: judge.name,
    groupName: judge.group?.name ?? null,
    submittedRoundOne: Boolean(judge.round1SubmittedAt),
    teams:
      judge.group?.assignments.map((assignment) => assignment.application) ?? [],
  }));
}

/** The judge (or judges) a team will pitch to, used on the apply confirmation. */
export async function getJudgesForApplication(applicationId: string) {
  const assignment = await prisma.applicationAssignment.findUnique({
    where: { applicationId },
    include: {
      group: {
        include: {
          judges: {
            where: { inviteStatus: { not: "REVOKED" } },
            select: { name: true },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
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

export async function getFinalScores(hackathonId: string): Promise<FinalScore[]> {
  const finalists = await getFinalists(hackathonId);

  if (!finalists.length) {
    return [];
  }

  const scores = await prisma.score.findMany({
    where: {
      hackathonId,
      round: ROUND_TWO,
      applicationId: { in: finalists.map((finalist) => finalist.id) },
    },
    include: { judge: { select: { name: true, sortOrder: true } } },
  });

  return finalists
    .map((finalist) => {
      const teamScores = scores.filter(
        (score) => score.applicationId === finalist.id && scoreTotal(score) > 0,
      );

      return {
        id: finalist.id,
        teamName: finalist.teamName,
        participantsFullName: finalist.participantsFullName,
        average: averageOf(teamScores.map(scoreTotal)),
        scoredBy: teamScores.length,
        criteriaAverages: Object.fromEntries(
          SCORE_CRITERIA.map((criterion) => [
            criterion.name,
            averageOf(teamScores.map((score) => score[criterion.name])),
          ]),
        ) as Record<CriterionName, number | null>,
        judgeScores: teamScores
          .toSorted((a, b) => a.judge.sortOrder - b.judge.sortOrder)
          .map((score) => ({
            judgeName: score.judge.name,
            total: scoreTotal(score),
            note: score.note,
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

function toRoundTeam(application: {
  id: string;
  teamName: string;
  participantsFullName: string;
  githubRepoUrl: string;
  builtDescription: string;
  scores: Array<{
    score: number;
    pitchScore: number;
    potentialScore: number;
    uiUxScore: number;
    executionScore: number;
    note: string;
  }>;
}): RoundTeam {
  return {
    id: application.id,
    teamName: application.teamName,
    participantsFullName: application.participantsFullName,
    githubRepoUrl: application.githubRepoUrl,
    builtDescription: application.builtDescription,
    score: toRoundScore(application.scores[0] ?? null),
  };
}

function toRoundScore(
  score: {
    score: number;
    pitchScore: number;
    potentialScore: number;
    uiUxScore: number;
    executionScore: number;
    note: string;
  } | null,
): RoundScore | null {
  if (!score) {
    return null;
  }

  return {
    score: score.score,
    pitchScore: score.pitchScore,
    potentialScore: score.potentialScore,
    uiUxScore: score.uiUxScore,
    executionScore: score.executionScore,
    note: score.note,
  };
}
