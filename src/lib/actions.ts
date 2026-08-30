"use server";

import { revalidatePath } from "next/cache";
import {
  DELETED_MAIN_TASK_LABEL,
  isBudgetType,
  isBoardColumnId,
  isPriority,
  MAIN_TASK_LABEL,
  type ApplicationInput,
  type BudgetInput,
  type BoardColumnId,
  type HackathonInput,
  type JudgeInput,
  type TaskInput,
} from "@/lib/board";
import {
  getAdminContext,
  requireAdminForHackathon,
  requireJudgeForHackathon,
} from "@/lib/auth";
import {
  createHackathonFromLumaInScope,
  selectHackathonInScope,
} from "@/lib/hackathons";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getJudgesForApplication } from "@/lib/screens";
import { ensureApplicationAssignments, getActiveHackathon } from "@/lib/tasks";
import {
  ensureGroupJudgingRound,
  startFinalRoundForHackathon,
  syncProvisionalFinalists,
} from "@/lib/judging";

function cleanInput(input: TaskInput) {
  const title = input.title.trim();

  if (!title) {
    throw new Error("Task title is required.");
  }

  if (!isBoardColumnId(input.status)) {
    throw new Error("Task status is not valid.");
  }

  if (!isPriority(input.priority)) {
    throw new Error("Task priority is not valid.");
  }

  return {
    title,
    description: input.description.trim(),
    status: input.status,
    priority: input.priority,
    dueDate: input.dueDate ? new Date(`${input.dueDate}T00:00:00.000Z`) : null,
    areaLabel: input.areaLabel.trim(),
    completed: input.completed,
  };
}

function cleanBudgetInput(input: BudgetInput) {
  const label = input.label.trim();

  if (!label) {
    throw new Error("Budget label is required.");
  }

  if (!isBudgetType(input.type)) {
    throw new Error("Budget type is not valid.");
  }

  const amount = Number(input.amount.replace(",", "."));

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Budget amount must be a positive number.");
  }

  return {
    label,
    type: input.type,
    amountCents: Math.round(amount * 100),
  };
}

function cleanJudgeInput(input: JudgeInput) {
  const name = (input.name ?? "").trim();
  const email = (input.email ?? "").trim().toLowerCase();
  const groupId = input.groupId?.trim() ?? "";
  const groupNumberValue = input.groupNumber?.trim() ?? "";

  if (!name) {
    throw new Error("Judge name is required.");
  }

  if (!email) {
    throw new Error("Judge email is required.");
  }

  if (!email.includes("@")) {
    throw new Error("Judge email is not valid.");
  }

  const groupNumber = groupNumberValue ? Number(groupNumberValue) : null;

  if (
    groupNumber !== null &&
    (!Number.isInteger(groupNumber) || groupNumber < 1 || groupNumber > 99)
  ) {
    throw new Error("Judge group must be a number from 1 to 99.");
  }

  return { name, email, groupId: groupId || null, groupNumber };
}

function cleanScoreValue(value: FormDataEntryValue | null, label: string) {
  const score = Number(value);

  if (!Number.isInteger(score) || score < 1 || score > 10) {
    throw new Error(`${label} must be a number from 1 to 10.`);
  }

  return score;
}

async function requireOpenGroupRound(hackathonId: string) {
  const groupRound = await ensureGroupJudgingRound(hackathonId);

  if (groupRound.status !== "OPEN") {
    throw new Error("Group judging is closed because the final round has started.");
  }

  return groupRound;
}

function cleanRequiredText(value: string, label: string) {
  const cleaned = value.trim().replace(/\s+/g, " ");

  if (!cleaned) {
    throw new Error(`${label} is required.`);
  }

  return cleaned;
}

