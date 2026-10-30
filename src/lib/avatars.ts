/**
 * The avatars the web app ships (its public/avatars/01.svg … 25.svg: Open
 * Peeps faces, CC0, drawn with DiceBear), read from the site. The same
 * numbering and default as the web's lib/avatars.ts, so a bot has the same
 * face on both.
 */

export const AVATAR_COUNT = 25;

export const avatarUrl = (n: number) => `https://www.chesspreparatory.com/avatars/${String(n).padStart(2, "0")}.svg`;

/** For someone who has not picked one: the same every time for the same seed. */
export function defaultAvatar(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return (Math.abs(h) % AVATAR_COUNT) + 1;
}

export const resolveAvatar = (chosen: number | null | undefined, seed: string) =>
  chosen && chosen >= 1 && chosen <= AVATAR_COUNT ? chosen : defaultAvatar(seed);
