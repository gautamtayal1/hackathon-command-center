"use client";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Edit3,
  Flag,
  Tag,
  Trash2,
} from "lucide-react";
import type { BoardTask, Priority } from "@/lib/board";

const priorityStyles: Record<Priority, string> = {
  LOW: "border-[var(--azure-line)] bg-[var(--azure-soft)] text-[var(--azure-ink)]",
  MEDIUM: "border-[var(--azure)] bg-[var(--azure-soft)] text-[var(--azure-ink)]",
  HIGH: "border-[var(--pink-line)] bg-[var(--pink-soft)] text-[var(--pink-ink)]",
};

type TaskCardProps = {
  task: BoardTask;
  canMovePrevious: boolean;
  canMoveNext: boolean;
  pending: boolean;
  onEdit: (task: BoardTask) => void;
  onDelete: (id: string) => void;
  onMovePrevious: (task: BoardTask) => void;
  onMoveNext: (task: BoardTask) => void;
};

export function TaskCard({
  task,
  canMovePrevious,
  canMoveNext,
  pending,
  onEdit,
  onDelete,
  onMovePrevious,
  onMoveNext,
}: TaskCardProps) {
  return (
    <article className="group rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--azure-line)] hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-sm font-extrabold leading-5 text-slate-950">
          {task.title}
        </h3>
        <span
          className={`shrink-0 rounded-md border px-2 py-1 text-[11px] font-extrabold ${priorityStyles[task.priority]}`}
        >
          {task.priority.toLowerCase()}
        </span>
      </div>

      {task.description ? (
        <p className="mt-2 line-clamp-3 text-sm leading-5 text-slate-600">
          {task.description}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
        {task.areaLabel ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1">
            <Tag className="size-3.5" aria-hidden="true" />
            {task.areaLabel}
          </span>
        ) : null}
        {task.dueDate ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            {task.dueDate}
          </span>
        ) : null}
        {!task.areaLabel && !task.dueDate ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1">
            <Flag className="size-3.5" aria-hidden="true" />
            ready
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex gap-1">
          <button
            type="button"
            title="Move left"
            aria-label="Move task to previous column"
            disabled={!canMovePrevious || pending}
            onClick={() => onMovePrevious(task)}
            className="grid size-8 place-items-center rounded-md border border-slate-200 text-slate-500 transition hover:border-[var(--azure-line)] hover:bg-[var(--azure-soft)] hover:text-[var(--azure-ink)] disabled:opacity-35"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            title="Move right"
            aria-label="Move task to next column"
            disabled={!canMoveNext || pending}
            onClick={() => onMoveNext(task)}
            className="grid size-8 place-items-center rounded-md border border-slate-200 text-slate-500 transition hover:border-[var(--pink-line)] hover:bg-[var(--pink-soft)] hover:text-[var(--pink-ink)] disabled:opacity-35"
          >
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex gap-1">
          <button
            type="button"
            title="Edit task"
            aria-label="Edit task"
            disabled={pending}
            onClick={() => onEdit(task)}
            className="grid size-8 place-items-center rounded-md border border-slate-200 text-slate-500 transition hover:border-[var(--azure-line)] hover:bg-[var(--azure-soft)] hover:text-[var(--azure-ink)] disabled:opacity-35"
          >
            <Edit3 className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            title="Delete task"
            aria-label="Delete task"
            disabled={pending}
            onClick={() => onDelete(task.id)}
            className="grid size-8 place-items-center rounded-md border border-slate-200 text-slate-500 transition hover:border-[var(--pink-line)] hover:bg-[var(--pink-soft)] hover:text-[var(--pink-ink)] disabled:opacity-35"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