function normalizeGithubRepoUrl(rawUrl: string) {
  const withProtocol = rawUrl.trim().match(/^https?:\/\//)
    ? rawUrl.trim()
    : `https://${rawUrl.trim()}`;

  let url: URL;

  try {
    url = new URL(withProtocol);
  } catch {
    throw new Error("Paste a valid GitHub repo link.");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Paste a valid GitHub repo link.");
  }

  if (url.hostname.toLowerCase() !== "github.com") {
    throw new Error("Use a GitHub repo link.");
  }

  const parts = url.pathname.split("/").filter(Boolean);

  if (parts.length < 2) {
    throw new Error("Use a GitHub repo link with owner and repo.");
  }

  return `https://github.com/${parts[0]}/${parts[1]}`;
}

async function assertPublicGithubRepo(githubRepoUrl: string) {
  try {
    const response = await fetch(githubRepoUrl, {
      method: "HEAD",
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; 8xApplications/1.0; +https://localhost)",
      },
    });

    if (response.ok) {
      return;
    }
  } catch {
    throw new Error("GitHub repo must be public and reachable.");
  }

  throw new Error("GitHub repo must be public and reachable.");
}

async function cleanApplicationInput(input: ApplicationInput) {
  const githubRepoUrl = normalizeGithubRepoUrl(input.githubRepoUrl);

  await assertPublicGithubRepo(githubRepoUrl);

  return {
    teamName: cleanRequiredText(input.teamName, "Team name"),
    participantsFullName: cleanRequiredText(
      input.participantsFullName,
      "Participants full name",
    ),
    githubRepoUrl,
    builtDescription: cleanRequiredText(
      input.builtDescription,
      "What have you built?",
    ),
  };
}

async function requireAdminForTask(id: string) {
  const task = await prisma.task.findUnique({
    where: { id },
    select: { hackathonId: true },
  });

  if (!task) {
    throw new Error("Task not found.");
  }

  return requireAdminForHackathon(task.hackathonId);
}

async function requireAdminForBudgetEntry(id: string) {
  const entry = await prisma.budgetEntry.findUnique({
    where: { id },
    select: { hackathonId: true },
  });

  if (!entry) {
    throw new Error("Budget line not found.");
  }

  return requireAdminForHackathon(entry.hackathonId);
}

async function requireAdminForJudge(id: string) {
  const judge = await prisma.judge.findUnique({
    where: { id },
    select: { hackathonId: true },
  });

  if (!judge) {
    throw new Error("Judge not found.");
  }

  return requireAdminForHackathon(judge.hackathonId);
}

async function requireAdminForApplication(id: string) {
  const application = await prisma.application.findUnique({
    where: { id },
    select: { hackathonId: true },
  });

  if (!application) {
    throw new Error("Application not found.");
  }

  return requireAdminForHackathon(application.hackathonId);
}

async function provisionJudgeAccount(email: string) {
  if (!email) {
    return { inviteStatus: "CONTACT" as const, invitedAt: null };
  }

  const password = process.env.JUDGE_DEFAULT_PASSWORD;

  if (!password || password.length < 6) {
    throw new Error("Judge password is not configured.");
  }

  const supabase = createSupabaseAdminClient();
  const { data: usersData, error: usersError } =
    await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (usersError) {
    throw usersError;
  }

  const existingUser = usersData.users.find(
    (user) => user.email?.toLowerCase() === email,
  );

  if (existingUser) {
    const adminMemberships = await prisma.workspaceMember.count({
      where: { userId: existingUser.id },
    });

    if (adminMemberships === 0) {
      const { error } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { password, email_confirm: true },
      );

      if (error) {
        throw error;
      }
    }

    return { inviteStatus: "PENDING" as const, invitedAt: new Date() };
  }

  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    throw error;
  }

  return { inviteStatus: "PENDING" as const, invitedAt: new Date() };
}

export async function createTask(input: TaskInput) {
  const { workspace } = await getAdminContext();
  const hackathon = await getActiveHackathon(workspace.id);
  const data = cleanInput(input);
  const sortOrder = await prisma.task.count({
    where: { hackathonId: hackathon.id, status: data.status },
  });

  await prisma.task.create({
    data: {
      ...data,
      sortOrder,
      hackathonId: hackathon.id,
    },
  });

  revalidatePath("/");
  revalidatePath("/preview");
}

