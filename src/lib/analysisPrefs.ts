import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useSyncExternalStore } from "react";

/**
 * The game screen's settings, remembered on this device. They will move to
 * the account when the settings page exists.
 *
 * The engine is off by default: a player preparing often wants to look at a
 * game without being told the answer. There is no depth setting here, unlike
 * the web: the phone has no engine of its own, so every evaluation is
 * Lichess's, at whatever depth Lichess has.
 */
export interface AnalysisPrefs {
  engine: boolean;
  sound: boolean;
}

export const DEFAULT_PREFS: AnalysisPrefs = { engine: false, sound: true };

const KEY = "analysis-prefs";
const listeners = new Set<() => void>();
let current: AnalysisPrefs = DEFAULT_PREFS;
let loaded = false;

function emit() {
  listeners.forEach((l) => l());
}

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    const stored = JSON.parse((await AsyncStorage.getItem(KEY)) ?? "{}");
    current = {
      engine: typeof stored.engine === "boolean" ? stored.engine : DEFAULT_PREFS.engine,
      sound: typeof stored.sound === "boolean" ? stored.sound : DEFAULT_PREFS.sound,
    };
    emit();
  } catch {
    // Unreadable: the defaults stand.
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAnalysisPrefs(): [AnalysisPrefs, (change: Partial<AnalysisPrefs>) => void] {
  const prefs = useSyncExternalStore(subscribe, () => current);
  useEffect(() => {
    void load();
  }, []);
  const update = useCallback((change: Partial<AnalysisPrefs>) => {
    current = { ...current, ...change };
    emit();
    void AsyncStorage.setItem(KEY, JSON.stringify(current)).catch(() => {});
  }, []);
  return [prefs, update];
}
