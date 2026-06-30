"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";
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
    <div className="mx-auto flex max-w-[1720px] flex-col gap-5">
      <header className="px-1 py-3 sm:px-2">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-md border border-pink-200 bg-pink-50 px-2.5 py-1 text-xs font-black uppercase tracking-[0.2em] text-pink-700">
              <Sparkles className="size-3.5" aria-hidden="true" />
              command center
            </div>
            <h1 className="font-display mt-3 text-4xl font-black leading-none text-slate-950 sm:text-5xl">
              Hackathon
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600 sm:text-base">
              Keep research, judges, campaigns, submissions, first-round review,
              and finals work moving.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[420px]">
            <Metric label="Open" value={totalOpenTasks} tone="blue" />
            <Metric label="High" value={highPriorityTasks} tone="pink" />
            <Metric label="Finals" value={finalistTasks} tone="ink" />
          </div>
        </div>
      </header>

      {error && editor.mode === "closed" ? (
        <div className="rounded-lg border border-pink-200 bg-pink-50 px-4 py-3 text-sm font-bold text-pink-700">
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
                className="flex max-h-[calc(100vh-240px)] min-h-[540px] flex-col rounded-lg border border-slate-200 bg-white/80 shadow-sm backdrop-blur"
              >
                <div
                  className={`border-b p-3 ${
                    isPink
                      ? "border-pink-100 bg-pink-50/80"
                      : "border-blue-100 bg-blue-50/80"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-black text-slate-950">
                      {column.title}
                    </h2>
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-black ${
                        isPink
                          ? "bg-pink-600 text-white"
                          : "bg-blue-600 text-white"
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
                    className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-white/80 text-xs font-black uppercase tracking-[0.12em] text-slate-600 transition hover:border-blue-300 hover:bg-white hover:text-blue-700"
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
                      className="flex min-h-32 w-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 text-center text-sm font-bold text-slate-400 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
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
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    pink: "border-pink-200 bg-pink-50 text-pink-700",
    ink: "border-slate-200 bg-slate-950 text-white",
  }[tone];

  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <div className="text-2xl font-black leading-none">{value}</div>
      <div className="mt-1 text-[11px] font-black uppercase tracking-[0.16em]">
        {label}
      </div>
    </div>
  );
}
