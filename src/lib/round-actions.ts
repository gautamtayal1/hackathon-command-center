"use server";

import { revalidatePath } from "next/cache";
import { lookupJudgeForHackathon } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isRoundNumber,
  MAX_CRITERION_SCORE,
  ROUND_ONE,
  ROUND_TWO,
  type ActionErrorCode,
  type ActionResult,
  type RoundNumber,
} from "@/lib/judging";
import { getCurrentHackathon, getFinalists } from "@/lib/rounds";

/**
 * Scoring actions never throw and never redirect. A thrown error in a server
 * action reaches production as an opaque digest, and a redirect would unmount
 * the scoring page along with everything the judge had typed. They return a
 * result the client can show, retry or keep buffered instead.
 */
function failure(code: ActionErrorCode, message: string): ActionResult {
  return { ok: false, code, message };
}

class ScoreInputError extends Error {}

function cleanScoreValue(value: FormDataEntryValue | null, label: string) {
  const score = Number(String(value ?? "").trim());

  if (!Number.isInteger(score) || score < 1 || score > MAX_CRITERION_SCORE) {
    throw new ScoreInputError(
      `${label} must be a whole number from 1 to ${MAX_CRITERION_SCORE}.`,
    );
  }

  return score;
}

async function requireJudgeForRound(round: number) {
  if (!isRoundNumber(round)) {
    return { ok: false as const, error: failure("invalid", "That judging round does not exist.") };
  }

  const hackathon = await getCurrentHackathon();
  const lookup = await lookupJudgeForHackathon(hackathon.id);

  if (lookup.status === "no-session") {
    return {
      ok: false as const,
      error: failure(
        "session",
        "Your sign-in expired. Nothing was lost - reconnect and save again.",
      ),
    };
  }

  if (lookup.status === "not-a-judge") {
    return {
      ok: false as const,
      error: failure("access", "You are not assigned to judge this hackathon."),
    };
  }

  return { ok: true as const, hackathon, judge: lookup.judge, round };
}

/**
 * Round 1 is limited to the judge's own group. Round 2 is open to every judge
 * because all of them score all finalists.
 */
async function requireTeamInRound(
  hackathonId: string,
  applicationId: string,
  groupId: string | null,
  round: RoundNumber,
) {
  const application = await prisma.application.findFirst({
    where: { id: applicationId, hackathonId },
    select: { id: true },
  });

  if (!application) {
    return { ok: false as const, error: failure("access", "Team not found.") };
  }

  if (round === ROUND_ONE) {
    if (!groupId) {
      return {
        ok: false as const,
        error: failure("access", "You are not assigned to a judging group yet."),
      };
    }

    const assignment = await prisma.applicationAssignment.findFirst({
      where: { hackathonId, applicationId: application.id, groupId },
      select: { id: true },
    });

    if (!assignment) {
      return {
        ok: false as const,
        error: failure("access", "This team is assigned to another judge."),
      };
    }

    return { ok: true as const, application };
  }

  const finalists = await getFinalists(hackathonId);

  if (!finalists.some((finalist) => finalist.id === application.id)) {
    return { ok: false as const, error: failure("access", "This team is not in the final round.") };
  }

  return { ok: true as const, application };
}

export async function upsertRoundScore(
  round: number,
  applicationId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const context = await requireJudgeForRound(round);

    if (!context.ok) {
      return context.error;
    }

    const team = await requireTeamInRound(
      context.hackathon.id,
      applicationId,
      context.judge.groupId,
      context.round,
    );

    if (!team.ok) {
      return team.error;
    }

    const pitchScore = cleanScoreValue(formData.get("pitchScore"), "Pitch");
    const potentialScore = cleanScoreValue(
      formData.get("potentialScore"),
      "Potential",
    );
    const uiUxScore = cleanScoreValue(formData.get("uiUxScore"), "UI/UX");
    const executionScore = cleanScoreValue(
      formData.get("executionScore"),
      "Execution",
    );
    const score = Math.round(
      (pitchScore + potentialScore + uiUxScore + executionScore) / 4,
    );
    const note = String(formData.get("note") ?? "").trim();
    const values = {
      score,
      pitchScore,
      potentialScore,
      uiUxScore,
      executionScore,
      note,
    };

    await prisma.score.upsert({
      where: {
        applicationId_judgeId_round: {
          applicationId: team.application.id,
          judgeId: context.judge.id,
          round: context.round,
        },
      },
      update: values,
      create: {
        ...values,
        hackathonId: context.hackathon.id,
        applicationId: team.application.id,
        judgeId: context.judge.id,
        round: context.round,
      },
    });

    // Deliberately no revalidatePath here: saving one card must not re-render
    // the judge's whole page. The read-only screens poll every 15 seconds.
    return { ok: true };
  } catch (error) {
    if (error instanceof ScoreInputError) {
      return failure("invalid", error.message);
    }

    console.error("upsertRoundScore failed", error);

    return failure(
      "server",
      "The server could not save that score. Your numbers are still here - try again.",
    );
  }
}

/**
 * Finalising a round is what moves the event on: round 1 promotes this judge's
 * top team onto /finalists, round 2 publishes their marks on /final-scores.
 */
export async function submitRound(round: number): Promise<ActionResult> {
  try {
    const context = await requireJudgeForRound(round);

    if (!context.ok) {
      return context.error;
    }

    const scored = await prisma.score.count({
      where: {
        judgeId: context.judge.id,
        round: context.round,
        score: { gt: 0 },
      },
    });

    if (!scored) {
      return failure("invalid", "Score at least one team before submitting.");
    }

    if (context.round === ROUND_TWO) {
      const finalists = await getFinalists(context.hackathon.id);

      if (scored < finalists.length) {
        return failure(
          "invalid",
          `Score all ${finalists.length} finalists before submitting.`,
        );
      }
    }

    await prisma.judge.update({
      where: { id: context.judge.id },
      data:
        context.round === ROUND_ONE
          ? { round1SubmittedAt: new Date() }
          : { round2SubmittedAt: new Date() },
    });

    if (context.round === ROUND_ONE) {
      await advanceHackathonRound(context.hackathon.id);
    }

    revalidateRound(context.round);

    return { ok: true };
  } catch (error) {
    console.error("submitRound failed", error);

    return failure(
      "server",
      "The server could not finish that round. Your saved scores are safe - try again.",
    );
  }
}

/** Round 2 opens once every judge has locked in their round 1 scores. */
async function advanceHackathonRound(hackathonId: string) {
  const pending = await prisma.judge.count({
    where: {
      hackathonId,
      inviteStatus: { not: "REVOKED" },
      round1SubmittedAt: null,
    },
  });

  if (pending) {
    return;
  }

  await prisma.hackathon.update({
    where: { id: hackathonId },
    data: { currentRound: ROUND_TWO },
  });
}

function revalidateRound(round: RoundNumber) {
  revalidatePath(round === ROUND_ONE ? "/round1" : "/round2");
  revalidatePath("/roster");
  revalidatePath("/finalists");
  revalidatePath("/final-scores");
  revalidatePath("/");
}
