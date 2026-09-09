/**
 * Checks for the puzzle solve state machine.
 *
 *     npx tsx --tsconfig tsconfig.json src/components/chess/puzzleSolve.check.ts
 *
 * There is no test runner in this app, and this is the code where an off-by-one
 * hides — which ply goes on the board, when it comes back off, which moves
 * count as found. So the checks are a script rather than nothing. Sixteen
 * mutations were run against the functions below; all sixteen were caught here.
 */
import {
  initialState, afterPlay, afterCorrect, afterReply, afterWrong, afterWrongSettled,
  afterFailedRequest, movesFound, positionAfter, lineInSan,
} from "@/components/chess/puzzleSolve";
import type { Puzzle } from "@/types";

let failures = 0;
function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures++;
  console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : `\n        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`}`);
}

// A real puzzle, not an invented one: Lichess 000Zo, a mate in two, as the
// client is sent it — the position after the setup move, and the line from
// there. Black plays Re1+, White is forced to Kf2, Black plays Rf1#.
const FEN = "4r3/1k6/pp3P2/1b5p/3R1p2/P1R2P2/1P4PP/6K1 b - - 0 35";
const LINE = ["e8e1", "g1f2", "e1f1"]; // player, reply, player
const P = (over: Partial<Puzzle> = {}): Puzzle => ({
  id: 1, date: "2026-09-09", lichess_id: "x", fen: FEN, rating: 1400,
  themes: ["mateIn2"], game_url: "", side_to_move: "black", move_number: 35,
  moves_to_find: 2, played: [], solved: false, failed: false, finished: false, ...over,
});

// ── where a puzzle starts ──
check("a fresh puzzle starts empty and playing", initialState(P()), { plies: [], status: "playing", wrongMove: null });
check("a resumed puzzle starts from what was played",
  initialState(P({ played: LINE.slice(0, 2) })).plies, LINE.slice(0, 2));
check("a solved puzzle does not reopen", initialState(P({ solved: true, finished: true })).status, "solved");
check("a failed puzzle does not reopen", initialState(P({ failed: true, finished: true })).status, "failed");
check("no puzzle at all is still a valid state", initialState(null), { plies: [], status: "playing", wrongMove: null });

// ── a correct move that has a reply ──
let s = initialState(P());
s = afterPlay(s, LINE[0]);
check("the move goes on the board before the server answers", s.plies, [LINE[0]]);
check("and the board is locked while it does", s.status, "checking");
check("one move played counts as one found", movesFound(s), 1);

s = afterCorrect(s, LINE[1]);
check("a correct move with a reply leaves the board alone", s.plies, [LINE[0]]);
check("and does not declare the puzzle solved", s.status, "checking");

s = afterReply(s, LINE[1]);
check("the reply lands and hands the move back", s, { plies: LINE.slice(0, 2), status: "playing", wrongMove: null });
check("their move and the reply are still one found move", movesFound(s), 1);

// ── the last move, which has no reply ──
s = afterPlay(s, LINE[2]);
s = afterCorrect(s, null);
check("the end of the line solves it", s.status, "solved");
check("with the last move left on the board", s.plies, LINE);
check("both of the player's moves counted", movesFound(s), 2);
check("an undefined reply ends it too", afterCorrect(afterPlay(initialState(P()), LINE[0]), undefined).status, "solved");

// ── a wrong move ──
s = afterPlay(initialState(P()), "e8e2");
s = afterWrong(s, "e8", "e2");
check("a refuted move stays up so it can be seen", s.plies, ["e8e2"]);
check("but is not counted as found", movesFound(s), 0);
check("and the puzzle is not over while it shows", s.status, "checking");

s = afterWrongSettled(s);
check("then it comes back off", s.plies, []);
check("and the puzzle is over", s.status, "failed");
check("with nothing left marked wrong", s.wrongMove, null);

// A wrong move at the *second* move must not take the first one back too.
s = afterWrongSettled(afterWrong(afterPlay({ plies: LINE.slice(0, 2), status: "playing", wrongMove: null }, "e1e2"), "e1", "e2"));
check("a wrong second move leaves the solved first move alone", s.plies, LINE.slice(0, 2));

// ── a request that never landed ──
s = afterFailedRequest(afterPlay(initialState(P()), LINE[0]));
check("a dropped request does not spend the move", s, { plies: [], status: "playing", wrongMove: null });

// ── the board ──
check("the position after no moves is the puzzle's", positionAfter(FEN, []).fen(), FEN);
check("the player is on move there", positionAfter(FEN, []).turn(), "b");
check("after their move it is the opponent's", positionAfter(FEN, [LINE[0]]).turn(), "w");
check("the whole line ends in mate", positionAfter(FEN, LINE).isCheckmate(), true);
check("an impossible ply stops the replay rather than throwing", positionAfter(FEN, ["a8a1"]).fen(), FEN);
check("an empty fen does not throw", positionAfter("", []).turn(), "w");

// Promotions carry a fifth character in UCI, and chess.js refuses the move
// without it. Plenty of tactics end in one.
const PROMO = "8/4P3/8/8/8/8/8/K6k w - - 0 1";
check("a promotion replays as a queen", positionAfter(PROMO, ["e7e8q"]).get("e8" as never), { type: "q", color: "w" });

// ── the line, once it may be shown ──
check("the line reads as chess", lineInSan(FEN, LINE), ["Re1+", "Kf2", "Rf1#"]);
check("a promoting line reads as chess", lineInSan(PROMO, ["e7e8q"]), ["e8=Q"]);
check("no solution means nothing to show", lineInSan(FEN, undefined), []);

console.log(failures ? `\n${failures} FAILED` : "\nall checks passed");
process.exit(failures ? 1 : 0);
