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
    completed: task?.completed ?? false,
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
            completed: formData.get("completed") === "on",
          });
        }}
        className="relative flex h-full w-full max-w-md flex-col rounded-lg border border-slate-200 bg-white text-slate-950 shadow-2xl shadow-black/30"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4">
          <div>
            <p className="text-xs font-black uppercase text-[var(--pink)]">
              {mode === "create" ? "New task" : "Update task"}
            </p>
            <h2 className="font-display mt-1 text-2xl font-black text-slate-950">
              {mode === "create" ? "Add admin task" : "Edit admin task"}
            </h2>
          </div>
          <button
            type="button"
            title="Close"
            aria-label="Close"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-100"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <label className="block">
            <span className="text-xs font-extrabold uppercase text-slate-500">
              Title
            </span>
            <input
              name="title"
              required
              defaultValue={initial.title}
              className="mt-2 h-11 w-full rounded-md border border-slate-200 px-3 text-sm font-bold outline-none transition focus:border-[var(--azure)] focus:ring-4 focus:ring-[rgba(21,181,176,0.16)]"
              placeholder="Order lunch for participants"
            />
          </label>

          <label className="block">
            <span className="text-xs font-extrabold uppercase text-slate-500">
              Notes
            </span>
            <textarea
              name="description"
              defaultValue={initial.description}
              rows={5}
              className="mt-2 w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[var(--azure)] focus:ring-4 focus:ring-[rgba(21,181,176,0.16)]"
              placeholder="Vendor, quantity, phone number, invoice note..."
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-extrabold uppercase text-slate-500">
                Admin area
              </span>
              <select
                name="status"
                defaultValue={initial.status}
                className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none transition focus:border-[var(--azure)] focus:ring-4 focus:ring-[rgba(21,181,176,0.16)]"
              >
                {BOARD_COLUMNS.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-extrabold uppercase text-slate-500">
                Priority
              </span>
              <select
                name="priority"
                defaultValue={initial.priority}
                className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none transition focus:border-[var(--azure)] focus:ring-4 focus:ring-[rgba(21,181,176,0.16)]"
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
              <span className="text-xs font-extrabold uppercase text-slate-500">
                Due date
              </span>
              <input
                name="dueDate"
                type="date"
                defaultValue={initial.dueDate ?? ""}
                className="mt-2 h-11 w-full rounded-md border border-slate-200 px-3 text-sm font-bold outline-none transition focus:border-[var(--azure)] focus:ring-4 focus:ring-[rgba(21,181,176,0.16)]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-extrabold uppercase text-slate-500">
                Owner / tag
              </span>
              <input
                name="areaLabel"
                defaultValue={initial.areaLabel}
                className="mt-2 h-11 w-full rounded-md border border-slate-200 px-3 text-sm font-bold outline-none transition focus:border-[var(--azure)] focus:ring-4 focus:ring-[rgba(21,181,176,0.16)]"
                placeholder="Ana / invoice"
              />
            </label>
          </div>

          <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-extrabold text-slate-700">
            <input
              name="completed"
              type="checkbox"
              defaultChecked={initial.completed}
              className="size-4 accent-[var(--azure)]"
            />
            Mark this task as completed
          </label>

          {error ? (
            <p className="rounded-md border border-[var(--pink-line)] bg-[var(--pink-soft)] px-3 py-2 text-sm font-bold text-[var(--pink-ink)]">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-md border border-slate-200 px-4 text-sm font-extrabold text-slate-600 transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="h-10 rounded-md bg-slate-950 px-4 text-sm font-extrabold text-white transition hover:bg-[var(--azure-ink)] disabled:opacity-50"
          >
            {pending ? "Saving" : mode === "create" ? "Create" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
