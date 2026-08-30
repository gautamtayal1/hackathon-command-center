"use client";

import { useEffect } from "react";

/** Last line of defence: catches errors thrown by the root layout itself. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0b",
          color: "#fafafa",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
          padding: "24px",
        }}
      >
        <div
          style={{
            maxWidth: "520px",
            width: "100%",
            border: "1px solid #27272a",
            background: "#17171b",
            borderRadius: "20px",
            padding: "24px",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "24px", letterSpacing: "-0.04em" }}>
            Something went wrong
          </h1>
          <p style={{ marginTop: "12px", lineHeight: 1.6, color: "#a1a1aa" }}>
            If you were scoring, your scores are safe in this browser and come
            back on reload. Do not clear your browser data.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "20px",
              height: "44px",
              padding: "0 20px",
              borderRadius: "20px",
              border: "none",
              background: "#ac35d7",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
