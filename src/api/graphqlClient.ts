import { authStorage } from "@/lib/auth";
import { handleAuthFailure } from "@/lib/handleAuthFailure";
import { refreshAccessToken } from "@/lib/refreshAccessToken";

// Derive the GraphQL URL from the REST API base so both stay in sync automatically.
const API_BASE = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api").replace(/\/api\/?$/, "");
const GRAPHQL_API = process.env.EXPO_PUBLIC_GRAPHQL_API ?? `${API_BASE}/graphql/`;

// Uses fetch rather than axios: axios's XHR adapter reliably threw a bare
// "Network Error"/ERR_NETWORK for every request on RN 0.86's new architecture
// (bridgeless) on a physical device, even though the exact same host answers
// fine via fetch (see src/lib/api.ts) and via curl. fetch is what's proven to
// work in this app/environment, so the GraphQL client now mirrors it instead
// of fighting axios's RN compatibility issues.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function post(query: string, retriedAfterRefresh = false): Promise<{ data: any }> {
  const token = authStorage.getToken();
  const res = await fetch(GRAPHQL_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();

  // The backend always answers an expired/invalid/missing JWT with HTTP 200 and
  // a resolver-level `errors: [{ message: "Authentication required" }]` (there's
  // no extensions.code to key off - see every resolver in players/schema.py and
  // tournaments/schema.py). Try a silent refresh first - only log the user out
  // if the refresh token itself is no longer good.
  const errors = json?.errors;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isAuthError = Array.isArray(errors) && errors.some((e: any) => e?.message === "Authentication required");

  if (!isAuthError || !authStorage.getToken()) {
    return { data: json };
  }

  if (retriedAfterRefresh) {
    void handleAuthFailure();
    return { data: json };
  }

  const newAccessToken = await refreshAccessToken();
  if (!newAccessToken) {
    void handleAuthFailure();
    return { data: json };
  }

  return post(query, true);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const graphqlClient = (config: { data: { query: string } }) => post(config.data.query);

export default graphqlClient;
