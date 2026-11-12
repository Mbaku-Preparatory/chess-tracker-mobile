import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import * as Updates from "expo-updates";

// Off in development (Metro serves the code) and on web, where isEnabled is always false.
const otaEnabled = () => Updates.isEnabled && !__DEV__;

let inflight: Promise<boolean> | null = null;

/**
 * Downloads the newest over-the-air update for this binary, if there is one. Resolves true when
 * an update newer than the running code is now on the device, waiting for a restart.
 *
 * Shared while in flight: the launch check and a forced update from the version gate start at
 * the same moment, and two overlapping native fetches can make one of them fail. Never throws -
 * a failed check (offline, Expo down) must leave the running app exactly as it was.
 */
function downloadLatestUpdate(): Promise<boolean> {
  if (!otaEnabled()) return Promise.resolve(false);
  inflight ??= (async () => {
    try {
      const check = await Updates.checkForUpdateAsync();
      if (!check.isAvailable) return false;
      await Updates.fetchUpdateAsync();
      return true;
    } catch {
      return false;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/**
 * The backend's forced JS update (MOBILE_MIN_JS_VERSION): download and restart straight away.
 * Returns false when nothing could be applied - offline, or no newer update exists for this
 * binary - and the caller carries on with the code it has, like every other part of the gate.
 * It cannot loop: after the restart the running code is the newest, so the check finds nothing.
 */
export async function applyUpdateNow(): Promise<boolean> {
  if (!(await downloadLatestUpdate())) return false;
  try {
    await Updates.reloadAsync();
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks for an update at launch and each time the app returns to the foreground, downloading it
 * in the background. updateReady turns true once one is waiting. It applies on restart(), or by
 * itself the next time the app is opened from cold - so "Later" silences the prompt for the rest
 * of the session instead of asking again on every return to the app.
 */
export function useOtaUpdates() {
  const [updateReady, setUpdateReady] = useState(false);
  const dismissed = useRef(false);

  useEffect(() => {
    const check = () => {
      downloadLatestUpdate().then((ready) => {
        if (ready && !dismissed.current) setUpdateReady(true);
      });
    };
    check();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });
    return () => subscription.remove();
  }, []);

  const restart = useCallback(() => {
    Updates.reloadAsync().catch(() => setUpdateReady(false));
  }, []);
  const dismiss = useCallback(() => {
    dismissed.current = true;
    setUpdateReady(false);
  }, []);

  return { updateReady, restart, dismiss };
}
