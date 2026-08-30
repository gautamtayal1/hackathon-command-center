"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  requestJudgeMagicLink,
  type JudgeLoginFormState,
} from "@/lib/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const initialJudgeLoginState: JudgeLoginFormState = {
  status: "idle",
  message: "",
};

export function AdminLoginForm({ nextPath = "/" }: { nextPath?: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    setMessage("");

    startTransition(async () => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      router.replace(nextPath);
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-ink-3">
          Email
        </span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="h-12 w-full rounded-[20px] border border-edge bg-p-card px-4 text-base font-medium text-ink outline-none transition placeholder:text-ink-4 focus:border-edge-strong focus:bg-surface-3"
          placeholder="you@email.com"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-ink-3">
          Password
        </span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="h-12 w-full rounded-[20px] border border-edge bg-p-card px-4 text-base font-medium text-ink outline-none transition placeholder:text-ink-4 focus:border-edge-strong focus:bg-surface-3"
          placeholder="Your private password"
        />
      </label>

      {message ? (
        <p className="rounded-[20px] border border-edge bg-p-card px-4 py-3 text-sm font-medium text-ink-2">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-11 items-center gap-2 rounded-[20px] brand-btn px-4 text-sm font-semibold text-white shadow-[0_14px_42px_rgba(0,0,0,0.42)] transition disabled:cursor-not-allowed disabled:bg-edge-strong disabled:text-ink-4"
      >
        {isPending ? "Opening" : "Enter admin"}
        <ArrowRight className="size-4" aria-hidden="true" />
      </button>
    </form>
  );
}

export function JudgeLoginForm({ nextPath = "/judge" }: { nextPath?: string }) {
  const [state, formAction, pending] = useActionState(
    requestJudgeMagicLink,
    initialJudgeLoginState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={nextPath} />
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-ink-3">
          Judge email
        </span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="h-12 w-full rounded-[20px] border border-edge bg-p-card px-4 text-base font-medium text-ink outline-none transition placeholder:text-ink-4 focus:border-edge-strong focus:bg-surface-3"
          placeholder="judge@email.com"
        />
      </label>

      {state.message ? (
        <p
          className={`rounded-[20px] border px-4 py-3 text-sm font-medium ${
            state.status === "error"
              ? "border-bad-line bg-bad-soft text-bad"
              : "border-edge bg-p-card text-ink-2"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center gap-2 rounded-[20px] brand-btn px-4 text-sm font-semibold text-white shadow-[0_14px_42px_rgba(0,0,0,0.42)] transition disabled:cursor-not-allowed disabled:bg-edge-strong disabled:text-ink-4"
      >
        {pending ? "Checking" : "Send judge link"}
        <ArrowRight className="size-4" aria-hidden="true" />
      </button>
    </form>
  );
}
