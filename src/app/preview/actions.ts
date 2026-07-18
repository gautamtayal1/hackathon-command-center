"use server";

import { revalidatePath } from "next/cache";
import {
  DELETED_MAIN_TASK_LABEL,
  isBoardColumnId,
  isPriority,
  MAIN_TASK_LABEL,
  type HackathonInput,
  type TaskInput,
} from "@/lib/board";
import {
  createHackathonFromLumaInScope,
  selectHackathonInScope,
} from "@/lib/hackathons";
import { prisma } from "@/lib/prisma";
import { getActiveHackathon } from "@/lib/tasks";

function cleanPreviewTaskInput(input: TaskInput) {
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

export async function createPreviewTask(input: TaskInput) {
  const hackathon = await getActiveHackathon();
  const data = cleanPreviewTaskInput(input);
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

  revalidatePath("/preview");
}

export async function createPreviewHackathonFromLuma(input: HackathonInput) {
  await createHackathonFromLumaInScope(input, { mode: "global-preview" });

  revalidatePath("/preview");
}

export async function selectPreviewHackathon(id: string) {
  await selectHackathonInScope(id, { mode: "global-preview" });

  revalidatePath("/preview");
}

export async function updatePreviewTask(id: string, input: TaskInput) {
  const data = cleanPreviewTaskInput(input);

  await prisma.task.update({
    where: { id },
    data,
  });

  revalidatePath("/preview");
}

export async function deletePreviewTask(id: string) {
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

  revalidatePath("/preview");
}

export async function togglePreviewTaskCompletion(
  id: string,
  completed: boolean,
) {
  await prisma.task.update({
    where: { id },
    data: { completed },
  });

  revalidatePath("/preview");
}
