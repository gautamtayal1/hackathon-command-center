import "server-only";

type LogLevel = "info" | "error";
type LogFields = Record<string, unknown>;

/**
 * Deployment context attached to every event once, so operators can filter the
 * logs by environment, release, and region without every call site repeating
 * them. Values come from Vercel's system env vars when the app runs there.
 */
const deploymentContext: LogFields = {
  service: "hackathon-command-center",
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
  commit:
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
    "unknown",
  region: process.env.VERCEL_REGION ?? "unknown",
};

/**
 * Emit one structured, single-line JSON event. `event` is a constant template
 * so the log stays groupable, and every dynamic value travels as a field.
 */
function emit(level: LogLevel, event: string, fields: LogFields) {
  const record = {
    level,
    time: new Date().toISOString(),
    event,
    ...deploymentContext,
    ...fields,
  };
  const line = JSON.stringify(record);

  if (level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info(event: string, fields: LogFields = {}) {
    emit("info", event, fields);
  },
  error(event: string, fields: LogFields = {}) {
    emit("error", event, fields);
  },
};

/**
 * Extract the safe, serializable parts of an unknown thrown value so callers
 * never drop the error object itself when they log a failure.
 */
export function describeError(error: unknown): LogFields {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      ...(error.stack ? { errorStack: error.stack } : {}),
    };
  }

  return { errorMessage: String(error) };
}