export async function updateTask(id: string, input: TaskInput) {
  await requireAdminForTask(id);
  const data = cleanInput(input);

  await prisma.task.update({
    where: { id },
    data,
  });

  revalidatePath("/");
  revalidatePath("/preview");
}

export async function deleteTask(id: string) {
  await requireAdminForTask(id);
  const task = await prisma.task.findUniqueOrThrow({
    where: { id },
    select: { areaLabel: true },
  });

  if (task.areaLabel === MAIN_TASK_LABEL) {
    await prisma.task.update({
      where: { id },
      data: { areaLabel: DELETED_MAIN_TASK_LABEL },
    });
  } else {
    await prisma.task.delete({
      where: { id },
    });
  }

  revalidatePath("/");
  revalidatePath("/preview");
}

export async function toggleTaskCompletion(id: string, completed: boolean) {
  await requireAdminForTask(id);

  await prisma.task.update({
    where: { id },
    data: { completed },
  });

  revalidatePath("/");
  revalidatePath("/preview");
}

export async function moveTask(id: string, status: BoardColumnId) {
  if (!isBoardColumnId(status)) {
    throw new Error("Task status is not valid.");
  }

  await requireAdminForTask(id);
  const task = await prisma.task.findUniqueOrThrow({
    where: { id },
    select: { hackathonId: true },
  });
  const sortOrder = await prisma.task.count({
    where: { hackathonId: task.hackathonId, status },
  });

  await prisma.task.update({
    where: { id },
    data: { status, sortOrder },
  });

  revalidatePath("/");
  revalidatePath("/preview");
}

export async function createBudgetEntry(input: BudgetInput) {
  const { workspace } = await getAdminContext();
  const hackathon = await getActiveHackathon(workspace.id);
  const data = cleanBudgetInput(input);

  await prisma.budgetEntry.create({
    data: {
      ...data,
      hackathonId: hackathon.id,
    },
  });

  revalidatePath("/");
  revalidatePath("/preview");
}

export async function updateBudgetEntry(id: string, input: BudgetInput) {
  await requireAdminForBudgetEntry(id);
  const data = cleanBudgetInput(input);

  await prisma.budgetEntry.update({
    where: { id },
    data,
  });

  revalidatePath("/");
  revalidatePath("/preview");
}

export async function deleteBudgetEntry(id: string) {
  await requireAdminForBudgetEntry(id);

  await prisma.budgetEntry.delete({
    where: { id },
  });

  revalidatePath("/");
  revalidatePath("/preview");
}

export async function createJudge(input: JudgeInput) {
  const { workspace } = await getAdminContext();
  const hackathon = await getActiveHackathon(workspace.id);
  await requireOpenGroupRound(hackathon.id);
  const data = cleanJudgeInput(input);
  const invite = await provisionJudgeAccount(data.email);
  const groupId = await resolveJudgeGroupForHackathon(hackathon.id, data);
  const sortOrder = await getNextJudgeSortOrder(hackathon.id, groupId);

  await prisma.judge.create({
    data: {
      name: data.name,
      email: data.email,
      groupId,
      sortOrder,
      inviteStatus: invite.inviteStatus,
      invitedAt: invite.invitedAt,
      hackathonId: hackathon.id,
    },
  });

  revalidatePath("/");
  revalidatePath("/preview");
}

