import Constants from "expo-constants";
import * as Sentry from "@sentry/react-native";

/**
 * Crash and error reporting.
 *
 * Kept in one place rather than inline in index.ts so the decisions below have
 * somewhere to be written down, and so turning reporting off is one edit.
 *
 * A Sentry DSN is not a secret — it only permits sending events, never reading
 * them — but it still comes from the environment rather than being hardcoded,
 * so a fork or a local build doesn't silently post into our project.
 */

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

/** Distinguishes reviewer builds from local ones in the Sentry UI. */
const ENVIRONMENT = __DEV__ ? "development" : "production";

export function initSentry(): void {
  // No DSN configured is the normal state for a local checkout, and must not
  // be an error — a contributor without our Sentry project should still be
  // able to run the app.
  if (!DSN) return;

  Sentry.init({
    dsn: DSN,
    environment: ENVIRONMENT,

    // Errors are the point; traces are a cost we haven't justified yet. Five
    // reviewers will not generate a performance problem worth sampling for,
    // and the free tier is better spent on crashes.
    tracesSampleRate: 0,

    // Off in development: local crashes are already on the console, and
    // filling the project with our own noise makes the reviewers' reports
    // harder to find.
    enabled: !__DEV__,

    // Which build a report came from. Without this every stack trace looks
    // the same and "fixed in the next build" becomes unverifiable.
    release: Constants.expoConfig?.version ?? undefined,
    dist: String(Constants.expoConfig?.android?.versionCode ?? ""),

    // Reviewers are testing an app about their own chess games; their
    // questions to Mbaku and their opponents' names are their business.
    // Breadcrumbs record navigation and taps, not field contents.
    sendDefaultPii: false,
  });
}

/**
 * Ties reports to a person so several reviewers' crashes can be told apart.
 *
 * This sends their email to Sentry, which is a real privacy decision and worth
 * stating plainly rather than burying. It is here because the review group is
 * a handful of people who agreed to help: being able to say "this crash is
 * yours, what were you doing?" is most of the value of watching at all.
 *
 * When the app opens up beyond that group, this should become a pseudonymous
 * id — one line, and `sendDefaultPii` is already false so nothing else leaks.
 */
export function identifyUser(email: string | null): void {
  if (!DSN) return;
  Sentry.setUser(email ? { email } : null);
}
