/**
 * Short facts shown while Mbaku is thinking.
 *
 * A fifteen-second wait with a spinner feels broken; the same wait with
 * something to read feels like work being done. These rotate every few seconds
 * until the answer arrives.
 *
 * ── Before you add one ──────────────────────────────────────────────────────
 *
 * These are shown to users as statements of fact, under our name. A wrong one
 * is worse than no fact at all — the whole product rests on people trusting
 * that what we tell them is true.
 *
 * So: titles change hands every year. Anything naming a current champion has a
 * shelf life and needs re-checking each season, which is why those are grouped
 * separately below with the date they were verified. The evergreen ones don't
 * rot and are safe to leave alone.
 */

export interface ChessFact {
  text: string;
  /** Set on facts that go stale — a reminder to re-check, and when. */
  verified?: string;
}

/**
 * Kenyan chess. Verified against FIDE and ChessBase reporting on 2026-08-12 —
 * re-check after each national championship.
 */
const KENYAN_FACTS: ChessFact[] = [
  {
    text: "Jadon Simiyu won the Kenya National Chess Championship at 13, the youngest national champion in the country's history.",
    verified: "2026-08-12",
  },
  {
    text: "Jully Mutisya took the women's crown at the Kenya National Chess Championship.",
    verified: "2026-08-12",
  },
  {
    text: "The top five in each section of the Kenyan Championship qualify to represent Kenya at the Chess Olympiad.",
    verified: "2026-08-12",
  },
];

/** Evergreen — these don't go out of date. */
const GENERAL_FACTS: ChessFact[] = [
  { text: "There are more possible chess games than atoms in the observable universe." },
  { text: "The longest recorded tournament game lasted 269 moves — and ended in a draw." },
  { text: "Castling is the only move where a player moves two of their own pieces at once." },
  { text: "The word \"checkmate\" comes from the Persian \"shah mat\" — the king is helpless." },
  { text: "A pawn reaching the eighth rank can become a second queen, or a knight, rook or bishop." },
  { text: "The Sicilian is the most played reply to 1.e4 at every level of the game." },
  { text: "Only 20 first moves are legal in chess: sixteen pawn moves and four knight moves." },
  { text: "The fastest possible checkmate is Fool's Mate, in two moves." },
  { text: "En passant exists because pawns were once only allowed to move one square at a time." },
  { text: "A stalemate is a draw — cornering a king without checking it throws away the win." },
];

export const CHESS_FACTS: ChessFact[] = [...KENYAN_FACTS, ...GENERAL_FACTS];

/**
 * The facts in a random order, so two waits in a row don't read the same.
 * Shuffled per call rather than per app launch — a reviewer asking six
 * questions should not see the same opening fact six times.
 */
export function shuffledFacts(): ChessFact[] {
  const facts = [...CHESS_FACTS];
  for (let i = facts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [facts[i], facts[j]] = [facts[j], facts[i]];
  }
  return facts;
}
