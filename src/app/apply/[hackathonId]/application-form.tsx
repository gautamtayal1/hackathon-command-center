"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
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
  const [state, formAction, pending] = useActionState(
    submitApplication.bind(null, hackathonId),
    initialState,
  );
  const submitDisabled = pending || !canSubmit;

  useEffect(() => {
    if (formRef.current) {
      setCanSubmit(isApplicationFormReady(formRef.current));
    }
  }, []);

  function refreshFormState(form: HTMLFormElement, targetName = "") {
    setCanSubmit(isApplicationFormReady(form));

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
    return (
      <div className="grid min-h-[360px] place-items-center rounded-[20px] border border-[#303030] bg-[#212121] px-6 py-14 text-center shadow-[0_18px_70px_rgba(0,0,0,0.35)]">
        <div className="flex max-w-[420px] flex-col items-center">
          <span className="grid size-16 place-items-center rounded-full bg-[#f4f4f4] shadow-[0_12px_34px_rgba(0,0,0,0.38)]">
            <Check className="size-8 text-black" strokeWidth={3} aria-hidden="true" />
          </span>
          <h2 className="mt-7 text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">
            You&apos;re all set
          </h2>
          <p className="mt-3 text-base font-medium text-[#9b9b9b]">
            Your submission has been received. Thanks for taking part — the
            judges will review it and results will be shared soon.
          </p>
          {state.assignedGroup ? (
            <div className="mt-8 w-full rounded-[16px] border border-[#303030] bg-[#191919] px-5 py-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#9b9b9b]">
                Your assigned group of judges
              </p>
              <p className="mt-1 text-lg font-semibold tracking-[-0.02em] text-white">
                {state.assignedGroup.name}
              </p>
              {state.assignedGroup.judges.length ? (
                <ul className="mt-3 space-y-1.5">
                  {state.assignedGroup.judges.map((judgeName) => (
                    <li
                      key={judgeName}
                      className="flex items-center gap-2 text-sm font-medium text-[#d6d6d6]"
                    >
                      <span
                        className="size-1.5 rounded-full bg-[#6d6d6d]"
                        aria-hidden="true"
                      />
                      {judgeName}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-7"
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
      <ApplicationField
        name="teamName"
        label="Name Team"
        autoComplete="organization"
        compact
        focused={focusedField === "teamName"}
      />
      <ApplicationField
        name="participantsFullName"
        label="Participants' names"
        autoComplete="name"
        multiline
        focused={focusedField === "participantsFullName"}
      />
      <ApplicationField
        name="githubRepoUrl"
        label="GitHub repo link (must be public)"
        inputMode="url"
        autoComplete="url"
        compact
        error={githubError}
        onBlur={handleGithubBlur}
        focused={focusedField === "githubRepoUrl"}
      />
      <ApplicationField
        name="builtDescription"
        label="What have you built? (one line)"
        multiline
        focused={focusedField === "builtDescription"}
      />

      {state.status === "error" ? (
        <p className="rounded-[20px] border border-[#6d2142] bg-[#2a111c] px-4 py-3 text-sm font-medium text-[#ffd1df]">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitDisabled}
        className="inline-flex h-11 items-center gap-2 rounded-[20px] bg-[#f4f4f4] px-4 text-sm font-semibold text-black shadow-[0_12px_34px_rgba(0,0,0,0.38)] transition hover:bg-white disabled:cursor-not-allowed disabled:bg-[#3a3a3a] disabled:text-[#8f8f8f] disabled:shadow-none"
      >
        {pending ? "Sending" : "Submit"}
        <ArrowRight className="size-4" aria-hidden="true" />
      </button>
    </form>
  );
}

function ApplicationField({
  name,
  label,
  helper,
  error,
  inputMode,
  autoComplete,
  onBlur,
  focused = false,
  multiline = false,
  compact = false,
}: {
  name: string;
  label: string;
  helper?: string;
  error?: string;
  inputMode?: "url";
  autoComplete?: string;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  focused?: boolean;
  multiline?: boolean;
  compact?: boolean;
}) {
  const controlTone = error
    ? "border-[#f3197e] bg-[#25111a] focus:border-[#f3197e] focus:bg-[#25111a]"
    : multiline
      ? "border-[#3a3a3a] bg-[#212121] focus:border-[#3a3a3a] focus:bg-[#212121]"
      : "border-[#2a2a2a] bg-[#212121] focus:border-[#2a2a2a] focus:bg-[#212121]";
  const controlShadow = error
    ? "shadow-[0_0_0_2px_rgba(243,25,126,0.14),0_14px_44px_rgba(0,0,0,0.22)]"
    : focused
      ? "shadow-[inset_0_0_0_1px_rgba(244,244,244,0.08),0_14px_44px_rgba(0,0,0,0.22)]"
      : "shadow-[0_14px_44px_rgba(0,0,0,0.22)]";

  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-xl font-semibold tracking-[-0.02em] text-[#f4f4f4]">
        {label}
        <span
          aria-label="Required"
          className="-mt-1 text-base font-semibold leading-none text-white"
        >
          *
        </span>
      </span>
      {multiline ? (
        <textarea
          name={name}
          required
          autoComplete={autoComplete}
          data-application-control
          rows={4}
          className={`min-h-28 w-full resize-none rounded-[20px] border px-4 py-3 text-base font-medium text-[#f4f4f4] outline-none transition placeholder:text-[#8f8f8f] ${controlTone} ${controlShadow}`}
        />
      ) : (
        <input
          name={name}
          required
          inputMode={inputMode}
          autoComplete={autoComplete}
          onBlur={onBlur}
          aria-invalid={error ? "true" : undefined}
          data-application-control
          className={`h-11 rounded-[20px] border px-4 text-base font-medium text-[#f4f4f4] outline-none transition placeholder:text-[#8f8f8f] ${controlTone} ${controlShadow} ${
            compact ? "w-full max-w-[360px]" : "w-full"
          }`}
        />
      )}
      {error ? (
        <span className="mt-2 block text-sm font-medium text-[#ff7aae]">
          {error}
        </span>
      ) : helper ? (
        <span className="mt-1 block text-xs font-medium text-[#9b9b9b]">
          {helper}
        </span>
      ) : null}
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
  return requiredApplicationFields.every((fieldName) => {
    return getFormFieldValue(form, fieldName).length > 0;
  });
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
