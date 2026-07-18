"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { SCORE_CRITERIA, type ScoreCriterionName } from "@/lib/board";

type JudgeScore = {
  score: number;
} & Record<ScoreCriterionName, number>;

type JudgeApplication = {
  id: string;
  teamName: string;
  participantsFullName: string;
  githubRepoUrl: string;
  builtDescription: string;
  groupName: string | null;
  score: JudgeScore | null;
};

export function JudgeWorkspace({
  applications,
  submitAction,
  round,
  alreadySubmitted,
}: {
  applications: JudgeApplication[];
  submitAction: (formData: FormData) => Promise<void>;
  round: number;
  alreadySubmitted: boolean;
}) {
  if (!applications.length) {
    return (
      <div className="rounded-[20px] border border-[#303030] bg-[#212121] p-6">
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">
          {round === 2 ? "No finalists yet" : "No teams assigned yet"}
        </h2>
        <p className="mt-2 text-sm font-medium leading-6 text-[#b4b4b4]">
          {round === 2
            ? "The finalist teams will appear here once round 1 is complete."
            : "Teams will appear here once the organizers assign your group."}
        </p>
      </div>
    );
  }

  return (
    <form action={submitAction} className="space-y-3">
      {applications.map((application, index) => (
        <TeamScoreCard
          key={application.id}
          application={application}
          index={index}
          round={round}
        />
      ))}

      <div className="sticky bottom-4 flex flex-col gap-3 rounded-[20px] border border-[#303030] bg-[#191919]/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-[#b4b4b4]">
          {alreadySubmitted ? (
            <span className="inline-flex items-center gap-2 text-[#8fd46a]">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Scores submitted. You can update and submit again.
            </span>
          ) : (
            `Score all ${applications.length} ${
              applications.length === 1 ? "team" : "teams"
            } out of 10, then submit.`
          )}
        </p>
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[20px] bg-[#f4f4f4] px-5 text-sm font-semibold text-black transition hover:bg-white"
        >
          {alreadySubmitted ? "Update submission" : "Submit scores"}
        </button>
      </div>
    </form>
  );
}

function TeamScoreCard({
  application,
  index,
  round,
}: {
  application: JudgeApplication;
  index: number;
  round: number;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      SCORE_CRITERIA.map((criterion) => [
        criterion.name,
        application.score?.[criterion.name]
          ? String(application.score[criterion.name])
          : "",
      ]),
    ),
  );

  const average = useMemo(() => {
    const entered = SCORE_CRITERIA.map((criterion) =>
      Number(values[criterion.name]),
    ).filter((value) => Number.isFinite(value) && value > 0);

    if (!entered.length) {
      return null;
    }

    const mean =
      entered.reduce((total, value) => total + value, 0) / entered.length;
    return Math.round(mean * 10) / 10;
  }, [values]);

  return (
    <div className="rounded-[20px] border border-[#303030] bg-[#212121] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#8f8f8f]">
            {round === 2 ? "Finalist" : "Team"} {index + 1}
            {application.groupName ? ` / ${application.groupName}` : ""}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-white">
            {application.teamName}
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-[#b4b4b4]">
            {application.builtDescription}
          </p>
          <a
            href={application.githubRepoUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-white transition hover:text-[#15b5b0]"
          >
            GitHub repo
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        </div>
        <div className="rounded-[20px] bg-black px-5 py-3 text-right">
          <p className="text-xs font-semibold text-[#8f8f8f]">Average</p>
          <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-white">
            {average === null ? "—" : average}
            <span className="text-base font-medium text-[#8f8f8f]"> / 10</span>
          </p>
        </div>
      </div>

      <p className="mt-5 text-xs font-semibold text-[#8f8f8f]">
        Score each criterion out of 10
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-4">
        {SCORE_CRITERIA.map((criterion) => (
          <label
            key={criterion.name}
            className="block rounded-[20px] bg-black p-3"
          >
            <span className="flex items-center justify-between text-xs font-semibold text-[#8f8f8f]">
              <span>{criterion.label}</span>
              <span className="text-[#6f6f6f]">out of 10</span>
            </span>
            <input
              name={`${criterion.name}__${application.id}`}
              type="number"
              min={1}
              max={10}
              required
              value={values[criterion.name]}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [criterion.name]: event.target.value,
                }))
              }
              placeholder="1-10"
              className="mt-2 h-10 w-full rounded-[18px] border border-[#303030] bg-[#171717] px-3 text-base font-semibold text-white outline-none transition focus:border-[#4a4a4a]"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
