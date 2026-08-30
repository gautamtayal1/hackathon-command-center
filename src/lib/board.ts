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
  createdAt: string;
};

export type HackathonInput = {
  lumaUrl: string;
  name?: string;
  startsAt?: string | null;
};

export type Judge = {
  id: string;
  name: string;
  email: string | null;
  groupId: string | null;
  sortOrder: number;
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
  participantEmails: string[];
  githubRepoUrl: string;
  builtDescription: string;
  createdAt: string;
  updatedAt: string;
};

export type JudgingApplication = HackathonApplication & {
  groupId: string | null;
  groupName: string | null;
  scoreCount: number;
  averageScore: number | null;
  totalScore: number;
  pitchAverage: number | null;
  potentialAverage: number | null;
  uiUxAverage: number | null;
  executionAverage: number | null;
};

export type ApplicationInput = {
  teamName: string;
  participantsFullName: string;
  participantEmails: string[];
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
