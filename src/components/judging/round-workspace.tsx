"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  SCORE_CRITERIA,
  type ActionResult,
  type RoundTeam,
} from "@/lib/judging";
import {
  clearStaleDraftFiles,
  draftKey,
  hasAnyValue,
  readTeamDraft,
  sameValues,
  valuesFromScore,
  writeTeamDraft,
  type DraftValues,
} from "@/lib/score-drafts";

type ScoreAction = (
  applicationId: string,
  formData: FormData,
) => Promise<ActionResult>;

type CardSummary = {
  dirty: boolean;
  saving: boolean;
  scored: boolean;
  errorCode: string | null;
};

const AUTOSAVE_DELAY_MS = 1200;
const MAX_AUTO_RETRIES = 8;

function retryDelay(attempt: number) {
  return Math.min(2000 * 2 ** (attempt - 1), 30000);
}

function isCompleteScore(values: DraftValues) {
  return SCORE_CRITERIA.every((criterion) => {
    const raw = (values[criterion.name] ?? "").trim();
    const value = Number(raw);

    return raw !== "" && Number.isInteger(value) && value >= 1 && value <= 10;
  });
}

function totalOf(values: DraftValues) {
  return SCORE_CRITERIA.reduce(
    (total, criterion) => total + (Number(values[criterion.name]) || 0),
    0,
  );
}

