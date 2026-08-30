"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Loader2, Plus, X } from "lucide-react";
import {
  submitApplication,
  type ApplicationFormState,
} from "@/lib/actions";

const initialState: ApplicationFormState = {
  status: "idle",
  message: "",
};

const requiredApplicationFields = [
  "teamName",
  "participantsFullName",
  "githubRepoUrl",
  "builtDescription",
] as const;

export function ApplicationForm({
  hackathonId,
}: {
  hackathonId: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [canSubmit, setCanSubmit] = useState(false);
  const [focusedField, setFocusedField] = useState("");
  const [githubTouched, setGithubTouched] = useState(false);
  const [githubError, setGithubError] = useState("");
  const [emails, setEmails] = useState<string[]>([""]);
  const [touchedEmails, setTouchedEmails] = useState<number[]>([]);
  const [filledFields, setFilledFields] = useState(0);
  const [state, formAction, pending] = useActionState(
    submitApplication.bind(null, hackathonId),
    initialState,
  );
  const emailsReady = useMemo(() => {
    const filled = emails.map((email) => email.trim()).filter(Boolean);

    return filled.length > 0 && filled.every(isEmailFormatValid);
  }, [emails]);
  const submitDisabled = pending || !canSubmit || !emailsReady;
  const completedSteps = filledFields + (emailsReady ? 1 : 0);
  const totalSteps = requiredApplicationFields.length + 1;

  function updateEmail(index: number, value: string) {
    setEmails((current) =>
      current.map((email, position) => (position === index ? value : email)),
    );
  }

  function addEmail() {
    setEmails((current) => [...current, ""]);
  }

  function removeEmail(index: number) {
    setEmails((current) =>
      current.length === 1 ? [""] : current.filter((_, position) => position !== index),
    );
    setTouchedEmails((current) =>
      current
        .filter((position) => position !== index)
        .map((position) => (position > index ? position - 1 : position)),
    );
  }

  function markEmailTouched(index: number) {
    setTouchedEmails((current) =>
      current.includes(index) ? current : [...current, index],
    );
  }

  useEffect(() => {
    if (formRef.current) {
      setCanSubmit(isApplicationFormReady(formRef.current));
      setFilledFields(countFilledFields(formRef.current));
    }
  }, []);

  function refreshFormState(form: HTMLFormElement, targetName = "") {
    setCanSubmit(isApplicationFormReady(form));
    setFilledFields(countFilledFields(form));

    const githubValue = getFormFieldValue(form, "githubRepoUrl");
    const shouldValidateGithub =
      githubTouched ||
      (targetName !== "githubRepoUrl" && githubValue.length > 0);

    if (shouldValidateGithub) {
      setGithubTouched(true);
      setGithubError(getGithubRepoLinkError(githubValue));
    }
  }

  function validateGithubFromForm(form: HTMLFormElement) {
    const githubValue = getFormFieldValue(form, "githubRepoUrl");

    if (githubValue) {
      setGithubTouched(true);
      setGithubError(getGithubRepoLinkError(githubValue));
    }
  }

  function handleFormPointerDown(
    event: React.PointerEvent<HTMLFormElement>,
  ) {
    const targetName = getTargetFieldName(event.target);
    const activeName = getTargetFieldName(document.activeElement);

    if (activeName === "githubRepoUrl" && targetName !== "githubRepoUrl") {
      validateGithubFromForm(event.currentTarget);
    }
  }

  function handleFormFocus(event: React.FocusEvent<HTMLFormElement>) {
    const targetName = getTargetFieldName(event.target);
    setFocusedField(targetName);

    if (targetName && targetName !== "githubRepoUrl") {
      validateGithubFromForm(event.currentTarget);
    }
  }

  function handleFormBlur(event: React.FocusEvent<HTMLFormElement>) {
    const nextTarget = event.relatedTarget;

    if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
      setFocusedField("");
    }
  }

  function handleGithubBlur(event: React.FocusEvent<HTMLInputElement>) {
    setGithubTouched(true);
    setGithubError(getGithubRepoLinkError(event.currentTarget.value));

    if (formRef.current) {
      setCanSubmit(isApplicationFormReady(formRef.current));
    }
  }

  if (state.status === "success") {
    const judgeNames = state.judgeNames ?? [];

    return (
      <div className="overflow-hidden rounded-[24px] border border-[#232326] bg-[#0b0b0e] shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
        <div className="border-b border-[#1b1b1f] bg-[radial-gradient(120%_140%_at_50%_-40%,rgba(29,77,255,0.28),transparent)] px-6 py-12 text-center sm:px-10">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-[#1d4dff] text-white shadow-[0_0_0_8px_rgba(29,77,255,0.14)]">
            <Check className="size-6" strokeWidth={3} aria-hidden="true" />
          </span>
          <h2 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
            Submission received
          </h2>
          <p className="mx-auto mt-3 max-w-[38ch] text-[15px] font-medium text-[#9b9b9b]">
            Your project is locked in. Keep your repo public and your demo ready
            for round 1.
          </p>
        </div>

        <div className="px-6 py-6 sm:px-10 sm:py-8">
          {judgeNames.length ? (
            <div className="rounded-[18px] border border-[#232326] bg-[#111114] px-6 py-6 text-center">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-[#6d78a6] uppercase">
                {judgeNames.length === 1 ? "Your judge" : "Your judges"}
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
                {judgeNames.join(" & ")}
              </p>
              <p className="mt-3 text-sm font-medium text-[#9b9b9b]">
                You will pitch to them in round 1.
              </p>
            </div>
          ) : (
            <p className="rounded-[18px] border border-[#232326] bg-[#111114] px-6 py-5 text-center text-sm font-medium text-[#9b9b9b]">
              Your judge is assigned shortly before judging starts.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="overflow-hidden rounded-[24px] border border-[#232326] bg-[#0b0b0e] shadow-[0_30px_90px_rgba(0,0,0,0.55)]"
      onPointerDownCapture={handleFormPointerDown}
      onFocus={handleFormFocus}
      onBlur={handleFormBlur}
      onChange={(event) =>
        refreshFormState(
          event.currentTarget,
          getTargetFieldName(event.target),
        )
      }
      onInput={(event) =>
        refreshFormState(
          event.currentTarget,
          getTargetFieldName(event.target),
        )
      }
    >
      <FormProgress completed={completedSteps} total={totalSteps} />

      <div className="space-y-8 px-5 py-7 sm:px-8 sm:py-9">
        <FormSection step={1} title="Your team">
          <ApplicationField
            name="teamName"
            label="Team name"
            helper="How you want to be announced on the leaderboard."
            autoComplete="organization"
            focused={focusedField === "teamName"}
          />
          <ApplicationField
            name="participantsFullName"
            label="Participants' names"
            helper="Full names, comma separated."
            autoComplete="name"
            multiline
            rows={3}
            focused={focusedField === "participantsFullName"}
          />

          <fieldset className="block border-0 p-0">
            <legend className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold tracking-[0.01em] text-[#e4e4e6]">
              Participants&apos; emails
              <RequiredMark />
            </legend>
            <p className="mb-3 text-[12px] font-medium text-[#7b7b7f]">
              One per participant — we send judging updates here.
            </p>

            <div className="space-y-2">
              {emails.map((email, index) => {
                const error =
                  touchedEmails.includes(index) && email.trim().length > 0 && !isEmailFormatValid(email)
                    ? "Use an email like team@example.com."
                    : "";

                return (
                  <div key={index}>
                    <div className="flex items-center gap-2">
                      <input
                        name="participantEmails"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="name@example.com"
                        value={email}
                        aria-label={`Participant email ${index + 1}`}
                        aria-invalid={error ? "true" : undefined}
                        onChange={(event) => updateEmail(index, event.currentTarget.value)}
                        onBlur={() => markEmailTouched(index)}
                        className={`${controlBase} h-11 w-full ${
                          error ? controlError : controlIdle
                        }`}
                      />
                      {emails.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeEmail(index)}
                          title="Remove email"
                          aria-label={`Remove participant email ${index + 1}`}
                          className="grid size-9 shrink-0 place-items-center rounded-[12px] border border-transparent text-[#7b7b7f] transition hover:border-[#2c2c31] hover:bg-[#17171b] hover:text-white"
                        >
                          <X className="size-4" aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                    {error ? <FieldError>{error}</FieldError> : null}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={addEmail}
              className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-[12px] border border-[#2c2c31] bg-[#131317] px-3 text-[13px] font-semibold text-[#c6c6ca] transition hover:border-[#3d4a7a] hover:bg-[#14172a] hover:text-white"
            >
              <Plus className="size-4" aria-hidden="true" />
              Add another email
            </button>
          </fieldset>
        </FormSection>

        <div className="h-px bg-[#1b1b1f]" />

        <FormSection step={2} title="Your project">
          <ApplicationField
            name="githubRepoUrl"
            label="GitHub repo link"
            helper="Must be public — judges review the code. e.g. github.com/team/repo"
            placeholder="github.com/team/repo"
            inputMode="url"
            autoComplete="url"
            error={githubError}
            onBlur={handleGithubBlur}
            focused={focusedField === "githubRepoUrl"}
          />
          <ApplicationField
            name="builtDescription"
            label="What have you built?"
            helper="One line. What it does and who it's for."
            multiline
            rows={3}
            focused={focusedField === "builtDescription"}
          />
        </FormSection>
      </div>

      <div className="border-t border-[#1b1b1f] bg-[#08080a] px-5 py-5 sm:px-8">
        {state.status === "error" ? (
          <p className="mb-4 rounded-[14px] border border-[#6d2142] bg-[#22101a] px-4 py-3 text-sm font-medium text-[#ffd1df]">
            {state.message}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <button
            type="submit"
            disabled={submitDisabled}
            className="inline-flex h-11 items-center gap-2 rounded-[14px] bg-[#1d4dff] px-5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(29,77,255,0.35)] transition hover:bg-[#3a63ff] disabled:cursor-not-allowed disabled:bg-[#1c1c20] disabled:text-[#6f6f74] disabled:shadow-none"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Submitting
              </>
            ) : (
              <>
                Submit project
                <ArrowRight className="size-4" aria-hidden="true" />
              </>
            )}
          </button>

          <p className="text-[12px] font-medium text-[#6f6f74]">
            {submitDisabled && !pending
              ? "Fill every field to submit."
              : "You can only submit once — double-check before sending."}
          </p>
        </div>
      </div>
    </form>
  );
}

const controlBase =
  "rounded-[14px] border px-3.5 text-[15px] font-medium text-[#f4f4f4] outline-none transition placeholder:text-[#5f5f66]";
const controlIdle =
  "border-[#2a2a2f] bg-[#111114] hover:border-[#37373e] focus:border-[#1d4dff] focus:bg-[#0e1020] focus:shadow-[0_0_0_3px_rgba(29,77,255,0.16)]";
const controlError =
  "border-[#f3197e] bg-[#1e0f18] shadow-[0_0_0_3px_rgba(243,25,126,0.14)]";

function FormProgress({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const percent = Math.round((Math.min(completed, total) / total) * 100);

  return (
    <div className="border-b border-[#1b1b1f] bg-[#08080a] px-5 py-4 sm:px-8">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold tracking-[0.14em] text-[#7b7b7f] uppercase">
          Application
        </span>
        <span className="text-[12px] font-semibold text-[#9b9b9b]">
          {Math.min(completed, total)} of {total} complete
        </span>
      </div>
      <div
        className="mt-2.5 h-1 overflow-hidden rounded-full bg-[#1a1a1f]"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Application progress"
      >
        <div
          className="h-full rounded-full bg-[#1d4dff] shadow-[0_0_12px_rgba(29,77,255,0.6)] transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function FormSection({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-2.5">
        <span className="grid size-6 place-items-center rounded-full border border-[#2c2c31] bg-[#111114] text-[11px] font-semibold text-[#8f8f95]">
          {step}
        </span>
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-white">
          {title}
        </h2>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function RequiredMark() {
  return (
    <span aria-label="Required" className="text-[13px] leading-none text-[#4f76ff]">
      *
    </span>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <span className="mt-2 block text-[13px] font-medium text-[#ff7aae]">
      {children}
    </span>
  );
}

function ApplicationField({
  name,
  label,
  helper,
  error,
  placeholder,
  inputMode,
  autoComplete,
  onBlur,
  focused = false,
  multiline = false,
  rows = 3,
}: {
  name: string;
  label: string;
  helper?: string;
  error?: string;
  placeholder?: string;
  inputMode?: "url";
  autoComplete?: string;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  focused?: boolean;
  multiline?: boolean;
  rows?: number;
}) {
  const tone = error ? controlError : controlIdle;

  return (
    <label className="block">
      <span
        className={`mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold tracking-[0.01em] transition-colors ${
          focused ? "text-white" : "text-[#e4e4e6]"
        }`}
      >
        {label}
        <RequiredMark />
      </span>
      {helper ? (
        <span className="mb-3 block text-[12px] font-medium text-[#7b7b7f]">
          {helper}
        </span>
      ) : null}
      {multiline ? (
        <textarea
          name={name}
          required
          autoComplete={autoComplete}
          placeholder={placeholder}
          data-application-control
          rows={rows}
          aria-invalid={error ? "true" : undefined}
          className={`${controlBase} w-full resize-none py-3 leading-relaxed ${tone}`}
        />
      ) : (
        <input
          name={name}
          required
          inputMode={inputMode}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onBlur={onBlur}
          aria-invalid={error ? "true" : undefined}
          data-application-control
          className={`${controlBase} h-11 w-full ${tone}`}
        />
      )}
      {error ? <FieldError>{error}</FieldError> : null}
    </label>
  );
}

function isApplicationFormReady(form: HTMLFormElement) {
  return (
    isApplicationFormComplete(form) &&
    isGithubRepoUrlFormatValid(getFormFieldValue(form, "githubRepoUrl"))
  );
}

function isApplicationFormComplete(form: HTMLFormElement) {
  return countFilledFields(form) === requiredApplicationFields.length;
}

function countFilledFields(form: HTMLFormElement) {
  return requiredApplicationFields.filter((fieldName) => {
    return getFormFieldValue(form, fieldName).length > 0;
  }).length;
}

function getFormFieldValue(form: HTMLFormElement, fieldName: string) {
  const field = form.elements.namedItem(fieldName);

  if (
    field instanceof HTMLInputElement ||
    field instanceof HTMLTextAreaElement
  ) {
    return field.value.trim();
  }

  return "";
}

function getTargetFieldName(target: EventTarget | null) {
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement
  ) {
    return target.name;
  }

  return "";
}

function getGithubRepoLinkError(value: string) {
  if (value.trim().length === 0 || isGithubRepoUrlFormatValid(value)) {
    return "";
  }

  return "Use a GitHub repo link like github.com/team/repo.";
}

function isEmailFormatValid(value: string) {
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(value.trim());
}

function isGithubRepoUrlFormatValid(rawUrl: string) {
  const value = rawUrl.trim();

  if (!value) {
    return false;
  }

  const withProtocol = value.match(/^https?:\/\//i)
    ? value
    : `https://${value}`;

  try {
    const url = new URL(withProtocol);
    const parts = url.pathname.split("/").filter(Boolean);

    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      url.hostname.toLowerCase() === "github.com" &&
      parts.length >= 2
    );
  } catch {
    return false;
  }
}
