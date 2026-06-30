"use server";

import { revalidatePath } from "next/cache";
import {
  isBoardColumnId,
  isPriority,
  type BoardColumnId,
  type TaskInput,
} from "@/lib/board";
import { prisma } from "@/lib/prisma";
import { getDefaultHackathon } from "@/lib/tasks";

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
  };
}

export async function createTask(input: TaskInput) {
  const hackathon = await getDefaultHackathon();
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
}

export async function updateTask(id: string, input: TaskInput) {
  const data = cleanInput(input);

  await prisma.task.update({
    where: { id },
    data,
  });

  revalidatePath("/");
}

export async function deleteTask(id: string) {
  await prisma.task.delete({
    where: { id },
  });

  revalidatePath("/");
}

export async function moveTask(id: string, status: BoardColumnId) {
  if (!isBoardColumnId(status)) {
    throw new Error("Task status is not valid.");
  }

  const sortOrder = await prisma.task.count({
    where: { status },
  });

  await prisma.task.update({
    where: { id },
    data: { status, sortOrder },
  });

  revalidatePath("/");
}
