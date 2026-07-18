export const BOARD_COLUMNS = [
  {
    id: "FOOD_DRINKS",
    title: "Food & Drinks",
    description: "Meals, snacks, coffee, water, and after-event drinks.",
    accent: "pink",
  },
  {
    id: "LOCATION",
    title: "Location",
    description: "Venue, rooms, check-in desk, signs, internet, and setup.",
    accent: "blue",
  },
  {
    id: "PARTICIPANTS",
    title: "Participants",
    description: "Registrations, reminders, team support, and attendance.",
    accent: "pink",
  },
  {
    id: "SPONSORS",
    title: "Sponsors",
    description: "Sponsor outreach, packages, invoices, and deliverables.",
    accent: "blue",
  },
] as const;

export const MAIN_TASK_LABEL = "main";
export const DELETED_MAIN_TASK_LABEL = "__deleted_main";

export const MAIN_TODO_TASKS = [
  { title: "Find location", status: "LOCATION" },
  { title: "Find participants", status: "PARTICIPANTS" },
  { title: "Find sponsors", status: "SPONSORS", aliases: ["Find sponsor"] },
  { title: "Find food", status: "FOOD_DRINKS" },
  { title: "Find the judges", status: "PARTICIPANTS" },
  { title: "Buy drinks", status: "FOOD_DRINKS" },
] as const;

export const PRIORITIES = [
  { id: "LOW", title: "Low" },
  { id: "MEDIUM", title: "Medium" },
  { id: "HIGH", title: "High" },
] as const;

export const BUDGET_TYPES = [
  { id: "INCOME", title: "Income" },
  { id: "EXPENSE", title: "Expense" },
] as const;

export const DEFAULT_BUDGET_LINES = [
  { label: "Location", type: "EXPENSE" },
  { label: "Food", type: "EXPENSE", aliases: ["Food & drinks"] },
  { label: "Drinks", type: "EXPENSE" },
] as const;

export type BoardColumnId = (typeof BOARD_COLUMNS)[number]["id"];
export type Priority = (typeof PRIORITIES)[number]["id"];
export type BudgetType = (typeof BUDGET_TYPES)[number]["id"];

export type BoardTask = {
  id: string;
  title: string;
  description: string;
  status: BoardColumnId;
  priority: Priority;
  dueDate: string | null;
  areaLabel: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TaskInput = {
  title: string;
  description: string;
  status: BoardColumnId;
  priority: Priority;
  dueDate: string | null;
  areaLabel: string;
  completed: boolean;
};

export type BudgetEntry = {
  id: string;
  label: string;
  type: BudgetType;
  amountCents: number;
  createdAt: string;
  updatedAt: string;
};

export type HackathonSummary = {
  id: string;
  name: string;
  lumaUrl: string | null;
  startsAt: string | null;
  isActive: boolean;
  currentRound: number;
  createdAt: string;
};

/**
 * The four judging criteria, each scored 1-10 in both rounds. `name` matches
 * the Score model column and the form field name.
 */
export const SCORE_CRITERIA = [
  { name: "pitchScore", label: "Pitch" },
  { name: "iterationScore", label: "Iteration" },
  { name: "uiUxScore", label: "UI/UX" },
  { name: "executionScore", label: "Execution" },
] as const;

export const SCORE_MAX = 10;

/** Round 1 closes and the finalists are locked once this many judges submit. */
export const ROUND1_SUBMISSIONS_TO_ADVANCE = 6;

export type ScoreCriterionName = (typeof SCORE_CRITERIA)[number]["name"];

export const FINALIST_COUNT = 6;

export type HackathonInput = {
  lumaUrl: string;
  name?: string;
  startsAt?: string | null;
};

export type JudgeInviteStatus = "CONTACT" | "PENDING" | "ACCEPTED" | "REVOKED";

export type Judge = {
  id: string;
  name: string;
  email: string | null;
  groupId: string | null;
  sortOrder: number;
  inviteStatus: JudgeInviteStatus;
  createdAt: string;
  updatedAt: string;
};

export type JudgeInput = {
  name: string;
  email: string;
  groupId?: string;
  groupNumber?: string;
};

export type JudgeGroup = {
  id: string;
  name: string;
  sortOrder: number;
  applicationCount: number;
  judges: Array<{
    id: string;
    name: string;
    email: string | null;
    sortOrder: number;
  }>;
};

export type HackathonApplication = {
  id: string;
  teamName: string;
  participantsFullName: string;
  githubRepoUrl: string;
  builtDescription: string;
  createdAt: string;
  updatedAt: string;
};

export type JudgingApplication = HackathonApplication & {
  groupId: string | null;
  groupName: string | null;
  isFinalist: boolean;
  scoreCount: number;
  averageScore: number | null;
  totalScore: number;
  pitchAverage: number | null;
  iterationAverage: number | null;
  uiUxAverage: number | null;
  executionAverage: number | null;
  round2ScoreCount: number;
  round2Average: number | null;
};

export type JudgingRoundStatus = {
  currentRound: number;
  judgeCount: number;
  round1Submissions: number;
  round1SubmissionsNeeded: number;
  round2Submissions: number;
  finalistCount: number;
};

export type ApplicationInput = {
  teamName: string;
  participantsFullName: string;
  githubRepoUrl: string;
  builtDescription: string;
};

export type BudgetInput = {
  label: string;
  type: BudgetType;
  amount: string;
};

export function isBoardColumnId(value: string): value is BoardColumnId {
  return BOARD_COLUMNS.some((column) => column.id === value);
}

export function isPriority(value: string): value is Priority {
  return PRIORITIES.some((priority) => priority.id === value);
}

export function isBudgetType(value: string): value is BudgetType {
  return BUDGET_TYPES.some((type) => type.id === value);
}
