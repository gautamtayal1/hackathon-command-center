import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireJudgeForHackathon } from "@/lib/auth";
import { ROUND_TWO } from "@/lib/judging";
import { upsertRoundScore, submitRound } from "@/lib/round-actions";
import { getCurrentHackathon, getRoundTwoTeams } from "@/lib/rounds";
import { RoundWorkspace } from "@/components/judging/round-workspace";
import { JudgingErrorBoundary } from "@/components/judging/error-boundary";
import { SessionKeepAlive } from "@/components/judging/session-keep-alive";
import { BrandLockup } from "@/components/brand/brand-lockup";

export const dynamic = "force-dynamic";

export default async function RoundTwoPage() {
  const hackathon = await getCurrentHackathon();
  const { judge } = await requireJudgeForHackathon(hackathon.id, "/round2");
  const teams = await getRoundTwoTeams(hackathon.id, judge.id);
  const submitted = Boolean(judge.round2SubmittedAt);

  return (
    <main className="brand-bg min-h-screen px-4 py-8 text-ink sm:px-6">
      <section className="mx-auto w-full max-w-[920px]">
        <SessionKeepAlive />
        <BrandLockup className="mb-5" />
        <Link
          href="/round1"
          className="mb-7 inline-flex items-center gap-2 rounded-[20px] px-2 py-2 text-sm font-semibold text-ink-3 transition hover:bg-surface-3 hover:text-white"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Round 1
        </Link>

        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-warn uppercase">
              Round 2 · Judging as {judge.name}
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-accent">
              Finals
            </h1>
            <p className="mt-3 text-sm font-medium leading-6 text-ink-3">
              Every judge scores every finalist. The averages land on the final
              scores screen.
            </p>
          </div>
          <p className="rounded-[20px] border border-edge px-4 py-2 text-sm font-semibold text-ink-3">
            {teams.length} {teams.length === 1 ? "finalist" : "finalists"}
          </p>
        </div>

        <JudgingErrorBoundary>
          <RoundWorkspace
            teams={teams}
            judgeId={judge.id}
            round={ROUND_TWO}
            submitted={submitted}
            emptyTitle="No finalists yet"
            emptyBody="Finalists appear once judges submit their round 1 scores. Each judge promotes their highest scoring team."
            scoreAction={upsertRoundScore.bind(null, ROUND_TWO)}
            submitAction={submitRound.bind(null, ROUND_TWO)}
          />
        </JudgingErrorBoundary>
      </section>
    </main>
  );
}
