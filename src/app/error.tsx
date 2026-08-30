"use client";

import { useEffect } from "react";

/**
 * Without this file a thrown error anywhere in the tree becomes a blank
 * "Application error" page in production, which is how a judging session loses
 * its work. Scoring pages keep their scores in localStorage, so recovering is
 * a reload away.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 py-10 text-[#f4f4f4]">
      <div className="w-full max-w-[520px] rounded-[20px] border border-[#303030] bg-[#212121] p-6">
        <h1 className="text-2xl font-semibold tracking-[-0.04em] text-white">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm font-medium leading-6 text-[#b4b4b4]">
          If you were scoring, your scores are safe. Every number is stored in
          this browser as you type, and it comes back when the page reloads.
          Do not clear your browser data.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reset}
            className="h-11 rounded-[20px] bg-[#f4f4f4] px-5 text-sm font-semibold text-black transition hover:bg-white"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-11 rounded-[20px] border border-[#303030] px-5 text-sm font-semibold text-white transition hover:bg-[#252525]"
          >
            Reload the page
          </button>
        </div>
        {error.digest ? (
          <p className="mt-4 text-xs font-medium text-[#6f6f6f]">
            Reference: {error.digest}
          </p>
        ) : null}
      </div>
    </main>
  );
}
