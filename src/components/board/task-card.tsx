"use client";

import {
  CalendarDays,
  Check,
  Circle,
  Edit3,
  Flag,
  Tag,
  Trash2,
} from "lucide-react";
import type { BoardTask, Priority } from "@/lib/board";

const priorityStyles: Record<Priority, string> = {
  LOW: "border-[var(--azure-line)] bg-[var(--azure-soft)] text-[var(--azure-ink)]",
  MEDIUM: "border-slate-200 bg-slate-100 text-slate-700",
  HIGH: "border-[var(--pink-line)] bg-[var(--pink-soft)] text-[var(--pink-ink)]",
};

type TaskCardProps = {
  task: BoardTask;
  pending: boolean;
  onToggle: (task: BoardTask) => void;
  onEdit: (task: BoardTask) => void;
  onDelete: (id: string) => void;
};

export function TaskCard({
  task,
  pending,
  onToggle,
  onEdit,
  onDelete,
}: TaskCardProps) {
  return (
    <article
      className={`rounded-lg border p-3 shadow-sm transition ${
        task.completed
          ? "border-[var(--azure-line)] bg-[var(--azure-soft)]/45"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          title={task.completed ? "Mark as missing" : "Mark as complete"}
          aria-label={task.completed ? "Mark task as missing" : "Mark task complete"}
          disabled={pending}
          onClick={() => onToggle(task)}
          className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-md border transition disabled:opacity-40 ${
            task.completed
              ? "border-[var(--azure)] bg-[var(--azure)] text-white"
              : "border-slate-300 bg-white text-slate-400 hover:border-[var(--azure)] hover:text-[var(--azure)]"
          }`}
        >
          {task.completed ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <Circle className="size-4" aria-hidden="true" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={`min-w-0 text-sm font-extrabold leading-5 ${
                task.completed ? "text-slate-500 line-through" : "text-slate-950"
              }`}
            >
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
                admin
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1">
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
    </article>
  );
}
