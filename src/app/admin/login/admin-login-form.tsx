"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { adminLogin, type AdminLoginState } from "@/app/admin/login/actions";

const initialState: AdminLoginState = { status: "idle", message: "" };

export function AdminLoginForm({ nextPath = "/" }: { nextPath?: string }) {
  const [state, formAction, pending] = useActionState(adminLogin, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={nextPath} />
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[#b4b4b4]">
          Admin password
        </span>
        <input
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          className="h-12 w-full rounded-[20px] border border-[#303030] bg-[#212121] px-4 text-base font-medium text-[#f4f4f4] outline-none transition placeholder:text-[#8f8f8f] focus:border-[#4a4a4a] focus:bg-[#252525]"
          placeholder="Enter the admin password"
        />
      </label>

      {state.status === "error" ? (
        <p className="rounded-[20px] border border-[#6d2142] bg-[#2a111c] px-4 py-3 text-sm font-medium text-[#ffd1df]">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center gap-2 rounded-[20px] bg-[#f4f4f4] px-4 text-sm font-semibold text-black shadow-[0_14px_42px_rgba(0,0,0,0.42)] transition hover:bg-white disabled:cursor-not-allowed disabled:bg-[#3a3a3a] disabled:text-[#8f8f8f]"
      >
        {pending ? "Checking" : "Enter admin"}
        <ArrowRight className="size-4" aria-hidden="true" />
      </button>
    </form>
  );
}
