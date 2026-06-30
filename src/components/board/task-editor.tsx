"use client";

import { X } from "lucide-react";
import { BOARD_COLUMNS, PRIORITIES, type BoardTask, type TaskInput } from "@/lib/board";

type TaskEditorProps = {
  mode: "create" | "edit";
  task: BoardTask | null;
  defaultStatus: TaskInput["status"];
  pending: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (input: TaskInput) => void;
};

export function TaskEditor({
  mode,
  task,
  defaultStatus,
  pending,
  error,
  onClose,
  onSubmit,
}: TaskEditorProps) {
  const initial: TaskInput = {
    title: task?.title ?? "",
    description: task?.description ?? "",
    status: task?.status ?? defaultStatus,
    priority: task?.priority ?? "MEDIUM",
    dueDate: task?.dueDate ?? null,
    areaLabel: task?.areaLabel ?? "",
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/55 p-3 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close editor"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <form
        action={(formData) => {
          onSubmit({
            title: String(formData.get("title") ?? ""),
            description: String(formData.get("description") ?? ""),
            status: String(formData.get("status") ?? initial.status) as TaskInput["status"],
            priority: String(formData.get("priority") ?? initial.priority) as TaskInput["priority"],
            dueDate: String(formData.get("dueDate") ?? "") || null,
            areaLabel: String(formData.get("areaLabel") ?? ""),
          });
        }}
        className="relative flex h-full w-full max-w-md flex-col rounded-lg border border-white/15 bg-[var(--glass)] text-white shadow-2xl shadow-black/40 backdrop-blur-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-4">
          <div>
            <p className="text-xs font-black uppercase text-[var(--pink)]">
              {mode === "create" ? "New task" : "Update task"}
            </p>
            <h2 className="font-display mt-1 text-2xl font-semibold text-white">
              {mode === "create" ? "Add board card" : "Edit board card"}
            </h2>
          </div>
          <button
            type="button"
            title="Close"
            aria-label="Close"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-md border border-white/15 text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <label className="block">
            <span className="text-xs font-extrabold uppercase text-white/60">
              Title
            </span>
            <input
              name="title"
              required
              defaultValue={initial.title}
              className="mt-2 h-11 w-full rounded-md border border-white/15 bg-black/24 px-3 text-sm font-bold text-white outline-none transition placeholder:text-white/35 focus:border-[var(--azure)] focus:ring-4 focus:ring-[rgba(21,181,176,0.18)]"
              placeholder="Secure mentor intros"
            />
          </label>

          <label className="block">
            <span className="text-xs font-extrabold uppercase text-white/60">
              Description
            </span>
            <textarea
              name="description"
              defaultValue={initial.description}
              rows={5}
              className="mt-2 w-full resize-none rounded-md border border-white/15 bg-black/24 px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[var(--azure)] focus:ring-4 focus:ring-[rgba(21,181,176,0.18)]"
              placeholder="Notes, reminders, names, links, or judging context."
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-extrabold uppercase text-white/60">
                Column
              </span>
              <select
                name="status"
                defaultValue={initial.status}
                className="mt-2 h-11 w-full rounded-md border border-white/15 bg-black/24 px-3 text-sm font-bold text-white outline-none transition focus:border-[var(--azure)] focus:ring-4 focus:ring-[rgba(21,181,176,0.18)]"
              >
                {BOARD_COLUMNS.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-extrabold uppercase text-white/60">
                Priority
              </span>
              <select
                name="priority"
                defaultValue={initial.priority}
                className="mt-2 h-11 w-full rounded-md border border-white/15 bg-black/24 px-3 text-sm font-bold text-white outline-none transition focus:border-[var(--azure)] focus:ring-4 focus:ring-[rgba(21,181,176,0.18)]"
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority.id} value={priority.id}>
                    {priority.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-extrabold uppercase text-white/60">
                Due date
              </span>
              <input
                name="dueDate"
                type="date"
                defaultValue={initial.dueDate ?? ""}
                className="mt-2 h-11 w-full rounded-md border border-white/15 bg-black/24 px-3 text-sm font-bold text-white outline-none transition focus:border-[var(--azure)] focus:ring-4 focus:ring-[rgba(21,181,176,0.18)]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-extrabold uppercase text-white/60">
                Area
              </span>
              <input
                name="areaLabel"
                defaultValue={initial.areaLabel}
                className="mt-2 h-11 w-full rounded-md border border-white/15 bg-black/24 px-3 text-sm font-bold text-white outline-none transition placeholder:text-white/35 focus:border-[var(--azure)] focus:ring-4 focus:ring-[rgba(21,181,176,0.18)]"
                placeholder="judges"
              />
            </label>
          </div>

          {error ? (
            <p className="rounded-md border border-[var(--pink-line)] bg-[var(--pink-soft)] px-3 py-2 text-sm font-bold text-[var(--pink-ink)]">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/10 p-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-md border border-white/15 px-4 text-sm font-extrabold text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="h-10 rounded-md bg-white px-4 text-sm font-extrabold text-slate-950 transition hover:bg-[var(--azure-soft)] disabled:opacity-50"
          >
            {pending ? "Saving" : mode === "create" ? "Create" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
