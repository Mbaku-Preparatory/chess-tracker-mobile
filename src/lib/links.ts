/**
 * Outward-facing URLs and addresses.
 *
 * These are hardcoded rather than read from `EXPO_PUBLIC_*` on purpose. The
 * privacy policy URL in particular is submitted to the Play Console and is
 * expected to resolve for a reviewer who is not signed in; if a build ever
 * shipped with it unset, the in-app link would dead-end and the listing's
 * claim would be false. A constant cannot be unset.
 *
 * The host is `www.chesspreparatory.com`, the app's own domain as of
 * 2026-09-04. `mbaku-preparatory.vercel.app` still serves the same deployment
 * and keeps working; `chess-tracker-frontend.vercel.app` is NOT ours and now
 * serves an unrelated chess site. See RELEASING.md.
 */

/** The website, with no trailing slash: its origin. EXPO_PUBLIC_SITE_URL
 * points a local build at a local web app; unset, it is the real site. */
export const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL || "https://www.chesspreparatory.com";

export const PRIVACY_POLICY_URL = "https://www.chesspreparatory.com/privacy";

/**
 * The site's Stockfish behind a UCI bridge (public/engine.html on the web
 * app), which the app keeps open in a hidden WebView: see
 * src/lib/engine/EngineHost.tsx. EXPO_PUBLIC_ENGINE_URL points a local build
 * at a local web app; unset, it is the real site, never nothing.
 */
export const ENGINE_URL = process.env.EXPO_PUBLIC_ENGINE_URL || `${SITE_URL}/engine.html`;

/** The website's book reader without the site's navigation (app/(embed) on
 * the web), which the app shows in a WebView: components/books/BookReaderWeb. */
export function bookReaderUrl(publicId: string): string {
  return `${SITE_URL}/embed/books/${encodeURIComponent(publicId)}`;
}
