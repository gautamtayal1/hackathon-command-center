import { Board } from "@/components/board/board";
import { createTask, deleteTask, moveTask, updateTask } from "@/lib/actions";
import { getBoardTasks } from "@/lib/tasks";

export default async function Home() {
  const tasks = await getBoardTasks();

  return (
    <main className="min-h-screen px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <Board
        initialTasks={tasks}
        actions={{ createTask, updateTask, deleteTask, moveTask }}
      />
    </main>
  );
}
