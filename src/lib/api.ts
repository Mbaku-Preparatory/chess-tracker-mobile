import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import type {
  AccountDelinkResult,
  AccountGamesDeleteResult,
  ChessComImportResult,
  ChessResultsImportResult,
  ChessResultsPlayerCandidate,
  ChessResultsTournamentOption,
  LichessImportResult,
  Game,
  GamesFilter,
  OpeningDistribution,
  OpeningStat,
  OpeningStudySuggestion,
  OpeningExplorerData,
  PaginatedResponse,
  PerformanceSummary,
  Player,
  PlayerAccount,
  PlayerDetail,
  PlayerInsights,
  PlayerLookupResult,
  PrepSession,
  PrepSummary,
  RepertoireData,
} from "@/types";
import { authStorage } from "@/lib/auth";
import { handleAuthFailure } from "@/lib/handleAuthFailure";
import { refreshAccessToken } from "@/lib/refreshAccessToken";
import { requestTracker } from "@/lib/request-tracker";

// On a physical device or emulator "localhost" refers to the device itself,
// not your dev machine, so this almost always needs overriding via
// EXPO_PUBLIC_API_BASE_URL in .env (e.g. http://10.0.2.2:8000/api for the
// Android emulator, or your machine's LAN IP for a physical device/iOS sim).
const rawApiBase = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

const normalizedApiBase = rawApiBase.replace(/\/$/, "");
const API_BASE = normalizedApiBase.endsWith("/api")
  ? normalizedApiBase
  : `${normalizedApiBase}/api`;

async function fetchJson<T>(url: string, init?: RequestInit, _retriedAfterRefresh = false): Promise<T> {
  const token = authStorage.getToken();
  const authHeader: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};
  requestTracker.increment();
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        ...authHeader,
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      // A 401 means this access token is no longer good. Try a silent
      // refresh and retry once before giving up and logging the user out -
      // that's the whole point of holding a refresh token.
      if (res.status === 401 && authStorage.getToken()) {
        if (!_retriedAfterRefresh) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            return fetchJson<T>(url, init, true);
          }
        }
        void handleAuthFailure();
      }
      const body = await res.json().catch(() => null);
      const msg = body?.detail || `API error: ${res.status} ${res.statusText}`;
      const err = new Error(msg);
      (err as any).status = res.status;
      (err as any).body = body;
      throw err;
    }
    if (res.status === 204) {
      return undefined as T;
    }
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return undefined as T;
    }
    return res.json();
  } finally {
    requestTracker.decrement();
  }
}

