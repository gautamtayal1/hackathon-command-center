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
        <span className="mb-2 block text-sm font-medium text-[#b4b4b4]">
          Email
        </span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="h-12 w-full rounded-[20px] border border-[#303030] bg-[#212121] px-4 text-base font-medium text-[#f4f4f4] outline-none transition placeholder:text-[#8f8f8f] focus:border-[#4a4a4a] focus:bg-[#252525]"
          placeholder="you@email.com"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[#b4b4b4]">
          Password
        </span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="h-12 w-full rounded-[20px] border border-[#303030] bg-[#212121] px-4 text-base font-medium text-[#f4f4f4] outline-none transition placeholder:text-[#8f8f8f] focus:border-[#4a4a4a] focus:bg-[#252525]"
          placeholder="Your private password"
        />
      </label>

      {message ? (
        <p className="rounded-[20px] border border-[#303030] bg-[#191919] px-4 py-3 text-sm font-medium text-[#d6d6d6]">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-11 items-center gap-2 rounded-[20px] bg-[#f4f4f4] px-4 text-sm font-semibold text-black shadow-[0_14px_42px_rgba(0,0,0,0.42)] transition hover:bg-white disabled:cursor-not-allowed disabled:bg-[#3a3a3a] disabled:text-[#8f8f8f]"
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
        <span className="mb-2 block text-sm font-medium text-[#b4b4b4]">
          Judge email
        </span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="h-12 w-full rounded-[20px] border border-[#303030] bg-[#212121] px-4 text-base font-medium text-[#f4f4f4] outline-none transition placeholder:text-[#8f8f8f] focus:border-[#4a4a4a] focus:bg-[#252525]"
          placeholder="judge@email.com"
        />
      </label>

      {state.message ? (
        <p
          className={`rounded-[20px] border px-4 py-3 text-sm font-medium ${
            state.status === "error"
              ? "border-[#6d2142] bg-[#2a111c] text-[#ffd1df]"
              : "border-[#303030] bg-[#191919] text-[#d6d6d6]"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center gap-2 rounded-[20px] bg-[#f4f4f4] px-4 text-sm font-semibold text-black shadow-[0_14px_42px_rgba(0,0,0,0.42)] transition hover:bg-white disabled:cursor-not-allowed disabled:bg-[#3a3a3a] disabled:text-[#8f8f8f]"
      >
        {pending ? "Checking" : "Send judge link"}
        <ArrowRight className="size-4" aria-hidden="true" />
      </button>
    </form>
  );
}
