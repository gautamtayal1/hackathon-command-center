import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireJudgeForHackathon } from "@/lib/auth";
import { ROUND_ONE } from "@/lib/judging";
import { upsertRoundScore, submitRound } from "@/lib/round-actions";
import { getCurrentHackathon, getRoundOneTeams } from "@/lib/rounds";
import { RoundWorkspace } from "@/components/judging/round-workspace";
import { JudgingErrorBoundary } from "@/components/judging/error-boundary";
import { SessionKeepAlive } from "@/components/judging/session-keep-alive";
import { BrandLockup } from "@/components/brand/brand-lockup";

export const dynamic = "force-dynamic";

export default async function RoundOnePage() {
  const hackathon = await getCurrentHackathon();
  const { judge } = await requireJudgeForHackathon(hackathon.id, "/round1");
  const teams = await getRoundOneTeams(hackathon.id, judge.id, judge.groupId);
  const submitted = Boolean(judge.round1SubmittedAt);

  return (
    <main className="brand-bg min-h-screen px-4 py-8 text-ink sm:px-6">
      <section className="mx-auto w-full max-w-[920px]">
        <SessionKeepAlive />
        <BrandLockup className="mb-7" />
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
              Round 1 · Judging as {judge.name}
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-white">
              {hackathon.name}
            </h1>
          </div>
          <p className="rounded-[20px] border border-accent-line bg-accent-soft px-4 py-2 text-sm font-semibold text-accent">
            {teams.length} {teams.length === 1 ? "team" : "teams"}
          </p>
        </div>

        <JudgingErrorBoundary>
          <RoundWorkspace
            teams={teams}
            judgeId={judge.id}
            round={ROUND_ONE}
            submitted={submitted}
            emptyTitle="No teams assigned yet"
            emptyBody="Teams appear here as soon as they submit the public form and get spread across the judges."
            scoreAction={upsertRoundScore.bind(null, ROUND_ONE)}
            submitAction={submitRound.bind(null, ROUND_ONE)}
          />
        </JudgingErrorBoundary>

        {submitted ? (
          <Link
            href="/round2"
            className="brand-btn mt-3 inline-flex h-11 items-center gap-2 rounded-[20px] px-5 text-sm font-semibold transition"
          >
            Go to round 2
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        ) : null}
      </section>
    </main>
  );
}
