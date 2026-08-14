export interface PlayerAccount {
  id: number;
  platform: "chesscom" | "lichess";
  username: string;
}

export interface AccountDelinkResult {
  account_deleted: boolean;
  platform: "chesscom" | "lichess";
  username: string;
  deleted_games: number;
}

export interface AccountGamesDeleteResult {
  platform: "chesscom" | "lichess";
  username: string;
  deleted_games: number;
}

export interface PlayerLookupResult {
  platform: "chesscom" | "lichess" | "fide";
  username?: string;       // chess.com / lichess
  fide_id?: string;        // fide
  display_name: string;
  title: string | null;
  avatar_url: string | null;
  ratings?: {
    bullet?: number;
    blitz?: number;
    rapid?: number;
    classical?: number;
    standard?: number;
  };
  country?: string | null;
  federation?: string | null;
}

export type ColorChoice = "white" | "black";
export type GameResult = "win" | "draw" | "loss";
export type GameSource = "manual" | "pgn_import" | "lichess" | "chess_com" | "chess_results";

export interface Player {
  id: number;
  public_id: string;
  full_name: string;
  slug: string;
  fide_id: string | null;
  chesscom_username: string | null;
  lichess_username: string | null;
  federation: string | null;
  birth_year: number | null;
  standard_rating: number | null;
  rapid_rating: number | null;
  blitz_rating: number | null;
  title: string | null;
  bio: string;
  profile_image: string | null;
  accounts: PlayerAccount[];
  games_count?: number;
  game_source_counts?: {
    chess_results?: number;
    chess_com?: number;
    lichess?: number;
    manual?: number;
    pgn_import?: number;
  };
  created_at?: string;
  updated_at?: string;
}

export interface OpeningStat {
  id: number;
  color_choice: ColorChoice;
  eco_code: string;
  opening_name: string;
  games_count: number;
  score_percent: number | null;
}

export interface PerformanceSummary {
  id: number;
  total_games: number;
  wins: number;
  draws: number;
  losses: number;
  win_rate: number;
  white_games: number;
  white_score: number;
  black_games: number;
  black_score: number;
  summary_text: string;
}

export interface Strength {
  id: number;
  title: string;
  description: string;
  order: number;
}

export interface Weakness {
  id: number;
  title: string;
  description: string;
  order: number;
}

export interface PrepRecommendation {
  id: number;
  scenario_title: string;
  description: string;
  order: number;
}

export interface Game {
  id: number;
  event: string;
  site: string;
  round: string;
  date_played: string | null;
  opponent_name: string;
  opponent_rating: number | null;
  color_played: ColorChoice;
  result: GameResult;
  eco_code: string | null;
  opening_name: string | null;
  opening_family: string | null;
  num_moves: number | null;
  time_control: string | null;
  moves_preview: string;
  pgn_text?: string;
  source: GameSource;
  source_url: string | null;
  notes: string | null;
}

export interface PlayerDetail extends Player {
  performance_summary: PerformanceSummary | null;
  strengths: Strength[];
  weaknesses: Weakness[];
  prep_recommendations: PrepRecommendation[];
  opening_stats: OpeningStat[];
  recent_games: Game[];
}

export type ScoutingSectionType = "win_condition" | "time_pressure" | "common_mistakes" | "quick_prep";

export interface ScoutingSection {
  id: number;
  section_type: ScoutingSectionType;
  title: string;
  content: Record<string, any>;
  order: number;
}

