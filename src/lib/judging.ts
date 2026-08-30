export const ROUND_ONE = 1;
export const ROUND_TWO = 2;

export type RoundNumber = typeof ROUND_ONE | typeof ROUND_TWO;

export const SCORE_CRITERIA = [
  { name: "pitchScore", label: "Pitch" },
  { name: "potentialScore", label: "Potential" },
  { name: "uiUxScore", label: "UI/UX" },
  { name: "executionScore", label: "Execution" },
] as const;

export const MAX_CRITERION_SCORE = 10;
export const MAX_TOTAL_SCORE = SCORE_CRITERIA.length * MAX_CRITERION_SCORE;

export type CriterionName = (typeof SCORE_CRITERIA)[number]["name"];

export type RoundScore = {
  score: number;
  pitchScore: number;
  potentialScore: number;
  uiUxScore: number;
  executionScore: number;
  note: string;
};

export type RoundTeam = {
  id: string;
  teamName: string;
  participantsFullName: string;
  githubRepoUrl: string;
  builtDescription: string;
  score: RoundScore | null;
};

export type RosterJudge = {
  id: string;
  name: string;
  groupName: string | null;
  submittedRoundOne: boolean;
  teams: Array<{ id: string; teamName: string; participantsFullName: string }>;
};

export type Finalist = {
  id: string;
  teamName: string;
  participantsFullName: string;
  githubRepoUrl: string;
  builtDescription: string;
  promotedByJudge: string;
  roundOneTotal: number;
};

export type FinalScore = {
  id: string;
  teamName: string;
  participantsFullName: string;
  average: number | null;
  scoredBy: number;
  criteriaAverages: Record<CriterionName, number | null>;
  judgeScores: Array<{ judgeName: string; total: number; note: string }>;
};

export function isRoundNumber(value: number): value is RoundNumber {
  return value === ROUND_ONE || value === ROUND_TWO;
}

export function scoreTotal(score: {
  pitchScore: number;
  potentialScore: number;
  uiUxScore: number;
  executionScore: number;
}) {
  return (
    score.pitchScore +
    score.potentialScore +
    score.uiUxScore +
    score.executionScore
  );
}

export function averageOf(values: number[]) {
  if (!values.length) {
    return null;
  }

  return (
    Math.round(
      (values.reduce((total, value) => total + value, 0) / values.length) * 10,
    ) / 10
  );
}

export const JUDGE_PATHS = ["/judge", "/round1", "/round2"] as const;

export const DEFAULT_JUDGE_PATH = "/round1";

/** True for the routes a judge (rather than an admin) is allowed to land on. */
export function isJudgePath(value: string) {
  return JUDGE_PATHS.some(
    (path) => value === path || value.startsWith(`${path}/`),
  );
}

/**
 * Scoring server actions return this instead of throwing: a thrown error
 * reaches the browser as an opaque digest in production, and the judging
 * screens need to tell "sign in again" apart from "try that again".
 */
export type ActionErrorCode =
  | "session"
  | "access"
  | "invalid"
  | "server";

export type ActionResult =
  | { ok: true }
  | { ok: false; code: ActionErrorCode; message: string };
