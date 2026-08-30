import "server-only";

import { redirect } from "next/navigation";
import { isJudgePath } from "@/lib/judging";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export class AccessDeniedError extends Error {
  constructor(message = "You do not have access to this area.") {
    super(message);
    this.name = "AccessDeniedError";
  }
}

export type DrakiUser = {
  id: string;
  email: string;
  name: string;
};

export async function getCurrentUser(): Promise<DrakiUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    return null;
  }

  const { data } = await supabase.auth.getUser();
  const email =
    data.user?.email ??
    (typeof claimsData.claims.email === "string"
      ? claimsData.claims.email
      : "");
  const metadata = data.user?.user_metadata;
  const name =
    typeof metadata?.name === "string"
      ? metadata.name
      : typeof metadata?.full_name === "string"
        ? metadata.full_name
        : "";

  return {
    id: claimsData.claims.sub,
    email: email.toLowerCase(),
    name,
  };
}

export async function requireUser(next = "/") {
  const user = await getCurrentUser();

  if (!user) {
    const loginPath = isJudgePath(next) ? "/judge/login" : "/admin/login";

    redirect(`${loginPath}?next=${encodeURIComponent(next)}`);
  }

  return user;
}

export async function upsertUserProfile(user: DrakiUser) {
  return prisma.userProfile.upsert({
    where: { id: user.id },
    update: {
      email: user.email,
      name: user.name,
    },
    create: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });
}

export async function getAdminContext() {
  const user = await requireUser("/");
  await upsertUserProfile(user);

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });

  if (membership) {
    await assignOrphanHackathonsToWorkspace(membership.workspaceId);
    return { user, membership, workspace: membership.workspace };
  }

  const memberCount = await prisma.workspaceMember.count();

  if (memberCount > 0) {
    throw new AccessDeniedError("This account is not a Draki admin.");
  }

  const existingWorkspace = await prisma.workspace.findFirst({
    orderBy: { createdAt: "asc" },
  });
  const workspace =
    existingWorkspace ??
    (await prisma.workspace.create({
      data: {
        name: "Personal account",
      },
    }));

  await prisma.workspaceMember.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      role: "OWNER",
    },
  });
  const createdMembership = await prisma.workspaceMember.findFirstOrThrow({
    where: { workspaceId: workspace.id, userId: user.id },
    include: { workspace: true },
  });

  await assignOrphanHackathonsToWorkspace(workspace.id);

  return { user, membership: createdMembership, workspace };
}

export async function requireAdminForHackathon(hackathonId: string) {
  const context = await getAdminContext();
  const hackathon = await prisma.hackathon.findUnique({
    where: { id: hackathonId },
    select: { id: true, workspaceId: true },
  });

  if (!hackathon) {
    throw new AccessDeniedError("Hackathon not found.");
  }

  if (!hackathon.workspaceId) {
    await prisma.hackathon.update({
      where: { id: hackathon.id },
      data: { workspaceId: context.workspace.id },
    });
    return context;
  }

  if (hackathon.workspaceId !== context.workspace.id) {
    throw new AccessDeniedError();
  }

  return context;
}

type JudgeRow = NonNullable<Awaited<ReturnType<typeof findJudgeRow>>>;

export type JudgeLookup =
  | { status: "no-session" }
  | { status: "not-a-judge" }
  | { status: "ok"; user: DrakiUser; judge: JudgeRow };

async function findJudgeRow(hackathonId: string, user: DrakiUser) {
  return prisma.judge.findFirst({
    where: {
      hackathonId,
      OR: [{ userId: user.id }, { email: user.email }],
      inviteStatus: { not: "REVOKED" },
    },
    include: { hackathon: true },
  });
}

/**
 * Same lookup as requireJudgeForHackathon but it reports a missing session
 * instead of redirecting. Server actions use this so a token that expired
 * while a scoring page sat open cannot navigate the judge away mid-score.
 */
export async function lookupJudgeForHackathon(
  hackathonId: string,
): Promise<JudgeLookup> {
  const user = await getCurrentUser();

  if (!user) {
    return { status: "no-session" };
  }

  await upsertUserProfile(user);

  const judge = await findJudgeRow(hackathonId, user);

  if (!judge) {
    return { status: "not-a-judge" };
  }

  if (!judge.userId || judge.inviteStatus !== "ACCEPTED") {
    await prisma.judge.update({
      where: { id: judge.id },
      data: {
        userId: user.id,
        inviteStatus: "ACCEPTED",
        acceptedAt: judge.acceptedAt ?? new Date(),
      },
    });
  }

  return { status: "ok", user, judge };
}

export async function requireJudgeForHackathon(
  hackathonId: string,
  nextPath = `/judge/${hackathonId}`,
) {
  const lookup = await lookupJudgeForHackathon(hackathonId);

  if (lookup.status === "no-session") {
    const loginPath = isJudgePath(nextPath) ? "/judge/login" : "/admin/login";

    redirect(`${loginPath}?next=${encodeURIComponent(nextPath)}`);
  }

  if (lookup.status === "not-a-judge") {
    throw new AccessDeniedError("You are not assigned to judge this hackathon.");
  }

  return { user: lookup.user, judge: lookup.judge };
}

async function assignOrphanHackathonsToWorkspace(workspaceId: string) {
  await prisma.hackathon.updateMany({
    where: { workspaceId: null },
    data: { workspaceId },
  });
}