export async function updateJudge(id: string, input: JudgeInput) {
  await requireAdminForJudge(id);
  const data = cleanJudgeInput(input);
  const current = await prisma.judge.findUniqueOrThrow({
    where: { id },
    select: { email: true, groupId: true, hackathonId: true, sortOrder: true },
  });
  await requireOpenGroupRound(current.hackathonId);
  const groupId = await resolveJudgeGroupForHackathon(
    current.hackathonId,
    data,
  );
  const groupChanged = groupId !== current.groupId;
  const sortOrder = groupChanged
    ? await getNextJudgeSortOrder(current.hackathonId, groupId)
    : current.sortOrder;
  const invite =
    data.email && data.email !== current.email
      ? await provisionJudgeAccount(data.email)
      : null;

  await prisma.judge.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email,
      groupId,
      sortOrder,
      ...(invite
        ? {
            inviteStatus: invite.inviteStatus,
            invitedAt: invite.invitedAt,
            acceptedAt: null,
            userId: null,
          }
        : {}),
    },
  });

  revalidatePath("/");
  revalidatePath("/preview");
}

async function resolveJudgeGroupForHackathon(
  hackathonId: string,
  input: { groupId: string | null; groupNumber: number | null },
) {
  if (input.groupNumber !== null) {
    return ensureNumberedJudgeGroup(hackathonId, input.groupNumber);
  }

  if (input.groupId) {
    return cleanJudgeGroupForHackathon(hackathonId, input.groupId);
  }

  return getAutomaticJudgeGroup(hackathonId);
}

async function getNextJudgeSortOrder(
  hackathonId: string,
  groupId: string | null,
) {
  if (!groupId) {
    return 0;
  }

  return prisma.judge.count({
    where: { hackathonId, groupId },
  });
}

