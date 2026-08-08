// ── Auth ──────────────────────────────────────────────
export const LOAD_AUTH = "auth/load";
export const SET_AUTH = "auth/set";
export const SET_PROFILE_PIC = "auth/setProfilePic";
export const CLEAR_AUTH = "auth/clear";
export const LOGIN = "auth/login";
export const LOGIN_PENDING = "auth/login_pending";
export const REGISTER = "auth/register";
export const REGISTER_PENDING = "auth/register_pending";

// ── Players ───────────────────────────────────────────
export const FETCH_PLAYERS = "players/fetch";
export const FETCH_PLAYERS_PENDING = "players/fetch_pending";
export const SET_PLAYERS_SEARCH = "players/setSearch";
export const SET_PLAYERS_ORDERING = "players/setOrdering";
export const SET_PLAYERS_PAGE = "players/setPage";

// ── Player Detail ─────────────────────────────────────
export const FETCH_PLAYER_DETAIL = "playerDetail/fetch";
export const FETCH_PLAYER_DETAIL_PENDING = "playerDetail/fetch_pending";
export const CLEAR_PLAYER_DETAIL = "playerDetail/clear";

// ── Games ─────────────────────────────────────────────
export const FETCH_GAMES = "games/fetch";
export const FETCH_GAMES_PENDING = "games/fetch_pending";
export const SET_GAMES_FILTERS = "games/setFilters";
export const RESET_GAMES_FILTERS = "games/resetFilters";

// ── Repertoire ────────────────────────────────────────
export const FETCH_REPERTOIRE = "repertoire/fetch";
export const FETCH_REPERTOIRE_PENDING = "repertoire/fetch_pending";
export const SAVE_REPERTOIRE = "repertoire/save";
export const SAVE_REPERTOIRE_PENDING = "repertoire/save_pending";
export const ADD_OPENING = "repertoire/addOpening";
export const REMOVE_OPENING = "repertoire/removeOpening";
export const COMPLETE_ONBOARDING = "repertoire/completeOnboarding";
export const RESET_REPERTOIRE = "repertoire/reset";
export const SET_REPERTOIRE_INITIALIZED = "repertoire/setInitialized";

// ── Theme ─────────────────────────────────────────────
export const LOAD_THEME = "theme/load";
export const SET_COLOR_SCHEME = "theme/setColorScheme";

// ── Prep Sessions (Schedule) ──────────────────────────
export const FETCH_PREP_SESSIONS = "prepSessions/fetch";
export const FETCH_PREP_SESSIONS_PENDING = "prepSessions/fetch_pending";
export const UPDATE_PREP_SESSION = "prepSessions/update";
export const UPDATE_PREP_SESSION_PENDING = "prepSessions/update_pending";
export const DELETE_PREP_SESSION = "prepSessions/delete";
export const DELETE_PREP_SESSION_PENDING = "prepSessions/delete_pending";
export const ADD_PREP_SESSION = "prepSessions/add";
export const REPLACE_PREP_SESSION = "prepSessions/replace";
