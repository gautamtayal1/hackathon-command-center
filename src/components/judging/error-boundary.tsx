"use client";

import { Component, type ReactNode } from "react";

/**
 * Keeps one bad render from taking the whole scoring page down. Scores are
 * already written to localStorage on every keystroke, so the recovery path is
 * simply to re-mount the workspace, which restores them.
 */
export class JudgingErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null; attempt: number }
> {
  state = { error: null as Error | null, attempt: 0 };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("Judging workspace crashed", error);
  }

  render() {
    if (!this.state.error) {
      return <div key={this.state.attempt}>{this.props.children}</div>;
    }

    return (
      <div className="rounded-[20px] border border-[#6d2142] bg-[#2a111c] p-6">
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">
          This screen hit an error
        </h2>
        <p className="mt-2 text-sm font-medium leading-6 text-[#ffd1df]">
          Your scores are safe. Everything you typed is stored in this browser
          and comes back when the page reloads. Reload and carry on - do not
          clear your browser data.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              this.setState((state) => ({
                error: null,
                attempt: state.attempt + 1,
              }))
            }
            className="h-11 rounded-[20px] bg-[#f4f4f4] px-5 text-sm font-semibold text-black transition hover:bg-white"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-11 rounded-[20px] border border-[#6d2142] px-5 text-sm font-semibold text-white transition hover:bg-[#3a1826]"
          >
            Reload the page
          </button>
        </div>
      </div>
    );
  }
}
