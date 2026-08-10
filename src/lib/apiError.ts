/**
 * User-facing error messages.
 *
 * Nothing a user sees should contain an HTTP status, a stack, or a phrase like
 * "Bad Gateway". They cannot act on it and it reads as the app being broken.
 * The technical detail is not thrown away — it goes on the error object and to
 * the console, so debugging from a screenshot or a session is still possible.
 */

export interface AppError extends Error {
  /** HTTP status, when the failure came from a response. */
  status?: number;
  /** Parsed response body, for debugging. Never rendered. */
  body?: unknown;
  /** The raw message we would have shown before. Never rendered. */
  technical?: string;
}

const GENERIC = "Something went wrong. Please try again.";

/**
 * Backend `detail` strings are written for users in the places that matter
 * ("Enter at least 3 characters to search FIDE."), so a 4xx keeps its detail.
 * A 5xx never does — those read like "Could not reach FIDE: HTTPSConnectionPool
 * (host=...)", which is a log line, not a message.
 */
function messageForStatus(status: number, detail?: string): string {
  if (status >= 500) {
    if (status === 502 || status === 503 || status === 504) {
      return "This service is temporarily unavailable. Please try again in a few minutes.";
    }
    return "Something went wrong on our end. Please try again, or contact support if it keeps happening.";
  }

  switch (status) {
    case 401:
      return "Your session has expired. Please sign in again.";
    case 403:
      return "You do not have permission to do that.";
    case 404:
      return "We couldn't find what you were looking for.";
    case 408:
      return "That took too long. Please try again.";
    case 429:
      return "Too many requests. Please wait a moment and try again.";
    default:
      // 400/409/422 and friends: the backend's detail is the useful part.
      return detail?.trim() || GENERIC;
  }
}

/** Build the error thrown for a failed response. */
export function buildApiError(status: number, statusText: string, body: unknown): AppError {
  const detail =
    body && typeof body === "object" && typeof (body as { detail?: unknown }).detail === "string"
      ? (body as { detail: string }).detail
      : undefined;

  const err = new Error(messageForStatus(status, detail)) as AppError;
  err.status = status;
  err.body = body;
  err.technical = `${status} ${statusText}${detail ? ` — ${detail}` : ""}`;

  if (typeof console !== "undefined") {
    console.error(`[api] ${err.technical}`);
  }
  return err;
}

/** Build the error thrown when the request never got a response at all. */
export function buildNetworkError(cause: unknown): AppError {
  const err = new Error(
    "No connection. Check your internet and try again."
  ) as AppError;
  err.technical = cause instanceof Error ? cause.message : String(cause);

  if (typeof console !== "undefined") {
    console.error(`[api] network failure: ${err.technical}`);
  }
  return err;
}

/**
 * Last line of defence for `catch` blocks: turns anything into something safe
 * to render. Errors from buildApiError are already safe and pass through.
 */
export function userMessage(err: unknown, fallback = GENERIC): string {
  if (err instanceof Error) {
    const app = err as AppError;
    if (app.status !== undefined || app.technical !== undefined) return err.message;
    // An error from somewhere else — its text was never vetted for users.
    if (typeof console !== "undefined") console.error("[ui]", err);
    return fallback;
  }
  return fallback;
}
