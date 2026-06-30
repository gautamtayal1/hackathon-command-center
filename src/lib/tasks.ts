import type { Task } from "@/generated/prisma/client";
import { BOARD_COLUMNS, type BoardTask } from "@/lib/board";
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
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export async function getDefaultHackathon() {
  const existing = await prisma.hackathon.findFirst({
    where: { name: DEFAULT_HACKATHON_NAME },
    orderBy: { createdAt: "asc" },
  });

  if (existing) {
    return existing;
  }

  return prisma.hackathon.create({
    data: { name: DEFAULT_HACKATHON_NAME },
  });
}

export async function getBoardTasks(): Promise<BoardTask[]> {
  const hackathon = await getDefaultHackathon();
  const columnOrder = new Map(
    BOARD_COLUMNS.map((column, index) => [column.id, index]),
  );

  const tasks = await prisma.task.findMany({
    where: { hackathonId: hackathon.id },
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
