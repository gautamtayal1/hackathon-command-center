"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CircleDollarSign,
  Plus,
  Trash2,
} from "lucide-react";
import {
  BOARD_COLUMNS,
  BUDGET_TYPES,
  type BoardColumnId,
  type BoardTask,
  type BudgetEntry,
  type BudgetInput,
  type TaskInput,
} from "@/lib/board";
import { TaskCard } from "@/components/board/task-card";
import { TaskEditor } from "@/components/board/task-editor";

type BoardActions = {
  createTask: (input: TaskInput) => Promise<void>;
  updateTask: (id: string, input: TaskInput) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskCompletion: (id: string, completed: boolean) => Promise<void>;
  createBudgetEntry: (input: BudgetInput) => Promise<void>;
  updateBudgetEntry: (id: string, input: BudgetInput) => Promise<void>;
  deleteBudgetEntry: (id: string) => Promise<void>;
};

type EditorState =
  | { mode: "closed"; task: null; status: BoardColumnId }
  | { mode: "create"; task: null; status: BoardColumnId }
  | { mode: "edit"; task: BoardTask; status: BoardColumnId };

type BoardProps = {
  initialTasks: BoardTask[];
  budgetEntries: BudgetEntry[];
  actions: BoardActions;
};

export function Board({ initialTasks, budgetEntries, actions }: BoardProps) {
  const router = useRouter();
  const [editor, setEditor] = useState<EditorState>({
    mode: "closed",
    task: null,
    status: "FOOD_DRINKS",
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

  const completedTasks = initialTasks.filter((task) => task.completed).length;
  const remainingTasks = initialTasks.length - completedTasks;
  const completionRate = initialTasks.length
    ? Math.round((completedTasks / initialTasks.length) * 100)
    : 0;

  const budget = useMemo(() => {
    const incomeCents = budgetEntries
      .filter((entry) => entry.type === "INCOME")
      .reduce((total, entry) => total + entry.amountCents, 0);
    const expenseCents = budgetEntries
      .filter((entry) => entry.type === "EXPENSE")
      .reduce((total, entry) => total + entry.amountCents, 0);

    return {
      incomeCents,
      expenseCents,
      netCents: incomeCents - expenseCents,
    };
  }, [budgetEntries]);

  function closeEditor() {
    if (isPending) {
      return;
    }

    setError("");
    setEditor({ mode: "closed", task: null, status: "FOOD_DRINKS" });
  }

  function refreshAfterMutation() {
    router.refresh();
  }

  function runMutation(mutation: () => Promise<void>, fallbackError: string) {
    setError("");
    startTransition(async () => {
      try {
        await mutation();
        refreshAfterMutation();
      } catch (mutationError) {
        setError(
          mutationError instanceof Error ? mutationError.message : fallbackError,
        );
      }
    });
  }

  function submitTask(input: TaskInput) {
    runMutation(async () => {
      if (editor.mode === "edit" && editor.task) {
        await actions.updateTask(editor.task.id, input);
      } else {
        await actions.createTask(input);
      }

      setEditor({ mode: "closed", task: null, status: "FOOD_DRINKS" });
    }, "Could not save this task.");
  }

  function createBudgetEntry(formData: FormData) {
    runMutation(
      () =>
        actions.createBudgetEntry({
          label: String(formData.get("label") ?? ""),
          type: String(formData.get("type") ?? "EXPENSE") as BudgetInput["type"],
          amount: String(formData.get("amount") ?? "0"),
        }),
      "Could not add this budget line.",
    );
  }

  function updateBudgetEntry(id: string, formData: FormData) {
    runMutation(
      () =>
        actions.updateBudgetEntry(id, {
          label: String(formData.get("label") ?? ""),
          type: String(formData.get("type") ?? "EXPENSE") as BudgetInput["type"],
          amount: String(formData.get("amount") ?? "0"),
        }),
      "Could not update this budget line.",
    );
  }

  return (
    <div className="mx-auto flex max-w-[1560px] flex-col gap-5">
      <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md bg-[var(--azure-soft)] px-3 py-1 text-xs font-black text-[var(--azure-ink)]">
              <Banknote className="size-4" aria-hidden="true" />
              admin planning
            </div>
            <h1 className="font-display mt-3 text-4xl font-black leading-none text-slate-950 sm:text-5xl">
              Hackathon Admin
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
              Budget, profit/loss, and the recurring work needed to organize the
              hackathon.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[420px]">
            <Metric label="Done" value={`${completionRate}%`} tone="azure" />
            <Metric label="Missing" value={remainingTasks} tone="pink" />
            <Metric
              label={budget.netCents >= 0 ? "Profit" : "Loss"}
              value={formatCurrency(Math.abs(budget.netCents))}
              tone={budget.netCents >= 0 ? "azure" : "pink"}
            />
          </div>
        </div>
      </header>

      {error ? (
        <div className="rounded-md border border-[var(--pink-line)] bg-[var(--pink-soft)] px-4 py-3 text-sm font-bold text-[var(--pink-ink)]">
          {error}
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[430px_minmax(0,1fr)]">
        <BudgetPanel
          entries={budgetEntries}
          incomeCents={budget.incomeCents}
          expenseCents={budget.expenseCents}
          netCents={budget.netCents}
          pending={isPending}
          onCreate={createBudgetEntry}
          onUpdate={updateBudgetEntry}
          onDelete={(id) =>
            runMutation(
              () => actions.deleteBudgetEntry(id),
              "Could not delete this budget line.",
            )
          }
        />

        <section className="grid gap-4 lg:grid-cols-2">
          {BOARD_COLUMNS.map((column) => {
            const columnTasks = tasksByStatus.get(column.id) ?? [];
            const completed = columnTasks.filter((task) => task.completed).length;
            const progress = columnTasks.length
              ? Math.round((completed / columnTasks.length) * 100)
              : 0;
            const isPink = column.accent === "pink";

            return (
              <div
                key={column.id}
                className="flex min-h-[410px] flex-col rounded-lg border border-slate-200 bg-white shadow-sm"
              >
                <div className="border-b border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-black text-slate-950">
                        {column.title}
                      </h2>
                      <p className="mt-1 text-sm font-medium leading-5 text-slate-500">
                        {column.description}
                      </p>
                    </div>
                    <span
                      className={`rounded-md px-2.5 py-1 text-xs font-black ${
                        isPink
                          ? "bg-[var(--pink)] text-white"
                          : "bg-[var(--azure)] text-white"
                      }`}
                    >
                      {completed}/{columnTasks.length}
                    </span>
                  </div>

                  <div className="mt-4 h-2 rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        isPink ? "bg-[var(--pink)]" : "bg-[var(--azure)]"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      setError("");
                      setEditor({ mode: "create", task: null, status: column.id });
                    }}
                    className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm font-extrabold text-slate-600 transition hover:border-[var(--azure)] hover:bg-[var(--azure-soft)] hover:text-[var(--azure-ink)] disabled:opacity-50"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    Add task
                  </button>
                </div>

                <div className="flex-1 space-y-3 p-4">
                  {columnTasks.length ? (
                    columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        pending={isPending}
                        onToggle={(selectedTask) =>
                          runMutation(
                            () =>
                              actions.toggleTaskCompletion(
                                selectedTask.id,
                                !selectedTask.completed,
                              ),
                            "Could not update this task.",
                          )
                        }
                        onEdit={(selectedTask) => {
                          setError("");
                          setEditor({
                            mode: "edit",
                            task: selectedTask,
                            status: selectedTask.status,
                          });
                        }}
                        onDelete={(id) =>
                          runMutation(
                            () => actions.deleteTask(id),
                            "Could not delete this task.",
                          )
                        }
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
                      Add the first admin task here.
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>
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

function BudgetPanel({
  entries,
  incomeCents,
  expenseCents,
  netCents,
  pending,
  onCreate,
  onUpdate,
  onDelete,
}: {
  entries: BudgetEntry[];
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  pending: boolean;
  onCreate: (formData: FormData) => void;
  onUpdate: (id: string, formData: FormData) => void;
  onDelete: (id: string) => void;
}) {
  const isProfit = netCents >= 0;

  return (
    <aside className="rounded-lg border border-slate-200 bg-slate-950 p-4 text-white shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-[var(--azure)]">
            Budget
          </p>
          <h2 className="font-display mt-1 text-3xl font-black">
            Profit / Loss
          </h2>
        </div>
        <span
          className={`rounded-md px-3 py-1 text-sm font-black ${
            isProfit
              ? "bg-[var(--azure-soft)] text-[var(--azure-ink)]"
              : "bg-[var(--pink-soft)] text-[var(--pink-ink)]"
          }`}
        >
          {isProfit ? "profit" : "loss"}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2">
        <MoneyStat
          icon="income"
          label="Income"
          value={formatCurrency(incomeCents)}
          tone="azure"
        />
        <MoneyStat
          icon="expense"
          label="Costs"
          value={formatCurrency(expenseCents)}
          tone="pink"
        />
        <MoneyStat
          icon="net"
          label="Net result"
          value={`${isProfit ? "+" : "-"}${formatCurrency(Math.abs(netCents))}`}
          tone={isProfit ? "azure" : "pink"}
        />
      </div>

      <div className="mt-5 space-y-3">
        {entries.map((entry) => (
          <form
            key={entry.id}
            action={(formData) => onUpdate(entry.id, formData)}
            className="rounded-md border border-white/10 bg-white/5 p-3"
          >
            <div className="grid grid-cols-[1fr_96px] gap-2">
              <input
                name="label"
                defaultValue={entry.label}
                className="h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm font-bold text-white outline-none focus:border-[var(--azure)]"
              />
              <input
                name="amount"
                inputMode="decimal"
                defaultValue={(entry.amountCents / 100).toFixed(2)}
                className="h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm font-bold text-white outline-none focus:border-[var(--azure)]"
              />
            </div>
            <div className="mt-2 grid grid-cols-[1fr_auto_auto] gap-2">
              <select
                name="type"
                defaultValue={entry.type}
                className="h-9 rounded-md border border-white/10 bg-black/20 px-3 text-sm font-bold text-white outline-none focus:border-[var(--azure)]"
              >
                {BUDGET_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.title}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={pending}
                className="h-9 rounded-md bg-white px-3 text-sm font-black text-slate-950 transition hover:bg-[var(--azure-soft)] disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                title="Delete budget line"
                aria-label="Delete budget line"
                disabled={pending}
                onClick={() => onDelete(entry.id)}
                className="grid size-9 place-items-center rounded-md border border-white/10 text-white/70 transition hover:border-[var(--pink)] hover:text-[var(--pink)] disabled:opacity-50"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </div>
          </form>
        ))}
      </div>

      <form action={onCreate} className="mt-4 rounded-md bg-white p-3 text-slate-950">
        <p className="text-sm font-black">Add budget line</p>
        <div className="mt-3 grid grid-cols-[1fr_96px] gap-2">
          <input
            name="label"
            placeholder="AV equipment"
            className="h-10 rounded-md border border-slate-200 px-3 text-sm font-bold outline-none focus:border-[var(--azure)]"
          />
          <input
            name="amount"
            inputMode="decimal"
            placeholder="250"
            className="h-10 rounded-md border border-slate-200 px-3 text-sm font-bold outline-none focus:border-[var(--azure)]"
          />
        </div>
        <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
          <select
            name="type"
            defaultValue="EXPENSE"
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-[var(--azure)]"
          >
            {BUDGET_TYPES.map((type) => (
              <option key={type.id} value={type.id}>
                {type.title}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={pending}
            className="h-10 rounded-md bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-[var(--azure-ink)] disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </form>
    </aside>
  );
}

function MoneyStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: "income" | "expense" | "net";
  label: string;
  value: string;
  tone: "azure" | "pink";
}) {
  const Icon =
    icon === "income"
      ? ArrowUpRight
      : icon === "expense"
        ? ArrowDownRight
        : CircleDollarSign;

  return (
    <div className="flex items-center justify-between rounded-md bg-white/7 px-3 py-3">
      <div className="flex items-center gap-2">
        <span
          className={`grid size-8 place-items-center rounded-md ${
            tone === "azure"
              ? "bg-[var(--azure-soft)] text-[var(--azure-ink)]"
              : "bg-[var(--pink-soft)] text-[var(--pink-ink)]"
          }`}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <span className="text-sm font-bold text-white/72">{label}</span>
      </div>
      <span className="font-display text-xl font-black">{value}</span>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "azure" | "pink";
}) {
  const toneClass =
    tone === "azure"
      ? "border-[var(--azure-line)] bg-[var(--azure-soft)] text-[var(--azure-ink)]"
      : "border-[var(--pink-line)] bg-[var(--pink-soft)] text-[var(--pink-ink)]";

  return (
    <div className={`rounded-md border p-3 ${toneClass}`}>
      <div className="text-2xl font-black leading-none">{value}</div>
      <div className="mt-1 text-[11px] font-black uppercase">{label}</div>
    </div>
  );
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
