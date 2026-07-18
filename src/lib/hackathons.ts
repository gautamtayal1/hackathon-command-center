import type { HackathonInput } from "@/lib/board";
import { resolveLumaHackathonDetails } from "@/lib/luma";
import { prisma } from "@/lib/prisma";
import { ensureHackathonPlanningDefaults } from "@/lib/tasks";

type HackathonScope =
  | { mode: "global-preview" }
  | { mode: "workspace"; workspaceId: string };

function scopeWhere(scope: HackathonScope) {
  return scope.mode === "workspace" ? { workspaceId: scope.workspaceId } : {};
}

function scopeWorkspaceId(scope: HackathonScope) {
  return scope.mode === "workspace" ? scope.workspaceId : null;
}

export async function createHackathonFromLumaInScope(
  input: HackathonInput,
  scope: HackathonScope,
) {
  const details = await resolveLumaHackathonDetails(input);
  const hackathon = await prisma.$transaction(async (tx) => {
    await tx.hackathon.updateMany({
      where: scopeWhere(scope),
      data: { isActive: false },
    });

    return tx.hackathon.create({
      data: {
        name: details.name,
        lumaUrl: details.lumaUrl,
        startsAt: details.startsAt,
        isActive: true,
        workspaceId: scopeWorkspaceId(scope),
      },
    });
  });

  await ensureHackathonPlanningDefaults(hackathon.id);

  return hackathon;
}

export async function selectHackathonInScope(
  id: string,
  scope: HackathonScope,
) {
  const hackathon = await prisma.hackathon.findFirst({
    where: { id, ...scopeWhere(scope) },
    select: { id: true },
  });

  if (!hackathon) {
    throw new Error("Hackathon not found.");
  }

  await prisma.$transaction([
    prisma.hackathon.updateMany({
      where: scopeWhere(scope),
      data: { isActive: false },
    }),
    prisma.hackathon.update({
      where: { id },
      data: { isActive: true },
    }),
  ]);
}
