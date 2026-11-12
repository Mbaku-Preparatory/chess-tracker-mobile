import Constants from "expo-constants";
import * as Updates from "expo-updates";

const rawApiBase = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:8000/api";
const API_BASE = rawApiBase.replace(/\/$/, "");

/**
 * The installed binary's version, which is what the store-update gate judges.
 *
 * Read from the native side first: once over-the-air updates run, expoConfig comes from the
 * update that is running, not from the binary, so it can no longer be trusted to say which build
 * is installed. (A version bump changes the runtime fingerprint, so an update can never carry a
 * different version today - this keeps it right if that ever changes.)
 */
export const APP_VERSION = Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? "0.0.0";
export const BUILD_NUMBER = Constants.nativeBuildVersion ?? Constants.expoConfig?.android?.versionCode ?? null;

/**
 * The version of the JavaScript that is running: "1.0.5" for the code inside the binary,
 * "1.0.5.1", "1.0.5.2" ... for each over-the-air update after it. scripts/publish-ota.js bakes
 * EXPO_PUBLIC_JS_VERSION into every update; a store build never sets it, so it falls back to the
 * binary's version.
 */
export const JS_VERSION = process.env.EXPO_PUBLIC_JS_VERSION || APP_VERSION;

/** "1.0.5 (build 7)", plus "· update 1.0.5.2" when an over-the-air update is running. */
export function versionLabel(): string {
  const base = BUILD_NUMBER ? `${APP_VERSION} (build ${BUILD_NUMBER})` : APP_VERSION;
  // isEmbeddedLaunch is also true in development and on web, where updates are off.
  if (!Updates.isEnabled || Updates.isEmbeddedLaunch) return base;
  return `${base} · update ${JS_VERSION}`;
}

export interface VersionGate {
  update_required: boolean;
  update_available: boolean;
  latest_version: string;
  update_url: string;
  message: string | null;
  /** Older backends leave it out, which reads as false. */
  js_update_required?: boolean;
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
    const query = `version=${encodeURIComponent(APP_VERSION)}&js_version=${encodeURIComponent(JS_VERSION)}`;
    const response = await fetch(`${API_BASE}/app-version/?${query}`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const data = await response.json();
    if (typeof data?.update_required !== "boolean") return null;
    return data as VersionGate;
  } catch {
    return null;
  }
}
