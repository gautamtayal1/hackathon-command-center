import { headers } from "next/headers";
import { Board } from "@/components/board/board";
import {
  autoGenerateJudgeGroups,
  createBudgetEntry,
  createJudge,
  deleteApplication,
  deleteBudgetEntry,
  deleteJudge,
  moveJudgeToGroup,
  sendAllJudgeMagicLinks,
  sendJudgeMagicLink,
  updateBudgetEntry,
  updateJudge,
} from "@/lib/actions";
import {
  createPreviewHackathonFromLuma,
  createPreviewTask,
  deletePreviewTask,
  selectPreviewHackathon,
  togglePreviewTaskCompletion,
  updatePreviewTask,
} from "@/app/preview/actions";
import { getDashboardData } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export default async function PreviewDashboard() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") || host?.startsWith("127.0.0.1")
      ? "http"
      : "https");
  const appOrigin = host ? `${protocol}://${host}` : "http://localhost:3001";
  const {
    hackathons,
    activeHackathon,
    tasks,
    budgetEntries,
    judges,
    applications,
    judgeGroups,
    judgingApplications,
    judgingRoundStatus,
  } = await getDashboardData();

  return (
    <main className="min-h-screen bg-black text-[#f4f4f4]">
      <Board
        hackathons={hackathons}
        activeHackathon={activeHackathon}
        appOrigin={appOrigin}
        initialTasks={tasks}
        budgetEntries={budgetEntries}
        judges={judges}
        applications={applications}
        judgeGroups={judgeGroups}
        judgingApplications={judgingApplications}
        judgingRoundStatus={judgingRoundStatus}
        actions={{
          autoGenerateJudgeGroups,
          moveJudgeToGroup,
          createHackathonFromLuma: createPreviewHackathonFromLuma,
          selectHackathon: selectPreviewHackathon,
          createTask: createPreviewTask,
          updateTask: updatePreviewTask,
          deleteTask: deletePreviewTask,
          toggleTaskCompletion: togglePreviewTaskCompletion,
          createBudgetEntry,
          updateBudgetEntry,
          deleteBudgetEntry,
          createJudge,
          updateJudge,
          deleteJudge,
          deleteApplication,
          sendJudgeMagicLink,
          sendAllJudgeMagicLinks,
        }}
      />
    </main>
  );
}