async function ensureNumberedJudgeGroup(hackathonId: string, groupNumber: number) {
  const sortOrder = groupNumber - 1;
  const name = `Group ${groupNumber}`;
  const existingGroup = await prisma.judgeGroup.findFirst({
    where: {
      hackathonId,
      OR: [{ sortOrder }, { name }],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  if (existingGroup) {
    return existingGroup.id;
  }

  const group = await prisma.judgeGroup.create({
    data: {
      hackathonId,
      name,
      sortOrder,
    },
    select: { id: true },
  });

  return group.id;
}

async function getAutomaticJudgeGroup(hackathonId: string) {
  const groups = await prisma.judgeGroup.findMany({
    where: { hackathonId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      _count: {
        select: { judges: true },
      },
    },
  });
  const availableGroup = groups.find((group) => group._count.judges < 2);

  if (availableGroup) {
    return availableGroup.id;
  }

  const usedSortOrders = new Set(groups.map((group) => group.sortOrder));
  let nextSortOrder = 0;

  while (usedSortOrders.has(nextSortOrder)) {
    nextSortOrder += 1;
  }

  return ensureNumberedJudgeGroup(hackathonId, nextSortOrder + 1);
}

async function cleanJudgeGroupForHackathon(
  hackathonId: string,
  groupId: string | null,
) {
  if (!groupId) {
    return null;
  }

  const group = await prisma.judgeGroup.findFirst({
    where: { id: groupId, hackathonId },
    select: { id: true },
  });

  if (!group) {
    throw new Error("Judge group is not valid.");
  }

  return group.id;
}

export async function autoGenerateJudgeGroups() {
  const { workspace } = await getAdminContext();
  const hackathon = await getActiveHackathon(workspace.id);
  await requireOpenGroupRound(hackathon.id);
  const judges = await prisma.judge.findMany({
    where: { hackathonId: hackathon.id },
    orderBy: [{ createdAt: "asc" }],
    select: { id: true },
  });

  if (!judges.length) {
    throw new Error("Add judges before creating groups.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.judge.updateMany({
      where: { hackathonId: hackathon.id },
      data: { groupId: null, sortOrder: 0 },
    });
    await tx.judgeGroup.deleteMany({
      where: { hackathonId: hackathon.id },
    });

    for (let index = 0; index < Math.ceil(judges.length / 2); index += 1) {
      const group = await tx.judgeGroup.create({
        data: {
          hackathonId: hackathon.id,
          name: `Group ${index + 1}`,
          sortOrder: index,
        },
      });
      const judgeIds = judges
        .slice(index * 2, index * 2 + 2)
        .map((judge) => judge.id);

      if (judgeIds.length) {
        await Promise.all(
          judgeIds.map((judgeId, sortOrder) =>
            tx.judge.update({
              where: { id: judgeId },
              data: { groupId: group.id, sortOrder },
            }),
          ),
        );
      }
    }
  });

  await ensureApplicationAssignments(hackathon.id);
  revalidatePath("/");
  revalidatePath("/preview");
}

export async function moveJudgeToGroup(
  id: string,
  groupId: string | null,
  position?: number,
) {
  await requireAdminForJudge(id);
  const judge = await prisma.judge.findUniqueOrThrow({
    where: { id },
    select: { groupId: true, hackathonId: true },
  });
  await requireOpenGroupRound(judge.hackathonId);
  const cleanedGroupId = await cleanJudgeGroupForHackathon(
    judge.hackathonId,
    groupId,
  );

  if (!cleanedGroupId) {
    await prisma.judge.update({
      where: { id },
      data: { groupId: null, sortOrder: 0 },
    });
  } else {
    await prisma.$transaction(async (tx) => {
      const targetJudges = await tx.judge.findMany({
        where: {
          hackathonId: judge.hackathonId,
          groupId: cleanedGroupId,
          id: { not: id },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true },
      });
      const targetPosition =
        typeof position === "number" && Number.isInteger(position)
          ? Math.max(0, Math.min(position, targetJudges.length))
          : targetJudges.length;
      const orderedJudgeIds = targetJudges.map((targetJudge) => targetJudge.id);

      orderedJudgeIds.splice(targetPosition, 0, id);

      await Promise.all(
        orderedJudgeIds.map((judgeId, sortOrder) =>
          tx.judge.update({
            where: { id: judgeId },
            data: {
              groupId: cleanedGroupId,
              sortOrder,
            },
          }),
        ),
      );
    });
  }

  revalidatePath("/");
  revalidatePath("/preview");
}

export async function deleteJudge(id: string) {
  await requireAdminForJudge(id);
  const judge = await prisma.judge.findUniqueOrThrow({
    where: { id },
    select: { hackathonId: true },
  });
  await requireOpenGroupRound(judge.hackathonId);

  await prisma.judge.delete({
    where: { id },
  });

  revalidatePath("/");
  revalidatePath("/preview");
}

export type ApplicationFormState = {
  status: "idle" | "success" | "error";
  message: string;
  /** Judges the team will pitch to, shown on the confirmation screen. */
  judgeNames?: string[];
};

export async function submitApplication(
  hackathonId: string,
  _previousState: ApplicationFormState,
  formData: FormData,
): Promise<ApplicationFormState> {
  try {
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
      select: { id: true },
    });

    if (!hackathon) {
      return {
        status: "error",
        message: "This application form is no longer available.",
      };
    }

    await requireOpenGroupRound(hackathon.id);

    const data = await cleanApplicationInput({
      teamName: String(formData.get("teamName") ?? ""),
      participantsFullName: String(formData.get("participantsFullName") ?? ""),
      githubRepoUrl: String(formData.get("githubRepoUrl") ?? ""),
      builtDescription: String(formData.get("builtDescription") ?? ""),
    });

    const application = await prisma.application.create({
      data: {
        ...data,
        hackathonId: hackathon.id,
      },
    });

    // Assign straight away so the team leaves the form knowing who judges them.
    await ensureApplicationAssignments(hackathon.id);
    const { judgeNames } = await getJudgesForApplication(application.id);

    revalidatePath("/");
    revalidatePath("/preview");
    revalidatePath("/roster");
    revalidatePath(`/apply/${hackathon.id}`);

    return { status: "success", message: "OK", judgeNames };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not apply.",
    };
  }
}

export async function deleteApplication(id: string) {
  await requireAdminForApplication(id);
  const application = await prisma.application.findUniqueOrThrow({
    where: { id },
    select: { hackathonId: true },
  });
  await requireOpenGroupRound(application.hackathonId);

  await prisma.application.delete({
    where: { id },
  });

  revalidatePath("/");
  revalidatePath("/preview");
}

