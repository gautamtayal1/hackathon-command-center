"use client";

import { SCORE_CRITERIA, type CriterionName } from "@/lib/judging";

/**
 * Judges keep a scoring page open for the whole event, so a crash, a closed
 * laptop lid or an expired session must never cost them a score. Every
 * keystroke is mirrored into localStorage first and pushed to the server
 * second; the server copy is authoritative, the local copy is the seatbelt.
 */

const STORAGE_VERSION = 1;

export type DraftValues = Record<CriterionName, string> & { note: string };

export type TeamDraft = DraftValues & {
  /** When the judge last touched this card. */
  updatedAt: number;
  /** Set once these exact values are known to be on the server. */
  syncedAt: number | null;
};

type DraftFile = {
  version: number;
  round: number;
  judgeId: string;
  teams: Record<string, TeamDraft>;
};

/** Used when localStorage is unavailable (private windows, blocked storage). */
const memoryFallback = new Map<string, DraftFile>();

export function draftKey(round: number, judgeId: string) {
  return `draki.judging.v${STORAGE_VERSION}.r${round}.${judgeId}`;
}

export function emptyValues(): DraftValues {
  const values = { note: "" } as DraftValues;

  for (const criterion of SCORE_CRITERIA) {
    values[criterion.name] = "";
  }

  return values;
}

export function valuesFromScore(
  score: Partial<Record<CriterionName, number>> & { note?: string } = {},
): DraftValues {
  const values = { note: score.note ?? "" } as DraftValues;

  for (const criterion of SCORE_CRITERIA) {
    const value = score[criterion.name];
    values[criterion.name] = value ? String(value) : "";
  }

  return values;
}

export function sameValues(a: DraftValues, b: DraftValues) {
  if ((a.note ?? "").trim() !== (b.note ?? "").trim()) {
    return false;
  }

  return SCORE_CRITERIA.every(
    (criterion) =>
      (a[criterion.name] ?? "").trim() === (b[criterion.name] ?? "").trim(),
  );
}

export function hasAnyValue(values: DraftValues) {
  return (
    (values.note ?? "").trim().length > 0 ||
    SCORE_CRITERIA.some(
      (criterion) => (values[criterion.name] ?? "").trim().length > 0,
    )
  );
}

/** Every read and write is defensive: storage must never take the page down. */
function readFile(key: string): DraftFile | null {
  const fallback = memoryFallback.get(key) ?? null;

  try {
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as DraftFile;

    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.teams !== "object" ||
      parsed.teams === null
    ) {
      return fallback;
    }

    return parsed;
  } catch {
    return fallback;
  }
}

function writeFile(key: string, file: DraftFile) {
  memoryFallback.set(key, file);

  try {
    window.localStorage.setItem(key, JSON.stringify(file));
  } catch {
    // Quota or blocked storage: the in-memory copy still covers a re-render.
  }
}

function normaliseDraft(draft: unknown): TeamDraft | null {
  if (!draft || typeof draft !== "object") {
    return null;
  }

  const source = draft as Record<string, unknown>;
  const values = { note: "" } as DraftValues;

  for (const criterion of SCORE_CRITERIA) {
    const value = source[criterion.name];
    values[criterion.name] = typeof value === "string" ? value : "";
  }

  values.note = typeof source.note === "string" ? source.note : "";

  return {
    ...values,
    updatedAt: typeof source.updatedAt === "number" ? source.updatedAt : 0,
    syncedAt: typeof source.syncedAt === "number" ? source.syncedAt : null,
  };
}

export function readTeamDraft(key: string, teamId: string): TeamDraft | null {
  const file = readFile(key);

  if (!file) {
    return null;
  }

  return normaliseDraft(file.teams?.[teamId]);
}

export function readAllDrafts(key: string): Record<string, TeamDraft> {
  const file = readFile(key);
  const drafts: Record<string, TeamDraft> = {};

  if (!file?.teams) {
    return drafts;
  }

  for (const [teamId, draft] of Object.entries(file.teams)) {
    const normalised = normaliseDraft(draft);

    if (normalised) {
      drafts[teamId] = normalised;
    }
  }

  return drafts;
}

export function writeTeamDraft(
  key: string,
  round: number,
  judgeId: string,
  teamId: string,
  values: DraftValues,
  syncedAt: number | null,
) {
  const file = readFile(key) ?? {
    version: STORAGE_VERSION,
    round,
    judgeId,
    teams: {},
  };

  writeFile(key, {
    ...file,
    version: STORAGE_VERSION,
    round,
    judgeId,
    teams: {
      ...file.teams,
      [teamId]: { ...values, updatedAt: Date.now(), syncedAt },
    },
  });
}

/**
 * Drafts are kept even after a successful save (marked synced) so a reload
 * still shows the judge their own numbers if the server round-trip is slow.
 * Older rounds are cleaned up on load instead.
 */
export function clearStaleDraftFiles(currentKey: string) {
  try {
    const prefix = `draki.judging.v${STORAGE_VERSION}.`;
    const stale: string[] = [];

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);

      if (!key || key === currentKey || !key.startsWith(prefix)) {
        continue;
      }

      const file = readFile(key);
      const teams = Object.values(file?.teams ?? {});
      const unsynced = teams.some((team) => !team?.syncedAt);
      const newest = teams.reduce(
        (latest, team) => Math.max(latest, team?.updatedAt ?? 0),
        0,
      );
      const olderThanADay = Date.now() - newest > 24 * 60 * 60 * 1000;

      if (!unsynced && olderThanADay) {
        stale.push(key);
      }
    }

    for (const key of stale) {
      window.localStorage.removeItem(key);
      memoryFallback.delete(key);
    }
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}
