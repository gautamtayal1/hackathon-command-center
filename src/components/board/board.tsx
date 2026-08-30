"use client";

import {
  type FormEvent,
  useEffect,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Banknote,
  CalendarDays,
  Check,
  CheckSquare2,
  ChevronDown,
  ClipboardList,
  Copy,
  ExternalLink,
  Link,
  MoreHorizontal,
  PanelLeft,
  PanelLeftClose,
  Plus,
  GripVertical,
  Shuffle,
  Trophy,
  Trash2,
  UsersRound,
  WalletCards,
} from "lucide-react";
import {
  BUDGET_TYPES,
  DEFAULT_BUDGET_LINES,
  MAIN_TASK_LABEL,
  MAIN_TODO_TASKS,
  type BoardColumnId,
  type BoardTask,
  type BudgetEntry,
  type BudgetInput,
  type BudgetType,
  type HackathonInput,
  type HackathonApplication,
  type HackathonSummary,
  type Judge,
  type JudgeGroup,
  type JudgeInput,
  type JudgingApplication,
  type TaskInput,
} from "@/lib/board";
import { TaskCard } from "@/components/board/task-card";
import { BrandMark, Wordmark } from "@/components/brand/wordmark";

type BoardActions = {
  autoGenerateJudgeGroups: () => Promise<void>;
  moveJudgeToGroup: (
    id: string,
    groupId: string | null,
    position?: number,
  ) => Promise<void>;
  createHackathonFromLuma: (input: HackathonInput) => Promise<void>;
  selectHackathon: (id: string) => Promise<void>;
  createTask: (input: TaskInput) => Promise<void>;
  updateTask: (id: string, input: TaskInput) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskCompletion: (id: string, completed: boolean) => Promise<void>;
  createBudgetEntry: (input: BudgetInput) => Promise<void>;
  updateBudgetEntry: (id: string, input: BudgetInput) => Promise<void>;
  deleteBudgetEntry: (id: string) => Promise<void>;
  createJudge: (input: JudgeInput) => Promise<void>;
  updateJudge: (id: string, input: JudgeInput) => Promise<void>;
  deleteJudge: (id: string) => Promise<void>;
  deleteApplication: (id: string) => Promise<void>;
};

type BoardProps = {
  hackathons: HackathonSummary[];
  activeHackathon: HackathonSummary;
  appOrigin: string;
  initialTasks: BoardTask[];
  budgetEntries: BudgetEntry[];
  judges: Judge[];
  applications: HackathonApplication[];
  judgeGroups: JudgeGroup[];
  judgingApplications: JudgingApplication[];
  actions: BoardActions;
};

type ViewId = "todo" | "budget" | "judges" | "applications";

const CUSTOM_TASK_STATUS: BoardColumnId = "PARTICIPANTS";
const MAIN_TASK_ORDER = new Map<string, number>(
  MAIN_TODO_TASKS.map((task, index) => [task.title, index]),
);
const DEFAULT_BUDGET_LABELS = new Set<string>(
  DEFAULT_BUDGET_LINES.map((line) => line.label),
);

type OptimisticTaskAction =
  | { type: "create"; task: BoardTask }
  | {
      type: "update";
      id: string;
      updates: Partial<Pick<BoardTask, "completed" | "title" | "updatedAt">>;
    }
  | { type: "delete"; id: string };

function optimisticTaskReducer(
  tasks: BoardTask[],
  action: OptimisticTaskAction,
) {
  if (action.type === "create") {
    return [...tasks, action.task];
  }

  if (action.type === "delete") {
    return tasks.filter((task) => task.id !== action.id);
  }

  return tasks.map((task) =>
    task.id === action.id ? { ...task, ...action.updates } : task,
  );
}

type OptimisticJudgeAction =
  | { type: "create"; judge: Judge }
  | {
      type: "update";
      id: string;
      updates: Partial<
        Pick<Judge, "email" | "groupId" | "name" | "sortOrder" | "updatedAt">
      >;
    }
  | { type: "move"; groupId: string | null; id: string; position?: number }
  | { type: "delete"; id: string };

type OptimisticJudgeGroupAction = { type: "create"; group: JudgeGroup };

function optimisticJudgeReducer(
  judges: Judge[],
  action: OptimisticJudgeAction,
) {
  if (action.type === "create") {
    return [...judges, action.judge];
  }

  if (action.type === "delete") {
    return judges.filter((judge) => judge.id !== action.id);
  }

  if (action.type === "move") {
    return moveJudgeInOrder(judges, action.id, action.groupId, action.position);
  }

  return judges.map((judge) =>
    judge.id === action.id ? { ...judge, ...action.updates } : judge,
  );
}