export const api = {
  getPlayers(search?: string, page?: number, ordering?: string): Promise<PaginatedResponse<Player>> {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (page && page > 1) params.set("page", String(page));
    if (ordering) params.set("ordering", ordering);
    return fetchJson(`${API_BASE}/players/?${params}`);
  },

  getPlayerDetail(slug: string): Promise<PlayerDetail> {
    return fetchJson(`${API_BASE}/players/${slug}/`);
  },

  getPlayerGames(slug: string, filters?: GamesFilter): Promise<PaginatedResponse<Game>> {
    const params = new URLSearchParams();
    if (filters?.color_played) params.set("color_played", filters.color_played);
    if (filters?.result) params.set("result", filters.result);
    if (filters?.eco_code) params.set("eco_code", filters.eco_code);
    if (filters?.opening_family) params.set("opening_family", filters.opening_family);
    if (filters?.source) params.set("source", filters.source);
    if (filters?.search) params.set("search", filters.search);
    if (filters?.year) params.set("year", filters.year);
    if (filters?.page) params.set("page", String(filters.page));
    return fetchJson(`${API_BASE}/players/${slug}/games/?${params}`);
  },

  getPlayerOpenings(
    slug: string,
    source?: string,
    result?: string,
    year?: string,
  ): Promise<OpeningStat[]> {
    const params = new URLSearchParams();
    if (source) params.set("source", source);
    if (result) params.set("result", result);
    if (year) params.set("year", year);
    const qs = params.toString();
    return fetchJson(`${API_BASE}/players/${slug}/openings/${qs ? `?${qs}` : ""}`);
  },

  getPlayerSummary(slug: string): Promise<PerformanceSummary> {
    return fetchJson(`${API_BASE}/players/${slug}/summary/`);
  },

  getPlayerOpeningDistribution(slug: string): Promise<OpeningDistribution> {
    return fetchJson(`${API_BASE}/players/${slug}/opening-distribution/`);
  },

  importPGN(payload: {
    pgn_text: string;
    mode: "self" | "opponent";
    player_name?: string;
    player_slug?: string;
    color?: "auto" | "white" | "black";
  }): Promise<import("@/types").PGNImportResult> {
    return fetchJson(`${API_BASE}/pgn/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  getGamePgn(id: number): Promise<{ id: number; pgn_text: string }> {
    return fetchJson(`${API_BASE}/games/${id}/pgn/`);
  },

  deleteGame(id: number): Promise<void> {
    return fetchJson(`${API_BASE}/games/${id}/`, { method: "DELETE" });
  },

  lichessImportProxy(pgn: string): Promise<{ url: string }> {
    return fetchJson(`${API_BASE}/proxy/lichess-import/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pgn }),
    });
  },

  importFromChessCom(
    slug: string,
    payload: { username?: string; limit?: number },
    signal?: AbortSignal,
  ): Promise<ChessComImportResult> {
    return fetchJson(`${API_BASE}/players/${slug}/import-chesscom/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
  },

  importFromLichess(
    slug: string,
    payload: { username?: string; limit?: number },
    signal?: AbortSignal,
  ): Promise<LichessImportResult> {
    return fetchJson(`${API_BASE}/players/${slug}/import-lichess/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
  },

  searchChessResultsPlayer(params: {
    q?: string;
    fide_id?: string;
  }): Promise<{ results: ChessResultsPlayerCandidate[] }> {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v)) as Record<string, string>
    );
    return fetchJson(`${API_BASE}/chess-results/search/?${qs}`);
  },

  getChessResultsTournaments(crId: string): Promise<{
    player_name: string;
    tournaments: ChessResultsTournamentOption[];
  }> {
    return fetchJson(`${API_BASE}/chess-results/player/${crId}/tournaments/`);
  },

  importFromChessResults(
    slug: string,
    payload: { url: string }
  ): Promise<ChessResultsImportResult> {
    return fetchJson(`${API_BASE}/players/${slug}/import-chess-results/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  getPrepSummary(slug: string, source?: string): Promise<PrepSummary> {
    const qs = source ? `?source=${encodeURIComponent(source)}` : "";
    return fetchJson(`${API_BASE}/players/${slug}/prep-summary/${qs}`);
  },

  getPrepGames(
    slug: string,
    moves: string[],
    color: "white" | "black" | "",
    page = 1,
    source?: string,
  ): Promise<{ count: number; page: number; page_size: number; results: import("@/types").Game[] }> {
    const params = new URLSearchParams();
    if (moves.length) params.set("moves", moves.join(","));
    if (color) params.set("color", color);
    if (page > 1) params.set("page", String(page));
    if (source) params.set("source", source);
    return fetchJson(`${API_BASE}/players/${slug}/prep-games/?${params}`);
  },

  async downloadPrepGamesPgn(slug: string, moves: string[], color: "white" | "black" | "", source?: string): Promise<void> {
    const params = new URLSearchParams();
    if (moves.length) params.set("moves", moves.join(","));
    if (color) params.set("color", color);
    if (source) params.set("source", source);
    const token = authStorage.getToken();
    const res = await fetch(`${API_BASE}/players/${slug}/prep-games/pgn/?${params}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("Failed to download PGN");
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const match = disposition.match(/filename="([^"]+)"/);
    const filename = match?.[1] ?? "games.pgn";
    const text = await res.text();
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, text, { encoding: "utf8" });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, { mimeType: "application/x-chess-pgn", dialogTitle: filename });
    }
  },

  getMasterGames(params: { eco?: string; event?: string; limit?: number }): Promise<import("@/types").MasterGame[]> {
    const qs = new URLSearchParams();
    if (params.eco)   qs.set("eco",   params.eco);
    if (params.event) qs.set("event", params.event);
    qs.set("limit", String(params.limit ?? 10));
    return fetchJson(`${API_BASE}/openings/master-games/?${qs}`);
  },

  getTournamentList(q?: string, limit = 50): Promise<import("@/types").TournamentSummary[]> {
    const qs = new URLSearchParams({ limit: String(limit) });
    if (q) qs.set("q", q);
    return fetchJson(`${API_BASE}/openings/tournaments/?${qs}`);
  },

  getPlayerInsights(slug: string, ecoCodes?: string[]): Promise<PlayerInsights> {
    const params = new URLSearchParams();
    if (ecoCodes && ecoCodes.length > 0) {
      params.set("eco_codes", ecoCodes.join(","));
    }
    const qs = params.toString();
    return fetchJson(`${API_BASE}/players/${slug}/insights/${qs ? `?${qs}` : ""}`);
  },

  getOpeningStudies(slug: string, limit?: number): Promise<{ suggestions: OpeningStudySuggestion[] }> {
    const qs = limit ? `?limit=${limit}` : "";
    return fetchJson(`${API_BASE}/players/${slug}/opening-studies/${qs}`);
  },

  getOpeningExplorer(
    slug: string,
    eco_code: string,
    opening_name?: string,
  ): Promise<OpeningExplorerData> {
    const qs = new URLSearchParams({ eco_code });
    if (opening_name) qs.set("opening_name", opening_name);
    return fetchJson(`${API_BASE}/players/${slug}/opening-explorer/?${qs}`);
  },

  getRepertoire(): Promise<RepertoireData> {
    return fetchJson(`${API_BASE}/repertoire/`);
  },

  saveRepertoire(data: Omit<RepertoireData, "updated_at">): Promise<RepertoireData> {
    return fetchJson(`${API_BASE}/repertoire/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  searchOpenings(query: string, limit = 20): Promise<import("@/types").OpeningResult[]> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    return fetchJson(`${API_BASE}/openings/search/?${params}`);
  },

  // ── Auth ─────────────────────────────────────────────────────────────────

  register(
    email: string,
    password: string,
    username: string,
    firstName: string,
    lastName: string
  ): Promise<{ detail: string; email: string }> {
    return fetchJson(`${API_BASE}/auth/register/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        username,
        first_name: firstName,
        last_name: lastName,
      }),
    });
  },

  verifyEmail(
    email: string,
    code: string
  ): Promise<{ access: string; refresh: string; email: string }> {
    return fetchJson(`${API_BASE}/auth/verify-email/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
  },

  resendVerification(email: string): Promise<{ detail: string }> {
    return fetchJson(`${API_BASE}/auth/resend-verification/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  },

  login(
    email: string,
    password: string
  ): Promise<{ access: string; refresh: string; email: string }> {
    return fetchJson(`${API_BASE}/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  },

  logout(refreshToken: string): Promise<void> {
    return fetchJson(`${API_BASE}/auth/logout/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });
  },

  // ── Player lookup (search to pre-fill add-opponent form) ─────────────────

  lookupPlayer(
    platform: "chesscom" | "lichess" | "fide",
    q: string
  ): Promise<{ platform: string; results: PlayerLookupResult[] }> {
    const params = new URLSearchParams({ platform, q });
    return fetchJson(`${API_BASE}/players/lookup/?${params}`);
  },

  // ── Player create ─────────────────────────────────────────────────────────

  syncFide(slug: string, fideId?: string): Promise<{
    updated_fields: string[];
    full_name: string;
    standard_rating: number | null;
    rapid_rating: number | null;
    blitz_rating: number | null;
    title: string | null;
    birth_year: number | null;
  }> {
    return fetchJson(`${API_BASE}/players/${slug}/sync-fide/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fideId ? { fide_id: fideId } : {}),
    });
  },

  createPlayer(payload: {
    full_name: string;
    federation?: string;
    fide_id?: string;
    accounts?: { platform: "chesscom" | "lichess"; username: string }[];
  }): Promise<{ id: number; public_id: string; full_name: string; slug: string }> {
    return fetchJson(`${API_BASE}/players/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  // ── Player accounts ───────────────────────────────────────────────────────

  getAccounts(slug: string): Promise<PlayerAccount[]> {
    return fetchJson(`${API_BASE}/players/${slug}/accounts/`);
  },

  addAccount(slug: string, platform: "chesscom" | "lichess", username: string): Promise<PlayerAccount> {
    return fetchJson(`${API_BASE}/players/${slug}/accounts/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, username }),
    });
  },

  removeAccount(
    slug: string,
    accountId: number,
    options?: { deleteGames?: boolean }
  ): Promise<AccountDelinkResult> {
    const params = new URLSearchParams();
    if (options?.deleteGames) params.set("delete_games", "1");
    const qs = params.toString();
    return fetchJson(
      `${API_BASE}/players/${slug}/accounts/${accountId}/${qs ? `?${qs}` : ""}`,
      { method: "DELETE" }
    );
  },

  deleteImportedGamesForAccount(
    slug: string,
    accountId: number
  ): Promise<AccountGamesDeleteResult> {
    return fetchJson(`${API_BASE}/players/${slug}/accounts/${accountId}/games/`, {
      method: "DELETE",
    });
  },

  deletePlayer(slug: string): Promise<void> {
    return fetchJson(`${API_BASE}/players/${slug}/`, { method: "DELETE" });
  },

  // ── Prep sessions (Schedule) ──────────────────────────────────────────────

  async getPrepSessions(): Promise<PrepSession[]> {
    const response = await fetchJson<PaginatedResponse<PrepSession>>(`${API_BASE}/prep-sessions/`);
    return response.results;
  },

  createPrepSession(payload: {
    title: string;
    notes?: string;
    scheduled_for: string;
    scheduled_time?: string | null;
    duration_minutes?: number | null;
    reminder_sound_uri?: string;
    reminder_sound_name?: string;
  }): Promise<PrepSession> {
    return fetchJson(`${API_BASE}/prep-sessions/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  updatePrepSession(
    id: number,
    payload: Partial<
      Pick<
        PrepSession,
        | "title"
        | "notes"
        | "scheduled_for"
        | "scheduled_time"
        | "duration_minutes"
        | "completed_at"
        | "reminder_sound_uri"
        | "reminder_sound_name"
      >
    >
  ): Promise<PrepSession> {
    return fetchJson(`${API_BASE}/prep-sessions/${id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  deletePrepSession(id: number): Promise<void> {
    return fetchJson(`${API_BASE}/prep-sessions/${id}/`, { method: "DELETE" });
  },
};
