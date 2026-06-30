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

export const PRIORITIES = [
  { id: "LOW", title: "Low" },
  { id: "MEDIUM", title: "Medium" },
  { id: "HIGH", title: "High" },
] as const;

export const BUDGET_TYPES = [
  { id: "INCOME", title: "Income" },
  { id: "EXPENSE", title: "Expense" },
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
