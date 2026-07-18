"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

/**
 * Route-level error boundary for the judge scoring page. A submission can fail
 * mid-flight — most often because a new version was deployed while the page was
 * open (the server action id no longer matches) or the login session expired
 * after the page sat idle for a long time. Instead of a white-screen crash we
 * show a calm, recoverable message. The scores themselves are safe: every
 * keystroke is mirrored to this device's localStorage, so a refresh repopulates
 * the form exactly where the judge left off.
 */
export default function JudgeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Judge page error:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-[#f4f4f4] sm:px-6">
      <section className="mx-auto w-full max-w-[560px]">
        <div className="rounded-[20px] border border-[#303030] bg-[#212121] p-6">
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-white">
            Your scores are safe
          </h1>
          <p className="mt-3 text-sm font-medium leading-6 text-[#b4b4b4]">
            Something interrupted the page — usually a new version going live
            while you had it open. Nothing was lost: every score you typed is
            saved on this device. Reload and it will all be right where you left
            it, ready to submit again.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                // A full reload pulls the latest version so the next submit
                // uses a fresh, valid server action.
                window.location.reload();
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[20px] bg-[#f4f4f4] px-5 text-sm font-semibold text-black transition hover:bg-white"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Reload and continue
            </button>
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-11 items-center justify-center rounded-[20px] border border-[#303030] px-5 text-sm font-semibold text-[#d6d6d6] transition hover:border-[#4a4a4a] hover:text-white"
            >
              Try again
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
