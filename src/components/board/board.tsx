"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plus, Sparkles, UsersRound } from "lucide-react";
import {
  BOARD_COLUMNS,
  type BoardColumnId,
  type BoardTask,
  type TaskInput,
} from "@/lib/board";
import { TaskCard } from "@/components/board/task-card";
import { TaskEditor } from "@/components/board/task-editor";

type BoardActions = {
  createTask: (input: TaskInput) => Promise<void>;
  updateTask: (id: string, input: TaskInput) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (id: string, status: BoardColumnId) => Promise<void>;
};

type EditorState =
  | { mode: "closed"; task: null; status: BoardColumnId }
  | { mode: "create"; task: null; status: BoardColumnId }
  | { mode: "edit"; task: BoardTask; status: BoardColumnId };

type BoardProps = {
  initialTasks: BoardTask[];
  actions: BoardActions;
};

export function Board({ initialTasks, actions }: BoardProps) {
  const router = useRouter();
  const [editor, setEditor] = useState<EditorState>({
    mode: "closed",
    task: null,
    status: "RESEARCH",
  });
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const tasksByStatus = useMemo(() => {
    const grouped = new Map<BoardColumnId, BoardTask[]>();
    for (const column of BOARD_COLUMNS) {
      grouped.set(column.id, []);
    }

    for (const task of initialTasks) {
      grouped.get(task.status)?.push(task);
    }

    return grouped;
  }, [initialTasks]);

  const totalOpenTasks = initialTasks.filter((task) => task.status !== "DONE").length;
  const highPriorityTasks = initialTasks.filter((task) => task.priority === "HIGH").length;
  const finalistTasks = initialTasks.filter((task) => task.status === "FINALS").length;

  function closeEditor() {
    if (isPending) {
      return;
    }

    setError("");
    setEditor({ mode: "closed", task: null, status: "RESEARCH" });
  }

  function refreshAfterMutation() {
    router.refresh();
  }

  function submitTask(input: TaskInput) {
    setError("");
    startTransition(async () => {
      try {
        if (editor.mode === "edit" && editor.task) {
          await actions.updateTask(editor.task.id, input);
        } else {
          await actions.createTask(input);
        }

        setEditor({ mode: "closed", task: null, status: "RESEARCH" });
        refreshAfterMutation();
      } catch (mutationError) {
        setError(
          mutationError instanceof Error
            ? mutationError.message
            : "Could not save this task.",
        );
      }
    });
  }

  function deleteTask(id: string) {
    setError("");
    startTransition(async () => {
      try {
        await actions.deleteTask(id);
        refreshAfterMutation();
      } catch {
        setError("Could not delete this task.");
      }
    });
  }

  function moveTask(task: BoardTask, direction: -1 | 1) {
    const currentIndex = BOARD_COLUMNS.findIndex((column) => column.id === task.status);
    const nextColumn = BOARD_COLUMNS[currentIndex + direction];

    if (!nextColumn) {
      return;
    }

    setError("");
    startTransition(async () => {
      try {
        await actions.moveTask(task.id, nextColumn.id);
        refreshAfterMutation();
      } catch {
        setError("Could not move this task.");
      }
    });
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-40px)] max-w-[1780px] flex-col overflow-hidden rounded-[34px] border-[3px] border-white/25 bg-[rgba(4,15,18,0.42)] p-4 shadow-2xl shadow-black/30 backdrop-blur-md sm:rounded-[44px] sm:p-7">
      <header className="flex items-center justify-between gap-4 px-1 py-1 text-white">
        <div className="inline-flex items-center gap-2 text-sm font-extrabold">
          <span className="grid size-9 place-items-center rounded-full bg-[var(--pink)] text-white shadow-lg shadow-pink-950/30">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          Hackathon
        </div>

        <nav className="hidden items-center gap-7 text-sm font-semibold text-white/75 md:flex">
          <span>Board</span>
          <span>Judges</span>
          <span>Teams</span>
          <span>Finals</span>
        </nav>

        <button
          type="button"
          onClick={() => {
            setError("");
            setEditor({ mode: "create", task: null, status: "RESEARCH" });
          }}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-sm font-extrabold text-slate-950 transition hover:bg-[var(--azure-soft)]"
        >
          <Plus className="size-4" aria-hidden="true" />
          New Task
        </button>
      </header>

      <section className="grid gap-6 px-1 pb-5 pt-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-extrabold text-white backdrop-blur">
            <Sparkles className="size-3.5" aria-hidden="true" />
            command center
          </div>
          <h1 className="font-display mt-5 max-w-5xl text-5xl font-light leading-[0.88] text-white sm:text-7xl lg:text-8xl">
            Hackathon
            <span className="block text-white/42">Planning</span>
            <span className="block">Board</span>
          </h1>
          <p className="mt-6 max-w-xl text-sm font-semibold leading-6 text-white/78 sm:text-base">
            Research, judges, campaigns, submissions, first-round review, and
            finals work in one focused board.
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-[var(--glass)] p-4 text-white shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-[var(--azure-line)]">Current sprint</p>
              <h2 className="font-display mt-1 text-2xl font-semibold leading-7">
                Build-ready hackathon ops
              </h2>
            </div>
            <span className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/10 text-[var(--azure-line)]">
              <UsersRound className="size-4" aria-hidden="true" />
            </span>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <Metric label="Open" value={totalOpenTasks} tone="blue" />
            <Metric label="High" value={highPriorityTasks} tone="pink" />
            <Metric label="Finals" value={finalistTasks} tone="ink" />
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-md bg-black/22 px-3 py-2 text-sm font-semibold text-white/75">
            <CheckCircle2 className="size-4 text-[var(--azure)]" aria-hidden="true" />
            Saved to local SQLite
          </div>
        </div>
      </section>

      {error && editor.mode === "closed" ? (
        <div className="mb-4 rounded-md border border-[var(--pink-line)] bg-[var(--pink-soft)] px-4 py-3 text-sm font-bold text-[var(--pink-ink)]">
          {error}
        </div>
      ) : null}

      <section className="overflow-x-auto pb-2">
        <div className="grid min-w-[1180px] grid-cols-7 gap-3">
          {BOARD_COLUMNS.map((column, index) => {
            const columnTasks = tasksByStatus.get(column.id) ?? [];
            const isPink = column.accent === "pink";

            return (
              <div
                key={column.id}
                className="flex max-h-[calc(100vh-330px)] min-h-[440px] flex-col rounded-lg border border-white/15 bg-white/92 shadow-xl shadow-black/10 backdrop-blur"
              >
                <div
                  className={`border-b p-3 ${
                    isPink
                      ? "border-[var(--pink-line)] bg-[var(--pink-soft)]/80"
                      : "border-[var(--azure-line)] bg-[var(--azure-soft)]/80"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-black text-slate-950">
                      {column.title}
                    </h2>
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-black ${
                        isPink
                          ? "bg-[var(--pink)] text-white"
                          : "bg-[var(--azure)] text-white"
                      }`}
                    >
                      {columnTasks.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setEditor({ mode: "create", task: null, status: column.id });
                    }}
                    className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-white/80 text-xs font-black text-slate-600 transition hover:border-[var(--azure)] hover:bg-white hover:text-[var(--azure-ink)]"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    Add
                  </button>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto p-3">
                  {columnTasks.length ? (
                    columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        pending={isPending}
                        canMovePrevious={index > 0}
                        canMoveNext={index < BOARD_COLUMNS.length - 1}
                        onEdit={(selectedTask) => {
                          setError("");
                          setEditor({
                            mode: "edit",
                            task: selectedTask,
                            status: selectedTask.status,
                          });
                        }}
                        onDelete={deleteTask}
                        onMovePrevious={(selectedTask) => moveTask(selectedTask, -1)}
                        onMoveNext={(selectedTask) => moveTask(selectedTask, 1)}
                      />
                    ))
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setEditor({ mode: "create", task: null, status: column.id })
                      }
                      className="flex min-h-32 w-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 text-center text-sm font-bold text-slate-400 transition hover:border-[var(--azure)] hover:bg-[var(--azure-soft)] hover:text-[var(--azure-ink)]"
                    >
                      Add the first task here.
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {editor.mode !== "closed" ? (
        <TaskEditor
          mode={editor.mode}
          task={editor.task}
          defaultStatus={editor.status}
          pending={isPending}
          error={error}
          onClose={closeEditor}
          onSubmit={submitTask}
        />
      ) : null}
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "blue" | "pink" | "ink";
}) {
  const toneClass = {
    blue: "border-[var(--azure-line)] bg-[var(--azure-soft)] text-[var(--azure-ink)]",
    pink: "border-[var(--pink-line)] bg-[var(--pink-soft)] text-[var(--pink-ink)]",
    ink: "border-slate-200 bg-slate-950 text-white",
  }[tone];

  return (
    <div className={`rounded-md border p-3 ${toneClass}`}>
      <div className="text-2xl font-black leading-none">{value}</div>
      <div className="mt-1 text-[11px] font-black uppercase">
        {label}
      </div>
    </div>
  );
}
