/**
 * The one answer the API gives when you already have somebody.
 *
 * The server owns duplicate detection: a POST that would create a second row
 * for a FIDE ID this account already holds comes back 409 with the row that
 * already exists, instead of creating it. This screen never had a duplicate
 * check of its own — it posted and hoped — so the 409 is the first thing that
 * stops a second copy being made from the app.
 *
 * Kept in step with the web client's `lib/duplicatePlayer.ts` on purpose: the
 * endpoint is shared, and a shape understood by one client and not the other
 * is how the two drift.
 */

import type { AppError } from "@/lib/apiError";

export interface DuplicatePlayer {
  id: number;
  public_id: string;
  slug: string;
  full_name: string;
  fide_id: string | null;
  /** Your own profile is the MyProfile screen, never PlayerDetail. */
  is_self: boolean;
}

interface DuplicateBody {
  code?: unknown;
  player?: unknown;
}

/** The existing player a 409 points at, or null if this is a different error. */
export function duplicatePlayerFrom(err: unknown): DuplicatePlayer | null {
  const app = err as AppError | undefined;
  if (!app || app.status !== 409) return null;

  const body = app.body as DuplicateBody | undefined;
  if (!body || body.code !== "duplicate_fide_id") return null;

  const player = body.player as Partial<DuplicatePlayer> | undefined;
  if (!player || typeof player.slug !== "string") return null;

  return {
    id: Number(player.id),
    public_id: String(player.public_id ?? ""),
    slug: player.slug,
    full_name: String(player.full_name ?? ""),
    fide_id: player.fide_id ?? null,
    // Compared to `true` rather than tested for truthiness: DRF used to coerce
    // this to the string "False", which is truthy and would route every caller
    // to their own profile. The server no longer does that; this is the belt.
    is_self: player.is_self === true,
  };
}
