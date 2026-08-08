import Constants from "expo-constants";

const rawApiBase = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:8000/api";
const API_BASE = rawApiBase.replace(/\/$/, "");

export const APP_VERSION = Constants.expoConfig?.version ?? "0.0.0";
export const BUILD_NUMBER = Constants.expoConfig?.android?.versionCode ?? null;

export interface VersionGate {
  update_required: boolean;
  update_available: boolean;
  latest_version: string;
  update_url: string;
  message: string | null;
}

/**
 * Asks the backend whether this build is still allowed to run.
 *
 * Returns null on any failure - network down, server error, malformed body. The caller treats
 * null as "carry on", which is the only safe default: a version gate that fails closed turns
 * every offline launch, and every backend outage, into an app that refuses to open.
 */
export async function checkVersionGate(): Promise<VersionGate | null> {
  try {
    const controller = new AbortController();
    // Without a timeout this hangs the launch gate on a stalled connection, which looks
    // identical to a crash on startup.
    const timeout = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(
      `${API_BASE}/app-version/?version=${encodeURIComponent(APP_VERSION)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!response.ok) return null;
    const data = await response.json();
    if (typeof data?.update_required !== "boolean") return null;
    return data as VersionGate;
  } catch {
    return null;
  }
}
