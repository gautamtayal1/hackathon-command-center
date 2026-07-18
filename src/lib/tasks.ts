import type {
  Application as PrismaApplication,
  BudgetEntry as PrismaBudgetEntry,
  Hackathon,
  JudgeGroup as PrismaJudgeGroup,
  Judge as PrismaJudge,
  Score,
  Task,
} from "@/generated/prisma/client";
import {
  BOARD_COLUMNS,
  DEFAULT_BUDGET_LINES,
  DELETED_MAIN_TASK_LABEL,
  FINALIST_COUNT,
  MAIN_TASK_LABEL,
  MAIN_TODO_TASKS,
  type BoardTask,
  type BudgetEntry,
  type JudgeGroup,
  type HackathonSummary,
  type HackathonApplication,
  type JudgingApplication,
  type JudgingRoundStatus,
  type Judge,
} from "@/lib/board";
import { prisma } from "@/lib/prisma";

const DEFAULT_HACKATHON_NAME = "Hackathon";

function serializeTask(task: Task): BoardTask {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status as BoardTask["status"],
    priority: task.priority as BoardTask["priority"],
    dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null,
    areaLabel: task.areaLabel,
    completed: task.completed,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

function serializeBudgetEntry(entry: PrismaBudgetEntry): BudgetEntry {
  return {
    id: entry.id,
    label: entry.label,
    type: entry.type as BudgetEntry["type"],
    amountCents: entry.amountCents,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

const budgetDefaultOrder = new Map<string, number>(
  DEFAULT_BUDGET_LINES.map((line, index) => [line.label, index]),
);

function sortBudgetEntries(entries: PrismaBudgetEntry[]): BudgetEntry[] {
  return entries
    .map(serializeBudgetEntry)
    .toSorted((a, b) => {
      const defaultDelta =
        (budgetDefaultOrder.get(a.label) ?? 99) -
        (budgetDefaultOrder.get(b.label) ?? 99);

      if (defaultDelta !== 0) {
        return defaultDelta;
      }

      if (a.type !== b.type) {
        return a.type === "INCOME" ? -1 : 1;
      }

      return a.createdAt.localeCompare(b.createdAt);
    });
}

function serializeHackathon(hackathon: Hackathon): HackathonSummary {
  return {
    id: hackathon.id,
    name: hackathon.name,
    lumaUrl: hackathon.lumaUrl,
    startsAt: hackathon.startsAt ? hackathon.startsAt.toISOString() : null,
    isActive: hackathon.isActive,
    currentRound: hackathon.currentRound,
    createdAt: hackathon.createdAt.toISOString(),
  };
}

function serializeJudge(judge: PrismaJudge): Judge {
  return {
    id: judge.id,
    name: judge.name,
    email: judge.email,
    groupId: judge.groupId,
    sortOrder: judge.sortOrder,
    inviteStatus: judge.inviteStatus,
    createdAt: judge.createdAt.toISOString(),
    updatedAt: judge.updatedAt.toISOString(),
  };
}

function serializeApplication(application: PrismaApplication): HackathonApplication {
  return {
    id: application.id,
    teamName: application.teamName,
    participantsFullName: application.participantsFullName,
    githubRepoUrl: application.githubRepoUrl,
    builtDescription: application.builtDescription,
    createdAt: application.createdAt.toISOString(),
    updatedAt: application.updatedAt.toISOString(),
  };
}

function scoreTotal(score: Pick<
  Score,
  "score" | "pitchScore" | "iterationScore" | "uiUxScore" | "executionScore"
>) {
  const criteriaTotal =
    score.pitchScore +
    score.iterationScore +
    score.uiUxScore +
    score.executionScore;

  return criteriaTotal > 0 ? criteriaTotal : score.score * 4;
}

function average(values: number[]) {
  if (!values.length) {
    return null;
  }

  return Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 10) / 10;
}

function serializeJudgeGroup(
  group: PrismaJudgeGroup & {
    judges: Pick<PrismaJudge, "email" | "id" | "name" | "sortOrder">[];
    _count: { assignments: number };
  },
): JudgeGroup {
  return {
    id: group.id,
    name: group.name,
    sortOrder: group.sortOrder,
    applicationCount: group._count.assignments,
    judges: group.judges.map((judge) => ({
      id: judge.id,
      name: judge.name,
      email: judge.email,
      sortOrder: judge.sortOrder,
    })),
  };
}

async function ensureActiveHackathon(workspaceId?: string) {
  const workspaceFilter = workspaceId ? { workspaceId } : {};
  const active = await prisma.hackathon.findFirst({
    where: { ...workspaceFilter, isActive: true },
    orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
  });

  if (active) {
    return active;
  }

  const existing = await prisma.hackathon.findFirst({
    where: workspaceFilter,
    orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
  });

  if (existing) {
    return prisma.hackathon.update({
      where: { id: existing.id },
      data: { isActive: true },
    });
  }

  return prisma.hackathon.create({
    data: { name: DEFAULT_HACKATHON_NAME, isActive: true, workspaceId },
  });
}

export async function getActiveHackathon(workspaceId?: string) {
  return ensureActiveHackathon(workspaceId);
}

export async function getHackathons(
  workspaceId?: string,
): Promise<HackathonSummary[]> {
  await ensureActiveHackathon(workspaceId);

  const hackathons = await prisma.hackathon.findMany({
    where: workspaceId ? { workspaceId } : undefined,
    orderBy: [{ isActive: "desc" }, { startsAt: "asc" }, { createdAt: "desc" }],
  });

  return hackathons.map(serializeHackathon);
}

async function ensureMainTodoTasks(hackathonId: string) {
  const existingMainTasks = await prisma.task.findMany({
    where: {
      hackathonId,
      areaLabel: { in: [MAIN_TASK_LABEL, DELETED_MAIN_TASK_LABEL] },
    },
    select: {
      id: true,
      title: true,
      status: true,
      sortOrder: true,
      areaLabel: true,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const usedTaskIds = new Set<string>();

  for (const [sortOrder, task] of MAIN_TODO_TASKS.entries()) {
    const aliases: readonly string[] = "aliases" in task ? task.aliases : [];
    const existingTask =
      existingMainTasks.find(
        (candidate) =>
          !usedTaskIds.has(candidate.id) && candidate.sortOrder === sortOrder,
      ) ??
      existingMainTasks.find(
        (candidate) =>
          !usedTaskIds.has(candidate.id) &&
          (candidate.title === task.title || aliases.includes(candidate.title)),
      );

    if (existingTask) {
      usedTaskIds.add(existingTask.id);

      if (existingTask.areaLabel === DELETED_MAIN_TASK_LABEL) {
        continue;
      }

      if (
        existingTask.status !== task.status ||
        existingTask.sortOrder !== sortOrder
      ) {
        await prisma.task.update({
          where: { id: existingTask.id },
          data: {
            status: task.status,
            sortOrder,
          },
        });
      }

      continue;
    }

    const createdTask = await prisma.task.create({
        data: {
          hackathonId,
          title: task.title,
          status: task.status,
          areaLabel: MAIN_TASK_LABEL,
          priority: "MEDIUM",
          completed: false,
          sortOrder,
        },
      });

    usedTaskIds.add(createdTask.id);
  }

  const obsoleteTaskIds = existingMainTasks
    .filter((task) => !usedTaskIds.has(task.id))
    .map((task) => task.id);

  if (obsoleteTaskIds.length) {
    await prisma.task.deleteMany({
      where: { id: { in: obsoleteTaskIds } },
    });
  }
}

async function ensureDefaultBudgetEntries(hackathonId: string) {
  const existingDefaults = await prisma.budgetEntry.findMany({
    where: { hackathonId },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });
  const usedEntryIds = new Set<string>();

  for (const line of DEFAULT_BUDGET_LINES) {
    const aliases: readonly string[] = "aliases" in line ? line.aliases : [];
    const existingEntry = existingDefaults.find(
      (entry) =>
        !usedEntryIds.has(entry.id) &&
        (entry.label === line.label || aliases.includes(entry.label)),
    );

    if (existingEntry) {
      usedEntryIds.add(existingEntry.id);

      if (existingEntry.label !== line.label || existingEntry.type !== line.type) {
        await prisma.budgetEntry.update({
          where: { id: existingEntry.id },
          data: {
            label: line.label,
            type: line.type,
          },
        });
      }

      continue;
    }

    const createdEntry = await prisma.budgetEntry.create({
      data: {
        hackathonId,
        label: line.label,
        type: line.type,
        amountCents: 0,
      },
    });

    usedEntryIds.add(createdEntry.id);
  }

  await prisma.budgetEntry.deleteMany({
    where: {
      hackathonId,
      label: { in: ["Sponsor revenue", "Participants"] },
      amountCents: 0,
    },
  });
}

export async function ensureHackathonPlanningDefaults(hackathonId: string) {
  await Promise.all([
    ensureMainTodoTasks(hackathonId),
    ensureDefaultBudgetEntries(hackathonId),
  ]);
}

export async function getBoardTasks(workspaceId?: string): Promise<BoardTask[]> {
  const hackathon = await getActiveHackathon(workspaceId);
  await ensureMainTodoTasks(hackathon.id);
  const columnOrder = new Map(
    BOARD_COLUMNS.map((column, index) => [column.id, index]),
  );

  const tasks = await prisma.task.findMany({
    where: {
      hackathonId: hackathon.id,
      NOT: { areaLabel: DELETED_MAIN_TASK_LABEL },
      status: { in: BOARD_COLUMNS.map((column) => column.id) },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return tasks
    .map(serializeTask)
    .toSorted((a, b) => {
      const columnDelta =
        (columnOrder.get(a.status) ?? 0) - (columnOrder.get(b.status) ?? 0);

      if (columnDelta !== 0) {
        return columnDelta;
      }

      return a.createdAt.localeCompare(b.createdAt);
    });
}

export async function getBudgetEntries(
  workspaceId?: string,
): Promise<BudgetEntry[]> {
  const hackathon = await getActiveHackathon(workspaceId);
  await ensureDefaultBudgetEntries(hackathon.id);

  const entries = await prisma.budgetEntry.findMany({
    where: { hackathonId: hackathon.id },
    orderBy: [{ createdAt: "asc" }],
  });

  return sortBudgetEntries(entries);
}

export async function getJudges(workspaceId?: string): Promise<Judge[]> {
  const hackathon = await getActiveHackathon(workspaceId);
  const judges = await prisma.judge.findMany({
    where: { hackathonId: hackathon.id },
    orderBy: [{ groupId: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return judges.map(serializeJudge);
}

export async function getApplications(
  workspaceId?: string,
): Promise<HackathonApplication[]> {
  const hackathon = await getActiveHackathon(workspaceId);
  const applications = await prisma.application.findMany({
    where: { hackathonId: hackathon.id },
    orderBy: [{ createdAt: "desc" }],
  });

  return applications.map(serializeApplication);
}

export async function ensureApplicationAssignments(hackathonId: string) {
  const groups = await prisma.judgeGroup.findMany({
    where: { hackathonId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { assignments: true } } },
  });

  if (!groups.length) {
    return;
  }

  const unassignedApplications = await prisma.application.findMany({
    where: {
      hackathonId,
      assignment: null,
    },
    orderBy: [{ createdAt: "asc" }],
    select: { id: true },
  });

  if (!unassignedApplications.length) {
    return;
  }

  const groupLoads = groups.map((group) => ({
    id: group.id,
    count: group._count.assignments,
  }));

  for (const application of unassignedApplications) {
    groupLoads.sort((a, b) => a.count - b.count);
    const targetGroup = groupLoads[0];

    await prisma.applicationAssignment.create({
      data: {
        hackathonId,
        applicationId: application.id,
        groupId: targetGroup.id,
        sortOrder: targetGroup.count,
      },
    });

    targetGroup.count += 1;
  }
}

export async function getJudgeGroups(workspaceId?: string): Promise<JudgeGroup[]> {
  const hackathon = await getActiveHackathon(workspaceId);
  await ensureApplicationAssignments(hackathon.id);
  const groups = await prisma.judgeGroup.findMany({
    where: { hackathonId: hackathon.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      judges: {
        select: { id: true, name: true, email: true, sortOrder: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      _count: {
        select: { assignments: true },
      },
    },
  });

  return groups.map(serializeJudgeGroup);
}

export async function getJudgingApplications(
  workspaceId?: string,
): Promise<JudgingApplication[]> {
  const hackathon = await getActiveHackathon(workspaceId);
  await ensureApplicationAssignments(hackathon.id);
  const applications = await prisma.application.findMany({
    where: { hackathonId: hackathon.id },
    include: {
      assignment: {
        include: {
          group: {
            select: { id: true, name: true },
          },
        },
      },
      scores: {
        include: {
          judge: {
            select: { groupId: true },
          },
        },
      },
    },
    orderBy: [{ createdAt: "asc" }],
  });

  return applications
    .map((application) => {
      const assignedGroupId = application.assignment?.group.id ?? null;
      // Round 1 scores only count when they come from a judge in the group the
      // project was assigned to. Round 2 is scored by every judge.
      const round1Scores = application.scores.filter(
        (score) =>
          score.round === 1 && score.judge.groupId === assignedGroupId,
      );
      const round2Scores = application.scores.filter(
        (score) => score.round === 2,
      );
      const totals = round1Scores.map(scoreTotal);
      const round2Totals = round2Scores.map(scoreTotal);

      return {
        ...serializeApplication(application),
        groupId: assignedGroupId,
        groupName: application.assignment?.group.name ?? null,
        isFinalist: application.isFinalist,
        scoreCount: round1Scores.length,
        averageScore: average(totals),
        totalScore: totals.reduce((total, value) => total + value, 0),
        pitchAverage: average(
          round1Scores.map((score) => score.pitchScore).filter(Boolean),
        ),
        iterationAverage: average(
          round1Scores.map((score) => score.iterationScore).filter(Boolean),
        ),
        uiUxAverage: average(
          round1Scores.map((score) => score.uiUxScore).filter(Boolean),
        ),
        executionAverage: average(
          round1Scores.map((score) => score.executionScore).filter(Boolean),
        ),
        round2ScoreCount: round2Scores.length,
        round2Average: average(round2Totals),
      };
    })
    .toSorted((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }

      return a.createdAt.localeCompare(b.createdAt);
    });
}

/**
 * Round 1 is complete once every judge has scored every project assigned to
 * their group. Returns the required and completed score counts.
 */
async function getRoundOneCompletion(hackathonId: string) {
  const groups = await prisma.judgeGroup.findMany({
    where: { hackathonId },
    include: {
      _count: { select: { judges: true, assignments: true } },
    },
  });

  const required = groups.reduce(
    (total, group) => total + group._count.judges * group._count.assignments,
    0,
  );
  const completed = await prisma.score.count({
    where: { hackathonId, round: 1 },
  });

  return { required, completed, complete: required > 0 && completed >= required };
}

/**
 * When round 1 finishes, freeze the top {@link FINALIST_COUNT} projects (by
 * combined round-1 score) as finalists and move the hackathon into round 2.
 * Idempotent: does nothing once the hackathon is already in round 2.
 */
export async function maybePromoteToRoundTwo(hackathonId: string) {
  const hackathon = await prisma.hackathon.findUnique({
    where: { id: hackathonId },
    select: { currentRound: true },
  });

  if (!hackathon || hackathon.currentRound >= 2) {
    return;
  }

  const { complete } = await getRoundOneCompletion(hackathonId);

  if (!complete) {
    return;
  }

  const applications = await prisma.application.findMany({
    where: { hackathonId },
    include: {
      assignment: { select: { groupId: true } },
      scores: { include: { judge: { select: { groupId: true } } } },
    },
  });

  const ranked = applications
    .map((application) => {
      const assignedGroupId = application.assignment?.groupId ?? null;
      const totals = application.scores
        .filter(
          (score) =>
            score.round === 1 && score.judge.groupId === assignedGroupId,
        )
        .map(scoreTotal);

      return {
        id: application.id,
        average: average(totals) ?? 0,
        createdAt: application.createdAt,
      };
    })
    .sort((a, b) => {
      if (b.average !== a.average) {
        return b.average - a.average;
      }

      return a.createdAt.getTime() - b.createdAt.getTime();
    });

  const finalistIds = ranked.slice(0, FINALIST_COUNT).map((entry) => entry.id);

  await prisma.$transaction([
    prisma.application.updateMany({
      where: { hackathonId },
      data: { isFinalist: false },
    }),
    prisma.application.updateMany({
      where: { hackathonId, id: { in: finalistIds } },
      data: { isFinalist: true },
    }),
    prisma.hackathon.update({
      where: { id: hackathonId },
      data: { currentRound: 2 },
    }),
  ]);
}

export async function getJudgingRoundStatus(
  workspaceId?: string,
): Promise<JudgingRoundStatus> {
  const hackathon = await getActiveHackathon(workspaceId);
  const { required, completed, complete } = await getRoundOneCompletion(
    hackathon.id,
  );

  const finalistCount = await prisma.application.count({
    where: { hackathonId: hackathon.id, isFinalist: true },
  });
  const judgeCount = await prisma.judge.count({
    where: { hackathonId: hackathon.id },
  });

  const round2Completed = await prisma.score.count({
    where: { hackathonId: hackathon.id, round: 2 },
  });

  return {
    currentRound: hackathon.currentRound,
    round1Required: required,
    round1Completed: completed,
    round1Complete: complete,
    round2Required: finalistCount * judgeCount,
    round2Completed,
    finalistCount,
  };
}

export async function getDashboardData(workspaceId?: string) {
  const active = await ensureActiveHackathon(workspaceId);
  await ensureApplicationAssignments(active.id);

  const [
    hackathons,
    tasks,
    budgetEntries,
    judges,
    applications,
    judgeGroups,
    judgingApplications,
    judgingRoundStatus,
  ] = await Promise.all([
    getHackathons(workspaceId),
    getBoardTasks(workspaceId),
    getBudgetEntries(workspaceId),
    getJudges(workspaceId),
    getApplications(workspaceId),
    getJudgeGroups(workspaceId),
    getJudgingApplications(workspaceId),
    getJudgingRoundStatus(workspaceId),
  ]);

  const activeHackathon =
    hackathons.find((hackathon) => hackathon.isActive) ?? hackathons[0];

  return {
    hackathons,
    activeHackathon,
    tasks,
    budgetEntries,
    judges,
    applications,
    judgeGroups,
    judgingApplications,
    judgingRoundStatus,
  };
}
