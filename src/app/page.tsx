import { Board } from "@/components/board/board";
import {
  createBudgetEntry,
  createTask,
  deleteBudgetEntry,
  deleteTask,
  toggleTaskCompletion,
  updateBudgetEntry,
  updateTask,
} from "@/lib/actions";
import { getBoardTasks, getBudgetEntries } from "@/lib/tasks";

export default async function Home() {
  const [tasks, budgetEntries] = await Promise.all([
    getBoardTasks(),
    getBudgetEntries(),
  ]);

  return (
    <main className="min-h-screen px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <Board
        initialTasks={tasks}
        budgetEntries={budgetEntries}
        actions={{
          createTask,
          updateTask,
          deleteTask,
          toggleTaskCompletion,
          createBudgetEntry,
          updateBudgetEntry,
          deleteBudgetEntry,
        }}
      />
    </main>
  );
}
