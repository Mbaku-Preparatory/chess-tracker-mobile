/**
 * Short facts shown while Mbaku is thinking.
 *
 * A fifteen-second wait with a spinner feels broken; the same wait with
 * something to read feels like work being done. These rotate until the answer
 * arrives.
 *
 * ── Before you add one ──────────────────────────────────────────────────────
 *
 * These are shown to users as statements of fact, under our name — to an
 * audience who in many cases played in the events being described and will
 * notice immediately if a score or a placing is wrong. A wrong fact is worse
 * than no fact.
 *
 * Results are also perishable in a way general chess trivia is not: every fact
 * naming a champion, a placing or a score belongs in KENYA_AFRICA_FACTS and
 * wants re-reading after each championship season. GENERAL_FACTS never rot.
 */

export interface ChessFact {
  text: string;
  /** Set where the claim was checked against a public source, and when. */
  verified?: string;
}

/**
 * Kenyan and African chess — results, placings and titles.
 *
 * Most of these are the founder's own, from following the Kenyan circuit; the
 * three carrying a `verified` date were checked against FIDE and ChessBase
 * reporting. Everything here has a shelf life — re-read after each season.
 */
const KENYA_AFRICA_FACTS: ChessFact[] = [
  // ── Kenya National Championship, 2025 ──────────────────────────────────
  { text: "FM Jadon Simiyu won the 2025 Kenya National Chess Championship Open with 8/11." },
  { text: "At just 13 years old, Jadon Simiyu became the 2025 Kenya National Chess Champion." },
  {
    text: "Jadon Simiyu is the youngest national champion in Kenya's history.",
    verified: "2026-08-12",
  },
  { text: "Kyle Kuka finished 2nd in the 2025 Kenya National Chess Championship Open with 7.5/11." },
  { text: "CM Robert Mcligeyo finished 3rd in the 2025 Kenya National Chess Championship Open with 7/11." },
  { text: "WCM Jully Mutisya won the 2025 Kenya National Chess Championship Ladies section with 8/11." },
  { text: "WFM Sasha Mongeli finished 2nd in the 2025 Kenya National Chess Championship Ladies section with 8/11." },
  { text: "Nicole Albright finished 3rd in the 2025 Kenya National Chess Championship Ladies section with 7/11." },
  { text: "Zuri Kaloki finished 4th in the 2025 Kenya National Chess Championship Ladies section at just 16 years old." },
  { text: "Hawi Kaloki finished 5th in the 2025 Kenya National Chess Championship Open despite being under 18." },
  {
    text: "The top five in each section of the Kenyan Championship qualify to represent Kenya at the Chess Olympiad.",
    verified: "2026-08-12",
  },
  { text: "The 2025 Kenya National Championship awarded separate national titles in the Open and Ladies sections." },

  // ── Kenya National Championship, 2024 ──────────────────────────────────
  { text: "CM Robert Mcligeyo won the 2024 Kenya National Chess Championship Open with 8/9." },
  { text: "Jackson Ndegwa finished 2nd at the 2024 Kenya National Chess Championship Open with 7.5/9." },
  { text: "Lenny Shile finished 3rd at the 2024 Kenya National Chess Championship Open with 7/9." },
  { text: "WFM Sasha Mongeli won the 2024 Kenya National Chess Championship Ladies title, defending her championship." },
  { text: "In 2024, Robert Mcligeyo won the Kenyan national title at just 18 years old." },
  { text: "Kenya has produced national champions who were still teenagers when they reached the top of the Open section." },

  // ── Kenyan juniors and schools ─────────────────────────────────────────
  { text: "Hawi Kaloki won the Kenya National Junior Chess Championship Open in 2024." },
  { text: "Zuri Kaloki won the Kenya National Junior Chess Championship Girls title in 2024." },
  { text: "Hawi and Zuri Kaloki are siblings who both became Kenyan national junior chess champions." },
  { text: "Hawi Kaloki represented Kenya at the 2025 World Junior Chess Championship after winning the Kenyan junior title." },
  { text: "Zuri Kaloki represented Kenya at the 2025 World Junior Chess Championship after winning the Kenyan junior girls' title." },
  { text: "Jadon Simiyu won the 2025 Kenya National Schools Individual Championship Under-13 Open with a perfect 9/9." },
  { text: "Nathaniel Manyeki won the 2025 Kenya National Schools Individual Championship Under-11 Open with a perfect 9/9." },
  { text: "The 2025 Kenya National Schools Championship had national individual titles across Under-7, U9, U11, U13, U15 and U17 categories." },
  { text: "Kenya's 2025 National Schools Championship used a 9-round Swiss format." },
  { text: "Kenya's national champion earns a place among the country's strongest players competing for international representation." },

  // ── African Individual Championship ────────────────────────────────────
  { text: "GM Bilel Bellahcene of Algeria won the 2025 African Individual Chess Championship Open title." },
  { text: "Bilel Bellahcene, Bassem Amin and Ahmed Adly all scored 7/9 at the 2025 African Championship Open." },
  { text: "Bilel Bellahcene won the 2025 African Championship on tiebreaks after three players tied on 7/9." },
  { text: "GM Bassem Amin of Egypt took silver at the 2025 African Individual Chess Championship Open." },
  { text: "GM Ahmed Adly of Egypt took bronze at the 2025 African Individual Chess Championship Open." },
  { text: "WGM Shrook Wafa of Egypt won the 2025 African Individual Chess Championship Women's title with 8/9." },
  { text: "WIM Lina Nassr of Algeria won silver at the 2025 African Women's Championship with 7/9." },
  { text: "Jana Mohamed Zaki of Egypt, only 15 years old, won bronze at the 2025 African Women's Championship." },
  { text: "Shrook Wafa's 2025 African title was her fifth African Women's Championship crown." },
  { text: "GM Bassem Amin won the 2024 African Individual Chess Championship Open with an extraordinary 8.5/9." },
  { text: "GM Bilel Bellahcene finished 2nd at the 2024 African Individual Chess Championship Open." },
  { text: "IM Chitumbo Mwali of Zambia finished 3rd at the 2024 African Individual Chess Championship Open." },
  { text: "WIM Jesse Nikki February of South Africa won the 2024 African Women's Championship with 7.5/9." },
  { text: "WIM Lina Nassr finished 2nd at the 2024 African Women's Championship with 6.5/9." },
  { text: "WGM Shahenda Wafa of Egypt finished 3rd at the 2024 African Women's Championship with 6.5/9." },
  { text: "The 2025 African Individual Chess Championship brought together players from 17 African countries." },
  { text: "The 2025 African Individual Championship Open and Women's sections were both played over 9 classical rounds." },
];

/** Evergreen — no result, no date, nothing to go stale. */
const GENERAL_FACTS: ChessFact[] = [
  { text: "There are more possible chess games than atoms in the observable universe." },
  { text: "The longest recorded tournament game lasted 269 moves — and ended in a draw." },
  { text: "Castling is the only move where a player moves two of their own pieces at once." },
  { text: "The word \"checkmate\" comes from the Persian \"shah mat\" — the king is helpless." },
  { text: "A pawn reaching the eighth rank can become a queen, or a knight, rook or bishop." },
  { text: "The Sicilian is the most played reply to 1.e4 at every level of the game." },
  { text: "Only 20 first moves are legal in chess: sixteen pawn moves and four knight moves." },
  { text: "The fastest possible checkmate is Fool's Mate, in two moves." },
  { text: "En passant exists because pawns were once only allowed to move one square at a time." },
  { text: "A stalemate is a draw — cornering a king without checking it throws away the win." },
];

export const CHESS_FACTS: ChessFact[] = [...KENYA_AFRICA_FACTS, ...GENERAL_FACTS];

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