export async function upsertJudgeScore(
  hackathonId: string,
  applicationId: string,
  formData: FormData,
) {
  const { judge } = await requireJudgeForHackathon(hackathonId);
  const groupRound = await ensureGroupJudgingRound(hackathonId);
  const finalRound = await prisma.judgingRound.findFirst({
    where: { hackathonId, type: "FINAL", status: "OPEN" },
  });
  const requestedRound = String(formData.get("roundType") ?? "");
  const activeRound = requestedRound === "GROUP" ? groupRound : finalRound;

  if (!activeRound) {
    throw new Error("The final round has not started yet.");
  }

  if (activeRound.status !== "OPEN") {
    throw new Error("Judging is closed for this round.");
  }

  const application = await prisma.application.findFirst({
    where: { id: applicationId, hackathonId },
    select: { id: true },
  });

  if (!application) {
    throw new Error("Application not found.");
  }

  if (activeRound.type === "FINAL") {
    const finalist = await prisma.finalistSelection.findFirst({
      where: {
        hackathonId,
        finalRoundId: activeRound.id,
        applicationId: application.id,
      },
      select: { id: true },
    });

    if (!finalist) {
      throw new Error("This application is not a finalist.");
    }
  } else {
    if (!judge.groupId) {
      throw new Error("You are not assigned to a judging group yet.");
    }

    const assignment = await prisma.applicationAssignment.findFirst({
      where: {
        hackathonId,
        applicationId: application.id,
        groupId: judge.groupId,
      },
      select: { id: true },
    });

    if (!assignment) {
      throw new Error("This application is assigned to another judging group.");
    }
  }

  const pitchScore = cleanScoreValue(formData.get("pitchScore"), "Pitch");
  const potentialScore = cleanScoreValue(
    formData.get("potentialScore"),
    "Potential",
  );
  const uiUxScore = cleanScoreValue(formData.get("uiUxScore"), "UI/UX");
  const executionScore = cleanScoreValue(
    formData.get("executionScore"),
    "Execution",
  );
  const score = Math.round(
    (pitchScore + potentialScore + uiUxScore + executionScore) / 4,
  );
  const note = String(formData.get("note") ?? "").trim();

  await prisma.score.upsert({
    where: {
      roundId_applicationId_judgeId: {
        roundId: activeRound.id,
        applicationId: application.id,
        judgeId: judge.id,
      },
    },
    update: {
      score,
      pitchScore,
      potentialScore,
      uiUxScore,
      executionScore,
      note,
    },
    create: {
      hackathonId,
      roundId: activeRound.id,
      applicationId: application.id,
      judgeId: judge.id,
      score,
      pitchScore,
      potentialScore,
      uiUxScore,
      executionScore,
      note,
    },
  });

  if (activeRound.type === "GROUP" && finalRound) {
    await syncProvisionalFinalists(hackathonId);
  }

  revalidatePath(`/judge/${hackathonId}`);
  revalidatePath("/");
  revalidatePath(`/ranking/${hackathonId}`);
}

export async function startFinalRound(hackathonId: string) {
  await requireAdminForHackathon(hackathonId);
  await startFinalRoundForHackathon(hackathonId);

  revalidatePath("/");
  revalidatePath("/preview");
  revalidatePath(`/judge/${hackathonId}`);
  revalidatePath(`/ranking/${hackathonId}`);
}

export async function createHackathonFromLuma(input: HackathonInput) {
  const { workspace } = await getAdminContext();

  await createHackathonFromLumaInScope(input, {
    mode: "workspace",
    workspaceId: workspace.id,
  });

  revalidatePath("/");
  revalidatePath("/preview");
}

export async function selectHackathon(id: string) {
  const { workspace } = await requireAdminForHackathon(id);

  await selectHackathonInScope(id, {
    mode: "workspace",
    workspaceId: workspace.id,
  });

  revalidatePath("/");
  revalidatePath("/preview");
}
