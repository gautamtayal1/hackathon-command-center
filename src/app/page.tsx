import { headers } from "next/headers";
import { Board } from "@/components/board/board";
import { LogoutButton } from "@/components/logout-button";
import { AccessDeniedError, getAdminContext } from "@/lib/auth";
import {
  createBudgetEntry,
  createHackathonFromLuma,
  createJudge,
  createTask,
  autoGenerateJudgeGroups,
  deleteApplication,
  deleteBudgetEntry,
  deleteJudge,
  deleteTask,
  moveJudgeToGroup,
  selectHackathon,
  sendAllJudgeMagicLinks,
  sendJudgeMagicLink,
  toggleTaskCompletion,
  updateBudgetEntry,
  updateJudge,
  updateTask,
} from "@/lib/actions";
import { getDashboardData } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export default async function Home() {
  let adminContext: Awaited<ReturnType<typeof getAdminContext>>;

  try {
    adminContext = await getAdminContext();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return <AdminAccessDenied />;
    }

    throw error;
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") || host?.startsWith("127.0.0.1")
      ? "http"
      : "https");
  const appOrigin = host ? `${protocol}://${host}` : "http://localhost:3000";
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
  } =
    await getDashboardData(adminContext.workspace.id);

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
          createHackathonFromLuma,
          selectHackathon,
          createTask,
          updateTask,
          deleteTask,
          toggleTaskCompletion,
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

function AdminAccessDenied() {
  return (
    <main className="grid min-h-screen place-items-center bg-black px-4 text-[#f4f4f4]">
      <section className="w-full max-w-[440px] rounded-[20px] border border-[#303030] bg-[#212121] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <p className="text-sm font-semibold text-[#9b9b9b]">Draki</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
          No admin access
        </h1>
        <p className="mt-3 text-sm font-medium leading-6 text-[#b4b4b4]">
          This account is signed in, but it is not an admin of this workspace.
          Judges should use the judge portal from their invite.
        </p>
        <div className="mt-6">
          <LogoutButton label="Log out and switch account" />
        </div>
      </section>
    </main>
  );
}
