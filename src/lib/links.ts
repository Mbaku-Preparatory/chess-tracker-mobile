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

export const PRIVACY_POLICY_URL = "https://www.chesspreparatory.com/privacy";

export const SUPPORT_EMAIL = "bakutarb@gmail.com";

/** Prefilled so a deletion request arrives identifiable and unambiguous. */
export function accountDeletionMailto(username: string): string {
  const subject = encodeURIComponent("Account deletion request");
  const body = encodeURIComponent(
    `Please delete my Chess Preparatory account and all data associated with it.\n\n` +
      `Username: ${username}\n\n` +
      `I understand this cannot be undone.`
  );
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}