export function RoundWorkspace({
  teams,
  round,
  judgeId,
  submitted,
  emptyTitle,
  emptyBody,
  scoreAction,
  submitAction,
}: {
  teams: RoundTeam[];
  round: number;
  judgeId: string;
  submitted: boolean;
  emptyTitle: string;
  emptyBody: string;
  scoreAction: ScoreAction;
  submitAction: () => Promise<ActionResult>;
}) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cards, setCards] = useState<Record<string, CardSummary>>({});
  const [retryToken, setRetryToken] = useState(0);
  const [online, setOnline] = useState(true);
  const storageKey = useMemo(() => draftKey(round, judgeId), [round, judgeId]);

  const reportCard = useCallback((teamId: string, summary: CardSummary) => {
    setCards((previous) => {
      const current = previous[teamId];

      if (
        current &&
        current.dirty === summary.dirty &&
        current.saving === summary.saving &&
        current.scored === summary.scored &&
        current.errorCode === summary.errorCode
      ) {
        return previous;
      }

      return { ...previous, [teamId]: summary };
    });
  }, []);

  const summaries = Object.values(cards);
  const unsavedCount = summaries.filter((card) => card.dirty).length;
  const savedCount = teams.filter((team) => {
    const card = cards[team.id];

    if (card) {
      return card.scored && !card.dirty;
    }

    return (team.score?.score ?? 0) > 0;
  }).length;
  const scoredCount = teams.filter((team) => {
    const card = cards[team.id];

    return card ? card.scored : (team.score?.score ?? 0) > 0;
  }).length;
  const sessionLost = summaries.some((card) => card.errorCode === "session");

  useEffect(() => {
    clearStaleDraftFiles(storageKey);
  }, [storageKey]);

  useEffect(() => {
    function sync() {
      setOnline(navigator.onLine);
    }

    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);

    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  /** A reload would still restore the drafts, but warn before losing the tab. */
  useEffect(() => {
    if (!unsavedCount) {
      return;
    }

    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", warn);

    return () => window.removeEventListener("beforeunload", warn);
  }, [unsavedCount]);

  async function handleSubmitRound() {
    setError("");
    setSubmitting(true);

    try {
      const result = await submitAction();

      if (!result.ok) {
        setError(result.message);
      }
    } catch {
      setError(
        "Could not reach the server to submit this round. Your scores are safe - try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!teams.length) {
    return (
      <div className="rounded-[20px] border border-[#303030] bg-[#212121] p-6">
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">
          {emptyTitle}
        </h2>
        <p className="mt-2 text-sm font-medium leading-6 text-[#b4b4b4]">
          {emptyBody}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-20 -mx-1 rounded-[20px] border border-[#303030] bg-[#171717]/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium">
          <span className="flex items-center gap-2 text-white">
            <CheckCircle2 className="size-4 text-[#15b5b0]" aria-hidden="true" />
            {savedCount} of {teams.length} saved to the server
          </span>
          {unsavedCount ? (
            <span className="flex items-center gap-2 text-[#ffd8a8]">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              {unsavedCount} kept on this device, sending automatically
            </span>
          ) : (
            <span className="text-[#9b9b9b]">
              Every score is stored on this device as you type.
            </span>
          )}
          {!online ? (
            <span className="flex items-center gap-2 text-[#ffd1df]">
              <CloudOff className="size-4" aria-hidden="true" />
              Offline - scores are held here until the connection is back
            </span>
          ) : null}
        </div>
      </div>

      {sessionLost ? (
        <div className="rounded-[20px] border border-[#6d5321] bg-[#241d10] p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-[#ffe2ad]">
            <AlertTriangle className="size-4" aria-hidden="true" />
            Your sign-in expired
          </p>
          <p className="mt-2 text-sm font-medium leading-6 text-[#e2cfa8]">
            Nothing is lost. Every score on this page is stored in this browser.
            Sign in again in a new tab, then press retry - this page stays
            exactly as it is.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={`/judge/login?next=/round${round}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-[20px] bg-[#f4f4f4] px-4 text-sm font-semibold text-black transition hover:bg-white"
            >
              Sign in again
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
            <button
              type="button"
              onClick={() => setRetryToken((token) => token + 1)}
              className="inline-flex h-10 items-center gap-2 rounded-[20px] border border-[#4a4a4a] px-4 text-sm font-semibold text-white transition hover:bg-[#252525]"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Retry saving
            </button>
          </div>
        </div>
      ) : null}

      {teams.map((team, index) => (
        <TeamScoreCard
          key={team.id}
          team={team}
          index={index}
          round={round}
          judgeId={judgeId}
          storageKey={storageKey}
          retryToken={retryToken}
          scoreAction={scoreAction}
          onReport={reportCard}
        />
      ))}

      <div className="rounded-[20px] border border-[#303030] bg-[#212121] p-5">
        {submitted ? (
          <div className="flex items-center gap-3">
            <CheckCircle2
              className="size-5 shrink-0 text-[#15b5b0]"
              aria-hidden="true"
            />
            <div>
              <p className="text-lg font-semibold tracking-[-0.03em] text-white">
                Round {round} submitted
              </p>
              <p className="mt-1 text-sm font-medium text-[#9b9b9b]">
                You can still change a score above; it updates the results
                straight away.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-semibold tracking-[-0.03em] text-white">
                Finish round {round}
              </p>
              <p className="mt-1 text-sm font-medium text-[#9b9b9b]">
                {scoredCount} of {teams.length} teams scored.
                {round === 1
                  ? " Submitting sends your top team to the finals."
                  : " Submitting publishes your marks on the final scores screen."}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSubmitRound}
              disabled={submitting}
              className="h-11 shrink-0 rounded-[20px] bg-[#f4f4f4] px-5 text-sm font-semibold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:bg-[#3a3a3a] disabled:text-[#8f8f8f]"
            >
              {submitting ? "Submitting" : `Submit round ${round}`}
            </button>
          </div>
        )}

        {error ? (
          <p className="mt-4 rounded-[20px] border border-[#6d2142] bg-[#2a111c] px-4 py-3 text-sm font-medium text-[#ffd1df]">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function TeamScoreCard({
  team,
  index,
  round,
  judgeId,
  storageKey,
  retryToken,
  scoreAction,
  onReport,
}: {
  team: RoundTeam;
  index: number;
  round: number;
  judgeId: string;
  storageKey: string;
  retryToken: number;
  scoreAction: ScoreAction;
  onReport: (teamId: string, summary: CardSummary) => void;
}) {
  const serverValues = useMemo(
    () => valuesFromScore(team.score ?? {}),
    [team.score],
  );
  const [values, setValues] = useState<DraftValues>(serverValues);
  const [syncedValues, setSyncedValues] = useState<DraftValues>(serverValues);
  const [restored, setRestored] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<{
    code: string;
    message: string;
  } | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [everSaved, setEverSaved] = useState(Boolean(team.score));

  const dirty = !sameValues(values, syncedValues);
  const complete = isCompleteScore(values);
  const scored = complete || (team.score?.score ?? 0) > 0;

  /**
   * Pull back anything this browser was holding from a previous render, a
   * crash or a reload. Reading storage has to happen after mount so the server
   * and client agree on the first paint.
   */
  useEffect(() => {
    const draft = readTeamDraft(storageKey, team.id);

    if (!draft) {
      return;
    }

    const draftValues: DraftValues = { note: draft.note } as DraftValues;

    for (const criterion of SCORE_CRITERIA) {
      draftValues[criterion.name] = draft[criterion.name];
    }

    if (hasAnyValue(draftValues) && !sameValues(draftValues, serverValues)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating from localStorage, which cannot be read during the server render
      setValues(draftValues);
      setRestored(true);
    }
    // Runs once per card: later renders must never overwrite live typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, team.id]);

  function update(patch: Partial<DraftValues>) {
    const next = { ...values, ...patch };

    setValues(next);
    setFailure(null);
    setAttempts(0);
    writeTeamDraft(storageKey, round, judgeId, team.id, next, null);
  }

  const save = useCallback(async () => {
    if (!isCompleteScore(values)) {
      setFailure({
        code: "invalid",
        message: "Give all four criteria a score from 1 to 10 before saving.",
      });

      return;
    }

    setSaving(true);

    const formData = new FormData();

    for (const criterion of SCORE_CRITERIA) {
      formData.set(criterion.name, values[criterion.name]);
    }

    formData.set("note", values.note ?? "");

    try {
      const result = await scoreAction(team.id, formData);

      if (result.ok) {
        setSyncedValues(values);
        setFailure(null);
        setAttempts(0);
        setEverSaved(true);
        writeTeamDraft(storageKey, round, judgeId, team.id, values, Date.now());
      } else {
        setFailure({ code: result.code, message: result.message });
        setAttempts((count) => count + 1);
      }
    } catch {
      setFailure({
        code: "network",
        message: navigator.onLine
          ? "Could not reach the server. This score is held on this device and will retry."
          : "You are offline. This score is held on this device and will be sent when you reconnect.",
      });
      setAttempts((count) => count + 1);
    } finally {
      setSaving(false);
    }
  }, [values, scoreAction, team.id, storageKey, round, judgeId]);

  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  /** Autosave a complete card, and keep retrying a failed save with a widening gap. */
  useEffect(() => {
    if (!dirty || saving || !complete) {
      return;
    }

    if (failure && (failure.code === "access" || attempts >= MAX_AUTO_RETRIES)) {
      return;
    }

    const delay = failure ? retryDelay(attempts) : AUTOSAVE_DELAY_MS;
    const timer = setTimeout(() => {
      void saveRef.current();
    }, delay);

    return () => clearTimeout(timer);
  }, [dirty, saving, complete, failure, attempts]);

  /** The judge pressed retry on the expired-session banner. */
  useEffect(() => {
    if (!retryToken) {
      return;
    }

    const timer = setTimeout(() => {
      setAttempts(0);
      setFailure(null);
      void saveRef.current();
    }, 0);

    return () => clearTimeout(timer);
  }, [retryToken]);

  /** Coming back online restarts the retry ladder straight away. */
  useEffect(() => {
    function retryNow() {
      setAttempts(0);
      setFailure(null);
    }

    window.addEventListener("online", retryNow);

    return () => window.removeEventListener("online", retryNow);
  }, []);

  useEffect(() => {
    onReport(team.id, {
      dirty,
      saving,
      scored,
      errorCode: failure?.code ?? null,
    });
  }, [onReport, team.id, dirty, saving, scored, failure]);

  const total = totalOf(values);

  return (
    <div className="rounded-[20px] border border-[#303030] bg-[#212121] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#8f8f8f]">
            Round {round} / Team {index + 1}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-white">
            {team.teamName}
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-[#b4b4b4]">
            {team.builtDescription}
          </p>
        </div>
        <div className="rounded-[20px] bg-black px-4 py-3 text-right">
          <p className="text-xs font-semibold text-[#8f8f8f]">Your total</p>
          <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-white">
            {total > 0 ? total : "-"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-4">
        {SCORE_CRITERIA.map((criterion) => (
          <ScoreInput
            key={criterion.name}
            name={criterion.name}
            label={criterion.label}
            value={values[criterion.name]}
            onChange={(value) => update({ [criterion.name]: value })}
          />
        ))}
      </div>

      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-semibold text-[#b4b4b4]">
          Note
        </span>
        <textarea
          name="note"
          rows={2}
          value={values.note}
          onChange={(event) => update({ note: event.target.value })}
          className="w-full resize-none rounded-[20px] border border-[#303030] bg-black px-4 py-3 text-sm font-medium text-white outline-none transition focus:border-[#4a4a4a]"
        />
      </label>

      <div className="mt-4 grid gap-3 border-t border-[#303030] pt-4 sm:grid-cols-[minmax(0,1fr)_160px]">
        <div className="space-y-2 text-sm font-medium text-[#b4b4b4]">
          <p>{team.participantsFullName}</p>
          {team.githubRepoUrl ? (
            <a
              href={team.githubRepoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-white transition hover:text-[#15b5b0]"
            >
              GitHub repo
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          ) : null}
          <SaveState
            dirty={dirty}
            saving={saving}
            complete={complete}
            failure={failure}
            everSaved={everSaved}
            restored={restored}
          />
        </div>

        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="h-11 rounded-[20px] bg-[#f4f4f4] px-4 text-sm font-semibold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:bg-[#3a3a3a] disabled:text-[#8f8f8f]"
        >
          {saving ? "Saving" : dirty ? "Save now" : "Saved"}
        </button>
      </div>

      {failure ? (
        <p className="mt-3 rounded-[20px] border border-[#6d2142] bg-[#2a111c] px-4 py-3 text-sm font-medium text-[#ffd1df]">
          {failure.message}
        </p>
      ) : null}
    </div>
  );
}


function SaveState({
  dirty,
  saving,
  complete,
  failure,
  everSaved,
  restored,
}: {
  dirty: boolean;
  saving: boolean;
  complete: boolean;
  failure: { code: string; message: string } | null;
  everSaved: boolean;
  restored: boolean;
}) {
  if (saving) {
    return (
      <p className="flex items-center gap-2 text-xs font-semibold text-[#b4b4b4]">
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        Saving to the server
      </p>
    );
  }

  if (dirty && failure) {
    return (
      <p className="flex items-center gap-2 text-xs font-semibold text-[#ffd8a8]">
        <AlertTriangle className="size-3.5" aria-hidden="true" />
        Held on this device, retrying
      </p>
    );
  }

  if (dirty) {
    return (
      <p className="flex items-center gap-2 text-xs font-semibold text-[#ffd8a8]">
        <CheckCircle2 className="size-3.5" aria-hidden="true" />
        {complete
          ? "Saved on this device, sending"
          : "Saved on this device, finish all four scores to send"}
      </p>
    );
  }

  if (everSaved) {
    return (
      <p className="flex items-center gap-2 text-xs font-semibold text-[#15b5b0]">
        <CheckCircle2 className="size-3.5" aria-hidden="true" />
        Saved to the server
        {restored ? " (restored from this device)" : ""}
      </p>
    );
  }

  return (
    <p className="text-xs font-semibold text-[#8f8f8f]">Not scored yet</p>
  );
}

function ScoreInput({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block rounded-[20px] bg-black p-3">
      <span className="block text-xs font-semibold text-[#8f8f8f]">{label}</span>
      <input
        name={name}
        type="number"
        inputMode="numeric"
        min={1}
        max={10}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full rounded-[18px] border border-[#303030] bg-[#171717] px-3 text-base font-semibold text-white outline-none transition focus:border-[#4a4a4a]"
      />
    </label>
  );
}