function optimisticJudgeGroupReducer(
  groups: JudgeGroup[],
  action: OptimisticJudgeGroupAction,
) {
  if (groups.some((group) => group.id === action.group.id)) {
    return groups;
  }

  return [...groups, action.group].toSorted(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}

function hydrateJudgeGroups(groups: JudgeGroup[], judges: Judge[]) {
  const groupedJudges = new Map<string, JudgeGroup["judges"]>(
    groups.map((group) => [group.id, []]),
  );

  for (const judge of judges) {
    if (!judge.groupId || !groupedJudges.has(judge.groupId)) {
      continue;
    }

    groupedJudges.get(judge.groupId)?.push({
      id: judge.id,
      name: judge.name,
      email: judge.email,
      sortOrder: judge.sortOrder,
    });
  }

  return groups
    .map((group) => ({
      ...group,
      judges: (groupedJudges.get(group.id) ?? []).toSorted(
        (a, b) => a.sortOrder - b.sortOrder,
      ),
    }))
    .toSorted((a, b) => a.sortOrder - b.sortOrder);
}

function moveJudgeInOrder(
  judges: Judge[],
  judgeId: string,
  groupId: string | null,
  position = Number.MAX_SAFE_INTEGER,
) {
  const movingJudge = judges.find((judge) => judge.id === judgeId);

  if (!movingJudge) {
    return judges;
  }

  if (!groupId) {
    return judges.map((judge) =>
      judge.id === judgeId
        ? {
            ...judge,
            groupId: null,
            sortOrder: 0,
            updatedAt: new Date().toISOString(),
          }
        : judge,
    );
  }

  const timestamp = new Date().toISOString();
  const targetJudges = judges
    .filter((judge) => judge.groupId === groupId && judge.id !== judgeId)
    .toSorted(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.name.localeCompare(b.name),
    );
  const insertIndex = Math.max(0, Math.min(position, targetJudges.length));
  const orderedTargetJudges = [
    ...targetJudges.slice(0, insertIndex),
    { ...movingJudge, groupId },
    ...targetJudges.slice(insertIndex),
  ];
  const targetSortOrders = new Map(
    orderedTargetJudges.map((judge, sortOrder) => [judge.id, sortOrder]),
  );

  return judges.map((judge) => {
    const sortOrder = targetSortOrders.get(judge.id);

    if (sortOrder === undefined) {
      return judge;
    }

    return {
      ...judge,
      groupId,
      sortOrder,
      updatedAt: judge.id === judgeId ? timestamp : judge.updatedAt,
    };
  });
}

function getOptimisticJudgeGroup(
  groups: JudgeGroup[],
  groupNumberValue: string,
  idSeed: string,
) {
  const groupNumber = parseGroupNumber(groupNumberValue);

  if (groupNumber !== null) {
    const existingGroup = groups.find(
      (group) =>
        group.sortOrder === groupNumber - 1 || group.name === `Group ${groupNumber}`,
    );

    if (existingGroup) {
      return { group: existingGroup, shouldCreateGroup: false };
    }

    return {
      group: createOptimisticJudgeGroup(groupNumber, idSeed),
      shouldCreateGroup: true,
    };
  }

  const availableGroup = groups.find((group) => group.judges.length < 2);

  if (availableGroup) {
    return { group: availableGroup, shouldCreateGroup: false };
  }

  const usedSortOrders = new Set(groups.map((group) => group.sortOrder));
  let nextSortOrder = 0;

  while (usedSortOrders.has(nextSortOrder)) {
    nextSortOrder += 1;
  }

  return {
    group: createOptimisticJudgeGroup(nextSortOrder + 1, idSeed),
    shouldCreateGroup: true,
  };
}

function createOptimisticJudgeGroup(groupNumber: number, idSeed: string) {
  return {
    id: `optimistic-group-${groupNumber}-${idSeed}`,
    name: `Group ${groupNumber}`,
    sortOrder: groupNumber - 1,
    applicationCount: 0,
    judges: [],
  };
}

function parseGroupNumber(value: string) {
  if (!value.trim()) {
    return null;
  }

  const groupNumber = Number(value);

  return Number.isInteger(groupNumber) && groupNumber >= 1 && groupNumber <= 99
    ? groupNumber
    : null;
}

function normalizeGroupNumberInput(event: FormEvent<HTMLInputElement>) {
  event.currentTarget.value = event.currentTarget.value
    .replace(/\D/g, "")
    .slice(0, 2);
}

function isOptimisticJudgeId(id: string) {
  return id.startsWith("optimistic-judge-");
}

export function Board({
  hackathons,
  activeHackathon,
  appOrigin,
  initialTasks,
  budgetEntries,
  judges,
  applications,
  judgeGroups,
  judgingApplications,
  actions,
}: BoardProps) {
  const router = useRouter();
  const [activeView, setActiveView] = useState<ViewId>("todo");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hackathonComposerOpen, setHackathonComposerOpen] = useState(false);
  const [error, setError] = useState("");
  const [optimisticTasks, addOptimisticTask] = useOptimistic(
    initialTasks,
    optimisticTaskReducer,
  );
  const [optimisticJudges, addOptimisticJudge] = useOptimistic(
    judges,
    optimisticJudgeReducer,
  );
  const [optimisticJudgeGroups, addOptimisticJudgeGroup] = useOptimistic(
    judgeGroups,
    optimisticJudgeGroupReducer,
  );
  const [isPending, startTransition] = useTransition();
  const applicationPath = `/apply/${activeHackathon.id}`;
  const applicationUrl = `${appOrigin}${applicationPath}`;
  const hydratedJudgeGroups = useMemo(
    () => hydrateJudgeGroups(optimisticJudgeGroups, optimisticJudges),
    [optimisticJudgeGroups, optimisticJudges],
  );

  const completedTasks = optimisticTasks.filter((task) => task.completed).length;
  const remainingTasks = optimisticTasks.length - completedTasks;
  const completionRate = optimisticTasks.length
    ? Math.round((completedTasks / optimisticTasks.length) * 100)
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

  useEffect(() => {
    if (activeView !== "applications") {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [activeView, activeHackathon.id, router]);

  function refreshAfterMutation() {
    router.refresh();
  }

  function runMutation(
    mutation: () => Promise<void>,
    fallbackError: string,
    optimisticUpdate?: () => void,
  ) {
    setError("");
    startTransition(async () => {
      optimisticUpdate?.();

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

  function createTask(title: string) {
    const cleanedTitle = title.trim();

    if (!cleanedTitle) {
      return;
    }

    const timestamp = new Date().toISOString();
    const optimisticTask: BoardTask = {
      id: `optimistic-${timestamp}-${Math.random().toString(36).slice(2)}`,
      title: cleanedTitle,
      description: "",
      status: CUSTOM_TASK_STATUS,
      priority: "MEDIUM",
      dueDate: null,
      areaLabel: "",
      completed: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    runMutation(
      () =>
        actions.createTask({
          title: cleanedTitle,
          description: "",
          status: CUSTOM_TASK_STATUS,
          priority: "MEDIUM",
          dueDate: null,
          areaLabel: "",
          completed: false,
        }),
      "Could not add this task.",
      () => addOptimisticTask({ type: "create", task: optimisticTask }),
    );
  }

  function updateTaskTitle(task: BoardTask, title: string) {
    const cleanedTitle = title.trim();

    if (!cleanedTitle) {
      return;
    }

    runMutation(
      () =>
        actions.updateTask(task.id, {
          title: cleanedTitle,
          description: task.description,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate,
          areaLabel: task.areaLabel,
          completed: task.completed,
        }),
      "Could not update this task.",
      () =>
        addOptimisticTask({
          type: "update",
          id: task.id,
          updates: {
            title: cleanedTitle,
            updatedAt: new Date().toISOString(),
          },
        }),
    );
  }

  function toggleTask(task: BoardTask) {
    runMutation(
      () => actions.toggleTaskCompletion(task.id, !task.completed),
      "Could not update this task.",
      () =>
        addOptimisticTask({
          type: "update",
          id: task.id,
          updates: {
            completed: !task.completed,
            updatedAt: new Date().toISOString(),
          },
        }),
    );
  }

  function deleteTask(id: string) {
    runMutation(
      () => actions.deleteTask(id),
      "Could not delete this task.",
      () => addOptimisticTask({ type: "delete", id }),
    );
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

  function createHackathon(formData: FormData) {
    runMutation(
      () =>
        actions.createHackathonFromLuma({
          lumaUrl: String(formData.get("lumaUrl") ?? ""),
        }),
      "Could not add this hackathon.",
    );
  }

  function selectHackathon(id: string) {
    runMutation(
      () => actions.selectHackathon(id),
      "Could not switch hackathons.",
    );
  }

  function createJudge(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const groupNumber = String(formData.get("groupNumber") ?? "").trim();

    if (!name || !email) {
      return;
    }

    const timestamp = new Date().toISOString();
    const { group, shouldCreateGroup } = getOptimisticJudgeGroup(
      hydratedJudgeGroups,
      groupNumber,
      timestamp,
    );
    const optimisticJudge: Judge = {
      id: `optimistic-judge-${timestamp}-${Math.random()
        .toString(36)
        .slice(2)}`,
      name,
      email,
      groupId: group.id,
      sortOrder: group.judges.length,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    runMutation(
      () =>
        actions.createJudge({
          name,
          email,
          groupNumber,
        }),
      "Could not add this judge.",
      () => {
        if (shouldCreateGroup) {
          addOptimisticJudgeGroup({ type: "create", group });
        }

        addOptimisticJudge({ type: "create", judge: optimisticJudge });
      },
    );
  }

  function updateJudge(id: string, formData: FormData) {
    const currentJudge = optimisticJudges.find((judge) => judge.id === id);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const groupNumber = String(formData.get("groupNumber") ?? "").trim();

    if (!currentJudge || !name || !email) {
      return;
    }

    const timestamp = new Date().toISOString();
    const { group, shouldCreateGroup } = getOptimisticJudgeGroup(
      hydratedJudgeGroups,
      groupNumber,
      timestamp,
    );

    runMutation(
      () =>
        actions.updateJudge(id, {
          name,
          email,
          groupNumber,
        }),
      "Could not update this judge.",
      () => {
        if (shouldCreateGroup) {
          addOptimisticJudgeGroup({ type: "create", group });
        }

        addOptimisticJudge({
          type: "update",
          id,
          updates: {
            email,
            groupId: group.id,
            name,
            sortOrder:
              currentJudge.groupId === group.id
                ? currentJudge.sortOrder
                : group.judges.length,
            updatedAt: timestamp,
          },
        });
      },
    );
  }

  return (
    <div
      className={`grid min-h-screen bg-black text-[#f4f4f4] ${
        sidebarCollapsed
          ? "md:grid-cols-[72px_minmax(0,1fr)]"
          : "md:grid-cols-[255px_minmax(0,1fr)]"
      }`}
    >
      <Sidebar
        hackathons={hackathons}
        activeHackathon={activeHackathon}
        activeView={activeView}
        tasksCount={optimisticTasks.length}
        judgesCount={optimisticJudges.length}
        applicationsCount={applications.length}
        budget={budget}
        completionRate={completionRate}
        pending={isPending}
        collapsed={sidebarCollapsed}
        composerOpen={hackathonComposerOpen}
        onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
        onToggleComposer={() => {
          setSidebarCollapsed(false);
          setHackathonComposerOpen((value) => !value);
        }}
        onSelect={setActiveView}
        onCreateHackathon={createHackathon}
        onSelectHackathon={selectHackathon}
      />

      <section className="min-w-0 bg-black">
        <TopBar
          activeHackathon={activeHackathon}
          activeView={activeView}
          completionRate={completionRate}
          remainingTasks={remainingTasks}
          netCents={budget.netCents}
        />

        <main className="mx-auto flex w-full max-w-[980px] flex-col gap-5 px-4 pb-24 pt-9 sm:px-6 lg:px-8">
          {error ? (
            <div className="rounded-2xl border border-[#5c1f2f] bg-[#2d1219] px-4 py-3 text-sm font-medium text-[#ffd1df]">
              {error}
            </div>
          ) : null}

          {activeView === "budget" ? (
            <BudgetWorkspace
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
          ) : activeView === "judges" ? (
            <JudgesWorkspace
              judges={optimisticJudges}
              groups={hydratedJudgeGroups}
              judgingApplications={judgingApplications}
              pending={false}
              onCreate={createJudge}
              onUpdate={updateJudge}
              onMoveJudgeToGroup={(judgeId, groupId, position) =>
                runMutation(
                  () => actions.moveJudgeToGroup(judgeId, groupId, position),
                  "Could not move this judge.",
                  () =>
                    addOptimisticJudge({
                      type: "move",
                      id: judgeId,
                      groupId,
                      position,
                    }),
                )
              }
              onAutoGroups={() =>
                runMutation(
                  () => actions.autoGenerateJudgeGroups(),
                  "Could not generate judge groups.",
                )
              }
              onDelete={(id) =>
                runMutation(
                  () => actions.deleteJudge(id),
                  "Could not delete this judge.",
                  () => addOptimisticJudge({ type: "delete", id }),
                )
              }
            />
          ) : activeView === "applications" ? (
            <ApplicationsWorkspace
              applications={applications}
              applicationUrl={applicationUrl}
              pending={isPending}
              onDelete={(id) =>
                runMutation(
                  () => actions.deleteApplication(id),
                  "Could not delete this application.",
                )
              }
            />
          ) : (
            <TaskWorkspace
              tasks={optimisticTasks}
              pending={false}
              onCreateTask={createTask}
              onUpdateTaskTitle={updateTaskTitle}
              onToggleTask={toggleTask}
              onDeleteTask={deleteTask}
            />
          )}
        </main>
      </section>
    </div>
  );
}

function Sidebar({
  hackathons,
  activeHackathon,
  activeView,
  tasksCount,
  judgesCount,
  applicationsCount,
  budget,
  completionRate,
  pending,
  collapsed,
  composerOpen,
  onToggleCollapsed,
  onToggleComposer,
  onSelect,
  onCreateHackathon,
  onSelectHackathon,
}: {
  hackathons: HackathonSummary[];
  activeHackathon: HackathonSummary;
  activeView: ViewId;
  tasksCount: number;
  judgesCount: number;
  applicationsCount: number;
  budget: { incomeCents: number; expenseCents: number; netCents: number };
  completionRate: number;
  pending: boolean;
  collapsed: boolean;
  composerOpen: boolean;
  onToggleCollapsed: () => void;
  onToggleComposer: () => void;
  onSelect: (view: ViewId) => void;
  onCreateHackathon: (formData: FormData) => void;
  onSelectHackathon: (id: string) => void;
}) {
  const netIsProfit = budget.netCents >= 0;

  return (
    <aside
      className={`flex min-h-screen flex-col border-r border-[#242424] bg-[#070707] px-3 py-3 transition-[width] ${
        collapsed ? "items-center" : ""
      }`}
    >
      <div
        className={`mb-6 flex px-1 ${
          collapsed
            ? "flex-col items-center gap-3"
            : "items-center justify-between"
        }`}
      >
        {collapsed ? <BrandMark size="sm" /> : <Wordmark size="sm" />}
        <button
          type="button"
          title={collapsed ? "Open sidebar" : "Close sidebar"}
          aria-label={collapsed ? "Open sidebar" : "Close sidebar"}
          aria-pressed={collapsed}
          onClick={onToggleCollapsed}
          className="grid size-9 place-items-center rounded-lg text-[#b4b4b4] transition hover:bg-[#1f1f1f] hover:text-white"
        >
          {collapsed ? (
            <PanelLeft className="size-4" aria-hidden="true" />
          ) : (
            <PanelLeftClose className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>

      <nav className="space-y-1 text-sm font-medium" aria-label="Main">
        <button
          type="button"
          onClick={onToggleComposer}
          title="New hackathon"
          aria-label="New hackathon"
          className={`flex h-10 items-center gap-3 rounded-lg text-left text-white transition hover:bg-[#1f1f1f] ${
            collapsed ? "w-10 justify-center px-0" : "w-full px-2"
          }`}
        >
          <Plus className="size-4" aria-hidden="true" />
          {collapsed ? null : "New hackathon"}
        </button>
      </nav>

      <div className={`${collapsed ? "hidden" : "mt-6"}`}>
        <p className="mb-2 px-2 text-xs font-semibold text-[#b4b4b4]">
          Hackathons
        </p>
        <div className="space-y-1">
          {hackathons.map((hackathon) => (
            <button
              key={hackathon.id}
              type="button"
              disabled={pending || hackathon.id === activeHackathon.id}
              onClick={() => onSelectHackathon(hackathon.id)}
              className={`w-full rounded-lg px-2 py-2 text-left transition ${
                hackathon.id === activeHackathon.id
                  ? "bg-[#212121] text-white"
                  : "text-[#ececec] hover:bg-[#1f1f1f]"
              } disabled:cursor-default`}
            >
              <span className="block truncate text-sm font-medium">
                {hackathon.name}
              </span>
              <span className="mt-1 flex items-center gap-1 text-xs text-[#9b9b9b]">
                <CalendarDays className="size-3.5" aria-hidden="true" />
                {formatDate(hackathon.startsAt)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {collapsed ? null : composerOpen ? (
        <form
          action={onCreateHackathon}
          className="mt-3 rounded-2xl bg-[#171717] p-2"
        >
          <p className="px-2 pb-2 text-xs font-semibold text-[#b4b4b4]">
            Luma event link
          </p>
          <div className="flex gap-2">
            <input
              name="lumaUrl"
              required
              inputMode="url"
              placeholder="https://lu.ma/..."
              className="h-10 min-w-0 flex-1 rounded-full border border-[#303030] bg-[#0f0f0f] px-3 text-sm text-[#f4f4f4] outline-none placeholder:text-[#8f8f8f] transition focus:border-[#565656] focus:bg-[#212121]"
            />
            <button
              type="submit"
              disabled={pending}
              title="Add hackathon from Luma"
              aria-label="Add hackathon from Luma"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-[#f4f4f4] text-black transition hover:bg-white disabled:opacity-50"
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
          </div>
        </form>
      ) : null}

      {!collapsed && activeHackathon.lumaUrl ? (
        <a
          href={activeHackathon.lumaUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-[#b4b4b4] transition hover:bg-[#1f1f1f] hover:text-white"
        >
          <ExternalLink className="size-4" aria-hidden="true" />
          Open Luma
        </a>
      ) : null}

      <div className="mt-6">
        {collapsed ? null : (
          <p className="mb-2 px-2 text-xs font-semibold text-[#b4b4b4]">
            Workspace
          </p>
        )}
        <div className="space-y-1">
          <NavButton
            icon={CheckSquare2}
            label="To-do"
            count={tasksCount}
            active={activeView === "todo"}
            collapsed={collapsed}
            onClick={() => onSelect("todo")}
          />
          <NavButton
            icon={WalletCards}
            label="Balance"
            active={activeView === "budget"}
            collapsed={collapsed}
            onClick={() => onSelect("budget")}
          />
          <NavButton
            icon={UsersRound}
            label="Judges"
            count={judgesCount}
            active={activeView === "judges"}
            collapsed={collapsed}
            onClick={() => onSelect("judges")}
          />
          <NavButton
            icon={ClipboardList}
            label="Applications"
            count={applicationsCount}
            active={activeView === "applications"}
            collapsed={collapsed}
            onClick={() => onSelect("applications")}
          />
        </div>
      </div>

      {collapsed ? null : (
        <BalanceCard
          className="mt-auto"
          incomeCents={budget.incomeCents}
          expenseCents={budget.expenseCents}
          completionRate={completionRate}
          netCents={budget.netCents}
          onOpenBudget={() => onSelect("budget")}
          isProfit={netIsProfit}
        />
      )}

      <div
        className={`mt-3 flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-[#ececec] ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <span className="grid size-7 place-items-center rounded-full bg-[#f2a60d] text-xs font-semibold text-black">
          DA
        </span>
        {collapsed ? null : (
          <div className="min-w-0">
            <p className="truncate font-medium">darijan</p>
            <p className="truncate text-xs text-[#9b9b9b]">Personal account</p>
          </div>
        )}
      </div>
    </aside>
  );
}

function TopBar({
  activeHackathon,
  activeView,
  completionRate,
  remainingTasks,
  netCents,
}: {
  activeHackathon: HackathonSummary;
  activeView: ViewId;
  completionRate: number;
  remainingTasks: number;
  netCents: number;
}) {
  const title =
    activeView === "todo"
      ? "To-do"
      : activeView === "budget"
        ? "Balance"
        : activeView === "judges"
          ? "Judges"
          : "Applications";

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-transparent bg-black/85 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-[#ececec] transition hover:bg-[#1f1f1f]"
      >
        {title}
        <span className="text-[#8f8f8f]">/</span>
        <span className="max-w-[38vw] truncate text-[#b4b4b4]">
          {activeHackathon.name}
        </span>
      </button>

      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-2 rounded-full border border-[#303030] px-3 py-1.5 text-xs font-medium text-[#b4b4b4] sm:inline-flex">
          <CalendarDays className="size-3.5" aria-hidden="true" />
          {formatDate(activeHackathon.startsAt)}
        </span>
        <Metric label="Done" value={`${completionRate}%`} />
        <Metric label="Open" value={remainingTasks} />
        <Metric
          label={netCents >= 0 ? "Profit" : "Loss"}
          value={formatCurrency(Math.abs(netCents))}
        />
        {activeHackathon.lumaUrl ? (
          <a
            href={activeHackathon.lumaUrl}
            target="_blank"
            rel="noreferrer"
            className="grid size-9 place-items-center rounded-full text-[#ececec] transition hover:bg-[#1f1f1f]"
            title="Open Luma"
            aria-label="Open Luma"
          >
            <Link className="size-4" aria-hidden="true" />
          </a>
        ) : null}
        <button
          type="button"
          title="More"
          aria-label="More"
          className="grid size-9 place-items-center rounded-full text-[#ececec] transition hover:bg-[#1f1f1f]"
        >
          <MoreHorizontal className="size-5" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

function TaskWorkspace({
  tasks,
  pending,
  onCreateTask,
  onUpdateTaskTitle,
  onToggleTask,
  onDeleteTask,
}: {
  tasks: BoardTask[];
  pending: boolean;
  onCreateTask: (title: string) => void;
  onUpdateTaskTitle: (task: BoardTask, title: string) => void;
  onToggleTask: (task: BoardTask) => void;
  onDeleteTask: (id: string) => void;
}) {
  const mainTasks = tasks
    .filter((task) => task.areaLabel === MAIN_TASK_LABEL)
    .toSorted(
      (a, b) =>
        (MAIN_TASK_ORDER.get(a.title) ?? 99) -
        (MAIN_TASK_ORDER.get(b.title) ?? 99),
    );
  const extraTasks = tasks
    .filter((task) => task.areaLabel !== MAIN_TASK_LABEL)
    .toSorted((a, b) => a.createdAt.localeCompare(b.createdAt));
  const completedMainTasks = mainTasks.filter((task) => task.completed).length;

  return (
    <section className="mx-auto w-full max-w-[760px] space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white">
            To-do
          </h2>
        </div>
        <span className="rounded-full border border-[#303030] px-3 py-1.5 text-xs font-medium text-[#b4b4b4]">
          {completedMainTasks}/{mainTasks.length} main
        </span>
      </div>

      <section className="rounded-[20px] bg-[#2f2f2f] p-3">
        <div className="space-y-2">
          {mainTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              pending={pending}
              locked
              onToggle={onToggleTask}
              onEditTitle={onUpdateTaskTitle}
              onDelete={onDeleteTask}
            />
          ))}
        </div>

        {extraTasks.length ? (
          <div className="mt-2 space-y-2">
            {extraTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                pending={pending}
                onToggle={onToggleTask}
                onEditTitle={onUpdateTaskTitle}
                onDelete={onDeleteTask}
              />
            ))}
          </div>
        ) : null}

        <form
          key={tasks.length}
          action={(formData) => {
            onCreateTask(String(formData.get("title") ?? ""));
          }}
          className="mt-2"
        >
          <input
            name="title"
            required
            placeholder="Add task..."
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            className="h-10 w-full rounded-[18px] border border-transparent bg-[#212121] px-4 text-sm font-medium text-[#f4f4f4] outline-none placeholder:text-[#8f8f8f] transition focus:border-[#303030] focus:bg-[#1f1f1f]"
          />
        </form>
      </section>
    </section>
  );
}

function BudgetWorkspace({
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

  function submitBudgetUpdate(
    id: string,
    form: HTMLFormElement | null,
    overrides: Partial<BudgetInput> = {},
  ) {
    if (!form) {
      return;
    }

    const formData = new FormData(form);

    for (const [key, value] of Object.entries(overrides)) {
      if (typeof value === "string") {
        formData.set(key, value);
      }
    }

    onUpdate(id, formData);
  }

  return (
    <section className="mx-auto w-full max-w-[760px] space-y-4">
      <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white">
        Balance
      </h2>

      <section className="rounded-[20px] bg-[#2f2f2f] p-3">
        <div className="space-y-2">
          {entries.map((entry) => {
            const isDefaultBudgetLine = DEFAULT_BUDGET_LABELS.has(entry.label);

            return (
              <form
                key={entry.id}
                data-budget-row="true"
                data-budget-label={entry.label}
                data-budget-locked={isDefaultBudgetLine ? "true" : "false"}
                action={(formData) => onUpdate(entry.id, formData)}
                className="grid gap-2 rounded-[20px] bg-[#212121] p-2.5 md:grid-cols-[minmax(0,1fr)_112px_118px_auto]"
              >
                <input
                  name="label"
                  defaultValue={entry.label}
                  readOnly={isDefaultBudgetLine}
                  onBlur={(event) => {
                    if (!isDefaultBudgetLine) {
                      submitBudgetUpdate(entry.id, event.currentTarget.form);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();

                      if (!isDefaultBudgetLine) {
                        submitBudgetUpdate(entry.id, event.currentTarget.form);
                      } else {
                        event.currentTarget.blur();
                      }
                    }
                  }}
                  className={`h-10 min-w-0 rounded-[20px] border border-transparent bg-transparent px-2 text-sm font-medium text-[#f4f4f4] outline-none transition placeholder:text-[#8f8f8f] focus:border-[#444] focus:bg-[#171717] ${
                    isDefaultBudgetLine ? "cursor-default focus:border-transparent focus:bg-transparent" : ""
                  }`}
                />
                <input
                  name="amount"
                  inputMode="decimal"
                  defaultValue={(entry.amountCents / 100).toFixed(0)}
                  onBlur={(event) =>
                    submitBudgetUpdate(entry.id, event.currentTarget.form)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      submitBudgetUpdate(entry.id, event.currentTarget.form);
                    }
                  }}
                  className="h-10 rounded-[20px] border border-transparent bg-transparent px-2 text-right text-sm font-medium text-[#f4f4f4] outline-none transition placeholder:text-[#8f8f8f] focus:border-[#444] focus:bg-[#171717]"
                />
                {isDefaultBudgetLine ? (
                  <>
                    <input type="hidden" name="type" value="EXPENSE" />
                    <div
                      data-budget-type-static="true"
                      className="flex h-10 w-full items-center rounded-[20px] border border-[#3a3a3a] bg-[#303030] px-4 text-sm font-medium text-[#d6d6d6]"
                    >
                      Expense
                    </div>
                  </>
                ) : (
                  <BudgetTypeMenu
                    name="type"
                    defaultValue={entry.type}
                    onChange={(type, form) =>
                      submitBudgetUpdate(entry.id, form, { type })
                    }
                  />
                )}
                {isDefaultBudgetLine ? (
                  <span className="hidden size-10 md:block" aria-hidden="true" />
                ) : (
                  <button
                    type="button"
                    title="Delete budget line"
                    aria-label="Delete budget line"
                    disabled={pending}
                    onClick={() => onDelete(entry.id)}
                    className="grid size-10 place-items-center rounded-[20px] text-[#8f8f8f] transition hover:bg-[#333] hover:text-white disabled:opacity-50"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                )}
              </form>
            );
          })}
        </div>

        <form
          key={entries.length}
          action={onCreate}
          className="mt-2 grid gap-2 rounded-[20px] bg-[#212121] p-2.5 md:grid-cols-[minmax(0,1fr)_112px_118px]"
        >
          <input
            name="label"
            required
            placeholder="Add sponsor or cost..."
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            className="h-10 min-w-0 rounded-[20px] border border-transparent bg-transparent px-2 text-sm font-medium text-[#f4f4f4] outline-none transition placeholder:text-[#8f8f8f] focus:border-[#444] focus:bg-[#171717]"
          />
          <input
            name="amount"
            inputMode="decimal"
            placeholder="0"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            className="h-10 rounded-[20px] border border-transparent bg-transparent px-2 text-right text-sm font-medium text-[#f4f4f4] outline-none transition placeholder:text-[#8f8f8f] focus:border-[#444] focus:bg-[#171717]"
          />
          <BudgetTypeMenu
            name="type"
            defaultValue="INCOME"
          />
        </form>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <BalanceTotal label="Total income" value={formatCurrency(incomeCents)} />
          <BalanceTotal label="Cost" value={formatCurrency(expenseCents)} />
          <BalanceTotal
            label="Results"
            value={`${isProfit ? "+" : "-"}${formatCurrency(Math.abs(netCents))}`}
            strong
          />
        </div>
      </section>
    </section>
  );
}

function BudgetTypeMenu({
  name,
  defaultValue,
  onChange,
}: {
  name: string;
  defaultValue: BudgetType;
  onChange?: (type: BudgetType, form: HTMLFormElement | null) => void;
}) {
  const [value, setValue] = useState<BudgetType>(defaultValue);
  const [open, setOpen] = useState(false);
  const selectedType =
    BUDGET_TYPES.find((type) => type.id === value) ?? BUDGET_TYPES[0];

  function selectType(type: BudgetType, form: HTMLFormElement | null) {
    setValue(type);
    setOpen(false);
    onChange?.(type, form);
  }

  return (
    <div
      className="relative"
      onBlur={(event) => {
        const nextFocus = event.relatedTarget as Node | null;

        if (!nextFocus || !event.currentTarget.contains(nextFocus)) {
          setOpen(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
        }
      }}
    >
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        data-budget-type-trigger="true"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-[20px] border border-[#3a3a3a] bg-[#303030] px-4 text-sm font-medium text-[#d6d6d6] transition hover:bg-[#3a3a3a] focus:bg-[#3a3a3a]"
      >
        <span>{selectedType.title}</span>
        <ChevronDown
          className={`size-4 text-[#b4b4b4] transition ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          data-budget-type-menu="true"
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-30 w-44 rounded-[20px] bg-[#303030] p-2 shadow-[0_18px_80px_rgba(0,0,0,0.45)]"
        >
          {BUDGET_TYPES.map((type) => {
            const selected = type.id === value;

            return (
              <button
                key={type.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={(event) =>
                  selectType(type.id, event.currentTarget.form)
                }
                className={`flex h-12 w-full items-center justify-between rounded-[16px] px-4 text-left text-[15px] font-medium transition ${
                  selected
                    ? "bg-[#505050] text-white"
                    : "text-[#f4f4f4] hover:bg-[#424242]"
                }`}
              >
                <span>{type.title}</span>
                {selected ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function BalanceTotal({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      data-balance-total-label={label}
      className="rounded-[20px] bg-[#212121] px-4 py-3"
    >
      <p className="text-xs font-medium text-[#9b9b9b]">{label}</p>
      <p
        className={`mt-1 font-semibold tracking-[-0.04em] text-white ${
          strong ? "text-2xl" : "text-xl"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ApplicationsWorkspace({
  applications,
  applicationUrl,
  pending,
  onDelete,
}: {
  applications: HackathonApplication[];
  applicationUrl: string;
  pending: boolean;
  onDelete: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const qrSrc = `/qr?data=${encodeURIComponent(applicationUrl)}`;
  const latestApplications = useMemo(
    () =>
      applications.toSorted((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    [applications],
  );

  async function copyApplicationLink() {
    await navigator.clipboard.writeText(applicationUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <section className="mx-auto w-full max-w-[900px] space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white">
            Applications
          </h2>
          <p className="mt-2 text-sm font-medium text-[#9b9b9b]">
            Share the form, scan the QR, then track every submitted team.
          </p>
        </div>
        <div
          data-application-count="true"
          className="rounded-[20px] bg-[#212121] px-4 py-2 text-right"
        >
          <p className="text-xs font-medium text-[#9b9b9b]">Applicants total</p>
          <p className="text-xl font-semibold text-white">
            {latestApplications.length}
          </p>
        </div>
      </div>

      <section className="grid gap-3 rounded-[20px] bg-[#2f2f2f] p-3 md:grid-cols-[minmax(0,1fr)_184px]">
        <div className="min-w-0 rounded-[20px] bg-[#212121] p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-[#9b9b9b]">
              <Link className="size-4 shrink-0" aria-hidden="true" />
              Application link
            </div>
            {copied ? (
              <span className="rounded-full bg-[#303030] px-2.5 py-1 text-xs font-semibold text-white">
                Copied
              </span>
            ) : null}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              readOnly
              value={applicationUrl}
              className="h-10 min-w-0 flex-1 rounded-[20px] border border-transparent bg-[#171717] px-3 text-sm font-medium text-[#f4f4f4] outline-none"
            />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              title="Copy application link"
              onClick={copyApplicationLink}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[20px] bg-[#303030] px-4 text-sm font-semibold text-[#d6d6d6] transition hover:bg-[#3a3a3a] hover:text-white"
            >
              {copied ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
              Copy link
            </button>
            <a
              href={applicationUrl}
              target="_blank"
              rel="noreferrer"
              title="Open application form"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[20px] bg-[#f4f4f4] px-4 text-sm font-semibold text-black transition hover:bg-white"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              Open form
            </a>
          </div>
          <p className="mt-3 text-xs font-medium text-[#6f6f6f]">
            Name team, participants, public Github repo, one-line build.
          </p>
        </div>

        <div className="grid place-items-center rounded-[20px] bg-white p-3 text-center">
          <Image
            src={qrSrc}
            alt="Application QR code"
            width={160}
            height={160}
            unoptimized
          />
        </div>
      </section>

      <section className="rounded-[20px] bg-[#2f2f2f] p-3">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <h3 className="text-lg font-semibold tracking-[-0.03em] text-white">
            Latest applications
          </h3>
          <span className="rounded-[20px] bg-[#212121] px-2.5 py-1 text-xs font-semibold text-[#b4b4b4]">
            latest on top
          </span>
        </div>
        {latestApplications.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] border-separate border-spacing-y-2 text-left">
              <thead>
                <tr className="text-xs font-medium text-[#8f8f8f]">
                  <th className="w-12 px-3 py-1">#</th>
                  <th className="px-3 py-1">Team</th>
                  <th className="px-3 py-1">Applicant names</th>
                  <th className="px-3 py-1">Repo</th>
                  <th className="px-3 py-1">Built</th>
                  <th className="px-3 py-1">Submitted</th>
                  <th className="w-12 px-3 py-1" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {latestApplications.map((application, index) => (
                  <tr
                    key={application.id}
                    data-application-row="true"
                    data-application-team={application.teamName}
                    className="text-sm font-medium text-[#f4f4f4]"
                  >
                    <td className="rounded-l-[20px] bg-[#212121] px-3 py-3 text-xs font-semibold text-[#9b9b9b]">
                      {formatRowNumber(index + 1)}
                    </td>
                    <td className="max-w-[180px] bg-[#212121] px-3 py-3">
                      <span className="block truncate">
                        {application.teamName}
                      </span>
                    </td>
                    <td className="max-w-[220px] bg-[#212121] px-3 py-3 text-[#d6d6d6]">
                      <span className="block truncate">
                        {application.participantsFullName}
                      </span>
                    </td>
                    <td className="bg-[#212121] px-3 py-3">
                      <a
                        href={application.githubRepoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#d6d6d6] transition hover:text-white"
                      >
                        Github
                        <ExternalLink className="size-3.5" aria-hidden="true" />
                      </a>
                    </td>
                    <td className="max-w-[220px] bg-[#212121] px-3 py-3 text-[#d6d6d6]">
                      <span className="block truncate">
                        {application.builtDescription}
                      </span>
                    </td>
                    <td className="bg-[#212121] px-3 py-3 text-xs text-[#9b9b9b]">
                      {formatDateTime(application.createdAt)}
                    </td>
                    <td className="rounded-r-[20px] bg-[#212121] px-2 py-2">
                      <button
                        type="button"
                        title="Delete application"
                        aria-label="Delete application"
                        disabled={pending}
                        onClick={() => onDelete(application.id)}
                        className="grid size-9 place-items-center rounded-[18px] text-[#8f8f8f] transition hover:bg-[#333] hover:text-white disabled:opacity-50"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-[20px] bg-[#212121] px-4 py-8 text-center text-sm font-medium text-[#9b9b9b]">
            No applications yet. Share the link above.
          </div>
        )}
      </section>
    </section>
  );
}

function JudgesWorkspace({
  judges,
  groups,
  judgingApplications,
  pending,
  onCreate,
  onUpdate,
  onMoveJudgeToGroup,
  onAutoGroups,
  onDelete,
}: {
  judges: Judge[];
  groups: JudgeGroup[];
  judgingApplications: JudgingApplication[];
  pending: boolean;
  onCreate: (formData: FormData) => void;
  onUpdate: (id: string, formData: FormData) => void;
  onMoveJudgeToGroup: (
    judgeId: string,
    groupId: string | null,
    position?: number,
  ) => void;
  onAutoGroups: () => void;
  onDelete: (id: string) => void;
}) {
  const [draggedJudgeId, setDraggedJudgeId] = useState<string | null>(null);
  const [dropTargetGroupId, setDropTargetGroupId] = useState<string | null>(
    null,
  );
  const [dropTargetJudgeId, setDropTargetJudgeId] = useState<string | null>(
    null,
  );

  function submitJudgeUpdate(id: string, form: HTMLFormElement | null) {
    if (!form || isOptimisticJudgeId(id)) {
      return;
    }

    onUpdate(id, new FormData(form));
  }

  function handleJudgeDrop(
    groupId: string | null,
    judgeId: string,
    position?: number,
  ) {
    if (!judgeId || isOptimisticJudgeId(judgeId)) {
      return;
    }

    const judge = judges.find((candidate) => candidate.id === judgeId);
    const currentGroupId = judge?.groupId ?? null;
    const targetGroup = groups.find((group) => group.id === groupId);
    const targetPosition = position ?? targetGroup?.judges.length ?? 0;

    setDraggedJudgeId(null);
    setDropTargetGroupId(null);
    setDropTargetJudgeId(null);

    if (!judge) {
      return;
    }

    if (currentGroupId === groupId) {
      const currentGroup = groups.find((group) => group.id === currentGroupId);
      const currentIndex =
        currentGroup?.judges.findIndex((groupJudge) => groupJudge.id === judgeId) ??
        -1;

      if (currentIndex === targetPosition) {
        return;
      }
    }

    onMoveJudgeToGroup(judgeId, groupId, targetPosition);
  }

  return (
    <section className="mx-auto w-full max-w-[980px] space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white">
            Judges
          </h2>
          <p className="mt-1 text-sm font-medium text-[#8f8f8f]">
            Groups of two, four criteria, one shared application table.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            data-judge-count="true"
            className="rounded-[20px] bg-[#212121] px-3 py-1.5 text-sm font-medium text-[#d6d6d6]"
          >
            {formatJudgeCount(judges.length)}
          </span>
          <button
            type="button"
            disabled={pending || judges.length === 0}
            onClick={onAutoGroups}
            className="inline-flex h-9 items-center gap-2 rounded-[20px] bg-[#f4f4f4] px-3 text-sm font-semibold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:bg-[#3a3a3a] disabled:text-[#8f8f8f]"
          >
            <Shuffle className="size-4" aria-hidden="true" />
            Auto groups
          </button>
        </div>
      </div>

      <section className="rounded-[20px] bg-[#2f2f2f] p-3">
        <div className="space-y-2">
          {judges.map((judge, index) => {
            const isOptimisticJudge = isOptimisticJudgeId(judge.id);

            return (
              <form
                key={judge.id}
                data-judge-row="true"
                data-judge-name={judge.name}
                data-judge-index={index + 1}
                data-judge-optimistic={isOptimisticJudge ? "true" : undefined}
                action={(formData) => onUpdate(judge.id, formData)}
                className="grid gap-2 rounded-[20px] bg-[#212121] p-2.5 md:grid-cols-[40px_minmax(0,1fr)_minmax(0,1fr)_150px_auto]"
              >
                <span className="flex h-10 items-center justify-center rounded-[20px] bg-[#303030] text-xs font-semibold text-[#9b9b9b]">
                  {formatRowNumber(index + 1)}
                </span>
                <input
                  name="name"
                  defaultValue={judge.name}
                  placeholder="Name and surname"
                  disabled={isOptimisticJudge}
                  onBlur={(event) =>
                    submitJudgeUpdate(judge.id, event.currentTarget.form)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      submitJudgeUpdate(judge.id, event.currentTarget.form);
                    }
                  }}
                  className="h-10 min-w-0 rounded-[20px] border border-transparent bg-transparent px-2 text-sm font-medium text-[#f4f4f4] outline-none transition placeholder:text-[#8f8f8f] focus:border-[#444] focus:bg-[#171717]"
                />
                <input
                  name="email"
                  type="email"
                  defaultValue={judge.email ?? ""}
                  required
                  placeholder="Email required"
                  disabled={isOptimisticJudge}
                  onBlur={(event) =>
                    submitJudgeUpdate(judge.id, event.currentTarget.form)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      submitJudgeUpdate(judge.id, event.currentTarget.form);
                    }
                  }}
                  className="h-10 min-w-0 rounded-[20px] border border-transparent bg-transparent px-2 text-sm font-medium text-[#f4f4f4] outline-none transition placeholder:text-[#8f8f8f] focus:border-[#444] focus:bg-[#171717]"
                />
                <input
                  key={`${judge.id}-${judge.groupId ?? "none"}-group`}
                  name="groupNumber"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={2}
                  data-judge-group-input={judge.id}
                  defaultValue={getJudgeGroupNumber(groups, judge.groupId)}
                  placeholder="Group #"
                  aria-label="Group number"
                  disabled={isOptimisticJudge}
                  onInput={normalizeGroupNumberInput}
                  onBlur={(event) =>
                    submitJudgeUpdate(judge.id, event.currentTarget.form)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      submitJudgeUpdate(judge.id, event.currentTarget.form);
                    }
                  }}
                  className="h-10 min-w-0 rounded-[20px] border border-transparent bg-[#171717] px-3 text-sm font-semibold text-[#d6d6d6] outline-none transition placeholder:text-[#8f8f8f] focus:border-[#444]"
                />
                <button
                  type="button"
                  title="Delete judge"
                  aria-label="Delete judge"
                  disabled={pending || isOptimisticJudge}
                  onClick={() => onDelete(judge.id)}
                  className="grid size-10 place-items-center rounded-[20px] text-[#8f8f8f] transition hover:bg-[#333] hover:text-white disabled:opacity-50"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </form>
            );
          })}
        </div>

        <form
          key={judges.length}
          action={onCreate}
          className="mt-2 grid gap-2 rounded-[20px] bg-[#212121] p-2.5 md:grid-cols-[40px_minmax(0,1fr)_minmax(0,1fr)_150px_auto]"
        >
          <span className="flex h-10 items-center justify-center rounded-[20px] bg-[#303030] text-xs font-semibold text-[#9b9b9b]">
            {formatRowNumber(judges.length + 1)}
          </span>
          <input
            name="name"
            required
            placeholder="Name and surname"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            className="h-10 min-w-0 rounded-[20px] border border-transparent bg-transparent px-2 text-sm font-medium text-[#f4f4f4] outline-none transition placeholder:text-[#8f8f8f] focus:border-[#444] focus:bg-[#171717]"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="Email required"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            className="h-10 min-w-0 rounded-[20px] border border-transparent bg-transparent px-2 text-sm font-medium text-[#f4f4f4] outline-none transition placeholder:text-[#8f8f8f] focus:border-[#444] focus:bg-[#171717]"
          />
          <input
            name="groupNumber"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            placeholder="Group #"
            aria-label="Group number"
            onInput={normalizeGroupNumberInput}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            className="h-10 min-w-0 rounded-[20px] border border-transparent bg-[#171717] px-3 text-sm font-semibold text-[#d6d6d6] outline-none transition placeholder:text-[#8f8f8f] focus:border-[#444]"
          />
          <button
            type="submit"
            title="Add judge"
            aria-label="Add judge"
            disabled={pending}
            onKeyDown={(event) => {
              if (event.key === " ") {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            className="grid size-10 place-items-center rounded-[20px] bg-[#f4f4f4] text-black transition hover:bg-white disabled:opacity-50"
          >
            <Check className="size-4" aria-hidden="true" />
          </button>
        </form>
      </section>

      <section className="grid gap-3 md:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-[20px] bg-[#2f2f2f] p-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold tracking-[-0.03em] text-white">
              Groups
            </h3>
            <span className="rounded-[20px] bg-[#212121] px-2.5 py-1 text-xs font-semibold text-[#b4b4b4]">
              {groups.length}
            </span>
          </div>
          <div className="space-y-2">
            {groups.length ? (
              groups.map((group) => (
                <div
                  key={group.id}
                  data-judge-group-dropzone={group.id}
                  onDragOver={(event) => {
                    if (draggedJudgeId) {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setDropTargetGroupId(group.id);
                    }
                  }}
                  onDragEnter={(event) => {
                    if (draggedJudgeId) {
                      event.preventDefault();
                      setDropTargetGroupId(group.id);
                    }
                  }}
                  onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      setDropTargetGroupId(null);
                      setDropTargetJudgeId(null);
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const judgeId =
                      event.dataTransfer.getData("application/x-8x-judge") ||
                      event.dataTransfer.getData("text/plain") ||
                      draggedJudgeId ||
                      "";

                    handleJudgeDrop(group.id, judgeId, group.judges.length);
                  }}
                  className={`rounded-[20px] p-3 transition ${
                    dropTargetGroupId === group.id
                      ? "bg-[#303030] shadow-[inset_0_0_0_1px_rgba(244,244,244,0.16)]"
                      : "bg-[#212121]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-white">{group.name}</p>
                    <span className="rounded-full bg-[#303030] px-2 py-1 text-xs font-semibold text-[#d6d6d6]">
                      {group.applicationCount} apps
                    </span>
                  </div>
                  <div className="mt-3 space-y-1">
                    {group.judges.length ? (
                      group.judges.map((judge) => {
                        const position = group.judges.findIndex(
                          (groupJudge) => groupJudge.id === judge.id,
                        );

                        return (
                          <button
                            key={judge.id}
                            data-judge-drag-chip={judge.id}
                            data-judge-drop-index={position}
                            type="button"
                            draggable
                            title="Drag judge to reorder or move groups"
                            onDragOver={(event) => {
                              if (draggedJudgeId && draggedJudgeId !== judge.id) {
                                event.preventDefault();
                                event.dataTransfer.dropEffect = "move";
                                setDropTargetGroupId(group.id);
                                setDropTargetJudgeId(judge.id);
                              }
                            }}
                            onDragEnter={(event) => {
                              if (draggedJudgeId && draggedJudgeId !== judge.id) {
                                event.preventDefault();
                                setDropTargetGroupId(group.id);
                                setDropTargetJudgeId(judge.id);
                              }
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              const judgeId =
                                event.dataTransfer.getData(
                                  "application/x-8x-judge",
                                ) ||
                                event.dataTransfer.getData("text/plain") ||
                                draggedJudgeId ||
                                "";

                              handleJudgeDrop(group.id, judgeId, position);
                            }}
                            onDragStart={(event) => {
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData(
                                "application/x-8x-judge",
                                judge.id,
                              );
                              event.dataTransfer.setData("text/plain", judge.id);
                              setDraggedJudgeId(judge.id);
                            }}
                            onDragEnd={() => {
                              setDraggedJudgeId(null);
                              setDropTargetGroupId(null);
                              setDropTargetJudgeId(null);
                            }}
                            className={`flex h-9 w-full cursor-grab items-center gap-2 rounded-[18px] px-2 text-left text-sm font-medium transition active:cursor-grabbing ${
                              draggedJudgeId === judge.id
                                ? "bg-[#303030] text-white opacity-70"
                                : dropTargetJudgeId === judge.id
                                  ? "bg-[#303030] text-white shadow-[inset_0_1px_0_0_rgba(244,244,244,0.22)]"
                                  : "text-[#b4b4b4] hover:bg-[#303030] hover:text-white"
                            }`}
                        >
                          <GripVertical
                            className="size-4 shrink-0 text-[#6f6f6f]"
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {judge.name}
                          </span>
                        </button>
                        );
                      })
                    ) : (
                      <p className="text-sm font-medium text-[#6f6f6f]">
                        Drop judges here
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[20px] bg-[#212121] px-4 py-8 text-center text-sm font-medium text-[#9b9b9b]">
                Add a judge. Groups are assigned automatically.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[20px] bg-[#2f2f2f] p-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold tracking-[-0.03em] text-white">
              Ranking
            </h3>
            <span className="inline-flex items-center gap-2 rounded-[20px] bg-[#212121] px-2.5 py-1 text-xs font-semibold text-[#b4b4b4]">
              <Trophy className="size-3.5" aria-hidden="true" />
              {judgingApplications.length}
            </span>
          </div>
          {judgingApplications.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-left">
                <thead>
                  <tr className="text-xs font-medium text-[#8f8f8f]">
                    <th className="w-12 px-3 py-1">#</th>
                    <th className="px-3 py-1">Startup</th>
                    <th className="px-3 py-1">Group</th>
                    <th className="px-3 py-1">Votes</th>
                    <th className="px-3 py-1">Avg</th>
                    <th className="px-3 py-1">Pitch</th>
                    <th className="px-3 py-1">Idea</th>
                    <th className="px-3 py-1">UI/UX</th>
                    <th className="px-3 py-1">Exec</th>
                  </tr>
                </thead>
                <tbody>
                  {judgingApplications.map((application, index) => (
                    <tr
                      key={application.id}
                      className="text-sm font-medium text-[#f4f4f4]"
                    >
                      <td className="rounded-l-[20px] bg-[#212121] px-3 py-3 text-xs font-semibold text-[#9b9b9b]">
                        {formatRowNumber(index + 1)}
                      </td>
                      <td className="max-w-[180px] bg-[#212121] px-3 py-3">
                        <span className="block truncate">
                          {application.teamName}
                        </span>
                      </td>
                      <td className="bg-[#212121] px-3 py-3 text-[#d6d6d6]">
                        {application.groupName ?? "Unassigned"}
                      </td>
                      <td className="bg-[#212121] px-3 py-3 text-[#d6d6d6]">
                        {application.scoreCount}
                      </td>
                      <td className="bg-[#212121] px-3 py-3 text-white">
                        {formatScore(application.averageScore)}
                      </td>
                      <td className="bg-[#212121] px-3 py-3 text-[#d6d6d6]">
                        {formatScore(application.pitchAverage)}
                      </td>
                      <td className="bg-[#212121] px-3 py-3 text-[#d6d6d6]">
                        {formatScore(application.potentialAverage)}
                      </td>
                      <td className="bg-[#212121] px-3 py-3 text-[#d6d6d6]">
                        {formatScore(application.uiUxAverage)}
                      </td>
                      <td className="rounded-r-[20px] bg-[#212121] px-3 py-3 text-[#d6d6d6]">
                        {formatScore(application.executionAverage)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-[20px] bg-[#212121] px-4 py-8 text-center text-sm font-medium text-[#9b9b9b]">
              Applications will appear here when teams submit.
            </div>
          )}
        </div>
      </section>
    </section>
  );
}

function NavButton({
  icon: Icon,
  label,
  count,
  active,
  collapsed,
  onClick,
}: {
  icon: typeof CheckSquare2;
  label: string;
  count?: number;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`flex h-10 items-center gap-3 rounded-lg text-left text-sm font-medium transition ${
        active
          ? "bg-[#212121] text-white"
          : "text-[#ececec] hover:bg-[#1f1f1f]"
      } ${collapsed ? "w-10 justify-center px-0" : "w-full px-2"}`}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {collapsed ? null : <span className="min-w-0 flex-1 truncate">{label}</span>}
      {!collapsed && typeof count === "number" ? (
        <span className="grid min-w-6 place-items-center rounded-full bg-[#f4f4f4] px-2 py-0.5 text-xs font-semibold text-black">
          {count}
        </span>
      ) : null}
    </button>
  );
}

function BalanceCard({
  className = "",
  incomeCents,
  expenseCents,
  completionRate,
  netCents,
  onOpenBudget,
  isProfit,
}: {
  className?: string;
  incomeCents: number;
  expenseCents: number;
  completionRate: number;
  netCents: number;
  onOpenBudget: () => void;
  isProfit: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onOpenBudget}
      className={`${className} rounded-2xl bg-[#171717] p-4 text-left text-white transition hover:bg-[#1f1f1f]`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-[#2f2f2f] text-[#ececec]">
          <Banknote className="size-4" aria-hidden="true" />
        </span>
        <span className="rounded-full bg-[#f4f4f4] px-2.5 py-1 text-xs font-semibold text-black">
          {isProfit ? "profit" : "loss"}
        </span>
      </div>
      <p className="mt-5 text-sm font-medium text-[#b4b4b4]">Net balance</p>
      <p className="mt-1 text-3xl font-semibold tracking-[-0.05em]">
        {isProfit ? "+" : "-"}
        {formatCurrency(Math.abs(netCents))}
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-medium text-[#9b9b9b]">
        <span>{completionRate}% done</span>
        <span>In {formatCurrency(incomeCents)}</span>
        <span>Out {formatCurrency(expenseCents)}</span>
      </div>
    </button>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="hidden rounded-full border border-[#303030] px-3 py-1.5 text-xs font-medium text-[#b4b4b4] lg:block">
      <span className="text-[#ececec]">{value}</span> {label}
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

function formatJudgeCount(count: number) {
  return `${count} ${count === 1 ? "judge" : "judges"}`;
}

function getJudgeGroupNumber(groups: JudgeGroup[], groupId: string | null) {
  const group = groups.find((candidate) => candidate.id === groupId);

  return group ? String(group.sortOrder + 1) : "";
}

function formatScore(score: number | null) {
  if (score === null) {
    return "-";
  }

  return score.toFixed(score % 1 === 0 ? 0 : 1);
}

function formatRowNumber(value: number) {
  return String(value).padStart(2, "0");
}

function formatDate(value: string | null) {
  if (!value) {
    return "Date from Luma";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
