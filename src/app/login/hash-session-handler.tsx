"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_JUDGE_PATH, isJudgePath } from "@/lib/judging";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function HashSessionHandler({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    const authError = hash.get("error_description");

    if (!accessToken || !refreshToken) {
      if (authError) {
        queueMicrotask(() => {
          setStatus("error");
          setMessage(authError);
        });
      }
      return;
    }

    queueMicrotask(() => setStatus("loading"));

    // Remove credentials from the address bar before making any requests.
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );

    const supabase = createSupabaseBrowserClient();
    const destination = isJudgePath(nextPath) ? nextPath : DEFAULT_JUDGE_PATH;

    void supabase.auth
      .setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      .then(({ error }) => {
        if (error) {
          setStatus("error");
          setMessage(error.message);
          return;
        }

        router.replace(destination);
        router.refresh();
      });
  }, [nextPath, router]);

  if (status === "idle") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background px-4 text-ink">
      <div className="w-full max-w-[420px] rounded-[20px] border border-edge bg-p-card p-6">
        <p className="text-sm font-semibold text-ink-3">Draki Judges</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
          {status === "loading" ? "Opening judge access" : "Link not valid"}
        </h1>
        <p className="mt-3 text-sm font-medium leading-6 text-ink-3">
          {status === "loading"
            ? "We are verifying your secure link."
            : message || "Request a new judge link and try again."}
        </p>
      </div>
    </div>
  );
}
