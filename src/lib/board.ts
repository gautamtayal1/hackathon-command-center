export const BOARD_COLUMNS = [
  { id: "RESEARCH", title: "Research", accent: "blue" },
  { id: "PEOPLE_JUDGES", title: "People & Judges", accent: "pink" },
  { id: "CAMPAIGNS", title: "Campaigns", accent: "blue" },
  { id: "SUBMISSIONS", title: "Submissions", accent: "pink" },
  { id: "FIRST_ROUND", title: "First Round", accent: "blue" },
  { id: "FINALS", title: "Finals", accent: "pink" },
  { id: "DONE", title: "Done", accent: "blue" },
] as const;

export const PRIORITIES = [
  { id: "LOW", title: "Low" },
  { id: "MEDIUM", title: "Medium" },
  { id: "HIGH", title: "High" },
] as const;

export type BoardColumnId = (typeof BOARD_COLUMNS)[number]["id"];
export type Priority = (typeof PRIORITIES)[number]["id"];

export type BoardTask = {
  id: string;
  title: string;
  description: string;
  status: BoardColumnId;
  priority: Priority;
  dueDate: string | null;
  areaLabel: string;
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
};

export function isBoardColumnId(value: string): value is BoardColumnId {
  return BOARD_COLUMNS.some((column) => column.id === value);
}

export function isPriority(value: string): value is Priority {
  return PRIORITIES.some((priority) => priority.id === value);
}
