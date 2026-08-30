"use client";

import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import type { BoardTask } from "@/lib/board";

type TaskCardProps = {
  task: BoardTask;
  pending: boolean;
  locked?: boolean;
  onToggle: (task: BoardTask) => void;
  onEditTitle: (task: BoardTask, title: string) => void;
  onDelete: (id: string) => void;
};

export function TaskCard({
  task,
  pending,
  locked = false,
  onToggle,
  onEditTitle,
  onDelete,
}: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const isOptimistic = task.id.startsWith("optimistic-");

  if (isEditing) {
    return (
      <form
        action={(formData) => {
          onEditTitle(task, String(formData.get("title") ?? ""));
          setIsEditing(false);
        }}
        className="flex min-h-[52px] items-center gap-2 rounded-[20px] bg-p-card px-3 py-2.5"
      >
        <input
          name="title"
          required
          autoFocus
          defaultValue={task.title}
          className="h-8 min-w-0 flex-1 rounded-[16px] border border-transparent bg-surface px-3 text-sm font-medium text-ink outline-none transition focus:border-edge"
        />
        <button
          type="submit"
          disabled={pending}
          title="Save task"
          aria-label="Save task"
          className="grid size-8 place-items-center rounded-[16px] bg-ok-soft text-ok transition hover:bg-ok-line disabled:opacity-50"
        >
          <Check className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          title="Cancel edit"
          aria-label="Cancel edit"
          onClick={() => setIsEditing(false)}
          className="grid size-8 place-items-center rounded-[16px] text-ink-3 transition hover:bg-edge hover:text-white"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </form>
    );
  }

  return (
    <article
      data-task-completed={task.completed ? "true" : "false"}
      data-task-optimistic={isOptimistic ? "true" : "false"}
      data-main-task={locked ? "true" : "false"}
      data-task-id={task.id}
      data-task-title={task.title}
      className={`group flex min-h-[52px] items-center gap-3 rounded-[20px] bg-p-card px-3 py-2.5 transition hover:bg-edge ${
        task.completed ? "text-ink-4" : "text-ink"
      }`}
    >
      <button
        type="button"
        title={task.completed ? "Mark as open" : "Mark as complete"}
        aria-label={task.completed ? "Mark task as open" : "Mark task complete"}
        disabled={pending || isOptimistic}
        onClick={() => onToggle(task)}
        className={`grid size-7 shrink-0 place-items-center rounded-full border transition disabled:opacity-40 ${
          task.completed
            ? "border-ink brand-btn text-white"
            : "border-edge-strong bg-transparent text-ink-4 hover:border-ink hover:text-ink"
        }`}
      >
        {task.completed ? (
          <Check className="size-3.5" aria-hidden="true" />
        ) : null}
      </button>

      <p
        className={`min-w-0 flex-1 truncate text-sm font-medium ${
          task.completed ? "line-through" : ""
        }`}
      >
        {task.title}
      </p>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          title="Edit task"
          aria-label="Edit task"
          disabled={pending || isOptimistic}
          onClick={() => setIsEditing(true)}
          className="grid size-8 place-items-center rounded-[16px] text-ink-3 transition hover:bg-surface-3 hover:text-white disabled:opacity-35"
        >
          <Pencil className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          title="Delete task"
          aria-label="Delete task"
          disabled={pending || isOptimistic}
          onClick={() => onDelete(task.id)}
          className="grid size-8 place-items-center rounded-[16px] text-ink-3 transition hover:bg-surface-3 hover:text-white disabled:opacity-35"
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
