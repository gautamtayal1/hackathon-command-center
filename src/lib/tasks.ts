import type { BudgetEntry as PrismaBudgetEntry, Task } from "@/generated/prisma/client";
import { BOARD_COLUMNS, type BoardTask, type BudgetEntry } from "@/lib/board";
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
    where: {
      hackathonId: hackathon.id,
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

export async function getBudgetEntries(): Promise<BudgetEntry[]> {
  const hackathon = await getDefaultHackathon();
  const existing = await prisma.budgetEntry.findMany({
    where: { hackathonId: hackathon.id },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });

  if (existing.length) {
    return existing.map(serializeBudgetEntry);
  }

  const defaults = await prisma.$transaction([
    prisma.budgetEntry.create({
      data: {
        hackathonId: hackathon.id,
        label: "Sponsor revenue",
        type: "INCOME",
        amountCents: 0,
      },
    }),
    prisma.budgetEntry.create({
      data: {
        hackathonId: hackathon.id,
        label: "Food & drinks",
        type: "EXPENSE",
        amountCents: 0,
      },
    }),
    prisma.budgetEntry.create({
      data: {
        hackathonId: hackathon.id,
        label: "Location",
        type: "EXPENSE",
        amountCents: 0,
      },
    }),
    prisma.budgetEntry.create({
      data: {
        hackathonId: hackathon.id,
        label: "Participants",
        type: "EXPENSE",
        amountCents: 0,
      },
    }),
  ]);

  return defaults.map(serializeBudgetEntry);
}
