import { ExternalLink } from "lucide-react";

type JudgeApplication = {
  id: string;
  teamName: string;
  participantsFullName: string;
  githubRepoUrl: string;
  builtDescription: string;
  groupName: string | null;
  score: {
    score: number;
    pitchScore: number;
    potentialScore: number;
    uiUxScore: number;
    executionScore: number;
    note: string;
  } | null;
};

export function JudgeWorkspace({
  applications,
  scoreAction,
}: {
  applications: JudgeApplication[];
  scoreAction: (applicationId: string, formData: FormData) => Promise<void>;
}) {
  if (!applications.length) {
    return (
      <div className="rounded-[20px] border border-[#303030] bg-[#212121] p-6">
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">
          No applications yet
        </h2>
        <p className="mt-2 text-sm font-medium leading-6 text-[#b4b4b4]">
          Teams will appear here when they submit the public form.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {applications.map((application, index) => (
        <form
          key={application.id}
          action={scoreAction.bind(null, application.id)}
          className="rounded-[20px] border border-[#303030] bg-[#212121] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.28)]"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#8f8f8f]">
                Team {index + 1}
                {application.groupName ? ` / ${application.groupName}` : ""}
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-white">
                {application.teamName}
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-[#b4b4b4]">
                {application.builtDescription}
              </p>
            </div>
            <div className="rounded-[20px] bg-black px-4 py-3 text-right">
              <p className="text-xs font-semibold text-[#8f8f8f]">Average</p>
              <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-white">
                {application.score ? application.score.score : "-"}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-4">
            <ScoreInput
              name="pitchScore"
              label="Pitch"
              value={application.score?.pitchScore}
            />
            <ScoreInput
              name="potentialScore"
              label="Potential"
              value={application.score?.potentialScore}
            />
            <ScoreInput
              name="uiUxScore"
              label="UI/UX"
              value={application.score?.uiUxScore}
            />
            <ScoreInput
              name="executionScore"
              label="Execution"
              value={application.score?.executionScore}
            />
          </div>

          <div className="mt-4 grid gap-3 border-t border-[#303030] pt-4 sm:grid-cols-[minmax(0,1fr)_160px]">
            <div className="space-y-2 text-sm font-medium text-[#b4b4b4]">
              <p>{application.participantsFullName}</p>
              <a
                href={application.githubRepoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-white transition hover:text-[#15b5b0]"
              >
                GitHub repo
                <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            </div>

            <button
              type="submit"
              className="h-11 rounded-[20px] bg-[#f4f4f4] px-4 text-sm font-semibold text-black transition hover:bg-white"
            >
              Save score
            </button>
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-semibold text-[#b4b4b4]">
              Note
            </span>
            <textarea
              name="note"
              rows={2}
              defaultValue={application.score?.note ?? ""}
              className="w-full resize-none rounded-[20px] border border-[#303030] bg-black px-4 py-3 text-sm font-medium text-white outline-none transition focus:border-[#4a4a4a]"
            />
          </label>
        </form>
      ))}
    </div>
  );
}

function ScoreInput({
  name,
  label,
  value,
}: {
  name: string;
  label: string;
  value?: number;
}) {
  return (
    <label className="block rounded-[20px] bg-black p-3">
      <span className="block text-xs font-semibold text-[#8f8f8f]">
        {label}
      </span>
      <input
        name={name}
        type="number"
        min={1}
        max={10}
        required
        defaultValue={value || ""}
        className="mt-2 h-10 w-full rounded-[18px] border border-[#303030] bg-[#171717] px-3 text-base font-semibold text-white outline-none transition focus:border-[#4a4a4a]"
      />
    </label>
  );
}
