"use server";

import { headers } from "next/headers";
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
import {
  ensureApplicationAssignments,
  getActiveHackathon,
  maybePromoteToRoundTwo,
} from "@/lib/tasks";

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

function cleanEmail(value: string) {
  const email = value.trim().toLowerCase();

  if (!email || !email.includes("@")) {
    throw new Error("Use a valid email.");
  }

  return email;
}

function safeJudgeNextPath(value: string) {
  if (!value || !value.startsWith("/judge") || value.startsWith("//")) {
    return "/judge";
  }

  return value;
}

async function getRequestOrigin() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") || host?.startsWith("127.0.0.1")
      ? "http"
      : "https");

  return host ? `${protocol}://${host}` : "http://localhost:3000";
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
          "Mozilla/5.0 (compatible; DrakiApplications/1.0; +https://localhost)",
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

async function inviteJudgeByEmail(email: string) {
  if (!email) {
    return { inviteStatus: "CONTACT" as const, invitedAt: null };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.auth.admin.inviteUserByEmail(email);

    if (error) {
      const message = error.message.toLowerCase();

      if (
        !message.includes("already") &&
        !message.includes("registered") &&
        !message.includes("exists")
      ) {
        throw error;
      }
    }

    return { inviteStatus: "PENDING" as const, invitedAt: new Date() };
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Could not send judge invite: ${error.message}`
        : "Could not send judge invite.",
    );
  }
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
  const data = cleanJudgeInput(input);
  const invite = await inviteJudgeByEmail(data.email);
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
      ? await inviteJudgeByEmail(data.email)
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

  await prisma.judge.delete({
    where: { id },
  });

  revalidatePath("/");
  revalidatePath("/preview");
}

async function sendMagicLinkToJudge(
  judge: { id: string; email: string | null },
  origin: string,
) {
  const email = judge.email ? cleanEmail(judge.email) : "";

  if (!email) {
    throw new Error("Add an email for this judge before sending a link.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(
        "/judge",
      )}`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  await prisma.judge.update({
    where: { id: judge.id },
    data: {
      inviteStatus: "PENDING",
      invitedAt: new Date(),
    },
  });
}

export async function sendJudgeMagicLink(id: string) {
  await requireAdminForJudge(id);
  const judge = await prisma.judge.findUniqueOrThrow({
    where: { id },
    select: { id: true, email: true },
  });

  const origin = await getRequestOrigin();
  await sendMagicLinkToJudge(judge, origin);

  revalidatePath("/");
  revalidatePath("/preview");
}

export async function sendAllJudgeMagicLinks() {
  const { workspace } = await getAdminContext();
  const hackathon = await getActiveHackathon(workspace.id);
  const judges = await prisma.judge.findMany({
    where: {
      hackathonId: hackathon.id,
      inviteStatus: { not: "REVOKED" },
      email: { not: null },
    },
    select: { id: true, email: true },
  });

  if (!judges.length) {
    throw new Error("Add judges with emails before sending links.");
  }

  const origin = await getRequestOrigin();

  for (const judge of judges) {
    await sendMagicLinkToJudge(judge, origin);
  }

  revalidatePath("/");
  revalidatePath("/preview");
}

export type ApplicationFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export type JudgeLoginFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function requestJudgeMagicLink(
  _previousState: JudgeLoginFormState,
  formData: FormData,
): Promise<JudgeLoginFormState> {
  try {
    const email = cleanEmail(String(formData.get("email") ?? ""));
    const nextPath = safeJudgeNextPath(String(formData.get("next") ?? ""));
    const judge = await prisma.judge.findFirst({
      where: {
        email,
        inviteStatus: { not: "REVOKED" },
      },
      select: { id: true },
    });

    if (!judge) {
      return {
        status: "error",
        message: "This email is not assigned as a judge for any hackathon.",
      };
    }

    const origin = await getRequestOrigin();
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(
          nextPath,
        )}`,
      },
    });

    if (error) {
      return {
        status: "error",
        message: error.message,
      };
    }

    return {
      status: "success",
      message: "Check your email. Draki sent the judge link.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Could not send judge link.",
    };
  }
}

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

    const data = await cleanApplicationInput({
      teamName: String(formData.get("teamName") ?? ""),
      participantsFullName: String(formData.get("participantsFullName") ?? ""),
      githubRepoUrl: String(formData.get("githubRepoUrl") ?? ""),
      builtDescription: String(formData.get("builtDescription") ?? ""),
    });

    await prisma.application.create({
      data: {
        ...data,
        hackathonId: hackathon.id,
      },
    });

    revalidatePath("/");
    revalidatePath("/preview");
    revalidatePath(`/apply/${hackathon.id}`);

    return { status: "success", message: "OK" };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not apply.",
    };
  }
}

export async function deleteApplication(id: string) {
  await requireAdminForApplication(id);

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

  const hackathon = await prisma.hackathon.findUnique({
    where: { id: hackathonId },
    select: { currentRound: true },
  });

  if (!hackathon) {
    throw new Error("Hackathon not found.");
  }

  const round = hackathon.currentRound >= 2 ? 2 : 1;

  const application = await prisma.application.findFirst({
    where: { id: applicationId, hackathonId },
    select: { id: true, isFinalist: true },
  });

  if (!application) {
    throw new Error("Application not found.");
  }

  if (round === 1) {
    // Round 1: judges only score the projects assigned to their group.
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
  } else if (!application.isFinalist) {
    // Round 2: every judge scores the finalists, and only the finalists.
    throw new Error("Round 2 scoring is limited to the finalist teams.");
  }

  const pitchScore = cleanScoreValue(formData.get("pitchScore"), "Pitch");
  const iterationScore = cleanScoreValue(
    formData.get("iterationScore"),
    "Iteration",
  );
  const potentialScore = cleanScoreValue(
    formData.get("potentialScore"),
    "Strength",
  );
  const uiUxScore = cleanScoreValue(formData.get("uiUxScore"), "UI/UX");
  const executionScore = cleanScoreValue(
    formData.get("executionScore"),
    "Execution",
  );
  const score = Math.round(
    (pitchScore + iterationScore + potentialScore + uiUxScore + executionScore) /
      5,
  );
  const note = String(formData.get("note") ?? "").trim();

  await prisma.score.upsert({
    where: {
      applicationId_judgeId_round: {
        applicationId: application.id,
        judgeId: judge.id,
        round,
      },
    },
    update: {
      score,
      pitchScore,
      iterationScore,
      potentialScore,
      uiUxScore,
      executionScore,
      note,
    },
    create: {
      hackathonId,
      applicationId: application.id,
      judgeId: judge.id,
      round,
      score,
      pitchScore,
      iterationScore,
      potentialScore,
      uiUxScore,
      executionScore,
      note,
    },
  });

  // A completed round-1 submission may be the last one needed — check whether
  // the top 5 finalists should now be locked in and round 2 opened.
  if (round === 1) {
    await maybePromoteToRoundTwo(hackathonId);
  }

  revalidatePath(`/judge/${hackathonId}`);
  revalidatePath("/judge");
  revalidatePath("/");
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