export interface OpeningDistribution {
  white: {
    openings: OpeningStat[];
    total_games: number;
  };
  black: {
    openings: OpeningStat[];
    total_games: number;
  };
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface GamesFilter {
  color_played?: ColorChoice | "";
  result?: GameResult | "";
  eco_code?: string;
  opening_family?: string;
  source?: GameSource | "";
  search?: string;
  year?: string;
  min_rating?: string;
  max_rating?: string;
  page?: number;
}

export interface ChessComFetchMeta {
  username: string;
  total_archives: number;
  archives_visited: number;
  archives_failed: number;
  games_fetched: number;
}

export interface ChessComImportResult extends PGNImportResult {
  chesscom_username: string;
  fetch_meta: ChessComFetchMeta;
}

export interface LichessFetchMeta {
  username: string;
  games_fetched: number;
}

export interface LichessImportResult extends PGNImportResult {
  lichess_username: string;
  fetch_meta: LichessFetchMeta;
}

export interface ChessResultsFetchMeta {
  tournament_name: string;
  tournament_url: string;
  source: "pgn" | "pairings";
  total_rounds?: number;
  skipped_reason?: "no_moves";
}

export interface ChessResultsPlayerCandidate {
  cr_id: string;
  name: string;
  federation: string;
  title?: string | null;
  fide_id?: string | null;
  rating?: number | null;
  birth_year?: number | null;
}

export interface ChessResultsTournamentOption {
  tnr: string;
  snr: string;
  name: string;
  year?: number | null;
  location?: string | null;
  date?: string | null;
  url?: string | null;
}

export interface ChessResultsImportResult {
  games_imported: number;
  games_skipped: number;
  games_failed: number;
  source_type: "pgn" | "pairings";
  fetch_meta: ChessResultsFetchMeta;
  // PGN path also carries the PGNImportResult fields
  player_slug?: string;
  player_name?: string;
  games_created?: number;
  games_updated?: number;
  opening_summary?: { name: string; count: number; percent: number }[];
  result_summary?: { wins: number; draws: number; losses: number };
}

export interface PGNImportResult {
  player_public_id?: string;
  player_slug: string;
  player_name: string;
  games_created: number;
  games_updated: number;
  games_imported: number;
  games_skipped: number;
  opening_summary: { name: string; count: number; percent: number }[];
  result_summary: { wins: number; draws: number; losses: number };
}

// ── Phase 4: Insight engine types ───────────────────────────────────────────

export interface InsightMeta {
  player_slug: string;
  player_name: string;
  games_analyzed: number;
  openings_tracked: number;
  repertoire_codes_provided: string[];
  generated_at: string;
  data_quality: "good" | "fair" | "limited" | "none";
}

export interface InsightConfidence {
  score: number;
  label: "High" | "Medium" | "Low" | "Very Low" | "None";
  reason: string;
}

export interface InsightWeakness {
  eco_code: string;
  opening_name: string;
  color: ColorChoice;
  score_percent: number;
  games_count: number;
  severity: "critical" | "high" | "moderate";
  in_your_repertoire: boolean;
  repertoire_match: "exact" | "family" | "";
  description: string;
}

export interface InsightRecommendedLine {
  eco_code: string;
  opening_name: string;
  color: ColorChoice;
  opponent_score: number;
  opponent_games: number;
  repertoire_match: "exact" | "family";
  recommendation_strength: "strong" | "moderate" | "low";
  rationale: string;
}

export interface InsightDangerZone {
  eco_code: string;
  opening_name: string;
  color: ColorChoice;
  score_percent: number;
  games_count: number;
  risk_level: "high" | "medium";
  in_your_repertoire: boolean;
  advice: string;
}

export interface InsightMatchPlanItem {
  order: number;
  type: "target" | "caution" | "consider" | "general";
  text: string;
}

export interface InsightEvidence {
  total_games: number;
  white_games: number;
  black_games: number;
  win_rate: number;
  white_score: number;
  black_score: number;
  top_openings: { eco_code: string; opening_name: string; color: string; games_count: number; score_percent: number }[];
  worst_openings: { eco_code: string; opening_name: string; color: string; games_count: number; score_percent: number }[];
  best_openings: { eco_code: string; opening_name: string; color: string; games_count: number; score_percent: number }[];
}

export interface PlayerInsights {
  meta: InsightMeta;
  confidence: InsightConfidence;
  executive_summary: string;
  recommended_lines: InsightRecommendedLine[];
  weaknesses: InsightWeakness[];
  danger_zones: InsightDangerZone[];
  match_plan: InsightMatchPlanItem[];
  evidence: InsightEvidence;
}

export interface OpeningResult {
  slug: string;
  name: string;
  eco_code: string;
  family: string;
  variation: string;
  pgn: string;
  uci: string;
  epd: string;
}

// ── Opening Study Suggestions ─────────────────────────────────────────────────

export interface OpeningStudySuggestion {
  eco_code: string;
  opening_name: string;
  color: "white" | "black";
  games: number;
  score_percent: number;
  priority: number;
  lichess_opening_url: string;
  lichess_study_url: string;
}

// ── Tournament Summary ────────────────────────────────────────────────────────

export interface TournamentSummary {
  event: string;
  game_count: number;
  year_min: number | null;
  year_max: number | null;
}

// ── Master Games ─────────────────────────────────────────────────────────────

export interface MasterGame {
  id: number;
  white: string;
  black: string;
  white_elo: number | null;
  black_elo: number | null;
  result: "1-0" | "0-1" | "1/2-1/2";
  eco: string;
  opening_name: string;
  event: string;
  site: string;
  year: number | null;
  moves: string;
}

// ── Opening Explorer ─────────────────────────────────────────────────────────

export interface ExplorerDbStats {
  total: number;
  white_wins: number;
  draws: number;
  black_wins: number;
  white_pct: number;
  draw_pct: number;
  black_pct: number;
}

export interface ExplorerEngineMove {
  san: string;
  uci: string;
  score: number | null;
  rank: number | null;
  winrate: string | null;
  note: string;
}

export interface ExplorerDbGame {
  id: number;
  player_name: string;
  opponent_name: string;
  color_played: ColorChoice;
  result: GameResult;
  date_played: string | null;
  event: string;
  round: string;
  opening_name: string;
  opponent_rating: number | null;
  pgn_available: boolean;
}

export interface OpeningExplorerData {
  eco_code: string;
  opening_name: string;
  fen: string | null;
  db_stats: ExplorerDbStats;
  top_games: ExplorerDbGame[];
  engine_moves: ExplorerEngineMove[];
  lichess_opening_url: string;
}

// ── Prep Summary ─────────────────────────────────────────────────────────────

export interface PrepMoveFreq {
  move: string;
  count: number;
  pct: number;
}

export interface PrepLine {
  line: string;
  count: number;
  pct: number;
}

export interface PrepTreeNode {
  move: string;
  count: number;
  pct: number;
  children: PrepTreeNode[];
}

export interface PrepTree {
  total: number;
  children: PrepTreeNode[];
}

export interface PrepTrend {
  type: string;
  color: "white" | "black";
  label: string;
  move: string;
  description: string;
  recent_pct: number;
  overall_pct: number;
  delta: number;
  confidence: "high" | "medium";
}

export interface PrepSession {
  id: number;
  title: string;
  notes: string;
  scheduled_for: string; // "YYYY-MM-DD"
  scheduled_time: string | null; // "HH:MM:SS"
  duration_minutes: number | null;
  completed_at: string | null;
  reminder_sound_uri: string;
  reminder_sound_name: string;
  created_at: string;
  updated_at: string;
}

export interface PrepSummary {
  meta: {
    total_games: number;
    source_counts: Partial<Record<string, number>>;
    date_range: { first: string | null; last: string | null };
  };
  as_white: {
    total: number;
    first_moves: PrepMoveFreq[];
    common_lines: PrepLine[];
    opening_tree: PrepTree;
  };
  as_black: {
    total: number;
    vs_e4: { count: number; responses: PrepMoveFreq[]; common_lines: PrepLine[] };
    vs_d4: { count: number; responses: PrepMoveFreq[]; common_lines: PrepLine[] };
    vs_other: { count: number; responses: PrepMoveFreq[] };
    opening_tree: PrepTree;
  };
  trends: PrepTrend[];
}

/** The signed-in user's own account, from /api/auth/me/. */
export interface UserProfile {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  date_joined: string;
}

// ── Background import jobs ───────────────────────────────────────────────────

export type ImportJobStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface ImportJobTournamentResult {
  name: string;
  status: "done" | "error";
  games_imported?: number;
  games_skipped?: number;
  skipped_reason?: string | null;
  message?: string;
}

/**
 * Mirrors _serialize_import_job in players/views.py. No `error` field: the
 * backend deliberately withholds it because it holds exception text.
 */
export interface ImportJob {
  id: string;
  status: ImportJobStatus;
  total: number;
  completed: number;
  games_imported: number;
  results: ImportJobTournamentResult[];
  cancel_requested: boolean;
  notify_email: boolean;
  /** Imports the worker must finish first. null once this one is running. */
  queue_ahead: number | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

/** An unfinished job as returned by /import-jobs/active/. */
export interface ActiveImportJob extends ImportJob {
  player_name: string;
  player_slug: string;
}

/**
 * The signed-in user's own profile, from /api/me/player/.
 *
 * `player` is a plain PlayerDetail on purpose — their profile is a player
 * record like any other, so everything built for the player screens works on
 * it without a second set of components to keep in step.
 *
 * `import_job` is the most recent import, not only a running one. A profile
 * whose import finished with nothing found has to be able to say so, and that
 * is indistinguishable from "never started" if finished jobs are dropped.
 */
export interface MyPlayer {
  player: PlayerDetail;
  import_job: ImportJob | null;
}

// ── Payments ─────────────────────────────────────────────────────────────────

export type PaymentStatus = "pending" | "completed" | "failed";

/** Mirrors _serialize_payment in payments/views.py. */
export interface Payment {
  /** The id everywhere: what we poll, and what Paystack names in every event. */
  reference: string;
  status: PaymentStatus;
  amount: string;
  currency: string;
  /** "mobile_money", "card"… Empty until the payer has chosen one. */
  channel: string;
  /** Paystack's hosted checkout page. Where the payer is sent. */
  authorization_url: string;
  /** Our wording, derived from status. Null unless failed. */
  failure_reason: string | null;
  created_at: string;
  completed_at: string | null;
  /** Present on create: true when an unfinished checkout was handed back. */
  reused_existing?: boolean;
}
