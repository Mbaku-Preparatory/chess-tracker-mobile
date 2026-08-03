import { authStorage } from "@/lib/auth";

// Deliberately re-derives API_BASE instead of importing it from lib/api.ts:
// that file imports this one to retry requests after a refresh, so importing
// back would create a circular module dependency.
const rawApiBase = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:8000/api";
const normalizedApiBase = rawApiBase.replace(/\/$/, "");
const API_BASE = normalizedApiBase.endsWith("/api") ? normalizedApiBase : `${normalizedApiBase}/api`;

let inFlight: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const refreshToken = authStorage.getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });
    if (!res.ok) return null;

    const data: { access: string; refresh?: string } = await res.json();

    // Route through Redux (not authStorage directly) so state.auth stays in
    // sync with what's persisted - dynamic import avoids a static cycle with
    // redux/store.ts, which pulls in this app's whole middleware chain.
    const { store } = await import("@/redux/store");
    const { setAuth } = await import("@/redux/actions/auth");
    store.dispatch(
      setAuth({
        token: data.access,
        refreshToken: data.refresh ?? refreshToken,
        email: authStorage.getEmail() ?? "",
      })
    );

    return data.access;
  } catch {
    return null;
  }
}

// Refresh tokens rotate server-side (the old one is blacklisted the moment
// it's used), so if two requests 401 at the same instant and each fires its
// own refresh call, the loser's response reuses an already-blacklisted
// refresh token and fails outright. Coalescing every concurrent call onto
// one shared in-flight promise avoids that self-inflicted race.
export function refreshAccessToken(): Promise<string | null> {
  if (!inFlight) {
    inFlight = doRefresh().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}
